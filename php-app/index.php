<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

startAppSession();
$db = loadDb();
$bootstrapPayload = buildClientPayload($db, $_SESSION['auth']);
$bootstrapJson = json_encode(
    $bootstrapPayload,
    JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT
);
if ($bootstrapJson === false) {
    $bootstrapJson = '{}';
}
?>
<!doctype html>
<html lang="th">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>มาฆบูชาคณะสงฆ์อำเภอศีขรภูมิ — วันมาฆบูชา ครั้งที่ ๑๔ ประจำปี ๒๕๗๐</title>
    <meta name="description" content="ระบบบริหารจัดการการแข่งขันงานสัปดาห์ส่งเสริมวันสำคัญทางพระพุทธศาสนาวันมาฆบูชา ครั้งที่ 14 ประจำปี 2570 ณ โรงเรียนบ้านหนองบัว อำเภอศีขรภูมิ จังหวัดสุรินทร์" />
    <meta property="og:title" content="มาฆบูชาคณะสงฆ์อำเภอศีขรภูมิ — วันมาฆบูชา ครั้งที่ ๑๔ ประจำปี ๒๕๗๐" />
    <meta property="og:description" content="ระบบบริหารจัดการการแข่งขันงานสัปดาห์ส่งเสริมวันสำคัญทางพระพุทธศาสนาวันมาฆบูชา ครั้งที่ 14 ประจำปี 2570" />
    <meta property="og:type" content="website" />
    <link rel="icon" type="image/svg+xml" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='16' fill='%23065f46'/%3E%3Cg fill='none' stroke='%23fcd34d' stroke-width='3.5' stroke-linecap='round'%3E%3Ccircle cx='32' cy='32' r='20'/%3E%3Ccircle cx='32' cy='32' r='14' stroke-width='2'/%3E%3Ccircle cx='32' cy='32' r='4.5' fill='%23fcd34d'/%3E%3Cline x1='32' y1='6' x2='32' y2='58'/%3E%3Cline x1='6' y1='32' x2='58' y2='32'/%3E%3Cline x1='13.6' y1='13.6' x2='50.4' y2='50.4'/%3E%3Cline x1='50.4' y1='13.6' x2='13.6' y2='50.4'/%3E%3C/g%3E%3C/svg%3E" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet" crossorigin="anonymous" />
    <link rel="stylesheet" href="assets/css/style.css" />
  </head>
  <body class="app-body">
    <div class="app-shell">
      <!-- Topmost Countdown Bar -->
      <div class="countdown-bar">
        <div class="countdown-inner">
          <div class="countdown-label">
            <span class="pulse-dot"></span>
            <span id="countdownText">นับถอยหลังสู่วันแข่งขัน (17 กุมภาพันธ์ 2570):</span>
          </div>
          <span id="countdownBadge" class="countdown-badge">
            <strong id="countdownDays">0</strong>
            <span>วัน</span>
          </span>
        </div>
      </div>

      <!-- Top Navigation Bar -->
      <header class="topbar">
        <div class="topbar-left">
          <button type="button" id="btnMobileMenu" class="topbar-icon-btn mobile-only" aria-label="เปิดปิดเมนู">
            <span id="mobileMenuIcon">☰</span>
          </button>
          <button type="button" id="btnDesktopSidebar" class="topbar-icon-btn desktop-only" title="ซ่อน/แสดงแถบเมนูด้านข้าง">
            <span id="desktopSidebarIcon">◧</span>
            <span id="desktopSidebarLabel" class="hidden">แสดงเมนู</span>
          </button>

          <div id="brandLogoBtn" class="brand-wrap" role="button" tabindex="0">
            <div class="brand-emblem">
              <svg viewBox="0 0 64 64" class="dhamma-svg" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-label="ธรรมจักร">
                <circle cx="32" cy="32" r="22" />
                <circle cx="32" cy="32" r="17" stroke-width="2" />
                <circle cx="32" cy="32" r="5" fill="currentColor" />
                <line x1="32" y1="4" x2="32" y2="60" />
                <line x1="4" y1="32" x2="60" y2="32" />
                <line x1="12.2" y1="12.2" x2="51.8" y2="51.8" />
                <line x1="51.8" y1="12.2" x2="12.2" y2="51.8" />
                <circle cx="32" cy="4" r="2" fill="currentColor" />
                <circle cx="32" cy="60" r="2" fill="currentColor" />
                <circle cx="4" cy="32" r="2" fill="currentColor" />
                <circle cx="60" cy="32" r="2" fill="currentColor" />
                <circle cx="12.2" cy="12.2" r="2" fill="currentColor" />
                <circle cx="51.8" cy="51.8" r="2" fill="currentColor" />
                <circle cx="51.8" cy="12.2" r="2" fill="currentColor" />
                <circle cx="12.2" cy="51.8" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <div class="brand-title">มาฆบูชาคณะสงฆ์อำเภอศีขรภูมิ</div>
              <div class="brand-subtitle">Dashboard ระบบการแข่งขันมาฆบูชา 70</div>
            </div>
          </div>
        </div>

        <div class="topbar-right">
          <div class="session-pill" id="topbarSessionPill">
            <strong id="topbarDisplayName">ผู้เยี่ยมชมทั่วไป</strong>
            <span id="topbarRoleTag">(GUEST)</span>
          </div>
          <div id="topbarAuthActions"></div>
        </div>
      </header>

      <!-- Workspace Body -->
      <div class="workspace">
        <aside id="appSidebar" class="sidebar">
          <div>
            <div class="sidebar-header">
              <span id="sidebarRoleTitle" class="sidebar-role-title">เมนูหลัก (ทั่วไป)</span>
              <button type="button" id="btnHideSidebarInner" class="sidebar-hide-btn desktop-only">◧ ซ่อน</button>
            </div>
            <nav id="sidebarNav" class="sidebar-nav"></nav>
          </div>

          <div class="sidebar-account">
            <div class="sidebar-account-label">ผู้เข้าใช้งานระบบ</div>
            <div id="sidebarAccountCard" class="account-card"></div>
          </div>
        </aside>

        <div id="mobileOverlay" class="mobile-overlay hidden"></div>

        <main id="appMain" class="main-content"></main>
      </div>

      <!-- Footer -->
      <footer class="app-footer">
        <div class="footer-inner">
          © พ.ศ. 2570 ระบบการจัดการแข่งขันวันมาฆบูชา คณะสงฆ์อำเภอศีขรภูมิ จังหวัดสุรินทร์ • สงวนสิทธิ์
        </div>
      </footer>
    </div>

    <!-- Modal Layer Containers -->
    <div id="toastContainer"></div>
    <div id="modalContainer"></div>
    <div id="resultsModalContainer"></div>
    <div id="printModalContainer"></div>

    <script type="application/json" id="initial-bootstrap"><?= $bootstrapJson ?></script>
    <script src="assets/js/print.js"></script>
    <script src="assets/js/app.js"></script>
  </body>
</html>
