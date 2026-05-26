// ======================================================
// SHOESAVIOR FRONTEND API CLIENT
// ======================================================
// Ganti URL di bawah dengan URL Web App GAS /exec kamu.
// Contoh:
// const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxxxx/exec";
// ======================================================

const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxm9QJ0nfsfY7LodahVYKyG5YMjGGnhQA7M_Gkc_OvVp4zmzFuu_Xdi1cujJy0ee9aY/exec";
const ADMIN_TOKEN_KEY = "shoesavior_admin_token";

function ensureApiConfigured() {
  if (!GAS_API_URL || GAS_API_URL === "ISI_URL_WEB_APP_GAS_EXEC_KAMU") {
    throw new Error("GAS_API_URL belum diisi di assets/js/api.js");
  }
}

async function apiGet(action, params = {}) {
  ensureApiConfigured();

  const url = new URL(GAS_API_URL);
  url.searchParams.set("action", action);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    method: "GET",
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status + " saat menghubungi API.");
  }

  return response.json();
}

async function apiPost(action, payload = {}) {
  ensureApiConfigured();

  const response = await fetch(GAS_API_URL, {
    method: "POST",
    redirect: "follow",
    headers: {
      // text/plain membuat request tetap sederhana dan cocok untuk Apps Script Web App.
      "Content-Type": "text/plain;charset=utf-8",
    },
    body: JSON.stringify({
      action,
      ...payload,
    }),
  });

  if (!response.ok) {
    throw new Error("HTTP " + response.status + " saat menghubungi API.");
  }

  return response.json();
}

function getAdminToken() {
  return sessionStorage.getItem(ADMIN_TOKEN_KEY) || "";
}

function setAdminToken(token) {
  sessionStorage.setItem(ADMIN_TOKEN_KEY, token || "");
}

function clearAdminToken() {
  sessionStorage.removeItem(ADMIN_TOKEN_KEY);
}

function isAdminLoggedIn() {
  return Boolean(getAdminToken());
}

async function adminLogin(username, password) {
  const response = await apiPost("adminLogin", {
    username,
    password,
  });

  if (response && response.success && response.adminToken) {
    setAdminToken(response.adminToken);
  }

  return response;
}

async function apiAdminPost(action, payload = {}) {
  const adminToken = getAdminToken();

  if (!adminToken) {
    throw new Error("Silakan login admin terlebih dahulu.");
  }

  const response = await apiPost(action, {
    ...payload,
    adminToken,
  });

  if (response && response.success === false) {
    const msg = String(response.message || "");

    if (msg.toLowerCase().includes("token") || msg.toLowerCase().includes("sesi")) {
      clearAdminToken();
    }
  }

  return response;
}
