(() => {
  "use strict";

  /* --------------------------------------------------
     Elements
     -------------------------------------------------- */
  const heroSection   = document.getElementById("hero");
  const heroImage     = document.querySelector(".hero-image");
  const heroVignette  = document.querySelector(".hero-vignette");
  const heroText      = document.querySelector(".hero-text");
  const fogEls        = document.querySelectorAll(".fog");

  const entranceSection = document.getElementById("entrance");
  const gateLeft        = document.querySelector(".gate-left");
  const gateRight       = document.querySelector(".gate-right");
  const entranceText    = document.querySelector(".entrance-text");
  const whisper2        = document.querySelector(".entrance-whisper-2");

  const cursorGlow  = document.getElementById("cursor-glow");
  const cursorDot   = document.getElementById("cursor-dot");
  const secretLayer = document.getElementById("secret-layer");
  const hoverHint   = document.getElementById("hover-hint");
  const beacon      = document.getElementById("secret-beacon");

  const revealTargets = document.querySelectorAll(".hallway-intro, .door-card");

  /* --------------------------------------------------
     Cached layout values (avoid per-frame DOM reads)
     -------------------------------------------------- */
  let cachedVh      = window.innerHeight;
  let cachedHeroH   = heroSection  ? heroSection.offsetHeight  : 0;
  let cachedEntTop  = entranceSection ? entranceSection.offsetTop    : 0;
  let cachedEntH    = entranceSection ? entranceSection.offsetHeight : 0;
  let cachedHeroTop = heroSection  ? heroSection.getBoundingClientRect().top + window.scrollY : 0;

  /* Pre-cache secret message positions once (no per-frame reflow) */
  let cachedSecretPositions = [];
  function cacheSecretPositions() {
    if (!secretLayer) return;
    cachedSecretPositions = [];
    const msgs = secretLayer.querySelectorAll(".secret-msg");
    const scrollY = window.scrollY;
    for (const msg of msgs) {
      const r = msg.getBoundingClientRect();
      cachedSecretPositions.push({
        x: r.left + r.width / 2 + scrollY * 0, // clientX-relative
        y: r.top + r.height / 2,
        absY: r.top + scrollY + r.height / 2    // absolute page Y
      });
    }
  }

  function recacheLayout() {
    cachedVh      = window.innerHeight;
    cachedHeroH   = heroSection  ? heroSection.offsetHeight  : 0;
    cachedEntTop  = entranceSection ? entranceSection.offsetTop    : 0;
    cachedEntH    = entranceSection ? entranceSection.offsetHeight : 0;
    cachedHeroTop = heroSection  ? heroSection.getBoundingClientRect().top + window.scrollY : 0;
    cacheSecretPositions();
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(recacheLayout, 200);
  }, { passive: true });

  // Initial cache after layout settles
  requestAnimationFrame(() => {
    recacheLayout();
    cacheSecretPositions();
  });

  /* --------------------------------------------------
     Cursor state
     -------------------------------------------------- */
  let mouseX = -500, mouseY = -500;
  let glowX  = -500, glowY  = -500;
  let dotX   = -500, dotY   = -500;
  let glowVisible = false;
  let frameScheduled = false;
  let prevHeroPast = false;
  let hintDismissed = false;
  let beaconDismissed = false;

  function scheduleFrame() {
    if (!frameScheduled) {
      frameScheduled = true;
      requestAnimationFrame(tick);
    }
  }

  /* --------------------------------------------------
     Main animation loop — only transforms, no reflows
     -------------------------------------------------- */
  function tick() {
    frameScheduled = false;
    const scrollY = window.scrollY;
    let needsAnotherFrame = false;

    /* --- Cursor glow (GPU transform only) --- */
    if (glowVisible) {
      glowX += (mouseX - glowX) * 0.15;
      glowY += (mouseY - glowY) * 0.15;
      dotX  += (mouseX - dotX)  * 0.35;
      dotY  += (mouseY - dotY)  * 0.35;

      cursorGlow.style.transform =
        `translate3d(${glowX - 110}px, ${glowY - 110}px, 0)`;
      cursorDot.style.transform =
        `translate3d(${dotX - 3}px, ${dotY - 3}px, 0)`;

      if (Math.abs(mouseX - glowX) > 0.3 || Math.abs(mouseY - glowY) > 0.3) {
        needsAnotherFrame = true;
      }
    }

    /* --- Secret layer mask (CSS var update) --- */
    if (secretLayer && glowVisible) {
      secretLayer.style.setProperty("--mx", mouseX + "px");
      secretLayer.style.setProperty("--my", (mouseY + scrollY - cachedHeroTop) + "px");
    }

    /* --- Hero parallax --- */
    if (heroSection) {
      const maxScroll = cachedHeroH - cachedVh;
      if (maxScroll > 0) {
        const progress = Math.min(scrollY / maxScroll, 1);

        heroImage.style.transform = `scale(${1 + progress * 0.5})`;
        heroVignette.style.opacity = progress;

        const textProg = Math.min(scrollY / (cachedVh * 0.35), 1);
        heroText.style.opacity = 1 - textProg;
        heroText.style.transform = `translateY(${textProg * -60}px)`;

        fogEls.forEach((f) => { f.style.opacity = 0.4 * (1 - progress); });

        const pastHero = progress >= 1;
        if (pastHero !== prevHeroPast) {
          prevHeroPast = pastHero;
          const d = pastHero ? "none" : "";
          heroVignette.style.display = d;
          heroText.style.display     = d;
          fogEls.forEach((f) => { f.style.display = d; });
        }
      }
    }

    /* --- Entrance gates --- */
    if (entranceSection) {
      const start = cachedEntTop - cachedVh;
      const end   = cachedEntTop + cachedEntH * 0.6;

      if (scrollY >= start && scrollY <= cachedEntTop + cachedEntH) {
        const range = end - start;
        if (range > 0) {
          const progress = Math.min(Math.max((scrollY - start) / range, 0), 1);

          gateLeft.style.transform  = `translateX(-${progress * 100}%)`;
          gateRight.style.transform = `translateX(${progress * 100}%)`;

          const bdr = Math.max(1 - progress * 2, 0);
          gateLeft.style.borderColor  = `rgba(138,127,114,${bdr * 0.4})`;
          gateRight.style.borderColor = `rgba(138,127,114,${bdr * 0.4})`;

          let tOp = 0;
          if (progress > 0.3 && progress <= 0.65) {
            tOp = (progress - 0.3) / 0.35;
          } else if (progress > 0.65) {
            tOp = 1 - (progress - 0.65) / 0.35;
          }
          entranceText.style.opacity = Math.max(tOp, 0);

          if (whisper2) {
            let w2 = 0;
            if (progress > 0.45 && progress <= 0.7) {
              w2 = (progress - 0.45) / 0.25;
            } else if (progress > 0.7) {
              w2 = 1 - (progress - 0.7) / 0.3;
            }
            whisper2.style.opacity = Math.max(w2, 0);
          }
        }
      }
    }

    if (needsAnotherFrame) scheduleFrame();
  }

  /* --------------------------------------------------
     Event listeners (lightweight — store values only)
     -------------------------------------------------- */
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!glowVisible) {
      glowVisible = true;
      cursorGlow.classList.add("active");
      cursorDot.classList.add("active");
    }

    /* Check proximity to secrets using cached positions (no reflow) */
    if (!hintDismissed || !beaconDismissed) {
      const scrollY = window.scrollY;
      for (const pos of cachedSecretPositions) {
        // Convert absolute Y to viewport Y
        const viewY = pos.absY - scrollY;
        const dist = Math.hypot(e.clientX - pos.x, e.clientY - viewY);
        if (dist < 180) {
          if (!hintDismissed && hoverHint) {
            hintDismissed = true;
            hoverHint.classList.add("hidden");
          }
          if (!beaconDismissed && beacon) {
            beaconDismissed = true;
            beacon.classList.add("hidden");
          }
          break;
        }
      }
    }

    scheduleFrame();
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    glowVisible = false;
    cursorGlow.classList.remove("active");
    cursorDot.classList.remove("active");
  });

  window.addEventListener("scroll", scheduleFrame, { passive: true });

  // Initial frame
  scheduleFrame();

  /* --------------------------------------------------
     Scroll-triggered reveal (Intersection Observer)
     -------------------------------------------------- */
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15 }
  );

  revealTargets.forEach((el) => revealObserver.observe(el));

  /* --------------------------------------------------
     Door click → open room overlay
     -------------------------------------------------- */
  const overlay  = document.getElementById("room-overlay");
  const rooms    = document.querySelectorAll(".room");
  const closeBtn = document.querySelector(".room-close");

  document.querySelectorAll(".door-card").forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.door;

      // Door swings open with light burst
      card.classList.add("clicked");

      // After door opens, show room
      setTimeout(() => {
        openRoom(key);
        setTimeout(() => card.classList.remove("clicked"), 300);
      }, 450);
    });
  });

  function openRoom(key) {
    rooms.forEach((r) => r.classList.remove("active", "visible"));

    const target = document.querySelector(`.room[data-room="${key}"]`);
    if (!target) return;

    target.classList.add("active");
    overlay.classList.add("active");
    document.body.classList.add("locked");

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        target.classList.add("visible");
      });
    });
  }

  function closeRoom() {
    overlay.classList.remove("active");
    document.body.classList.remove("locked");
    rooms.forEach((r) => r.classList.remove("visible"));
    setTimeout(() => rooms.forEach((r) => r.classList.remove("active")), 600);
  }

  closeBtn.addEventListener("click", closeRoom);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeRoom(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRoom(); });
})();
