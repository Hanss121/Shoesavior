let ordersState = [];
let latestOrdersRequestId = 0;

document.addEventListener("DOMContentLoaded", () => {
  updateDashboardAuthUI();

  if (isAdminLoggedIn()) {
    setDashboardLocked(false);
    loadOrdersFromServer();
  } else {
    setDashboardLocked(true);
    openLoginModal();
    renderDashboardLocked();
  }
});

function updateDashboardAuthUI() {
  updateNavbarAuthState();
  setDashboardLocked(!isAdminLoggedIn());
}

function setDashboardLocked(isLocked) {
  document.body.classList.toggle("dashboard-locked", Boolean(isLocked));
}

function renderDashboardLocked() {
  const tbody = document.getElementById("dashboardTableBody");
  if (!tbody) return;

  tbody.innerHTML = `
    <tr>
      <td colspan="8" class="text-center py-10 text-slate-500 italic">
        Silakan login admin untuk melihat data pesanan.
      </td>
    </tr>
  `;
}

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
  loginBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i>Memeriksa...`;

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
    loginBtn.innerHTML = `Masuk ke System Dashboard`;
  }
}

async function loadOrdersFromServer() {
  const requestId = ++latestOrdersRequestId;
  const tbody = document.getElementById("dashboardTableBody");

  if (!isAdminLoggedIn()) {
    renderDashboardLocked();
    openLoginModal();
    return;
  }

  if (tbody) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-slate-500 italic">
          <i class="fa-solid fa-spinner fa-spin mr-2"></i>Memuat data dari Spreadsheet...
        </td>
      </tr>
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
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" class="text-center py-8 text-rose-400 italic">
            ${escapeHtml(error.message)}
          </td>
        </tr>
      `;
    }

    if (!isAdminLoggedIn()) {
      openLoginModal();
    }
  }
}

function updateSummaryCards() {
  const total = ordersState.length;
  const waitingReview = ordersState.filter(o => o.status === "Menunggu Tinjauan").length;
  const process = ordersState.filter(o => o.status === "Proses" || o.status === "Menunggu").length;
  const done = ordersState.filter(o => o.status === "Selesai").length;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.innerText = value;
  };

  setText("summaryTotal", total);
  setText("summaryReview", waitingReview);
  setText("summaryProcess", process);
  setText("summaryDone", done);
}

function getStatusBadgeClass(status) {
  switch (status) {
    case "Menunggu Tinjauan":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "Ditinjau Owner":
      return "bg-purple-500/10 text-purple-400 border-purple-500/20";
    case "Konfirmasi Customer":
      return "bg-blue-500/10 text-blue-400 border-blue-500/20";
    case "Menunggu":
      return "bg-zinc-500/10 text-zinc-400 border-zinc-500/20";
    case "Proses":
      return "bg-indigo-500/10 text-indigo-400 border-indigo-500/20";
    case "Selesai":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "Dibatalkan Customer":
      return "bg-rose-500/10 text-rose-400 border-rose-500/20";
    default:
      return "bg-slate-500/10 text-slate-400 border-slate-500/20";
  }
}

function renderDashboardTable() {
  const tbody = document.getElementById("dashboardTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!ordersState || ordersState.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="text-center py-8 text-slate-500 italic">
          Data pesanan masih kosong.
        </td>
      </tr>
    `;
    return;
  }

  ordersState.forEach(order => {
    const status = order.status || "Menunggu Tinjauan";
    const badgeClass = getStatusBadgeClass(status);
    const orderIdJs = escapeJs(order.order_id);
    const actionButtons = buildActionButtons(order);
    const imageUrl = order.url_gambar || "";
    const imageThumb = order.thumbnail_url || order.url_gambar || "";

    const imageCell = imageThumb
      ? `
        <div class="relative w-10 h-10">
          <img
            src="${escapeHtml(imageThumb)}"
            class="w-10 h-10 object-cover rounded-lg border border-slate-800 cursor-pointer bg-slate-900"
            onclick="window.open('${escapeJs(imageUrl || imageThumb)}', '_blank')"
            onerror="this.classList.add('hidden'); this.nextElementSibling.classList.remove('hidden');"
            alt="Foto sepatu"
          >

          <button
            type="button"
            onclick="window.open('${escapeJs(imageUrl || imageThumb)}', '_blank')"
            class="hidden w-10 h-10 rounded-lg border border-slate-800 bg-slate-900 text-sky-400 text-[10px] hover:bg-slate-800"
            title="Lihat foto"
          >
            <i class="fa-solid fa-image"></i>
          </button>
        </div>
      `
      : `<span class="text-[10px] text-slate-500 italic">Tidak ada foto</span>`;

    const finalPrice = order.harga_final_owner === "-" || !order.harga_final_owner
      ? '<span class="text-slate-600 font-normal text-[11px]">Belum Ditentukan</span>'
      : escapeHtml(order.harga_final_owner);

    const row = document.createElement("tr");
    row.className = "hover:bg-slate-900/40 border-b border-slate-800/40 transition-colors";

    row.innerHTML = `
      <td class="py-3 px-5 font-mono font-bold text-sky-400 whitespace-nowrap">${escapeHtml(order.order_id || "-")}</td>

      <td class="py-3 px-4">
        <div class="font-semibold text-white text-xs">${escapeHtml(order.nama_customer || "-")}</div>
        <div class="text-[10px] text-slate-500 mt-0.5 max-w-[170px] truncate">${escapeHtml(order.alamat || "-")}</div>
        <div class="text-[10px] text-emerald-400 mt-0.5">${escapeHtml(order.no_hp || "-")}</div>
      </td>

      <td class="py-3 px-4 font-medium">${escapeHtml(order.merek_jenis_sepatu || "-")}</td>

      <td class="py-3 px-4">
        <div class="text-xs font-medium text-slate-200">${escapeHtml(order.layanan || "-")}</div>
        <div class="text-[10px] text-indigo-400 mt-0.5">${escapeHtml(order.metode_pengiriman || "-")}</div>
      </td>

      <td class="py-3 px-4">${imageCell}</td>

      <td class="py-3 px-4 font-bold text-white">
        <div>${finalPrice}</div>
        <div class="text-[9px] text-slate-500 font-normal mt-0.5">
          Est: ${escapeHtml(order.harga_estimasi || "-")}
        </div>
      </td>

      <td class="py-3 px-4 text-center">
        <span class="inline-block px-2.5 py-1 rounded-full text-[10px] font-semibold border ${badgeClass}">
          ${escapeHtml(status)}
        </span>
      </td>

      <td class="py-3 px-5 text-right font-medium">
        <div class="flex flex-col items-end gap-1">
          <button
            onclick="openOrderDetailModal('${orderIdJs}')"
            class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-bold text-[11px] rounded-md transition-all"
          >
            <i class="fa-solid fa-eye mr-1"></i>Detail
          </button>

          ${actionButtons}
        </div>
      </td>
    `;

    tbody.appendChild(row);
  });
}

function buildActionButtons(order) {
  const status = order.status || "Menunggu Tinjauan";
  const orderIdJs = escapeJs(order.order_id);

  if (status === "Menunggu Tinjauan") {
    return `
      <button onclick="openReviewModal('${orderIdJs}')" class="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded-md transition-all shadow-md">
        Tinjau Harga
      </button>
    `;
  }

  if (status === "Ditinjau Owner") {
    return `
      <div class="flex flex-col gap-1 items-end">
        <button onclick="openWhatsappConfirmation('${orderIdJs}')" class="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-[11px] rounded-md transition-all shadow-md">
          <i class="fa-brands fa-whatsapp mr-1"></i>Kirim WA
        </button>
        <button onclick="copyConfirmationLink('${orderIdJs}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-bold text-[11px] rounded-md transition-all">
          Copy Link
        </button>
      </div>
    `;
  }

  if (status === "Konfirmasi Customer") {
    return `
      <button onclick="changeStatus('${orderIdJs}', 'Menunggu')" class="px-2.5 py-1 bg-zinc-700 hover:bg-zinc-600 text-white font-bold text-[11px] rounded-md transition-all">
        Set Menunggu
      </button>
    `;
  }

  if (status === "Menunggu") {
    return `
      <button onclick="changeStatus('${orderIdJs}', 'Proses')" class="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-[11px] rounded-md transition-all">
        Mulai Proses
      </button>
    `;
  }

  if (status === "Proses") {
    return `
      <button onclick="changeStatus('${orderIdJs}', 'Selesai')" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-md transition-all">
        Selesaikan
      </button>
    `;
  }

  if (status === "Selesai") {
    return `
      <button onclick="openInvoice('${orderIdJs}')" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 border border-slate-700 font-bold text-[11px] rounded-md transition-all">
        <i class="fa-solid fa-receipt mr-1"></i>Nota
      </button>
    `;
  }

  if (status === "Dibatalkan Customer") {
    return `<span class="text-[10px] text-rose-400 italic">Dibatalkan</span>`;
  }

  return `<span class="text-[10px] text-slate-500">No Action</span>`;
}

function filterTable() {
  const searchBar = document.getElementById("searchBar");
  if (!searchBar) return;

  const q = searchBar.value.toLowerCase();
  const rows = document.querySelectorAll("#dashboardTableBody tr");

  rows.forEach(row => {
    const text = row.innerText.toLowerCase();
    row.style.display = text.includes(q) ? "" : "none";
  });
}

async function changeStatus(orderId, newStatus) {
  try {
    const response = await apiAdminPost("updateOrderStatus", {
      orderId,
      updates: {
        status: newStatus
      }
    });

    if (response && response.success) {
      await loadOrdersFromServer();
    } else {
      alert("Gagal mengubah status: " + ((response && response.message) || "Tidak diketahui."));
    }
  } catch (error) {
    alert("Error koneksi saat ubah status: " + error.message);
  }
}

function openReviewModal(orderId) {
  const input = document.getElementById("reviewOrderId");
  const modal = document.getElementById("reviewModal");

  if (input) input.value = orderId;

  if (modal) {
    document.body.appendChild(modal);
    modal.classList.remove("hidden");
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
        note: noteInput
      }
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

function openWhatsappConfirmation(orderId) {
  const order = ordersState.find(o => String(o.order_id) === String(orderId));

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

function copyConfirmationLink(orderId) {
  const order = ordersState.find(o => String(o.order_id) === String(orderId));

  if (!order || !order.confirm_url) {
    alert("Link konfirmasi tidak tersedia.");
    return;
  }

  copyText(order.confirm_url, "Link konfirmasi berhasil disalin.");
}

function buildOrderTimeline(status) {
  if (status === "Dibatalkan Customer") {
    return `
      <div class="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
            <i class="fa-solid fa-circle-xmark"></i>
          </div>
          <div>
            <p class="text-sm font-bold text-rose-300">Pesanan Dibatalkan Customer</p>
            <p class="text-xs text-rose-200/70 mt-0.5">Customer membatalkan pesanan melalui link konfirmasi.</p>
          </div>
        </div>
      </div>
    `;
  }

  const steps = [
    ["Menunggu Tinjauan", "Tinjauan Owner", "Owner mengecek kondisi sepatu dan menentukan harga final."],
    ["Ditinjau Owner", "Harga Ditetapkan", "Link konfirmasi siap dikirim ke customer."],
    ["Konfirmasi Customer", "Disetujui Customer", "Customer menyetujui harga final."],
    ["Menunggu", "Antrean Workshop", "Pesanan masuk antrean pengerjaan."],
    ["Proses", "Sedang Diproses", "Sepatu sedang dirawat oleh tim Shoesavior."],
    ["Selesai", "Selesai", "Pesanan selesai dan nota dapat dicetak."]
  ];

  const currentIndex = steps.findIndex(step => step[0] === status);

  return `
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
      ${steps.map((step, index) => {
        const active = currentIndex >= index;
        return `
          <div class="rounded-2xl border ${active ? "border-sky-500/25 bg-sky-500/10" : "border-slate-800 bg-slate-900/50"} p-4">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl ${active ? "bg-sky-500 text-slate-950" : "bg-slate-800 text-slate-500"} flex items-center justify-center font-bold text-xs">
                ${index + 1}
              </div>
              <div>
                <p class="text-sm font-bold ${active ? "text-white" : "text-slate-500"}">${step[1]}</p>
                <p class="text-[11px] ${active ? "text-slate-300" : "text-slate-600"} mt-0.5">${step[2]}</p>
              </div>
            </div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

function buildDetailItem(label, value, icon = "fa-circle-info") {
  return `
    <div class="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
      <div class="flex items-center gap-2 text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5">
        <i class="fa-solid ${icon}"></i>${escapeHtml(label)}
      </div>
      <div class="text-sm text-slate-100 break-words">${displayValue(value)}</div>
    </div>
  `;
}

function openOrderDetailModal(orderId) {
  const order = ordersState.find(o => String(o.order_id) === String(orderId));

  if (!order) {
    alert("Data pesanan tidak ditemukan.");
    return;
  }

  const modal = document.getElementById("orderDetailModal");
  const content = document.getElementById("orderDetailContent");
  const footer = document.getElementById("orderDetailFooter");
  const status = order.status || "Menunggu Tinjauan";
  const badgeClass = getStatusBadgeClass(status);
  const imageUrl = order.url_gambar || order.thumbnail_url || "";

  if (content) {
    content.innerHTML = `
      <div class="grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        <div class="space-y-4">
          <div class="rounded-3xl overflow-hidden border border-slate-800 bg-slate-950 min-h-[260px] flex items-center justify-center">
            ${imageUrl ? `
              <img src="${escapeHtml(imageUrl)}" alt="Foto sepatu" class="w-full h-full max-h-[360px] object-cover cursor-pointer" onclick="window.open('${escapeJs(imageUrl)}', '_blank')">
            ` : `
              <div class="text-center text-slate-600 py-16">
                <i class="fa-solid fa-image text-4xl mb-3"></i>
                <p class="text-sm">Tidak ada foto</p>
              </div>
            `}
          </div>

          <div class="rounded-2xl border ${badgeClass} p-4">
            <div class="text-[11px] uppercase tracking-wider font-bold opacity-80">Status Saat Ini</div>
            <div class="text-lg font-extrabold mt-1">${escapeHtml(status)}</div>
          </div>
        </div>

        <div class="space-y-5">
          <div>
            <div class="text-xs text-slate-500 uppercase tracking-wider font-semibold">Kode Pesanan</div>
            <div class="font-mono text-2xl font-black text-sky-400 mt-1">${escapeHtml(order.order_id || "-")}</div>
            <div class="text-xs text-slate-500 mt-1">Tanggal: ${escapeHtml(order.tanggal || "-")}</div>
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

          <div class="rounded-2xl bg-slate-900/60 border border-slate-800 p-4">
            <div class="text-[11px] text-slate-500 uppercase tracking-wider font-semibold mb-2">
              <i class="fa-solid fa-note-sticky mr-1"></i>Catatan Owner
            </div>
            <p class="text-sm text-slate-200 leading-relaxed">${displayValue(order.catatan_owner)}</p>
          </div>

          <div>
            <h4 class="text-sm font-bold text-white mb-3">Alur Pesanan</h4>
            ${buildOrderTimeline(status)}
          </div>
        </div>
      </div>
    `;
  }

  if (footer) {
    footer.innerHTML = `
      <button onclick="closeOrderDetailModal()" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700">
        Tutup
      </button>
      ${imageUrl ? `
        <button onclick="window.open('${escapeJs(imageUrl)}', '_blank')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-semibold border border-slate-700">
          <i class="fa-solid fa-image mr-1"></i>Buka Foto
        </button>
      ` : ""}
      ${status === "Ditinjau Owner" && order.whatsapp_url ? `
        <button onclick="openWhatsappConfirmation('${escapeJs(order.order_id)}')" class="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold">
          <i class="fa-brands fa-whatsapp mr-1"></i>Kirim WA
        </button>
      ` : ""}
      ${status === "Selesai" ? `
        <button onclick="openInvoice('${escapeJs(order.order_id)}')" class="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-bold">
          <i class="fa-solid fa-receipt mr-1"></i>Buka Nota
        </button>
      ` : ""}
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

function openInvoice(orderId) {
  const order = ordersState.find(o => String(o.order_id) === String(orderId));
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
