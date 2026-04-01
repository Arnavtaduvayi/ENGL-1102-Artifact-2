(() => {
  "use strict";

  /* --------------------------------------------------
     Elements
     -------------------------------------------------- */
  const heroSection   = document.getElementById("hero");
  const heroImage     = document.querySelector(".hero-image");
  const heroVignette  = document.querySelector(".hero-vignette");
  const heroGrain     = document.querySelector(".hero-grain");
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
     Cached layout values (avoid per-frame reads)
     -------------------------------------------------- */
  let cachedVh      = window.innerHeight;
  let cachedHeroH   = heroSection  ? heroSection.offsetHeight  : 0;
  let cachedEntTop  = entranceSection ? entranceSection.offsetTop    : 0;
  let cachedEntH    = entranceSection ? entranceSection.offsetHeight : 0;
  let cachedHeroTop = heroSection  ? heroSection.getBoundingClientRect().top + window.scrollY : 0;

  function recacheLayout() {
    cachedVh      = window.innerHeight;
    cachedHeroH   = heroSection  ? heroSection.offsetHeight  : 0;
    cachedEntTop  = entranceSection ? entranceSection.offsetTop    : 0;
    cachedEntH    = entranceSection ? entranceSection.offsetHeight : 0;
    cachedHeroTop = heroSection  ? heroSection.getBoundingClientRect().top + window.scrollY : 0;
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(recacheLayout, 150);
  }, { passive: true });

  /* --------------------------------------------------
     Smooth cursor tracking
     -------------------------------------------------- */
  let mouseX = -500, mouseY = -500;
  let glowX  = -500, glowY  = -500;
  let dotX   = -500, dotY   = -500;
  let glowVisible = false;
  let frameScheduled = false;
  let prevHeroPast = false;

  const GLOW_EASE  = 0.12;  // softer, smoother follow
  const DOT_EASE   = 0.25;  // dot tracks faster

  function scheduleFrame() {
    if (!frameScheduled) {
      frameScheduled = true;
      requestAnimationFrame(tick);
    }
  }

  /* --------------------------------------------------
     Main animation loop
     -------------------------------------------------- */
  function tick() {
    frameScheduled = false;
    const scrollY = window.scrollY;

    /* --- Cursor glow (smooth follow) --- */
    if (glowVisible) {
      glowX += (mouseX - glowX) * GLOW_EASE;
      glowY += (mouseY - glowY) * GLOW_EASE;
      dotX  += (mouseX - dotX)  * DOT_EASE;
      dotY  += (mouseY - dotY)  * DOT_EASE;

      cursorGlow.style.transform =
        `translate3d(${glowX - 210}px, ${glowY - 210}px, 0)`;
      cursorDot.style.transform =
        `translate3d(${dotX - 3}px, ${dotY - 3}px, 0)`;

      // Keep scheduling while cursor is moving (smooth convergence)
      if (Math.abs(mouseX - glowX) > 0.5 || Math.abs(mouseY - glowY) > 0.5) {
        scheduleFrame();
      }
    }

    /* --- Secret layer flashlight mask --- */
    if (secretLayer && glowVisible) {
      const relX = mouseX;
      const relY = mouseY + scrollY - cachedHeroTop;
      secretLayer.style.setProperty("--mx", relX + "px");
      secretLayer.style.setProperty("--my", relY + "px");
    }

    /* --- Hero parallax --- */
    if (heroSection) {
      const progress = Math.min(Math.max(scrollY / (cachedHeroH - cachedVh), 0), 1);

      heroImage.style.transform = `scale(${1 + progress * 0.5})`;
      heroVignette.style.opacity = progress;

      const textProg = Math.min(scrollY / (cachedVh * 0.35), 1);
      heroText.style.opacity = 1 - textProg;
      heroText.style.transform = `translateY(${textProg * -60}px)`;

      fogEls.forEach((f) => { f.style.opacity = 0.4 * (1 - progress); });

      // Hide hero fixed elements when past hero
      const pastHero = scrollY >= cachedHeroH - cachedVh;
      if (pastHero !== prevHeroPast) {
        prevHeroPast = pastHero;
        const d = pastHero ? "none" : "";
        heroVignette.style.display = d;
        heroGrain.style.display    = d;
        heroText.style.display     = d;
        fogEls.forEach((f) => { f.style.display = d; });
      }
    }

    /* --- Entrance gates --- */
    if (entranceSection) {
      const start = cachedEntTop - cachedVh;
      const end   = cachedEntTop + cachedEntH * 0.6;

      if (scrollY >= start && scrollY <= cachedEntTop + cachedEntH) {
        const progress = Math.min(Math.max(
          (scrollY - start) / (end - start), 0), 1);

        const g = progress * 100;
        gateLeft.style.transform  = `translateX(-${g}%)`;
        gateRight.style.transform = `translateX(${g}%)`;

        const bdr = Math.max(1 - progress * 2, 0);
        gateLeft.style.borderColor  = `rgba(138,127,114,${bdr * 0.4})`;
        gateRight.style.borderColor = `rgba(138,127,114,${bdr * 0.4})`;

        // First whisper appears
        let tOp = 0;
        if (progress > 0.3 && progress <= 0.65) {
          tOp = (progress - 0.3) / 0.35;
        } else if (progress > 0.65) {
          tOp = 1 - (progress - 0.65) / 0.35;
        }
        entranceText.style.opacity = Math.max(tOp, 0);

        // Second whisper appears slightly delayed
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

  /* --------------------------------------------------
     Event listeners
     -------------------------------------------------- */
  let hintDismissed = false;
  let beaconDismissed = false;

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!glowVisible) {
      glowVisible = true;
      cursorGlow.classList.add("active");
      cursorDot.classList.add("active");
    }

    // Dismiss hint after first movement
    if (!hintDismissed && hoverHint) {
      hintDismissed = true;
      setTimeout(() => hoverHint.classList.add("hidden"), 1500);
    }

    // Dismiss beacon once cursor gets near it
    if (!beaconDismissed && beacon) {
      const bRect = beacon.getBoundingClientRect();
      const bx = bRect.left + bRect.width / 2;
      const by = bRect.top + bRect.height / 2;
      const dist = Math.hypot(e.clientX - bx, e.clientY - by);
      if (dist < 200) {
        beaconDismissed = true;
        beacon.classList.add("hidden");
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
     Door click → zoom animation → open room overlay
     -------------------------------------------------- */
  const overlay  = document.getElementById("room-overlay");
  const rooms    = document.querySelectorAll(".room");
  const closeBtn = document.querySelector(".room-close");

  document.querySelectorAll(".door-card").forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.door;

      // Zoom animation on the card
      card.classList.add("zooming");

      // After zoom finishes, open room
      setTimeout(() => {
        card.classList.remove("zooming");
        openRoom(key);
      }, 700);
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
    setTimeout(() => rooms.forEach((r) => r.classList.remove("active")), 700);
  }

  closeBtn.addEventListener("click", closeRoom);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeRoom(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRoom(); });
})();
