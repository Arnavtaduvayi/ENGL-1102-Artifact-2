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

  const cursorGlow  = document.getElementById("cursor-glow");
  const secretLayer = document.getElementById("secret-layer");

  const revealTargets = document.querySelectorAll(".hallway-intro, .door-card");

  /* --------------------------------------------------
     Cached layout values (avoid per-frame reads)
     -------------------------------------------------- */
  let cachedVh        = window.innerHeight;
  let cachedHeroH     = heroSection  ? heroSection.offsetHeight  : 0;
  let cachedEntTop    = entranceSection ? entranceSection.offsetTop    : 0;
  let cachedEntH      = entranceSection ? entranceSection.offsetHeight : 0;
  let cachedHeroTop   = heroSection  ? heroSection.getBoundingClientRect().top + window.scrollY : 0;

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
     Unified animation loop
     -------------------------------------------------- */
  let mouseX = -300, mouseY = -300;
  let glowX  = -300, glowY  = -300;
  let glowVisible = false;
  let frameScheduled = false;
  let prevHeroPast = false;

  function scheduleFrame() {
    if (!frameScheduled) {
      frameScheduled = true;
      requestAnimationFrame(tick);
    }
  }

  function tick() {
    frameScheduled = false;
    const scrollY = window.scrollY;

    // --- Cursor glow (GPU transform) ---
    if (glowVisible) {
      glowX += (mouseX - glowX) * 0.18;
      glowY += (mouseY - glowY) * 0.18;
      cursorGlow.style.transform =
        `translate3d(${glowX - 150}px, ${glowY - 150}px, 0)`;
      scheduleFrame();
    }

    // --- Secret layer mask ---
    if (secretLayer && glowVisible) {
      const relX = mouseX;
      const relY = mouseY + scrollY - cachedHeroTop;
      secretLayer.style.setProperty("--mx", relX + "px");
      secretLayer.style.setProperty("--my", relY + "px");
    }

    // --- Hero parallax ---
    if (heroSection) {
      const progress = Math.min(Math.max(scrollY / (cachedHeroH - cachedVh), 0), 1);

      heroImage.style.transform = `scale(${1 + progress * 0.6})`;
      heroVignette.style.opacity = progress;

      const textProg = Math.min(scrollY / (cachedVh * 0.4), 1);
      heroText.style.opacity = 1 - textProg;
      heroText.style.transform = `translateY(${textProg * -50}px)`;

      fogEls.forEach((f) => { f.style.opacity = 0.5 * (1 - progress); });

      const pastHero = scrollY >= cachedHeroH - cachedVh;
      if (pastHero !== prevHeroPast) {
        prevHeroPast = pastHero;
        const d = pastHero ? "none" : "";
        heroVignette.style.display = d;
        heroText.style.display     = d;
        fogEls.forEach((f) => { f.style.display = d; });
      }
    }

    // --- Entrance gates ---
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
        gateLeft.style.borderColor  = `rgba(138,127,114,${bdr})`;
        gateRight.style.borderColor = `rgba(138,127,114,${bdr})`;

        let tOp = 0;
        if (progress > 0.3 && progress <= 0.65) {
          tOp = (progress - 0.3) / 0.35;
        } else if (progress > 0.65) {
          tOp = 1 - (progress - 0.65) / 0.35;
        }
        entranceText.style.opacity = Math.max(tOp, 0);
      }
    }
  }

  /* --------------------------------------------------
     Event listeners (lightweight — just store values)
     -------------------------------------------------- */
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!glowVisible) {
      glowVisible = true;
      cursorGlow.classList.add("active");
    }
    scheduleFrame();
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    glowVisible = false;
    cursorGlow.classList.remove("active");
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
      openRoom(card.dataset.door);
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
