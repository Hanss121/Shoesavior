document.addEventListener("DOMContentLoaded", () => {
  highlightActiveNav();
  updateNavbarAuthState();
});

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
    el.classList.remove("text-sky-400", "bg-slate-800/50");
    el.classList.add("text-slate-400", "hover:text-white", "hover:bg-slate-800/30");
  });

  const active = document.getElementById(activeId);
  if (active) {
    active.classList.add("text-sky-400", "bg-slate-800/50");
    active.classList.remove("text-slate-400", "hover:text-white", "hover:bg-slate-800/30");
  }
}

function updateNavbarAuthState() {
  const dashBtn = document.getElementById("nav-dashboard");
  const footerAdminBtn = document.getElementById("footer-admin-btn");
  const footerAdminStatus = document.getElementById("footer-admin-status");
  const footerAdminLabel = document.getElementById("footer-admin-label");
  const footerLogoutBtn = document.getElementById("footer-logout-btn");
  const loggedIn = isAdminLoggedIn();

  if (dashBtn) {
    if (loggedIn) {
      dashBtn.classList.remove("hidden");
    } else {
      dashBtn.classList.add("hidden");
    }
  }

  if (footerAdminBtn) {
    footerAdminBtn.setAttribute("aria-label", loggedIn ? "Buka dashboard admin" : "Login admin");
    footerAdminBtn.title = loggedIn ? "Admin aktif" : "Admin nonaktif";

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

function handleFooterAdminClick() {
  if (isAdminLoggedIn()) {
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
  clearAdminToken();
  updateNavbarAuthState();
  window.location.href = "index.html";
}
document.addEventListener("DOMContentLoaded", () => {
  initRevealAnimation();
  initTiltCards();
});

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
