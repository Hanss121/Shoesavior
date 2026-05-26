let currentSelectedImageBase64 = "";
let currentSelectedImageName = "";

const MAX_ORIGINAL_IMAGE_SIZE = 15 * 1024 * 1024;
const MAX_COMPRESSED_IMAGE_SIZE = 4.5 * 1024 * 1024;
const COMPRESSED_IMAGE_MAX_EDGE = 1600;
const COMPRESSED_IMAGE_QUALITY = 0.78;

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

async function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const uploadPromptText = document.getElementById("uploadPromptText");
  const imagePreviewContainer = document.getElementById("imagePreviewContainer");
  const imagePreview = document.getElementById("imagePreview");
  const imageNameText = document.getElementById("imageNameText");

  if (!allowedTypes.includes(file.type)) {
    alert("Format gambar harus JPG, PNG, JPEG, atau WEBP.");
    resetSelectedImage(event.target);
    return;
  }

  if (file.size > MAX_ORIGINAL_IMAGE_SIZE) {
    alert("Ukuran gambar asli maksimal 15MB sebelum kompres.");
    resetSelectedImage(event.target);
    return;
  }

  currentSelectedImageBase64 = "";
  currentSelectedImageName = "";

  if (uploadPromptText) {
    uploadPromptText.classList.remove("hidden");
    uploadPromptText.innerHTML = `
      <i class="fa-solid fa-spinner fa-spin text-3xl text-slate-500 mb-2"></i>
      <p class="text-sm text-slate-400 font-semibold">Mengompres gambar...</p>
      <p class="text-xs text-slate-500">Mohon tunggu sebentar.</p>
    `;
  }

  if (imagePreviewContainer) imagePreviewContainer.classList.add("hidden");

  try {
    const compressed = await compressImageFile(file);

    if (compressed.size > MAX_COMPRESSED_IMAGE_SIZE) {
      alert("Gambar masih terlalu besar setelah dikompres. Coba gunakan foto yang lebih kecil atau crop lebih dekat.");
      resetSelectedImage(event.target);
      restoreUploadPrompt();
      return;
    }

    currentSelectedImageBase64 = compressed.dataUrl;
    currentSelectedImageName = compressed.fileName;

    if (uploadPromptText) uploadPromptText.classList.add("hidden");
    if (imagePreviewContainer) imagePreviewContainer.classList.remove("hidden");
    if (imagePreview) imagePreview.src = compressed.dataUrl;
    if (imageNameText) {
      const originalSize = formatFileSize(file.size);
      const compressedSize = formatFileSize(compressed.size);
      imageNameText.innerText = compressed.fileName + " (" + originalSize + " -> " + compressedSize + ")";
    }
  } catch (error) {
    alert("Gagal mengompres gambar: " + error.message);
    resetSelectedImage(event.target);
    restoreUploadPrompt();
  }
}

function resetSelectedImage(input) {
  if (input) input.value = "";
  currentSelectedImageBase64 = "";
  currentSelectedImageName = "";
}

function restoreUploadPrompt() {
  const uploadPromptText = document.getElementById("uploadPromptText");
  const imagePreviewContainer = document.getElementById("imagePreviewContainer");

  if (uploadPromptText) {
    uploadPromptText.classList.remove("hidden");
    uploadPromptText.innerHTML = `
      <i class="fa-solid fa-cloud-arrow-up text-3xl text-slate-500 mb-2"></i>

      <div class="flex text-sm text-slate-400 justify-center">
        <span class="text-sky-400 font-semibold relative">Klik untuk unggah</span>
        <p class="pl-1">atau seret gambar ke sini</p>
      </div>

      <p class="text-xs text-slate-500">Format PNG, JPG, JPEG, WEBP. Otomatis dikompres sebelum dikirim.</p>
    `;
  }

  if (imagePreviewContainer) imagePreviewContainer.classList.add("hidden");
}

function formatFileSize(bytes) {
  if (bytes >= 1024 * 1024) {
    return (bytes / 1024 / 1024).toFixed(2) + " MB";
  }

  return (bytes / 1024).toFixed(1) + " KB";
}

function getCompressedFileName(fileName) {
  const cleanName = String(fileName || "foto-sepatu").replace(/\.[^/.]+$/, "");
  return cleanName + "-compressed.jpg";
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("File tidak bisa dibaca."));
    reader.readAsDataURL(file);
  });
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const imageUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error("File gambar tidak valid."));
    };

    image.src = imageUrl;
  });
}

async function compressImageFile(file) {
  const image = await loadImageFromFile(file);
  const width = image.naturalWidth || image.width;
  const height = image.naturalHeight || image.height;

  if (!width || !height) {
    throw new Error("Dimensi gambar tidak terbaca.");
  }

  const scale = Math.min(1, COMPRESSED_IMAGE_MAX_EDGE / Math.max(width, height));
  const targetWidth = Math.max(1, Math.round(width * scale));
  const targetHeight = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Browser tidak mendukung kompres gambar.");
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.drawImage(image, 0, 0, targetWidth, targetHeight);

  const compressedDataUrl = canvas.toDataURL("image/jpeg", COMPRESSED_IMAGE_QUALITY);
  const compressedSize = estimateDataUrlSize(compressedDataUrl);

  if (compressedSize >= file.size && file.size <= MAX_COMPRESSED_IMAGE_SIZE) {
    return {
      dataUrl: await readFileAsDataUrl(file),
      fileName: file.name,
      size: file.size
    };
  }

  return {
    dataUrl: compressedDataUrl,
    fileName: getCompressedFileName(file.name),
    size: compressedSize
  };
}

function estimateDataUrlSize(dataUrl) {
  const base64 = String(dataUrl || "").split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
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
  const imagePreviewContainer = document.getElementById("imagePreviewContainer");
  const imageInput = document.getElementById("shoeImageInput");

  if (modal) modal.classList.add("hidden");
  if (form) form.reset();
  if (imageInput) imageInput.value = "";
  if (imagePreviewContainer) imagePreviewContainer.classList.add("hidden");
  restoreUploadPrompt();

  currentSelectedImageBase64 = "";
  currentSelectedImageName = "";
  calculateEstimation();

  window.location.href = "index.html";
}
