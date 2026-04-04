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
  const secretLayer = document.getElementById("secret-layer");
  const hoverHint   = document.getElementById("hover-hint");
  const beacon      = document.getElementById("secret-beacon");

  const revealTargets = document.querySelectorAll(".hallway-intro, .door-card");

  /* --------------------------------------------------
     Cached layout values
     -------------------------------------------------- */
  let cachedVh      = window.innerHeight;
  let cachedHeroH   = heroSection  ? heroSection.offsetHeight  : 0;
  let cachedEntTop  = entranceSection ? entranceSection.offsetTop    : 0;
  let cachedEntH    = entranceSection ? entranceSection.offsetHeight : 0;
  let cachedHeroTop = heroSection  ? heroSection.getBoundingClientRect().top + window.scrollY : 0;

  let cachedSecretPositions = [];
  function cacheSecretPositions() {
    if (!secretLayer) return;
    cachedSecretPositions = [];
    const msgs = secretLayer.querySelectorAll(".secret-msg");
    const sy = window.scrollY;
    for (const msg of msgs) {
      const r = msg.getBoundingClientRect();
      cachedSecretPositions.push({
        x: r.left + r.width / 2,
        absY: r.top + sy + r.height / 2
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

  requestAnimationFrame(() => recacheLayout());

  /* --------------------------------------------------
     Smoothed state — all animated values lerp toward
     their targets so nothing snaps.
     -------------------------------------------------- */
  const LERP = 0.08;            // scroll-driven smoothing (lower = smoother)
  const CURSOR_LERP  = 0.16;    // glow follow speed
  let mouseX = -500, mouseY = -500;
  let glowX  = -500, glowY  = -500;

  // Smoothed scroll-driven values (current → target)
  let sHeroScale   = 1,   tHeroScale   = 1;
  let sVignetteOp  = 0,   tVignetteOp  = 0;
  let sTextOp      = 1,   tTextOp      = 1;
  let sTextY       = 0,   tTextY       = 0;
  let sFogOp       = 0.4, tFogOp       = 0.4;
  let sGateL       = 0,   tGateL       = 0;
  let sGateR       = 0,   tGateR       = 0;
  let sGateBdr     = 1,   tGateBdr     = 1;
  let sEntTextOp   = 0,   tEntTextOp   = 0;

  let glowVisible = false;
  let running = false;
  let prevHeroPast = false;
  let hintDismissed = false;
  let beaconDismissed = false;
  let whisper2Revealed = false;

  function startLoop() {
    if (!running) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  /* --------------------------------------------------
     Lerp helper
     -------------------------------------------------- */
  function lerp(current, target, factor) {
    const d = target - current;
    return Math.abs(d) < 0.001 ? target : current + d * factor;
  }

  /* --------------------------------------------------
     Compute targets from raw scroll (pure math, no DOM)
     -------------------------------------------------- */
  function computeTargets(scrollY) {
    // Hero parallax
    if (heroSection) {
      const maxScroll = cachedHeroH - cachedVh;
      if (maxScroll > 0) {
        const p = Math.min(scrollY / maxScroll, 1);
        tHeroScale  = 1 + p * 0.5;
        tVignetteOp = p;
        const tp = Math.min(scrollY / (cachedVh * 0.35), 1);
        tTextOp = 1 - tp;
        tTextY  = tp * -60;
        tFogOp  = 0.4 * (1 - p);
      }
    }

    // Entrance gates
    if (entranceSection) {
      const start = cachedEntTop - cachedVh;
      const end   = cachedEntTop + cachedEntH * 0.6;
      const range = end - start;
      if (range > 0 && scrollY >= start && scrollY <= cachedEntTop + cachedEntH) {
        const p = Math.min(Math.max((scrollY - start) / range, 0), 1);
        tGateL   = -p * 100;
        tGateR   = p * 100;
        tGateBdr = Math.max(1 - p * 2, 0);

        let tOp = 0;
        if (p > 0.3 && p <= 0.65)      tOp = (p - 0.3) / 0.35;
        else if (p > 0.65)              tOp = 1 - (p - 0.65) / 0.35;
        tEntTextOp = Math.max(tOp, 0);
      } else if (scrollY < start) {
        tGateL = 0; tGateR = 0; tGateBdr = 1; tEntTextOp = 0;
      }
    }
  }

  /* --------------------------------------------------
     Main tick — lerps current toward target each frame
     -------------------------------------------------- */
  function tick() {
    running = false;
    const scrollY = window.scrollY;
    let settling = false;        // true if any value still converging

    computeTargets(scrollY);

    /* --- Cursor --- */
    if (glowVisible) {
      glowX = lerp(glowX, mouseX, CURSOR_LERP);
      glowY = lerp(glowY, mouseY, CURSOR_LERP);

      cursorGlow.style.transform = `translate3d(${glowX - 110}px,${glowY - 110}px,0)`;

      if (Math.abs(mouseX - glowX) > 0.3 || Math.abs(mouseY - glowY) > 0.3) settling = true;
    }

    /* --- Secret mask (follows mouse directly, no lerp needed) --- */
    if (secretLayer && glowVisible) {
      secretLayer.style.setProperty("--mx", mouseX + "px");
      secretLayer.style.setProperty("--my", (mouseY + scrollY - cachedHeroTop) + "px");
    }

    /* --- Hero parallax (smoothed) --- */
    if (heroSection) {
      sHeroScale  = lerp(sHeroScale,  tHeroScale,  LERP);
      sVignetteOp = lerp(sVignetteOp, tVignetteOp, LERP);
      sTextOp     = lerp(sTextOp,     tTextOp,     LERP);
      sTextY      = lerp(sTextY,      tTextY,      LERP);
      sFogOp      = lerp(sFogOp,      tFogOp,      LERP);

      heroImage.style.transform   = `scale(${sHeroScale})`;
      heroVignette.style.opacity  = sVignetteOp;
      heroText.style.opacity      = sTextOp;
      heroText.style.transform    = `translateY(${sTextY}px)`;
      fogEls.forEach(f => { f.style.opacity = sFogOp; });

      if (Math.abs(sHeroScale - tHeroScale) > 0.001 ||
          Math.abs(sVignetteOp - tVignetteOp) > 0.001 ||
          Math.abs(sFogOp - tFogOp) > 0.001) settling = true;

      // Toggle fixed layers off when fully past hero
      const pastHero = scrollY >= cachedHeroH - cachedVh;
      if (pastHero !== prevHeroPast) {
        prevHeroPast = pastHero;
        const d = pastHero ? "none" : "";
        heroVignette.style.display = d;
        heroText.style.display     = d;
        fogEls.forEach(f => { f.style.display = d; });
      }
    }

    /* --- Entrance gates (smoothed) --- */
    if (entranceSection) {
      sGateL      = lerp(sGateL,      tGateL,      LERP);
      sGateR      = lerp(sGateR,      tGateR,      LERP);
      sGateBdr    = lerp(sGateBdr,    tGateBdr,    LERP);
      sEntTextOp  = lerp(sEntTextOp,  tEntTextOp,  LERP);

      gateLeft.style.transform   = `translateX(${sGateL}%)`;
      gateRight.style.transform  = `translateX(${sGateR}%)`;
      gateLeft.style.borderColor  = `rgba(138,127,114,${sGateBdr * 0.4})`;
      gateRight.style.borderColor = `rgba(138,127,114,${sGateBdr * 0.4})`;
      entranceText.style.opacity  = sEntTextOp;

      if (Math.abs(sGateL - tGateL) > 0.01 ||
          Math.abs(sEntTextOp - tEntTextOp) > 0.001) settling = true;
    }

    /* Keep looping while any value is still settling */
    if (settling) {
      running = true;
      requestAnimationFrame(tick);
    }
  }

  /* --------------------------------------------------
     Event listeners
     -------------------------------------------------- */
  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;

    if (!glowVisible) {
      glowVisible = true;
      cursorGlow.classList.add("active");
    }

    // Proximity checks using cached positions (no reflow)
    if (!hintDismissed || !beaconDismissed) {
      const sy = window.scrollY;
      for (const pos of cachedSecretPositions) {
        const viewY = pos.absY - sy;
        if (Math.hypot(e.clientX - pos.x, e.clientY - viewY) < 180) {
          if (!hintDismissed && hoverHint)  { hintDismissed = true;   hoverHint.classList.add("hidden"); }
          if (!beaconDismissed && beacon)    { beaconDismissed = true; beacon.classList.add("hidden"); }
          break;
        }
      }
    }

    // Whisper-2 proximity (one-time check, then skip forever)
    if (!whisper2Revealed && whisper2 && whisper2.offsetParent !== null) {
      const r = whisper2.getBoundingClientRect();
      if (Math.hypot(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2)) < 150) {
        whisper2Revealed = true;
        whisper2.classList.add("revealed");
      }
    }

    startLoop();
  }, { passive: true });

  document.addEventListener("mouseleave", () => {
    glowVisible = false;
    cursorGlow.classList.remove("active");
  });

  window.addEventListener("scroll", startLoop, { passive: true });

  startLoop();

  /* --------------------------------------------------
     Scroll-triggered reveal
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
  revealTargets.forEach(el => revealObserver.observe(el));

  /* --------------------------------------------------
     Door click → open room overlay
     -------------------------------------------------- */
  const overlay  = document.getElementById("room-overlay");
  const rooms    = document.querySelectorAll(".room");
  const closeBtn = document.querySelector(".room-close");

  document.querySelectorAll(".door-card").forEach((card) => {
    card.addEventListener("click", () => {
      const key = card.dataset.door;
      card.classList.add("clicked");
      setTimeout(() => {
        openRoom(key);
        setTimeout(() => card.classList.remove("clicked"), 300);
      }, 450);
    });
  });

  function openRoom(key) {
    rooms.forEach(r => r.classList.remove("active", "visible"));
    const target = document.querySelector(`.room[data-room="${key}"]`);
    if (!target) return;
    target.classList.add("active");
    overlay.classList.add("active");
    document.body.classList.add("locked");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => target.classList.add("visible"));
    });
  }

  function closeRoom() {
    overlay.classList.remove("active");
    document.body.classList.remove("locked");
    rooms.forEach(r => r.classList.remove("visible"));
    setTimeout(() => rooms.forEach(r => r.classList.remove("active")), 600);
  }

  closeBtn.addEventListener("click", closeRoom);
  overlay.addEventListener("click", (e) => { if (e.target === overlay) closeRoom(); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeRoom(); });
})();
