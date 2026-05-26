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
      <div class="text-center py-12 text-slate-400">
        <i class="fa-solid fa-spinner fa-spin text-2xl mb-3 block"></i>
        Memuat detail pesanan...
      </div>
    `;
  }

  if (actions) actions.classList.add("hidden");

  try {
    const response = await apiGet("getConfirmationData", {
      orderId,
      token
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
      <div class="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5 text-center">
        <div class="w-14 h-14 mx-auto mb-4 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
          <i class="fa-solid fa-triangle-exclamation text-2xl"></i>
        </div>
        <h3 class="text-lg font-bold text-white mb-2">Konfirmasi Tidak Bisa Dibuka</h3>
        <p class="text-sm text-rose-200/80 leading-relaxed">${escapeHtml(message)}</p>
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
      <div class="space-y-5">
        ${imageUrl ? `
          <div class="rounded-3xl overflow-hidden border border-slate-800 bg-slate-950">
            <img src="${escapeHtml(imageUrl)}" class="w-full h-56 object-cover" alt="Foto sepatu">
          </div>
        ` : ""}

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div class="bg-slate-900/70 rounded-2xl p-4 border border-slate-800">
            <div class="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Kode Pesanan</div>
            <div class="font-mono font-black text-sky-400 mt-1">${escapeHtml(order.order_id || "-")}</div>
          </div>

          <div class="bg-slate-900/70 rounded-2xl p-4 border border-slate-800">
            <div class="text-[11px] text-slate-500 uppercase tracking-wider font-semibold">Status</div>
            <div class="font-bold text-white mt-1">${escapeHtml(order.status || "-")}</div>
          </div>
        </div>

        <div class="rounded-3xl border border-slate-800 bg-slate-900/50 p-5 space-y-3 text-sm leading-relaxed">
          ${detailRow("Nama", order.nama_customer)}
          ${detailRow("Alamat", order.alamat)}
          ${detailRow("Sepatu", order.merek_jenis_sepatu)}
          ${detailRow("Layanan", order.layanan)}
          ${detailRow("Pengiriman", order.metode_pengiriman)}
          ${detailRow("Harga Estimasi", order.harga_estimasi)}
          ${detailRow("Harga Final Owner", order.harga_final_owner, "text-sky-400 font-black")}
          ${detailRow("Catatan Owner", order.catatan_owner)}
        </div>

        ${canConfirm ? `
          <div class="rounded-2xl border border-sky-500/20 bg-sky-500/10 p-4 text-sm text-sky-100 leading-relaxed">
            <i class="fa-solid fa-circle-info mr-1 text-sky-400"></i>
            Jika Anda menyetujui harga final, pesanan akan masuk ke antrean pengerjaan. Jika tidak setuju, pesanan akan dibatalkan.
          </div>
        ` : `
          <div class="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-100 leading-relaxed">
            <i class="fa-solid fa-lock mr-1 text-amber-400"></i>
            Pesanan ini sudah tidak bisa dikonfirmasi lagi melalui link ini.
          </div>
        `}
      </div>
    `;
  }

  if (actions) {
    if (canConfirm) {
      actions.classList.remove("hidden");
    } else {
      actions.classList.add("hidden");
    }
  }
}

function detailRow(label, value, extraClass = "text-slate-200") {
  return `
    <div class="grid grid-cols-[130px,1fr] gap-3 border-b border-slate-800/70 last:border-b-0 pb-3 last:pb-0">
      <span class="text-slate-500">${escapeHtml(label)}</span>
      <span class="${extraClass}">${displayValue(value)}</span>
    </div>
  `;
}

async function submitCustomerConfirmation(decision) {
  if (!confirmationOrderId || !confirmationToken) {
    alert("Data konfirmasi tidak lengkap.");
    return;
  }

  const isApprove = decision === "approve";
  const confirmMessage = isApprove
    ? "Setujui harga final dan lanjutkan pesanan?"
    : "Batalkan pesanan ini?";

  if (!confirm(confirmMessage)) return;

  const approveBtn = document.getElementById("approveBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  if (approveBtn) approveBtn.disabled = true;
  if (cancelBtn) cancelBtn.disabled = true;

  try {
    const response = await apiPost("customerConfirm", {
      orderId: confirmationOrderId,
      token: confirmationToken,
      decision
    });

    if (response && response.success) {
      confirmationOrder = response.order;
      renderCustomerConfirmationResult(response.message, response.order, isApprove);
    } else {
      alert("Gagal konfirmasi: " + ((response && response.message) || "Tidak diketahui."));
      if (approveBtn) approveBtn.disabled = false;
      if (cancelBtn) cancelBtn.disabled = false;
    }
  } catch (error) {
    alert("Error koneksi: " + error.message);
    if (approveBtn) approveBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
  }
}

function renderCustomerConfirmationResult(message, order, isApprove) {
  const content = document.getElementById("customerConfirmContent");
  const actions = document.getElementById("customerConfirmActions");

  if (actions) actions.classList.add("hidden");

  if (content) {
    content.innerHTML = `
      <div class="text-center py-8">
        <div class="w-20 h-20 mx-auto rounded-3xl ${isApprove ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"} border flex items-center justify-center mb-5">
          <i class="fa-solid ${isApprove ? "fa-circle-check" : "fa-circle-xmark"} text-4xl"></i>
        </div>

        <h3 class="text-2xl font-black text-white mb-2">
          ${isApprove ? "Pesanan Disetujui" : "Pesanan Dibatalkan"}
        </h3>

        <p class="text-sm text-slate-400 leading-relaxed max-w-md mx-auto">
          ${escapeHtml(message || "Status pesanan berhasil diperbarui.")}
        </p>

        <div class="mt-6 bg-slate-900/70 border border-slate-800 rounded-2xl p-4 text-left max-w-md mx-auto space-y-2 text-sm">
          ${detailRow("Kode", order.order_id)}
          ${detailRow("Status", order.status, isApprove ? "text-emerald-400 font-bold" : "text-rose-400 font-bold")}
          ${detailRow("Waktu", order.customer_confirmed_at || "-")}
        </div>

        <a href="index.html" class="inline-flex mt-7 px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold border border-slate-700">
          Kembali ke Beranda
        </a>
      </div>
    `;
  }
}
