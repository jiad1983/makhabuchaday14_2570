<?php
declare(strict_types=1);

require_once __DIR__ . '/config.php';

startAppSession();

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store, no-cache, must-revalidate');

function jsonResponse(int $statusCode, array $data): void
{
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function getJsonBody(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }
    $decoded = json_decode($raw, true);
    return is_array($decoded) ? $decoded : [];
}

function verifyCsrf(): void
{
    $headerToken = (string)($_SERVER['HTTP_X_CSRF_TOKEN'] ?? '');
    $sessionToken = (string)($_SESSION['csrf_token'] ?? '');
    if ($headerToken === '' || $sessionToken === '' || !hash_equals($sessionToken, $headerToken)) {
        jsonResponse(403, ['ok' => false, 'error' => 'Session หมดอายุหรือไม่ถูกต้อง กรุณารีเฟรชหน้าเว็บแล้วลองใหม่อีกครั้ง']);
    }
}

function currentRole(): string
{
    return (string)($_SESSION['auth']['role'] ?? 'guest');
}

function requireRoles(array $allowedRoles): void
{
    if (!in_array(currentRole(), $allowedRoles, true)) {
        jsonResponse(403, ['ok' => false, 'error' => 'ท่านไม่มีสิทธิ์ดำเนินการในส่วนนี้ กรุณาเข้าสู่ระบบด้วยสิทธิ์ที่เหมาะสม']);
    }
}

function findCompetition(string $compId): ?array
{
    foreach (getCompetitions() as $comp) {
        if ($comp['id'] === $compId) {
            return $comp;
        }
    }
    return null;
}

function normalizeUploadCategory(string $category): string
{
    $clean = strtolower(trim($category));
    return in_array($clean, UPLOAD_CATEGORIES, true) ? $clean : 'students';
}

function isSafeLocalUploadPath(string $path): bool
{
    return (bool)preg_match('/^uploads\/(?:(?:students|coaches|judges|backgrounds)\/)?[a-zA-Z0-9_\-]+\.(png|jpg|jpeg|gif|webp)$/i', trim($path));
}

function saveValidatedBinaryImage(string $binary, string $category = 'students', string $prefix = 'img'): string
{
    if ($binary === '' || strlen($binary) > 6 * 1024 * 1024) {
        return '';
    }
    $info = @getimagesizefromstring($binary);
    if ($info === false || empty($info['mime'])) {
        return '';
    }
    $mimeToExt = [
        'image/png' => 'png',
        'image/jpeg' => 'jpg',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
    ];
    $ext = $mimeToExt[$info['mime']] ?? '';
    if ($ext === '') {
        return '';
    }

    ensureStorageDirs();
    $cat = normalizeUploadCategory($category);
    $safePrefix = preg_replace('/[^a-z0-9_\-]/i', '', $prefix) ?: 'img';
    $filename = $safePrefix . '_' . bin2hex(random_bytes(8)) . '.' . $ext;
    $targetPath = UPLOADS_DIR . DIRECTORY_SEPARATOR . $cat . DIRECTORY_SEPARATOR . $filename;
    if (@file_put_contents($targetPath, $binary, LOCK_EX) === false) {
        return '';
    }
    return 'uploads/' . $cat . '/' . $filename;
}

function saveValidatedImageDataUrl(string $dataUrl, string $prefix = 'img', string $category = 'students'): string
{
    $trimmed = trim($dataUrl);
    if ($trimmed === '') {
        return '';
    }
    if (isSafeLocalUploadPath($trimmed)) {
        return $trimmed;
    }
    if (!preg_match('/^data:image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+\/=]+)$/i', $trimmed, $matches)) {
        return '';
    }
    $binary = base64_decode($matches[2], true);
    if ($binary === false) {
        return '';
    }
    return saveValidatedBinaryImage($binary, $category, $prefix);
}

function deleteLocalUploadIfUnused(string $path, array $db): void
{
    $trimmed = trim($path);
    if (!preg_match('/^uploads\/(?:(students|coaches|judges|backgrounds)\/)?([a-zA-Z0-9_\-]+\.(png|jpg|jpeg|gif|webp))$/i', $trimmed, $m)) {
        return;
    }
    $encoded = json_encode($db, JSON_UNESCAPED_UNICODE);
    if ($encoded !== false && strpos($encoded, $trimmed) !== false) {
        return;
    }
    $subDir = !empty($m[1]) ? (strtolower($m[1]) . DIRECTORY_SEPARATOR) : '';
    $full = realpath(UPLOADS_DIR . DIRECTORY_SEPARATOR . $subDir . basename($m[2]));
    $baseReal = realpath(UPLOADS_DIR);
    if ($full !== false && $baseReal !== false && strpos($full, $baseReal . DIRECTORY_SEPARATOR) === 0 && is_file($full)) {
        @unlink($full);
    }
}

function safeStrLen(string $val): int
{
    return function_exists('mb_strlen') ? mb_strlen($val, 'UTF-8') : strlen($val);
}

function collectRegUploadPaths(array $reg): array
{
    $paths = [];
    foreach ($reg['students'] ?? [] as $s) {
        if (!empty($s['photoUrl']) && is_string($s['photoUrl'])) {
            $paths[] = $s['photoUrl'];
        }
    }
    foreach ($reg['coaches'] ?? [] as $c) {
        if (is_array($c) && !empty($c['photoUrl']) && is_string($c['photoUrl'])) {
            $paths[] = $c['photoUrl'];
        }
    }
    return $paths;
}

function persistDbOrFail(array $db): void
{
    if (!saveDb($db)) {
        jsonResponse(500, ['ok' => false, 'error' => 'ไม่สามารถบันทึกข้อมูลลงโฟลเดอร์ data/ ได้ กรุณาตรวจสอบสิทธิ์เขียนไฟล์ (755/775)']);
    }
}

$action = (string)($_GET['action'] ?? '');
$method = strtoupper((string)($_SERVER['REQUEST_METHOD'] ?? 'GET'));

$db = loadDb();

if ($method === 'GET' && ($action === 'bootstrap' || $action === '')) {
    $payload = buildClientPayload($db, $_SESSION['auth']);
    @session_write_close();
    jsonResponse(200, ['ok' => true, 'state' => $payload]);
}

if ($method === 'GET' && $action === 'export_backup') {
    requireRoles(['admin']);
    $payload = buildClientPayload($db, $_SESSION['auth']);
    unset($payload['csrfToken']);
    $payload['exportedAt'] = date('c');
    @session_write_close();
    header('Content-Disposition: attachment; filename="makhapuja_backup_' . date('Ymd_His') . '.json"');
    http_response_code(200);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

if ($method !== 'POST') {
    jsonResponse(405, ['ok' => false, 'error' => 'Method not allowed']);
}

verifyCsrf();

if ($action === 'upload_image') {
    $role = currentRole();
    if (!in_array($role, ['admin', 'manager', 'school', 'judge'], true)) {
        jsonResponse(403, ['ok' => false, 'error' => 'กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ']);
    }
    $rawCategory = (string)($_POST['category'] ?? '');
    $bodyFallback = [];
    if ($rawCategory === '' && empty($_FILES['image'])) {
        $bodyFallback = getJsonBody();
        $rawCategory = (string)($bodyFallback['category'] ?? 'students');
    }
    $category = normalizeUploadCategory($rawCategory);
    if ($category === 'backgrounds' && $role !== 'admin') {
        jsonResponse(403, ['ok' => false, 'error' => 'เฉพาะผู้ดูแลระบบเท่านั้นที่อัปโหลดภาพพื้นหลังได้']);
    }
    if ($category === 'judges' && !in_array($role, ['admin', 'judge'], true)) {
        jsonResponse(403, ['ok' => false, 'error' => 'ไม่มีสิทธิ์อัปโหลดภาพกรรมการ']);
    }
    if (($category === 'students' || $category === 'coaches') && !in_array($role, ['admin', 'manager', 'school'], true)) {
        jsonResponse(403, ['ok' => false, 'error' => 'ไม่มีสิทธิ์อัปโหลดภาพผู้เข้าแข่งขันหรือครูผู้ฝึกสอน']);
    }

    $prefixMap = ['students' => 'stu', 'coaches' => 'coach', 'judges' => 'jdg', 'backgrounds' => 'bg'];
    $prefix = $prefixMap[$category] ?? 'img';

    $savedPath = '';
    if (!empty($_FILES['image']) && is_array($_FILES['image'])) {
        $errCode = (int)($_FILES['image']['error'] ?? UPLOAD_ERR_NO_FILE);
        if ($errCode !== UPLOAD_ERR_OK) {
            jsonResponse(400, ['ok' => false, 'error' => 'การอัปโหลดไฟล์รูปภาพไม่สมบูรณ์']);
        }
        $tmpName = (string)($_FILES['image']['tmp_name'] ?? '');
        $size = (int)($_FILES['image']['size'] ?? 0);
        if ($tmpName === '' || !is_uploaded_file($tmpName) || $size <= 0 || $size > 6 * 1024 * 1024) {
            jsonResponse(400, ['ok' => false, 'error' => 'ไฟล์รูปภาพไม่ถูกต้องหรือมีขนาดใหญ่เกิน 6 MB']);
        }
        $binary = @file_get_contents($tmpName);
        if ($binary === false) {
            jsonResponse(400, ['ok' => false, 'error' => 'ไม่สามารถอ่านไฟล์รูปภาพที่อัปโหลดได้']);
        }
        $savedPath = saveValidatedBinaryImage($binary, $category, $prefix);
    } else {
        $dataUrl = (string)($bodyFallback['dataUrl'] ?? '');
        $savedPath = saveValidatedImageDataUrl($dataUrl, $prefix, $category);
    }

    if ($savedPath === '') {
        jsonResponse(400, ['ok' => false, 'error' => 'รองรับเฉพาะไฟล์รูปภาพ PNG, JPG, GIF หรือ WebP (ขนาดไม่เกิน 6 MB)']);
    }

    jsonResponse(200, [
        'ok' => true,
        'url' => $savedPath,
        'category' => $category,
        'message' => 'อัปโหลดและจัดเก็บไฟล์รูปภาพลงบนเซิร์ฟเวอร์เรียบร้อยแล้ว',
    ]);
}

$body = getJsonBody();

switch ($action) {
    case 'login': {
        $tab = (string)($body['loginTab'] ?? 'school');
        $username = trim((string)($body['username'] ?? ''));
        $password = trim((string)($body['password'] ?? ''));

        if ($username === '' || $password === '') {
            jsonResponse(400, ['ok' => false, 'error' => 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน']);
        }

        if ($tab === 'admin') {
            $adminCred = $db['adminCredentials'] ?? [];
            $expectedUser = (string)($adminCred['username'] ?? 'admin');
            $hash = (string)($adminCred['passwordHash'] ?? '');
            $legacyPass = (string)($adminCred['password'] ?? '');
            $passOk = ($hash !== '' && password_verify($password, $hash))
                || ($legacyPass !== '' && hash_equals($legacyPass, $password));

            if ($username === $expectedUser && $passOk) {
                session_regenerate_id(true);
                $_SESSION['auth'] = [
                    'role' => 'admin',
                    'userId' => 'admin-01',
                    'displayName' => (string)($adminCred['displayName'] ?? 'ผู้ดูแลระบบ'),
                    'schoolId' => null,
                    'judgeId' => null,
                ];
                jsonResponse(200, [
                    'ok' => true,
                    'message' => 'เข้าสู่ระบบผู้ดูแลระบบสำเร็จ (' . $_SESSION['auth']['displayName'] . ')',
                    'state' => buildClientPayload($db, $_SESSION['auth']),
                ]);
            }
            jsonResponse(401, ['ok' => false, 'error' => 'ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง']);
        }

        if ($tab === 'school') {
            $matched = null;
            foreach ($db['schools'] as $sch) {
                if (trim((string)($sch['schoolCode'] ?? '')) === $username) {
                    $hash = (string)($sch['passwordHash'] ?? '');
                    $legacyPass = (string)($sch['password'] ?? '');
                    $ok = ($hash !== '' && password_verify($password, $hash))
                        || ($legacyPass !== '' && hash_equals($legacyPass, $password));
                    if ($ok) {
                        $matched = $sch;
                        break;
                    }
                }
            }
            if ($matched) {
                session_regenerate_id(true);
                $_SESSION['auth'] = [
                    'role' => 'school',
                    'userId' => (string)$matched['id'],
                    'displayName' => (string)$matched['name'],
                    'schoolId' => (string)$matched['id'],
                    'judgeId' => null,
                ];
                jsonResponse(200, [
                    'ok' => true,
                    'message' => 'ยินดีต้อนรับ ' . $matched['name'],
                    'state' => buildClientPayload($db, $_SESSION['auth']),
                ]);
            }
            jsonResponse(401, ['ok' => false, 'error' => 'รหัสสถานศึกษาหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง']);
        }

        if ($tab === 'judge') {
            $matched = null;
            foreach ($db['judges'] as $jdg) {
                if (trim((string)($jdg['username'] ?? '')) === $username) {
                    $hash = (string)($jdg['passwordHash'] ?? '');
                    $legacyPass = (string)($jdg['password'] ?? '');
                    $ok = ($hash !== '' && password_verify($password, $hash))
                        || ($legacyPass !== '' && hash_equals($legacyPass, $password));
                    if ($ok) {
                        $matched = $jdg;
                        break;
                    }
                }
            }
            if ($matched) {
                session_regenerate_id(true);
                $_SESSION['auth'] = [
                    'role' => 'judge',
                    'userId' => (string)$matched['id'],
                    'displayName' => (string)$matched['name'],
                    'schoolId' => null,
                    'judgeId' => (string)$matched['id'],
                ];
                jsonResponse(200, [
                    'ok' => true,
                    'message' => 'เข้าสู่ระบบกรรมการตัดสิน: ' . $matched['name'],
                    'state' => buildClientPayload($db, $_SESSION['auth']),
                ]);
            }
            jsonResponse(401, ['ok' => false, 'error' => 'Username หรือ Password ของกรรมการไม่ถูกต้อง']);
        }

        if ($tab === 'manager') {
            $matched = null;
            foreach (($db['managers'] ?? []) as $mgr) {
                if (trim((string)($mgr['username'] ?? '')) === $username) {
                    $hash = (string)($mgr['passwordHash'] ?? '');
                    if ($hash !== '' && password_verify($password, $hash)) {
                        $matched = $mgr;
                        break;
                    }
                }
            }
            if ($matched) {
                session_regenerate_id(true);
                $_SESSION['auth'] = [
                    'role' => 'manager',
                    'userId' => (string)$matched['id'],
                    'displayName' => (string)$matched['name'],
                    'schoolId' => null,
                    'judgeId' => null,
                ];
                jsonResponse(200, [
                    'ok' => true,
                    'message' => 'เข้าสู่ระบบผู้จัดการแข่งขัน: ' . $matched['name'],
                    'state' => buildClientPayload($db, $_SESSION['auth']),
                ]);
            }
            jsonResponse(401, ['ok' => false, 'error' => 'ชื่อผู้ใช้หรือรหัสผ่านผู้จัดการแข่งขันไม่ถูกต้อง']);
        }

        jsonResponse(400, ['ok' => false, 'error' => 'ประเภทการเข้าสู่ระบบไม่ถูกต้อง']);
    }

    case 'school_signup': {
        $code = trim((string)($body['schoolCode'] ?? ''));
        $name = trim((string)($body['name'] ?? ''));
        $director = trim((string)($body['director'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $password = trim((string)($body['password'] ?? ''));

        if ($code === '' || $name === '' || $director === '' || $password === '') {
            jsonResponse(400, ['ok' => false, 'error' => 'กรุณากรอกข้อมูลโรงเรียนให้ครบถ้วน']);
        }
        if (safeStrLen($password) < 4) {
            jsonResponse(400, ['ok' => false, 'error' => 'กรุณากำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษร']);
        }
        foreach ($db['schools'] as $sch) {
            if (trim((string)($sch['schoolCode'] ?? '')) === $code) {
                jsonResponse(409, ['ok' => false, 'error' => 'รหัสสถานศึกษานี้มีในระบบแล้ว (จำกัดโรงเรียนละ ๑ User)']);
            }
        }

        $safeCodeSlug = preg_replace('/[^a-zA-Z0-9_\-]/', '', $code) ?: bin2hex(random_bytes(3));
        $newSchool = [
            'id' => 'sch-' . $safeCodeSlug . '-' . time(),
            'schoolCode' => $code,
            'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
            'name' => $name,
            'director' => $director,
            'phone' => $phone,
        ];
        $db['schools'][] = $newSchool;
        persistDbOrFail($db);

        session_regenerate_id(true);
        $_SESSION['auth'] = [
            'role' => 'school',
            'userId' => $newSchool['id'],
            'displayName' => $newSchool['name'],
            'schoolId' => $newSchool['id'],
            'judgeId' => null,
        ];

        jsonResponse(200, [
            'ok' => true,
            'message' => 'สมัครสมาชิกโรงเรียน ' . $name . ' และเข้าสู่ระบบเรียบร้อยแล้ว',
            'state' => buildClientPayload($db, $_SESSION['auth']),
        ]);
    }

    case 'logout': {
        session_regenerate_id(true);
        $_SESSION['auth'] = [
            'role' => 'guest',
            'userId' => null,
            'displayName' => 'ผู้เยี่ยมชมทั่วไป',
            'schoolId' => null,
            'judgeId' => null,
        ];
        jsonResponse(200, [
            'ok' => true,
            'message' => 'ออกจากระบบเรียบร้อยแล้ว',
            'state' => buildClientPayload($db, $_SESSION['auth']),
        ]);
    }

    case 'save_registration': {
        requireRoles(['admin', 'manager', 'school']);
        $role = currentRole();
        $editingIdPreview = isset($body['id']) && is_string($body['id']) && trim($body['id']) !== '' ? trim($body['id']) : null;
        if ($role === 'school' && empty($db['registrationOpen']) && $editingIdPreview === null) {
            jsonResponse(403, ['ok' => false, 'error' => 'ขณะนี้ระบบปิดรับสมัครแข่งขันแล้ว']);
        }

        $editingId = isset($body['id']) && is_string($body['id']) && trim($body['id']) !== ''
            ? trim($body['id'])
            : null;
        $schoolId = $role === 'school'
            ? (string)($_SESSION['auth']['schoolId'] ?? '')
            : trim((string)($body['schoolId'] ?? ''));
        $compId = trim((string)($body['competitionId'] ?? ''));
        $level = trim((string)($body['level'] ?? ''));

        $comp = findCompetition($compId);
        if (!$comp || !in_array($level, $comp['levels'], true)) {
            jsonResponse(400, ['ok' => false, 'error' => 'รายการแข่งขันหรือระดับชั้นไม่ถูกต้อง']);
        }

        $schoolExists = false;
        foreach ($db['schools'] as $sch) {
            if (($sch['id'] ?? '') === $schoolId) {
                $schoolExists = true;
                break;
            }
        }
        if (!$schoolExists) {
            jsonResponse(400, ['ok' => false, 'error' => 'ไม่พบข้อมูลโรงเรียนที่เลือก']);
        }

        $rawStudents = is_array($body['students'] ?? null) ? $body['students'] : [];
        $students = [];
        foreach ($rawStudents as $st) {
            if (!is_array($st)) {
                continue;
            }
            $stName = trim((string)($st['name'] ?? ''));
            if ($stName === '') {
                continue;
            }
            $photo = saveValidatedImageDataUrl((string)($st['photoUrl'] ?? ''), 'stu', 'students');
            $students[] = ['name' => $stName, 'photoUrl' => $photo];
        }
        if (count($students) === 0 || count($students) > (int)$comp['teamSize']) {
            jsonResponse(400, ['ok' => false, 'error' => 'กรุณากรอกรายชื่อผู้เข้าแข่งขันให้ถูกต้องตามจำนวนสมาชิก (' . $comp['type'] . ')']);
        }

        $rawCoaches = is_array($body['coaches'] ?? null) ? $body['coaches'] : [];
        $coaches = [];
        foreach ($rawCoaches as $c) {
            $cName = is_string($c) ? trim($c) : trim((string)($c['name'] ?? ''));
            if ($cName === '') {
                continue;
            }
            $cPhoto = is_array($c) ? saveValidatedImageDataUrl((string)($c['photoUrl'] ?? ''), 'coach', 'coaches') : '';
            $coaches[] = ['name' => $cName, 'photoUrl' => $cPhoto];
        }
        if (count($coaches) === 0 || count($coaches) > 3) {
            jsonResponse(400, ['ok' => false, 'error' => 'กรุณากรอกรายชื่อครูผู้ฝึกสอน 1-3 ท่าน']);
        }

        $qSong = trim((string)($body['qualifyingSong'] ?? ''));
        $fSong = trim((string)($body['finalSong'] ?? ''));
        if (!empty($comp['requiresSongs']) && ($qSong === '' || $fSong === '')) {
            jsonResponse(400, ['ok' => false, 'error' => 'รายการเพลงไทยลูกทุ่งต้องระบุชื่อเพลงรอบคัดเลือกและรอบตัดสิน']);
        }

        // Duplicate check per school + competition + level
        foreach ($db['registrations'] as $existing) {
            if (
                ($existing['id'] ?? '') !== $editingId
                && ($existing['schoolId'] ?? '') === $schoolId
                && ($existing['competitionId'] ?? '') === $compId
                && ($existing['level'] ?? '') === $level
            ) {
                jsonResponse(409, ['ok' => false, 'error' => 'โรงเรียนนี้สมัครกิจกรรม "' . $comp['name'] . '" ระดับ "' . $level . '" ไปแล้ว']);
            }
        }

        $removedUploads = [];
        if ($editingId !== null) {
            $updated = false;
            foreach ($db['registrations'] as $idx => $existing) {
                if (($existing['id'] ?? '') === $editingId) {
                    if ($role === 'school' && ($existing['schoolId'] ?? '') !== $schoolId) {
                        jsonResponse(403, ['ok' => false, 'error' => 'ไม่สามารถแก้ไขรายการของโรงเรียนอื่นได้']);
                    }
                    $removedUploads = collectRegUploadPaths($existing);
                    $db['registrations'][$idx] = [
                        'id' => $editingId,
                        'schoolId' => $schoolId,
                        'competitionId' => $compId,
                        'level' => $level,
                        'students' => $students,
                        'coaches' => $coaches,
                        'qualifyingSong' => $comp['requiresSongs'] ? $qSong : '',
                        'finalSong' => $comp['requiresSongs'] ? $fSong : '',
                    ];
                    $updated = true;
                    break;
                }
            }
            if (!$updated) {
                jsonResponse(404, ['ok' => false, 'error' => 'ไม่พบรายการสมัครที่ต้องการแก้ไข']);
            }
            $msg = 'บันทึกการแก้ไขข้อมูลการสมัครเรียบร้อยแล้ว';
        } else {
            $db['registrations'][] = [
                'id' => 'reg-' . bin2hex(random_bytes(5)),
                'schoolId' => $schoolId,
                'competitionId' => $compId,
                'level' => $level,
                'students' => $students,
                'coaches' => $coaches,
                'qualifyingSong' => $comp['requiresSongs'] ? $qSong : '',
                'finalSong' => $comp['requiresSongs'] ? $fSong : '',
            ];
            $msg = 'ลงทะเบียนเข้าร่วมการแข่งขันเรียบร้อยแล้ว';
        }

        persistDbOrFail($db);
        foreach ($removedUploads as $oldPath) {
            deleteLocalUploadIfUnused($oldPath, $db);
        }
        jsonResponse(200, ['ok' => true, 'message' => $msg, 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'delete_registration': {
        requireRoles(['admin', 'manager', 'school']);
        $role = currentRole();
        if ($role === 'school' && empty($db['registrationOpen'])) {
            jsonResponse(403, ['ok' => false, 'error' => 'ขณะนี้ระบบปิดรับสมัครแข่งขันแล้ว']);
        }
        $regId = trim((string)($body['id'] ?? ''));
        $foundIndex = null;
        $removedUploads = [];
        foreach ($db['registrations'] as $idx => $r) {
            if (($r['id'] ?? '') === $regId) {
                if ($role === 'school' && ($r['schoolId'] ?? '') !== ($_SESSION['auth']['schoolId'] ?? '')) {
                    jsonResponse(403, ['ok' => false, 'error' => 'ไม่สามารถลบรายการของโรงเรียนอื่นได้']);
                }
                $foundIndex = $idx;
                $removedUploads = collectRegUploadPaths($r);
                break;
            }
        }
        if ($foundIndex === null) {
            jsonResponse(404, ['ok' => false, 'error' => 'ไม่พบรายการสมัครที่ต้องการลบ']);
        }
        array_splice($db['registrations'], $foundIndex, 1);
        unset(
            $db['scores'][$regId],
            $db['scoreCriteriaDetails'][$regId],
            $db['roundScores'][$regId],
            $db['roundScoreCriteriaDetails'][$regId],
            $db['checkIns'][$regId],
            $db['absentRegs'][$regId]
        );
        persistDbOrFail($db);
        foreach ($removedUploads as $oldPath) {
            deleteLocalUploadIfUnused($oldPath, $db);
        }
        jsonResponse(200, [
            'ok' => true,
            'message' => 'ยกเลิกการลงทะเบียนแข่งขันเรียบร้อยแล้ว',
            'state' => buildClientPayload($db, $_SESSION['auth']),
        ]);
    }

    case 'save_competition_checkin': {
        requireRoles(['admin', 'manager']);
        $status = trim((string)($body['status'] ?? ''));
        if (!in_array($status, ['checked_in', 'pending', 'absent'], true)) {
            jsonResponse(400, ['ok' => false, 'error' => 'สถานะไม่ถูกต้อง']);
        }

        $regId = trim((string)($body['registrationId'] ?? ''));
        $rawRegIds = is_array($body['registrationIds'] ?? null)
            ? array_values(array_filter(array_map(static function ($x) { return trim((string)$x); }, $body['registrationIds'])))
            : [];
        $batchSchoolId = trim((string)($body['schoolId'] ?? ''));
        $batchCompId = trim((string)($body['competitionId'] ?? ''));
        $batchLevel = trim((string)($body['level'] ?? ''));

        $targetRegs = [];
        if ($regId !== '') {
            foreach ($db['registrations'] as $r) {
                if (($r['id'] ?? '') === $regId) {
                    $targetRegs[] = $r;
                    break;
                }
            }
        } elseif (count($rawRegIds) > 0) {
            $idLookup = array_flip($rawRegIds);
            foreach ($db['registrations'] as $r) {
                if (isset($idLookup[(string)($r['id'] ?? '')])) {
                    $targetRegs[] = $r;
                }
            }
        } elseif ($batchSchoolId !== '' && $batchCompId !== '') {
            foreach ($db['registrations'] as $r) {
                if (
                    ($r['schoolId'] ?? '') === $batchSchoolId
                    && ($r['competitionId'] ?? '') === $batchCompId
                    && ($batchLevel === '' || $batchLevel === 'ทั้งหมด' || trim((string)($r['level'] ?? '')) === $batchLevel)
                ) {
                    $targetRegs[] = $r;
                }
            }
        }

        if (count($targetRegs) === 0) {
            jsonResponse(404, ['ok' => false, 'error' => 'ไม่พบรายการผู้เข้าแข่งขัน']);
        }

        if ($status === 'absent') {
            foreach ($targetRegs as $reg) {
                $metaKey = ($reg['competitionId'] ?? '') . '__' . ($reg['level'] ?? '');
                if (!empty($db['evalMeta'][$metaKey]['approved'])) {
                    jsonResponse(403, ['ok' => false, 'error' => 'ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถปรับสถานะไม่เข้าร่วมได้']);
                }
            }
        }

        $nowIso = gmdate('c');
        $updatedBy = (string)($_SESSION['auth']['displayName'] ?? '');
        foreach ($targetRegs as $reg) {
            $id = (string)($reg['id'] ?? '');
            if ($id === '') continue;
            if ($status === 'absent') {
                $db['absentRegs'][$id] = true;
                unset(
                    $db['scores'][$id],
                    $db['scoreCriteriaDetails'][$id],
                    $db['roundScores'][$id],
                    $db['roundScoreCriteriaDetails'][$id],
                    $db['checkIns'][$id]
                );
            } elseif ($status === 'checked_in') {
                unset($db['absentRegs'][$id]);
                $db['checkIns'][$id] = [
                    'checkedIn' => true,
                    'checkedInAt' => $nowIso,
                    'updatedBy' => $updatedBy,
                ];
            } else {
                unset($db['absentRegs'][$id], $db['checkIns'][$id]);
            }
        }

        persistDbOrFail($db);
        $cnt = count($targetRegs);
        $isBatch = $cnt > 1 || $batchSchoolId !== '';
        if ($status === 'checked_in') {
            $msg = $isBatch
                ? "ลงทะเบียนรายงานตัวเข้าร่วมแข่งขันแบบโรงเรียนเรียบร้อยแล้ว ({$cnt} ทีม)"
                : 'ลงทะเบียนรายงานตัวเข้าร่วมแข่งขันเรียบร้อยแล้ว';
        } elseif ($status === 'absent') {
            $msg = $isBatch
                ? "บันทึกสถานะไม่เข้าร่วมแข่งขันทั้งโรงเรียนเรียบร้อยแล้ว ({$cnt} ทีม)"
                : 'บันทึกสถานะไม่เข้าร่วมแข่งขันเรียบร้อยแล้ว';
        } else {
            $msg = $isBatch
                ? "ยกเลิกการลงทะเบียนรายงานตัวทั้งโรงเรียนเรียบร้อยแล้ว ({$cnt} ทีม)"
                : 'ยกเลิกการลงทะเบียนรายงานตัวเรียบร้อยแล้ว';
        }
        jsonResponse(200, ['ok' => true, 'message' => $msg, 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'save_schedule': {
        requireRoles(['admin']);
        $key = trim((string)($body['key'] ?? ''));
        $venue = trim((string)($body['venue'] ?? ''));
        $dateLabel = trim((string)($body['dateLabel'] ?? EVENT_DATE_TH));
        $timeRange = trim((string)($body['timeRange'] ?? ''));
        $notes = trim((string)($body['notes'] ?? ''));
        if ($key === '') {
            jsonResponse(400, ['ok' => false, 'error' => 'ไม่พบรายการตารางแข่งขัน']);
        }
        $db['schedules'][$key] = [
            'venue' => $venue !== '' ? $venue : 'กำหนดในวันงาน',
            'dateLabel' => $dateLabel !== '' ? $dateLabel : EVENT_DATE_TH,
            'timeRange' => $timeRange !== '' ? $timeRange : '08.30 น. เป็นต้นไป',
            'notes' => $notes,
        ];
        persistDbOrFail($db);
        jsonResponse(200, [
            'ok' => true,
            'message' => 'บันทึกข้อมูลตารางการแข่งขันเรียบร้อยแล้ว',
            'state' => buildClientPayload($db, $_SESSION['auth']),
        ]);
    }

    case 'save_criteria': {
        requireRoles(['admin', 'manager']);
        $compId = trim((string)($body['competitionId'] ?? ''));
        if (!findCompetition($compId)) {
            jsonResponse(400, ['ok' => false, 'error' => 'ไม่พบรายการแข่งขัน']);
        }
        $items = is_array($body['criteria'] ?? null) ? $body['criteria'] : [];
        $cleaned = [];
        foreach ($items as $idx => $item) {
            if (!is_array($item)) {
                continue;
            }
            $label = trim((string)($item['label'] ?? ''));
            $max = (float)($item['max'] ?? 0);
            if ($label === '' || $max <= 0) {
                continue;
            }
            $key = trim((string)($item['key'] ?? ''));
            if ($key === '') {
                $key = 'crit_' . ($idx + 1) . '_' . bin2hex(random_bytes(3));
            }
            $cleaned[] = [
                'key' => $key,
                'label' => $label,
                'max' => $max,
                'maxLabel' => $max . ' คะแนน',
            ];
        }
        $db['customCriteriaByComp'][$compId] = $cleaned;
        persistDbOrFail($db);
        jsonResponse(200, [
            'ok' => true,
            'message' => 'บันทึกเกณฑ์การให้คะแนนเรียบร้อยแล้ว',
            'state' => buildClientPayload($db, $_SESSION['auth']),
        ]);
    }

    case 'reset_criteria': {
        requireRoles(['admin', 'manager']);
        $compId = trim((string)($body['competitionId'] ?? ''));
        if (!findCompetition($compId)) {
            jsonResponse(400, ['ok' => false, 'error' => 'ไม่พบรายการแข่งขัน']);
        }
        $db['customCriteriaByComp'][$compId] = getDefaultCompetitionCriteria($compId);
        persistDbOrFail($db);
        jsonResponse(200, [
            'ok' => true,
            'message' => 'คืนค่าเกณฑ์การให้คะแนนมาตรฐานเรียบร้อยแล้ว',
            'state' => buildClientPayload($db, $_SESSION['auth']),
        ]);
    }

    case 'save_admin_school': {
        requireRoles(['admin']);
        $id = isset($body['id']) && is_string($body['id']) && trim($body['id']) !== '' ? trim($body['id']) : null;
        $code = trim((string)($body['schoolCode'] ?? ''));
        $name = trim((string)($body['name'] ?? ''));
        $director = trim((string)($body['director'] ?? ''));
        $phone = trim((string)($body['phone'] ?? ''));
        $password = trim((string)($body['password'] ?? ''));

        if ($code === '' || $name === '' || $director === '') {
            jsonResponse(400, ['ok' => false, 'error' => 'กรุณากรอกข้อมูลโรงเรียนให้ครบถ้วน']);
        }
        foreach ($db['schools'] as $sch) {
            if (($sch['id'] ?? '') !== $id && trim((string)($sch['schoolCode'] ?? '')) === $code) {
                jsonResponse(409, ['ok' => false, 'error' => 'รหัสสถานศึกษานี้มีในระบบแล้ว']);
            }
        }
        if ($id !== null) {
            $updated = false;
            foreach ($db['schools'] as $idx => $sch) {
                if (($sch['id'] ?? '') === $id) {
                    $db['schools'][$idx]['schoolCode'] = $code;
                    $db['schools'][$idx]['name'] = $name;
                    $db['schools'][$idx]['director'] = $director;
                    $db['schools'][$idx]['phone'] = $phone;
                    if ($password !== '') {
                        $db['schools'][$idx]['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
                        unset($db['schools'][$idx]['password']);
                    }
                    $updated = true;
                    break;
                }
            }
            if (!$updated) {
                jsonResponse(404, ['ok' => false, 'error' => 'ไม่พบข้อมูลโรงเรียน']);
            }
            $msg = 'อัปเดตข้อมูลโรงเรียนเรียบร้อยแล้ว';
        } else {
            if ($password === '') {
                $password = '1234';
            }
            $safeCodeSlug = preg_replace('/[^a-zA-Z0-9_\-]/', '', $code) ?: bin2hex(random_bytes(3));
            $db['schools'][] = [
                'id' => 'sch-' . $safeCodeSlug . '-' . time(),
                'schoolCode' => $code,
                'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
                'name' => $name,
                'director' => $director,
                'phone' => $phone,
            ];
            $msg = 'เพิ่มข้อมูลโรงเรียนเรียบร้อยแล้ว';
        }
        persistDbOrFail($db);
        jsonResponse(200, ['ok' => true, 'message' => $msg, 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'delete_admin_school': {
        requireRoles(['admin']);
        $id = trim((string)($body['id'] ?? ''));
        $before = count($db['schools']);
        $db['schools'] = array_values(array_filter($db['schools'], static function ($s) use ($id) {
            return ($s['id'] ?? '') !== $id;
        }));
        if (count($db['schools']) === $before) {
            jsonResponse(404, ['ok' => false, 'error' => 'ไม่พบข้อมูลโรงเรียน']);
        }
        $removedRegIds = [];
        $db['registrations'] = array_values(array_filter($db['registrations'], static function ($r) use ($id, &$removedRegIds) {
            if (($r['schoolId'] ?? '') === $id) {
                $removedRegIds[] = (string)($r['id'] ?? '');
                return false;
            }
            return true;
        }));
        foreach ($removedRegIds as $rId) {
            unset(
                $db['scores'][$rId],
                $db['scoreCriteriaDetails'][$rId],
                $db['roundScores'][$rId],
                $db['roundScoreCriteriaDetails'][$rId],
                $db['checkIns'][$rId],
                $db['absentRegs'][$rId]
            );
        }
        persistDbOrFail($db);
        jsonResponse(200, ['ok' => true, 'message' => 'ลบโรงเรียนเรียบร้อยแล้ว', 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'save_admin_judge': {
        requireRoles(['admin']);
        $id = isset($body['id']) && is_string($body['id']) && trim($body['id']) !== '' ? trim($body['id']) : null;
        $username = trim((string)($body['username'] ?? ''));
        $password = trim((string)($body['password'] ?? ''));
        $name = trim((string)($body['name'] ?? ''));
        $position = trim((string)($body['position'] ?? 'กรรมการตัดสิน')) ?: 'กรรมการตัดสิน';
        $compId = trim((string)($body['competitionId'] ?? 'comp-1'));
        $level = trim((string)($body['level'] ?? ''));
        $photoUrl = saveValidatedImageDataUrl((string)($body['photoUrl'] ?? ''), 'jdg', 'judges');

        $comp = findCompetition($compId);
        if (!$comp || !in_array($level, $comp['levels'], true)) {
            jsonResponse(400, ['ok' => false, 'error' => 'รายการแข่งขันหรือระดับชั้นไม่ถูกต้อง']);
        }
        if ($username === '' || $name === '') {
            jsonResponse(400, ['ok' => false, 'error' => 'กรุณากรอก Username และชื่อ-นามสกุลกรรมการ']);
        }
        foreach ($db['judges'] as $jdg) {
            if (($jdg['id'] ?? '') !== $id && trim((string)($jdg['username'] ?? '')) === $username) {
                jsonResponse(409, ['ok' => false, 'error' => 'Username กรรมการนี้มีอยู่ในระบบแล้ว']);
            }
        }
        $oldJudgePhoto = '';
        if ($id !== null) {
            $updated = false;
            foreach ($db['judges'] as $idx => $jdg) {
                if (($jdg['id'] ?? '') === $id) {
                    $oldJudgePhoto = (string)($jdg['photoUrl'] ?? '');
                    $db['judges'][$idx]['username'] = $username;
                    $db['judges'][$idx]['name'] = $name;
                    $db['judges'][$idx]['position'] = $position;
                    $db['judges'][$idx]['competitionId'] = $compId;
                    $db['judges'][$idx]['level'] = $level;
                    $db['judges'][$idx]['photoUrl'] = $photoUrl;
                    if ($password !== '') {
                        $db['judges'][$idx]['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
                        unset($db['judges'][$idx]['password']);
                    }
                    $updated = true;
                    break;
                }
            }
            if (!$updated) {
                jsonResponse(404, ['ok' => false, 'error' => 'ไม่พบข้อมูลกรรมการ']);
            }
            $msg = 'อัปเดตข้อมูลกรรมการตัดสินเรียบร้อยแล้ว';
        } else {
            if ($password === '') {
                $password = '1234';
            }
            $db['judges'][] = [
                'id' => 'jdg-' . bin2hex(random_bytes(4)),
                'username' => $username,
                'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
                'name' => $name,
                'position' => $position,
                'competitionId' => $compId,
                'level' => $level,
                'photoUrl' => $photoUrl,
            ];
            $msg = 'เพิ่มกรรมการตัดสินเรียบร้อยแล้ว';
        }
        persistDbOrFail($db);
        if ($oldJudgePhoto !== '' && $oldJudgePhoto !== $photoUrl) {
            deleteLocalUploadIfUnused($oldJudgePhoto, $db);
        }
        jsonResponse(200, ['ok' => true, 'message' => $msg, 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'delete_admin_judge': {
        requireRoles(['admin']);
        $id = trim((string)($body['id'] ?? ''));
        $before = count($db['judges']);
        $removedPhoto = '';
        $db['judges'] = array_values(array_filter($db['judges'], static function ($j) use ($id, &$removedPhoto) {
            if (($j['id'] ?? '') === $id) {
                $removedPhoto = (string)($j['photoUrl'] ?? '');
                return false;
            }
            return true;
        }));
        if (count($db['judges']) === $before) {
            jsonResponse(404, ['ok' => false, 'error' => 'ไม่พบข้อมูลกรรมการ']);
        }
        persistDbOrFail($db);
        if ($removedPhoto !== '') {
            deleteLocalUploadIfUnused($removedPhoto, $db);
        }
        jsonResponse(200, ['ok' => true, 'message' => 'ลบกรรมการตัดสินเรียบร้อยแล้ว', 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'save_admin_manager': {
        requireRoles(['admin']);
        $id = isset($body['id']) && is_string($body['id']) && trim($body['id']) !== '' ? trim($body['id']) : null;
        $username = trim((string)($body['username'] ?? ''));
        $password = trim((string)($body['password'] ?? ''));
        $name = trim((string)($body['name'] ?? ''));
        $phone = trim((string)($body['phone'] ?? '')) ?: '-';

        if ($username === '' || $name === '') {
            jsonResponse(400, ['ok' => false, 'error' => 'กรุณากรอก Username และชื่อ-นามสกุลผู้จัดการแข่งขัน']);
        }
        if ($id === null && safeStrLen($password) < 4) {
            jsonResponse(400, ['ok' => false, 'error' => 'กรุณากำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษร']);
        }
        if ($id !== null && $password !== '' && safeStrLen($password) < 4) {
            jsonResponse(400, ['ok' => false, 'error' => 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร']);
        }
        foreach (($db['managers'] ?? []) as $mgr) {
            if (($mgr['id'] ?? '') !== $id && trim((string)($mgr['username'] ?? '')) === $username) {
                jsonResponse(409, ['ok' => false, 'error' => 'Username ผู้จัดการแข่งขันนี้มีอยู่ในระบบแล้ว']);
            }
        }

        if (!isset($db['managers']) || !is_array($db['managers'])) {
            $db['managers'] = [];
        }

        if ($id !== null) {
            $updated = false;
            foreach ($db['managers'] as $idx => $mgr) {
                if (($mgr['id'] ?? '') === $id) {
                    $db['managers'][$idx]['username'] = $username;
                    $db['managers'][$idx]['name'] = $name;
                    $db['managers'][$idx]['phone'] = $phone;
                    if ($password !== '') {
                        $db['managers'][$idx]['passwordHash'] = password_hash($password, PASSWORD_DEFAULT);
                    }
                    $updated = true;
                    break;
                }
            }
            if (!$updated) {
                jsonResponse(404, ['ok' => false, 'error' => 'ไม่พบข้อมูลผู้จัดการแข่งขัน']);
            }
            $msg = 'อัปเดตข้อมูลผู้จัดการแข่งขันเรียบร้อยแล้ว';
        } else {
            $db['managers'][] = [
                'id' => 'mgr-' . bin2hex(random_bytes(4)),
                'username' => $username,
                'passwordHash' => password_hash($password, PASSWORD_DEFAULT),
                'name' => $name,
                'phone' => $phone,
            ];
            $msg = 'เพิ่มผู้จัดการแข่งขันเรียบร้อยแล้ว';
        }

        persistDbOrFail($db);
        jsonResponse(200, ['ok' => true, 'message' => $msg, 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'delete_admin_manager': {
        requireRoles(['admin']);
        $id = trim((string)($body['id'] ?? ''));
        $list = $db['managers'] ?? [];
        $before = count($list);
        $db['managers'] = array_values(array_filter($list, static function ($m) use ($id) {
            return ($m['id'] ?? '') !== $id;
        }));
        if (count($db['managers']) === $before) {
            jsonResponse(404, ['ok' => false, 'error' => 'ไม่พบข้อมูลผู้จัดการแข่งขัน']);
        }
        persistDbOrFail($db);
        jsonResponse(200, ['ok' => true, 'message' => 'ลบผู้จัดการแข่งขันเรียบร้อยแล้ว', 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'save_admin_settings': {
        requireRoles(['admin']);
        if (isset($body['registrationOpen'])) {
            $db['registrationOpen'] = (bool)$body['registrationOpen'];
        }
        if (isset($body['menuPermissions']) && is_array($body['menuPermissions'])) {
            foreach ($body['menuPermissions'] as $k => $v) {
                if (isset($db['menuPermissions'][$k])) {
                    $db['menuPermissions'][$k] = (bool)$v;
                }
            }
        }
        if (isset($body['adminCredentials']) && is_array($body['adminCredentials'])) {
            $c = $body['adminCredentials'];
            $curPass = trim((string)($c['currentPass'] ?? ''));
            $newUser = trim((string)($c['newUsername'] ?? ''));
            $newDisplay = trim((string)($c['newDisplayName'] ?? ''));
            $newPass = trim((string)($c['newPass'] ?? ''));
            $hash = (string)($db['adminCredentials']['passwordHash'] ?? '');
            $legacyPass = (string)($db['adminCredentials']['password'] ?? '');
            $curOk = ($hash !== '' && password_verify($curPass, $hash))
                || ($legacyPass !== '' && hash_equals($legacyPass, $curPass));

            if (!$curOk) {
                jsonResponse(400, ['ok' => false, 'error' => 'รหัสผ่านปัจจุบันไม่ถูกต้อง']);
            }
            if ($newUser === '') {
                jsonResponse(400, ['ok' => false, 'error' => 'กรุณาระบุชื่อผู้ใช้ใหม่']);
            }
            $db['adminCredentials']['username'] = $newUser;
            if ($newDisplay !== '') {
                $db['adminCredentials']['displayName'] = $newDisplay;
                $_SESSION['auth']['displayName'] = $newDisplay;
            }
            if ($newPass !== '') {
                if (safeStrLen($newPass) < 4) {
                    jsonResponse(400, ['ok' => false, 'error' => 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร']);
                }
                $db['adminCredentials']['passwordHash'] = password_hash($newPass, PASSWORD_DEFAULT);
                unset($db['adminCredentials']['password']);
            }
        }
        persistDbOrFail($db);
        jsonResponse(200, [
            'ok' => true,
            'message' => 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว',
            'state' => buildClientPayload($db, $_SESSION['auth']),
        ]);
    }

    case 'save_background': {
        requireRoles(['admin']);
        $key = trim((string)($body['key'] ?? ''));
        $allowedKeys = ['bannerBgUrl', 'studentCardBgUrl', 'coachCardBgUrl', 'judgeCardBgUrl', 'certBgUrl'];
        if (!in_array($key, $allowedKeys, true)) {
            jsonResponse(400, ['ok' => false, 'error' => 'ประเภทพื้นหลังไม่ถูกต้อง']);
        }
        $dataUrl = (string)($body['dataUrl'] ?? '');
        $oldUrl = (string)($db['backgrounds'][$key] ?? '');
        if ($dataUrl === '') {
            $db['backgrounds'][$key] = '';
            persistDbOrFail($db);
            deleteLocalUploadIfUnused($oldUrl, $db);
            jsonResponse(200, ['ok' => true, 'message' => 'ลบรูปภาพพื้นหลังเรียบร้อยแล้ว', 'state' => buildClientPayload($db, $_SESSION['auth'])]);
        }
        $savedPath = saveValidatedImageDataUrl($dataUrl, 'bg_' . $key, 'backgrounds');
        if ($savedPath === '') {
            jsonResponse(400, ['ok' => false, 'error' => 'ไฟล์รูปภาพไม่ถูกต้องหรือมีขนาดใหญ่เกินไป']);
        }
        $db['backgrounds'][$key] = $savedPath;
        persistDbOrFail($db);
        if ($oldUrl !== '' && $oldUrl !== $savedPath) {
            deleteLocalUploadIfUnused($oldUrl, $db);
        }
        jsonResponse(200, ['ok' => true, 'message' => 'อัปโหลดรูปภาพพื้นหลังเรียบร้อยแล้ว', 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'save_judge_scores': {
        requireRoles(['judge']);
        $judgeId = (string)($_SESSION['auth']['judgeId'] ?? '');
        $judge = null;
        foreach ($db['judges'] as $jdg) {
            if (($jdg['id'] ?? '') === $judgeId) {
                $judge = $jdg;
                break;
            }
        }
        if (!$judge) {
            jsonResponse(403, ['ok' => false, 'error' => 'ไม่พบข้อมูลกรรมการ']);
        }

        $entries = is_array($body['entries'] ?? null) ? $body['entries'] : [];
        if (count($entries) === 0) {
            jsonResponse(400, ['ok' => false, 'error' => 'ไม่มีข้อมูลคะแนนที่จะบันทึก']);
        }

        $compId = (string)$judge['competitionId'];
        $level = (string)$judge['level'];
        $metaKey = $compId . '__' . $level;
        if (!empty($db['evalMeta'][$metaKey]['approved'])) {
            jsonResponse(403, ['ok' => false, 'error' => 'ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถแก้ไขคะแนนได้']);
        }
        $isTwoRound = ($compId === 'comp-3' || $compId === 'comp-4');
        $reqRound = (($body['round'] ?? 'qualifying') === 'final') ? 'final' : 'qualifying';
        $criteriaList = ($compId === 'comp-7')
            ? [['key' => 'correctAnswers', 'label' => 'จำนวนข้อสอบที่ตอบถูกต้อง', 'max' => 100]]
            : (is_array($db['customCriteriaByComp'][$compId] ?? null) ? $db['customCriteriaByComp'][$compId] : getDefaultCompetitionCriteria($compId));

        $regMap = [];
        foreach ($db['registrations'] as $r) {
            $regMap[(string)$r['id']] = $r;
        }

        foreach ($entries as $entry) {
            if (!is_array($entry)) {
                continue;
            }
            $regId = trim((string)($entry['registrationId'] ?? ''));
            $reg = $regMap[$regId] ?? null;
            if (!$reg || ($reg['competitionId'] ?? '') !== $compId || ($reg['level'] ?? '') !== $level) {
                continue;
            }
            if (!empty($db['absentRegs'][$regId])) {
                continue;
            }
            $rawCritScores = is_array($entry['criteria'] ?? null) ? $entry['criteria'] : [];
            $detailOut = [];
            $total = 0.0;
            $hasAny = false;
            foreach ($criteriaList as $crit) {
                $cKey = (string)$crit['key'];
                $maxVal = (float)($crit['max'] ?? 100);
                if (isset($rawCritScores[$cKey]) && $rawCritScores[$cKey] !== '') {
                    $val = (float)$rawCritScores[$cKey];
                    if ($val < 0) $val = 0;
                    if ($val > $maxVal) $val = $maxVal;
                    $detailOut[$cKey] = round($val, 2);
                    $total += $detailOut[$cKey];
                    $hasAny = true;
                }
            }
            if ($hasAny) {
                $totalRounded = round($total, 2);
                if ($isTwoRound) {
                    if (!isset($db['roundScores'][$regId]) || !is_array($db['roundScores'][$regId])) {
                        $db['roundScores'][$regId] = [];
                    }
                    if (!isset($db['roundScoreCriteriaDetails'][$regId]) || !is_array($db['roundScoreCriteriaDetails'][$regId])) {
                        $db['roundScoreCriteriaDetails'][$regId] = [];
                    }
                    if (
                        !isset($db['roundScores'][$regId]['qualifying'])
                        && $reqRound === 'final'
                        && !empty($db['scores'][$regId])
                    ) {
                        $db['roundScores'][$regId]['qualifying'] = $db['scores'][$regId];
                        if (!empty($db['scoreCriteriaDetails'][$regId])) {
                            $db['roundScoreCriteriaDetails'][$regId]['qualifying'] = $db['scoreCriteriaDetails'][$regId];
                        }
                    }
                    if (!isset($db['roundScores'][$regId][$reqRound]) || !is_array($db['roundScores'][$regId][$reqRound])) {
                        $db['roundScores'][$regId][$reqRound] = [];
                    }
                    if (!isset($db['roundScoreCriteriaDetails'][$regId][$reqRound]) || !is_array($db['roundScoreCriteriaDetails'][$regId][$reqRound])) {
                        $db['roundScoreCriteriaDetails'][$regId][$reqRound] = [];
                    }
                    $db['roundScores'][$regId][$reqRound][$judgeId] = $totalRounded;
                    $db['roundScoreCriteriaDetails'][$regId][$reqRound][$judgeId] = $detailOut;

                    $hasFinal = !empty($db['roundScores'][$regId]['final']);
                    $latestRound = $hasFinal ? 'final' : 'qualifying';
                    $db['scores'][$regId] = $db['roundScores'][$regId][$latestRound] ?? [];
                    $db['scoreCriteriaDetails'][$regId] = $db['roundScoreCriteriaDetails'][$regId][$latestRound] ?? [];
                } else {
                    if (!isset($db['scores'][$regId]) || !is_array($db['scores'][$regId])) {
                        $db['scores'][$regId] = [];
                    }
                    if (!isset($db['scoreCriteriaDetails'][$regId]) || !is_array($db['scoreCriteriaDetails'][$regId])) {
                        $db['scoreCriteriaDetails'][$regId] = [];
                    }
                    $db['scores'][$regId][$judgeId] = $totalRounded;
                    $db['scoreCriteriaDetails'][$regId][$judgeId] = $detailOut;
                }
            }
        }

        $currentApproved = !empty($db['evalMeta'][$metaKey]['approved']);
        $db['evalMeta'][$metaKey] = [
            'status' => 'judging',
            'approved' => $currentApproved,
        ];
        persistDbOrFail($db);
        $msg = $isTwoRound
            ? ('บันทึกคะแนน' . ($reqRound === 'final' ? 'รอบตัดสิน' : 'รอบคัดเลือก') . 'เรียบร้อยแล้ว (อัปเดตผลคะแนนล่าสุดสำหรับประกาศผลแล้ว)')
            : 'บันทึกคะแนนตัดสินเรียบร้อยแล้ว';
        jsonResponse(200, ['ok' => true, 'message' => $msg, 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'toggle_absent': {
        requireRoles(['judge']);
        $judgeId = (string)($_SESSION['auth']['judgeId'] ?? '');
        $judge = null;
        foreach ($db['judges'] as $jdg) {
            if (($jdg['id'] ?? '') === $judgeId) {
                $judge = $jdg;
                break;
            }
        }
        if (!$judge) {
            jsonResponse(403, ['ok' => false, 'error' => 'ไม่พบข้อมูลกรรมการ']);
        }
        $regId = trim((string)($body['registrationId'] ?? ''));
        $reg = null;
        foreach ($db['registrations'] as $r) {
            if (($r['id'] ?? '') === $regId) {
                $reg = $r;
                break;
            }
        }
        if (!$reg || ($reg['competitionId'] ?? '') !== ($judge['competitionId'] ?? '') || ($reg['level'] ?? '') !== ($judge['level'] ?? '')) {
            jsonResponse(403, ['ok' => false, 'error' => 'ท่านไม่มีสิทธิ์ปรับสถานะผู้เข้าแข่งขันรายการนี้']);
        }
        $absent = !empty($body['absent']);
        if ($absent) {
            $db['absentRegs'][$regId] = true;
            unset(
                $db['scores'][$regId],
                $db['scoreCriteriaDetails'][$regId],
                $db['roundScores'][$regId],
                $db['roundScoreCriteriaDetails'][$regId],
                $db['checkIns'][$regId]
            );
            $msg = 'บันทึกสถานะไม่เข้าร่วมแข่งขันเรียบร้อยแล้ว';
        } else {
            unset($db['absentRegs'][$regId]);
            $msg = 'ยกเลิกสถานะไม่เข้าร่วมแข่งขันเรียบร้อยแล้ว';
        }
        persistDbOrFail($db);
        jsonResponse(200, ['ok' => true, 'message' => $msg, 'state' => buildClientPayload($db, $_SESSION['auth'])]);
    }

    case 'toggle_approval': {
        requireRoles(['admin']);
        $metaKey = trim((string)($body['metaKey'] ?? ''));
        $approved = !empty($body['approved']);
        if ($metaKey === '' || strpos($metaKey, '__') === false) {
            jsonResponse(400, ['ok' => false, 'error' => 'ไม่พบรายการแข่งขันที่ต้องการอนุมัติ']);
        }
        $db['evalMeta'][$metaKey] = [
            'status' => $approved ? 'completed' : 'judging',
            'approved' => $approved,
        ];
        persistDbOrFail($db);
        jsonResponse(200, [
            'ok' => true,
            'message' => $approved ? 'อนุมัติผลการแข่งขันเรียบร้อยแล้ว' : 'ยกเลิกการอนุมัติผลการแข่งขันเรียบร้อยแล้ว',
            'state' => buildClientPayload($db, $_SESSION['auth']),
        ]);
    }

    default:
        jsonResponse(404, ['ok' => false, 'error' => 'ไม่พบคำสั่งที่ร้องขอ']);
}
