<?php
declare(strict_types=1);

define('APP_ROOT', __DIR__);
define('DATA_DIR', APP_ROOT . DIRECTORY_SEPARATOR . 'data');
define('UPLOADS_DIR', APP_ROOT . DIRECTORY_SEPARATOR . 'uploads');
define('DB_FILE', DATA_DIR . DIRECTORY_SEPARATOR . 'db.json');

define('EVENT_DATE_TH', 'วันพุธที่ 17 กุมภาพันธ์ พ.ศ. 2570');
define('EVENT_TITLE_TH', 'งานสัปดาห์ส่งเสริมวันสำคัญทางพระพุทธศาสนาวันมาฆบูชา ครั้งที่ 14 ประจำปี 2570');
define('EVENT_VENUE_TH', 'วัดหนองบัว ตำบลหนองบัว อำเภอศีขรภูมิ จังหวัดสุรินทร์');

define('UPLOAD_CATEGORIES', ['students', 'coaches', 'judges', 'backgrounds']);

function getStoreFiles(): array
{
    return [
        'system' => DATA_DIR . DIRECTORY_SEPARATOR . 'system.json',
        'schools' => DATA_DIR . DIRECTORY_SEPARATOR . 'schools.json',
        'judges' => DATA_DIR . DIRECTORY_SEPARATOR . 'judges.json',
        'schedules' => DATA_DIR . DIRECTORY_SEPARATOR . 'schedules.json',
        'registrations' => DATA_DIR . DIRECTORY_SEPARATOR . 'registrations.json',
        'scores' => DATA_DIR . DIRECTORY_SEPARATOR . 'scores.json',
        'criteria' => DATA_DIR . DIRECTORY_SEPARATOR . 'criteria.json',
    ];
}

function ensureStorageDirs(): void
{
    if (!is_dir(DATA_DIR)) {
        @mkdir(DATA_DIR, 0755, true);
    }
    if (!is_dir(UPLOADS_DIR)) {
        @mkdir(UPLOADS_DIR, 0755, true);
    }
    foreach (UPLOAD_CATEGORIES as $cat) {
        $subDir = UPLOADS_DIR . DIRECTORY_SEPARATOR . $cat;
        if (!is_dir($subDir)) {
            @mkdir($subDir, 0755, true);
        }
    }
    $dataHtaccess = DATA_DIR . DIRECTORY_SEPARATOR . '.htaccess';
    if (!file_exists($dataHtaccess)) {
        @file_put_contents(
            $dataHtaccess,
            "<IfModule mod_authz_core.c>\n  Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n  Order allow,deny\n  Deny from all\n</IfModule>\n"
        );
    }
    $uploadsHtaccess = UPLOADS_DIR . DIRECTORY_SEPARATOR . '.htaccess';
    if (!file_exists($uploadsHtaccess)) {
        @file_put_contents(
            $uploadsHtaccess,
            "<FilesMatch \"\\.(php|phtml|php3|php4|php5|php7|php8|phar|pl|py|cgi|sh)$\">\n  <IfModule mod_authz_core.c>\n    Require all denied\n  </IfModule>\n  <IfModule !mod_authz_core.c>\n    Order allow,deny\n    Deny from all\n  </IfModule>\n</FilesMatch>\n"
        );
    }
}

function getLevelsStandard(): array
{
    return [
        'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
        'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
        'มัธยมศึกษาตอนปลาย (ม.4-ม.6)',
    ];
}

function getLevelsUnlimited(): array
{
    return ['ไม่จำกัดระดับ'];
}

function getCompetitions(): array
{
    $std = getLevelsStandard();
    $unl = getLevelsUnlimited();
    return [
        [
            'id' => 'comp-1',
            'name' => 'การบรรยายธรรม',
            'type' => 'เดี่ยว',
            'teamSize' => 1,
            'levels' => $std,
            'requiresSongs' => false,
            'accentColor' => 'amber',
        ],
        [
            'id' => 'comp-2',
            'name' => 'การเล่านิทานธรรม',
            'type' => 'เดี่ยว',
            'teamSize' => 1,
            'levels' => $std,
            'requiresSongs' => false,
            'accentColor' => 'emerald',
        ],
        [
            'id' => 'comp-3',
            'name' => 'การร้องเพลงไทยลูกทุ่งส่งเสริมคุณธรรม (ชาย)',
            'type' => 'เดี่ยว',
            'teamSize' => 1,
            'levels' => $std,
            'requiresSongs' => true,
            'accentColor' => 'sky',
        ],
        [
            'id' => 'comp-4',
            'name' => 'การร้องเพลงไทยลูกทุ่งส่งเสริมคุณธรรม (หญิง)',
            'type' => 'เดี่ยว',
            'teamSize' => 1,
            'levels' => $std,
            'requiresSongs' => true,
            'accentColor' => 'pink',
        ],
        [
            'id' => 'comp-5',
            'name' => 'การวาดภาพลายเส้น',
            'type' => 'เดี่ยว',
            'teamSize' => 1,
            'levels' => $std,
            'requiresSongs' => false,
            'accentColor' => 'purple',
        ],
        [
            'id' => 'comp-6',
            'name' => 'การเขียนเรียงความแก้กระทู้ธรรมชั้นตรี',
            'type' => 'เดี่ยว',
            'teamSize' => 1,
            'levels' => $std,
            'requiresSongs' => false,
            'accentColor' => 'violet',
        ],
        [
            'id' => 'comp-7',
            'name' => 'ตอบปัญหาธรรม',
            'type' => 'ทีมละ 2 คน',
            'teamSize' => 2,
            'levels' => $std,
            'requiresSongs' => false,
            'accentColor' => 'cyan',
        ],
        [
            'id' => 'comp-8',
            'name' => 'การกล่าวคำอาราธนาและถวายทานในพุทธศาสนพิธี',
            'type' => 'ทีมละ 5 คน',
            'teamSize' => 5,
            'levels' => $std,
            'requiresSongs' => false,
            'accentColor' => 'yellow',
        ],
        [
            'id' => 'comp-9',
            'name' => 'การสวดมนต์หมู่สรรเสริญพระรัตนตรัยทำนองสรภัญญะ (หญิงล้วน)',
            'type' => 'ทีมละ 5 คน',
            'teamSize' => 5,
            'levels' => $std,
            'requiresSongs' => false,
            'accentColor' => 'teal',
        ],
        [
            'id' => 'comp-10',
            'name' => 'การจัดโต๊ะหมู่บูชา หมู่ 7',
            'type' => 'ทีมละ 10 คน',
            'teamSize' => 10,
            'levels' => $unl,
            'requiresSongs' => false,
            'accentColor' => 'orange',
        ],
    ];
}

function getDefaultCompetitionCriteria(string $competitionId): array
{
    switch ($competitionId) {
        case 'comp-1':
            return [
                ['key' => 'dt1', 'label' => '๑) การปรากฏตัวและมารยาทไทย', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
                ['key' => 'dt2', 'label' => '๒) กล่าวทักทายที่ประชุม และอารัมภบท', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
                ['key' => 'dt3', 'label' => '๓) เนื้อหาของการบรรยายมีความต่อเนื่อง มีเหตุผลและความเหมาะสมกลมกลืน', 'max' => 30, 'maxLabel' => '๓๐ คะแนน'],
                ['key' => 'dt4', 'label' => '๔) การใช้ภาษา ถ้อยคำสำเนียง และออกเสียงอักขระควบกล้ำชัดเจน', 'max' => 20, 'maxLabel' => '๒๐ คะแนน'],
                ['key' => 'dt5', 'label' => '๕) บุคลิกลักษณะ การใช้สายตา และลีลาท่าทาง', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
                ['key' => 'dt6', 'label' => '๖) การกล่าวสรุปจบ', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
                ['key' => 'dt7', 'label' => '๗) การรักษาเวลา', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
            ];
        case 'comp-2':
            return [
                ['key' => 'st1', 'label' => '๑) มารยาทไทย กล่าวทักทายที่ประชุม และอารัมภบท', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
                ['key' => 'st2', 'label' => '๒) เนื้อหาสาระเน้นคุณธรรม จริยธรรม มีข้อคิด คติเตือนใจ', 'max' => 30, 'maxLabel' => '๓๐ คะแนน'],
                ['key' => 'st3', 'label' => '๓) การใช้ภาษาถูกต้องตามอักขระและความต่อเนื่องในการเล่า', 'max' => 20, 'maxLabel' => '๒๐ คะแนน'],
                ['key' => 'st4', 'label' => '๔) บุคลิกภาพ น้ำเสียง และลีลาท่าทาง', 'max' => 20, 'maxLabel' => '๒๐ คะแนน'],
                ['key' => 'st6', 'label' => '๖) ความคิดริเริ่มสร้างสรรค์ การใช้สื่อ อุปกรณ์เหมาะสม', 'max' => 15, 'maxLabel' => '๑๕ คะแนน'],
                ['key' => 'st7', 'label' => '๗) ใช้เวลาตามกำหนด', 'max' => 5, 'maxLabel' => '๕ คะแนน'],
            ];
        case 'comp-3':
        case 'comp-4':
            return [
                ['key' => 'fs1', 'label' => '๑) น้ำเสียง ความไพเราะของเสียง', 'max' => 30, 'maxLabel' => '30 คะแนน'],
                ['key' => 'fs2', 'label' => '๒) เทคนิคการขับร้อง', 'max' => 20, 'maxLabel' => '20 คะแนน'],
                ['key' => 'fs3', 'label' => '3) จังหวะ ทำนอง ถูกต้อง', 'max' => 25, 'maxLabel' => '25 คะแนน'],
                ['key' => 'fs4', 'label' => '4) อักขระวิธีถูกต้อง', 'max' => 15, 'maxLabel' => '15 คะแนน'],
                ['key' => 'fs5', 'label' => '5) บุคลิก ลีลา อารมณ์', 'max' => 10, 'maxLabel' => '10 คะแนน'],
            ];
        case 'comp-5':
            return [
                ['key' => 'ld1', 'label' => '๑) ลักษณะความสมบูรณ์ของเส้น ความถูกต้องของแสงเงา', 'max' => 30, 'maxLabel' => '30 คะแนน'],
                ['key' => 'ld2', 'label' => '๒) การจัดภาพ / องค์ประกอบ', 'max' => 20, 'maxLabel' => '20 คะแนน'],
                ['key' => 'ld3', 'label' => '๓) ความคิดสร้างสรรค์', 'max' => 20, 'maxLabel' => '20 คะแนน'],
                ['key' => 'ld4', 'label' => '๔) ความสมบูรณ์ ความประณีตของชิ้นงาน', 'max' => 20, 'maxLabel' => '20 คะแนน'],
                ['key' => 'ld5', 'label' => '๕) ความสอดคล้องกับหัวข้อที่กำหนด', 'max' => 10, 'maxLabel' => '10 คะแนน'],
            ];
        case 'comp-6':
            return [
                ['key' => 'es1', 'label' => '1) แต่งได้ครบตามกำหนด', 'max' => 15, 'maxLabel' => '๑๕ คะแนน'],
                ['key' => 'es2', 'label' => '2) อ้างสุภาษิตที่เชื่อมได้ตามกฎ และบอกที่มาได้ถูกต้อง', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
                ['key' => 'es3', 'label' => '3) ใช้ตัวอักษรแบบกระทรวงศึกษาธิการ', 'max' => 20, 'maxLabel' => '๒๐ คะแนน'],
                ['key' => 'es4', 'label' => '4) อธิบายความสมกับกระทู้ที่ตั้งไว้', 'max' => 30, 'maxLabel' => '๓๐ คะแนน'],
                ['key' => 'es5', 'label' => '5) ใช้ตัวสะกดการันต์ถูกต้อง (เขียนผิดซํ้าให้นับเป็น ๑ คํา)', 'max' => 15, 'maxLabel' => '๑๕ คะแนน'],
                ['key' => 'es6', 'label' => '6) สะอาดไม่เปรอะเปื้อน', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
            ];
        case 'comp-7':
            return [];
        case 'comp-8':
            return [
                ['key' => 'co1', 'label' => '1) มารยาทเรียบร้อยถูกต้องตามหลักศาสนพิธี', 'max' => 10, 'maxLabel' => 'จำนวน ๑๐ คะแนน'],
                ['key' => 'co2', 'label' => '2) ความถูกต้องของอักขระ', 'max' => 20, 'maxLabel' => 'จำนวน ๒๐ คะแนน'],
                ['key' => 'co3', 'label' => '3) ความถูกต้องของจังหวะ และวรรคตอน', 'max' => 15, 'maxLabel' => 'จำนวน ๑๕ คะแนน'],
                ['key' => 'co4', 'label' => '4) ความถูกต้องของทำนอง (ธรรมวัตร)', 'max' => 15, 'maxLabel' => 'จำนวน ๑๕ คะแนน'],
                ['key' => 'co5', 'label' => '5) ความไพเราะของน้ำเสียง', 'max' => 15, 'maxLabel' => 'จำนวน ๑๕ คะแนน'],
                ['key' => 'co6', 'label' => '6) ลำดับขั้นตอนถูกต้อง', 'max' => 15, 'maxLabel' => 'จำนวน ๑๕ คะแนน'],
                ['key' => 'co7', 'label' => '7) ความพร้อมเพรียงโดยรวม', 'max' => 10, 'maxLabel' => 'จำนวน ๑๐ คะแนน'],
            ];
        case 'comp-9':
            return [
                ['key' => 'ch1', 'label' => '๑) ความถูกต้องของอักขระ', 'max' => 20, 'maxLabel' => '๒๐ คะแนน'],
                ['key' => 'ch2', 'label' => '๒) ความถูกต้องของจังหวะ', 'max' => 20, 'maxLabel' => '๒๐ คะแนน'],
                ['key' => 'ch3', 'label' => '๓) ความถูกต้องของทำนอง', 'max' => 20, 'maxLabel' => '๒๐ คะแนน'],
                ['key' => 'ch4', 'label' => '๔) ความไพเราะของน้ำเสียง', 'max' => 20, 'maxLabel' => '๒๐ คะแนน'],
                ['key' => 'ch5', 'label' => '๕) มารยาทและท่าทาง', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
                ['key' => 'ch6', 'label' => '๖) ความพร้อมเพียงโดยรวม', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
            ];
        case 'comp-10':
            return [
                ['key' => 'al1', 'label' => '๑) ขั้นตอนกระบวนการการทำงาน', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
                ['key' => 'al2', 'label' => '๒) ความถูกต้องของโต๊ะหมู่ตามชนิดที่กำหนด และการจัดวางโต๊ะหมู่บูชา จะต้องประกอบไปด้วย พระพุทธรูปแจกัน พานพุ่ม ดอกไม้สด เชิงเทียน กระถางธูป', 'max' => 20, 'maxLabel' => '๒๐ คะแนน'],
                ['key' => 'al3', 'label' => '๓) ความประณีต สวยงาม ของเครื่องประดับตกแต่งและการจัดดอกไม้สด', 'max' => 30, 'maxLabel' => '๓๐ คะแนน'],
                ['key' => 'al4', 'label' => '๔) ความถูกต้องในการจัดโต๊ะหมู่บูชาตามแบบธรรมเนียมพิธีการ', 'max' => 20, 'maxLabel' => '๒๐ คะแนน'],
                ['key' => 'al5', 'label' => '๕) ความคิดสร้างสรรค์', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
                ['key' => 'al6', 'label' => '๖) สำเร็จทันเวลา', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
                ['key' => 'al7', 'label' => '๗) ความสะอาดเรียบร้อย', 'max' => 10, 'maxLabel' => '๑๐ คะแนน'],
            ];
        default:
            return [];
    }
}

function buildInitialSchedules(): array
{
    $map = [];
    $comps = getCompetitions();
    foreach ($comps as $idx => $comp) {
        foreach ($comp['levels'] as $lIdx => $lvl) {
            $key = $comp['id'] . '__' . $lvl;
            $startHour = 8 + ($idx % 4);
            $startMin = ($lIdx === 1) ? '30' : '00';
            $endHour = $startHour + 1;
            $map[$key] = [
                'venue' => EVENT_VENUE_TH . ' — ห้องที่ ' . ($idx + 1) . '.' . ($lIdx + 1),
                'dateLabel' => EVENT_DATE_TH,
                'timeRange' => sprintf('%02d.%s - %02d.%s น.', $startHour, $startMin, $endHour, $startMin),
                'notes' => 'รายงานตัวก่อนเวลาแข่งขัน 30 นาที',
            ];
        }
    }
    return $map;
}

function getDbDefaults(): array
{
    $criteriaMap = [];
    foreach (getCompetitions() as $comp) {
        $criteriaMap[$comp['id']] = getDefaultCompetitionCriteria($comp['id']);
    }
    return [
        'adminCredentials' => [
            'username' => 'admin',
            'displayName' => 'พระบุญทัน ธมฺมธาตา (Admin)',
        ],
        'registrationOpen' => true,
        'menuPermissions' => [
            'student-card' => true,
            'coach-card' => true,
            'judge-card' => true,
            'judge-cert' => true,
            'school-cert' => true,
            'school-results' => true,
            'results' => true,
        ],
        'backgrounds' => [
            'bannerBgUrl' => '',
            'studentCardBgUrl' => '',
            'coachCardBgUrl' => '',
            'judgeCardBgUrl' => '',
            'certBgUrl' => '',
        ],
        'schools' => [],
        'judges' => [],
        'schedules' => buildInitialSchedules(),
        'registrations' => [],
        'scores' => [],
        'scoreCriteriaDetails' => [],
        'evalMeta' => [],
        'absentRegs' => [],
        'customCriteriaByComp' => $criteriaMap,
    ];
}

function createInitialDb(): array
{
    $altarStudents = [];
    for ($i = 1; $i <= 10; $i++) {
        $altarStudents[] = [
            'name' => 'นักเรียนสมาชิกโต๊ะหมู่ที่ ' . $i,
            'photoUrl' => '',
        ];
    }

    $criteriaMap = [];
    foreach (getCompetitions() as $comp) {
        $criteriaMap[$comp['id']] = getDefaultCompetitionCriteria($comp['id']);
    }

    $defaultHash = password_hash('1234', PASSWORD_DEFAULT);

    return [
        'adminCredentials' => [
            'username' => 'admin',
            'passwordHash' => $defaultHash,
            'displayName' => 'พระบุญทัน ธมฺมธาตา (Admin)',
        ],
        'registrationOpen' => true,
        'menuPermissions' => [
            'student-card' => true,
            'coach-card' => true,
            'judge-card' => true,
            'judge-cert' => true,
            'school-cert' => true,
            'school-results' => true,
            'results' => true,
        ],
        'backgrounds' => [
            'bannerBgUrl' => '',
            'studentCardBgUrl' => '',
            'coachCardBgUrl' => '',
            'judgeCardBgUrl' => '',
            'certBgUrl' => '',
        ],
        'schools' => [
            [
                'id' => 'sch-10112201',
                'schoolCode' => '10112201',
                'passwordHash' => $defaultHash,
                'name' => 'โรงเรียนสุรินทร์ธรรมวิทยาคม',
                'director' => 'นายสมชาย ใจดีมีธรรม',
                'phone' => '044-511-234',
            ],
            [
                'id' => 'sch-10112202',
                'schoolCode' => '10112202',
                'passwordHash' => $defaultHash,
                'name' => 'โรงเรียนศรีณรงค์พุทธอุปถัมภ์',
                'director' => 'นางสาววิภาดา รักสงบ',
                'phone' => '044-512-890',
            ],
            [
                'id' => 'sch-10112203',
                'schoolCode' => '10112203',
                'passwordHash' => $defaultHash,
                'name' => 'โรงเรียนปราสาทปัญญาคุณ',
                'director' => 'นายเกรียงไกร บุญญารักษ์',
                'phone' => '044-513-456',
            ],
        ],
        'judges' => [
            [
                'id' => 'jdg-1',
                'username' => 'judge1',
                'passwordHash' => $defaultHash,
                'name' => 'พระมหาสมปอง ปัญญาธโร',
                'position' => 'ประธานกรรมการตัดสิน',
                'competitionId' => 'comp-1',
                'level' => 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
                'photoUrl' => '',
            ],
            [
                'id' => 'jdg-2',
                'username' => 'judge2',
                'passwordHash' => $defaultHash,
                'name' => 'ดร.กัญญาณี สุนทรธรรม',
                'position' => 'กรรมการตัดสิน',
                'competitionId' => 'comp-1',
                'level' => 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
                'photoUrl' => '',
            ],
            [
                'id' => 'jdg-3',
                'username' => 'judge3',
                'passwordHash' => $defaultHash,
                'name' => 'อาจารย์ธนวัฒน์ ศรีสวัสดิ์',
                'position' => 'กรรมการตัดสิน',
                'competitionId' => 'comp-1',
                'level' => 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
                'photoUrl' => '',
            ],
            [
                'id' => 'jdg-4',
                'username' => 'judge4',
                'passwordHash' => $defaultHash,
                'name' => 'นางสาวพิมพ์ชนก วรรณศิลป์',
                'position' => 'กรรมการตัดสิน',
                'competitionId' => 'comp-1',
                'level' => 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
                'photoUrl' => '',
            ],
            [
                'id' => 'jdg-5',
                'username' => 'judge5',
                'passwordHash' => $defaultHash,
                'name' => 'ครูสุรศักดิ์ เสียงไพเราะ',
                'position' => 'ประธานกรรมการตัดสิน',
                'competitionId' => 'comp-3',
                'level' => 'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
                'photoUrl' => '',
            ],
        ],
        'schedules' => buildInitialSchedules(),
        'registrations' => [
            [
                'id' => 'reg-1',
                'schoolId' => 'sch-10112201',
                'competitionId' => 'comp-1',
                'level' => 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
                'students' => [
                    ['name' => 'ด.ช.ปวริศร์ เจริญสุข', 'photoUrl' => ''],
                ],
                'coaches' => [['name' => 'นายอดิศร มีเมตตา', 'photoUrl' => '']],
                'qualifyingSong' => '',
                'finalSong' => '',
            ],
            [
                'id' => 'reg-2',
                'schoolId' => 'sch-10112202',
                'competitionId' => 'comp-1',
                'level' => 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
                'students' => [
                    ['name' => 'ด.ญ.ณัฐนิชา งามสง่า', 'photoUrl' => ''],
                ],
                'coaches' => [['name' => 'นางนภาภรณ์ สอนดี', 'photoUrl' => '']],
                'qualifyingSong' => '',
                'finalSong' => '',
            ],
            [
                'id' => 'reg-3',
                'schoolId' => 'sch-10112203',
                'competitionId' => 'comp-1',
                'level' => 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
                'students' => [
                    ['name' => 'ด.ช.กิตติภพ พัฒนธรรม', 'photoUrl' => ''],
                ],
                'coaches' => [['name' => 'นายวัฒนา แสงธรรม', 'photoUrl' => '']],
                'qualifyingSong' => '',
                'finalSong' => '',
            ],
            [
                'id' => 'reg-4',
                'schoolId' => 'sch-10112201',
                'competitionId' => 'comp-3',
                'level' => 'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
                'students' => [
                    ['name' => 'ด.ช.ธีรภัทร ขับขาน', 'photoUrl' => ''],
                ],
                'coaches' => [['name' => 'ครูสุเมธ ดนตรีไทย', 'photoUrl' => '']],
                'qualifyingSong' => 'วอนลมฝากข่าว (เพลงส่งเสริมคุณธรรม)',
                'finalSong' => 'จดหมายจากแนวหน้า / น้ำตาแม่',
            ],
            [
                'id' => 'reg-5',
                'schoolId' => 'sch-10112201',
                'competitionId' => 'comp-7',
                'level' => 'มัธยมศึกษาตอนปลาย (ม.4-ม.6)',
                'students' => [
                    ['name' => 'นายภูมิพัฒน์ ใฝ่รู้', 'photoUrl' => ''],
                    ['name' => 'นางสาวอารยา ปัญญาดี', 'photoUrl' => ''],
                ],
                'coaches' => [['name' => 'นางสมฤดี วิชาการ', 'photoUrl' => '']],
                'qualifyingSong' => '',
                'finalSong' => '',
            ],
            [
                'id' => 'reg-6',
                'schoolId' => 'sch-10112202',
                'competitionId' => 'comp-10',
                'level' => 'ไม่จำกัดระดับ',
                'students' => $altarStudents,
                'coaches' => [
                    ['name' => 'นายประเสริฐ ศิลป์ไทย', 'photoUrl' => ''],
                    ['name' => 'นางสาวดวงใจ พุทธศิลป์', 'photoUrl' => ''],
                ],
                'qualifyingSong' => '',
                'finalSong' => '',
            ],
        ],
        'scores' => [
            'reg-1' => ['jdg-1' => 92, 'jdg-2' => 90, 'jdg-3' => 89, 'jdg-4' => 93],
            'reg-2' => ['jdg-1' => 95, 'jdg-2' => 94, 'jdg-3' => 96, 'jdg-4' => 95],
        ],
        'scoreCriteriaDetails' => new stdClass(),
        'evalMeta' => [
            'comp-1__ประถมศึกษาตอนปลาย (ป.4-ป.6)' => [
                'status' => 'completed',
                'approved' => true,
            ],
            'comp-3__มัธยมศึกษาตอนต้น (ม.1-ม.3)' => [
                'status' => 'judging',
                'approved' => false,
            ],
        ],
        'absentRegs' => new stdClass(),
        'customCriteriaByComp' => $criteriaMap,
    ];
}

function readJsonFileLocked(string $filePath)
{
    if (!file_exists($filePath)) {
        return null;
    }
    $fp = @fopen($filePath, 'rb');
    if (!$fp) {
        return null;
    }
    flock($fp, LOCK_SH);
    $raw = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    $decoded = json_decode((string)$raw, true);
    return is_array($decoded) ? $decoded : null;
}

function writeJsonFileAtomic(string $filePath, $data): bool
{
    $json = json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    if ($json === false) {
        return false;
    }
    $tmpFile = $filePath . '.' . bin2hex(random_bytes(6)) . '.tmp';
    if (@file_put_contents($tmpFile, $json, LOCK_EX) === false) {
        return false;
    }
    if (!@rename($tmpFile, $filePath)) {
        @unlink($tmpFile);
        return false;
    }
    return true;
}

function hydrateDbShape(array $decoded): array
{
    $defaults = getDbDefaults();
    $decoded['schedules'] = array_merge($defaults['schedules'], is_array($decoded['schedules'] ?? null) ? $decoded['schedules'] : []);
    $decoded['menuPermissions'] = array_merge($defaults['menuPermissions'], is_array($decoded['menuPermissions'] ?? null) ? $decoded['menuPermissions'] : []);
    $decoded['backgrounds'] = array_merge($defaults['backgrounds'], is_array($decoded['backgrounds'] ?? null) ? $decoded['backgrounds'] : []);
    if (!isset($decoded['registrationOpen'])) {
        $decoded['registrationOpen'] = true;
    } else {
        $decoded['registrationOpen'] = (bool)$decoded['registrationOpen'];
    }
    foreach (['schools', 'judges', 'registrations'] as $arrKey) {
        if (!isset($decoded[$arrKey]) || !is_array($decoded[$arrKey])) {
            $decoded[$arrKey] = $defaults[$arrKey];
        }
    }
    foreach (['scores', 'scoreCriteriaDetails', 'evalMeta', 'absentRegs', 'customCriteriaByComp'] as $objKey) {
        if (!isset($decoded[$objKey]) || !is_array($decoded[$objKey])) {
            $decoded[$objKey] = $defaults[$objKey];
        }
    }
    if (empty($decoded['adminCredentials']) || !is_array($decoded['adminCredentials'])) {
        $decoded['adminCredentials'] = [
            'username' => 'admin',
            'passwordHash' => password_hash('1234', PASSWORD_DEFAULT),
            'displayName' => 'พระบุญทัน ธมฺมธาตา (Admin)',
        ];
    }
    return $decoded;
}

function loadDb(): array
{
    ensureStorageDirs();
    $store = getStoreFiles();

    // If modular store files exist, load from organized domain files
    if (file_exists($store['system'])) {
        $sys = readJsonFileLocked($store['system']) ?? [];
        $schools = readJsonFileLocked($store['schools']);
        $judges = readJsonFileLocked($store['judges']);
        $schedules = readJsonFileLocked($store['schedules']);
        $registrations = readJsonFileLocked($store['registrations']);
        $scoreBundle = readJsonFileLocked($store['scores']) ?? [];
        $criteria = readJsonFileLocked($store['criteria']);

        $combined = [
            'adminCredentials' => $sys['adminCredentials'] ?? null,
            'registrationOpen' => $sys['registrationOpen'] ?? true,
            'menuPermissions' => $sys['menuPermissions'] ?? [],
            'backgrounds' => $sys['backgrounds'] ?? [],
            'schools' => is_array($schools) ? $schools : [],
            'judges' => is_array($judges) ? $judges : [],
            'schedules' => is_array($schedules) ? $schedules : [],
            'registrations' => is_array($registrations) ? $registrations : [],
            'scores' => is_array($scoreBundle['scores'] ?? null) ? $scoreBundle['scores'] : [],
            'scoreCriteriaDetails' => is_array($scoreBundle['scoreCriteriaDetails'] ?? null) ? $scoreBundle['scoreCriteriaDetails'] : [],
            'evalMeta' => is_array($scoreBundle['evalMeta'] ?? null) ? $scoreBundle['evalMeta'] : [],
            'absentRegs' => is_array($scoreBundle['absentRegs'] ?? null) ? $scoreBundle['absentRegs'] : [],
            'customCriteriaByComp' => is_array($criteria) ? $criteria : [],
        ];
        return hydrateDbShape($combined);
    }

    // Migrate cleanly from legacy single db.json if present
    if (file_exists(DB_FILE)) {
        $legacy = readJsonFileLocked(DB_FILE);
        if (is_array($legacy)) {
            $hydrated = hydrateDbShape($legacy);
            saveDb($hydrated);
            return $hydrated;
        }
    }

    // First run initialization
    $initial = createInitialDb();
    saveDb($initial);
    return json_decode(json_encode($initial, JSON_UNESCAPED_UNICODE), true);
}

function normalizeJsonMaps(array $db): array
{
    $mapKeys = ['schedules', 'menuPermissions', 'backgrounds', 'scores', 'scoreCriteriaDetails', 'evalMeta', 'absentRegs', 'customCriteriaByComp'];
    foreach ($mapKeys as $k) {
        if (!isset($db[$k]) || (is_array($db[$k]) && count($db[$k]) === 0)) {
            $db[$k] = new stdClass();
        }
    }
    return $db;
}

function saveDb(array $db): bool
{
    ensureStorageDirs();
    $normalized = normalizeJsonMaps($db);
    $store = getStoreFiles();
    $asObj = static function ($v) {
        return (is_array($v) && count($v) === 0) ? new stdClass() : $v;
    };

    $systemDoc = [
        'adminCredentials' => $normalized['adminCredentials'] ?? [],
        'registrationOpen' => (bool)($normalized['registrationOpen'] ?? true),
        'menuPermissions' => $asObj($normalized['menuPermissions'] ?? []),
        'backgrounds' => $asObj($normalized['backgrounds'] ?? []),
    ];
    $scoresDoc = [
        'scores' => $asObj($normalized['scores'] ?? []),
        'scoreCriteriaDetails' => $asObj($normalized['scoreCriteriaDetails'] ?? []),
        'evalMeta' => $asObj($normalized['evalMeta'] ?? []),
        'absentRegs' => $asObj($normalized['absentRegs'] ?? []),
    ];

    $ok = writeJsonFileAtomic($store['system'], $systemDoc)
        && writeJsonFileAtomic($store['schools'], array_values((array)($normalized['schools'] ?? [])))
        && writeJsonFileAtomic($store['judges'], array_values((array)($normalized['judges'] ?? [])))
        && writeJsonFileAtomic($store['schedules'], $asObj($normalized['schedules'] ?? []))
        && writeJsonFileAtomic($store['registrations'], array_values((array)($normalized['registrations'] ?? [])))
        && writeJsonFileAtomic($store['scores'], $scoresDoc)
        && writeJsonFileAtomic($store['criteria'], $asObj($normalized['customCriteriaByComp'] ?? []));

    if (!$ok) {
        return false;
    }

    // Also update legacy db.json snapshot for backward compatibility
    @writeJsonFileAtomic(DB_FILE, $normalized);
    return true;
}

function getStorageStats(array $db): array
{
    $categories = [];
    $totalFiles = 0;
    $totalBytes = 0;
    foreach (UPLOAD_CATEGORIES as $cat) {
        $dir = UPLOADS_DIR . DIRECTORY_SEPARATOR . $cat;
        $count = 0;
        $bytes = 0;
        if (is_dir($dir)) {
            $items = @scandir($dir);
            if (is_array($items)) {
                foreach ($items as $item) {
                    if ($item === '.' || $item === '..' || $item === '.htaccess') {
                        continue;
                    }
                    $full = $dir . DIRECTORY_SEPARATOR . $item;
                    if (is_file($full)) {
                        $count++;
                        $sz = (int)@filesize($full);
                        $bytes += $sz;
                    }
                }
            }
        }
        $categories[$cat] = ['files' => $count, 'bytes' => $bytes];
        $totalFiles += $count;
        $totalBytes += $bytes;
    }

    // Include any legacy root uploads
    $rootItems = @scandir(UPLOADS_DIR);
    if (is_array($rootItems)) {
        foreach ($rootItems as $item) {
            if ($item === '.' || $item === '..' || $item === '.htaccess' || in_array($item, UPLOAD_CATEGORIES, true)) {
                continue;
            }
            $full = UPLOADS_DIR . DIRECTORY_SEPARATOR . $item;
            if (is_file($full)) {
                $totalFiles++;
                $totalBytes += (int)@filesize($full);
            }
        }
    }

    return [
        'totalUploadFiles' => $totalFiles,
        'totalUploadBytes' => $totalBytes,
        'categories' => $categories,
        'collections' => [
            'schools' => count($db['schools'] ?? []),
            'judges' => count($db['judges'] ?? []),
            'registrations' => count($db['registrations'] ?? []),
            'schedules' => is_array($db['schedules'] ?? null) ? count($db['schedules']) : 0,
            'scores' => is_array($db['scores'] ?? null) ? count($db['scores']) : 0,
        ],
    ];
}

function startAppSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    ensureStorageDirs();
    $sessionDir = DATA_DIR . DIRECTORY_SEPARATOR . 'sessions';
    if (!is_dir($sessionDir)) {
        @mkdir($sessionDir, 0755, true);
    }
    if (is_dir($sessionDir) && is_writable($sessionDir)) {
        @session_save_path($sessionDir);
    }

    $lifetime = 86400 * 365;
    @ini_set('session.gc_maxlifetime', (string)$lifetime);
    @ini_set('session.cookie_lifetime', (string)$lifetime);

    $proto = strtolower((string)($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''));
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strpos($proto, 'https') !== false
        || (($_SERVER['HTTP_X_FORWARDED_SSL'] ?? '') === 'on');

    if (PHP_VERSION_ID >= 70300) {
        @session_set_cookie_params([
            'lifetime' => $lifetime,
            'path' => '/',
            'httponly' => true,
            'samesite' => 'Lax',
            'secure' => $isHttps,
        ]);
    } else {
        @session_set_cookie_params($lifetime, '/', '', $isHttps, true);
    }
    @session_start();

    if (session_id() !== '') {
        if (PHP_VERSION_ID >= 70300) {
            @setcookie(session_name(), session_id(), [
                'expires' => time() + $lifetime,
                'path' => '/',
                'httponly' => true,
                'samesite' => 'Lax',
                'secure' => $isHttps,
            ]);
        } else {
            @setcookie(session_name(), session_id(), time() + $lifetime, '/', '', $isHttps, true);
        }
    }

    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    if (!isset($_SESSION['auth']) || !is_array($_SESSION['auth'])) {
        $_SESSION['auth'] = [
            'role' => 'guest',
            'userId' => null,
            'displayName' => 'ผู้เยี่ยมชมทั่วไป',
            'schoolId' => null,
            'judgeId' => null,
        ];
    }
}

function sanitizeSchoolForClient(array $school, bool $isAdmin): array
{
    $out = [
        'id' => (string)($school['id'] ?? ''),
        'schoolCode' => (string)($school['schoolCode'] ?? ''),
        'name' => (string)($school['name'] ?? ''),
        'director' => (string)($school['director'] ?? ''),
        'phone' => (string)($school['phone'] ?? ''),
    ];
    if ($isAdmin && isset($school['plainHint'])) {
        $out['plainHint'] = (string)$school['plainHint'];
    }
    return $out;
}

function sanitizeJudgeForClient(array $judge, string $role, ?string $currentJudgeId): array
{
    $out = [
        'id' => (string)($judge['id'] ?? ''),
        'username' => (string)($judge['username'] ?? ''),
        'name' => (string)($judge['name'] ?? ''),
        'position' => (string)($judge['position'] ?? 'กรรมการตัดสิน'),
        'competitionId' => (string)($judge['competitionId'] ?? 'comp-1'),
        'level' => (string)($judge['level'] ?? ''),
        'photoUrl' => (string)($judge['photoUrl'] ?? ''),
    ];
    if ($role === 'admin' || ($role === 'judge' && $currentJudgeId === $out['id'])) {
        $out['canPrintCard'] = true;
    }
    return $out;
}

function buildClientPayload(array $db, array $auth): array
{
    $role = (string)($auth['role'] ?? 'guest');
    $currentSchoolId = $auth['schoolId'] ?? null;
    $currentJudgeId = $auth['judgeId'] ?? null;

    // Verify persisted session still maps to an active record
    if ($role === 'school') {
        $found = null;
        foreach ($db['schools'] as $sch) {
            if (($sch['id'] ?? '') === $currentSchoolId) {
                $found = $sch;
                break;
            }
        }
        if (!$found) {
            $auth = ['role' => 'guest', 'userId' => null, 'displayName' => 'ผู้เยี่ยมชมทั่วไป', 'schoolId' => null, 'judgeId' => null];
            $role = 'guest';
        } else {
            $auth['displayName'] = (string)$found['name'];
        }
    } elseif ($role === 'judge') {
        $found = null;
        foreach ($db['judges'] as $jdg) {
            if (($jdg['id'] ?? '') === $currentJudgeId) {
                $found = $jdg;
                break;
            }
        }
        if (!$found) {
            $auth = ['role' => 'guest', 'userId' => null, 'displayName' => 'ผู้เยี่ยมชมทั่วไป', 'schoolId' => null, 'judgeId' => null];
            $role = 'guest';
        } else {
            $auth['displayName'] = (string)$found['name'];
        }
    } elseif ($role === 'admin') {
        $auth['displayName'] = (string)($db['adminCredentials']['displayName'] ?? 'ผู้ดูแลระบบ (Admin)');
    }

    $schoolsOut = [];
    foreach ($db['schools'] as $sch) {
        $schoolsOut[] = sanitizeSchoolForClient($sch, $role === 'admin');
    }

    $judgesOut = [];
    foreach ($db['judges'] as $jdg) {
        $judgesOut[] = sanitizeJudgeForClient($jdg, $role, $currentJudgeId);
    }

    $asObj = static function ($v) {
        return (is_array($v) && count($v) === 0) ? new stdClass() : $v;
    };

    return [
        'csrfToken' => (string)($_SESSION['csrf_token'] ?? ''),
        'authSession' => $auth,
        'competitions' => getCompetitions(),
        'eventMeta' => [
            'dateTh' => EVENT_DATE_TH,
            'titleTh' => EVENT_TITLE_TH,
            'venueTh' => EVENT_VENUE_TH,
        ],
        'adminProfile' => [
            'username' => $role === 'admin' ? (string)($db['adminCredentials']['username'] ?? 'admin') : '',
            'displayName' => (string)($db['adminCredentials']['displayName'] ?? 'พระบุญทัน ธมฺมธาตา (Admin)'),
        ],
        'registrationOpen' => (bool)($db['registrationOpen'] ?? true),
        'menuPermissions' => $asObj($db['menuPermissions'] ?? []),
        'backgrounds' => $asObj($db['backgrounds'] ?? []),
        'schools' => $schoolsOut,
        'judges' => $judgesOut,
        'schedules' => $asObj($db['schedules'] ?? []),
        'registrations' => $db['registrations'],
        'scores' => $asObj($db['scores'] ?? []),
        'scoreCriteriaDetails' => $asObj($db['scoreCriteriaDetails'] ?? []),
        'evalMeta' => $asObj($db['evalMeta'] ?? []),
        'absentRegs' => $asObj($db['absentRegs'] ?? []),
        'customCriteriaByComp' => $asObj($db['customCriteriaByComp'] ?? []),
        'storageStats' => $role === 'admin' ? getStorageStats($db) : null,
    ];
}
