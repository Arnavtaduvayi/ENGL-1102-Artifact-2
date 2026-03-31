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

  const revealTargets = document.querySelectorAll(".hallway-intro, .door-card");

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
     Scroll-driven hero + entrance animation
     -------------------------------------------------- */
  let ticking = false;

  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });

  function onScroll() {
    ticking = false;
    const scrollY = window.scrollY;
    const vh = window.innerHeight;

    animateHero(scrollY, vh);
    animateEntrance(scrollY, vh);
  }

  function animateHero(scrollY, vh) {
    const heroH = heroSection.offsetHeight;
    const progress = Math.min(Math.max(scrollY / (heroH - vh), 0), 1);

    // Image zooms from 1 → 1.6 as you scroll through hero
    const scale = 1 + progress * 0.6;
    heroImage.style.transform = `scale(${scale})`;

    // Vignette darkens 0 → 1
    heroVignette.style.opacity = progress;

    // Text fades out and drifts up in the first 40% of scroll
    const textProgress = Math.min(scrollY / (vh * 0.4), 1);
    heroText.style.opacity = 1 - textProgress;
    heroText.style.transform = `translateY(${textProgress * -50}px)`;

    // Fog fades out as you approach
    fogEls.forEach((f) => {
      f.style.opacity = 0.5 * (1 - progress);
    });

    // Hide fixed elements once hero is fully scrolled past
    const pastHero = scrollY >= heroH - vh;
    heroVignette.style.display  = pastHero ? "none" : "";
    heroText.style.display      = pastHero ? "none" : "";
    fogEls.forEach((f) => f.style.display = pastHero ? "none" : "");
  }

  function animateEntrance(scrollY, vh) {
    const entranceTop = entranceSection.offsetTop;
    const entranceH   = entranceSection.offsetHeight;
    const start = entranceTop - vh;
    const end   = entranceTop + entranceH * 0.6;

    if (scrollY < start || scrollY > entranceTop + entranceH) return;

    const progress = Math.min(Math.max((scrollY - start) / (end - start), 0), 1);

    // Gates open: translate from 0% (closed) to -100%/100% (open)
    const gateOffset = progress * 100;
    gateLeft.style.transform  = `translateX(-${gateOffset}%)`;
    gateRight.style.transform = `translateX(${gateOffset}%)`;

    // Fade border as gates open
    const borderOpacity = Math.max(1 - progress * 2, 0);
    gateLeft.style.borderColor  = `rgba(138,127,114,${borderOpacity})`;
    gateRight.style.borderColor = `rgba(138,127,114,${borderOpacity})`;

    // Whisper text fades in at 30-60% and out at 70-100%
    let textOpacity = 0;
    if (progress > 0.3 && progress <= 0.65) {
      textOpacity = (progress - 0.3) / 0.35;
    } else if (progress > 0.65) {
      textOpacity = 1 - (progress - 0.65) / 0.35;
    }
    entranceText.style.opacity = Math.max(textOpacity, 0);
  }

  // Run once on load
  onScroll();

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
