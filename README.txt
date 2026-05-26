SHOESAVIOR FRONTEND TERPISAH DARI GAS
======================================

Struktur file:
- index.html              = Beranda
- layanan.html            = Form order customer
- dashboard.html          = Dashboard owner/admin
- konfirmasi.html         = Halaman konfirmasi customer dari link WhatsApp
- assets/css/style.css    = Style tambahan
- assets/js/api.js        = Konfigurasi URL API GAS dan helper fetch
- assets/js/utils.js      = Helper umum
- assets/js/common.js     = Navbar dan auth state umum
- assets/js/layanan.js    = Logic form order
- assets/js/dashboard.js  = Logic dashboard admin
- assets/js/konfirmasi.js = Logic konfirmasi customer

LANGKAH WAJIB:
1. Deploy Code.gs API sebagai Web App.
2. Copy URL Web App yang berakhiran /exec.
3. Buka assets/js/api.js.
4. Ganti:
   const GAS_API_URL = "ISI_URL_WEB_APP_GAS_EXEC_KAMU";
   menjadi URL /exec milik kamu.

Contoh:
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxxxxxxx/exec";

5. Di Code.gs API, ganti:
   const FRONTEND_CONFIRMATION_URL = "ISI_URL_FRONTEND_KONFIRMASI_KAMU";
   menjadi URL halaman konfirmasi frontend kamu.

Contoh jika upload ke GitHub Pages:
const FRONTEND_CONFIRMATION_URL = "https://username.github.io/shoesavior/konfirmasi.html";

Login dashboard default mengikuti Code.gs:
Username: admin
Password: password

Saran:
Ubah admin password lewat Script Properties di Apps Script:
ADMIN_USERNAME = admin
ADMIN_PASSWORD = password-yang-kuat
