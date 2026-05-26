document.addEventListener("DOMContentLoaded", () => {
  highlightActiveNav();
  updateNavbarAuthState();
  handleNavbarScroll();
  initRevealAnimation();
  initTiltCards();
  initBeforeAfterModal();
});

/* =========================
   NAVBAR
========================= */

function highlightActiveNav() {
  const currentPath = window.location.pathname.split("/").pop() || "index.html";

  const map = {
    "index.html": "nav-home",
    "": "nav-home",
    "layanan.html": "nav-services",
    "dashboard.html": "nav-dashboard",
    "konfirmasi.html": "nav-confirmation",
  };

  const activeId = map[currentPath] || "nav-home";

  document.querySelectorAll("[data-nav-link]").forEach((el) => {
    el.classList.remove("text-sky-400", "bg-slate-800/50", "is-active");
    el.classList.add("text-slate-400", "hover:text-white", "hover:bg-slate-800/30");
    el.removeAttribute("aria-current");
  });

  const active = document.getElementById(activeId);

  if (active) {
    active.classList.add("text-sky-400", "bg-slate-800/50", "is-active");
    active.classList.remove("text-slate-400", "hover:text-white", "hover:bg-slate-800/30");
    active.setAttribute("aria-current", "page");
  }
}

function updateNavbarAuthState() {
  const dashBtn = document.getElementById("nav-dashboard");
  const footerAdminBtn = document.getElementById("footer-admin-btn");
  const footerAdminStatus = document.getElementById("footer-admin-status");
  const footerAdminLabel = document.getElementById("footer-admin-label");
  const footerLogoutBtn = document.getElementById("footer-logout-btn");

  const loggedIn = typeof isAdminLoggedIn === "function" ? isAdminLoggedIn() : false;

  if (dashBtn) {
    dashBtn.classList.toggle("hidden", !loggedIn);
  }

  if (footerAdminBtn) {
    footerAdminBtn.setAttribute("aria-label", loggedIn ? "Buka dashboard admin" : "Login admin");

    footerAdminBtn.title = loggedIn ? "Admin aktif" : "Admin nonaktif";
    footerAdminBtn.classList.toggle("admin-logged-in", loggedIn);
    footerAdminBtn.classList.toggle("admin-logged-out", !loggedIn);

    const icon = footerAdminBtn.querySelector("i");
    if (icon) {
      icon.className = loggedIn ? "fa-solid fa-unlock text-xs" : "fa-solid fa-lock text-xs";
    }
  }

  if (footerAdminStatus) {
    footerAdminStatus.classList.toggle("admin-status-online", loggedIn);
    footerAdminStatus.classList.toggle("admin-status-offline", !loggedIn);
  }

  if (footerAdminLabel) {
    footerAdminLabel.innerText = loggedIn ? "Admin aktif" : "Admin nonaktif";
  }

  if (footerLogoutBtn) {
    footerLogoutBtn.classList.toggle("hidden", !loggedIn);
  }

  if (document.body.classList.contains("dashboard-page")) {
    document.body.classList.toggle("dashboard-locked", !loggedIn);
  }
}

function handleNavbarScroll() {
  const nav = document.querySelector(".site-nav");
  if (!nav) return;

  const update = () => {
    nav.classList.toggle("is-scrolled", window.scrollY > 10);
  };

  update();
  window.addEventListener("scroll", update, { passive: true });
}

function handleFooterAdminClick() {
  if (typeof isAdminLoggedIn === "function" && isAdminLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }

  if (typeof openLoginModal === "function") {
    openLoginModal();
  } else {
    window.location.href = "dashboard.html";
  }
}

function handleLogout() {
  if (typeof clearAdminToken === "function") {
    clearAdminToken();
  }

  updateNavbarAuthState();
  window.location.href = "index.html";
}

/* =========================
   REVEAL ANIMATION
========================= */

function initRevealAnimation() {
  const elements = document.querySelectorAll(".reveal-up");

  if (!elements.length) return;

  document.body.classList.add("motion-ready");

  if (!("IntersectionObserver" in window)) {
    elements.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.12,
    },
  );

  elements.forEach((el) => observer.observe(el));
}

/* =========================
   TILT CARD
========================= */

function initTiltCards() {
  const cards = document.querySelectorAll(".tilt-card");

  if (!cards.length) return;

  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const rotateX = (y / rect.height - 0.5) * -8;
      const rotateY = (x / rect.width - 0.5) * 8;

      card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    card.addEventListener("mouseleave", () => {
      card.style.transform = "rotateX(0deg) rotateY(0deg)";
    });
  });
}

/* =========================
   BEFORE AFTER POPUP
========================= */

let baCompareDragging = false;

function initBeforeAfterModal() {
  const modal = document.getElementById("beforeAfterModal");
  const compare = document.getElementById("baCompare");

  if (!modal || !compare) {
    console.warn("Before/After modal belum ditemukan. Cek HTML modal di index.html.");
    return;
  }

  compare.addEventListener("pointerdown", (event) => {
    baCompareDragging = true;
    compare.setPointerCapture(event.pointerId);
    updateBeforeAfterPosition(event);
  });

  compare.addEventListener("pointermove", (event) => {
    if (!baCompareDragging && event.pointerType !== "mouse") return;
    updateBeforeAfterPosition(event);
  });

  compare.addEventListener("pointerup", () => {
    baCompareDragging = false;
  });

  compare.addEventListener("pointercancel", () => {
    baCompareDragging = false;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("is-open")) {
      closeBeforeAfterModal();
    }

    if (event.key === "Enter") {
      const activeCard = document.activeElement;
      if (activeCard && activeCard.classList.contains("ba-open-card")) {
        openBeforeAfterModal(activeCard);
      }
    }
  });
}

function openBeforeAfterModal(card) {
  const modal = document.getElementById("beforeAfterModal");
  const compare = document.getElementById("baCompare");
  const beforeImg = document.getElementById("baBeforeImg");
  const afterImg = document.getElementById("baAfterImg");

  if (!modal || !compare || !beforeImg || !afterImg) {
    console.warn("Element modal before-after belum lengkap.");
    return;
  }

  const beforeSrc = card.getAttribute("data-before");
  const afterSrc = card.getAttribute("data-after");

  if (!beforeSrc || !afterSrc) {
    console.warn("Card belum punya data-before atau data-after.");
    return;
  }

  beforeImg.src = beforeSrc;
  afterImg.src = afterSrc;

  compare.style.setProperty("--ba-position", "50%");

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeBeforeAfterModal() {
  const modal = document.getElementById("beforeAfterModal");

  if (!modal) return;

  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function updateBeforeAfterPosition(event) {
  const compare = document.getElementById("baCompare");
  if (!compare) return;

  const rect = compare.getBoundingClientRect();
  const x = event.clientX - rect.left;

  let percent = (x / rect.width) * 100;
  percent = Math.max(2, Math.min(98, percent));

  compare.style.setProperty("--ba-position", `${percent}%`);
}

/* =========================
   GLOBAL FUNCTIONS
========================= */

window.handleFooterAdminClick = handleFooterAdminClick;
window.handleLogout = handleLogout;
window.updateNavbarAuthState = updateNavbarAuthState;
window.openBeforeAfterModal = openBeforeAfterModal;
window.closeBeforeAfterModal = closeBeforeAfterModal;
