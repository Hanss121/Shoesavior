function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeJs(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'")
    .replaceAll('"', '\\"')
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r");
}

function displayValue(value) {
  const text = String(value ?? "").trim();
  return text ? escapeHtml(text) : "-";
}

function formatRupiah(numberValue) {
  const clean = String(numberValue || "").replace(/\D/g, "");
  const number = parseInt(clean || "0", 10);
  return "Rp" + number.toLocaleString("id-ID");
}

function fallbackCopyText(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    document.execCommand("copy");
    alert("Link berhasil disalin.");
  } catch (err) {
    alert("Gagal menyalin link. Silakan salin manual: " + text);
  }

  document.body.removeChild(textarea);
}

async function copyText(text, successMessage = "Berhasil disalin.") {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      alert(successMessage);
      return;
    } catch (error) {
      fallbackCopyText(text);
      return;
    }
  }

  fallbackCopyText(text);
}
