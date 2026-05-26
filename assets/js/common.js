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
    "konfirmasi.html": "nav-confirmation"
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
  const loginBtn = document.getElementById("login-nav-btn");
  const logoutBtn = document.getElementById("logout-nav-btn");
  const dashBtn = document.getElementById("nav-dashboard");

  if (!loginBtn || !logoutBtn || !dashBtn) return;

  if (isAdminLoggedIn()) {
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
    dashBtn.classList.remove("hidden");
  } else {
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
    dashBtn.classList.add("hidden");
  }
}

function handleLogout() {
  clearAdminToken();
  updateNavbarAuthState();
  window.location.href = "index.html";
}

function goToAdmin() {
  window.location.href = "dashboard.html";
}
