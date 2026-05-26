let confirmationOrderId = "";
let confirmationToken = "";
let confirmationOrder = null;

document.addEventListener("DOMContentLoaded", () => {
  handleConfirmationLinkFromUrl();
});

function handleConfirmationLinkFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("orderId");
  const token = params.get("token");

  confirmationOrderId = orderId || "";
  confirmationToken = token || "";

  if (!orderId || !token) {
    renderConfirmationError("Order ID dan token tidak ditemukan di URL konfirmasi.");
    return;
  }

  loadCustomerConfirmation(orderId, token);
}

async function loadCustomerConfirmation(orderId, token) {
  const content = document.getElementById("customerConfirmContent");
  const actions = document.getElementById("customerConfirmActions");

  if (content) {
    content.innerHTML = `
      <div class="confirm-loading">
        <i class="fa-solid fa-spinner fa-spin"></i>
        <span>Memuat detail pesanan...</span>
      </div>
    `;
  }

  if (actions) actions.classList.add("hidden");

  try {
    const response = await apiGet("getConfirmationData", {
      orderId,
      token,
    });

    if (!response || !response.success) {
      renderConfirmationError((response && response.message) || "Link konfirmasi tidak valid.");
      return;
    }

    confirmationOrder = response.order;
    renderCustomerConfirmationDetail(response.order);
  } catch (error) {
    renderConfirmationError("Gagal memuat pesanan: " + error.message);
  }
}

function renderConfirmationError(message) {
  const content = document.getElementById("customerConfirmContent");
  const actions = document.getElementById("customerConfirmActions");

  if (content) {
    content.innerHTML = `
      <div class="confirm-error-box">
        <div class="confirm-error-icon">
          <i class="fa-solid fa-triangle-exclamation"></i>
        </div>
        <h3>Konfirmasi Tidak Bisa Dibuka</h3>
        <p>${escapeHtml(message)}</p>
      </div>
    `;
  }

  if (actions) actions.classList.add("hidden");
}

function renderCustomerConfirmationDetail(order) {
  const content = document.getElementById("customerConfirmContent");
  const actions = document.getElementById("customerConfirmActions");
  const canConfirm = order.status === "Ditinjau Owner";
  const imageUrl = order.thumbnail_url || order.url_gambar || "";

  if (content) {
    content.innerHTML = `
      <div class="confirm-detail">

        ${
          imageUrl
            ? `
          <div class="confirm-image-wrap">
            <img
              src="${escapeHtml(imageUrl)}"
              class="confirm-image"
              alt="Foto sepatu"
              onerror="this.parentElement.classList.add('confirm-image-error'); this.remove();"
            >
          </div>
        `
            : ""
        }

        <div class="confirm-summary-grid">
          <div class="confirm-summary-card">
            <span>Kode Pesanan</span>
            <strong class="mono">${escapeHtml(order.order_id || "-")}</strong>
          </div>

          <div class="confirm-summary-card">
            <span>Status</span>
            <strong>${escapeHtml(order.status || "-")}</strong>
          </div>
        </div>

        <div class="confirm-info-card">
          ${detailRow("Nama", order.nama_customer)}
          ${detailRow("Alamat", order.alamat)}
          ${detailRow("Sepatu", order.merek_jenis_sepatu)}
          ${detailRow("Layanan", order.layanan)}
          ${detailRow("Pengiriman", order.metode_pengiriman)}
          ${detailRow("Harga Estimasi", order.harga_estimasi)}
          ${detailRow("Harga Final Owner", order.harga_final_owner, "confirm-price")}
          ${detailRow("Catatan Owner", order.catatan_owner)}
        </div>

        ${
          canConfirm
            ? `
          <div class="confirm-note confirm-note-info">
            <i class="fa-solid fa-circle-info"></i>
            <p>Jika Anda menyetujui harga final, pesanan akan masuk ke antrean pengerjaan. Jika tidak setuju, pesanan akan dibatalkan.</p>
          </div>
        `
            : `
          <div class="confirm-note confirm-note-warning">
            <i class="fa-solid fa-lock"></i>
            <p>Pesanan ini sudah tidak bisa dikonfirmasi lagi melalui link ini.</p>
          </div>
        `
        }
      </div>
    `;
  }

  if (actions) {
    actions.classList.toggle("hidden", !canConfirm);
  }
}

function detailRow(label, value, extraClass = "") {
  return `
    <div class="confirm-detail-row">
      <span>${escapeHtml(label)}</span>
      <strong class="${extraClass}">${displayValue(value)}</strong>
    </div>
  `;
}

function submitCustomerConfirmation(decision) {
  if (!confirmationOrderId || !confirmationToken) {
    showCustomerSuccessModal("Data Tidak Lengkap", "Data konfirmasi tidak lengkap. Silakan buka ulang link konfirmasi.", false);
    return;
  }

  const isApprove = decision === "approve";

  const modal = document.getElementById("customerDecisionModal");
  const decisionInput = document.getElementById("customerDecisionValue");
  const title = document.getElementById("customerDecisionTitle");
  const message = document.getElementById("customerDecisionMessage");
  const icon = document.getElementById("customerDecisionIcon");
  const submitBtn = document.getElementById("customerDecisionSubmitBtn");

  if (decisionInput) decisionInput.value = decision;

  if (title) {
    title.innerText = isApprove ? "Setujui Pesanan?" : "Batalkan Pesanan?";
  }

  if (message) {
    message.innerText = isApprove ? "Pesanan akan masuk ke antrean pengerjaan setelah Anda menyetujui harga final." : "Pesanan akan dibatalkan dan tidak masuk ke antrean pengerjaan.";
  }

  if (icon) {
    icon.className = isApprove ? "customer-modal-icon customer-modal-icon-success" : "customer-modal-icon customer-modal-icon-danger";

    icon.innerHTML = isApprove ? `<i class="fa-solid fa-circle-check"></i>` : `<i class="fa-solid fa-circle-xmark"></i>`;
  }

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = isApprove ? `Ya, Setujui` : `Ya, Batalkan`;

    submitBtn.classList.toggle("danger", !isApprove);
  }

  if (modal) {
    document.body.appendChild(modal);
    modal.classList.remove("hidden");
  }
}

function closeCustomerDecisionModal() {
  const modal = document.getElementById("customerDecisionModal");
  const submitBtn = document.getElementById("customerDecisionSubmitBtn");

  if (modal) modal.classList.add("hidden");

  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `Ya, Lanjutkan`;
    submitBtn.classList.remove("danger");
  }
}

async function confirmCustomerDecision() {
  const decisionInput = document.getElementById("customerDecisionValue");
  const submitBtn = document.getElementById("customerDecisionSubmitBtn");
  const decision = decisionInput ? decisionInput.value : "";

  if (!decision) {
    showCustomerSuccessModal("Gagal", "Pilihan konfirmasi tidak ditemukan.", false);
    return;
  }

  const approveBtn = document.getElementById("approveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Memproses...`;
  }

  if (approveBtn) approveBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;

  try {
    const response = await apiPost("customerConfirm", {
      orderId: confirmationOrderId,
      token: confirmationToken,
      decision,
    });

    if (response && response.success) {
      const isApprove = decision === "approve";

      closeCustomerDecisionModal();

      confirmationOrder = response.order;
      renderCustomerConfirmationResult(response.message, response.order, isApprove);

      showCustomerSuccessModal(isApprove ? "Pesanan Disetujui" : "Pesanan Dibatalkan", response.message || "Status pesanan berhasil diperbarui.", isApprove);
    } else {
      showCustomerSuccessModal("Gagal Konfirmasi", (response && response.message) || "Terjadi kesalahan saat memproses konfirmasi.", false);

      if (approveBtn) approveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    }
  } catch (error) {
    showCustomerSuccessModal("Error Koneksi", error.message, false);

    if (approveBtn) approveBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Ya, Lanjutkan`;
    }
  }
}

function renderCustomerConfirmationResult(message, order, isApprove) {
  const content = document.getElementById("customerConfirmContent");
  const actions = document.getElementById("customerConfirmActions");

  if (actions) actions.classList.add("hidden");

  if (content) {
    content.innerHTML = `
      <div class="confirm-result">
        <div class="confirm-result-icon ${isApprove ? "success" : "danger"}">
          <i class="fa-solid ${isApprove ? "fa-circle-check" : "fa-circle-xmark"}"></i>
        </div>

        <h3>${isApprove ? "Pesanan Disetujui" : "Pesanan Dibatalkan"}</h3>

        <p>${escapeHtml(message || "Status pesanan berhasil diperbarui.")}</p>

        <div class="confirm-info-card result-card">
          ${detailRow("Kode", order.order_id)}
          ${detailRow("Status", order.status, isApprove ? "confirm-success-text" : "confirm-danger-text")}
          ${detailRow("Waktu", order.customer_confirmed_at || "-")}
        </div>

        <a href="index.html" class="confirm-back-link">
          Kembali ke Beranda
        </a>
      </div>
    `;
  }
}

function showCustomerSuccessModal(title, message, isSuccess = true) {
  const modal = document.getElementById("customerSuccessModal");
  const icon = document.getElementById("customerSuccessIcon");
  const titleEl = document.getElementById("customerSuccessTitle");
  const messageEl = document.getElementById("customerSuccessMessage");

  if (titleEl) titleEl.innerText = title;
  if (messageEl) messageEl.innerText = message;

  if (icon) {
    icon.className = isSuccess ? "customer-modal-icon customer-modal-icon-success" : "customer-modal-icon customer-modal-icon-danger";

    icon.innerHTML = isSuccess ? `<i class="fa-solid fa-circle-check"></i>` : `<i class="fa-solid fa-circle-xmark"></i>`;
  }

  if (modal) {
    document.body.appendChild(modal);
    modal.classList.remove("hidden");
  }
}
