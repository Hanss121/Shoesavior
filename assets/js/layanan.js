let currentSelectedImageBase64 = "";
let currentSelectedImageName = "";

document.addEventListener("DOMContentLoaded", () => {
  calculateEstimation();
});

function calculateEstimation() {
  const serviceSelect = document.getElementById("serviceSelect");
  const estimatedPriceBadge = document.getElementById("estimatedPriceBadge");

  if (!serviceSelect || !estimatedPriceBadge) return;

  const serviceValue = serviceSelect.value;
  const price = serviceValue.split("|")[1] || "0";

  estimatedPriceBadge.innerText = "Rp" + parseInt(price, 10).toLocaleString("id-ID");
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const maxSize = 5 * 1024 * 1024;
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    alert("Format gambar harus JPG, PNG, JPEG, atau WEBP.");
    event.target.value = "";
    currentSelectedImageBase64 = "";
    currentSelectedImageName = "";
    return;
  }

  if (file.size > maxSize) {
    alert("Ukuran gambar maksimal 5MB.");
    event.target.value = "";
    currentSelectedImageBase64 = "";
    currentSelectedImageName = "";
    return;
  }

  currentSelectedImageName = file.name;

  const reader = new FileReader();

  reader.onload = function(e) {
    currentSelectedImageBase64 = e.target.result;

    const uploadPromptText = document.getElementById("uploadPromptText");
    const imagePreviewContainer = document.getElementById("imagePreviewContainer");
    const imagePreview = document.getElementById("imagePreview");
    const imageNameText = document.getElementById("imageNameText");

    if (uploadPromptText) uploadPromptText.classList.add("hidden");
    if (imagePreviewContainer) imagePreviewContainer.classList.remove("hidden");
    if (imagePreview) imagePreview.src = e.target.result;
    if (imageNameText) {
      imageNameText.innerText = file.name + " (" + (file.size / 1024).toFixed(1) + " KB)";
    }
  };

  reader.readAsDataURL(file);
}

async function handleFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const shoeType = document.getElementById("shoeType").value.trim();
  const serviceFull = document.getElementById("serviceSelect").value;
  const serviceName = serviceFull.split("|")[0];
  const estPrice = document.getElementById("estimatedPriceBadge").innerText;
  const delivery = document.getElementById("deliverySelect").value;

  if (!name || !phone || !address || !shoeType || !serviceName || !delivery) {
    alert("Mohon lengkapi semua data pesanan termasuk nomor WhatsApp.");
    return;
  }

  if (!currentSelectedImageBase64 || !currentSelectedImageName) {
    alert("Mohon unggah foto kondisi sepatu terlebih dahulu.");
    return;
  }

  const submitBtn = document.getElementById("submitOrderBtn");
  submitBtn.disabled = true;
  submitBtn.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i>Mengirim data...`;

  const cloudFormData = {
    name,
    phone,
    address,
    shoeType,
    service: serviceName,
    deliveryMethod: delivery,
    estimatedPrice: estPrice,
    imageBlob: currentSelectedImageBase64,
    imageName: currentSelectedImageName
  };

  try {
    const response = await apiPost("submitOrder", {
      data: cloudFormData
    });

    if (response && response.success) {
      openSuccessModal(response.orderId);
    } else {
      alert("Gagal memproses pesanan: " + ((response && response.message) || "Tidak diketahui."));
    }
  } catch (error) {
    alert("Terjadi error koneksi API: " + error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<i class="fa-solid fa-paper-plane"></i>Kirim Formulir Pesanan`;
  }
}

function openSuccessModal(orderId) {
  const text = document.getElementById("successOrderIdText");
  const modal = document.getElementById("successModal");

  if (text) text.innerText = orderId || "-";

  if (modal) {
    document.body.appendChild(modal);
    modal.classList.remove("hidden");
  }
}

function closeSuccessModal() {
  const modal = document.getElementById("successModal");
  const form = document.getElementById("orderForm");
  const uploadPromptText = document.getElementById("uploadPromptText");
  const imagePreviewContainer = document.getElementById("imagePreviewContainer");
  const imageInput = document.getElementById("shoeImageInput");

  if (modal) modal.classList.add("hidden");
  if (form) form.reset();
  if (imageInput) imageInput.value = "";
  if (uploadPromptText) uploadPromptText.classList.remove("hidden");
  if (imagePreviewContainer) imagePreviewContainer.classList.add("hidden");

  currentSelectedImageBase64 = "";
  currentSelectedImageName = "";
  calculateEstimation();

  window.location.href = "index.html";
}
