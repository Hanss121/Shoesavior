let ordersState = [];
let latestOrdersRequestId = 0;

document.addEventListener("DOMContentLoaded", () => {
  updateDashboardAuthUI();
  updateDashboardCompactHeader();

  window.addEventListener("resize", updateDashboardCompactHeader);

  if (isAdminLoggedIn()) {
    setDashboardLocked(false);
    loadOrdersFromServer();
  } else {
    setDashboardLocked(true);
    openLoginModal();
    renderDashboardLocked();
  }
});

/* =========================
   AUTH & LOCK STATE
========================= */

function updateDashboardAuthUI() {
  updateNavbarAuthState();
  setDashboardLocked(!isAdminLoggedIn());
}

function setDashboardLocked(isLocked) {
  document.body.classList.toggle("dashboard-locked", Boolean(isLocked));
}

function renderDashboardLocked() {
  const list = document.getElementById("dashboardCardList");
  if (!list) return;

  list.innerHTML = `
    <div class="dashboard-empty-state">
      <i class="fa-solid fa-lock"></i>
      <span>Silakan login admin untuk melihat data pesanan.</span>
    </div>
  `;
}

/* =========================
   MOBILE TABLE HEADER
========================= */

function updateDashboardCompactHeader() {
  const headerRow = document.querySelector("thead tr");
  if (!headerRow) return;

  const isMobile = window.matchMedia("(max-width: 768px)").matches;

  if (isMobile) {
    headerRow.innerHTML = `
      <th class="py-4 px-4">ID</th>
      <th class="py-4 px-3">Nama</th>
      <th class="py-4 px-4 text-right">Aksi</th>
    `;
  } else {
    headerRow.innerHTML = `
      <th class="py-4 px-5">ID Order</th>
      <th class="py-4 px-4">Customer & Alamat</th>
      <th class="py-4 px-4">Spesifikasi Sepatu</th>
      <th class="py-4 px-4">Layanan & Pengiriman</th>
      <th class="py-4 px-4">Visual Fisik</th>
      <th class="py-4 px-4">Harga Final</th>
      <th class="py-4 px-4 text-center">Status Alur</th>
      <th class="py-4 px-5 text-right">Aksi Kontrol</th>
    `;
  }
}

/* =========================
   LOGIN MODAL
========================= */

function openLoginModal() {
  const modal = document.getElementById("loginModal");

  if (modal) {
    document.body.appendChild(modal);
    modal.classList.remove("hidden");
  }
}

function closeLoginModal() {
  if (!isAdminLoggedIn()) {
    window.location.href = "index.html";
    return;
  }

  const modal = document.getElementById("loginModal");
  const errorText = document.getElementById("loginErrorText");

  if (modal) modal.classList.add("hidden");
  if (errorText) errorText.classList.add("hidden");
}

async function handleLoginSubmit(e) {
  e.preventDefault();

  const user = document.getElementById("adminUser").value.trim();
  const pass = document.getElementById("adminPass").value;
  const errorText = document.getElementById("loginErrorText");
  const loginBtn = document.getElementById("adminLoginSubmitBtn");

  if (errorText) errorText.classList.add("hidden");

  loginBtn.disabled = true;
  loginBtn.innerHTML = `
    <i class="fa-solid fa-spinner fa-spin"></i>
    <span>Memeriksa...</span>
  `;
  try {
    const response = await adminLogin(user, pass);

    if (response && response.success) {
      updateDashboardAuthUI();
      closeLoginModal();
      await loadOrdersFromServer();
    } else {
      if (errorText) {
        errorText.innerText = (response && response.message) || "Username atau password salah.";
        errorText.classList.remove("hidden");
      }
    }
  } catch (error) {
    if (errorText) {
      errorText.innerText = error.message;
      errorText.classList.remove("hidden");
    }
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerHTML = `<span>Masuk ke Dashboard</span>`;
  }
}

/* =========================
   LOAD ORDERS
========================= */

async function loadOrdersFromServer() {
  const requestId = ++latestOrdersRequestId;
  const list = document.getElementById("dashboardCardList");

  if (!isAdminLoggedIn()) {
    renderDashboardLocked();
    openLoginModal();
    return;
  }

  if (list) {
    list.innerHTML = `
      <div class="dashboard-empty-state">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Memuat data dari Spreadsheet...</span>
      </div>
    `;
  }

  try {
    const response = await apiAdminPost("getOrders");

    if (requestId !== latestOrdersRequestId) return;

    if (!response || !response.success) {
      throw new Error((response && response.message) || "Gagal memuat data.");
    }

    ordersState = Array.isArray(response.data) ? response.data : [];

    renderDashboardTable();
    updateSummaryCards();
  } catch (error) {
    if (list) {
      list.innerHTML = `
        <div class="dashboard-empty-state dashboard-empty-error">
          <i class="fa-solid fa-triangle-exclamation"></i>
          <span>${escapeHtml(error.message)}</span>
        </div>
      `;
    }

    if (!isAdminLoggedIn()) {
      openLoginModal();
    }
  }
}
/* =========================
   SUMMARY
========================= */

function updateSummaryCards() {
  const total = ordersState.length;
  const waitingReview = ordersState.filter((o) => o.status === "Menunggu Tinjauan").length;
  const process = ordersState.filter((o) => o.status === "Proses" || o.status === "Menunggu").length;
  const done = ordersState.filter((o) => o.status === "Selesai").length;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };

  setText("summaryTotal", total);
  setText("summaryReview", waitingReview);
  setText("summaryProcess", process);
  setText("summaryDone", done);
}

/* =========================
   STATUS
========================= */

function getStatusBadgeClass(status) {
  switch (status) {
    case "Menunggu Tinjauan":
      return "bg-amber-500/10 text-amber-600 border-amber-500/20";
    case "Ditinjau Owner":
      return "bg-purple-500/10 text-purple-600 border-purple-500/20";
    case "Konfirmasi Customer":
      return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "Menunggu":
      return "bg-zinc-500/10 text-zinc-600 border-zinc-500/20";
    case "Proses":
      return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
    case "Selesai":
      return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "Dibatalkan Customer":
      return "bg-rose-500/10 text-rose-600 border-rose-500/20";
    default:
      return "bg-slate-500/10 text-slate-500 border-slate-500/20";
  }
}

/* =========================
   IMAGE HELPER
========================= */

function getOrderImageData(order) {
  const original = order.url_gambar || "";
  const thumb = order.thumbnail_url || "";

  return {
    imageSrc: thumb || original,
    openUrl: original || thumb,
  };
}

/* =========================
   TABLE
========================= */

function renderDashboardTable() {
  const list = document.getElementById("dashboardCardList");
  const count = document.getElementById("dashboardOrderCount");

  if (!list) return;

  list.innerHTML = "";

  if (count) {
    count.innerText = `${ordersState.length} order`;
  }

  if (!ordersState || ordersState.length === 0) {
    list.innerHTML = `
      <div class="dashboard-empty-state">
        <i class="fa-solid fa-box-open"></i>
        <span>Data pesanan masih kosong.</span>
      </div>
    `;
    return;
  }

  ordersState.forEach((order) => {
    const status = order.status || "Menunggu Tinjauan";
    const orderId = order.order_id || "-";
    const orderIdJs = escapeJs(orderId);
    const customerName = order.nama_customer || "-";
    const actionButtons = buildActionButtons(order);

    const card = document.createElement("article");
    card.className = "dashboard-order-card";
    card.setAttribute("data-search", `${orderId} ${customerName}`.toLowerCase());

    card.innerHTML = `
      <div class="dashboard-order-left">
        <div class="dashboard-order-icon">
          <i class="fa-solid fa-receipt"></i>
        </div>

        <div class="dashboard-order-info">
          <h4>${escapeHtml(customerName)}</h4>
          <p>${escapeHtml(orderId)}</p>
        </div>
      </div>

      <div class="dashboard-order-actions">
        <button
          onclick="openOrderDetailModal('${orderIdJs}')"
          class="dashboard-btn-card dashboard-btn-detail"
        >
          <i class="fa-solid fa-eye"></i>
          Detail
        </button>

        ${actionButtons}
      </div>
    `;

    list.appendChild(card);
  });
}

/* =========================
   ACTION BUTTONS
========================= */

function buildActionButtons(order) {
  const status = order.status || "Menunggu Tinjauan";
  const orderIdJs = escapeJs(order.order_id);

  if (status === "Menunggu Tinjauan") {
    return `
      <button onclick="openReviewModal('${orderIdJs}')" class="dashboard-btn-card dashboard-btn-review">
        <i class="fa-solid fa-magnifying-glass-chart"></i>
        Tinjau
      </button>
    `;
  }

  if (status === "Ditinjau Owner") {
    return `
      <button onclick="openWhatsappConfirmation('${orderIdJs}')" class="dashboard-btn-card dashboard-btn-wa">
        <i class="fa-brands fa-whatsapp"></i>
        WA
      </button>

      <button onclick="copyConfirmationLink('${orderIdJs}')" class="dashboard-btn-card dashboard-btn-copy">
        <i class="fa-solid fa-link"></i>
        Copy
      </button>
    `;
  }

  if (status === "Konfirmasi Customer") {
    return `
      <button onclick="changeStatus('${orderIdJs}', 'Menunggu')" class="dashboard-btn-card dashboard-btn-dark">
        Menunggu
      </button>
    `;
  }

  if (status === "Menunggu") {
    return `
      <button onclick="changeStatus('${orderIdJs}', 'Proses')" class="dashboard-btn-card dashboard-btn-process">
        Proses
      </button>
    `;
  }

  if (status === "Proses") {
    return `
      <button onclick="changeStatus('${orderIdJs}', 'Selesai')" class="dashboard-btn-card dashboard-btn-done">
        Selesai
      </button>
    `;
  }

  if (status === "Selesai") {
    return `
      <button onclick="openInvoice('${orderIdJs}')" class="dashboard-btn-card dashboard-btn-copy">
        <i class="fa-solid fa-receipt"></i>
        Nota
      </button>
    `;
  }

  if (status === "Dibatalkan Customer") {
    return `
      <span class="dashboard-cancelled-label">
        Dibatalkan
      </span>
    `;
  }

  return `
    <span class="dashboard-cancelled-label">
      No Action
    </span>
  `;
}

/* =========================
   SEARCH
========================= */

function filterTable() {
  const searchBar = document.getElementById("searchBar");
  if (!searchBar) return;

  const q = searchBar.value.toLowerCase();
  const cards = document.querySelectorAll(".dashboard-order-card");

  cards.forEach((card) => {
    const text = card.getAttribute("data-search") || card.innerText.toLowerCase();
    card.style.display = text.includes(q) ? "" : "none";
  });
}

/* =========================
   STATUS UPDATE
========================= */
function changeStatus(orderId, newStatus) {
  const order = ordersState.find((o) => String(o.order_id) === String(orderId));

  if (!order) {
    alert("Data pesanan tidak ditemukan.");
    return;
  }

  const modal = document.getElementById("statusConfirmModal");
  const orderIdInput = document.getElementById("statusConfirmOrderId");
  const newStatusInput = document.getElementById("statusConfirmNewStatus");

  const orderTitle = document.getElementById("statusConfirmOrderTitle");
  const customerName = document.getElementById("statusConfirmCustomerName");
  const currentStatus = document.getElementById("statusConfirmCurrentStatus");
  const targetStatus = document.getElementById("statusConfirmTargetStatus");
  const submitBtn = document.getElementById("statusConfirmSubmitBtn");

  if (orderIdInput) orderIdInput.value = orderId;
  if (newStatusInput) newStatusInput.value = newStatus;

  if (orderTitle) orderTitle.innerText = order.order_id || "-";
  if (customerName) customerName.innerText = order.nama_customer || "-";
  if (currentStatus) currentStatus.innerText = order.status || "Menunggu Tinjauan";
  if (targetStatus) targetStatus.innerText = newStatus;

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `Ya, Ubah Status`;
  }

  if (modal) {
    document.body.appendChild(modal);
    modal.classList.remove("hidden");
  }
}

function closeStatusConfirmModal() {
  const modal = document.getElementById("statusConfirmModal");
  const submitBtn = document.getElementById("statusConfirmSubmitBtn");

  if (modal) modal.classList.add("hidden");

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `Ya, Ubah Status`;
  }
}

async function submitStatusChange() {
  const orderId = document.getElementById("statusConfirmOrderId")?.value;
  const newStatus = document.getElementById("statusConfirmNewStatus")?.value;
  const submitBtn = document.getElementById("statusConfirmSubmitBtn");

  if (!orderId || !newStatus) {
    alert("Data perubahan status tidak lengkap.");
    return;
  }

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>Mengubah...`;
  }

  try {
    const response = await apiAdminPost("updateOrderStatus", {
      orderId,
      updates: {
        status: newStatus,
      },
    });

    if (response && response.success) {
      closeStatusConfirmModal();
      await loadOrdersFromServer();
    } else {
      alert("Gagal mengubah status: " + ((response && response.message) || "Tidak diketahui."));
    }
  } catch (error) {
    alert("Error koneksi saat ubah status: " + error.message);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Ya, Ubah Status`;
    }
  }
}

/* =========================
   REVIEW MODAL
========================= */

function openReviewModal(orderId) {
  const order = ordersState.find((o) => String(o.order_id) === String(orderId));
  const input = document.getElementById("reviewOrderId");
  const modal = document.getElementById("reviewModal");

  if (input) input.value = orderId;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value || "-";
  };

  if (order) {
    setText("reviewModalOrderId", order.order_id);
    setText("reviewModalCustomer", order.nama_customer);
    setText("reviewModalShoe", order.merek_jenis_sepatu);
    setText("reviewModalService", order.layanan);
    setText("reviewModalEstimate", order.harga_estimasi);
    setText("reviewModalDelivery", order.metode_pengiriman);

    const priceInput = document.getElementById("reviewFinalPrice");
    const finalRaw = String(order.harga_final_owner || "").replace(/[^\d]/g, "");
    const estimateRaw = String(order.harga_estimasi || "").replace(/[^\d]/g, "");

    if (priceInput && !priceInput.value) {
      priceInput.value = finalRaw || estimateRaw || "";
    }
  }

  if (modal) {
    document.body.appendChild(modal);
    modal.classList.remove("hidden");

    setTimeout(() => {
      const price = document.getElementById("reviewFinalPrice");
      if (price) price.focus();
    }, 80);
  }
}

function closeReviewModal() {
  const modal = document.getElementById("reviewModal");
  const price = document.getElementById("reviewFinalPrice");
  const note = document.getElementById("reviewNote");

  if (modal) modal.classList.add("hidden");
  if (price) price.value = "";
  if (note) note.value = "";
}

async function submitPriceReview() {
  const orderId = document.getElementById("reviewOrderId").value;
  const priceInput = document.getElementById("reviewFinalPrice").value;
  const noteInput = document.getElementById("reviewNote").value || "-";

  if (!priceInput) {
    alert("Mohon masukkan nominal ketetapan harga.");
    return;
  }

  const formattedPrice = formatRupiah(priceInput);

  try {
    const response = await apiAdminPost("updateOrderStatus", {
      orderId,
      updates: {
        status: "Ditinjau Owner",
        finalPrice: formattedPrice,
        note: noteInput,
      },
    });

    if (response && response.success) {
      closeReviewModal();
      await loadOrdersFromServer();
    } else {
      alert("Gagal mengirim ulasan harga: " + ((response && response.message) || "Tidak diketahui."));
    }
  } catch (error) {
    alert("Error koneksi saat kirim harga: " + error.message);
  }
}

/* =========================
   WHATSAPP & LINK
========================= */

function openWhatsappConfirmation(orderId) {
  const order = ordersState.find((o) => String(o.order_id) === String(orderId));

  if (!order) {
    alert("Data pesanan tidak ditemukan.");
    return;
  }

  if (!order.whatsapp_url) {
    alert("Nomor WhatsApp atau link konfirmasi belum tersedia.");
    return;
  }

  window.open(order.whatsapp_url, "_blank");
}

async function copyConfirmationLink(orderId) {
  const order = ordersState.find((o) => String(o.order_id) === String(orderId));

  if (!order || !order.confirm_url) {
    showDashboardToast("Gagal", "Link konfirmasi tidak tersedia.", "error");
    return;
  }

  try {
    await copyToClipboard(order.confirm_url);
    showDashboardToast("Berhasil", "Link konfirmasi berhasil disalin.");
  } catch (error) {
    showDashboardToast("Gagal", "Browser tidak mengizinkan salin otomatis.", "error");
  }
}

async function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";

  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const success = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!success) {
    throw new Error("Copy failed");
  }
}

let dashboardToastTimer = null;

function showDashboardToast(title, message, type = "success") {
  const toast = document.getElementById("dashboardToast");
  const toastTitle = document.getElementById("dashboardToastTitle");
  const toastMessage = document.getElementById("dashboardToastMessage");

  if (!toast) return;

  if (toastTitle) toastTitle.innerText = title;
  if (toastMessage) toastMessage.innerText = message;

  toast.classList.toggle("is-error", type === "error");
  toast.classList.add("is-show");

  clearTimeout(dashboardToastTimer);

  dashboardToastTimer = setTimeout(() => {
    toast.classList.remove("is-show");
  }, 2200);
}

/* =========================
   DETAIL MODAL
========================= */

function buildOrderTimeline(status) {
  if (status === "Dibatalkan Customer") {
    return `
      <div class="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center">
            <i class="fa-solid fa-circle-xmark"></i>
          </div>
          <div>
            <p class="text-sm font-bold text-rose-700">Pesanan Dibatalkan Customer</p>
            <p class="text-xs text-rose-500 mt-0.5">Customer membatalkan pesanan melalui link konfirmasi.</p>
          </div>
        </div>
      </div>
    `;
  }

  const steps = [
    ["Menunggu Tinjauan", "Tinjauan Owner", "Owner mengecek kondisi dan menentukan harga final."],
    ["Ditinjau Owner", "Harga Ditetapkan", "Link konfirmasi siap dikirim ke customer."],
    ["Konfirmasi Customer", "Disetujui Customer", "Customer menyetujui harga final."],
    ["Menunggu", "Antrean Workshop", "Pesanan masuk antrean pengerjaan."],
    ["Proses", "Sedang Diproses", "Sepatu sedang dirawat oleh tim Shoesavior."],
    ["Selesai", "Selesai", "Pesanan selesai dan nota dapat dicetak."],
  ];

  const currentIndex = steps.findIndex((step) => step[0] === status);

  return `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      ${steps
        .map((step, index) => {
          const active = currentIndex >= index;
          return `
          <div class="rounded-2xl border ${active ? "border-cyan-200 bg-cyan-50" : "border-neutral-200 bg-white"} p-4">
            <div class="flex items-start gap-3">
              <div class="w-9 h-9 rounded-xl ${active ? "bg-cyan-500 text-white" : "bg-neutral-100 text-neutral-400"} flex items-center justify-center font-bold text-xs shrink-0">
                ${index + 1}
              </div>
              <div>
                <p class="text-sm font-black ${active ? "text-neutral-950" : "text-neutral-400"}">${step[1]}</p>
                <p class="text-[11px] ${active ? "text-neutral-600" : "text-neutral-400"} mt-0.5">${step[2]}</p>
              </div>
            </div>
          </div>
        `;
        })
        .join("")}
    </div>
  `;
}

function buildDetailItem(label, value, icon = "fa-circle-info") {
  return `
    <div class="rounded-2xl bg-white border border-neutral-200 p-4 shadow-sm">
      <div class="flex items-center gap-2 text-[11px] text-neutral-500 uppercase tracking-wider font-bold mb-1.5">
        <i class="fa-solid ${icon} text-cyan-600"></i>${escapeHtml(label)}
      </div>
      <div class="text-sm text-neutral-950 font-semibold break-words">${displayValue(value)}</div>
    </div>
  `;
}

function openOrderDetailModal(orderId) {
  const order = ordersState.find((o) => String(o.order_id) === String(orderId));

  if (!order) {
    alert("Data pesanan tidak ditemukan.");
    return;
  }

  const modal = document.getElementById("orderDetailModal");
  const content = document.getElementById("orderDetailContent");
  const footer = document.getElementById("orderDetailFooter");
  const status = order.status || "Menunggu Tinjauan";
  const badgeClass = getStatusBadgeClass(status);
  const { imageSrc, openUrl } = getOrderImageData(order);

  if (content) {
    content.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        <div class="space-y-4">
          <div class="rounded-3xl overflow-hidden border border-neutral-200 bg-neutral-50 min-h-[260px] flex items-center justify-center shadow-sm">
            ${
              imageSrc
                ? `
              <img
                src="${escapeHtml(imageSrc)}"
                alt="Foto sepatu"
                class="w-full h-full max-h-[360px] object-cover cursor-pointer"
                onclick="window.open('${escapeJs(openUrl)}', '_blank')"
                onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');"
              >
              <button
                type="button"
                onclick="window.open('${escapeJs(openUrl)}', '_blank')"
                class="hidden w-full min-h-[260px] text-center text-neutral-500 py-16"
              >
                <i class="fa-solid fa-image text-4xl mb-3 text-cyan-600"></i>
                <p class="text-sm font-bold">Foto tidak bisa ditampilkan di popup</p>
                <p class="text-xs mt-1">Klik untuk membuka foto di tab baru.</p>
              </button>
            `
                : `
              <div class="text-center text-neutral-400 py-16">
                <i class="fa-solid fa-image text-4xl mb-3"></i>
                <p class="text-sm">Tidak ada foto</p>
              </div>
            `
            }
          </div>

          <div class="rounded-2xl border ${badgeClass} p-4 bg-white">
            <div class="text-[11px] uppercase tracking-wider font-bold opacity-80">Status Saat Ini</div>
            <div class="text-lg font-black mt-1">${escapeHtml(status)}</div>
          </div>
        </div>

        <div class="space-y-5">
          <div>
            <div class="text-xs text-neutral-500 uppercase tracking-wider font-bold">Kode Pesanan</div>
            <div class="font-mono text-2xl font-black text-cyan-700 mt-1">${escapeHtml(order.order_id || "-")}</div>
            <div class="text-xs text-neutral-500 mt-1">Tanggal: ${escapeHtml(order.tanggal || "-")}</div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            ${buildDetailItem("Nama Customer", order.nama_customer, "fa-user")}
            ${buildDetailItem("Nomor WhatsApp", order.no_hp, "fa-brands fa-whatsapp")}
            ${buildDetailItem("Alamat", order.alamat, "fa-location-dot")}
            ${buildDetailItem("Sepatu", order.merek_jenis_sepatu, "fa-shoe-prints")}
            ${buildDetailItem("Layanan", order.layanan, "fa-spray-can-sparkles")}
            ${buildDetailItem("Metode Pengiriman", order.metode_pengiriman, "fa-truck")}
            ${buildDetailItem("Harga Estimasi", order.harga_estimasi, "fa-wallet")}
            ${buildDetailItem("Harga Final", order.harga_final_owner, "fa-money-bill-wave")}
          </div>

          <div class="rounded-2xl bg-white border border-neutral-200 p-4 shadow-sm">
            <div class="text-[11px] text-neutral-500 uppercase tracking-wider font-bold mb-2">
              <i class="fa-solid fa-note-sticky mr-1 text-cyan-600"></i>Catatan Owner
            </div>
            <p class="text-sm text-neutral-700 leading-relaxed">${displayValue(order.catatan_owner)}</p>
          </div>

          <div>
            <h4 class="text-sm font-black text-neutral-950 mb-3">Alur Pesanan</h4>
            ${buildOrderTimeline(status)}
          </div>
        </div>
      </div>
    `;
  }

  if (footer) {
    footer.innerHTML = `
      <button onclick="closeOrderDetailModal()" class="px-4 py-2 rounded-xl bg-white hover:bg-neutral-50 text-neutral-700 text-xs font-bold border border-neutral-200">
        Tutup
      </button>

      ${
        openUrl
          ? `
        <button onclick="window.open('${escapeJs(openUrl)}', '_blank')" class="px-4 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-cyan-700 text-xs font-bold border border-cyan-100">
          <i class="fa-solid fa-image mr-1"></i>Buka Foto
        </button>
      `
          : ""
      }

      ${
        status === "Ditinjau Owner" && order.whatsapp_url
          ? `
        <button onclick="openWhatsappConfirmation('${escapeJs(order.order_id)}')" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold">
          <i class="fa-brands fa-whatsapp mr-1"></i>Kirim WA
        </button>
      `
          : ""
      }

      ${
        status === "Selesai"
          ? `
        <button onclick="openInvoice('${escapeJs(order.order_id)}')" class="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold">
          <i class="fa-solid fa-receipt mr-1"></i>Buka Nota
        </button>
      `
          : ""
      }
    `;
  }

  if (modal) {
    document.body.appendChild(modal);
    modal.classList.remove("hidden");
  }
}

function closeOrderDetailModal() {
  const modal = document.getElementById("orderDetailModal");
  if (modal) modal.classList.add("hidden");
}

/* =========================
   INVOICE
========================= */

function openInvoice(orderId) {
  const order = ordersState.find((o) => String(o.order_id) === String(orderId));
  if (!order) return;

  document.getElementById("invId").innerText = order.order_id || "-";
  document.getElementById("invDate").innerText = order.tanggal || "-";
  document.getElementById("invCust").innerText = order.nama_customer || "-";
  document.getElementById("invAddress").innerText = order.alamat || "-";
  document.getElementById("invShoe").innerText = order.merek_jenis_sepatu || "-";
  document.getElementById("invPrice").innerText = order.harga_final_owner || "-";
  document.getElementById("invService").innerText = order.layanan || "-";
  document.getElementById("invDelivery").innerText = order.metode_pengiriman || "-";
  document.getElementById("invTotal").innerText = order.harga_final_owner || "-";

  const modal = document.getElementById("invoiceModal");

  if (modal) {
    document.body.appendChild(modal);
    modal.classList.remove("hidden");
  }
}

function closeInvoiceModal() {
  const modal = document.getElementById("invoiceModal");
  if (modal) modal.classList.add("hidden");
}
function toggleAdminPassword() {
  const input = document.getElementById("adminPass");
  const icon = document.getElementById("adminPasswordToggleIcon");
  const label = document.getElementById("adminPasswordToggleLabel");

  if (!input) return;

  const isHidden = input.type === "password";

  input.type = isHidden ? "text" : "password";

  if (icon) {
    icon.className = isHidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye";
  }

  if (label) {
    label.innerText = isHidden ? "Sembunyikan" : "Lihat";
  }
}
