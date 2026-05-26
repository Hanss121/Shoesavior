document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId") || params.get("id");
  const input = document.getElementById("orderLookupInput");

  if (orderId && input) {
    input.value = orderId;
    lookupOrder(orderId);
  }
});

function handleOrderLookupSubmit(event) {
  event.preventDefault();

  const input = document.getElementById("orderLookupInput");
  const orderId = input ? input.value.trim() : "";

  if (!orderId) {
    renderOrderLookupError("ID pesanan wajib diisi.");
    return;
  }

  const url = new URL(window.location.href);
  url.searchParams.set("orderId", orderId);
  window.history.replaceState({}, "", url.toString());

  lookupOrder(orderId);
}

async function lookupOrder(orderId) {
  const button = document.getElementById("orderLookupBtn");
  const cleanOrderId = String(orderId || "").trim();

  if (!cleanOrderId) {
    renderOrderLookupError("ID pesanan wajib diisi.");
    return;
  }

  renderOrderLookupLoading();

  if (button) {
    button.disabled = true;
    button.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>Mencari...`;
  }

  try {
    const response = await apiGet("getOrderStatus", {
      orderId: cleanOrderId,
    });

    if (!response || !response.success) {
      renderOrderLookupError((response && response.message) || "Pesanan tidak ditemukan.");
      return;
    }

    const order = response.order || response.data || response.result;

    if (!order) {
      renderOrderLookupError("Data pesanan tidak ditemukan di response API.");
      return;
    }

    renderOrderLookupResult(order);
  } catch (error) {
    renderOrderLookupError("Gagal mengambil data pesanan: " + error.message);
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = `<i class="fa-solid fa-search"></i>Cek Pesanan`;
    }
  }
}

function renderOrderLookupLoading() {
  const result = document.getElementById("orderLookupResult");
  if (!result) return;

  result.innerHTML = `
    <div class="order-empty-state">
      <i class="fa-solid fa-spinner fa-spin"></i>
      <h2>Mencari pesanan...</h2>
      <p>Mohon tunggu sebentar.</p>
    </div>
  `;
}

function renderOrderLookupError(message) {
  const result = document.getElementById("orderLookupResult");
  if (!result) return;

  result.innerHTML = `
    <div class="order-error-state">
      <i class="fa-solid fa-triangle-exclamation"></i>
      <h2>Pesanan tidak ditemukan</h2>
      <p>${escapeHtml(message)}</p>
    </div>
  `;
}

function renderOrderLookupResult(order) {
  const result = document.getElementById("orderLookupResult");
  if (!result) return;

  const status = order.status || "Menunggu Tinjauan";
  const imageUrl = order.thumbnail_url || order.url_gambar || "";

  result.innerHTML = `
    <article class="order-result-card">
      <div class="order-result-head">
        <div>
          <span class="order-eyebrow">ID Pesanan</span>
          <h2>${escapeHtml(order.order_id || order.orderId || "-")}</h2>
        </div>
        <span class="order-status-pill ${getOrderStatusClass(status)}">${escapeHtml(status)}</span>
      </div>

      <div class="order-result-grid">
        <div class="order-result-media">
          ${
            imageUrl
              ? `<img src="${escapeHtml(imageUrl)}" alt="Foto sepatu" onerror="this.parentElement.classList.add('is-empty'); this.remove();">`
              : `<div class="order-media-empty"><i class="fa-solid fa-image"></i><span>Foto tidak tersedia</span></div>`
          }
        </div>

        <div class="order-result-content">
          <div class="order-detail-grid">
            ${orderDetailItem("Nama", order.nama_customer || order.name)}
            ${orderDetailItem("Tanggal", order.tanggal || order.created_at)}
            ${orderDetailItem("Sepatu", order.merek_jenis_sepatu || order.shoeType)}
            ${orderDetailItem("Layanan", order.layanan || order.service)}
            ${orderDetailItem("Pengiriman", order.metode_pengiriman || order.deliveryMethod)}
            ${orderDetailItem("Harga Estimasi", order.harga_estimasi || order.estimatedPrice)}
            ${orderDetailItem("Harga Final", order.harga_final_owner || order.finalPrice, "strong")}
            ${orderDetailItem("Catatan Owner", order.catatan_owner || order.note)}
          </div>

          <div class="order-timeline">
            ${buildOrderTimeline(status)}
          </div>
        </div>
      </div>
    </article>
  `;
}

function orderDetailItem(label, value, extraClass = "") {
  return `
    <div class="order-detail-item">
      <span>${escapeHtml(label)}</span>
      <strong class="${extraClass}">${displayValue(value)}</strong>
    </div>
  `;
}

function getOrderStatusClass(status) {
  switch (status) {
    case "Menunggu Tinjauan":
      return "is-review";
    case "Ditinjau Owner":
    case "Konfirmasi Customer":
      return "is-confirm";
    case "Menunggu":
    case "Proses":
      return "is-process";
    case "Selesai":
      return "is-done";
    case "Dibatalkan Customer":
      return "is-canceled";
    default:
      return "is-default";
  }
}

function buildOrderTimeline(status) {
  if (status === "Dibatalkan Customer") {
    return `
      <div class="order-timeline-canceled">
        <i class="fa-solid fa-circle-xmark"></i>
        <div>
          <strong>Pesanan dibatalkan</strong>
          <p>Pesanan ini dibatalkan melalui proses konfirmasi customer.</p>
        </div>
      </div>
    `;
  }

  const steps = [
    ["Menunggu Tinjauan", "Tinjauan owner"],
    ["Ditinjau Owner", "Harga ditetapkan"],
    ["Konfirmasi Customer", "Customer setuju"],
    ["Menunggu", "Masuk antrean"],
    ["Proses", "Sedang dikerjakan"],
    ["Selesai", "Selesai"],
  ];

  const currentIndex = Math.max(0, steps.findIndex((step) => step[0] === status));

  return `
    <div class="order-timeline-list">
      ${steps
        .map((step, index) => {
          const active = index <= currentIndex;

          return `
            <div class="order-timeline-step ${active ? "is-active" : ""}">
              <span>${index + 1}</span>
              <strong>${escapeHtml(step[1])}</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
}
