import React, { useState, useMemo, useRef } from 'react';
import {
  Home,
  UserPlus,
  ListChecks,
  Calendar,
  Users,
  Layers,
  IdCard,
  Award,
  Trophy,
  LogIn,
  LogOut,
  ShieldCheck,
  School,
  Gavel,
  Sparkles,
  CheckCircle2,
  XCircle,
  Clock,
  FileDown,
  Upload,
  Edit3,
  Plus,
  Trash2,
  Search,
  ChevronRight,
  MapPin,
  Music,
  Eye,
  Lock,
  Unlock,
  Settings,
  Menu,
  X,
  Printer,
  FileText,
  AlertCircle,
  Check,
  Image as ImageIcon,
  SlidersHorizontal
} from 'lucide-react';

// ============================================================================
// 1. MASTER DATA & CONSTANTS (รายการแข่งขัน 10 รายการ & ระดับชั้น)
// ============================================================================

const EVENT_DATE_TH = 'วันพุธที่ 17 กุมภาพันธ์ พ.ศ. 2570';
const EVENT_TITLE_TH = 'งานสัปดาห์ส่งเสริมวันสำคัญทางพระพุทธศาสนาวันมาฆบูชา ครั้งที่ 14 ประจำปี 2570';
const EVENT_VENUE_TH = 'โรงเรียนบ้านหนองบัว ตำบลหนองบัว อำเภอศีขรภูมิ จังหวัดสุรินทร์';

const LEVELS_STANDARD = [
  'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
  'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
  'มัธยมศึกษาตอนปลาย (ม.4-ม.6)'
];

const LEVELS_UNLIMITED = [
  'ไม่จำกัดระดับ'
];

const COMPETITIONS = [
  {
    id: 'comp-1',
    name: 'การบรรยายธรรม',
    type: 'เดี่ยว',
    teamSize: 1,
    levels: LEVELS_STANDARD,
    requiresSongs: false,
    accentColor: 'from-amber-500 to-orange-500',
    badgeBg: 'bg-amber-100 text-amber-800 border-amber-200'
  },
  {
    id: 'comp-2',
    name: 'การเล่านิทานธรรม',
    type: 'เดี่ยว',
    teamSize: 1,
    levels: LEVELS_STANDARD,
    requiresSongs: false,
    accentColor: 'from-emerald-500 to-teal-500',
    badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200'
  },
  {
    id: 'comp-3',
    name: 'การร้องเพลงไทยลูกทุ่งส่งเสริมคุณธรรม (ชาย)',
    type: 'เดี่ยว',
    teamSize: 1,
    levels: LEVELS_STANDARD,
    requiresSongs: true,
    accentColor: 'from-sky-500 to-indigo-500',
    badgeBg: 'bg-sky-100 text-sky-800 border-sky-200'
  },
  {
    id: 'comp-4',
    name: 'การร้องเพลงไทยลูกทุ่งส่งเสริมคุณธรรม (หญิง)',
    type: 'เดี่ยว',
    teamSize: 1,
    levels: LEVELS_STANDARD,
    requiresSongs: true,
    accentColor: 'from-pink-500 to-rose-500',
    badgeBg: 'bg-pink-100 text-pink-800 border-pink-200'
  },
  {
    id: 'comp-5',
    name: 'การวาดภาพลายเส้น',
    type: 'เดี่ยว',
    teamSize: 1,
    levels: LEVELS_STANDARD,
    requiresSongs: false,
    accentColor: 'from-purple-500 to-fuchsia-500',
    badgeBg: 'bg-purple-100 text-purple-800 border-purple-200'
  },
  {
    id: 'comp-6',
    name: 'การเขียนเรียงความแก้กระทู้ธรรมชั้นตรี',
    type: 'เดี่ยว',
    teamSize: 1,
    levels: LEVELS_STANDARD,
    requiresSongs: false,
    accentColor: 'from-violet-500 to-indigo-600',
    badgeBg: 'bg-violet-100 text-violet-800 border-violet-200'
  },
  {
    id: 'comp-7',
    name: 'ตอบปัญหาธรรม',
    type: 'ทีมละ 2 คน',
    teamSize: 2,
    levels: LEVELS_STANDARD,
    requiresSongs: false,
    accentColor: 'from-cyan-500 to-blue-600',
    badgeBg: 'bg-cyan-100 text-cyan-800 border-cyan-200'
  },
  {
    id: 'comp-8',
    name: 'การกล่าวคำอาราธนาและถวายทานในพุทธศาสนพิธี',
    type: 'ทีมละ 5 คน',
    teamSize: 5,
    levels: LEVELS_STANDARD,
    requiresSongs: false,
    accentColor: 'from-yellow-500 to-amber-600',
    badgeBg: 'bg-yellow-100 text-yellow-800 border-yellow-200'
  },
  {
    id: 'comp-9',
    name: 'การสวดมนต์หมู่สรรเสริญพระรัตนตรัยทำนองสรภัญญะ (หญิงล้วน)',
    type: 'ทีมละ 5 คน',
    teamSize: 5,
    levels: LEVELS_STANDARD,
    requiresSongs: false,
    accentColor: 'from-teal-500 to-emerald-600',
    badgeBg: 'bg-teal-100 text-teal-800 border-teal-200'
  },
  {
    id: 'comp-10',
    name: 'การจัดโต๊ะหมู่บูชา หมู่ 7',
    type: 'ทีมละ 10 คน',
    teamSize: 10,
    levels: LEVELS_UNLIMITED,
    requiresSongs: false,
    accentColor: 'from-orange-500 to-red-500',
    badgeBg: 'bg-orange-100 text-orange-800 border-orange-200'
  }
];

// ============================================================================
// 2. INITIAL SAMPLE DATA (โรงเรียน, กรรมการ, ตารางแข่ง, ใบสมัคร, คะแนน)
// ============================================================================

const INITIAL_SCHOOLS = [
  {
    id: 'sch-10112201',
    schoolCode: '10112201',
    password: '1234',
    name: 'โรงเรียนสุรินทร์ธรรมวิทยาคม',
    director: 'นายสมชาย ใจดีมีธรรม',
    phone: '044-511-234'
  },
  {
    id: 'sch-10112202',
    schoolCode: '10112202',
    password: '1234',
    name: 'โรงเรียนศรีณรงค์พุทธอุปถัมภ์',
    director: 'นางสาววิภาดา รักสงบ',
    phone: '044-512-890'
  },
  {
    id: 'sch-10112203',
    schoolCode: '10112203',
    password: '1234',
    name: 'โรงเรียนปราสาทปัญญาคุณ',
    director: 'นายเกรียงไกร บุญญารักษ์',
    phone: '044-513-456'
  }
];

const INITIAL_JUDGES = [
  {
    id: 'jdg-1',
    username: 'judge1',
    password: '1234',
    name: 'พระมหาสมปอง ปัญญาธโร',
    position: 'ประธานกรรมการตัดสิน',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    photoUrl: ''
  },
  {
    id: 'jdg-2',
    username: 'judge2',
    password: '1234',
    name: 'ดร.กัญญาณี สุนทรธรรม',
    position: 'กรรมการตัดสิน',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    photoUrl: ''
  },
  {
    id: 'jdg-3',
    username: 'judge3',
    password: '1234',
    name: 'อาจารย์ธนวัฒน์ ศรีสวัสดิ์',
    position: 'กรรมการตัดสิน',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    photoUrl: ''
  },
  {
    id: 'jdg-4',
    username: 'judge4',
    password: '1234',
    name: 'นางสาวพิมพ์ชนก วรรณศิลป์',
    position: 'กรรมการตัดสิน',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    photoUrl: ''
  },
  {
    id: 'jdg-5',
    username: 'judge5',
    password: '1234',
    name: 'ครูสุรศักดิ์ เสียงไพเราะ',
    position: 'ประธานกรรมการตัดสิน',
    competitionId: 'comp-3',
    level: 'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
    photoUrl: ''
  }
];

const buildInitialSchedules = () => {
  const map = {};
  COMPETITIONS.forEach((comp, idx) => {
    comp.levels.forEach((lvl, lIdx) => {
      const key = `${comp.id}__${lvl}`;
      const startHour = 8 + (idx % 4);
      const startMin = lIdx === 0 ? '00' : lIdx === 1 ? '30' : '00';
      const endHour = startHour + 1;
      map[key] = {
        venue: `${EVENT_VENUE_TH} — ห้องที่ ${idx + 1}.${lIdx + 1}`,
        dateLabel: EVENT_DATE_TH,
        timeRange: `${String(startHour).padStart(2, '0')}.${startMin} - ${String(endHour).padStart(2, '0')}.${startMin} น.`,
        notes: 'รายงานตัวก่อนเวลาแข่งขัน 30 นาที'
      };
    });
  });
  return map;
};

const INITIAL_REGISTRATIONS = [
  {
    id: 'reg-1',
    schoolId: 'sch-10112201',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    students: [
      { name: 'ด.ช.ปวริศร์ เจริญสุข', photoUrl: '' }
    ],
    coaches: ['นายอดิศร มีเมตตา'],
    qualifyingSong: '',
    finalSong: ''
  },
  {
    id: 'reg-2',
    schoolId: 'sch-10112202',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    students: [
      { name: 'ด.ญ.ณัฐนิชา งามสง่า', photoUrl: '' }
    ],
    coaches: ['นางนภาภรณ์ สอนดี'],
    qualifyingSong: '',
    finalSong: ''
  },
  {
    id: 'reg-3',
    schoolId: 'sch-10112203',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    students: [
      { name: 'ด.ช.กิตติภพ พัฒนธรรม', photoUrl: '' }
    ],
    coaches: ['นายวัฒนา แสงธรรม'],
    qualifyingSong: '',
    finalSong: ''
  },
  {
    id: 'reg-4',
    schoolId: 'sch-10112201',
    competitionId: 'comp-3',
    level: 'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
    students: [
      { name: 'ด.ช.ธีรภัทร ขับขาน', photoUrl: '' }
    ],
    coaches: ['ครูสุเมธ ดนตรีไทย'],
    qualifyingSong: 'วอนลมฝากข่าว (เพลงส่งเสริมคุณธรรม)',
    finalSong: 'จดหมายจากแนวหน้า / น้ำตาแม่'
  },
  {
    id: 'reg-5',
    schoolId: 'sch-10112201',
    competitionId: 'comp-7',
    level: 'มัธยมศึกษาตอนปลาย (ม.4-ม.6)',
    students: [
      { name: 'นายภูมิพัฒน์ ใฝ่รู้', photoUrl: '' },
      { name: 'นางสาวอารยา ปัญญาดี', photoUrl: '' }
    ],
    coaches: ['นางสมฤดี วิชาการ'],
    qualifyingSong: '',
    finalSong: ''
  },
  {
    id: 'reg-6',
    schoolId: 'sch-10112202',
    competitionId: 'comp-10',
    level: 'ไม่จำกัดระดับ',
    students: Array.from({ length: 10 }, (_, i) => ({
      name: `นักเรียนสมาชิกโต๊ะหมู่ที่ ${i + 1}`,
      photoUrl: ''
    })),
    coaches: ['นายประเสริฐ ศิลป์ไทย', 'นางสาวดวงใจ พุทธศิลป์'],
    qualifyingSong: '',
    finalSong: ''
  }
];

// คะแนนกรรมการรายกิจกรรม/ระดับ/ใบสมัคร: scoresMap[regId][judgeId] = number (0-100)
const INITIAL_SCORES = {
  'reg-1': {
    'jdg-1': 92,
    'jdg-2': 90,
    'jdg-3': 89,
    'jdg-4': 93
  },
  'reg-2': {
    'jdg-1': 95,
    'jdg-2': 94,
    'jdg-3': 96,
    'jdg-4': 95
  }
};

const INITIAL_SCORE_CRITERIA = {};

function getCompetitionCriteria(competitionId, customCriteriaMap = null) {
  if (
    customCriteriaMap &&
    Array.isArray(customCriteriaMap[competitionId]) &&
    customCriteriaMap[competitionId].length > 0
  ) {
    return customCriteriaMap[competitionId].map((item, idx) => {
      const numericMax = Number(item.max) || 0;
      return {
        key: item.key || `custom_${idx + 1}`,
        label: item.label || `เกณฑ์ที่ ${idx + 1}`,
        max: numericMax,
        maxLabel: item.maxLabel || `${numericMax} คะแนน`
      };
    });
  }

  if (competitionId === 'comp-1') {
    return [
      { key: 'dt1', label: '๑) การปรากฏตัวและมารยาทไทย', max: 10, maxLabel: '๑๐ คะแนน' },
      { key: 'dt2', label: '๒) กล่าวทักทายที่ประชุม และอารัมภบท', max: 10, maxLabel: '๑๐ คะแนน' },
      {
        key: 'dt3',
        label: '๓) เนื้อหาของการบรรยายมีความต่อเนื่อง มีเหตุผลและความเหมาะสมกลมกลืน',
        max: 30,
        maxLabel: '๓๐ คะแนน'
      },
      {
        key: 'dt4',
        label: '๔) การใช้ภาษา ถ้อยคำสำเนียง และออกเสียงอักขระควบกล้ำชัดเจน',
        max: 20,
        maxLabel: '๒๐ คะแนน'
      },
      {
        key: 'dt5',
        label: '๕) บุคลิกลักษณะ การใช้สายตา และลีลาท่าทาง',
        max: 10,
        maxLabel: '๑๐ คะแนน'
      },
      { key: 'dt6', label: '๖) การกล่าวสรุปจบ', max: 10, maxLabel: '๑๐ คะแนน' },
      { key: 'dt7', label: '๗) การรักษาเวลา', max: 10, maxLabel: '๑๐ คะแนน' }
    ];
  }
  if (competitionId === 'comp-2') {
    return [
      {
        key: 'st1',
        label: '๑) มารยาทไทย กล่าวทักทายที่ประชุม และอารัมภบท',
        max: 10,
        maxLabel: '๑๐ คะแนน'
      },
      {
        key: 'st2',
        label: '๒) เนื้อหาสาระเน้นคุณธรรม จริยธรรม มีข้อคิด คติเตือนใจ',
        max: 30,
        maxLabel: '๓๐ คะแนน'
      },
      {
        key: 'st3',
        label: '๓) การใช้ภาษาถูกต้องตามอักขระและความต่อเนื่องในการเล่า',
        max: 20,
        maxLabel: '๒๐ คะแนน'
      },
      {
        key: 'st4',
        label: '๔) บุคลิกภาพ น้ำเสียง และลีลาท่าทาง',
        max: 20,
        maxLabel: '๒๐ คะแนน'
      },
      {
        key: 'st6',
        label: '๖) ความคิดริเริ่มสร้างสรรค์ การใช้สื่อ อุปกรณ์เหมาะสม',
        max: 15,
        maxLabel: '๑๕ คะแนน'
      },
      {
        key: 'st7',
        label: '๗) ใช้เวลาตามกำหนด',
        max: 5,
        maxLabel: '๕ คะแนน'
      }
    ];
  }
  if (competitionId === 'comp-3' || competitionId === 'comp-4') {
    return [
      { key: 'fs1', label: '๑) น้ำเสียง ความไพเราะของเสียง', max: 30, maxLabel: '30 คะแนน' },
      { key: 'fs2', label: '๒) เทคนิคการขับร้อง', max: 20, maxLabel: '20 คะแนน' },
      { key: 'fs3', label: '3) จังหวะ ทำนอง ถูกต้อง', max: 25, maxLabel: '25 คะแนน' },
      { key: 'fs4', label: '4) อักขระวิธีถูกต้อง', max: 15, maxLabel: '15 คะแนน' },
      { key: 'fs5', label: '5) บุคลิก ลีลา อารมณ์', max: 10, maxLabel: '10 คะแนน' }
    ];
  }
  if (competitionId === 'comp-5') {
    return [
      {
        key: 'ld1',
        label: '๑) ลักษณะความสมบูรณ์ของเส้น ความถูกต้องของแสงเงา',
        max: 30,
        maxLabel: '30 คะแนน'
      },
      { key: 'ld2', label: '๒) การจัดภาพ / องค์ประกอบ', max: 20, maxLabel: '20 คะแนน' },
      { key: 'ld3', label: '๓) ความคิดสร้างสรรค์', max: 20, maxLabel: '20 คะแนน' },
      { key: 'ld4', label: '๔) ความสมบูรณ์ ความประณีตของชิ้นงาน', max: 20, maxLabel: '20 คะแนน' },
      { key: 'ld5', label: '๕) ความสอดคล้องกับหัวข้อที่กำหนด', max: 10, maxLabel: '10 คะแนน' }
    ];
  }
  if (competitionId === 'comp-7') {
    return [];
  }
  if (competitionId === 'comp-8') {
    return [
      {
        key: 'co1',
        label: '1) มารยาทเรียบร้อยถูกต้องตามหลักศาสนพิธี',
        max: 10,
        maxLabel: 'จำนวน ๑๐ คะแนน'
      },
      {
        key: 'co2',
        label: '2) ความถูกต้องของอักขระ',
        max: 20,
        maxLabel: 'จำนวน ๒๐ คะแนน'
      },
      {
        key: 'co3',
        label: '3) ความถูกต้องของจังหวะ และวรรคตอน',
        max: 15,
        maxLabel: 'จำนวน ๑๕ คะแนน'
      },
      {
        key: 'co4',
        label: '4) ความถูกต้องของทำนอง (ธรรมวัตร)',
        max: 15,
        maxLabel: 'จำนวน ๑๕ คะแนน'
      },
      {
        key: 'co5',
        label: '5) ความไพเราะของน้ำเสียง',
        max: 15,
        maxLabel: 'จำนวน ๑๕ คะแนน'
      },
      {
        key: 'co6',
        label: '6) ลำดับขั้นตอนถูกต้อง',
        max: 15,
        maxLabel: 'จำนวน ๑๕ คะแนน'
      },
      {
        key: 'co7',
        label: '7) ความพร้อมเพรียงโดยรวม',
        max: 10,
        maxLabel: 'จำนวน ๑๐ คะแนน'
      }
    ];
  }
  if (competitionId === 'comp-9') {
    return [
      { key: 'ch1', label: '๑) ความถูกต้องของอักขระ', max: 20, maxLabel: '๒๐ คะแนน' },
      { key: 'ch2', label: '๒) ความถูกต้องของจังหวะ', max: 20, maxLabel: '๒๐ คะแนน' },
      { key: 'ch3', label: '๓) ความถูกต้องของทำนอง', max: 20, maxLabel: '๒๐ คะแนน' },
      { key: 'ch4', label: '๔) ความไพเราะของน้ำเสียง', max: 20, maxLabel: '๒๐ คะแนน' },
      { key: 'ch5', label: '๕) มารยาทและท่าทาง', max: 10, maxLabel: '๑๐ คะแนน' },
      { key: 'ch6', label: '๖) ความพร้อมเพียงโดยรวม', max: 10, maxLabel: '๑๐ คะแนน' }
    ];
  }
  if (competitionId === 'comp-10') {
    return [
      { key: 'al1', label: '๑) ขั้นตอนกระบวนการการทำงาน', max: 10, maxLabel: '๑๐ คะแนน' },
      {
        key: 'al2',
        label: '๒) ความถูกต้องของโต๊ะหมู่ตามชนิดที่กำหนด และการจัดวางโต๊ะหมู่บูชา จะต้องประกอบไปด้วย พระพุทธรูปแจกัน พานพุ่ม ดอกไม้สด เชิงเทียน กระถางธูป',
        max: 20,
        maxLabel: '๒๐ คะแนน'
      },
      {
        key: 'al3',
        label: '๓) ความประณีต สวยงาม ของเครื่องประดับตกแต่งและการจัดดอกไม้สด',
        max: 30,
        maxLabel: '๓๐ คะแนน'
      },
      {
        key: 'al4',
        label: '๔) ความถูกต้องในการจัดโต๊ะหมู่บูชาตามแบบธรรมเนียมพิธีการ',
        max: 20,
        maxLabel: '๒๐ คะแนน'
      },
      { key: 'al5', label: '๕) ความคิดสร้างสรรค์', max: 10, maxLabel: '๑๐ คะแนน' },
      { key: 'al6', label: '๖) สำเร็จทันเวลา', max: 10, maxLabel: '๑๐ คะแนน' },
      { key: 'al7', label: '๗) ความสะอาดเรียบร้อย', max: 10, maxLabel: '๑๐ คะแนน' }
    ];
  }
  if (competitionId === 'comp-6') {
    return [
      { key: 'es1', label: '1) แต่งได้ครบตามกำหนด', max: 15, maxLabel: '๑๕ คะแนน' },
      {
        key: 'es2',
        label: '2) อ้างสุภาษิตที่เชื่อมได้ตามกฎ และบอกที่มาได้ถูกต้อง',
        max: 10,
        maxLabel: '๑๐ คะแนน'
      },
      { key: 'es3', label: '3) ใช้ตัวอักษรแบบกระทรวงศึกษาธิการ', max: 20, maxLabel: '๒๐ คะแนน' },
      { key: 'es4', label: '4) อธิบายความสมกับกระทู้ที่ตั้งไว้', max: 30, maxLabel: '๓๐ คะแนน' },
      {
        key: 'es5',
        label: '5) ใช้ตัวสะกดการันต์ถูกต้อง (เขียนผิดซํ้าให้นับเป็น ๑ คํา)',
        max: 15,
        maxLabel: '๑๕ คะแนน'
      },
      { key: 'es6', label: '6) สะอาดไม่เปรอะเปื้อน', max: 10, maxLabel: '๑๐ คะแนน' }
    ];
  }
  return [
    { key: 's1', label: '1) คุณภาพและเนื้อหาตามหัวข้อการแข่งขัน', max: 40, maxLabel: '40 คะแนน' },
    { key: 's2', label: '2) ความคิดสร้างสรรค์ ทักษะ และปฏิภาณไหวพริบ', max: 30, maxLabel: '30 คะแนน' },
    { key: 's3', label: '3) บุคลิกภาพ การนำเสนอ และความถูกต้องตามกติกา', max: 20, maxLabel: '20 คะแนน' },
    { key: 's4', label: '4) การตรงต่อเวลาและการทำงานร่วมกัน', max: 10, maxLabel: '10 คะแนน' }
  ];
}

// สถานะการตัดสินและการอนุมัติผลแยกตาม `${compId}__${level}`
// status: 'pending' | 'judging' | 'completed'
// approved: boolean
const INITIAL_EVAL_META = {
  'comp-1__ประถมศึกษาตอนปลาย (ป.4-ป.6)': {
    status: 'completed',
    approved: true
  },
  'comp-3__มัธยมศึกษาตอนต้น (ม.1-ม.3)': {
    status: 'judging',
    approved: false
  }
};

// ============================================================================
// 3. HELPER FUNCTIONS (คำนวณคะแนนเฉลี่ย 100, ดาวน์โหลด PDF / HTML Print)
// ============================================================================

/**
 * คำนวณคะแนนรวมคิดเป็น 100 คะแนนจากคะแนนกรรมการแต่ละท่าน (เต็ม 100 ต่อท่าน)
 * ใช้ค่าเฉลี่ยของกรรมการที่ให้คะแนนแล้ว เพื่อให้คะแนนรวมอยู่บนฐาน 100 คะแนนเต็ม
 */
function calculateNormalizedScore(scoresObj) {
  if (!scoresObj) return { average100: 0, judgeCount: 0, rawSum: 0 };
  const vals = Object.values(scoresObj).filter((v) => typeof v === 'number' && !Number.isNaN(v));
  if (vals.length === 0) return { average100: 0, judgeCount: 0, rawSum: 0 };
  const rawSum = vals.reduce((acc, cur) => acc + cur, 0);
  const average100 = Number((rawSum / vals.length).toFixed(2));
  return { average100, judgeCount: vals.length, rawSum };
}

/**
 * คำนวณระดับเหรียญรางวัลตามเกณฑ์คะแนน (เต็ม 100)
 * - 80 ขึ้นไป : เหรียญทอง
 * - 70 - 79.99 : เหรียญเงิน
 * - 60 - 69.99 : เหรียญทองแดง
 * - ต่ำกว่า 60 : เข้าร่วม
 */
function getMedalTier(score, hasScores = true) {
  if (!hasScores) {
    return {
      label: 'รอคะแนน',
      certText: 'เข้าร่วมการแข่งขัน',
      badgeCls: 'bg-slate-100 text-slate-600 border-slate-200',
      printColor: '#475569'
    };
  }
  if (score >= 80) {
    return {
      label: 'เหรียญทอง',
      certText: 'ได้รับรางวัลระดับเหรียญทอง',
      badgeCls: 'bg-amber-100 text-amber-800 border-amber-300',
      printColor: '#b45309'
    };
  }
  if (score >= 70) {
    return {
      label: 'เหรียญเงิน',
      certText: 'ได้รับรางวัลระดับเหรียญเงิน',
      badgeCls: 'bg-slate-200 text-slate-800 border-slate-300',
      printColor: '#334155'
    };
  }
  if (score >= 60) {
    return {
      label: 'เหรียญทองแดง',
      certText: 'ได้รับรางวัลระดับเหรียญทองแดง',
      badgeCls: 'bg-orange-100 text-orange-800 border-orange-300',
      printColor: '#c2410c'
    };
  }
  return {
    label: 'เข้าร่วม',
    certText: 'เข้าร่วมการแข่งขัน',
    badgeCls: 'bg-sky-50 text-sky-700 border-sky-200',
    printColor: '#0369a1'
  };
}

/**
 * แปลงเลขอารบิกเป็นเลขไทย (๐-๙) และจัดรูปแบบเลขลำดับ
 */
function toThaiDigits(val) {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return String(val).replace(/[0-9]/g, (d) => thaiDigits[Number(d)]);
}

/**
 * แปลงตัวเลขในข้อความ HTML ของเอกสารให้เป็นเลขไทย (ยกเว้นภายใน HTML tags และ attributes)
 */
function convertHtmlTextToThaiDigits(htmlString) {
  return String(htmlString || '').replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag;
    return toThaiDigits(text);
  });
}

function formatCertificateNumber(roleCode, sequenceNum) {
  const paddedSeq = String(sequenceNum).padStart(3, '0');
  return `เลขที่ จอ.0010.มฆ_${roleCode}_${paddedSeq} /2570`;
}

/**
 * จัดเรียงบัตรเป็นชุดละ 4 ใบในแนวตั้ง (4 ต่อ 1) หรือแยกใบเดี่ยว (1 ต่อ 1)
 */
function buildCardSheetsHtml(cardsArray, layoutMode = '4-up') {
  if (layoutMode === '1-up') {
    return cardsArray
      .map((cardHtml) => `<div class="page-break" style="display:flex;justify-content:center;align-items:center;">${cardHtml}</div>`)
      .join('');
  }

  const sheets = [];
  for (let i = 0; i < cardsArray.length; i += 4) {
    const chunk = cardsArray.slice(i, i + 4);
    const cells = chunk
      .map(
        (cardHtml) =>
          `<div style="display:flex;justify-content:center;align-items:center;">${cardHtml}</div>`
      )
      .join('');

    sheets.push(`
      <div class="page-break a4-4up-sheet portrait-4up">
        <div class="grid-4up portrait-grid-4up">
          ${cells}
        </div>
      </div>
    `);
  }
  return sheets.join('');
}

/**
 * เปิดหน้าต่างพิมพ์/บันทึกเป็น PDF ด้วยขนาดกระดาษที่กำหนดอย่างแม่นยำ
 * รองรับ:
 * - บัตรผู้เข้าแข่งขัน / บัตรครูผู้ฝึกสอน / บัตรกรรมการ ขนาด 148.5mm x 105mm (14.85 x 10.5 ซม.) แนวตั้ง
 *   ทั้งแบบ 4 ต่อ 1 (ลงกระดาษ A4 แนวนอน แผ่นละ 4 ใบ) และแบบ 1 ต่อ 1
 * - เกียรติบัตร ขนาด A4 แนวนอน (297mm x 210mm)
 * - รายงานผลการแข่งขัน ขนาด A4 แนวตั้ง
 */
function openPrintableDocument(title, bodyHtml, pageSizeCss, extraStyleCss = '') {
  try {
    const printWin = window.open('', '_blank', 'width=1024,height=768');
    if (!printWin) {
      return { ok: false, message: 'เบราว์เซอร์บล็อกป๊อปอัป กรุณาอนุญาตป๊อปอัปเพื่อพิมพ์หรือบันทึกเป็น PDF' };
    }
    const thaiBodyHtml = convertHtmlTextToThaiDigits(bodyHtml);
    const htmlDoc = `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <title>${title}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet">
        <style>
          @page {
            size: ${pageSizeCss};
            margin: 0;
          }
          * {
            box-sizing: border-box;
            font-family: 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', 'Tahoma', sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body {
            margin: 0;
            padding: 16px;
            font-family: 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', 'Tahoma', sans-serif;
            background: #f1f5f9;
            color: #0f172a;
          }
          .print-toolbar {
            position: sticky;
            top: 0;
            z-index: 50;
            background: #0f172a;
            color: #fff;
            padding: 12px 20px;
            border-radius: 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            gap: 12px;
            flex-wrap: wrap;
          }
          .print-btn {
            background: linear-gradient(135deg, #059669, #0d9488);
            color: white;
            border: none;
            padding: 8px 18px;
            border-radius: 8px;
            font-weight: 700;
            font-family: 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', 'Tahoma', sans-serif;
            cursor: pointer;
            font-size: 14px;
          }
          .sheet-wrap {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 20px;
          }
          .a4-4up-sheet {
            width: 297mm;
            height: 210mm;
            background: #ffffff;
            padding: 5mm;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 6px 20px rgba(15, 23, 42, 0.12);
          }
          .a4-4up-sheet.portrait-4up {
            width: 210mm;
            height: 297mm;
            padding: 5mm;
          }
          .grid-4up {
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 2.5mm;
            align-items: center;
            justify-items: center;
          }
          .grid-4up.portrait-grid-4up {
            grid-template-columns: repeat(2, 1fr);
            grid-template-rows: repeat(2, 1fr);
            gap: 3mm;
          }
          .grid-4up .card-item {
            transform: scale(0.66);
            transform-origin: center center;
          }
          .grid-4up.portrait-grid-4up .card-item {
            transform: scale(0.88);
            transform-origin: center center;
          }
          ${extraStyleCss}
          @media print {
            body {
              background: white;
              padding: 0;
            }
            .print-toolbar {
              display: none !important;
            }
            .sheet-wrap {
              display: block;
              gap: 0;
            }
            .a4-4up-sheet {
              box-shadow: none;
              page-break-after: always;
              break-after: page;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            .a4-4up-sheet .page-break {
              page-break-after: auto;
              break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        <div class="print-toolbar">
          <div>
            <strong>${title}</strong> — เลือก "Save as PDF / บันทึกเป็น PDF" หรือเลือกเครื่องพิมพ์ในหน้าต่างพิมพ์
          </div>
          <button class="print-btn" onclick="triggerPdfPrint()">พิมพ์ / ดาวน์โหลด PDF</button>
        </div>
        <div class="sheet-wrap">
          ${thaiBodyHtml}
        </div>
        <script>
          function triggerPdfPrint() {
            if (document.fonts && document.fonts.ready) {
              document.fonts.ready.then(function () {
                setTimeout(function () {
                  window.print();
                }, 120);
              });
            } else {
              window.print();
            }
          }
        </script>
      </body>
      </html>
    `;
    printWin.document.open();
    printWin.document.write(htmlDoc);
    printWin.document.close();
    return { ok: true, message: 'เปิดหน้าเอกสารพร้อมดาวน์โหลด PDF เรียบร้อยแล้ว' };
  } catch (err) {
    return { ok: false, message: `เกิดข้อผิดพลาดในการสร้างเอกสาร: ${err.message}` };
  }
}

// ============================================================================
// 4. MAIN APPLICATION COMPONENT
// ============================================================================

export default function App() {
  // ---------------- Session & Navigation State ----------------
  // role: 'guest' | 'admin' | 'school' | 'judge'
  const [authSession, setAuthSession] = useState({
    role: 'guest',
    userId: null,
    displayName: 'ผู้เยี่ยมชมทั่วไป',
    schoolId: null,
    judgeId: null
  });

  const [activeMenu, setActiveMenu] = useState('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // ---------------- System Settings & Backgrounds ----------------
  const [registrationOpen, setRegistrationOpen] = useState(true);
  const [menuPermissions, setMenuPermissions] = useState({
    'student-card': true,
    'coach-card': true,
    'judge-card': true,
    'judge-cert': true,
    'school-cert': true,
    'school-results': true,
    'results': true
  });
  const [bannerBgUrl, setBannerBgUrl] = useState('');
  const [studentCardBgUrl, setStudentCardBgUrl] = useState('');
  const [coachCardBgUrl, setCoachCardBgUrl] = useState('');
  const [judgeCardBgUrl, setJudgeCardBgUrl] = useState('');
  const [certBgUrl, setCertBgUrl] = useState('');

  // ---------------- Core Domain Entities ----------------
  const [schools, setSchools] = useState(INITIAL_SCHOOLS);
  const [judges, setJudges] = useState(INITIAL_JUDGES);
  const [schedules, setSchedules] = useState(buildInitialSchedules);
  const [registrations, setRegistrations] = useState(INITIAL_REGISTRATIONS);
  const [scores, setScores] = useState(INITIAL_SCORES);
  const [scoreCriteriaDetails, setScoreCriteriaDetails] = useState(INITIAL_SCORE_CRITERIA);
  const [evalMeta, setEvalMeta] = useState(INITIAL_EVAL_META);

  // ---------------- UI Filters & Modals ----------------
  const [toast, setToast] = useState(null);
  const [closedMenuModal, setClosedMenuModal] = useState(null); // { menuId, menuLabel }
  const [customCriteriaByComp, setCustomCriteriaByComp] = useState(() => {
    const initialMap = {};
    COMPETITIONS.forEach((comp) => {
      initialMap[comp.id] =
        comp.id === 'comp-7'
          ? []
          : getCompetitionCriteria(comp.id, null).map((c) => ({
              key: c.key,
              label: c.label,
              max: c.max,
              maxLabel: c.maxLabel || `${c.max} คะแนน`
            }));
    });
    return initialMap;
  }); // { [compId]: Array<{ key, label, max, maxLabel }> }
  const [newCriterionLabel, setNewCriterionLabel] = useState('');
  const [newCriterionMax, setNewCriterionMax] = useState('10');
  const [editingCriterionIdx, setEditingCriterionIdx] = useState(null);
  const [loginTab, setLoginTab] = useState('school'); // 'admin' | 'school' | 'judge'
  const [schoolAuthMode, setSchoolAuthMode] = useState('login'); // 'login' | 'register'

  // Filter states for various menus
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('ทั้งหมด');
  const [selectedCompFilter, setSelectedCompFilter] = useState('all');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState('all');
  const [adminCompManageId, setAdminCompManageId] = useState(COMPETITIONS[0].id);
  const [adminCompManageLevel, setAdminCompManageLevel] = useState('ทั้งหมด');
  const [adminCompManageTab, setAdminCompManageTab] = useState('sheets'); // 'sheets' | 'criteria'
  const [cardPrintLayout, setCardPrintLayout] = useState('4-up'); // '4-up' | '1-up'
  const [certRecipientType, setCertRecipientType] = useState('student'); // 'student' | 'coach' | 'director'
  const [activeScoreModalKey, setActiveScoreModalKey] = useState(null); // `${compId}__${level}`
  const [expandedScheduleKey, setExpandedScheduleKey] = useState(null); // `${compId}__${level}`
  const [expandedAllResultsKeys, setExpandedAllResultsKeys] = useState({}); // { [`${compId}__${level}`]: boolean }
  const [editingScheduleKey, setEditingScheduleKey] = useState(null); // `${compId}__${level}`
  const [scheduleDrafts, setScheduleDrafts] = useState({}); // { [key]: { venue, dateLabel, timeRange, notes } }

  // ---------------- Form States ----------------
  // Login form
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');

  // School sign-up form
  const [newSchoolForm, setNewSchoolForm] = useState({
    schoolCode: '',
    password: '',
    name: '',
    director: '',
    phone: ''
  });

  // Registration form (สมัครแข่งขัน)
  const [regForm, setRegForm] = useState({
    editingId: null,
    competitionId: COMPETITIONS[0].id,
    level: COMPETITIONS[0].levels[0],
    studentNames: [''],
    studentPhotos: [''],
    coachNames: [''],
    coachPhotos: [''],
    qualifyingSong: '',
    finalSong: ''
  });

  // Admin: Add/Edit School modal/form
  const [adminSchoolForm, setAdminSchoolForm] = useState({
    id: null,
    schoolCode: '',
    password: '',
    name: '',
    director: '',
    phone: ''
  });

  // Admin: Add/Edit Judge form
  const [adminJudgeForm, setAdminJudgeForm] = useState({
    id: null,
    username: '',
    password: '',
    name: '',
    position: 'กรรมการตัดสิน',
    competitionId: COMPETITIONS[0].id,
    level: COMPETITIONS[0].levels[0],
    photoUrl: ''
  });

  // Judge scoring draft state: draftCriteriaScores[regId] = { [criterionKey]: number | '' }
  const [draftCriteriaScores, setDraftCriteriaScores] = useState({});
  // Track which team cards are currently in edit mode after being saved: unlockedScoreCards[regId] = boolean
  const [unlockedScoreCards, setUnlockedScoreCards] = useState({});

  const showToast = (message, type = 'success') => {
    setToast({ id: Date.now(), message, type });
    setTimeout(() => {
      setToast((prev) => (prev && Date.now() - prev.id >= 3400 ? null : prev));
    }, 3500);
  };

  // ---------------- Derived Data & Role Menu Permissions ----------------
  const currentSchool = useMemo(() => {
    if (authSession.role !== 'school') return null;
    return schools.find((s) => s.id === authSession.schoolId) || null;
  }, [authSession, schools]);

  const currentJudge = useMemo(() => {
    if (authSession.role !== 'judge') return null;
    return judges.find((j) => j.id === authSession.judgeId) || null;
  }, [authSession, judges]);

  const allMenuItems = useMemo(() => {
    const getStatusMeta = (id) => {
      if (id === 'register') {
        return {
          isOpen: registrationOpen,
          statusLabel: registrationOpen ? 'เปิด' : 'ปิด'
        };
      }
      if (Object.prototype.hasOwnProperty.call(menuPermissions, id)) {
        const open = Boolean(menuPermissions[id]);
        return {
          isOpen: open,
          statusLabel: open ? 'เปิด' : 'ปิด'
        };
      }
      return null;
    };

    const base = [
      { id: 'home', baseLabel: 'หน้าแรก', icon: Home, roles: ['guest', 'admin', 'school', 'judge'] },
      {
        id: 'register',
        baseLabel: 'ระบบสมัครแข่งขัน',
        icon: registrationOpen ? UserPlus : Lock,
        roles: ['guest', 'admin', 'school']
      },
      { id: 'competitions', baseLabel: 'รายการแข่งขัน', icon: ListChecks, roles: ['guest', 'admin', 'school', 'judge'] },
      { id: 'schedule', baseLabel: 'ตารางการแข่งขัน', icon: Calendar, roles: ['guest', 'admin', 'school', 'judge'] },
      { id: 'by-school', baseLabel: 'รายชื่อแยกตามโรงเรียน', icon: Users, roles: ['admin', 'school'] },
      { id: 'by-activity', baseLabel: 'รายชื่อแยกตามกิจกรรม', icon: Layers, roles: ['admin', 'school'] },
      { id: 'student-card', baseLabel: 'พิมพ์บัตรผู้เข้าแข่งขัน', icon: IdCard, roles: ['admin', 'school'] },
      { id: 'coach-card', baseLabel: 'พิมพ์บัตรครูผู้ฝึกสอน', icon: IdCard, roles: ['admin', 'school'] },
      { id: 'judge-card', baseLabel: 'พิมพ์บัตรกรรมการตัดสิน', icon: IdCard, roles: ['admin', 'judge'] },
      { id: 'judge-cert', baseLabel: 'เกียรติบัตรกรรมการ', icon: Award, roles: ['admin', 'judge'] },
      { id: 'school-cert', baseLabel: 'เกียรติบัตรนักเรียน/ครู/ผอ.โรงเรียน', icon: Award, roles: ['admin', 'school'] },
      { id: 'school-results', baseLabel: 'ผลคะแนนของโรงเรียน', icon: Trophy, roles: ['school'] },
      { id: 'results', baseLabel: 'ประกาศผลคะแนน', icon: Trophy, roles: ['guest', 'admin', 'judge'] },
      { id: 'admin-competition-manage', baseLabel: 'การจัดการแข่งขัน', icon: FileText, roles: ['admin'] },
      { id: 'admin-manage', baseLabel: 'จัดการระบบ (Admin)', icon: ShieldCheck, roles: ['admin'] },
      { id: 'judge-scoring', baseLabel: 'ลงคะแนนตัดสิน (กรรมการ)', icon: Gavel, roles: ['judge'] },
      { id: 'login', baseLabel: authSession.role === 'guest' ? 'เข้าสู่ระบบ' : 'เปลี่ยนบัญชี/เข้าสู่ระบบ', icon: LogIn, roles: ['guest', 'admin', 'school', 'judge'] }
    ];

    return base
      .filter((item) => item.roles.includes(authSession.role))
      .map((item) => {
        const statusMeta = getStatusMeta(item.id);
        return {
          ...item,
          statusMeta,
          label: statusMeta ? `${item.baseLabel} (${statusMeta.statusLabel})` : item.baseLabel
        };
      });
  }, [authSession.role, registrationOpen, menuPermissions]);

  const handleSelectMenu = (menuId) => {
    if (
      authSession.role !== 'admin' &&
      Object.prototype.hasOwnProperty.call(menuPermissions, menuId) &&
      !menuPermissions[menuId]
    ) {
      const targetMenu = allMenuItems.find((item) => item.id === menuId);
      setMobileMenuOpen(false);
      setClosedMenuModal({
        menuId,
        menuLabel: targetMenu ? targetMenu.baseLabel : 'เมนูที่เลือก'
      });
      return;
    }
    setActiveMenu(menuId);
    setMobileMenuOpen(false);
    if (menuId === 'judge-scoring' && currentJudge) {
      const criteriaList = getCompetitionCriteria(currentJudge.competitionId, customCriteriaByComp);
      const initialDraft = {};
      registrations
        .filter((r) => r.competitionId === currentJudge.competitionId && r.level === currentJudge.level)
        .forEach((r) => {
          const existingDetail = scoreCriteriaDetails[r.id]?.[currentJudge.id];
          const existingTotal = scores[r.id]?.[currentJudge.id];
          const rowDraft = {};
          criteriaList.forEach((crit, cIdx) => {
            if (existingDetail && existingDetail[crit.key] !== undefined) {
              rowDraft[crit.key] = existingDetail[crit.key];
            } else if (cIdx === 0 && existingTotal !== undefined && !existingDetail) {
              rowDraft[crit.key] = existingTotal;
            } else {
              rowDraft[crit.key] = '';
            }
          });
          initialDraft[r.id] = rowDraft;
        });
      setDraftCriteriaScores(initialDraft);
    }
  };

  // ---------------- Authentication Handlers ----------------
  const handleLoginSubmit = (e) => {
    e.preventDefault();
    const u = loginUser.trim();
    const p = loginPass.trim();

    if (loginTab === 'admin') {
      if (u === 'admin' && p === '1234') {
        setAuthSession({
          role: 'admin',
          userId: 'admin-01',
          displayName: 'พระบุญทัน ธมฺมธาตา (Admin)',
          schoolId: null,
          judgeId: null
        });
        setLoginUser('');
        setLoginPass('');
        setActiveMenu('admin-manage');
        showToast('เข้าสู่ระบบผู้ดูแลระบบสำเร็จ (พระบุญทัน ธมฺมธาตา)');
      } else {
        showToast('ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง (แนะนำ: admin / 1234)', 'error');
      }
      return;
    }

    if (loginTab === 'school') {
      const found = schools.find((s) => s.schoolCode === u && s.password === p);
      if (found) {
        setAuthSession({
          role: 'school',
          userId: found.id,
          displayName: found.name,
          schoolId: found.id,
          judgeId: null
        });
        setLoginUser('');
        setLoginPass('');
        setActiveMenu('by-school');
        showToast(`ยินดีต้อนรับ ${found.name}`);
      } else {
        showToast('รหัสสถานศึกษาหรือรหัสผ่านไม่ถูกต้อง', 'error');
      }
      return;
    }

    if (loginTab === 'judge') {
      const foundJudge = judges.find((j) => j.username === u && j.password === p);
      if (foundJudge) {
        setAuthSession({
          role: 'judge',
          userId: foundJudge.id,
          displayName: foundJudge.name,
          schoolId: null,
          judgeId: foundJudge.id
        });
        const criteriaList = getCompetitionCriteria(foundJudge.competitionId, customCriteriaByComp);
        const initialDraft = {};
        registrations
          .filter((r) => r.competitionId === foundJudge.competitionId && r.level === foundJudge.level)
          .forEach((r) => {
            const existingDetail = scoreCriteriaDetails[r.id]?.[foundJudge.id];
            const existingTotal = scores[r.id]?.[foundJudge.id];
            const rowDraft = {};
            criteriaList.forEach((crit, cIdx) => {
              if (existingDetail && existingDetail[crit.key] !== undefined) {
                rowDraft[crit.key] = existingDetail[crit.key];
              } else if (cIdx === 0 && existingTotal !== undefined && !existingDetail) {
                rowDraft[crit.key] = existingTotal;
              } else {
                rowDraft[crit.key] = '';
              }
            });
            initialDraft[r.id] = rowDraft;
          });
        setDraftCriteriaScores(initialDraft);
        setLoginUser('');
        setLoginPass('');
        setActiveMenu('judge-scoring');
        showToast(`เข้าสู่ระบบกรรมการตัดสิน: ${foundJudge.name}`);
      } else {
        showToast('Username หรือ Password ของกรรมการไม่ถูกต้อง', 'error');
      }
    }
  };

  const handleSchoolSignupSubmit = (e) => {
    e.preventDefault();
    const code = newSchoolForm.schoolCode.trim();
    const name = newSchoolForm.name.trim();
    const director = newSchoolForm.director.trim();
    const password = newSchoolForm.password.trim();

    if (!code || !name || !director || !password) {
      showToast('กรุณากรอกข้อมูลโรงเรียนให้ครบถ้วน', 'error');
      return;
    }
    if (schools.some((s) => s.schoolCode === code)) {
      showToast('รหัสสถานศึกษานี้มีในระบบแล้ว (จำกัดโรงเรียนละ ๑ User)', 'error');
      return;
    }

    const created = {
      id: `sch-${code}-${Date.now()}`,
      schoolCode: code,
      password,
      name,
      director,
      phone: newSchoolForm.phone.trim() || '-'
    };

    setSchools((prev) => [...prev, created]);
    setAuthSession({
      role: 'school',
      userId: created.id,
      displayName: created.name,
      schoolId: created.id,
      judgeId: null
    });
    setNewSchoolForm({ schoolCode: '', password: '', name: '', director: '', phone: '' });
    setActiveMenu('register');
    showToast(`สมัครสมาชิกโรงเรียน "${created.name}" สำเร็จ และเข้าสู่ระบบแล้ว`);
  };

  const handleLogout = () => {
    setAuthSession({
      role: 'guest',
      userId: null,
      displayName: 'ผู้เยี่ยมชมทั่วไป',
      schoolId: null,
      judgeId: null
    });
    setActiveMenu('home');
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  // ---------------- Registration Handlers (สมัคร / แก้ไข / ลบ) ----------------
  const prepareRegistrationForm = (compId = COMPETITIONS[0].id, lvl = null, existingReg = null) => {
    const comp = COMPETITIONS.find((c) => c.id === compId) || COMPETITIONS[0];
    const targetLevel = lvl && comp.levels.includes(lvl) ? lvl : comp.levels[0];

    if (existingReg) {
      const normalizedCoaches =
        existingReg.coaches.length > 0
          ? existingReg.coaches.map((c) => (typeof c === 'string' ? { name: c, photoUrl: '' } : { name: c.name || '', photoUrl: c.photoUrl || '' }))
          : [{ name: '', photoUrl: '' }];
      setRegForm({
        editingId: existingReg.id,
        competitionId: existingReg.competitionId,
        level: existingReg.level,
        studentNames: existingReg.students.map((s) => s.name),
        studentPhotos: existingReg.students.map((s) => s.photoUrl || ''),
        coachNames: normalizedCoaches.map((c) => c.name),
        coachPhotos: normalizedCoaches.map((c) => c.photoUrl),
        qualifyingSong: existingReg.qualifyingSong || '',
        finalSong: existingReg.finalSong || ''
      });
    } else {
      setRegForm({
        editingId: null,
        competitionId: comp.id,
        level: targetLevel,
        studentNames: Array.from({ length: comp.teamSize }, () => ''),
        studentPhotos: Array.from({ length: comp.teamSize }, () => ''),
        coachNames: [''],
        coachPhotos: [''],
        qualifyingSong: '',
        finalSong: ''
      });
    }
  };

  const handleRegCompChange = (newCompId) => {
    const comp = COMPETITIONS.find((c) => c.id === newCompId) || COMPETITIONS[0];
    setRegForm((prev) => ({
      ...prev,
      competitionId: comp.id,
      level: comp.levels[0],
      studentNames: Array.from({ length: comp.teamSize }, (_, idx) => prev.studentNames[idx] || ''),
      studentPhotos: Array.from({ length: comp.teamSize }, (_, idx) => prev.studentPhotos[idx] || ''),
      qualifyingSong: comp.requiresSongs ? prev.qualifyingSong : '',
      finalSong: comp.requiresSongs ? prev.finalSong : ''
    }));
  };

  const handleStudentPhotoUpload = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRegForm((prev) => {
        const nextPhotos = [...prev.studentPhotos];
        nextPhotos[idx] = String(reader.result || '');
        return { ...prev, studentPhotos: nextPhotos };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleCoachPhotoUpload = (idx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setRegForm((prev) => {
        const nextPhotos = [...prev.coachPhotos];
        nextPhotos[idx] = String(reader.result || '');
        return { ...prev, coachPhotos: nextPhotos };
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRegistrationSubmit = (e) => {
    e.preventDefault();
    if (!registrationOpen && authSession.role !== 'admin' && !regForm.editingId) {
      showToast('ขณะนี้ระบบปิดรับสมัครแข่งขันแล้ว สามารถแก้ไขข้อมูลรายการที่สมัครไว้ได้เท่านั้น', 'error');
      return;
    }

    const targetSchoolId =
      authSession.role === 'school'
        ? authSession.schoolId
        : authSession.role === 'admin' && selectedSchoolFilter !== 'all'
        ? selectedSchoolFilter
        : schools[0]?.id;

    if (!targetSchoolId) {
      showToast('กรุณาเข้าสู่ระบบโรงเรียนก่อนลงทะเบียนแข่งขัน', 'error');
      return;
    }

    const comp = COMPETITIONS.find((c) => c.id === regForm.competitionId);
    const cleanedStudents = regForm.studentNames
      .map((name, i) => ({
        name: name.trim(),
        photoUrl: regForm.studentPhotos[i] || ''
      }))
      .filter((s) => s.name.length > 0);

    const cleanedCoaches = regForm.coachNames
      .map((c, i) => ({
        name: c.trim(),
        photoUrl: regForm.coachPhotos[i] || ''
      }))
      .filter((c) => c.name.length > 0);

    if (comp?.requiresSongs && (!regForm.qualifyingSong.trim() || !regForm.finalSong.trim())) {
      showToast('รายการร้องเพลงไทยลูกทุ่งต้องระบุเพลงรอบคัดเลือกและรอบตัดสินให้ครบถ้วน', 'error');
      return;
    }

    if (regForm.editingId) {
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === regForm.editingId
            ? {
                ...r,
                competitionId: regForm.competitionId,
                level: regForm.level,
                students: cleanedStudents,
                coaches: cleanedCoaches.length > 0 ? cleanedCoaches : [{ name: 'ครูผู้ฝึกสอน', photoUrl: '' }],
                qualifyingSong: comp?.requiresSongs ? regForm.qualifyingSong.trim() : '',
                finalSong: comp?.requiresSongs ? regForm.finalSong.trim() : ''
              }
            : r
        )
      );
      showToast('แก้ไขข้อมูลการสมัครแข่งขันเรียบร้อยแล้ว');
    } else {
      const createdReg = {
        id: `reg-${Date.now()}`,
        schoolId: targetSchoolId,
        competitionId: regForm.competitionId,
        level: regForm.level,
        students: cleanedStudents,
        coaches: cleanedCoaches.length > 0 ? cleanedCoaches : [{ name: 'ครูผู้ฝึกสอน', photoUrl: '' }],
        qualifyingSong: comp?.requiresSongs ? regForm.qualifyingSong.trim() : '',
        finalSong: comp?.requiresSongs ? regForm.finalSong.trim() : ''
      };
      setRegistrations((prev) => [...prev, createdReg]);
      showToast('บันทึกการสมัครแข่งขันเรียบร้อยแล้ว');
    }

    prepareRegistrationForm(regForm.competitionId, regForm.level, null);
  };

  const handleDeleteRegistration = (regId) => {
    setRegistrations((prev) => prev.filter((r) => r.id !== regId));
    showToast('ลบรายการสมัครเรียบร้อยแล้ว');
  };

  /**
   * อัปโหลดรูปภาพนักเรียนแนบกับรายการสมัคร เพื่อใช้แสดงบนบัตรผู้เข้าแข่งขัน
   */
  const handleUploadStudentPhotoForReg = (regId, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setRegistrations((prev) =>
        prev.map((reg) => {
          if (reg.id !== regId) return reg;
          const updatedStudents = reg.students.map((st, idx) =>
            idx === 0 ? { ...st, photoUrl: dataUrl } : st
          );
          return { ...reg, students: updatedStudents };
        })
      );
      showToast('อัปโหลดรูปภาพนักเรียนเรียบร้อยแล้ว');
    };
    reader.readAsDataURL(file);
  };

  /**
   * อัปโหลดรูปภาพครูผู้ฝึกสอนแนบกับรายการสมัคร เพื่อใช้แสดงบนบัตรครูผู้ฝึกสอนโดยเฉพาะ
   */
  const handleUploadCoachPhotoForReg = (regId, coachIdx, file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      setRegistrations((prev) =>
        prev.map((reg) => {
          if (reg.id !== regId) return reg;
          const updatedCoaches = reg.coaches.map((c, idx) => {
            if (idx !== coachIdx) return c;
            return typeof c === 'string'
              ? { name: c, photoUrl: dataUrl }
              : { ...c, photoUrl: dataUrl };
          });
          return { ...reg, coaches: updatedCoaches };
        })
      );
      showToast('อัปโหลดรูปภาพครูผู้ฝึกสอนเรียบร้อยแล้ว');
    };
    reader.readAsDataURL(file);
  };

  // ---------------- PDF / Print Generators ----------------
  const handleDownloadStudentCardsPdf = (targetSchoolId, targetCompId = 'all', layoutMode = cardPrintLayout) => {
    const filteredRegs = registrations.filter((r) => {
      const matchSchool = targetSchoolId === 'all' ? authSession.role === 'admin' : r.schoolId === targetSchoolId;
      const matchComp = targetCompId === 'all' ? true : r.competitionId === targetCompId;
      return matchSchool && matchComp;
    });

    if (filteredRegs.length === 0) {
      showToast('ไม่พบข้อมูลบัตรผู้เข้าแข่งขันตามเงื่อนไขที่เลือก', 'error');
      return;
    }

    const cardsHtml = [];
    filteredRegs.forEach((reg) => {
      const school = schools.find((s) => s.id === reg.schoolId);
      const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
      const sched = schedules[`${reg.competitionId}__${reg.level}`] || {
        venue: 'กำหนดในวันงาน',
        timeRange: '08.30 น. เป็นต้นไป'
      };

      reg.students.forEach((st, idx) => {
        const bgStyle = studentCardBgUrl
          ? `background-image: url('${studentCardBgUrl}'); background-size: cover; background-position: center;`
          : `background: linear-gradient(160deg, #fffbeb 0%, #fef3c7 48%, #fff7ed 100%);`;

        cardsHtml.push(`
          <div class="card-item" style="width: 105mm; height: 148.5mm; ${bgStyle} border: none; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
            <div style="text-align: center; padding-bottom: 8px; background: rgba(255,255,255,0.6); border-radius: 8px; padding-top: 6px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #78350f;">บัตรประจำตัวผู้เข้าแข่งขัน</div>
              <div style="font-size: 10.5px; font-weight: 700; color: #b45309;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>
              <div style="font-size: 9.5px; color: #92400e;">${EVENT_DATE_TH}</div>
            </div>

            <div style="display: flex; justify-content: center; margin: 8px 0;">
              <div style="width: 30mm; height: 38mm; border-radius: 10px; background: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${
                  st.photoUrl
                    ? `<img src="${st.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
                    : `<span style="font-size: 10px; color: #94a3b8; text-align: center; padding: 4px;">รูปภาพนักเรียน<br/>(คนที่ ${idx + 1})</span>`
                }
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.6); border-radius: 10px; padding: 10px; font-size: 11px; line-height: 1.5;">
              <div><strong>ชื่อ-สกุล:</strong> ${st.name}</div>
              <div><strong>โรงเรียน:</strong> ${school ? school.name : '-'}</div>
              <div><strong>กิจกรรม:</strong> ${comp ? comp.name : '-'}</div>
              <div><strong>ระดับชั้น:</strong> ${reg.level}</div>
              <div><strong>สถานที่:</strong> ${sched.venue}</div>
              <div><strong>เวลา:</strong> ${sched.timeRange}</div>
            </div>

            <div style="text-align: center; font-size: 9.5px; font-weight: 600; color: #78350f; background: rgba(255,255,255,0.6); padding: 4px; border-radius: 6px;">
              กรุณาติดบัตรนี้ตลอดการแข่งขัน
            </div>
          </div>
        `);
      });
    });

    const isFourUp = layoutMode === '4-up';
    const sheetBody = buildCardSheetsHtml(cardsHtml, layoutMode);
    const res = openPrintableDocument(
      `บัตรประจำตัวผู้เข้าแข่งขัน (${isFourUp ? 'พิมพ์ 4 ต่อ 1 แนวตั้ง' : '148.5 x 105 มม.'})`,
      sheetBody,
      isFourUp ? 'A4 portrait' : '105mm 148.5mm portrait'
    );
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  /**
   * สร้างและพิมพ์/ดาวน์โหลด PDF บัตรประจำตัวครูผู้ฝึกสอน ขนาด 148.5 x 105 มม. (14.85 x 10.5 ซม.) แนวตั้ง
   * รองรับโหมดพิมพ์ 4 ต่อ 1 บนกระดาษ A4 แนวนอน และโหมด 1 ต่อ 1
   */
  const handleDownloadCoachCardsPdf = (targetSchoolId, targetCompId = 'all', layoutMode = cardPrintLayout) => {
    const filteredRegs = registrations.filter((r) => {
      const matchSchool = targetSchoolId === 'all' ? authSession.role === 'admin' : r.schoolId === targetSchoolId;
      const matchComp = targetCompId === 'all' ? true : r.competitionId === targetCompId;
      return matchSchool && matchComp;
    });

    if (filteredRegs.length === 0) {
      showToast('ไม่พบข้อมูลบัตรครูผู้ฝึกสอนตามเงื่อนไขที่เลือก', 'error');
      return;
    }

    const cardsHtml = [];
    filteredRegs.forEach((reg) => {
      const school = schools.find((s) => s.id === reg.schoolId);
      const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
      const sched = schedules[`${reg.competitionId}__${reg.level}`] || {
        venue: 'กำหนดในวันงาน',
        timeRange: '08.30 น. เป็นต้นไป'
      };
      const competitorSummary = reg.students.map((st) => st.name).join(', ') || '-';

      reg.coaches.forEach((coachItem, cIdx) => {
        const coachName = typeof coachItem === 'string' ? coachItem : coachItem.name;
        const coachPhoto = typeof coachItem === 'string' ? '' : coachItem.photoUrl || '';
        const bgStyle = coachCardBgUrl
          ? `background-image: url('${coachCardBgUrl}'); background-size: cover; background-position: center;`
          : `background: linear-gradient(160deg, #ecfdf5 0%, #d1fae5 48%, #f0fdfa 100%);`;

        cardsHtml.push(`
          <div class="card-item" style="width: 105mm; height: 148.5mm; ${bgStyle} border: none; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
            <div style="text-align: center; padding-bottom: 8px; background: rgba(255,255,255,0.6); border-radius: 8px; padding-top: 6px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #064e3b;">บัตรประจำตัวครูผู้ฝึกสอน</div>
              <div style="font-size: 10.5px; font-weight: 700; color: #047857;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>
              <div style="font-size: 9.5px; color: #059669;">${EVENT_DATE_TH}</div>
            </div>

            <div style="display: flex; justify-content: center; margin: 8px 0;">
              <div style="width: 30mm; height: 38mm; border-radius: 10px; background: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${
                  coachPhoto
                    ? `<img src="${coachPhoto}" style="width: 100%; height: 100%; object-fit: cover;" />`
                    : `<span style="font-size: 10px; color: #64748b; text-align: center; padding: 4px;">รูปภาพครูผู้ฝึกสอน<br/>(คนที่ ${cIdx + 1})</span>`
                }
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.6); border-radius: 10px; padding: 10px; font-size: 11px; line-height: 1.5;">
              <div><strong>ครูผู้ฝึกสอน:</strong> ${coachName}</div>
              <div><strong>โรงเรียน:</strong> ${school ? school.name : '-'}</div>
              <div><strong>ผู้แข่งขัน:</strong> ${competitorSummary}</div>
              <div><strong>กิจกรรม:</strong> ${comp ? comp.name : '-'}</div>
              <div><strong>ระดับชั้น:</strong> ${reg.level}</div>
              <div><strong>สถานที่:</strong> ${sched.venue}</div>
              <div><strong>เวลา:</strong> ${sched.timeRange}</div>
            </div>

            <div style="text-align: center; font-size: 9.5px; font-weight: 700; color: #065f46; background: rgba(255,255,255,0.6); padding: 4px; border-radius: 6px;">
              ครูผู้ฝึกสอน • ขนาด 14.85×10.5 ซม.
            </div>
          </div>
        `);
      });
    });

    const isFourUp = layoutMode === '4-up';
    const sheetBody = buildCardSheetsHtml(cardsHtml, layoutMode);
    const res = openPrintableDocument(
      `บัตรประจำตัวครูผู้ฝึกสอน (${isFourUp ? 'พิมพ์ 4 ต่อ 1 แนวตั้ง' : '148.5 x 105 มม.'})`,
      sheetBody,
      isFourUp ? 'A4 portrait' : '105mm 148.5mm portrait'
    );
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  const handleDownloadJudgeCardsPdf = (targetJudges, layoutMode = cardPrintLayout) => {
    if (!targetJudges || targetJudges.length === 0) {
      showToast('ไม่พบข้อมูลบัตรกรรมการตัดสิน', 'error');
      return;
    }

    const cardsHtml = targetJudges.map((jdg) => {
      const comp = COMPETITIONS.find((c) => c.id === jdg.competitionId);
      const sched = schedules[`${jdg.competitionId}__${jdg.level}`] || {
        venue: 'กำหนดในวันงาน',
        timeRange: '08.30 น. เป็นต้นไป'
      };
      const bgStyle = judgeCardBgUrl
        ? `background-image: url('${judgeCardBgUrl}'); background-size: cover; background-position: center;`
        : `background: linear-gradient(160deg, #eff6ff 0%, #dbeafe 50%, #f0fdf4 100%);`;

      return `
        <div class="card-item" style="width: 105mm; height: 148.5mm; ${bgStyle} border: none; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
          <div style="text-align: center; padding-bottom: 8px; background: rgba(255,255,255,0.6); border-radius: 8px; padding-top: 6px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0c4a6e;">บัตรประจำตัวกรรมการตัดสิน</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #0369a1;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>
            <div style="font-size: 9.5px; color: #0284c7;">${EVENT_DATE_TH}</div>
          </div>

          <div style="display: flex; justify-content: center; margin: 8px 0;">
            <div style="width: 30mm; height: 38mm; border-radius: 10px; background: rgba(255,255,255,0.6); display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${
                jdg.photoUrl
                  ? `<img src="${jdg.photoUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`
                  : `<span style="font-size: 10px; color: #64748b; text-align: center; padding: 4px;">รูปภาพกรรมการ</span>`
              }
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.6); border-radius: 10px; padding: 10px; font-size: 11px; line-height: 1.5;">
            <div><strong>ชื่อ-สกุล:</strong> ${jdg.name}</div>
            <div><strong>ตำแหน่ง:</strong> ${jdg.position}</div>
            <div><strong>กิจกรรมที่ตัดสิน:</strong> ${comp ? comp.name : '-'}</div>
            <div><strong>ระดับชั้น:</strong> ${jdg.level}</div>
            <div><strong>สถานที่:</strong> ${sched.venue}</div>
            <div><strong>เวลา:</strong> ${sched.timeRange}</div>
            <div style="margin-top: 4px; padding-top: 4px; color: #0c4a6e;">
              <strong>ชื่อผู้ใช้:</strong> ${jdg.username || '-'} | <strong>รหัสผ่าน:</strong> ${jdg.password || '-'}
            </div>
          </div>

          <div style="text-align: center; font-size: 9.5px; font-weight: 700; color: #0369a1; background: rgba(255,255,255,0.6); padding: 4px; border-radius: 6px;">
            คณะกรรมการตัดสินการแข่งขัน
          </div>
        </div>
      `;
    });

    const isFourUp = layoutMode === '4-up';
    const sheetBody = buildCardSheetsHtml(cardsHtml, layoutMode);
    const res = openPrintableDocument(
      `บัตรประจำตัวกรรมการตัดสิน (${isFourUp ? 'พิมพ์ 4 ต่อ 1 แนวตั้ง' : '148.5 x 105 มม.'})`,
      sheetBody,
      isFourUp ? 'A4 portrait' : '105mm 148.5mm portrait'
    );
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  const handleDownloadCertificateA4Landscape = (certsList, docTitle) => {
    if (!certsList || certsList.length === 0) {
      showToast('ไม่พบรายชื่อสำหรับออกเกียรติบัตร', 'error');
      return;
    }

    const pagesHtml = certsList.map((cert) => {
      const bgStyle = certBgUrl
        ? `background-image: url('${certBgUrl}'); background-size: cover; background-position: center;`
        : `background: linear-gradient(135deg, #fffdf7 0%, #fef9c3 35%, #fffbeb 70%, #fef3c7 100%);`;

      const line1Name = cert.line1Name || cert.recipientName || '';
      const line2Position = cert.line2Position || cert.roleLabel || '';
      const line3Activity =
        cert.line3Activity ||
        `เป็นกรรมการตัดสินกิจกรรมการ${cert.activityName || ''} ${cert.levelName || ''}`.trim();

      const fitLine3FontSize = (text, basePt = 13.5, minPt = 9.5) => {
        const len = String(text || '').trim().length;
        if (len <= 48) return basePt;
        const scaled = basePt - (len - 48) * 0.08;
        return Math.max(minPt, Number(scaled.toFixed(1)));
      };

      const line3FontPt = cert.fitSingleLine
        ? fitLine3FontSize(line3Activity, 13.5, 9.5)
        : 13.5;

      return `
        <div class="page-break" style="width: 297mm; height: 210mm; ${bgStyle} padding: 16mm; position: relative; display: flex; justify-content: center;">
          ${
            cert.certNumber
              ? `<div style="position: absolute; top: 4cm; right: 1cm; font-size: 10pt; font-weight: 600; color: #0f172a; text-align: right;">${cert.certNumber}</div>`
              : ''
          }
          <div style="position: absolute; top: 7.3cm; left: 0; right: 0; width: 100%; background: transparent; padding: 0 36px; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; gap: 10px;">
            <div style="font-size: 19pt; font-weight: 700; color: #0f172a; line-height: 1.4;">
              ${line1Name}
            </div>
            <div style="font-size: 14pt; font-weight: 700; color: #0f172a; line-height: 1.4;">
              ${line2Position}
            </div>
            <div style="${
              cert.fitSingleLine
                ? `font-size: ${line3FontPt}pt; white-space: nowrap; max-width: 100%;`
                : 'font-size: 13.5pt; max-width: 820px;'
            } font-weight: 600; color: #0f172a; line-height: 1.5;">
              ${line3Activity}
            </div>
          </div>
        </div>
      `;
    });

    const res = openPrintableDocument(docTitle, pagesHtml.join(''), 'A4 landscape');
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  const handleDownloadResultsPdf = (compId, level) => {
    const comp = COMPETITIONS.find((c) => c.id === compId);
    const metaKey = `${compId}__${level}`;
    const meta = evalMeta[metaKey] || { status: 'pending', approved: false };

    if (!meta.approved && authSession.role !== 'admin') {
      showToast('ผลคะแนนกิจกรรมนี้ยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ', 'error');
      return;
    }

    const rows = registrations
      .filter((r) => r.competitionId === compId && r.level === level)
      .map((r) => {
        const sch = schools.find((s) => s.id === r.schoolId);
        const calc = calculateNormalizedScore(scores[r.id]);
        const medal = getMedalTier(calc.average100, calc.judgeCount > 0);
        return {
          reg: r,
          schoolName: sch ? sch.name : '-',
          studentNames: r.students.map((s) => s.name).join(', '),
          score: calc.average100,
          medal,
          judgeScores: scores[r.id] || {}
        };
      })
      .sort((a, b) => b.score - a.score);

    const visiblePdfRows = rows.filter((item) => {
      const hasScore = Object.keys(item.judgeScores).length > 0;
      return authSession.role === 'admin' || hasScore;
    });

    const tableRowsHtml = visiblePdfRows
      .map((item, idx) => {
        const hasScore = Object.keys(item.judgeScores).length > 0;
        const rankLabel = !hasScore
          ? 'เข้าร่วมการแข่งขัน'
          : idx === 0
          ? 'รางวัลชนะเลิศ (อันดับ ๑)'
          : idx === 1
          ? 'รองชนะเลิศอันดับ ๑'
          : idx === 2
          ? 'รองชนะเลิศอันดับ ๒'
          : `ลำดับที่ ${idx + 1}`;
        const judgeBreakdown =
          authSession.role === 'admin'
            ? `<td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 12px;">${
                Object.entries(item.judgeScores)
                  .map(([jId, sc]) => {
                    const jObj = judges.find((j) => j.id === jId);
                    return `${jObj ? jObj.name : jId}: ${sc}`;
                  })
                  .join(' | ') || 'เข้าร่วมการแข่งขัน (ยังไม่มีคะแนน)'
              }</td>`
            : '';

        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700;">${rankLabel}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.studentNames}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.schoolName}</td>
            ${judgeBreakdown}
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700; color: #b45309;">${hasScore ? item.score.toFixed(2) : '-'}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700; color: ${item.medal.printColor};">${item.medal.label}</td>
          </tr>
        `;
      })
      .join('');

    const bodyHtml = `
      <div style="width: 210mm; min-height: 297mm; background: white; padding: 24px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="margin: 0; color: #78350f;">ประกาศผลการแข่งขัน</h2>
          <div style="font-size: 15px; font-weight: 700; margin-top: 4px;">${EVENT_TITLE_TH}</div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px;">
            กิจกรรม: <strong>${comp ? comp.name : ''}</strong> | ระดับ: <strong>${level}</strong>
          </div>
          <div style="font-size: 12px; color: #059669; margin-top: 4px;">
            สถานะ: ${meta.approved ? 'อนุมัติผลการแข่งขันอย่างเป็นทางการแล้ว' : 'ฉบับร่าง (รอผู้ดูแลระบบอนุมัติ)'}
          </div>
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #fef3c7; color: #78350f;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">ลำดับที่ / รางวัล</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">ผู้เข้าแข่งขัน</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">โรงเรียน</th>
              ${authSession.role === 'admin' ? '<th style="padding: 8px; border: 1px solid #cbd5e1;">คะแนนกรรมการรายท่าน (Admin)</th>' : ''}
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">คะแนนรวม (เต็ม ๑๐๐)</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">ระดับเหรียญรางวัล</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || '<tr><td colspan="6" style="padding: 16px; text-align: center;">ยังไม่มีข้อมูลผู้เข้าแข่งขันในระดับนี้</td></tr>'}
          </tbody>
        </table>
      </div>
    `;

    const res = openPrintableDocument(`ผลการแข่งขัน - ${comp?.name || ''} (${level})`, bodyHtml, 'A4 portrait');
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  /**
   * เปิดหน้าต่างพิมพ์ / ดาวน์โหลด PDF ตารางการแข่งขันและสถานที่แข่งขัน (แยกตามกิจกรรมและระดับชั้น)
   */
  const handlePrintSchedulePdf = (targetCompId = 'all', targetLevel = 'ทั้งหมด') => {
    const filteredComps = COMPETITIONS.filter((c) =>
      targetCompId === 'all' ? true : c.id === targetCompId
    );

    const sectionsHtml = filteredComps
      .map((comp) => {
        const levels =
          targetLevel === 'ทั้งหมด'
            ? comp.levels
            : comp.levels.filter((l) => l === targetLevel);

        if (levels.length === 0) return '';

        const rowsHtml = levels
          .map((lvl) => {
            const key = `${comp.id}__${lvl}`;
            const item = schedules[key] || {
              venue: 'กำหนดในวันงาน',
              dateLabel: EVENT_DATE_TH,
              timeRange: '08.30 น. เป็นต้นไป',
              notes: '-'
            };
            const levelRegs = registrations.filter(
              (r) => r.competitionId === comp.id && r.level === lvl
            );

            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 700;">${lvl}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.venue}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${item.dateLabel || EVENT_DATE_TH}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; white-space: nowrap;">${item.timeRange}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 12px;">${item.notes || '-'}</td>
              </tr>
            `;
          })
          .join('');

        return `
          <div style="margin-bottom: 18px;">
            <div style="background: #fef3c7; color: #78350f; font-weight: 700; padding: 8px 12px; border: 1px solid #fcd34d; border-bottom: none; border-radius: 8px 8px 0 0; font-size: 14px;">
              ${comp.name} (${comp.type})
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
              <thead>
                <tr style="background: #f8fafc; color: #334155;">
                  <th style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left;">ระดับชั้น</th>
                  <th style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left;">สถานที่แข่งขัน</th>
                  <th style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left;">วันที่แข่งขัน</th>
                  <th style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left;">เวลาแข่งขัน</th>
                  <th style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left;">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        `;
      })
      .join('');

    const bodyHtml = `
      <div style="width: 210mm; min-height: 297mm; background: white; padding: 24px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; border-bottom: 2px solid #059669; padding-bottom: 12px; margin-bottom: 18px;">
          <h2 style="margin: 0; color: #064e3b;">ตารางการแข่งขันและสถานที่แข่งขัน</h2>
          <div style="font-size: 15px; font-weight: 700; margin-top: 4px; color: #0f172a;">${EVENT_TITLE_TH}</div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px;">
            ${EVENT_DATE_TH} • สถานที่หลัก: ${EVENT_VENUE_TH}
          </div>
        </div>
        ${sectionsHtml || '<div style="text-align:center;padding:24px;color:#64748b;">ไม่พบข้อมูลตารางการแข่งขันตามตัวกรองที่เลือก</div>'}
      </div>
    `;

    const res = openPrintableDocument('ตารางการแข่งขันและสถานที่แข่งขัน', bodyHtml, 'A4 portrait');
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  /**
   * สร้างและเปิดหน้าต่างพิมพ์ / ดาวน์โหลด PDF ใบลงทะเบียนรายกิจกรรมและระดับชั้น
   */
  const handleDownloadRegistrationSheetPdf = (targetCompId, targetLevel = 'ทั้งหมด') => {
    const comp = COMPETITIONS.find((c) => c.id === targetCompId);
    if (!comp) return;

    const levelsToPrint =
      targetLevel === 'ทั้งหมด'
        ? comp.levels
        : comp.levels.filter((l) => l === targetLevel);

    const sectionsHtml = levelsToPrint
      .map((lvl) => {
        const levelRegs = registrations.filter(
          (r) => r.competitionId === comp.id && r.level === lvl
        );
        const sched = schedules[`${comp.id}__${lvl}`] || {
          venue: EVENT_VENUE_TH,
          timeRange: '08.30 น. เป็นต้นไป'
        };

        const rowsHtml = levelRegs
          .map((reg, idx) => {
            const sch = schools.find((s) => s.id === reg.schoolId);
            const studentLines =
              reg.students
                .map((st, sIdx) => `${reg.students.length > 1 ? `${sIdx + 1}. ` : ''}${st.name}`)
                .join('<br/>') || '-';
            const songNote = comp.requiresSongs
              ? `<div style="font-size:11px;color:#0369a1;margin-top:4px;">คัดเลือก: ${reg.qualifyingSong || '-'}<br/>ตัดสิน: ${reg.finalSong || '-'}</div>`
              : '';

            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 8px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
                <td style="padding: 8px; border: 1px solid #94a3b8;">${studentLines}${songNote}</td>
                <td style="padding: 8px; border: 1px solid #94a3b8; width: 48mm;"></td>
                <td style="padding: 8px; border: 1px solid #94a3b8; width: 20mm;"></td>
              </tr>
            `;
          })
          .join('');

        return `
          <div class="page-break" style="width: 210mm; min-height: 297mm; background: white; padding: 20px 24px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between;">
            <div>
              <div style="text-align: center; border-bottom: 2px solid #d97706; padding-bottom: 10px; margin-bottom: 14px;">
                <div style="font-size: 16px; font-weight: 700; color: #78350f;">ใบลงทะเบียนรายงานตัวผู้เข้าแข่งขัน</div>
                <div style="font-size: 14px; font-weight: 700; margin-top: 3px;">${EVENT_TITLE_TH}</div>
                <div style="font-size: 13px; color: #334155; margin-top: 4px;">
                  กิจกรรม: <strong>${comp.name}</strong> (${comp.type}) • ระดับ: <strong>${lvl}</strong>
                </div>
                <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                  ${EVENT_DATE_TH} • สถานที่: ${sched.venue} • เวลา: ${sched.timeRange}
                </div>
              </div>

              <table style="width: 100%; border-collapse: collapse; font-size: 12.5px;">
                <thead>
                  <tr style="background: #fef3c7; color: #78350f;">
                    <th style="padding: 8px; border: 1px solid #94a3b8; width: 12mm;">ที่</th>
                    <th style="padding: 8px; border: 1px solid #94a3b8;">โรงเรียน</th>
                    <th style="padding: 8px; border: 1px solid #94a3b8;">รายชื่อผู้เข้าแข่งขัน</th>
                    <th style="padding: 8px; border: 1px solid #94a3b8; width: 48mm;">ลงชื่อรายงานตัว</th>
                    <th style="padding: 8px; border: 1px solid #94a3b8; width: 20mm;">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody>
                  ${
                    rowsHtml ||
                    '<tr><td colspan="5" style="padding: 18px; border: 1px solid #94a3b8; text-align: center; color: #64748b;">ยังไม่มีผู้สมัครในระดับชั้นนี้</td></tr>'
                  }
                </tbody>
              </table>
            </div>

            <div style="margin-top: 24px; display: flex; justify-content: flex-end; font-size: 12.5px;">
              <div style="text-align: center; width: 75mm;">
                <div>ลงชื่อ...........................................................เจ้าหน้าที่รับรายงานตัว</div>
                <div style="margin-top: 6px;">(...........................................................)</div>
                <div style="margin-top: 4px;">ตำแหน่ง...........................................................</div>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    const res = openPrintableDocument(
      `ใบลงทะเบียนรายงานตัว - ${comp.name}`,
      sectionsHtml,
      'A4 portrait'
    );
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  /**
   * จัดสร้างและเปิดหน้าต่างพิมพ์ / ดาวน์โหลด PDF ใบลงคะแนนผลการแข่งขันรายกิจกรรมและระดับชั้น
   */
  const handleDownloadScoreSheetPdf = (targetCompId, targetLevel = 'ทั้งหมด') => {
    const comp = COMPETITIONS.find((c) => c.id === targetCompId);
    if (!comp) return;

    const customCompCriteria =
      Array.isArray(customCriteriaByComp[comp.id]) && customCriteriaByComp[comp.id].length > 0
        ? customCriteriaByComp[comp.id]
        : null;
    const criteriaList = getCompetitionCriteria(comp.id, customCriteriaByComp);
    const totalCriteriaMax = criteriaList.reduce((sum, item) => sum + (Number(item.max) || 0), 0) || 100;
    const isDharmaTalk = !customCompCriteria && comp.id === 'comp-1';
    const isStorytelling = !customCompCriteria && comp.id === 'comp-2';
    const dharmaCriteria = [
      { no: '๑)', label: 'การปรากฏตัวและมารยาทไทย', maxScore: '๑๐ คะแนน' },
      { no: '๒)', label: 'กล่าวทักทายที่ประชุม และอารัมภบท', maxScore: '๑๐ คะแนน' },
      {
        no: '๓)',
        label: 'เนื้อหาของการบรรยายมีความต่อเนื่อง มีเหตุผลและความเหมาะสมกลมกลืน',
        maxScore: '๓๐ คะแนน'
      },
      {
        no: '๔)',
        label: 'การใช้ภาษา ถ้อยคำสำเนียง และออกเสียงอักขระควบกล้ำชัดเจน',
        maxScore: '๒๐ คะแนน'
      },
      {
        no: '๕)',
        label: 'บุคลิกลักษณะ การใช้สายตา และลีลาท่าทาง',
        maxScore: '๑๐ คะแนน'
      },
      { no: '๖)', label: 'การกล่าวสรุปจบ', maxScore: '๑๐ คะแนน' },
      { no: '๗)', label: 'การรักษาเวลา', maxScore: '๑๐ คะแนน' }
    ];
    const storytellingCriteria = [
      { no: '๑)', label: 'มารยาทไทย กล่าวทักทายที่ประชุม และอารัมภบท', maxScore: '๑๐ คะแนน' },
      {
        no: '๒)',
        label: 'เนื้อหาสาระเน้นคุณธรรม จริยธรรม มีข้อคิด คติเตือนใจ',
        maxScore: '๓๐ คะแนน'
      },
      {
        no: '๓)',
        label: 'การใช้ภาษาถูกต้องตามอักขระและความต่อเนื่องในการเล่า',
        maxScore: '๒๐ คะแนน'
      },
      {
        no: '๔)',
        label: 'บุคลิกภาพ น้ำเสียง และลีลาท่าทาง',
        maxScore: '๒๐ คะแนน'
      },
      {
        no: '๖)',
        label: 'ความคิดริเริ่มสร้างสรรค์ การใช้สื่อ อุปกรณ์เหมาะสม',
        maxScore: '๑๕ คะแนน'
      },
      { no: '๗)', label: 'ใช้เวลาตามกำหนด', maxScore: '๕ คะแนน' }
    ];
    const isFolkSong = !customCompCriteria && (comp.id === 'comp-3' || comp.id === 'comp-4');
    const folkSongCriteria = [
      { no: '๑)', label: 'น้ำเสียง ความไพเราะของเสียง', maxScore: '30 คะแนน' },
      { no: '๒)', label: 'เทคนิคการขับร้อง', maxScore: '20 คะแนน' },
      { no: '3)', label: 'จังหวะ ทำนอง ถูกต้อง', maxScore: '25 คะแนน' },
      { no: '4)', label: 'อักขระวิธีถูกต้อง', maxScore: '15 คะแนน' },
      { no: '5)', label: 'บุคลิก ลีลา อารมณ์', maxScore: '10 คะแนน' }
    ];
    const isCeremonialOffering = !customCompCriteria && comp.id === 'comp-8';
    const ceremonialCriteria = [
      { no: '1)', label: 'มารยาทเรียบร้อยถูกต้องตามหลักศาสนพิธี', maxScore: 'จำนวน ๑๐ คะแนน' },
      { no: '2)', label: 'ความถูกต้องของอักขระ', maxScore: 'จำนวน ๒๐ คะแนน' },
      { no: '3)', label: 'ความถูกต้องของจังหวะ และวรรคตอน', maxScore: 'จำนวน ๑๕ คะแนน' },
      { no: '4)', label: 'ความถูกต้องของทำนอง (ธรรมวัตร)', maxScore: 'จำนวน ๑๕ คะแนน' },
      { no: '5)', label: 'ความไพเราะของน้ำเสียง', maxScore: 'จำนวน ๑๕ คะแนน' },
      { no: '6)', label: 'ลำดับขั้นตอนถูกต้อง', maxScore: 'จำนวน ๑๕ คะแนน' },
      { no: '7)', label: 'ความพร้อมเพรียงโดยรวม', maxScore: 'จำนวน ๑๐ คะแนน' }
    ];
    const isDharmaEssay = !customCompCriteria && comp.id === 'comp-6';
    const dharmaEssayCriteria = [
      { no: '1)', label: 'แต่งได้ครบตามกำหนด', maxScore: '๑๕ คะแนน' },
      {
        no: '2)',
        label: 'อ้างสุภาษิตที่เชื่อมได้ตามกฎ และบอกที่มาได้ถูกต้อง',
        maxScore: '๑๐ คะแนน'
      },
      { no: '3)', label: 'ใช้ตัวอักษรแบบกระทรวงศึกษาธิการ', maxScore: '๒๐ คะแนน' },
      { no: '4)', label: 'อธิบายความสมกับกระทู้ที่ตั้งไว้', maxScore: '๓๐ คะแนน' },
      {
        no: '5)',
        label: 'ใช้ตัวสะกดการันต์ถูกต้อง (เขียนผิดซํ้าให้นับเป็น ๑ คํา)',
        maxScore: '๑๕ คะแนน'
      },
      { no: '6)', label: 'สะอาดไม่เปรอะเปื้อน', maxScore: '๑๐ คะแนน' }
    ];
    const isLineDrawing = !customCompCriteria && comp.id === 'comp-5';
    const lineDrawingCriteria = [
      {
        no: '๑)',
        label: 'ลักษณะความสมบูรณ์ของเส้น ความถูกต้องของแสงเงา',
        maxScore: '30 คะแนน'
      },
      { no: '๒)', label: 'การจัดภาพ / องค์ประกอบ', maxScore: '20 คะแนน' },
      { no: '๓)', label: 'ความคิดสร้างสรรค์', maxScore: '20 คะแนน' },
      { no: '๔)', label: 'ความสมบูรณ์ ความประณีตของชิ้นงาน', maxScore: '20 คะแนน' },
      { no: '๕)', label: 'ความสอดคล้องกับหัวข้อที่กำหนด', maxScore: '10 คะแนน' }
    ];
    const isSaraphanyaChant = !customCompCriteria && comp.id === 'comp-9';
    const saraphanyaCriteria = [
      { no: '๑)', label: 'ความถูกต้องของอักขระ', maxScore: '๒๐ คะแนน' },
      { no: '๒)', label: 'ความถูกต้องของจังหวะ', maxScore: '๒๐ คะแนน' },
      { no: '๓)', label: 'ความถูกต้องของทำนอง', maxScore: '๒๐ คะแนน' },
      { no: '๔)', label: 'ความไพเราะของน้ำเสียง', maxScore: '๒๐ คะแนน' },
      { no: '๕)', label: 'มารยาทและท่าทาง', maxScore: '๑๐ คะแนน' },
      { no: '๖)', label: 'ความพร้อมเพียงโดยรวม', maxScore: '๑๐ คะแนน' }
    ];
    const isAltarGroup7 = !customCompCriteria && comp.id === 'comp-10';
    const altarCriteria = [
      { no: '๑)', label: 'ขั้นตอนกระบวนการการทำงาน', maxScore: '๑๐ คะแนน' },
      {
        no: '๒)',
        label: 'ความถูกต้องของโต๊ะหมู่ตามชนิดที่กำหนด และการจัดวางโต๊ะหมู่บูชา จะต้องประกอบไปด้วย พระพุทธรูปแจกัน พานพุ่ม ดอกไม้สด เชิงเทียน กระถางธูป',
        maxScore: '๒๐ คะแนน'
      },
      {
        no: '๓)',
        label: 'ความประณีต สวยงาม ของเครื่องประดับตกแต่งและการจัดดอกไม้สด',
        maxScore: '๓๐ คะแนน'
      },
      {
        no: '๔)',
        label: 'ความถูกต้องในการจัดโต๊ะหมู่บูชาตามแบบธรรมเนียมพิธีการ',
        maxScore: '๒๐ คะแนน'
      },
      { no: '๕)', label: 'ความคิดสร้างสรรค์', maxScore: '๑๐ คะแนน' },
      { no: '๖)', label: 'สำเร็จทันเวลา', maxScore: '๑๐ คะแนน' },
      { no: '๗)', label: 'ความสะอาดเรียบร้อย', maxScore: '๑๐ คะแนน' }
    ];
    const isDharmaQuiz = !customCompCriteria && comp.id === 'comp-7';
    const useWideLandscapeSheet =
      Boolean(customCompCriteria) ||
      isDharmaTalk ||
      isStorytelling ||
      isFolkSong ||
      isCeremonialOffering ||
      isDharmaEssay ||
      isLineDrawing ||
      isSaraphanyaChant ||
      isAltarGroup7;

    const levelsToPrint =
      targetLevel === 'ทั้งหมด'
        ? comp.levels
        : comp.levels.filter((l) => l === targetLevel);

    const buildLevelSheetHtml = (lvl, judgePerson = null, judgeOrdinal = 0, signAllJudges = false) => {
      const levelRegs = registrations.filter(
        (r) => r.competitionId === comp.id && r.level === lvl
      );
      const levelJudges = judges.filter(
        (j) => j.competitionId === comp.id && j.level === lvl
      );
      const sched = schedules[`${comp.id}__${lvl}`] || {
        venue: EVENT_VENUE_TH,
        timeRange: '08.30 น. เป็นต้นไป'
      };

      const rowsHtml = levelRegs
        .map((reg, idx) => {
          const sch = schools.find((s) => s.id === reg.schoolId);
          const studentLines =
            reg.students
              .map((st, sIdx) => `${reg.students.length > 1 ? `${sIdx + 1}. ` : ''}${st.name}`)
              .join('<br/>') || '-';
          const existingJudgeScore =
            judgePerson && scores[reg.id] && scores[reg.id][judgePerson.id] !== undefined
              ? scores[reg.id][judgePerson.id]
              : '';
          const formattedScoreText =
            existingJudgeScore !== '' ? Number(existingJudgeScore).toFixed(2) : '';

          if (customCompCriteria) {
            const criterionCells = criteriaList
              .map((crit) => {
                const colWidthMm = Math.max(12, Math.min(24, Math.floor(95 / criteriaList.length)));
                return `<td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: ${colWidthMm}mm;"></td>`;
              })
              .join('');

            return `
              <tr>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${studentLines}</td>
                ${criterionCells}
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700; width: 16mm;">
                  ${formattedScoreText}
                </td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 32mm;"></td>
              </tr>
            `;
          }

          if (isDharmaTalk) {
            return `
              <tr>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${studentLines}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700; width: 16mm;">
                  ${formattedScoreText}
                </td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 34mm;"></td>
              </tr>
            `;
          }

          if (isStorytelling) {
            return `
              <tr>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${studentLines}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700; width: 16mm;">
                  ${formattedScoreText}
                </td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 34mm;"></td>
              </tr>
            `;
          }

          if (isFolkSong) {
            return `
              <tr>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${studentLines}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 16mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 16mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700; width: 16mm;">
                  ${formattedScoreText}
                </td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 36mm;"></td>
              </tr>
            `;
          }

          if (isCeremonialOffering) {
            return `
              <tr>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${studentLines}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700; width: 16mm;">
                  ${formattedScoreText}
                </td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 34mm;"></td>
              </tr>
            `;
          }

          if (isDharmaEssay) {
            return `
              <tr>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${studentLines}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700; width: 16mm;">
                  ${formattedScoreText}
                </td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 34mm;"></td>
              </tr>
            `;
          }

          if (isLineDrawing) {
            return `
              <tr>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${studentLines}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 16mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700; width: 16mm;">
                  ${formattedScoreText}
                </td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 36mm;"></td>
              </tr>
            `;
          }

          if (isSaraphanyaChant) {
            return `
              <tr>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${studentLines}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 15mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700; width: 16mm;">
                  ${formattedScoreText}
                </td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 34mm;"></td>
              </tr>
            `;
          }

          if (isAltarGroup7) {
            return `
              <tr>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${studentLines}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 14mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 13mm;"></td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700; width: 16mm;">
                  ${formattedScoreText}
                </td>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: 34mm;"></td>
              </tr>
            `;
          }

          return `
            <tr>
              <td style="padding: 8px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
              <td style="padding: 8px; border: 1px solid #94a3b8;">${sch ? sch.name : '-'}</td>
              <td style="padding: 8px; border: 1px solid #94a3b8;">${studentLines}</td>
              <td style="padding: 8px; border: 1px solid #94a3b8; text-align: center; font-weight: 700; width: 24mm;">
                ${formattedScoreText}
              </td>
              <td style="padding: 8px; border: 1px solid #94a3b8; text-align: center; width: 42mm;"></td>
            </tr>
          `;
        })
        .join('');

      const signatureBlocks = signAllJudges
        ? levelJudges.length > 0
          ? levelJudges
              .map(
                (j) => `
                  <div style="text-align: center; width: 48%; margin-bottom: 12px;">
                    <div>ลงชื่อ...........................................................กรรมการผู้ให้คะแนน</div>
                    <div style="margin-top: 4px; font-weight: 700;">(${j.name})</div>
                    <div style="font-size: 11.5px; color: #334155;">${j.position || 'กรรมการตัดสิน'}</div>
                  </div>
                `
              )
              .join('')
          : `
            <div style="text-align: center; width: 48%; margin-bottom: 12px;">
              <div>ลงชื่อ...........................................................ประธานกรรมการตัดสิน</div>
              <div style="margin-top: 6px;">(...........................................................)</div>
            </div>
            <div style="text-align: center; width: 48%; margin-bottom: 12px;">
              <div>ลงชื่อ...........................................................กรรมการตัดสิน</div>
              <div style="margin-top: 6px;">(...........................................................)</div>
            </div>
            <div style="text-align: center; width: 48%; margin-bottom: 12px;">
              <div>ลงชื่อ...........................................................กรรมการตัดสิน</div>
              <div style="margin-top: 6px;">(...........................................................)</div>
            </div>
          `
        : judgePerson
        ? `
          <div style="text-align: center; width: 100%; max-width: 110mm; margin: 0 auto;">
            <div>ลงชื่อ...........................................................กรรมการผู้ให้คะแนน</div>
            <div style="margin-top: 4px; font-weight: 700;">(${judgePerson.name})</div>
            <div style="font-size: 11.5px; color: #334155;">${judgePerson.position || 'กรรมการตัดสิน'}</div>
          </div>
        `
        : levelJudges.length > 0
        ? levelJudges
            .map(
              (j) => `
                <div style="text-align: center; width: 48%; margin-bottom: 12px;">
                  <div>ลงชื่อ...........................................................กรรมการผู้ให้คะแนน</div>
                  <div style="margin-top: 4px; font-weight: 700;">(${j.name})</div>
                  <div style="font-size: 11.5px; color: #334155;">${j.position || 'กรรมการตัดสิน'}</div>
                </div>
              `
            )
            .join('')
        : `
          <div style="text-align: center; width: 100%; max-width: 110mm; margin: 0 auto;">
            <div>ลงชื่อ...........................................................กรรมการผู้ให้คะแนน</div>
            <div style="margin-top: 6px;">(...........................................................)</div>
            <div style="margin-top: 4px;">ตำแหน่ง...........................................................</div>
          </div>
        `;

      const criteriaBoxHtml = customCompCriteria
        ? `
          <div style="font-size: 11px; color: #1e293b; background: #f8fafc; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="font-weight: 700; margin-bottom: 4px;">
              เกณฑ์การตัดสิน (คะแนนเต็ม ${totalCriteriaMax} คะแนน) ดังนี้
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 16px;">
              ${criteriaList
                .map(
                  (c) =>
                    `<div>${c.label} <strong>(${c.maxLabel || `${c.max} คะแนน`})</strong></div>`
                )
                .join('')}
            </div>
          </div>
        `
        : isDharmaTalk
        ? `
          <div style="font-size: 11px; color: #1e293b; background: #f8fafc; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="font-weight: 700; margin-bottom: 4px;">
              เกณฑ์การตัดสิน (คะแนนเต็ม ๑๐๐ คะแนน) ดังนี้
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 16px;">
              ${dharmaCriteria
                .map(
                  (c) =>
                    `<div>${c.no} ${c.label} <strong>${c.maxScore}</strong></div>`
                )
                .join('')}
            </div>
          </div>
        `
        : isStorytelling
        ? `
          <div style="font-size: 11px; color: #1e293b; background: #f8fafc; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="font-weight: 700; margin-bottom: 4px;">
              เกณฑ์การตัดสิน (คะแนนเต็ม ๑๐๐ คะแนน) ดังนี้
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 16px;">
              ${storytellingCriteria
                .map(
                  (c) =>
                    `<div>${c.no} ${c.label} <strong>${c.maxScore}</strong></div>`
                )
                .join('')}
            </div>
          </div>
        `
        : isFolkSong
        ? `
          <div style="font-size: 11px; color: #1e293b; background: #f8fafc; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="font-weight: 700; margin-bottom: 4px;">
              เกณฑ์การตัดสิน (คะแนนเต็ม ๑๐๐ คะแนน) ดังนี้
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 16px;">
              ${folkSongCriteria
                .map(
                  (c) =>
                    `<div>${c.no} ${c.label} <strong>${c.maxScore}</strong></div>`
                )
                .join('')}
            </div>
          </div>
        `
        : isCeremonialOffering
        ? `
          <div style="font-size: 11px; color: #1e293b; background: #f8fafc; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="font-weight: 700; margin-bottom: 4px;">
              เกณฑ์การตัดสิน (คะแนนเต็ม ๑๐๐ คะแนน) ดังนี้
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 16px;">
              ${ceremonialCriteria
                .map(
                  (c) =>
                    `<div>${c.no} ${c.label} <strong>${c.maxScore}</strong></div>`
                )
                .join('')}
            </div>
          </div>
        `
        : isDharmaEssay
        ? `
          <div style="font-size: 11px; color: #1e293b; background: #f8fafc; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="font-weight: 700; margin-bottom: 4px;">
              เกณฑ์การตัดสิน (คะแนนเต็ม ๑๐๐ คะแนน) ดังนี้
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 16px;">
              ${dharmaEssayCriteria
                .map(
                  (c) =>
                    `<div>${c.no} ${c.label} <strong>${c.maxScore}</strong></div>`
                )
                .join('')}
            </div>
          </div>
        `
        : isLineDrawing
        ? `
          <div style="font-size: 11px; color: #1e293b; background: #f8fafc; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="font-weight: 700; margin-bottom: 4px;">
              เกณฑ์การตัดสิน (คะแนนเต็ม ๑๐๐ คะแนน) ดังนี้
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 16px;">
              ${lineDrawingCriteria
                .map(
                  (c) =>
                    `<div>${c.no} ${c.label} <strong>${c.maxScore}</strong></div>`
                )
                .join('')}
            </div>
          </div>
        `
        : isSaraphanyaChant
        ? `
          <div style="font-size: 11px; color: #1e293b; background: #f8fafc; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="font-weight: 700; margin-bottom: 4px;">
              เกณฑ์การตัดสิน (คะแนนเต็ม ๑๐๐ คะแนน) ดังนี้
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 16px;">
              ${saraphanyaCriteria
                .map(
                  (c) =>
                    `<div>${c.no} ${c.label} <strong>${c.maxScore}</strong></div>`
                )
                .join('')}
            </div>
          </div>
        `
        : isAltarGroup7
        ? `
          <div style="font-size: 10.5px; color: #1e293b; background: #f8fafc; border: 1px solid #94a3b8; border-radius: 6px; padding: 8px 12px; margin-bottom: 10px;">
            <div style="font-weight: 700; margin-bottom: 4px;">
              เกณฑ์การตัดสิน (คะแนนเต็ม ๑๐๐ คะแนน) ดังนี้
            </div>
            <div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 3px 16px;">
              ${altarCriteria
                .map(
                  (c) =>
                    `<div>${c.no} ${c.label} <strong>${c.maxScore}</strong></div>`
                )
                .join('')}
            </div>
          </div>
        `
        : '';

      const tableHeadHtml = customCompCriteria
        ? `
          <thead>
            <tr style="background: #d1fae5; color: #064e3b; font-size: 10.5px;">
              <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 10mm;">ที่</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">โรงเรียน</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">ผู้เข้าแข่งขัน</th>
              ${criteriaList
                .map(
                  (c) =>
                    `<th style="padding: 6px 3px; border: 1px solid #94a3b8;">${c.label}<br/>(${c.max})</th>`
                )
                .join('')}
              <th style="padding: 6px 4px; border: 1px solid #94a3b8;">รวม<br/>(${totalCriteriaMax})</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">หมายเหตุ</th>
            </tr>
          </thead>
        `
        : isDharmaTalk
        ? `
          <thead>
            <tr style="background: #d1fae5; color: #064e3b; font-size: 11px;">
              <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 10mm;">ที่</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">โรงเรียน</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">ผู้เข้าแข่งขัน</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๑) มารยาท<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๒) อารัมภบท<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๓) เนื้อหา<br/>(๓๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๔) ภาษา/ควบกล้ำ<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๕) บุคลิก/ท่าทาง<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๖) สรุปจบ<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๗) เวลา<br/>(๑๐)</th>
              <th style="padding: 6px 4px; border: 1px solid #94a3b8;">รวม<br/>(๑๐๐)</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">หมายเหตุ</th>
            </tr>
          </thead>
        `
        : isStorytelling
        ? `
          <thead>
            <tr style="background: #d1fae5; color: #064e3b; font-size: 11px;">
              <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 10mm;">ที่</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">โรงเรียน</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">ผู้เข้าแข่งขัน</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๑) มารยาท/ทักทาย<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๒) เนื้อหา/คุณธรรม<br/>(๓๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๓) ภาษา/ต่อเนื่อง<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๔) บุคลิก/น้ำเสียง<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๖) สร้างสรรค์/สื่อ<br/>(๑๕)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๗) เวลา<br/>(๕)</th>
              <th style="padding: 6px 4px; border: 1px solid #94a3b8;">รวม<br/>(๑๐๐)</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">หมายเหตุ</th>
            </tr>
          </thead>
        `
        : isFolkSong
        ? `
          <thead>
            <tr style="background: #d1fae5; color: #064e3b; font-size: 11px;">
              <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 10mm;">ที่</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">โรงเรียน</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">ผู้เข้าแข่งขัน</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๑) น้ำเสียง ความไพเราะของเสียง<br/>(30)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๒) เทคนิคการขับร้อง<br/>(20)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">3) จังหวะ ทำนอง ถูกต้อง<br/>(25)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">4) อักขระวิธีถูกต้อง<br/>(15)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">5) บุคลิก ลีลา อารมณ์<br/>(10)</th>
              <th style="padding: 6px 4px; border: 1px solid #94a3b8;">รวม<br/>(๑๐๐)</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">หมายเหตุ</th>
            </tr>
          </thead>
        `
        : isCeremonialOffering
        ? `
          <thead>
            <tr style="background: #d1fae5; color: #064e3b; font-size: 10.5px;">
              <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 10mm;">ที่</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">โรงเรียน</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">ผู้เข้าแข่งขัน</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">1) มารยาทศาสนพิธี<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">2) อักขระ<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">3) จังหวะ/วรรคตอน<br/>(๑๕)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">4) ทำนองธรรมวัตร<br/>(๑๕)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">5) ความไพเราะน้ำเสียง<br/>(๑๕)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">6) ลำดับขั้นตอน<br/>(๑๕)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">7) ความพร้อมเพรียง<br/>(๑๐)</th>
              <th style="padding: 6px 4px; border: 1px solid #94a3b8;">รวม<br/>(๑๐๐)</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">หมายเหตุ</th>
            </tr>
          </thead>
        `
        : isDharmaEssay
        ? `
          <thead>
            <tr style="background: #d1fae5; color: #064e3b; font-size: 10.5px;">
              <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 10mm;">ที่</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">โรงเรียน</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">ผู้เข้าแข่งขัน</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">1) แต่งครบกำหนด<br/>(๑๕)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">2) อ้างสุภาษิต/ที่มา<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">3) ตัวอักษร ศธ.<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">4) อธิบายสมกระทู้<br/>(๓๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">5) ตัวสะกดการันต์<br/>(๑๕)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">6) สะอาดไม่เปรอะเปื้อน<br/>(๑๐)</th>
              <th style="padding: 6px 4px; border: 1px solid #94a3b8;">รวม<br/>(๑๐๐)</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">หมายเหตุ</th>
            </tr>
          </thead>
        `
        : isLineDrawing
        ? `
          <thead>
            <tr style="background: #d1fae5; color: #064e3b; font-size: 11px;">
              <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 10mm;">ที่</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">โรงเรียน</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">ผู้เข้าแข่งขัน</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๑) เส้น/แสงเงา<br/>(30)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๒) จัดภาพ/องค์ประกอบ<br/>(20)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๓) ความคิดสร้างสรรค์<br/>(20)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๔) สมบูรณ์/ประณีต<br/>(20)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๕) สอดคล้องหัวข้อ<br/>(10)</th>
              <th style="padding: 6px 4px; border: 1px solid #94a3b8;">รวม<br/>(๑๐๐)</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">หมายเหตุ</th>
            </tr>
          </thead>
        `
        : isSaraphanyaChant
        ? `
          <thead>
            <tr style="background: #d1fae5; color: #064e3b; font-size: 11px;">
              <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 10mm;">ที่</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">โรงเรียน</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">ผู้เข้าแข่งขัน</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๑) อักขระ<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๒) จังหวะ<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๓) ทำนอง<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๔) น้ำเสียง<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๕) มารยาท/ท่าทาง<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๖) พร้อมเพียงรวม<br/>(๑๐)</th>
              <th style="padding: 6px 4px; border: 1px solid #94a3b8;">รวม<br/>(๑๐๐)</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">หมายเหตุ</th>
            </tr>
          </thead>
        `
        : isAltarGroup7
        ? `
          <thead>
            <tr style="background: #d1fae5; color: #064e3b; font-size: 10.5px;">
              <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 10mm;">ที่</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">โรงเรียน</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">ผู้เข้าแข่งขัน</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๑) กระบวนการ<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๒) ชนิด/เครื่องบูชา<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๓) ประณีต/ดอกไม้<br/>(๓๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๔) ธรรมเนียมพิธี<br/>(๒๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๕) สร้างสรรค์<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๖) ทันเวลา<br/>(๑๐)</th>
              <th style="padding: 6px 3px; border: 1px solid #94a3b8;">๗) สะอาดเรียบร้อย<br/>(๑๐)</th>
              <th style="padding: 6px 4px; border: 1px solid #94a3b8;">รวม<br/>(๑๐๐)</th>
              <th style="padding: 6px 6px; border: 1px solid #94a3b8;">หมายเหตุ</th>
            </tr>
          </thead>
        `
        : `
          <thead>
            <tr style="background: #d1fae5; color: #064e3b;">
              <th style="padding: 8px; border: 1px solid #94a3b8; width: 12mm;">ที่</th>
              <th style="padding: 8px; border: 1px solid #94a3b8;">โรงเรียน</th>
              <th style="padding: 8px; border: 1px solid #94a3b8;">รายชื่อผู้เข้าแข่งขัน</th>
              <th style="padding: 8px; border: 1px solid #94a3b8; width: 24mm; text-align: center;">คะแนนรวม<br/>(เต็ม ๑๐๐)</th>
              <th style="padding: 8px; border: 1px solid #94a3b8; width: 42mm; text-align: center;">หมายเหตุ</th>
            </tr>
          </thead>
        `;

      const judgeBadgeLine = isDharmaQuiz
        ? `<div style="font-size: 12px; font-weight: 700; color: #047857; margin-top: 3px;">ใบลงคะแนนผลการแข่งขัน • ลงนามรับรองโดยคณะกรรมการตัดสินทั้งหมด</div>`
        : judgePerson
        ? `<div style="font-size: 12px; font-weight: 700; color: #047857; margin-top: 3px;">ใบลงคะแนนรายบุคคล • กรรมการ: ${judgePerson.name} (${judgePerson.position || 'กรรมการตัดสิน'})</div>`
        : `<div style="font-size: 12px; font-weight: 700; color: #047857; margin-top: 3px;">ใบลงคะแนนรายบุคคล</div>`;

      return `
        <div class="page-break" style="width: ${useWideLandscapeSheet ? '297mm' : '210mm'}; min-height: ${useWideLandscapeSheet ? '210mm' : '297mm'}; background: white; padding: ${useWideLandscapeSheet ? '16px 22px' : '20px 24px'}; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="text-align: center; border-bottom: 2px solid #059669; padding-bottom: 8px; margin-bottom: 10px;">
              <div style="font-size: 16px; font-weight: 700; color: #064e3b;">${
                isDharmaQuiz
                  ? 'แบบบันทึกคะแนนการแข่งขัน (ใบลงคะแนน)'
                  : 'แบบบันทึกคะแนนการตัดสินการแข่งขันรายบุคคล (ใบลงคะแนน)'
              }</div>
              <div style="font-size: 13.5px; font-weight: 700; margin-top: 2px;">${EVENT_TITLE_TH}</div>
              <div style="font-size: 12.5px; color: #334155; margin-top: 3px;">
                กิจกรรม: <strong>${comp.name}</strong> (${comp.type}) • ระดับ: <strong>${lvl}</strong>
              </div>
              <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">
                ${EVENT_DATE_TH} • สถานที่: ${sched.venue} • เวลา: ${sched.timeRange}
              </div>
              ${judgeBadgeLine}
            </div>

            ${criteriaBoxHtml}

            <table style="width: 100%; border-collapse: collapse; font-size: ${useWideLandscapeSheet ? '11.5px' : '12.5px'};">
              ${tableHeadHtml}
              <tbody>
                ${
                  rowsHtml ||
                  `<tr><td colspan="${customCompCriteria ? criteriaList.length + 5 : isDharmaTalk || isCeremonialOffering ? '12' : isStorytelling || isFolkSong || isLineDrawing ? '10' : isDharmaEssay || isSaraphanyaChant ? '11' : '5'}" style="padding: 18px; border: 1px solid #94a3b8; text-align: center; color: #64748b;">ยังไม่มีผู้สมัครในระดับชั้นนี้</td></tr>`
                }
              </tbody>
            </table>
          </div>

          <div style="margin-top: 16px; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
            <div style="display: flex; flex-wrap: wrap; justify-content: center; font-size: 12px;">
              ${signatureBlocks}
            </div>
          </div>
        </div>
      `;
    };

    const sectionsHtml = levelsToPrint
      .map((lvl) => {
        if (isDharmaQuiz) {
          return buildLevelSheetHtml(lvl, null, 1, true);
        }
        const levelJudges = judges.filter(
          (j) => j.competitionId === comp.id && j.level === lvl
        );
        if (levelJudges.length > 0) {
          return levelJudges
            .map((jdg, jIdx) => buildLevelSheetHtml(lvl, jdg, jIdx + 1, false))
            .join('');
        }
        return buildLevelSheetHtml(lvl, null, 1, false);
      })
      .join('');

    const res = openPrintableDocument(
      `${isDharmaQuiz ? 'ใบลงคะแนน (๑ ชุด)' : 'ใบลงคะแนนรายบุคคล'} - ${comp.name}`,
      sectionsHtml,
      useWideLandscapeSheet ? 'A4 landscape' : 'A4 portrait'
    );
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  // ---------------- Countdown Timer (วันพุธที่ 17 กุมภาพันธ์ พ.ศ. 2570 / 2027) ----------------
  const [countdown, setCountdown] = useState({ days: 0, isPast: false });

  React.useEffect(() => {
    const targetDate = new Date('2027-02-17T08:30:00+07:00').getTime();
    const updateCountdown = () => {
      const now = Date.now();
      const diff = targetDate - now;
      if (diff <= 0) {
        setCountdown({ days: 0, isPast: true });
      } else {
        setCountdown({
          days: Math.floor(diff / (1000 * 60 * 60 * 24)),
          isPast: false
        });
      }
    };
    updateCountdown();
    const timer = setInterval(updateCountdown, 60000);
    return () => clearInterval(timer);
  }, []);

  const renderHomePage = () => {
    const totalTeams = registrations.length;
    const totalStudents = registrations.reduce((sum, r) => sum + r.students.length, 0);
    const approvedCount = Object.values(evalMeta).filter((m) => m.approved).length;

    return (
      <div className="space-y-6">
        {/* Hero Banner */}
        <div
          style={
            bannerBgUrl
              ? {
                  backgroundImage: `linear-gradient(to right, rgba(6, 78, 59, 0.86), rgba(15, 118, 110, 0.72)), url('${bannerBgUrl}')`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }
              : undefined
          }
          className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 sm:p-8 text-white shadow-xl"
        >
          <div className="relative z-10 max-w-3xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-3.5 py-1 text-xs sm:text-sm font-semibold">
              <Sparkles className="w-4 h-4 text-amber-100" />
              <span>{EVENT_DATE_TH}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold leading-tight">
              {EVENT_TITLE_TH}
            </h1>
            <p className="text-amber-50 text-sm sm:text-base leading-relaxed">
              สถานที่จัดการแข่งขัน: <strong>{EVENT_VENUE_TH}</strong> • ดำเนินการโดยคณะสงฆ์อำเภอศีขรภูมิ จังหวัดสุรินทร์ ภาค 11
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <button
                onClick={() => handleSelectMenu('register')}
                className="inline-flex items-center gap-2 rounded-xl bg-white text-orange-600 hover:bg-amber-50 px-5 py-2.5 text-sm font-bold shadow-md transition cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>ระบบสมัครแข่งขัน</span>
              </button>
              <button
                onClick={() => handleSelectMenu('competitions')}
                className="inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 backdrop-blur-sm text-white border border-white/30 px-5 py-2.5 text-sm font-semibold transition cursor-pointer"
              >
                <ListChecks className="w-4 h-4" />
                <span>ดูรายการแข่งขัน (10 รายการ)</span>
              </button>
              <button
                onClick={() => handleSelectMenu('results')}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900/30 hover:bg-slate-900/45 text-white px-5 py-2.5 text-sm font-semibold transition cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-amber-200" />
                <span>ประกาศผลคะแนน</span>
              </button>
            </div>
          </div>
          <div className="hidden lg:block absolute -right-10 -bottom-10 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">รายการแข่งขันทั้งหมด</span>
              <span className="p-2 rounded-xl bg-amber-100 text-amber-700">
                <ListChecks className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-slate-800">10 รายการ</div>
            <div className="mt-1 text-xs text-slate-500">ครอบคลุมเดี่ยวและทีม</div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">สถานศึกษาที่เข้าร่วม</span>
              <span className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                <School className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-slate-800">{schools.length} โรงเรียน</div>
            <div className="mt-1 text-xs text-slate-500">ลงทะเบียนแล้ว {totalTeams} ทีม/ชุด</div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">ผู้เข้าแข่งขันรวม</span>
              <span className="p-2 rounded-xl bg-sky-100 text-sky-700">
                <Users className="w-4 h-4" />
              </span>
            </div>
            <div className="mt-3 text-2xl sm:text-3xl font-bold text-slate-800">{totalStudents} คน</div>
            <div className="mt-1 text-xs text-slate-500">กรรมการตัดสิน {judges.length} ท่าน</div>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">สถานะรับสมัคร</span>
              <span
                className={`p-2 rounded-xl ${
                  registrationOpen ? 'bg-teal-100 text-teal-700' : 'bg-rose-100 text-rose-700'
                }`}
              >
                {registrationOpen ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
              </span>
            </div>
            <div className="mt-3 text-xl sm:text-2xl font-bold text-slate-800">
            {registrationOpen ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
          </div>
          <div className="mt-1 text-xs text-slate-500">อนุมัติผลแล้ว {approvedCount} ชุด</div>
        </div>
      </div>

      {/* Quick Navigation Grid */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <span>ทางลัดเข้าใช้งานระบบ</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {allMenuItems
              .filter((m) => m.id !== 'home')
              .map((m) => {
                const IconComp = m.icon;
                return (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMenu(m.id)}
                    className="flex items-center justify-between gap-2 p-4 rounded-2xl border border-slate-200/80 hover:border-amber-400 hover:bg-amber-50/50 transition text-left group cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-orange-600 group-hover:from-amber-500 group-hover:to-orange-500 group-hover:text-white transition shrink-0">
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="font-semibold text-slate-700 group-hover:text-slate-900 text-sm truncate">
                        {m.baseLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {m.statusMeta && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                            m.statusMeta.isOpen
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              m.statusMeta.isOpen ? 'bg-emerald-500' : 'bg-rose-500'
                            }`}
                          />
                          <span>{m.statusMeta.statusLabel}</span>
                        </span>
                      )}
                      <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-orange-500 transition" />
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>
    );
  };

  const renderRegisterPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isSchool = authSession.role === 'school';

    if (!isAdmin && !isSchool) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-amber-500 mx-auto" />
          <div className="font-bold text-slate-800">
            กรุณาเข้าสู่ระบบโรงเรียนหรือผู้ดูแลระบบเพื่อลงทะเบียนแข่งขัน
          </div>
          <button
            type="button"
            onClick={() => {
              setLoginTab('school');
              handleSelectMenu('login');
            }}
            className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบโรงเรียน
          </button>
        </div>
      );
    }

    const activeComp =
      COMPETITIONS.find((c) => c.id === regForm.competitionId) || COMPETITIONS[0];

    const targetSchoolId = isSchool
      ? authSession.schoolId
      : selectedSchoolFilter !== 'all'
      ? selectedSchoolFilter
      : schools[0]?.id;

    const schoolRegs = registrations.filter((r) =>
      isSchool ? r.schoolId === authSession.schoolId : targetSchoolId ? r.schoolId === targetSchoolId : true
    );

    const handleStudentNameChange = (idx, val) => {
      setRegForm((prev) => {
        const nextNames = [...prev.studentNames];
        nextNames[idx] = val;
        return { ...prev, studentNames: nextNames };
      });
    };

    const handleAddStudentSlot = () => {
      setRegForm((prev) => ({
        ...prev,
        studentNames: [...prev.studentNames, ''],
        studentPhotos: [...prev.studentPhotos, '']
      }));
    };

    const handleRemoveStudentSlot = (idx) => {
      setRegForm((prev) => {
        if (prev.studentNames.length <= 1) return prev;
        return {
          ...prev,
          studentNames: prev.studentNames.filter((_, i) => i !== idx),
          studentPhotos: prev.studentPhotos.filter((_, i) => i !== idx)
        };
      });
    };

    const handleCoachNameChange = (idx, val) => {
      setRegForm((prev) => {
        const nextCoaches = [...prev.coachNames];
        nextCoaches[idx] = val;
        return { ...prev, coachNames: nextCoaches };
      });
    };

    const handleAddCoachSlot = () => {
      setRegForm((prev) => {
        if (prev.coachNames.length >= 3) {
          showToast('สามารถเพิ่มรายชื่อครูผู้ฝึกสอนได้สูงสุด 3 ท่านต่อกิจกรรม', 'error');
          return prev;
        }
        return {
          ...prev,
          coachNames: [...prev.coachNames, ''],
          coachPhotos: [...prev.coachPhotos, '']
        };
      });
    };

    const handleRemoveCoachSlot = (idx) => {
      setRegForm((prev) => {
        if (prev.coachNames.length <= 1) return prev;
        return {
          ...prev,
          coachNames: prev.coachNames.filter((_, i) => i !== idx),
          coachPhotos: prev.coachPhotos.filter((_, i) => i !== idx)
        };
      });
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <UserPlus className="w-6 h-6 text-orange-500" />
              <span>ระบบสมัครแข่งขัน</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              เลือกกิจกรรม ระดับชั้น รายชื่อผู้เข้าแข่งขัน ครูผู้ฝึกสอน และอัปโหลดรูปภาพประกอบ
            </p>
          </div>

          <span
            className={`self-start sm:self-center inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold ${
              registrationOpen
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-rose-100 text-rose-800'
            }`}
          >
            {registrationOpen ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
            <span>{registrationOpen ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร (แก้ไขได้เฉพาะรายการเดิม)'}</span>
          </span>
        </div>

        <form
          onSubmit={handleRegistrationSubmit}
          className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-5"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-base font-bold text-slate-800">
              {regForm.editingId ? 'แก้ไขใบสมัครแข่งขัน' : 'กรอกข้อมูลใบสมัครแข่งขันใหม่'}
            </h3>
            {regForm.editingId && (
              <button
                type="button"
                onClick={() => prepareRegistrationForm(regForm.competitionId, regForm.level, null)}
                className="text-xs font-bold text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                ยกเลิกการแก้ไข
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {isAdmin && (
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">โรงเรียนที่สมัคร</label>
                <select
                  value={targetSchoolId || ''}
                  onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-amber-500"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.schoolCode}] {s.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">รายการแข่งขัน *</label>
              <select
                value={regForm.competitionId}
                onChange={(e) => handleRegCompChange(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-amber-500"
              >
                {COMPETITIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">ระดับชั้น *</label>
              <select
                value={regForm.level}
                onChange={(e) => setRegForm((p) => ({ ...p, level: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-amber-500"
              >
                {activeComp.levels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Students Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                รายชื่อผู้เข้าแข่งขัน (แนะนำ {activeComp.type}) *
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regForm.studentNames.map((stName, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required={idx === 0}
                      value={stName}
                      onChange={(e) => handleStudentNameChange(idx, e.target.value)}
                      placeholder={`ชื่อ-นามสกุล ผู้เข้าแข่งขันคนที่ ${idx + 1}`}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
                    />
                    {regForm.studentNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStudentSlot(idx)}
                        className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        aria-label="ลบผู้เข้าแข่งขัน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <label className="inline-flex items-center gap-1.5 text-slate-600 hover:text-amber-700 font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{regForm.studentPhotos[idx] ? 'เปลี่ยนรูปถ่ายนักเรียน' : 'อัปโหลดรูปถ่ายนักเรียน'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleStudentPhotoUpload(idx, e.target.files?.[0])}
                      />
                    </label>
                    {regForm.studentPhotos[idx] && (
                      <span className="text-emerald-700 font-semibold">มีรูปภาพแล้ว</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Coaches Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                รายชื่อครูผู้ฝึกสอน (สูงสุด 3 ท่านต่อกิจกรรม • {regForm.coachNames.length}/3) *
              </label>
              <button
                type="button"
                onClick={handleAddCoachSlot}
                disabled={regForm.coachNames.length >= 3}
                className={`inline-flex items-center gap-1 text-xs font-bold ${
                  regForm.coachNames.length >= 3
                    ? 'text-slate-400 cursor-not-allowed'
                    : 'text-emerald-700 hover:text-emerald-800 cursor-pointer'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>
                  {regForm.coachNames.length >= 3 ? 'ครบ 3 ท่านแล้ว' : 'เพิ่มครูผู้ฝึกสอน'}
                </span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {regForm.coachNames.map((cName, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col gap-2"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required={idx === 0}
                      value={cName}
                      onChange={(e) => handleCoachNameChange(idx, e.target.value)}
                      placeholder={`ชื่อ-นามสกุล ครูผู้ฝึกสอนคนที่ ${idx + 1}`}
                      className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                    {regForm.coachNames.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveCoachSlot(idx)}
                        className="p-2 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        aria-label="ลบครูผู้ฝึกสอน"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 text-xs">
                    <label className="inline-flex items-center gap-1.5 text-slate-600 hover:text-emerald-700 font-semibold cursor-pointer">
                      <Upload className="w-3.5 h-3.5" />
                      <span>{regForm.coachPhotos[idx] ? 'เปลี่ยนรูปถ่ายครูผู้ฝึกสอน' : 'อัปโหลดรูปถ่ายครูผู้ฝึกสอน'}</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => handleCoachPhotoUpload(idx, e.target.files?.[0])}
                      />
                    </label>
                    {regForm.coachPhotos[idx] && (
                      <span className="text-emerald-700 font-semibold">มีรูปภาพแล้ว</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Song Fields for Folk Song Competitions */}
          {activeComp.requiresSongs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-sky-50/70 border border-sky-200 p-4">
              <div>
                <label className="block text-xs font-bold text-sky-900 mb-1 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  <span>เพลงรอบคัดเลือก *</span>
                </label>
                <input
                  type="text"
                  required
                  value={regForm.qualifyingSong}
                  onChange={(e) => setRegForm((p) => ({ ...p, qualifyingSong: e.target.value }))}
                  placeholder="ระบุชื่อเพลงรอบคัดเลือก"
                  className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-sky-900 mb-1 flex items-center gap-1.5">
                  <Music className="w-3.5 h-3.5" />
                  <span>เพลงรอบตัดสิน *</span>
                </label>
                <input
                  type="text"
                  required
                  value={regForm.finalSong}
                  onChange={(e) => setRegForm((p) => ({ ...p, finalSong: e.target.value }))}
                  placeholder="ระบุชื่อเพลงรอบตัดสิน"
                  className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
          >
            {regForm.editingId ? 'บันทึกการแก้ไขใบสมัคร' : 'ยืนยันการสมัครแข่งขัน'}
          </button>
        </form>

        {/* Registered List */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-base font-bold text-slate-800">
            รายการที่ลงทะเบียนแล้ว ({schoolRegs.length} รายการ)
          </h3>

          {schoolRegs.length === 0 ? (
            <div className="text-center py-6 text-sm text-slate-400">
              ยังไม่มีรายการสมัครแข่งขันในระบบ
            </div>
          ) : (
            <div className="space-y-3">
              {schoolRegs.map((reg) => {
                const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
                const sch = schools.find((s) => s.id === reg.schoolId);
                return (
                  <div
                    key={reg.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 text-xs sm:text-sm">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-orange-700">{comp?.name}</span>
                        <span className="text-xs font-semibold bg-white border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-700">
                          {reg.level}
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="text-xs text-slate-500">
                          <strong>โรงเรียน:</strong> {sch?.name || '-'}
                        </div>
                      )}
                      <div className="text-slate-700">
                        <strong>ผู้เข้าแข่งขัน:</strong> {reg.students.map((s) => s.name).join(', ') || '-'}
                      </div>
                      <div className="text-slate-600">
                        <strong>ครูผู้ฝึกสอน:</strong>{' '}
                        {reg.coaches.map((c) => (typeof c === 'string' ? c : c.name)).join(', ') || '-'}
                      </div>
                      {comp?.requiresSongs && (
                        <div className="text-xs text-sky-700">
                          <strong>เพลง:</strong> คัดเลือก "{reg.qualifyingSong}" / ตัดสิน "{reg.finalSong}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => prepareRegistrationForm(reg.competitionId, reg.level, reg)}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 px-3 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteRegistration(reg.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>ลบ</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCompetitionsPage = () => {
    const levelFilters = ['ทั้งหมด', ...LEVELS_STANDARD, ...LEVELS_UNLIMITED];

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <ListChecks className="w-6 h-6 text-amber-500" />
              <span>รายการแข่งขันทั้ง 10 รายการ</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              รายละเอียดประเภทการแข่งขัน จำนวนผู้เข้าแข่งขัน และระดับชั้นที่เปิดรับสมัคร
            </p>
          </div>

          <select
            value={selectedLevelFilter}
            onChange={(e) => setSelectedLevelFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none"
          >
            {levelFilters.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl === 'ทั้งหมด' ? 'ทุกระดับชั้น' : lvl}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {COMPETITIONS.map((comp, idx) => {
            const visibleLevels =
              selectedLevelFilter === 'ทั้งหมด'
                ? comp.levels
                : comp.levels.filter((l) => l === selectedLevelFilter);

            if (visibleLevels.length === 0) return null;

            const compRegCount = registrations.filter((r) => r.competitionId === comp.id).length;

            return (
              <div
                key={comp.id}
                className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden flex flex-col justify-between"
              >
                <div>
                  <div className={`px-5 py-3.5 bg-gradient-to-r ${comp.accentColor} text-white flex items-center justify-between gap-2`}>
                    <span className="font-bold text-sm sm:text-base">
                      {idx + 1}. {comp.name}
                    </span>
                    <span className="text-xs font-bold bg-white/20 px-2.5 py-0.5 rounded-full shrink-0">
                      {comp.type}
                    </span>
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="text-xs text-slate-500 flex items-center justify-between">
                      <span>จำนวนทีม/ชุดที่สมัครแล้ว: <strong className="text-slate-800">{compRegCount}</strong></span>
                      {comp.requiresSongs && (
                        <span className="inline-flex items-center gap-1 text-sky-700 font-semibold">
                          <Music className="w-3.5 h-3.5" />
                          <span>ต้องระบุเพลง 2 รอบ</span>
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {visibleLevels.map((lvl) => (
                        <span
                          key={lvl}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-lg border ${comp.badgeBg}`}
                        >
                          {lvl}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => handleSelectMenu('schedule')}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    ดูตารางและสถานที่
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      prepareRegistrationForm(comp.id, visibleLevels[0], null);
                      handleSelectMenu('register');
                    }}
                    className="inline-flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>สมัครรายการนี้</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSchedulePage = () => {
    const isAdmin = authSession.role === 'admin';
    const levelFilters = ['ทั้งหมด', ...LEVELS_STANDARD, ...LEVELS_UNLIMITED];

    const getDefaultScheduleItem = (key) => ({
      venue: schedules[key]?.venue || EVENT_VENUE_TH,
      dateLabel: schedules[key]?.dateLabel || EVENT_DATE_TH,
      timeRange: schedules[key]?.timeRange || '08.30 - 12.00 น.',
      notes: schedules[key]?.notes || ''
    });

    const handleStartEditSchedule = (key) => {
      const baseItem = getDefaultScheduleItem(key);
      setScheduleDrafts((prev) => ({
        ...prev,
        [key]: { ...baseItem }
      }));
      setEditingScheduleKey(key);
    };

    const handleCancelEditSchedule = (key) => {
      setScheduleDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (editingScheduleKey === key) {
        setEditingScheduleKey(null);
      }
    };

    const updateScheduleDraftField = (key, field, value) => {
      setScheduleDrafts((prev) => {
        const currentDraft = prev[key] || getDefaultScheduleItem(key);
        return {
          ...prev,
          [key]: {
            ...currentDraft,
            [field]: value
          }
        };
      });
    };

    const handleSaveScheduleItem = (key, compName, lvlName) => {
      const draft = scheduleDrafts[key] || getDefaultScheduleItem(key);
      const cleanedVenue = (draft.venue || '').trim() || EVENT_VENUE_TH;
      const cleanedTime = (draft.timeRange || '').trim() || '08.30 - 12.00 น.';

      setSchedules((prev) => ({
        ...prev,
        [key]: {
          ...getDefaultScheduleItem(key),
          ...draft,
          venue: cleanedVenue,
          timeRange: cleanedTime
        }
      }));

      setScheduleDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      setEditingScheduleKey(null);
      showToast(`บันทึกสถานที่และเวลาแข่งขัน "${compName} (${lvlName})" เรียบร้อยแล้ว`);
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-600" />
              <span>ตารางการแข่งขันและสถานที่แข่งขัน</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {EVENT_DATE_TH} • สถานที่หลัก: {EVENT_VENUE_TH}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={selectedCompFilter}
              onChange={(e) => setSelectedCompFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 outline-none"
            >
              <option value="all">ทุกกิจกรรม</option>
              {COMPETITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 outline-none"
            >
              {levelFilters.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl === 'ทั้งหมด' ? 'ทุกระดับชั้น' : lvl}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => handlePrintSchedulePdf(selectedCompFilter, selectedLevelFilter)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2 text-sm font-bold shadow-sm cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์ / PDF</span>
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {COMPETITIONS.filter((c) =>
            selectedCompFilter === 'all' ? true : c.id === selectedCompFilter
          ).map((comp) => {
            const visibleLevels =
              selectedLevelFilter === 'ทั้งหมด'
                ? comp.levels
                : comp.levels.filter((l) => l === selectedLevelFilter);

            if (visibleLevels.length === 0) return null;

            return (
              <div key={comp.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className={`px-5 py-3.5 bg-gradient-to-r ${comp.accentColor} text-white font-bold text-base`}>
                  {comp.name} ({comp.type})
                </div>

                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {visibleLevels.map((lvl) => {
                    const key = `${comp.id}__${lvl}`;
                    const item = getDefaultScheduleItem(key);
                    const isEditing = isAdmin && editingScheduleKey === key;
                    const draftItem = scheduleDrafts[key] || item;
                    const isExpanded = expandedScheduleKey === key;
                    const levelRegs = registrations.filter(
                      (r) => r.competitionId === comp.id && r.level === lvl
                    );

                    return (
                      <div
                        key={key}
                        className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="space-y-2 text-xs sm:text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${comp.badgeBg}`}>
                              {lvl}
                            </span>
                            <span className="text-xs font-semibold text-slate-500">
                              {levelRegs.length} ทีม/ชุด
                            </span>
                          </div>

                          {isEditing ? (
                            <div className="space-y-2 pt-1">
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500">สถานที่แข่งขัน</label>
                                <input
                                  type="text"
                                  value={draftItem.venue}
                                  onChange={(e) => updateScheduleDraftField(key, 'venue', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[11px] font-bold text-slate-500">เวลาแข่งขัน</label>
                                <input
                                  type="text"
                                  value={draftItem.timeRange}
                                  onChange={(e) => updateScheduleDraftField(key, 'timeRange', e.target.value)}
                                  className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-emerald-500"
                                />
                              </div>
                              <div className="flex items-center justify-end gap-2 pt-1">
                                <button
                                  type="button"
                                  onClick={() => handleCancelEditSchedule(key)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 px-2.5 py-1.5 text-xs font-bold cursor-pointer"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>ยกเลิก</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSaveScheduleItem(key, comp.name, lvl)}
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm cursor-pointer"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>บันทึกการแก้ไข</span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="space-y-1.5 pt-1 text-xs text-slate-700">
                              <div className="flex items-start gap-1.5">
                                <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{item.venue}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>{item.timeRange}</span>
                              </div>
                              {item.notes && (
                                <div className="text-[11px] text-slate-500 pt-0.5">{item.notes}</div>
                              )}
                              {isAdmin && (
                                <div className="pt-1">
                                  <button
                                    type="button"
                                    onClick={() => handleStartEditSchedule(key)}
                                    className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-bold cursor-pointer"
                                  >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    <span>แก้ไขสถานที่ / เวลา</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-200/70">
                          <button
                            type="button"
                            onClick={() => setExpandedScheduleKey(isExpanded ? null : key)}
                            className="text-xs font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            {isExpanded ? 'ซ่อนรายชื่อผู้เข้าแข่งขัน' : `ดูรายชื่อผู้เข้าแข่งขัน (${levelRegs.length})`}
                          </button>

                          {isExpanded && (
                            <div className="mt-2 space-y-1.5 text-xs">
                              {levelRegs.length === 0 ? (
                                <div className="text-slate-400">ยังไม่มีผู้สมัครในระดับนี้</div>
                              ) : (
                                levelRegs.map((reg, idx) => {
                                  const sch = schools.find((s) => s.id === reg.schoolId);
                                  return (
                                    <div key={reg.id} className="rounded-lg bg-white border border-slate-200/70 p-2">
                                      <div className="font-bold text-slate-800">
                                        {idx + 1}. {sch?.name || '-'}
                                      </div>
                                      <div className="text-slate-600">
                                        {reg.students.map((s) => s.name).join(', ')}
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderBySchoolPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isSchool = authSession.role === 'school';

    if (!isAdmin && !isSchool) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-emerald-600 mx-auto" />
          <div className="font-bold text-slate-800">กรุณาเข้าสู่ระบบโรงเรียนหรือผู้ดูแลระบบเพื่อดูรายชื่อแยกตามโรงเรียน</div>
          <button
            type="button"
            onClick={() => handleSelectMenu('login')}
            className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      );
    }

    const visibleSchools = isSchool
      ? schools.filter((s) => s.id === authSession.schoolId)
      : selectedSchoolFilter === 'all'
      ? schools
      : schools.filter((s) => s.id === selectedSchoolFilter);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-6 h-6 text-emerald-600" />
              <span>รายชื่อแยกตามโรงเรียน</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              แสดงรายชื่อผู้เข้าแข่งขัน ครูผู้ฝึกสอน และรายการแข่งขันของแต่ละสถานศึกษา
            </p>
          </div>

          {isAdmin && (
            <select
              value={selectedSchoolFilter}
              onChange={(e) => setSelectedSchoolFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none"
            >
              <option value="all">ทุกโรงเรียน ({schools.length})</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.schoolCode}] {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-5">
          {visibleSchools.map((sch) => {
            const schRegs = registrations.filter((r) => r.schoolId === sch.id);
            return (
              <div key={sch.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-base">{sch.name}</div>
                    <div className="text-xs text-emerald-100">
                      รหัสสถานศึกษา: {sch.schoolCode} • ผู้อำนวยการ: {sch.director}
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
                    สมัคร {schRegs.length} รายการ
                  </span>
                </div>

                <div className="p-5">
                  {schRegs.length === 0 ? (
                    <div className="text-sm text-slate-400 text-center py-4">
                      ยังไม่มีรายการสมัครแข่งขันของโรงเรียนนี้
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {schRegs.map((reg) => {
                        const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
                        return (
                          <div key={reg.id} className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-1.5 text-xs sm:text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-orange-700">{comp?.name}</span>
                              <span className="text-xs font-semibold bg-white border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-700">
                                {reg.level}
                              </span>
                            </div>
                            <div className="text-slate-700">
                              <strong>ผู้เข้าแข่งขัน:</strong> {reg.students.map((s) => s.name).join(', ') || '-'}
                            </div>
                            <div className="text-slate-600">
                              <strong>ครูผู้ฝึกสอน:</strong>{' '}
                              {reg.coaches.map((c) => (typeof c === 'string' ? c : c.name)).join(', ') || '-'}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderByActivityPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isSchool = authSession.role === 'school';

    if (!isAdmin && !isSchool) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-amber-500 mx-auto" />
          <div className="font-bold text-slate-800">กรุณาเข้าสู่ระบบโรงเรียนหรือผู้ดูแลระบบเพื่อดูรายชื่อแยกตามกิจกรรม</div>
          <button
            type="button"
            onClick={() => handleSelectMenu('login')}
            className="rounded-xl bg-amber-500 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      );
    }

    const levelFilters = ['ทั้งหมด', ...LEVELS_STANDARD, ...LEVELS_UNLIMITED];
    const filteredComps = COMPETITIONS.filter((c) =>
      selectedCompFilter === 'all' ? true : c.id === selectedCompFilter
    );

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Layers className="w-6 h-6 text-orange-500" />
              <span>รายชื่อแยกตามกิจกรรม</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              สรุปรายชื่อผู้เข้าแข่งขัน ครูผู้ฝึกสอน และโรงเรียนในแต่ละกิจกรรมและระดับชั้น
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <select
              value={selectedCompFilter}
              onChange={(e) => setSelectedCompFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none"
            >
              <option value="all">ทุกกิจกรรม ({COMPETITIONS.length})</option>
              {COMPETITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none"
            >
              {levelFilters.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl === 'ทั้งหมด' ? 'ทุกระดับชั้น' : lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-5">
          {filteredComps.map((comp) => {
            const levelsToShow =
              selectedLevelFilter === 'ทั้งหมด'
                ? comp.levels
                : comp.levels.filter((l) => l === selectedLevelFilter);

            if (levelsToShow.length === 0) return null;

            return (
              <div key={comp.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className={`px-5 py-3.5 bg-gradient-to-r ${comp.accentColor} text-white font-bold text-base`}>
                  {comp.name} ({comp.type})
                </div>

                <div className="p-5 space-y-4">
                  {levelsToShow.map((lvl) => {
                    const levelRegs = registrations.filter((r) => {
                      const compLvlOk = r.competitionId === comp.id && r.level === lvl;
                      const schoolOk = isSchool ? r.schoolId === authSession.schoolId : true;
                      return compLvlOk && schoolOk;
                    });

                    return (
                      <div key={`${comp.id}__${lvl}`} className="rounded-xl border border-slate-200/80 p-4 bg-slate-50/40 space-y-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${comp.badgeBg}`}>
                            {lvl}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            จำนวน {levelRegs.length} ทีม/ชุด
                          </span>
                        </div>

                        {levelRegs.length === 0 ? (
                          <div className="text-xs text-slate-400">ยังไม่มีผู้สมัครในระดับชั้นนี้</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                            {levelRegs.map((reg, idx) => {
                              const sch = schools.find((s) => s.id === reg.schoolId);
                              return (
                                <div key={reg.id} className="rounded-lg bg-white border border-slate-200/70 p-3 space-y-1">
                                  <div className="font-bold text-slate-800">
                                    {idx + 1}. {sch?.name || '-'}
                                  </div>
                                  <div className="text-slate-700">
                                    <strong>ผู้เข้าแข่งขัน:</strong> {reg.students.map((s) => s.name).join(', ') || '-'}
                                  </div>
                                  <div className="text-slate-600">
                                    <strong>ครูผู้ฝึกสอน:</strong>{' '}
                                    {reg.coaches.map((c) => (typeof c === 'string' ? c : c.name)).join(', ') || '-'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderStudentCardPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isSchool = authSession.role === 'school';

    if (!isAdmin && !isSchool) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-amber-500 mx-auto" />
          <div className="font-bold text-slate-800">กรุณาเข้าสู่ระบบโรงเรียนเพื่อพิมพ์บัตรผู้เข้าแข่งขัน</div>
          <button
            onClick={() => handleSelectMenu('login')}
            className="rounded-xl bg-amber-500 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      );
    }

    const targetSchoolId = isSchool ? authSession.schoolId : selectedSchoolFilter;

    const filteredRegs = registrations.filter((r) => {
      const sOk = isSchool ? r.schoolId === authSession.schoolId : targetSchoolId === 'all' ? true : r.schoolId === targetSchoolId;
      const cOk = selectedCompFilter === 'all' ? true : r.competitionId === selectedCompFilter;
      return sOk && cOk;
    });

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <IdCard className="w-6 h-6 text-orange-500" />
                <span>พิมพ์บัตรผู้เข้าแข่งขัน (ขนาด 14.85 x 10.5 ซม. / 148.5 x 105 มม. แนวตั้ง)</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                แสดงข้อมูลรายละเอียดผู้แข่งขัน กิจกรรม ระดับชั้น สถานที่ และเวลา {isSchool ? '(เฉพาะโรงเรียนตนเอง)' : ''}
              </p>
            </div>

            <button
              onClick={() => handleDownloadStudentCardsPdf(isSchool ? authSession.schoolId : targetSchoolId, selectedCompFilter)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 text-sm font-bold shadow-md hover:opacity-95 cursor-pointer self-start lg:self-auto"
            >
              <FileDown className="w-4 h-4" />
              <span>ดาวน์โหลดบัตรผู้เข้าแข่งขัน (PDF)</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <select
                value={selectedSchoolFilter}
                onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none"
              >
                <option value="all">ทุกโรงเรียน</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedCompFilter}
              onChange={(e) => setSelectedCompFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none"
            >
              <option value="all">ทุกกิจกรรม</option>
              {COMPETITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={cardPrintLayout}
              onChange={(e) => setCardPrintLayout(e.target.value)}
              className="rounded-xl border border-amber-300 px-3.5 py-2 text-sm bg-amber-50/70 font-semibold text-amber-900 outline-none"
            >
              <option value="4-up">รูปแบบพิมพ์: 4 ต่อ 1 แนวตั้ง (A4 แนวตั้ง แผ่นละ 4 ใบ)</option>
              <option value="1-up">รูปแบบพิมพ์: 1 ต่อ 1 (ขนาด 14.85×10.5 ซม.)</option>
            </select>
          </div>
        </div>

        {/* Preview of Portrait Coach Cards (148.5mm x 105mm) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
          {filteredRegs.flatMap((reg) => {
            const sch = schools.find((s) => s.id === reg.schoolId);
            const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
            const sched = schedules[`${reg.competitionId}__${reg.level}`] || {
              venue: 'กำหนดในวันงาน',
              timeRange: '08.30 น. เป็นต้นไป'
            };

            return reg.students.map((st, sIdx) => (
              <div
                key={`${reg.id}-${sIdx}`}
                style={
                  studentCardBgUrl
                    ? { backgroundImage: `url(${studentCardBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : undefined
                }
                className="w-[265px] h-[375px] rounded-2xl bg-gradient-to-b from-amber-50 via-white to-orange-50 p-4 flex flex-col justify-between shadow-md"
              >
                <div className="text-center bg-white/60 rounded-xl py-2 px-2">
                  <div className="text-xs font-bold text-slate-800">บัตรประจำตัวผู้เข้าแข่งขัน</div>
                  <div className="text-[10px] font-bold text-amber-700">งานส่งเสริมวันมาฆบูชา ครั้งที่ 14 พ.ศ. 2570</div>
                  <div className="text-[9.5px] text-slate-500">17 กุมภาพันธ์ 2570</div>
                </div>

                <div className="flex justify-center">
                  <div className="w-20 h-24 rounded-xl bg-white/60 overflow-hidden flex items-center justify-center">
                    {st.photoUrl ? (
                      <img src={st.photoUrl} alt={st.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center px-1">รูปภาพนักเรียน</span>
                    )}
                  </div>
                </div>

                <div className="bg-white/60 rounded-xl p-2.5 text-[11px] space-y-1 leading-snug">
                  <div><strong>ชื่อ:</strong> {st.name}</div>
                  <div><strong>โรงเรียน:</strong> {sch?.name}</div>
                  <div><strong>กิจกรรม:</strong> {comp?.name}</div>
                  <div><strong>ระดับ:</strong> {reg.level}</div>
                  <div><strong>สถานที่:</strong> {sched.venue}</div>
                  <div><strong>เวลา:</strong> {sched.timeRange}</div>
                </div>

                <div className="text-center text-[12px] font-bold text-amber-800 bg-white/60 rounded-lg py-1">
                  ผู้เข้าแข่งขัน
                </div>
              </div>
            ));
          })}
        </div>
      </div>
    );
  };

  /**
   * หน้าพิมพ์บัตรครูผู้ฝึกสอน ขนาด 14.85 x 10.5 ซม. (148.5 x 105 มม.) แนวตั้ง
   * รองรับการกรองตามกิจกรรมและโรงเรียน การอัปโหลดรูปภาพนักเรียน การพิมพ์ 4 ต่อ 1 และดาวน์โหลด PDF
   */
  const renderCoachCardPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isSchool = authSession.role === 'school';

    if (!isAdmin && !isSchool) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-emerald-600 mx-auto" />
          <div className="font-bold text-slate-800">กรุณาเข้าสู่ระบบโรงเรียนเพื่อพิมพ์บัตรครูผู้ฝึกสอน</div>
          <button
            onClick={() => handleSelectMenu('login')}
            className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      );
    }

    const targetSchoolId = isSchool ? authSession.schoolId : selectedSchoolFilter;

    const filteredRegs = registrations.filter((r) => {
      const sOk = isSchool ? r.schoolId === authSession.schoolId : targetSchoolId === 'all' ? true : r.schoolId === targetSchoolId;
      const cOk = selectedCompFilter === 'all' ? true : r.competitionId === selectedCompFilter;
      return sOk && cOk;
    });

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <IdCard className="w-6 h-6 text-emerald-600" />
                <span>พิมพ์บัตรครูผู้ฝึกสอน (ขนาด 14.85 x 10.5 ซม. / 148.5 x 105 มม. แนวตั้ง)</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                แสดงข้อมูลผู้แข่งขัน กิจกรรม ระดับชั้น สถานที่ และเวลา {isSchool ? '(เห็นข้อมูลเฉพาะโรงเรียนตนเองเท่านั้น)' : ''}
              </p>
            </div>

            <button
              onClick={() =>
                handleDownloadCoachCardsPdf(
                  isSchool ? authSession.schoolId : targetSchoolId,
                  selectedCompFilter,
                  cardPrintLayout
                )
              }
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-4 py-2.5 text-sm font-bold shadow-md hover:opacity-95 cursor-pointer self-start lg:self-auto"
            >
              <FileDown className="w-4 h-4" />
              <span>พิมพ์ / ดาวน์โหลดบัตรครูผู้ฝึกสอน (PDF)</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-3">
            {isAdmin && (
              <select
                value={selectedSchoolFilter}
                onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none"
              >
                <option value="all">ทุกโรงเรียน</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={selectedCompFilter}
              onChange={(e) => setSelectedCompFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none"
            >
              <option value="all">ทุกกิจกรรม</option>
              {COMPETITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={cardPrintLayout}
              onChange={(e) => setCardPrintLayout(e.target.value)}
              className="rounded-xl border border-emerald-300 px-3.5 py-2 text-sm bg-emerald-50/70 font-semibold text-emerald-900 outline-none"
            >
              <option value="4-up">รูปแบบพิมพ์: 4 ต่อ 1 แนวตั้ง (A4 แนวตั้ง แผ่นละ 4 ใบ)</option>
              <option value="1-up">รูปแบบพิมพ์: 1 ต่อ 1 (ขนาด 14.85×10.5 ซม.)</option>
            </select>
          </div>
        </div>

        {/* Preview of Portrait Coach Cards (148.5mm x 105mm) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
          {filteredRegs.flatMap((reg) => {
            const sch = schools.find((s) => s.id === reg.schoolId);
            const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
            const sched = schedules[`${reg.competitionId}__${reg.level}`] || {
              venue: 'กำหนดในวันงาน',
              timeRange: '08.30 น. เป็นต้นไป'
            };
            const competitorNames = reg.students.map((st) => st.name).join(', ') || '-';

            return reg.coaches.map((coachItem, cIdx) => {
              const coachName = typeof coachItem === 'string' ? coachItem : coachItem.name;
              const coachPhoto = typeof coachItem === 'string' ? '' : coachItem.photoUrl || '';

              return (
                <div
                  key={`${reg.id}-coach-${cIdx}`}
                  style={
                    coachCardBgUrl
                      ? { backgroundImage: `url(${coachCardBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : undefined
                  }
                  className="w-[265px] h-[385px] rounded-2xl bg-gradient-to-b from-emerald-50 via-white to-teal-50 p-4 flex flex-col justify-between shadow-md"
                >
                  <div className="text-center bg-white/60 rounded-xl py-2 px-2">
                    <div className="text-xs font-bold text-slate-800">บัตรประจำตัวครูผู้ฝึกสอน</div>
                    <div className="text-[10px] font-bold text-emerald-700">งานส่งเสริมวันมาฆบูชา ครั้งที่ 14 พ.ศ. 2570</div>
                    <div className="text-[9.5px] text-slate-500">17 กุมภาพันธ์ 2570</div>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-20 h-24 rounded-xl bg-white/60 overflow-hidden flex items-center justify-center">
                      {coachPhoto ? (
                        <img src={coachPhoto} alt={coachName} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-[10px] text-slate-400 text-center px-1">รูปภาพครูผู้ฝึกสอน</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/60 rounded-xl p-2.5 text-[11px] space-y-0.5 leading-snug">
                    <div><strong className="text-slate-800">ครูผู้ฝึกสอน:</strong> {coachName}</div>
                    <div><strong className="text-slate-800">โรงเรียน:</strong> {sch?.name}</div>
                    <div className="truncate"><strong className="text-slate-800">ผู้แข่งขัน:</strong> {competitorNames}</div>
                    <div><strong className="text-slate-800">กิจกรรม:</strong> {comp?.name}</div>
                    <div><strong className="text-slate-800">ระดับ:</strong> {reg.level}</div>
                    <div><strong className="text-slate-800">สถานที่:</strong> {sched.venue}</div>
                    <div><strong className="text-slate-800">เวลา:</strong> {sched.timeRange}</div>
                  </div>

                  <div className="text-center text-[12px] font-bold text-emerald-800 bg-white/60 rounded-lg py-1">
                    ครูผู้ฝึกสอน
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>
    );
  };

  const renderJudgeCardPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isJudge = authSession.role === 'judge';

    if (!isAdmin && !isJudge) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-sky-500 mx-auto" />
          <div className="font-bold text-slate-800">เห็นและสามารถดาวน์โหลดได้แค่กรรมการตัดสินเท่านั้น</div>
          <button
            onClick={() => {
              setLoginTab('judge');
              handleSelectMenu('login');
            }}
            className="rounded-xl bg-sky-600 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบกรรมการ
          </button>
        </div>
      );
    }

    const visibleJudges = isAdmin
      ? selectedCompFilter === 'all'
        ? judges
        : judges.filter((j) => j.competitionId === selectedCompFilter)
      : judges.filter((j) => j.id === authSession.judgeId);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <IdCard className="w-6 h-6 text-sky-600" />
              <span>พิมพ์บัตรกรรมการตัดสิน (14.85 x 10.5 ซม. แนวตั้ง)</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              แยกเป็นกิจกรรม และสามารถดาวน์โหลดเป็นไฟล์ PDF ได้ทันที
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <select
                value={selectedCompFilter}
                onChange={(e) => setSelectedCompFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 outline-none"
              >
                <option value="all">ทุกกิจกรรม</option>
                {COMPETITIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
            <button
              onClick={() => handleDownloadJudgeCardsPdf(visibleJudges)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white px-4 py-2.5 text-sm font-bold shadow-md cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>ดาวน์โหลดบัตรกรรมการ (PDF)</span>
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
          {visibleJudges.map((jdg) => {
            const comp = COMPETITIONS.find((c) => c.id === jdg.competitionId);
            const sched = schedules[`${jdg.competitionId}__${jdg.level}`] || {
              venue: 'กำหนดในวันงาน',
              timeRange: '08.30 น. เป็นต้นไป'
            };

            return (
              <div
                key={jdg.id}
                style={
                  judgeCardBgUrl
                    ? { backgroundImage: `url(${judgeCardBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : undefined
                }
                className="w-[265px] h-[375px] rounded-2xl bg-gradient-to-b from-sky-50 via-white to-indigo-50 p-4 flex flex-col justify-between shadow-md"
              >
                <div className="text-center bg-white/60 rounded-xl py-2 px-2">
                  <div className="text-xs font-bold text-slate-800">บัตรประจำตัวกรรมการตัดสิน</div>
                  <div className="text-[10px] font-bold text-sky-700">งานส่งเสริมวันมาฆบูชา ครั้งที่ 14 พ.ศ. 2570</div>
                  <div className="text-[9.5px] text-slate-500">17 กุมภาพันธ์ 2570</div>
                </div>

                <div className="flex justify-center">
                  <div className="w-20 h-24 rounded-xl bg-white/60 overflow-hidden flex items-center justify-center">
                    {jdg.photoUrl ? (
                      <img src={jdg.photoUrl} alt={jdg.name} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-[10px] text-slate-400 text-center px-1">รูปภาพกรรมการ</span>
                    )}
                  </div>
                </div>

                <div className="bg-white/60 rounded-xl p-2.5 text-[11px] space-y-1 leading-snug">
                  <div><strong>ชื่อ:</strong> {jdg.name}</div>
                  <div><strong>ตำแหน่ง:</strong> {jdg.position}</div>
                  <div><strong>กิจกรรม:</strong> {comp?.name}</div>
                  <div><strong>ระดับ:</strong> {jdg.level}</div>
                  <div><strong>สถานที่:</strong> {sched.venue}</div>
                  <div><strong>เวลา:</strong> {sched.timeRange}</div>
                  <div className="pt-1 mt-1 text-sky-900">
                    <div><strong>ชื่อผู้ใช้:</strong> <span className="font-mono">{jdg.username || '-'}</span></div>
                    <div><strong>รหัสผ่าน:</strong> <span className="font-mono">{jdg.password || '-'}</span></div>
                  </div>
                </div>

                <div className="text-center text-[12px] font-bold text-sky-800 bg-white/60 rounded-lg py-1">
                  กรรมการตัดสิน
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderJudgeCertPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isJudge = authSession.role === 'judge';

    if (!isAdmin && !isJudge) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-amber-500 mx-auto" />
          <div className="font-bold text-slate-800">เห็นและสามารถดาวน์โหลดได้แค่กิจกรรมที่เป็นกรรมการเท่านั้น</div>
          <button
            onClick={() => {
              setLoginTab('judge');
              handleSelectMenu('login');
            }}
            className="rounded-xl bg-amber-500 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบกรรมการ
          </button>
        </div>
      );
    }

    const allowedJudges = isAdmin ? judges : judges.filter((j) => j.id === authSession.judgeId);
    const certData = allowedJudges.map((j) => {
      const comp = COMPETITIONS.find((c) => c.id === j.competitionId);
      const globalIdx = judges.findIndex((item) => item.id === j.id);
      const seqNum = globalIdx >= 0 ? globalIdx + 1 : 1;
      const activityText = comp?.name || '';
      const positionText = j.position || 'กรรมการตัดสิน';
      const isUnlimitedLevel = j.competitionId === 'comp-10' || j.level === 'ไม่จำกัดระดับ';
      const levelText = !isUnlimitedLevel && j.level ? `ระดับ${j.level}` : '';
      return {
        certNumber: formatCertificateNumber('กต', seqNum),
        recipientName: j.name,
        schoolName: '',
        roleLabel: positionText,
        activityName: activityText,
        levelName: levelText,
        line1Name: j.name,
        line2Position: `${positionText} การแข่งขัน${activityText}`.trim(),
        line3Activity: levelText
      };
    });

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              <span>เกียรติบัตรนักเรียน / ครูผู้ฝึกสอน / ผู้อำนวยการโรงเรียน (A4 แนวนอน)</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              แยกเป็นกิจกรรม และสามารถดาวน์โหลดเป็นไฟล์ PDF ได้ทันที
            </p>
          </div>
          <button
            onClick={() => handleDownloadCertificateA4Landscape(certData, 'เกียรติบัตรกรรมการตัดสิน (A4 แนวนอน)')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 text-sm font-bold shadow-md cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>ดาวน์โหลดเกียรติบัตรกรรมการ (PDF)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {certData.map((c, idx) => (
            <div key={idx} className="relative rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 p-8 min-h-[240px] flex flex-col items-center text-center">
              <div className="absolute top-6 right-6 text-[10pt] font-semibold text-slate-900">{c.certNumber}</div>
              <div style={{ marginTop: '7.3cm' }} className="flex flex-col items-center space-y-1.5">
                <div className="text-[15pt] font-bold text-slate-900">{c.line1Name}</div>
                <div className="text-sm font-bold text-slate-900">{c.line2Position}</div>
                {c.line3Activity && (
                  <div className="text-sm font-semibold text-slate-900">{c.line3Activity}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderSchoolCertPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isSchool = authSession.role === 'school';

    if (!isAdmin && !isSchool) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-amber-500 mx-auto" />
          <div className="font-bold text-slate-800">กรุณาเข้าสู่ระบบโรงเรียนเพื่อดูและดาวน์โหลดเกียรติบัตรของโรงเรียนตนเอง</div>
          <button
            onClick={() => handleSelectMenu('login')}
            className="rounded-xl bg-amber-500 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      );
    }

    const targetSchoolId = isSchool ? authSession.schoolId : selectedSchoolFilter;

    // คำนวณลำดับเลขที่เกียรติบัตรตามประเภทผู้รับทั้งหมดในระบบ
    const allStudentCertSeqMap = {};
    let studentCounter = 0;
    registrations.forEach((r) => {
      r.students.forEach((_, sIdx) => {
        studentCounter += 1;
        allStudentCertSeqMap[`${r.id}__st__${sIdx}`] = studentCounter;
      });
    });

    const allCoachCertSeqMap = {};
    let coachCounter = 0;
    registrations.forEach((r) => {
      r.coaches.forEach((_, cIdx) => {
        coachCounter += 1;
        allCoachCertSeqMap[`${r.id}__co__${cIdx}`] = coachCounter;
      });
    });

    const allDirectorCertSeqMap = {};
    let directorCounter = 0;
    const seenDirectorSchools = new Set();
    registrations.forEach((r) => {
      const sch = schools.find((s) => s.id === r.schoolId);
      if (sch && !seenDirectorSchools.has(sch.id)) {
        seenDirectorSchools.add(sch.id);
        directorCounter += 1;
        allDirectorCertSeqMap[sch.id] = directorCounter;
      }
    });

    const targetRegs = registrations.filter((r) => {
      const sOk = isSchool ? r.schoolId === authSession.schoolId : targetSchoolId === 'all' ? true : r.schoolId === targetSchoolId;
      const cOk = selectedCompFilter === 'all' ? true : r.competitionId === selectedCompFilter;
      return sOk && cOk;
    });

    const certs = [];
    const emittedDirectorSchools = new Set();
    targetRegs.forEach((r) => {
      const sch = schools.find((s) => s.id === r.schoolId);
      const comp = COMPETITIONS.find((c) => c.id === r.competitionId);
      const activityText = comp?.name || '';
      const isUnlimitedLevel = r.competitionId === 'comp-10' || r.level === 'ไม่จำกัดระดับ';
      const levelText = !isUnlimitedLevel && r.level ? `ระดับ${r.level}` : '';

      if (certRecipientType === 'student') {
        const metaKey = `${r.competitionId}__${r.level}`;
        const meta = evalMeta[metaKey] || { status: 'pending', approved: false };
        const calc = calculateNormalizedScore(scores[r.id]);
        const hasApprovedScore = Boolean(meta.approved) && calc.judgeCount > 0;
        const medal = getMedalTier(calc.average100, hasApprovedScore);
        const awardText = hasApprovedScore ? medal.label : 'เข้าร่วม';

        r.students.forEach((st, sIdx) => {
          const seq = allStudentCertSeqMap[`${r.id}__st__${sIdx}`] || certs.length + 1;
          certs.push({
            certNumber: formatCertificateNumber('ผข', seq),
            recipientTypeLabel: 'ผู้เข้าแข่งขัน',
            recipientName: st.name,
            schoolName: sch ? sch.name : '',
            roleLabel: 'ผู้เข้าแข่งขัน',
            activityName: activityText,
            levelName: levelText,
            fitSingleLine: true,
            line1Name: st.name,
            line2Position: sch ? sch.name : '',
            line3Activity: `ได้${awardText} การแข่งขัน${activityText} ${levelText}`.trim()
          });
        });
      } else if (certRecipientType === 'coach') {
        const metaKey = `${r.competitionId}__${r.level}`;
        const meta = evalMeta[metaKey] || { status: 'pending', approved: false };
        const calc = calculateNormalizedScore(scores[r.id]);
        const hasApprovedScore = Boolean(meta.approved) && calc.judgeCount > 0;
        const medal = getMedalTier(calc.average100, hasApprovedScore);
        const awardText = hasApprovedScore ? medal.label : 'เข้าร่วม';
        const schoolText = sch ? sch.name : '';

        r.coaches.forEach((co, cIdx) => {
          const coachLabel = typeof co === 'string' ? co : co.name;
          const seq = allCoachCertSeqMap[`${r.id}__co__${cIdx}`] || certs.length + 1;
          certs.push({
            certNumber: formatCertificateNumber('คฝ', seq),
            recipientTypeLabel: 'ครูผู้ฝึกสอน',
            recipientName: coachLabel,
            schoolName: schoolText,
            roleLabel: 'ครูผู้ฝึกสอน',
            activityName: activityText,
            levelName: levelText,
            fitSingleLine: true,
            line1Name: coachLabel,
            line2Position: `${schoolText}   ครูผู้ฝึกสอนนักเรียน`.trim(),
            line3Activity: `ได้${awardText} การแข่งขัน${activityText} ${levelText}`.trim()
          });
        });
      } else if (certRecipientType === 'director' && sch && !emittedDirectorSchools.has(sch.id)) {
        emittedDirectorSchools.add(sch.id);
        const seq = allDirectorCertSeqMap[sch.id] || certs.length + 1;
        certs.push({
          certNumber: formatCertificateNumber('ผอ', seq),
          recipientTypeLabel: 'ผู้อำนวยการโรงเรียน',
          recipientName: sch.director,
          schoolName: sch.name,
          roleLabel: 'ผู้อำนวยการโรงเรียน',
          activityName: '',
          levelName: '',
          line1Name: sch.director,
          line2Position: `ผู้อำนวยการ${sch.name}`,
          line3Activity: 'ได้สนับสนุน ส่งเสริม  ครู บุคลากรทางการศึกษา และนักเรียนเข้าร่วมกิจกรรม'
        });
      }
    });

    const recipientLabelMap = {
      student: 'นักเรียน',
      coach: 'ครูผู้ฝึกสอน',
      director: 'ผู้อำนวยการโรงเรียน'
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              <span>เกียรติบัตรนักเรียน / ครูผู้ฝึกสอน / ผู้อำนวยการ (A4 แนวนอน)</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              {isSchool
                ? 'เห็นและสามารถดาวน์โหลดได้เฉพาะของโรงเรียนที่ Login เข้าระบบเท่านั้น'
                : 'ผู้ดูแลระบบสามารถดูและดาวน์โหลดเกียรติบัตรได้ทุกโรงเรียน'}
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              handleDownloadCertificateA4Landscape(
                certs,
                `เกียรติบัตร${recipientLabelMap[certRecipientType] || ''} (A4 แนวนอน)`
              )
            }
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 text-sm font-bold shadow-md cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>ดาวน์โหลดเกียรติบัตร (PDF)</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-3">
          <select
            value={certRecipientType}
            onChange={(e) => setCertRecipientType(e.target.value)}
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white outline-none"
          >
            <option value="student">เกียรติบัตรนักเรียน</option>
            <option value="coach">เกียรติบัตรครูผู้ฝึกสอน</option>
            <option value="director">เกียรติบัตรผู้อำนวยการโรงเรียน</option>
          </select>

          {isAdmin && (
            <select
              value={selectedSchoolFilter}
              onChange={(e) => setSelectedSchoolFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white outline-none"
            >
              <option value="all">ทุกโรงเรียน</option>
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={selectedCompFilter}
            onChange={(e) => setSelectedCompFilter(e.target.value)}
            className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-white outline-none"
          >
            <option value="all">ทุกกิจกรรม</option>
            {COMPETITIONS.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {certs.length === 0 ? (
            <div className="col-span-full rounded-2xl bg-white p-8 text-center text-sm text-slate-400 border border-slate-100">
              ไม่พบข้อมูลเกียรติบัตรตามเงื่อนไขที่เลือก
            </div>
          ) : (
            certs.map((c, idx) => {
              const previewLine3Size = c.fitSingleLine
                ? Math.max(10, Math.min(14, 14 - Math.max(0, (c.line3Activity || '').length - 36) * 0.08))
                : 14;

              return (
                <div key={idx} className="relative rounded-2xl bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-amber-300 p-8 min-h-[240px] flex flex-col items-center text-center">
                  <div className="absolute top-6 right-6 text-[10pt] font-semibold text-slate-900">{c.certNumber}</div>
                  <div style={{ marginTop: '7.3cm' }} className="w-full flex flex-col items-center space-y-1.5">
                    <div className="text-[15pt] font-bold text-slate-900">{c.line1Name}</div>
                    <div className="text-sm font-bold text-slate-900">{c.line2Position}</div>
                    <div
                      style={{ fontSize: `${previewLine3Size}px` }}
                      className={`${
                        c.fitSingleLine ? 'whitespace-nowrap max-w-full' : ''
                      } font-semibold text-slate-900`}
                    >
                      {c.line3Activity}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const renderSchoolResultsPage = () => {
    if (authSession.role !== 'school' || !currentSchool) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-emerald-600 mx-auto" />
          <div className="font-bold text-slate-800">เมนูนี้สำหรับโรงเรียนที่เข้าสู่ระบบเท่านั้น</div>
          <button
            type="button"
            onClick={() => {
              setLoginTab('school');
              handleSelectMenu('login');
            }}
            className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบโรงเรียน
          </button>
        </div>
      );
    }

    const myRegs = registrations.filter((r) => r.schoolId === currentSchool.id);

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-emerald-600" />
              <span>ผลคะแนนของโรงเรียน ({currentSchool.name})</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              สรุปผลคะแนน อันดับในระดับชั้น และระดับเหรียญรางวัลของโรงเรียนตนเองในทุกกิจกรรมที่สมัคร
            </p>
          </div>

          <span className="self-start sm:self-center px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
            เข้าร่วม {myRegs.length} รายการ
          </span>
        </div>

        {myRegs.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 border border-slate-100">
            โรงเรียนยังไม่มีรายการสมัครแข่งขัน
          </div>
        ) : (
          <div className="space-y-4">
            {myRegs.map((reg) => {
              const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
              const metaKey = `${reg.competitionId}__${reg.level}`;
              const meta = evalMeta[metaKey] || { status: 'pending', approved: false };

              const sameLevelRanked = registrations
                .filter((r) => r.competitionId === reg.competitionId && r.level === reg.level)
                .map((r) => {
                  const calc = calculateNormalizedScore(scores[r.id]);
                  return {
                    id: r.id,
                    score: calc.average100,
                    judgeCount: calc.judgeCount
                  };
                })
                .sort((a, b) => b.score - a.score);

              const rankIndex = sameLevelRanked.findIndex((item) => item.id === reg.id);
              const myCalc = calculateNormalizedScore(scores[reg.id]);
              const isApproved = Boolean(meta.approved);
              const medal = getMedalTier(myCalc.average100, isApproved && myCalc.judgeCount > 0);

              return (
                <div
                  key={reg.id}
                  className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${comp?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                        {reg.level}
                      </span>
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>อนุมัติผลแล้ว</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                          <Clock className="w-3.5 h-3.5" />
                          <span>รออนุมัติผล</span>
                        </span>
                      )}
                    </div>

                    <h3 className="text-base sm:text-lg font-bold text-slate-800">{comp?.name}</h3>
                    <div className="text-xs sm:text-sm text-slate-600">
                      <strong>ผู้เข้าแข่งขัน:</strong> {reg.students.map((s) => s.name).join(', ') || '-'}
                    </div>
                  </div>

                  <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 lg:justify-end">
                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-center min-w-[115px]">
                      <div className="text-[11px] text-slate-500">คะแนนรวม</div>
                      <div className="text-lg font-extrabold text-slate-800">
                        {isApproved && myCalc.judgeCount > 0 ? myCalc.average100.toFixed(2) : '-'}
                      </div>
                    </div>

                    <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-center min-w-[115px]">
                      <div className="text-[11px] text-slate-500">ลำดับในระดับ</div>
                      <div className="text-lg font-extrabold text-amber-700">
                        {isApproved && myCalc.judgeCount > 0 && rankIndex >= 0 ? `ที่ ${rankIndex + 1}` : '-'}
                      </div>
                    </div>

                    <div className={`rounded-xl border px-4 py-2.5 text-center min-w-[125px] ${medal.badgeCls}`}>
                      <div className="text-[11px] opacity-80">ระดับรางวัล</div>
                      <div className="text-sm font-extrabold">{medal.label}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderResultsPage = () => {
    const isAdmin = authSession.role === 'admin';
    const levelFilters = [
      'ทั้งหมด',
      ...Array.from(new Set(COMPETITIONS.flatMap((c) => c.levels)))
    ];

    const toggleApprove = (metaKey) => {
      setEvalMeta((prev) => {
        const cur = prev[metaKey] || { status: 'judging', approved: false };
        const nextApproved = !cur.approved;
        return {
          ...prev,
          [metaKey]: {
            status: nextApproved ? 'completed' : 'judging',
            approved: nextApproved
          }
        };
      });
      showToast('อัปเดตสถานะการอนุมัติผลการแข่งขันเรียบร้อยแล้ว');
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              <span>ประกาศผลคะแนนการแข่งขัน</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              แสดงผลการแข่งขันตามกิจกรรมและระดับชั้น พร้อมดาวน์โหลดใบประกาศผลเป็นไฟล์ PDF
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <select
              value={selectedCompFilter}
              onChange={(e) => setSelectedCompFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 outline-none"
            >
              <option value="all">ทุกกิจกรรม</option>
              {COMPETITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm bg-slate-50 outline-none"
            >
              {levelFilters.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl === 'ทั้งหมด' ? 'ทุกระดับชั้น' : lvl}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-5">
          {COMPETITIONS.filter((c) =>
            selectedCompFilter === 'all' ? true : c.id === selectedCompFilter
          ).map((comp) => {
            const visibleLevels =
              selectedLevelFilter === 'ทั้งหมด'
                ? comp.levels
                : comp.levels.filter((l) => l.trim() === selectedLevelFilter.trim());

            if (visibleLevels.length === 0) return null;

            return (
              <div key={comp.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                <div className={`px-5 py-3.5 bg-gradient-to-r ${comp.accentColor} text-white font-bold text-base`}>
                  {comp.name} ({comp.type})
                </div>

                <div className="p-5 space-y-4">
                  {visibleLevels.map((lvl) => {
                    const normalizedLvl = lvl.trim();
                    const metaKey = `${comp.id}__${normalizedLvl}`;
                    const meta = evalMeta[metaKey] || evalMeta[`${comp.id}__${lvl}`] || { status: 'pending', approved: false };
                    const isApproved = Boolean(meta.approved);
                    const showAllRanks = Boolean(expandedAllResultsKeys[metaKey] || expandedAllResultsKeys[`${comp.id}__${lvl}`]);

                    const ranked = registrations
                      .filter(
                        (r) =>
                          r.competitionId === comp.id &&
                          String(r.level || '').trim() === normalizedLvl
                      )
                      .map((r) => {
                        const sch = schools.find((s) => s.id === r.schoolId);
                        const calc = calculateNormalizedScore(scores[r.id]);
                        return {
                          reg: r,
                          schoolName: sch?.name || '-',
                          studentNames: r.students.map((s) => s.name).join(', '),
                          score: calc.average100,
                          judgeCount: calc.judgeCount
                        };
                      })
                      .sort((a, b) => b.score - a.score);

                    const displayRanked = isAdmin
                      ? ranked
                      : ranked.filter((item) => item.judgeCount > 0);

                    const totalRegisteredSchools = ranked.length;
                    const scoredSchoolsCount = ranked.filter((item) => item.judgeCount > 0).length;
                    const isAllSchoolsScored =
                      totalRegisteredSchools > 0 && scoredSchoolsCount === totalRegisteredSchools;

                    return (
                      <div key={metaKey} className="rounded-xl border border-slate-200 p-4 space-y-3 bg-slate-50/40">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${comp.badgeBg}`}>
                              {lvl}
                            </span>
                            {isAdmin && (
                              <span
                                className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                                  totalRegisteredSchools === 0
                                    ? 'bg-slate-100 text-slate-500 border-slate-200'
                                    : isAllSchoolsScored
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : 'bg-sky-100 text-sky-800 border-sky-300'
                                }`}
                              >
                                {isAllSchoolsScored ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Clock className="w-3.5 h-3.5" />
                                )}
                                <span>
                                  {totalRegisteredSchools === 0
                                    ? 'ยังไม่มีโรงเรียนสมัคร'
                                    : isAllSchoolsScored
                                    ? `ตัดสินครบทุกโรงเรียนแล้ว (${scoredSchoolsCount}/${totalRegisteredSchools} โรงเรียน)`
                                    : `ความคืบหน้าการตัดสิน: ${scoredSchoolsCount}/${totalRegisteredSchools} โรงเรียน`}
                                </span>
                              </span>
                            )}
                            {isApproved ? (
                              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>อนุมัติประกาศผลแล้ว</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                                <Clock className="w-3.5 h-3.5" />
                                <span>รออนุมัติผล</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => toggleApprove(metaKey)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer ${
                                  isApproved ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                              >
                                {isApproved ? 'ยกเลิกการอนุมัติ' : 'อนุมัติประกาศผล'}
                              </button>
                            )}
                            {(isApproved || isAdmin) && (
                              <button
                                type="button"
                                onClick={() => handleDownloadResultsPdf(comp.id, lvl)}
                                className="inline-flex items-center gap-1 rounded-lg bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 text-xs font-bold cursor-pointer"
                              >
                                <FileDown className="w-3.5 h-3.5" />
                                <span>ดาวน์โหลด PDF</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {!isApproved && !isAdmin ? (
                          <div className="text-xs text-slate-500 py-3 text-center">
                            ผลคะแนนในระดับชั้นนี้กำลังอยู่ระหว่างการตรวจสอบและอนุมัติจากผู้ดูแลระบบ
                          </div>
                        ) : displayRanked.length === 0 ? (
                          <div className="text-xs text-slate-400 py-3 text-center">
                            ยังไม่มีผู้เข้าแข่งขันในระดับชั้นนี้
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                              <thead>
                                <tr className="bg-white text-slate-600 border-b border-slate-200">
                                  <th className="py-2 px-3">ลำดับที่</th>
                                  <th className="py-2 px-3">ผู้เข้าแข่งขัน</th>
                                  <th className="py-2 px-3">โรงเรียน</th>
                                  <th className="py-2 px-3 text-right">คะแนนรวม (เต็ม 100)</th>
                                  <th className="py-2 px-3 text-center">ระดับเหรียญรางวัล</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 bg-white">
                                {(showAllRanks ? displayRanked : displayRanked.slice(0, 5)).map((item, idx) => {
                                  const hasSc = item.judgeCount > 0;
                                  const medal = getMedalTier(item.score, hasSc);
                                  return (
                                    <tr key={item.reg.id}>
                                      <td className="py-2 px-3 font-bold text-slate-800">
                                        {hasSc ? `อันดับที่ ${idx + 1}` : 'เข้าร่วม'}
                                      </td>
                                      <td className="py-2 px-3 text-slate-800">{item.studentNames}</td>
                                      <td className="py-2 px-3 text-slate-600">{item.schoolName}</td>
                                      <td className="py-2 px-3 text-right font-bold text-amber-700">
                                        {hasSc ? item.score.toFixed(2) : '-'}
                                      </td>
                                      <td className="py-2 px-3 text-center">
                                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${medal.badgeCls}`}>
                                          {medal.label}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                            {displayRanked.length > 5 && (
                              <div className="mt-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
                                <span>
                                  {showAllRanks
                                    ? `กำลังแสดงผลคะแนนทั้งหมด ${displayRanked.length} รายการ`
                                    : `แสดงเฉพาะลำดับที่ 1 - 5 บนหน้าจอ (ทั้งหมด ${displayRanked.length} รายการ)`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setExpandedAllResultsKeys((prev) => ({
                                      ...prev,
                                      [metaKey]: !prev[metaKey]
                                    }))
                                  }
                                  className="inline-flex items-center justify-center gap-1 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold px-3 py-1.5 cursor-pointer self-end sm:self-auto"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>
                                    {showAllRanks
                                      ? 'ย่อแสดงเฉพาะลำดับที่ 1 - 5'
                                      : `ดูผลคะแนนทั้งหมด (${displayRanked.length} รายการ)`}
                                  </span>
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderAdminCompetitionManagePage = () => {
    if (authSession.role !== 'admin') {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <ShieldCheck className="w-8 h-8 text-rose-500 mx-auto" />
          <div className="font-bold text-slate-800">เมนูนี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น</div>
        </div>
      );
    }

    const selectedComp = COMPETITIONS.find((c) => c.id === adminCompManageId) || COMPETITIONS[0];
    const visibleLevels =
      adminCompManageLevel === 'ทั้งหมด'
        ? selectedComp.levels
        : selectedComp.levels.filter((l) => l === adminCompManageLevel);

    const compRegistrations = registrations.filter(
      (r) =>
        r.competitionId === selectedComp.id &&
        (adminCompManageLevel === 'ทั้งหมด' ? true : r.level === adminCompManageLevel)
    );

    const hasCustomCriteria =
      Array.isArray(customCriteriaByComp[selectedComp.id]) &&
      customCriteriaByComp[selectedComp.id].length > 0;
    const activeCriteriaList = getCompetitionCriteria(selectedComp.id, customCriteriaByComp);
    const activeCriteriaTotal = activeCriteriaList.reduce(
      (sum, item) => sum + (Number(item.max) || 0),
      0
    );

    const handleAddOrUpdateCriterion = (e) => {
      e.preventDefault();
      const trimmedLabel = newCriterionLabel.trim();
      const numericMax = Number(newCriterionMax);

      if (!trimmedLabel) {
        showToast('กรุณาระบุชื่อเกณฑ์การตัดสิน', 'error');
        return;
      }
      if (!numericMax || Number.isNaN(numericMax) || numericMax <= 0) {
        showToast('กรุณาระบุคะแนนเต็มของเกณฑ์มากกว่า 0', 'error');
        return;
      }

      const baseList = hasCustomCriteria
        ? [...customCriteriaByComp[selectedComp.id]]
        : getCompetitionCriteria(selectedComp.id, null).map((c) => ({
            key: c.key,
            label: c.label,
            max: c.max,
            maxLabel: `${c.max} คะแนน`
          }));

      if (editingCriterionIdx !== null && baseList[editingCriterionIdx]) {
        const existingKey = baseList[editingCriterionIdx].key;
        baseList[editingCriterionIdx] = {
          key: existingKey,
          label: trimmedLabel,
          max: numericMax,
          maxLabel: `${numericMax} คะแนน`
        };
        setCustomCriteriaByComp((prev) => ({
          ...prev,
          [selectedComp.id]: baseList
        }));
        setEditingCriterionIdx(null);
        setNewCriterionLabel('');
        setNewCriterionMax('10');
        showToast(`แก้ไขเกณฑ์การตัดสินของ "${selectedComp.name}" เรียบร้อยแล้ว`);
        return;
      }

      const nextList = [
        ...baseList,
        {
          key: `crit_${selectedComp.id}_${Date.now()}_${baseList.length + 1}`,
          label: trimmedLabel,
          max: numericMax,
          maxLabel: `${numericMax} คะแนน`
        }
      ];

      setCustomCriteriaByComp((prev) => ({
        ...prev,
        [selectedComp.id]: nextList
      }));
      setNewCriterionLabel('');
      setNewCriterionMax('10');
      showToast(`เพิ่มเกณฑ์การตัดสินใน "${selectedComp.name}" เรียบร้อยแล้ว`);
    };

    const handleStartEditCriterion = (idx) => {
      const target = activeCriteriaList[idx];
      if (!target) return;
      setEditingCriterionIdx(idx);
      setNewCriterionLabel(target.label);
      setNewCriterionMax(String(target.max));
    };

    const handleDeleteCriterion = (idx) => {
      const baseList = hasCustomCriteria
        ? [...customCriteriaByComp[selectedComp.id]]
        : getCompetitionCriteria(selectedComp.id, null).map((c) => ({
            key: c.key,
            label: c.label,
            max: c.max,
            maxLabel: `${c.max} คะแนน`
          }));

      if (baseList.length <= 1) {
        showToast('ต้องมีเกณฑ์การตัดสินอย่างน้อย 1 ข้อ', 'error');
        return;
      }

      const filtered = baseList.filter((_, i) => i !== idx);
      setCustomCriteriaByComp((prev) => ({
        ...prev,
        [selectedComp.id]: filtered
      }));
      if (editingCriterionIdx === idx) {
        setEditingCriterionIdx(null);
        setNewCriterionLabel('');
        setNewCriterionMax('10');
      }
      showToast('ลบเกณฑ์การตัดสินเรียบร้อยแล้ว');
    };

    const handleResetDefaultCriteria = () => {
      setCustomCriteriaByComp((prev) => {
        const next = { ...prev };
        delete next[selectedComp.id];
        return next;
      });
      setEditingCriterionIdx(null);
      setNewCriterionLabel('');
      setNewCriterionMax('10');
      showToast(`คืนค่าเกณฑ์เริ่มต้นของ "${selectedComp.name}" เรียบร้อยแล้ว`);
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-amber-600" />
                <span>การจัดการแข่งขัน</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                เลือกเมนูย่อยเพื่อจัดการใบลงทะเบียน/ใบลงคะแนนรายกิจกรรม หรือกำหนดเกณฑ์การตัดสินแยกตามกิจกรรม
              </p>
            </div>

            {adminCompManageTab === 'sheets' && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => handleDownloadRegistrationSheetPdf(selectedComp.id, adminCompManageLevel)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>โหลดใบลงทะเบียน (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadScoreSheetPdf(selectedComp.id, adminCompManageLevel)}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>จัดสร้างใบลงคะแนน (PDF)</span>
                </button>
              </div>
            )}
          </div>

          {/* Sub-menu Tabs inside การจัดการแข่งขัน */}
          <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-slate-100">
            <button
              type="button"
              onClick={() => setAdminCompManageTab('sheets')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                adminCompManageTab === 'sheets'
                  ? 'bg-white text-amber-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>ใบลงทะเบียน & ใบลงคะแนนรายกิจกรรม</span>
            </button>

            <button
              type="button"
              onClick={() => setAdminCompManageTab('criteria')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                adminCompManageTab === 'criteria'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span>กำหนดเกณฑ์การตัดสิน</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">เลือกกิจกรรมการแข่งขัน</label>
              <select
                value={selectedComp.id}
                onChange={(e) => {
                  setAdminCompManageId(e.target.value);
                  setAdminCompManageLevel('ทั้งหมด');
                  setEditingCriterionIdx(null);
                  setNewCriterionLabel('');
                  setNewCriterionMax('10');
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-amber-500"
              >
                {COMPETITIONS.map((c, idx) => (
                  <option key={c.id} value={c.id}>
                    {idx + 1}. {c.name} ({c.type})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">เลือกระดับชั้น</label>
              <select
                value={adminCompManageLevel}
                onChange={(e) => setAdminCompManageLevel(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-amber-500"
              >
                <option value="ทั้งหมด">ทุกระดับชั้น ({selectedComp.levels.length} ระดับ)</option>
                {selectedComp.levels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Sub-menu: กำหนดเกณฑ์การตัดสิน */}
        {adminCompManageTab === 'criteria' && (
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                  <span>กำหนดเกณฑ์การตัดสิน — {selectedComp.name}</span>
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                  เพิ่ม แก้ไข หรือลบหัวข้อเกณฑ์และคะแนนเต็มของกิจกรรมนี้ (คะแนนรวมปัจจุบัน:{' '}
                  <strong className={activeCriteriaTotal === 100 ? 'text-emerald-700' : 'text-amber-700'}>
                    {activeCriteriaTotal} คะแนน
                  </strong>{' '}
                  • {hasCustomCriteria ? 'กำหนดเองโดยผู้ดูแลระบบ' : 'เกณฑ์เริ่มต้นของระบบ'})
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadScoreSheetPdf(selectedComp.id, adminCompManageLevel)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white px-3.5 py-1.5 text-xs font-bold shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบลงคะแนนตามเกณฑ์ (PDF)</span>
                </button>
                {hasCustomCriteria && (
                  <button
                    type="button"
                    onClick={handleResetDefaultCriteria}
                    className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    คืนค่าเกณฑ์เริ่มต้น
                  </button>
                )}
              </div>
            </div>

            <form onSubmit={handleAddOrUpdateCriterion} className="grid grid-cols-1 md:grid-cols-12 gap-3">
              <div className="md:col-span-7">
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  {editingCriterionIdx !== null ? 'แก้ไขหัวข้อเกณฑ์การตัดสิน *' : 'เพิ่มหัวข้อเกณฑ์การตัดสินใหม่ *'}
                </label>
                <input
                  type="text"
                  value={newCriterionLabel}
                  onChange={(e) => setNewCriterionLabel(e.target.value)}
                  placeholder="เช่น ความถูกต้องตามหลักธรรมะ การใช้ภาษา และการนำเสนอ"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-600 mb-1">คะแนนเต็ม *</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  value={newCriterionMax}
                  onChange={(e) => setNewCriterionMax(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-bold outline-none focus:border-emerald-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-3 flex items-end gap-2">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold py-2.5 px-3.5 text-xs sm:text-sm shadow-sm cursor-pointer"
                >
                  {editingCriterionIdx !== null ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>บันทึกเกณฑ์</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>เพิ่มเกณฑ์</span>
                    </>
                  )}
                </button>

                {editingCriterionIdx !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCriterionIdx(null);
                      setNewCriterionLabel('');
                      setNewCriterionMax('10');
                    }}
                    className="rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 text-xs cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </form>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200/80 overflow-hidden">
              {activeCriteriaList.map((crit, cIdx) => (
                <div
                  key={crit.key || cIdx}
                  className="px-4 py-3 bg-white hover:bg-slate-50/70 flex items-center justify-between gap-3 text-xs sm:text-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0">
                      {cIdx + 1}
                    </span>
                    <span className="font-semibold text-slate-800 truncate">{crit.label}</span>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-bold px-2.5 py-0.5 text-xs">
                      {crit.maxLabel || `${crit.max} คะแนน`}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleStartEditCriterion(cIdx)}
                      className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 cursor-pointer"
                      aria-label="แก้ไขเกณฑ์"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCriterion(cIdx)}
                      className="p-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 cursor-pointer"
                      aria-label="ลบเกณฑ์"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sub-menu: ใบลงทะเบียน & ใบลงคะแนนรายกิจกรรม */}
        {adminCompManageTab === 'sheets' && (
          <div className="space-y-5">
            {visibleLevels.map((lvl) => {
              const levelRegs = compRegistrations.filter((r) => r.level === lvl);
              const levelJudges = judges.filter(
                (j) => j.competitionId === selectedComp.id && j.level === lvl
              );
              const sched = schedules[`${selectedComp.id}__${lvl}`] || {
                venue: EVENT_VENUE_TH,
                timeRange: '08.30 น. เป็นต้นไป'
              };

              return (
                <div key={`${selectedComp.id}__${lvl}`} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                  <div className={`px-5 py-3.5 bg-gradient-to-r ${selectedComp.accentColor} text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2`}>
                    <div>
                      <div className="font-bold text-base">
                        {selectedComp.name} — {lvl}
                      </div>
                      <div className="text-xs text-white/90">
                        สถานที่: {sched.venue} • เวลา: {sched.timeRange} • ผู้เข้าแข่งขัน {levelRegs.length} ทีม/ชุด • กรรมการ {levelJudges.length} ท่าน
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadRegistrationSheetPdf(selectedComp.id, lvl)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-white/95 hover:bg-white text-amber-800 px-3 py-1.5 text-xs font-bold shadow-sm cursor-pointer"
                      >
                        <FileDown className="w-3.5 h-3.5" />
                        <span>ใบลงทะเบียน (PDF)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadScoreSheetPdf(selectedComp.id, lvl)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white px-3 py-1.5 text-xs font-bold shadow-sm cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-emerald-300" />
                        <span>ใบลงคะแนน (PDF)</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 overflow-x-auto">
                    {levelRegs.length === 0 ? (
                      <div className="text-center py-6 text-sm text-slate-400">
                        ยังไม่มีรายการสมัครแข่งขันในระดับชั้นนี้
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse text-xs sm:text-sm">
                        <thead>
                          <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                            <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                            <th className="py-2.5 px-3">โรงเรียน</th>
                            <th className="py-2.5 px-3">รายชื่อผู้เข้าแข่งขัน</th>
                            <th className="py-2.5 px-3">ครูผู้ฝึกสอน</th>
                            <th className="py-2.5 px-3 text-right">คะแนนปัจจุบัน</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {levelRegs.map((reg, idx) => {
                            const sch = schools.find((s) => s.id === reg.schoolId);
                            const calc = calculateNormalizedScore(scores[reg.id]);
                            return (
                              <tr key={reg.id} className="hover:bg-slate-50/60">
                                <td className="py-2.5 px-3 text-center font-bold text-slate-700">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-semibold text-slate-800">{sch?.name || '-'}</td>
                                <td className="py-2.5 px-3 text-slate-700">
                                  {reg.students.map((st) => st.name).join(', ') || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600">
                                  {reg.coaches.map((c) => (typeof c === 'string' ? c : c.name)).join(', ') || '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                                  {calc.judgeCount > 0 ? `${calc.average100.toFixed(2)} คะแนน` : 'รอคะแนน'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderAdminManagePage = () => {
    if (authSession.role !== 'admin') {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <ShieldCheck className="w-8 h-8 text-rose-500 mx-auto" />
          <div className="font-bold text-slate-800">เมนูนี้สำหรับผู้ดูแลระบบ (Admin) เท่านั้น</div>
        </div>
      );
    }

    const handleSaveSchoolAdmin = (e) => {
      e.preventDefault();
      if (!adminSchoolForm.schoolCode.trim() || !adminSchoolForm.name.trim() || !adminSchoolForm.password.trim()) {
        showToast('กรุณากรอกข้อมูลโรงเรียนให้ครบถ้วน', 'error');
        return;
      }
      if (adminSchoolForm.id) {
        setSchools((prev) =>
          prev.map((s) =>
            s.id === adminSchoolForm.id
              ? {
                  ...s,
                  schoolCode: adminSchoolForm.schoolCode.trim(),
                  password: adminSchoolForm.password.trim(),
                  name: adminSchoolForm.name.trim(),
                  director: adminSchoolForm.director.trim(),
                  phone: adminSchoolForm.phone.trim()
                }
              : s
          )
        );
        showToast('แก้ไขข้อมูลโรงเรียนและรหัสผ่านเรียบร้อยแล้ว');
      } else {
        const created = {
          id: `sch-${adminSchoolForm.schoolCode.trim()}-${Date.now()}`,
          schoolCode: adminSchoolForm.schoolCode.trim(),
          password: adminSchoolForm.password.trim(),
          name: adminSchoolForm.name.trim(),
          director: adminSchoolForm.director.trim() || '-',
          phone: adminSchoolForm.phone.trim() || '-'
        };
        setSchools((prev) => [...prev, created]);
        showToast('เพิ่มโรงเรียนเข้าสู่ระบบเรียบร้อยแล้ว');
      }
      setAdminSchoolForm({ id: null, schoolCode: '', password: '', name: '', director: '', phone: '' });
    };

    const handleSaveJudgeAdmin = (e) => {
      e.preventDefault();
      if (!adminJudgeForm.username.trim() || !adminJudgeForm.password.trim() || !adminJudgeForm.name.trim()) {
        showToast('กรุณากรอกข้อมูลกรรมการ Username และ Password ให้ครบถ้วน', 'error');
        return;
      }
      if (adminJudgeForm.id) {
        setJudges((prev) =>
          prev.map((j) =>
            j.id === adminJudgeForm.id
              ? {
                  ...j,
                  username: adminJudgeForm.username.trim(),
                  password: adminJudgeForm.password.trim(),
                  name: adminJudgeForm.name.trim(),
                  position: adminJudgeForm.position.trim(),
                  competitionId: adminJudgeForm.competitionId,
                  level: adminJudgeForm.level,
                  photoUrl: adminJudgeForm.photoUrl
                }
              : j
          )
        );
        showToast('แก้ไขข้อมูลกรรมการเรียบร้อยแล้ว');
      } else {
        setJudges((prev) => [
          ...prev,
          {
            id: `jdg-${Date.now()}`,
            username: adminJudgeForm.username.trim(),
            password: adminJudgeForm.password.trim(),
            name: adminJudgeForm.name.trim(),
            position: adminJudgeForm.position || 'กรรมการตัดสิน',
            competitionId: adminJudgeForm.competitionId,
            level: adminJudgeForm.level,
            photoUrl: adminJudgeForm.photoUrl
          }
        ]);
        showToast('เพิ่มกรรมการตัดสินเรียบร้อยแล้ว');
      }
      setAdminJudgeForm({
        id: null,
        username: '',
        password: '',
        name: '',
        position: 'กรรมการตัดสิน',
        competitionId: COMPETITIONS[0].id,
        level: COMPETITIONS[0].levels[0],
        photoUrl: ''
      });
    };

    const handleBgFileUpload = (file, setter) => {
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        setter(String(reader.result || ''));
        showToast('อัปโหลดภาพพื้นหลังเรียบร้อยแล้ว');
      };
      reader.readAsDataURL(file);
    };

    const selectedJudgeComp = COMPETITIONS.find((c) => c.id === adminJudgeForm.competitionId) || COMPETITIONS[0];
    const visibleJudges = selectedCompFilter === 'all'
      ? judges
      : judges.filter((j) => j.competitionId === selectedCompFilter);

    const controllableMenus = [
      { id: 'student-card', label: 'พิมพ์บัตรผู้เข้าแข่งขัน' },
      { id: 'coach-card', label: 'พิมพ์บัตรครูผู้ฝึกสอน' },
      { id: 'judge-card', label: 'พิมพ์บัตรกรรมการตัดสิน' },
      { id: 'judge-cert', label: 'เกียรติบัตรกรรมการ' },
      { id: 'school-cert', label: 'เกียรติบัตรนักเรียน/ครู/ผอ.' },
      { id: 'school-results', label: 'ผลคะแนนของโรงเรียน' },
      { id: 'results', label: 'ประกาศผลคะแนน' }
    ];

    const toggleMenuPermission = (menuId, label) => {
      setMenuPermissions((prev) => {
        const nextOpen = !prev[menuId];
        showToast(`${nextOpen ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}เมนู "${label}" เรียบร้อยแล้ว`);
        return { ...prev, [menuId]: nextOpen };
      });
    };

    return (
      <div className="space-y-8">
        {/* 0. ควบคุมสิทธิ์เปิด-ปิดเมนูในระบบโดยผู้ดูแลระบบ */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-600" />
                <span>กำหนดเปิด-ปิดเมนูการใช้งาน (สิทธิ์ผู้ดูแลระบบ)</span>
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                ผู้ดูแลระบบสามารถอนุญาตหรือปิดกั้นการเข้าถึงเมนูพิมพ์บัตร เกียรติบัตร และประกาศผลคะแนนได้ทันที
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setMenuPermissions({
                    'student-card': true,
                    'coach-card': true,
                    'judge-card': true,
                    'judge-cert': true,
                    'school-cert': true,
                    'school-results': true,
                    'results': true
                  });
                  showToast('เปิดใช้งานทุกเมนูเรียบร้อยแล้ว');
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 cursor-pointer"
              >
                เปิดทุกเมนู
              </button>
              <button
                type="button"
                onClick={() => {
                  setMenuPermissions({
                    'student-card': false,
                    'coach-card': false,
                    'judge-card': false,
                    'judge-cert': false,
                    'school-cert': false,
                    'school-results': false,
                    'results': false
                  });
                  showToast('ปิดใช้งานเมนูทั้งหมดชั่วคราวเรียบร้อยแล้ว');
                }}
                className="px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 cursor-pointer"
              >
                ปิดทุกเมนู
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {controllableMenus.map((m) => {
              const isOpen = Boolean(menuPermissions[m.id]);
              return (
                <div
                  key={m.id}
                  className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 transition ${
                    isOpen
                      ? 'border-emerald-200 bg-emerald-50/40'
                      : 'border-rose-200 bg-rose-50/40'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-800 truncate">{m.label}</div>
                    <div className={`text-xs font-semibold ${isOpen ? 'text-emerald-700' : 'text-rose-700'}`}>
                      สถานะ: {isOpen ? 'เปิดให้ใช้งาน' : 'ปิดชั่วคราว'}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleMenuPermission(m.id, m.label)}
                    className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white shadow-sm cursor-pointer ${
                      isOpen ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isOpen ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    <span>{isOpen ? 'ปิดเมนู' : 'เปิดเมนู'}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* 1. เปิด-ปิดรับสมัคร & พื้นหลังบัตร/เกียรติบัตร */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-orange-500" />
              <span>กำหนดเปิด-ปิดการรับสมัครแข่งขัน</span>
            </h3>
            <p className="text-sm text-slate-500">
              ควบคุมการเปิดหรือปิดรับสมัครแข่งขันของโรงเรียนในระบบทั้งหมด
            </p>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-bold text-slate-700">
                สถานะปัจจุบัน: {registrationOpen ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร'}
              </span>
              <button
                type="button"
                onClick={() => {
                  setRegistrationOpen((prev) => !prev);
                  showToast(!registrationOpen ? 'เปิดรับสมัครแข่งขันแล้ว' : 'ปิดรับสมัครแข่งขันแล้ว');
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm cursor-pointer ${
                  registrationOpen ? 'bg-rose-600 hover:bg-rose-700' : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {registrationOpen ? 'ปิดรับสมัคร' : 'เปิดรับสมัคร'}
              </button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <ImageIcon className="w-5 h-5 text-amber-500" />
              <span>ตั้งค่าแบนเนอร์ พื้นหลังบัตรทั้ง 3 ประเภท และพื้นหลังเกียรติบัตร</span>
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-sky-300 bg-sky-50/50 hover:bg-sky-50 text-xs font-bold text-sky-800 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{bannerBgUrl ? 'เปลี่ยนรูปแบนเนอร์' : 'อัปโหลดรูปแบนเนอร์'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleBgFileUpload(e.target.files?.[0], setBannerBgUrl)}
                  />
                </label>
                {bannerBgUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setBannerBgUrl('');
                      showToast('ลบรูปภาพแบนเนอร์เรียบร้อยแล้ว');
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    ลบรูปแบนเนอร์ (ใช้ค่าเริ่มต้น)
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-xs font-bold text-amber-800 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{studentCardBgUrl ? 'เปลี่ยนพื้นหลังบัตรประจำตัวผู้เข้าแข่งขัน' : 'พื้นหลังบัตรประจำตัวผู้เข้าแข่งขัน'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleBgFileUpload(e.target.files?.[0], setStudentCardBgUrl)}
                  />
                </label>
                {studentCardBgUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setStudentCardBgUrl('');
                      showToast('ลบพื้นหลังบัตรประจำตัวผู้เข้าแข่งขันเรียบร้อยแล้ว');
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    ลบรูปพื้นหลังบัตรผู้เข้าแข่งขัน
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-xs font-bold text-emerald-800 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{coachCardBgUrl ? 'เปลี่ยนพื้นหลังบัตรประจำตัวครูผู้ฝึกสอน' : 'พื้นหลังบัตรประจำตัวครูผู้ฝึกสอน'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleBgFileUpload(e.target.files?.[0], setCoachCardBgUrl)}
                  />
                </label>
                {coachCardBgUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCoachCardBgUrl('');
                      showToast('ลบพื้นหลังบัตรประจำตัวครูผู้ฝึกสอนเรียบร้อยแล้ว');
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    ลบรูปพื้นหลังบัตรครูผู้ฝึกสอน
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-xs font-bold text-indigo-800 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{judgeCardBgUrl ? 'เปลี่ยนพื้นหลังบัตรประจำตัวกรรมการตัดสิน' : 'พื้นหลังบัตรประจำตัวกรรมการตัดสิน'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleBgFileUpload(e.target.files?.[0], setJudgeCardBgUrl)}
                  />
                </label>
                {judgeCardBgUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setJudgeCardBgUrl('');
                      showToast('ลบพื้นหลังบัตรประจำตัวกรรมการตัดสินเรียบร้อยแล้ว');
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    ลบรูปพื้นหลังบัตรกรรมการตัดสิน
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-50 text-xs font-bold text-teal-800 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{certBgUrl ? 'เปลี่ยนพื้นหลังเกียรติบัตร' : 'อัปโหลดพื้นหลังเกียรติบัตร'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleBgFileUpload(e.target.files?.[0], setCertBgUrl)}
                  />
                </label>
                {certBgUrl && (
                  <button
                    type="button"
                    onClick={() => {
                      setCertBgUrl('');
                      showToast('ลบพื้นหลังเกียรติบัตรเรียบร้อยแล้ว');
                    }}
                    className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    ลบรูปพื้นหลังเกียรติบัตร
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* 2. จัดการระบบโรงเรียน (เพิ่ม แก้ไข รหัสผ่าน) */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <School className="w-5 h-5 text-emerald-600" />
            <span>จัดการระบบโรงเรียน (เพิ่มโรงเรียน / แก้ไขข้อมูลและรหัสผ่าน)</span>
          </h3>

          <form onSubmit={handleSaveSchoolAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="รหัสสถานศึกษา (User)"
              value={adminSchoolForm.schoolCode}
              onChange={(e) => setAdminSchoolForm((p) => ({ ...p, schoolCode: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="ชื่อโรงเรียน"
              value={adminSchoolForm.name}
              onChange={(e) => setAdminSchoolForm((p) => ({ ...p, name: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="ชื่อผู้อำนวยการ"
              value={adminSchoolForm.director}
              onChange={(e) => setAdminSchoolForm((p) => ({ ...p, director: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="รหัสผ่าน (Password)"
              value={adminSchoolForm.password}
              onChange={(e) => setAdminSchoolForm((p) => ({ ...p, password: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm py-2 px-3 cursor-pointer"
              >
                {adminSchoolForm.id ? 'บันทึกแก้ไข' : '+ เพิ่มโรงเรียน'}
              </button>
              {adminSchoolForm.id && (
                <button
                  type="button"
                  onClick={() => setAdminSchoolForm({ id: null, schoolCode: '', password: '', name: '', director: '', phone: '' })}
                  className="rounded-xl bg-slate-100 text-slate-600 px-2.5 text-xs font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-100">
                  <th className="py-2.5 px-3">User (รหัส)</th>
                  <th className="py-2.5 px-3">ชื่อโรงเรียน</th>
                  <th className="py-2.5 px-3">ผู้อำนวยการ</th>
                  <th className="py-2.5 px-3">รหัสผ่าน</th>
                  <th className="py-2.5 px-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {schools.map((s) => (
                  <tr key={s.id}>
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{s.schoolCode}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-800">{s.name}</td>
                    <td className="py-2.5 px-3 text-slate-600">{s.director}</td>
                    <td className="py-2.5 px-3 font-mono text-amber-700">{s.password}</td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => setAdminSchoolForm(s)}
                        className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSchools((prev) => prev.filter((item) => item.id !== s.id));
                          showToast('ลบโรงเรียนเรียบร้อยแล้ว');
                        }}
                        className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3. จัดการระบบกรรมการแบบเต็มรูปแบบ */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-5">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <Gavel className="w-5 h-5 text-sky-600" />
            <span>จัดการระบบกรรมการตัดสินแบบเต็มรูปแบบ (กำหนด User / Password / ตำแหน่ง / กิจกรรม / ระดับ)</span>
          </h3>

          <form onSubmit={handleSaveJudgeAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            <input
              type="text"
              placeholder="Username กรรมการ"
              value={adminJudgeForm.username}
              onChange={(e) => setAdminJudgeForm((p) => ({ ...p, username: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
            <input
              type="text"
              placeholder="Password กรรมการ"
              value={adminJudgeForm.password}
              onChange={(e) => setAdminJudgeForm((p) => ({ ...p, password: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
            <input
              type="text"
              placeholder="ชื่อ-นามสกุล กรรมการ"
              value={adminJudgeForm.name}
              onChange={(e) => setAdminJudgeForm((p) => ({ ...p, name: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
            />
            <select
              value={adminJudgeForm.position}
              onChange={(e) => setAdminJudgeForm((p) => ({ ...p, position: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              <option value="ประธานกรรมการตัดสิน">ประธานกรรมการตัดสิน</option>
              <option value="กรรมการตัดสิน">กรรมการตัดสิน</option>
            </select>
            <select
              value={adminJudgeForm.competitionId}
              onChange={(e) => {
                const nextComp = COMPETITIONS.find((c) => c.id === e.target.value) || COMPETITIONS[0];
                setAdminJudgeForm((p) => ({
                  ...p,
                  competitionId: nextComp.id,
                  level: nextComp.levels[0]
                }));
              }}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              {COMPETITIONS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={adminJudgeForm.level}
              onChange={(e) => setAdminJudgeForm((p) => ({ ...p, level: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
            >
              {selectedJudgeComp.levels.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-sm py-2 px-3 cursor-pointer"
              >
                {adminJudgeForm.id ? 'บันทึก' : '+ เพิ่มกรรมการ'}
              </button>
              {adminJudgeForm.id && (
                <button
                  type="button"
                  onClick={() =>
                    setAdminJudgeForm({
                      id: null,
                      username: '',
                      password: '',
                      name: '',
                      position: 'กรรมการตัดสิน',
                      competitionId: COMPETITIONS[0].id,
                      level: COMPETITIONS[0].levels[0],
                      photoUrl: ''
                    })
                  }
                  className="rounded-xl bg-slate-100 text-slate-600 px-2 text-xs font-bold cursor-pointer"
                >
                  ยกเลิก
                </button>
              )}
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-100">
                  <th className="py-2.5 px-3">User / Pass</th>
                  <th className="py-2.5 px-3">ชื่อกรรมการ</th>
                  <th className="py-2.5 px-3">ตำแหน่ง</th>
                  <th className="py-2.5 px-3">กิจกรรมที่รับผิดชอบ</th>
                  <th className="py-2.5 px-3">ระดับชั้น</th>
                  <th className="py-2.5 px-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {judges.map((j) => {
                  const comp = COMPETITIONS.find((c) => c.id === j.competitionId);
                  return (
                    <tr key={j.id}>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        <strong>{j.username}</strong> / <span className="text-sky-700">{j.password}</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{j.name}</td>
                      <td className="py-2.5 px-3 text-xs font-bold text-indigo-700">{j.position}</td>
                      <td className="py-2.5 px-3 text-slate-700">{comp?.name}</td>
                      <td className="py-2.5 px-3 text-xs font-semibold text-amber-800">{j.level}</td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setAdminJudgeForm(j)}
                          className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setJudges((prev) => prev.filter((item) => item.id !== j.id));
                            showToast('ลบข้อมูลกรรมการเรียบร้อยแล้ว');
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderJudgeScoringPage = () => {
    if (authSession.role !== 'judge' || !currentJudge) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Gavel className="w-8 h-8 text-sky-600 mx-auto" />
          <div className="font-bold text-slate-800">เมนูนี้สำหรับกรรมการตัดสินที่เข้าสู่ระบบแล้วเท่านั้น</div>
        </div>
      );
    }

    const isDharmaQuiz = currentJudge.competitionId === 'comp-7';
    const assignedComp = COMPETITIONS.find((c) => c.id === currentJudge.competitionId);
    const metaKey = `${currentJudge.competitionId}__${currentJudge.level}`;
    const isApprovedByAdmin = Boolean(evalMeta[metaKey]?.approved);
    const criteriaList = isDharmaQuiz
      ? [{ key: 'correctAnswers', label: 'จำนวนข้อสอบที่ตอบถูกต้อง (ลงคะแนนตามข้อที่ตอบถูก)', max: 100, maxLabel: '100 ข้อ/คะแนน' }]
      : getCompetitionCriteria(currentJudge.competitionId, customCriteriaByComp);
    const assignedRegs = registrations.filter(
      (r) => r.competitionId === currentJudge.competitionId && r.level === currentJudge.level
    );

    const computeRowTotal = (regId) => {
      const row = draftCriteriaScores[regId] || {};
      if (isDharmaQuiz) {
        const raw = row.correctAnswers;
        if (raw !== '' && raw !== undefined && !Number.isNaN(Number(raw))) {
          return { total: Number(Number(raw).toFixed(2)), hasAny: true };
        }
        return { total: 0, hasAny: false };
      }
      let sum = 0;
      let hasAny = false;
      criteriaList.forEach((crit) => {
        const raw = row[crit.key];
        if (raw !== '' && raw !== undefined && !Number.isNaN(Number(raw))) {
          sum += Number(raw);
          hasAny = true;
        }
      });
      return { total: Number(sum.toFixed(2)), hasAny };
    };

    const handleCriterionInputChange = (regId, critKey, maxScore, rawVal) => {
      if (rawVal === '') {
        setDraftCriteriaScores((prev) => ({
          ...prev,
          [regId]: {
            ...(prev[regId] || {}),
            [critKey]: ''
          }
        }));
        return;
      }
      const num = Number(rawVal);
      if (Number.isNaN(num)) return;
      if (num < 0 || num > maxScore) {
        showToast(
          isDharmaQuiz
            ? `จำนวนข้อที่ตอบถูกต้องต้องอยู่ระหว่าง 0 - ${maxScore} ข้อ`
            : `คะแนนเกณฑ์นี้ต้องอยู่ระหว่าง 0 - ${maxScore} คะแนน`,
          'error'
        );
        return;
      }
      setDraftCriteriaScores((prev) => ({
        ...prev,
        [regId]: {
          ...(prev[regId] || {}),
          [critKey]: num
        }
      }));
    };

    const handleSaveScores = (e) => {
      e.preventDefault();
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถแก้ไขคะแนนได้', 'error');
        return;
      }
      const nextScores = { ...scores };
      const nextCriteriaDetails = { ...scoreCriteriaDetails };
      const newlySavedIds = [];

      for (const r of assignedRegs) {
        const { total, hasAny } = computeRowTotal(r.id);
        if (!hasAny) continue;
        if (total < 0 || total > 100) {
          showToast(
            isDharmaQuiz
              ? 'จำนวนข้อสอบที่ตอบถูกต้องต้องไม่เกิน 100 ข้อ'
              : 'คะแนนรวมรายข้อต้องไม่เกิน 100 คะแนน',
            'error'
          );
          return;
        }

        const cleanedDetail = {};
        const rowDraft = draftCriteriaScores[r.id] || {};
        criteriaList.forEach((crit) => {
          const val = rowDraft[crit.key];
          if (val !== '' && val !== undefined && !Number.isNaN(Number(val))) {
            cleanedDetail[crit.key] = Number(val);
          }
        });

        nextScores[r.id] = {
          ...(nextScores[r.id] || {}),
          [currentJudge.id]: total
        };
        nextCriteriaDetails[r.id] = {
          ...(nextCriteriaDetails[r.id] || {}),
          [currentJudge.id]: cleanedDetail
        };
        newlySavedIds.push(r.id);
      }

      setScores(nextScores);
      setScoreCriteriaDetails(nextCriteriaDetails);
      if (newlySavedIds.length > 0) {
        setUnlockedScoreCards((prev) => {
          const next = { ...prev };
          newlySavedIds.forEach((id) => {
            delete next[id];
          });
          return next;
        });
      }
      setEvalMeta((prev) => ({
        ...prev,
        [metaKey]: {
          status: prev[metaKey]?.approved ? 'completed' : 'judging',
          approved: Boolean(prev[metaKey]?.approved)
        }
      }));
      showToast(
        isDharmaQuiz
          ? 'บันทึกคะแนนตามจำนวนข้อสอบที่ตอบถูกต้องเรียบร้อยแล้ว'
          : 'บันทึกคะแนนเรียบร้อยแล้ว'
      );
    };

    const handleSaveSingleTeamScore = (regItem) => {
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถแก้ไขคะแนนได้', 'error');
        return;
      }
      const { total, hasAny } = computeRowTotal(regItem.id);
      if (!hasAny) {
        showToast(
          isDharmaQuiz
            ? 'กรุณากรอกจำนวนข้อสอบที่ตอบถูกต้องก่อนบันทึกคะแนน'
            : 'กรุณากรอกคะแนนอย่างน้อย 1 ช่องก่อนบันทึกคะแนน',
          'error'
        );
        return;
      }
      if (total < 0 || total > 100) {
        showToast(
          isDharmaQuiz
            ? 'จำนวนข้อสอบที่ตอบถูกต้องต้องไม่เกิน 100 ข้อ'
            : 'คะแนนรวมรายข้อต้องไม่เกิน 100 คะแนน',
          'error'
        );
        return;
      }

      const cleanedDetail = {};
      const rowDraft = draftCriteriaScores[regItem.id] || {};
      criteriaList.forEach((crit) => {
        const val = rowDraft[crit.key];
        if (val !== '' && val !== undefined && !Number.isNaN(Number(val))) {
          cleanedDetail[crit.key] = Number(val);
        }
      });

      setScores((prev) => ({
        ...prev,
        [regItem.id]: {
          ...(prev[regItem.id] || {}),
          [currentJudge.id]: total
        }
      }));
      setScoreCriteriaDetails((prev) => ({
        ...prev,
        [regItem.id]: {
          ...(prev[regItem.id] || {}),
          [currentJudge.id]: cleanedDetail
        }
      }));
      setUnlockedScoreCards((prev) => {
        const next = { ...prev };
        delete next[regItem.id];
        return next;
      });

      setEvalMeta((prev) => ({
        ...prev,
        [metaKey]: {
          status: prev[metaKey]?.approved ? 'completed' : 'judging',
          approved: Boolean(prev[metaKey]?.approved)
        }
      }));

      const teamSchool = schools.find((s) => s.id === regItem.schoolId);
      const teamLabel = regItem.students.map((s) => s.name).join(', ') || teamSchool?.name || 'ทีมผู้เข้าแข่งขัน';
      showToast(`บันทึกคะแนนของ "${teamLabel}" เรียบร้อยแล้ว`);
    };

    const handleEnableEditTeamScore = (regId) => {
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถแก้ไขคะแนนได้', 'error');
        return;
      }
      setUnlockedScoreCards((prev) => ({
        ...prev,
        [regId]: true
      }));
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 p-6 text-white shadow-md">
          <div className="text-xs font-bold uppercase tracking-wider text-sky-100">
            {isDharmaQuiz
              ? 'ระบบลงคะแนนสำหรับกรรมการตัดสิน (ลงคะแนนตามข้อสอบที่ตอบถูกต้อง)'
              : 'ระบบลงคะแนนสำหรับกรรมการตัดสิน (ตามเกณฑ์ใบลงคะแนน 100 คะแนน)'}
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-1">{currentJudge.name}</h2>
          <p className="text-sm text-sky-100 mt-1">
            รายการที่รับผิดชอบ: <strong>{assignedComp?.name}</strong> • ระดับ: <strong>{currentJudge.level}</strong>
          </p>
          <p className="text-xs text-sky-200 mt-2">
            {isApprovedByAdmin
              ? 'ผลการแข่งขันนี้ได้รับการอนุมัติจากผู้ดูแลระบบแล้ว ระบบล็อกการกรอกและแก้ไขคะแนน'
              : isDharmaQuiz
              ? 'กรอกจำนวนข้อสอบที่ผู้เข้าแข่งขันตอบถูกต้องลงช่องคะแนนได้โดยตรง'
              : 'กรอกคะแนนแยกตามเกณฑ์ในใบลงคะแนน ระบบจะคำนวณคะแนนรวมเต็ม 100 คะแนนให้อัตโนมัติ และบันทึกเกณฑ์รายข้อเข้าระบบ'}
          </p>
        </div>

        {isApprovedByAdmin && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-3 text-rose-800 text-xs sm:text-sm font-bold">
            <Lock className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              ผู้ดูแลระบบอนุมัติผลคะแนนรายการและระดับชั้นนี้แล้ว จึงไม่สามารถบันทึกหรือแก้ไขคะแนนเพิ่มเติมได้
            </span>
          </div>
        )}

        <form onSubmit={handleSaveScores} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          {assignedRegs.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              ยังไม่มีผู้เข้าแข่งขันในรายการและระดับชั้นที่ท่านรับผิดชอบ
            </div>
          ) : (
            <div className="space-y-4">
              {assignedRegs.map((r, idx) => {
                const sch = schools.find((s) => s.id === r.schoolId);
                const { total, hasAny } = computeRowTotal(r.id);
                const hasSavedScore =
                  scores[r.id]?.[currentJudge.id] !== undefined &&
                  scores[r.id]?.[currentJudge.id] !== null;
                const isEditingRow = Boolean(unlockedScoreCards[r.id]) && !isApprovedByAdmin;
                const isInputDisabled = isApprovedByAdmin || (hasSavedScore && !isEditingRow);

                return (
                  <div
                    key={r.id}
                    className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div>
                        <div className="text-xs font-bold text-sky-700">ผู้เข้าแข่งขันชุดที่ {idx + 1}</div>
                        <div className="font-bold text-slate-800 text-base">
                          {r.students.map((s) => s.name).join(', ')}
                        </div>
                        <div className="text-xs text-slate-600">{sch?.name}</div>
                      </div>

                      <div className="rounded-xl bg-sky-50 border border-sky-200 px-4 py-2 text-right shrink-0">
                        <div className="text-[11px] font-semibold text-sky-800">
                          {isDharmaQuiz ? 'คะแนนตามข้อที่ตอบถูก' : 'คะแนนรวมตามเกณฑ์ (เต็ม 100)'}
                        </div>
                        <div className="text-lg font-extrabold text-sky-900">
                          {hasAny ? `${total} ${isDharmaQuiz ? 'ข้อ/คะแนน' : 'คะแนน'}` : '-'}
                        </div>
                      </div>
                    </div>

                    <div className={isDharmaQuiz ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
                      {criteriaList.map((crit) => {
                        const currentVal = draftCriteriaScores[r.id]?.[crit.key] ?? '';
                        return (
                          <div
                            key={crit.key}
                            className="rounded-xl bg-white border border-slate-200/90 p-3 flex items-center justify-between gap-3"
                          >
                            <div className="text-xs text-slate-700 leading-snug">
                              <div className="font-semibold text-slate-800">{crit.label}</div>
                              {!isDharmaQuiz && (
                                <div className="text-[11px] text-slate-500 mt-0.5">เต็ม {crit.maxLabel}</div>
                              )}
                            </div>
                            <input
                              type="number"
                              min="0"
                              max={crit.max}
                              step={isDharmaQuiz ? '1' : '0.5'}
                              disabled={isInputDisabled}
                              value={currentVal}
                              onChange={(e) =>
                                handleCriterionInputChange(r.id, crit.key, crit.max, e.target.value)
                              }
                              placeholder={isDharmaQuiz ? 'จำนวนข้อที่ถูก' : `0-${crit.max}`}
                              className={`w-24 shrink-0 rounded-lg border px-2.5 py-1.5 text-sm font-bold text-right outline-none ${
                                isInputDisabled
                                  ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                                  : 'border-slate-300 bg-slate-50 focus:border-sky-500 focus:bg-white'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-wrap justify-end gap-2 pt-1">
                      {hasSavedScore && !isEditingRow ? (
                        <button
                          type="button"
                          disabled
                          className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 text-white font-bold px-4 py-2 text-xs sm:text-sm shadow-sm cursor-default"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>บันทึกคะแนนแล้ว</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={isApprovedByAdmin}
                          onClick={() => handleSaveSingleTeamScore(r)}
                          className={`inline-flex items-center gap-1.5 rounded-xl font-bold px-4 py-2 text-xs sm:text-sm shadow-sm ${
                            isApprovedByAdmin
                              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                          <span>บันทึกคะแนน</span>
                        </button>
                      )}

                      <button
                        type="button"
                        disabled={isApprovedByAdmin || !hasSavedScore}
                        onClick={() => handleEnableEditTeamScore(r.id)}
                        className={`inline-flex items-center gap-1.5 rounded-xl font-bold px-4 py-2 text-xs sm:text-sm border shadow-sm ${
                          isApprovedByAdmin || !hasSavedScore
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 cursor-pointer'
                        }`}
                      >
                        <Edit3 className="w-4 h-4" />
                        <span>แก้ไขคะแนน</span>
                      </button>
                    </div>
                  </div>
                );
              })}

              <button
                type="submit"
                disabled={isApprovedByAdmin}
                className={`w-full rounded-xl font-bold py-3 text-sm shadow-md ${
                  isApprovedByAdmin
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-95 text-white cursor-pointer'
                }`}
              >
                {isApprovedByAdmin ? 'อนุมัติผลแล้ว (ไม่สามารถแก้ไขคะแนนได้)' : 'บันทึกคะแนน'}
              </button>
            </div>
          )}
        </form>
      </div>
    );
  };

  const renderLoginPage = () => {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <LogIn className="w-6 h-6 text-orange-500" />
            <span>เข้าสู่ระบบ (แยกตามบทบาทผู้ใช้งาน)</span>
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            เลือกประเภทผู้ใช้งานให้ตรงกับสิทธิ์ของท่าน: ผู้ดูแลระบบ, ระบบโรงเรียน, หรือระบบกรรมการตัดสิน
          </p>

          {/* 3 Separate Role Tabs */}
          <div className="grid grid-cols-3 gap-2 mt-5 p-1.5 rounded-2xl bg-slate-100">
            <button
              type="button"
              onClick={() => setLoginTab('admin')}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                loginTab === 'admin' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>ผู้ดูแลระบบ</span>
            </button>

            <button
              type="button"
              onClick={() => setLoginTab('school')}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                loginTab === 'school' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <School className="w-4 h-4 shrink-0" />
              <span>ระบบโรงเรียน</span>
            </button>

            <button
              type="button"
              onClick={() => setLoginTab('judge')}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                loginTab === 'judge' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Gavel className="w-4 h-4 shrink-0" />
              <span>ระบบกรรมการ</span>
            </button>
          </div>

          {/* Tab 1: Admin */}
          {loginTab === 'admin' && (
            <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
                บัญชีทดลองผู้ดูแลระบบ: <strong>admin</strong> / รหัสผ่าน: <strong>1234</strong>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อผู้ใช้ผู้ดูแลระบบ (Admin)</label>
                <input
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="admin"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่าน</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
              >
                เข้าสู่ระบบผู้ดูแลระบบ
              </button>
            </form>
          )}

          {/* Tab 2: School (Login & Sign-up) */}
          {loginTab === 'school' && (
            <div className="mt-6 space-y-4">
              <div className="flex gap-2 border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => setSchoolAuthMode('login')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    schoolAuthMode === 'login' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  เข้าสู่ระบบโรงเรียน
                </button>
                <button
                  type="button"
                  onClick={() => setSchoolAuthMode('register')}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    schoolAuthMode === 'register' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  สมัครใช้งานโรงเรียนใหม่ (1 User / โรงเรียน)
                </button>
              </div>

              {schoolAuthMode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800">
                    ตัวอย่างบัญชีโรงเรียน: รหัสสถานศึกษา <strong>10112201</strong> / รหัสผ่าน: <strong>1234</strong>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">รหัสสถานศึกษา (User)</label>
                    <input
                      type="text"
                      value={loginUser}
                      onChange={(e) => setLoginUser(e.target.value)}
                      placeholder="เช่น 10112201"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่าน</label>
                    <input
                      type="password"
                      value={loginPass}
                      onChange={(e) => setLoginPass(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
                  >
                    เข้าสู่ระบบโรงเรียน
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSchoolSignupSubmit} className="space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      รหัสสถานศึกษา (ใช้เป็น User — โรงเรียนละ 1 User เท่านั้น) *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSchoolForm.schoolCode}
                      onChange={(e) => setNewSchoolForm((p) => ({ ...p, schoolCode: e.target.value }))}
                      placeholder="ระบุรหัสสถานศึกษา 8-10 หลัก"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อโรงเรียน *</label>
                    <input
                      type="text"
                      required
                      value={newSchoolForm.name}
                      onChange={(e) => setNewSchoolForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="ระบุชื่อโรงเรียนเต็ม"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">
                      ชื่อผู้อำนวยการโรงเรียน / ผู้บริหารสถานศึกษา *
                    </label>
                    <input
                      type="text"
                      required
                      value={newSchoolForm.director}
                      onChange={(e) => setNewSchoolForm((p) => ({ ...p, director: e.target.value }))}
                      placeholder="ระบุชื่อผู้อำนวยการโรงเรียน"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">กำหนดรหัสผ่าน *</label>
                    <input
                      type="password"
                      required
                      value={newSchoolForm.password}
                      onChange={(e) => setNewSchoolForm((p) => ({ ...p, password: e.target.value }))}
                      placeholder="กำหนดรหัสผ่านสำหรับเข้าใช้งาน"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
                  >
                    สมัครบัญชีโรงเรียนและเข้าสู่ระบบ
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Tab 3: Judge */}
          {loginTab === 'judge' && (
            <form onSubmit={handleLoginSubmit} className="mt-6 space-y-4">
              <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-800">
                ตัวอย่างบัญชีกรรมการ: <strong>judge1</strong> / รหัสผ่าน: <strong>1234</strong>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Username กรรมการตัดสิน</label>
                <input
                  type="text"
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  placeholder="judge1"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Password กรรมการตัดสิน</label>
                <input
                  type="password"
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
              >
                เข้าสู่ระบบกรรมการตัดสิน
              </button>
            </form>
          )}
        </div>
      </div>
    );
  };

  // ============================================================================
  // 6. MAIN LAYOUT SHELL (Responsive Sidebar + Topbar + Content)
  // ============================================================================

  const renderActiveContent = () => {
    switch (activeMenu) {
      case 'home':
        return renderHomePage();
      case 'register':
        return renderRegisterPage();
      case 'competitions':
        return renderCompetitionsPage();
      case 'schedule':
        return renderSchedulePage();
      case 'by-school':
        return renderBySchoolPage();
      case 'by-activity':
        return renderByActivityPage();
      case 'student-card':
        return renderStudentCardPage();
      case 'coach-card':
        return renderCoachCardPage();
      case 'judge-card':
        return renderJudgeCardPage();
      case 'judge-cert':
        return renderJudgeCertPage();
      case 'school-cert':
        return renderSchoolCertPage();
      case 'school-results':
        return renderSchoolResultsPage();
      case 'results':
        return renderResultsPage();
      case 'admin-competition-manage':
        return renderAdminCompetitionManagePage();
      case 'admin-manage':
        return renderAdminManagePage();
      case 'judge-scoring':
        return renderJudgeScoringPage();
      case 'login':
        return renderLoginPage();
      default:
        return renderHomePage();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 text-amber-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Modern Pop-up Modal for Disabled/Closed Menus */}
      {closedMenuModal && (
        <div
          onClick={() => setClosedMenuModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-100"
          >
            {/* Top Decorative Gradient Header */}
            <div className="bg-gradient-to-br from-rose-500 via-orange-500 to-amber-500 px-6 pt-7 pb-8 text-center text-white relative">
              <button
                type="button"
                onClick={() => setClosedMenuModal(null)}
                aria-label="ปิดหน้าต่างแจ้งเตือน"
                className="absolute top-3.5 right-3.5 rounded-full bg-white/20 hover:bg-white/30 p-1.5 text-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md ring-4 ring-white/25 shadow-lg">
                <Lock className="h-8 w-8 text-white" />
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-0.5 text-xs font-bold tracking-wide">
                <span className="h-2 w-2 rounded-full bg-rose-200 animate-pulse" />
                <span>สถานะเมนู: ปิดชั่วคราว</span>
              </span>
              <h3 className="mt-2.5 text-xl sm:text-2xl font-extrabold tracking-tight">
                ระบบยังไม่เปิดให้ดำเนินการ
              </h3>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-6 text-center space-y-4">
              <div className="rounded-2xl bg-rose-50/70 border border-rose-100 px-4 py-3">
                <div className="text-xs font-semibold text-rose-600">เมนูที่ท่านเลือก</div>
                <div className="mt-0.5 text-base font-bold text-slate-800">
                  {closedMenuModal.menuLabel}
                </div>
              </div>

              <p className="text-sm text-slate-600 leading-relaxed">
                ขณะนี้ผู้ดูแลระบบยังไม่เปิดให้เข้าใช้งานในส่วนนี้ กรุณาติดตามประกาศหรือติดต่อผู้ดูแลระบบเมื่อถึงกำหนดเวลาดำเนินการ
              </p>

              <div className="pt-1 flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={() => setClosedMenuModal(null)}
                  className="w-full rounded-xl bg-gradient-to-r from-slate-800 to-slate-900 hover:from-slate-900 hover:to-black text-white font-bold py-3 text-sm shadow-md transition cursor-pointer"
                >
                  รับทราบและปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Topmost Countdown Bar */}
      <div className="bg-emerald-900 text-emerald-50 border-b border-emerald-800 px-4 py-2 text-xs sm:text-sm">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-end gap-2 sm:gap-3">
          <div className="inline-flex items-center gap-1.5 font-bold text-amber-300">
            <Clock className="w-4 h-4 animate-pulse shrink-0" />
            <span>
              {countdown.isPast
                ? 'ถึงวันจัดการแข่งขันวันมาฆบูชา ครั้งที่ 14 แล้ว!'
                : 'นับถอยหลังสู่วันแข่งขัน (17 กุมภาพันธ์ 2570):'}
            </span>
          </div>

          {!countdown.isPast && (
            <span className="inline-flex items-baseline gap-1.5 bg-emerald-950/80 border border-emerald-700/80 rounded-lg px-3 py-0.5">
              <strong className="text-sm sm:text-base font-extrabold text-amber-300">{countdown.days}</strong>
              <span className="text-xs text-emerald-100">วัน</span>
            </span>
          )}
        </div>
      </div>

      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-30 bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 text-white backdrop-blur border-b border-emerald-700/80 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="lg:hidden p-2 rounded-xl bg-white/15 hover:bg-white/25 text-white cursor-pointer"
            aria-label="เปิดปิดเมนู"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => handleSelectMenu('home')}
            className="flex items-center gap-2.5 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-amber-400/25 text-amber-200 border border-amber-300/40 flex items-center justify-center shadow-sm">
              {/* โลโก้ธรรมจักร (Dhammachakra 8 ซี่) */}
              <svg
                viewBox="0 0 64 64"
                className="w-7 h-7 text-amber-200"
                fill="none"
                stroke="currentColor"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="ธรรมจักร"
              >
                {/* วงล้อชั้นนอกและชั้นใน */}
                <circle cx="32" cy="32" r="22" />
                <circle cx="32" cy="32" r="17" strokeWidth="2" />
                {/* ดุมล้อกลาง */}
                <circle cx="32" cy="32" r="5" fill="currentColor" />
                {/* ซี่ล้ออริยมรรคมีองค์ 8 และปุ่มยอดรอบวง */}
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
              <div className="text-xs sm:text-sm font-bold text-white leading-tight">
                มาฆบูชาคณะสงฆ์อำเภอศีขรภูมิ
              </div>
              <div className="text-[14px] text-emerald-100 hidden sm:block">
                Dashboard ระบบการแข่งขันมาฆบูชา 70
              </div>
            </div>
          </div>
        </div>

        {/* Session Badge & Logout */}
        <div className="flex items-center gap-2.5">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/15 border border-white/25 text-xs">
            <span className="font-bold text-white">{authSession.displayName}</span>
            <span className="text-emerald-100 uppercase">({authSession.role})</span>
          </div>

          {authSession.role !== 'guest' ? (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-rose-700 hover:bg-rose-50 px-3 py-2 text-xs font-bold shadow-sm cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>ออกจากระบบ</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSelectMenu('login')}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 px-3.5 py-2 text-xs font-bold shadow-sm cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>เข้าสู่ระบบ</span>
            </button>
          )}
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* Sidebar (Desktop Fixed + Mobile Drawer) */}
        <aside
          className={`${
            mobileMenuOpen ? 'fixed inset-y-0 left-0 top-[61px] z-40 w-72 flex flex-col' : 'hidden'
          } lg:flex lg:flex-col lg:w-72 shrink-0 bg-white border-r border-slate-200/80 p-4 overflow-y-auto`}
        >
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
              เมนูหลัก ({authSession.role === 'judge' ? 'โหมดกรรมการ' : authSession.role === 'admin' ? 'โหมดผู้ดูแลระบบ' : authSession.role === 'school' ? 'โหมดโรงเรียน' : 'ทั่วไป'})
            </div>
            <nav className="space-y-1">
              {allMenuItems.map((item) => {
                const IconComp = item.icon;
                const isActive = activeMenu === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectMenu(item.id)}
                    className={`w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition text-left cursor-pointer ${
                      isActive
                        ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="flex items-center gap-3 min-w-0">
                      <IconComp className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-amber-600'}`} />
                      <span className="truncate">{item.baseLabel}</span>
                    </span>
                    {item.statusMeta && (
                      <span
                        className={`shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                          item.statusMeta.isOpen
                            ? isActive
                              ? 'bg-emerald-500 text-white border-emerald-300'
                              : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : isActive
                            ? 'bg-rose-600 text-white border-rose-300'
                            : 'bg-rose-100 text-rose-800 border-rose-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            isActive
                              ? 'bg-white'
                              : item.statusMeta.isOpen
                              ? 'bg-emerald-600'
                              : 'bg-rose-600'
                          }`}
                        />
                        <span>{item.statusMeta.statusLabel}</span>
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          {/* User Account Menu (Right Below Main Menu) */}
          <div className="mt-4 pt-4 border-t border-slate-200/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
              ผู้เข้าใช้งานระบบ
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/60 border border-slate-200/90 p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                    authSession.role === 'admin'
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                      : authSession.role === 'school'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                      : authSession.role === 'judge'
                      ? 'bg-gradient-to-br from-sky-500 to-indigo-600'
                      : 'bg-slate-400'
                  }`}
                >
                  {authSession.role === 'admin' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : authSession.role === 'school' ? (
                    <School className="w-5 h-5" />
                  ) : authSession.role === 'judge' ? (
                    <Gavel className="w-5 h-5" />
                  ) : (
                    <Users className="w-5 h-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-slate-800 truncate" title={authSession.displayName}>
                    {authSession.displayName}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        authSession.role === 'guest' ? 'bg-slate-400' : 'bg-emerald-500'
                      }`}
                    />
                    <span>
                      {authSession.role === 'admin'
                        ? 'ผู้ดูแลระบบ (Admin)'
                        : authSession.role === 'school'
                        ? `โรงเรียน (${currentSchool?.schoolCode || 'School'})`
                        : authSession.role === 'judge'
                        ? 'กรรมการตัดสิน'
                        : 'ยังไม่ได้เข้าสู่ระบบ'}
                    </span>
                  </div>
                </div>
              </div>

              {authSession.role === 'guest' ? (
                <button
                  type="button"
                  onClick={() => handleSelectMenu('login')}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white px-3 py-2 text-xs font-bold shadow-xs transition cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>เข้าสู่ระบบ</span>
                </button>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleSelectMenu('login')}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-amber-600" />
                    <span>สลับบัญชี</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center justify-center gap-1 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>ออกระบบ</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Mobile Overlay */}
        {mobileMenuOpen && (
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 top-[61px] bg-slate-900/30 z-30 lg:hidden"
          />
        )}

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderActiveContent()}
        </main>
      </div>

      {/* Standard Application Footer */}
      <footer className="bg-white border-t border-slate-200/90 text-slate-600 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 text-center text-xs text-slate-500">
          © พ.ศ. 2570 ระบบการจัดการแข่งขันวันมาฆบูชา คณะสงฆ์อำเภอศีขรภูมิ จังหวัดสุรินทร์ • สงวนสิทธิ์
        </div>
      </footer>
    </div>
  );
}