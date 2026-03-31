(() => {
  "use strict";

  /* --------------------------------------------------
     Scroll-triggered reveal (Intersection Observer)
     -------------------------------------------------- */
  const revealTargets = document.querySelectorAll(
    ".hallway-intro, .door-card"
  );

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
     Welcome section parallax fade-out on scroll
     -------------------------------------------------- */
  const welcomeSection = document.getElementById("welcome");
  const welcomeContent = document.querySelector(".welcome-content");

  window.addEventListener("scroll", () => {
    const scrollY = window.scrollY;
    const vh = window.innerHeight;
    const progress = Math.min(scrollY / (vh * 0.6), 1);

    welcomeContent.style.opacity = 1 - progress;
    welcomeContent.style.transform = `translateY(${progress * -40}px)`;
  }, { passive: true });

  /* --------------------------------------------------
     Door click → open room overlay
     -------------------------------------------------- */
  const overlay = document.getElementById("room-overlay");
  const rooms = document.querySelectorAll(".room");
  const closeBtn = document.querySelector(".room-close");

  document.querySelectorAll(".door-card").forEach((card) => {
    card.addEventListener("click", () => {
      const doorKey = card.dataset.door;
      openRoom(doorKey);
    });
  });

  function openRoom(key) {
    rooms.forEach((r) => {
      r.classList.remove("active", "visible");
    });

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

    rooms.forEach((r) => {
      r.classList.remove("visible");
    });

    setTimeout(() => {
      rooms.forEach((r) => r.classList.remove("active"));
    }, 600);
  }

  closeBtn.addEventListener("click", closeRoom);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeRoom();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeRoom();
  });
})();
