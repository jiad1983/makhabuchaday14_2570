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
  ChevronDown,
  MapPin,
  Music,
  Eye,
  EyeOff,
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
  SlidersHorizontal,
  Download,
  KeyRound,
  Phone,
  UserCheck,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronLeft,
  ArrowUpDown,
  Filter,
  Medal,
  UserX,
  ClipboardCheck
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';

// ============================================================================
// 1. MASTER DATA, TYPES & CONSTANTS (รายการแข่งขัน 10 รายการ & ระดับชั้น)
// ============================================================================

type RoleType = 'guest' | 'admin' | 'manager' | 'registrar' | 'school' | 'judge';

interface CompetitionItem {
  id: string;
  name: string;
  type: string;
  teamSize: number;
  levels: string[];
  requiresSongs: boolean;
  accentColor: string;
  badgeBg: string;
}

interface SchoolItem {
  id: string;
  schoolCode: string;
  password: string;
  name: string;
  director: string;
  phone: string;
}

interface JudgeItem {
  id: string;
  username: string;
  password: string;
  name: string;
  position: string;
  competitionId: string;
  level: string;
  schoolId?: string;
  photoUrl: string;
}

interface ManagerItem {
  id: string;
  username: string;
  password: string;
  name: string;
  phone: string;
}

interface RegistrarItem {
  id: string;
  username: string;
  password: string;
  name: string;
  phone: string;
}

interface ScheduleItem {
  venue: string;
  dateLabel: string;
  timeRange: string;
  notes: string;
}

interface StudentMember {
  name: string;
  photoUrl: string;
}

type CoachEntry = string | { name: string; photoUrl?: string };

interface RegistrationItem {
  id: string;
  schoolId: string;
  competitionId: string;
  level: string;
  students: StudentMember[];
  coaches: CoachEntry[];
  qualifyingSong: string;
  finalSong: string;
}

type ScoresMap = Record<string, Record<string, number>>;
type ScoreCriteriaDetailsMap = Record<string, Record<string, Record<string, number>>>;
type SingingRound = 'qualifying' | 'final';
type RoundScoresMap = Record<string, { qualifying?: Record<string, number>; final?: Record<string, number> }>;
type RoundScoreCriteriaDetailsMap = Record<
  string,
  {
    qualifying?: Record<string, Record<string, number>>;
    final?: Record<string, Record<string, number>>;
  }
>;
interface CheckInRecord {
  checkedIn: boolean;
  checkedInAt?: string;
  updatedBy?: string;
}
type CheckInsMap = Record<string, CheckInRecord>;

const MANAGER_ALLOWED_MENUS = [
  'home',
  'register',
  'competitions',
  'schedule',
  'results',
  'judge-card',
  'judge-cert',
  'competition-checkin',
  'score-entry',
  'admin-competition-manage'
];

const REGISTRAR_ALLOWED_MENUS = [
  'home',
  'competitions',
  'schedule',
  'competition-checkin'
];

interface CriterionItem {
  key: string;
  label: string;
  max: number;
  maxLabel?: string;
}

interface EvalMetaItem {
  status: string;
  approved: boolean;
  judgeCompleted?: boolean;
  judgeCompletedAt?: string;
  judgeCompletedBy?: string;
}

type EvalMetaMap = Record<string, EvalMetaItem>;

interface AuthSession {
  role: RoleType;
  userId: string | null;
  displayName: string;
  schoolId: string | null;
  judgeId: string | null;
}

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'error';
}

interface ClosedMenuModalState {
  menuId: string;
  menuLabel: string;
}

interface CertificateItem {
  certNumber: string;
  recipientTypeLabel?: string;
  recipientName: string;
  schoolName: string;
  roleLabel: string;
  activityName: string;
  levelName: string;
  fitSingleLine?: boolean;
  line1Name: string;
  line2Position: string;
  line3Activity: string;
}

interface AdminCredentials {
  username: string;
  password: string;
  displayName: string;
}

interface StorageStats {
  totalUploadFiles: number;
  totalUploadBytes: number;
  categories: Record<string, { files: number; bytes: number }>;
  collections: {
    schools: number;
    judges: number;
    managers?: number;
    registrars?: number;
    registrations: number;
    schedules: number;
    scores: number;
  };
}

interface PrintPreviewDocument {
  title: string;
  bodyHtml: string;
  pageSizeCss: string;
  extraStyleCss: string;
  htmlDoc: string;
}

type BackgroundKey =
  | 'bannerBgUrl'
  | 'studentCardBgUrl'
  | 'coachCardBgUrl'
  | 'judgeCardBgUrl'
  | 'certBgUrl';

const LEGACY_LOCAL_KEYS = [
  'makhapuja_2570_dashboard_v1',
  'makhapuja_2570_core_v1',
  'makhapuja_2570_session_v1',
  'makhapuja_2570_bg_banner',
  'makhapuja_2570_bg_student_card',
  'makhapuja_2570_bg_coach_card',
  'makhapuja_2570_bg_judge_card',
  'makhapuja_2570_bg_cert'
];

async function compressImageFile(file: File, maxDimension = 640, quality = 0.82): Promise<string> {
  const rawDataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้'));
    reader.readAsDataURL(file);
  });

  if (!rawDataUrl || file.type === 'image/svg+xml') {
    return rawDataUrl;
  }

  const isStandardSafeRaw = /^data:image\/(png|jpeg|jpg|gif|webp);base64,/i.test(rawDataUrl);

  return await new Promise<string>((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) {
          resolve(isStandardSafeRaw ? rawDataUrl : '');
          return;
        }
        const scale = Math.min(1, maxDimension / Math.max(w, h));
        const targetW = Math.max(1, Math.round(w * scale));
        const targetH = Math.max(1, Math.round(h * scale));

        if (isStandardSafeRaw && scale === 1 && rawDataUrl.length <= 280_000) {
          resolve(rawDataUrl);
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(isStandardSafeRaw ? rawDataUrl : '');
          return;
        }
        ctx.drawImage(img, 0, 0, targetW, targetH);

        if (file.type === 'image/png') {
          const pngUrl = canvas.toDataURL('image/png');
          if (pngUrl.length <= 550_000) {
            resolve(pngUrl);
            return;
          }
          // Fill white background before JPEG export so transparent PNG borders stay clean
          const jpegCanvas = document.createElement('canvas');
          jpegCanvas.width = targetW;
          jpegCanvas.height = targetH;
          const jCtx = jpegCanvas.getContext('2d');
          if (jCtx) {
            jCtx.fillStyle = '#ffffff';
            jCtx.fillRect(0, 0, targetW, targetH);
            jCtx.drawImage(canvas, 0, 0);
            const jpegUrl = jpegCanvas.toDataURL('image/jpeg', quality);
            resolve(jpegUrl);
            return;
          }
        }

        const jpegUrl = canvas.toDataURL('image/jpeg', quality);
        if (isStandardSafeRaw && jpegUrl.length >= rawDataUrl.length) {
          resolve(rawDataUrl);
        } else {
          resolve(jpegUrl);
        }
      } catch {
        resolve(isStandardSafeRaw ? rawDataUrl : '');
      }
    };
    img.onerror = () => resolve(isStandardSafeRaw ? rawDataUrl : '');
    img.src = rawDataUrl;
  });
}

function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getAppBasePath(): string {
  if (typeof window === 'undefined' || !window.location) return '/';
  const path = window.location.pathname || '/';
  if (path.endsWith('/')) return path;
  if (path.endsWith('/index.html')) return path.slice(0, -'index.html'.length);
  return '/';
}

function getAppBaseHref(): string {
  if (typeof window === 'undefined' || !window.location) return '/';
  try {
    return new URL(getAppBasePath(), window.location.origin).href;
  } catch {
    return '/';
  }
}

function safeImageUrl(value: unknown): string {
  const str = String(value ?? '').trim();
  if (!str) return '';
  if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml)(?:;charset=[^;,]+)?;base64,[A-Za-z0-9+/=]+$/i.test(str)) {
    return str;
  }
  if (/["'<>`\\]/.test(str) || /^javascript:/i.test(str)) {
    return '';
  }
  const basePath = getAppBasePath();
  const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
  if (/^(?:\.\/)?uploads\//i.test(str)) {
    const cleanRel = str.replace(/^\.\//, '');
    return `${normalizedBase}${cleanRel}`;
  }
  if (/^\/uploads\//i.test(str)) {
    return `${normalizedBase}${str.slice(1)}`;
  }
  if (/^(https?:\/\/|\/)/i.test(str)) {
    return str;
  }
  return '';
}

const EVENT_DATE_TH = 'วันพุธที่ 17 กุมภาพันธ์ พ.ศ. 2570';
const EVENT_TITLE_TH = 'งานสัปดาห์ส่งเสริมวันสำคัญทางพระพุทธศาสนาวันมาฆบูชา ครั้งที่ 14 ประจำปี 2570';
const EVENT_VENUE_TH = 'วัดหนองบัว ตำบลหนองบัว อำเภอศีขรภูมิ จังหวัดสุรินทร์';

function getRankAwardLabel(
  rankNum: number | null,
  isAbsent = false,
  hasScore = true,
  otherPrefix: 'อันดับที่' | 'ลำดับที่' = 'อันดับที่'
): string {
  if (isAbsent) return 'ไม่เข้าร่วมแข่งขัน';
  if (!hasScore || !rankNum || rankNum <= 0) return 'เข้าร่วมการแข่งขัน';
  if (rankNum === 1) return 'ชนะเลิศ';
  if (rankNum === 2) return 'รองชนะเลิศอันดับ 1';
  if (rankNum === 3) return 'รองชนะเลิศอันดับ 2';
  if (rankNum === 4) return 'ชมเชยอันดับ 1';
  if (rankNum === 5) return 'ชมเชยอันดับ 2';
  return `${otherPrefix} ${rankNum}`;
}

const LEVELS_STANDARD = [
  'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
  'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
  'มัธยมศึกษาตอนปลาย (ม.4-ม.6)'
];

const LEVELS_UNLIMITED = [
  'ไม่จำกัดระดับ'
];

const COMPETITIONS: CompetitionItem[] = [
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

const INITIAL_SCHOOLS: SchoolItem[] = [
  {
    id: 'sch-10112201',
    schoolCode: '10112201',
    password: '',
    name: 'โรงเรียนสุรินทร์ธรรมวิทยาคม',
    director: 'นายสมชาย ใจดีมีธรรม',
    phone: '044-511-234'
  },
  {
    id: 'sch-10112202',
    schoolCode: '10112202',
    password: '',
    name: 'โรงเรียนศรีณรงค์พุทธอุปถัมภ์',
    director: 'นางสาววิภาดา รักสงบ',
    phone: '044-512-890'
  },
  {
    id: 'sch-10112203',
    schoolCode: '10112203',
    password: '',
    name: 'โรงเรียนปราสาทปัญญาคุณ',
    director: 'นายเกรียงไกร บุญญารักษ์',
    phone: '044-513-456'
  }
];

const INITIAL_JUDGES: JudgeItem[] = [
  {
    id: 'jdg-1',
    username: 'judge1',
    password: '',
    name: 'พระมหาสมปอง ปัญญาธโร',
    position: 'ประธานกรรมการตัดสิน',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    photoUrl: ''
  },
  {
    id: 'jdg-2',
    username: 'judge2',
    password: '',
    name: 'ดร.กัญญาณี สุนทรธรรม',
    position: 'กรรมการตัดสิน',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    photoUrl: ''
  },
  {
    id: 'jdg-3',
    username: 'judge3',
    password: '',
    name: 'อาจารย์ธนวัฒน์ ศรีสวัสดิ์',
    position: 'กรรมการตัดสิน',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    photoUrl: ''
  },
  {
    id: 'jdg-4',
    username: 'judge4',
    password: '',
    name: 'นางสาวพิมพ์ชนก วรรณศิลป์',
    position: 'กรรมการตัดสิน',
    competitionId: 'comp-1',
    level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
    photoUrl: ''
  },
  {
    id: 'jdg-5',
    username: 'judge5',
    password: '',
    name: 'ครูสุรศักดิ์ เสียงไพเราะ',
    position: 'ประธานกรรมการตัดสิน',
    competitionId: 'comp-3',
    level: 'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
    photoUrl: ''
  }
];

const buildInitialSchedules = (): Record<string, ScheduleItem> => {
  const map: Record<string, ScheduleItem> = {};
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

const INITIAL_REGISTRATIONS: RegistrationItem[] = [
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
const INITIAL_SCORES: ScoresMap = {
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

const INITIAL_SCORE_CRITERIA: ScoreCriteriaDetailsMap = {};

function getCompetitionCriteria(
  competitionId: string,
  customCriteriaMap: Record<string, CriterionItem[]> | null = null
): CriterionItem[] {
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
const INITIAL_EVAL_META: EvalMetaMap = {
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
function calculateNormalizedScore(
  scoresObj?: Record<string, number>,
  recusedMap?: Record<string, boolean>
) {
  if (!scoresObj) return { average100: 0, judgeCount: 0, rawSum: 0 };
  const vals = Object.entries(scoresObj)
    .filter(([judgeId, v]) => !recusedMap?.[judgeId] && typeof v === 'number' && !Number.isNaN(v))
    .map(([, v]) => v);
  if (vals.length === 0) return { average100: 0, judgeCount: 0, rawSum: 0 };
  const rawSum = vals.reduce((acc, cur) => acc + cur, 0);
  const average100 = Number((rawSum / vals.length).toFixed(2));
  return { average100, judgeCount: vals.length, rawSum };
}

function isTwoRoundCompetition(compId: string): boolean {
  return compId === 'comp-3' || compId === 'comp-4';
}

function getRegRoundBreakdown(
  compId: string,
  regId: string,
  scoresMap: ScoresMap,
  roundScoresMap: RoundScoresMap,
  recusedJudgesMap?: Record<string, Record<string, boolean>>
) {
  const isTwoRound = isTwoRoundCompetition(compId);
  if (!isTwoRound) {
    return {
      isTwoRound: false,
      activeRound: null as SingingRound | null,
      activeRoundLabel: '',
      qualifyingCalc: { average100: 0, judgeCount: 0, rawSum: 0 },
      finalCalc: { average100: 0, judgeCount: 0, rawSum: 0 }
    };
  }
  const recusedForReg = recusedJudgesMap?.[regId];
  const rs = roundScoresMap[regId] || {};
  const finalScores = rs.final || {};
  const qualScores = rs.qualifying || (Object.keys(finalScores).length === 0 ? scoresMap[regId] || {} : {});
  const qualifyingCalc = calculateNormalizedScore(qualScores, recusedForReg);
  const finalCalc = calculateNormalizedScore(finalScores, recusedForReg);
  const activeRound: SingingRound | null =
    finalCalc.judgeCount > 0 ? 'final' : qualifyingCalc.judgeCount > 0 ? 'qualifying' : null;
  const activeRoundLabel =
    activeRound === 'final' ? 'รอบตัดสิน' : activeRound === 'qualifying' ? 'รอบคัดเลือก' : '';
  return {
    isTwoRound: true,
    activeRound,
    activeRoundLabel,
    qualifyingCalc,
    finalCalc
  };
}

type TwoRoundGroup = 'standard' | 'final_top10' | 'qualifying_rest' | 'pending' | 'absent';

interface RankedCompetitionEntry {
  reg: RegistrationItem;
  isAbsent: boolean;
  hasScore: boolean;
  score: number;
  judgeScores: Record<string, number>;
  rankNum: number | null;
  qualifyingRank: number | null;
  roundGroup: TwoRoundGroup;
  roundInfo: ReturnType<typeof getRegRoundBreakdown>;
}

function buildCompetitionRankedList(
  compId: string,
  level: string,
  registrations: RegistrationItem[],
  scoresMap: ScoresMap,
  roundScoresMap: RoundScoresMap,
  absentMap: Record<string, boolean>,
  recusedJudgesMap?: Record<string, Record<string, boolean>>
): RankedCompetitionEntry[] {
  const normalizedLevel = String(level || '').trim();
  const levelRegs = registrations.filter(
    (r) => r.competitionId === compId && String(r.level || '').trim() === normalizedLevel
  );
  const isTwoRound = isTwoRoundCompetition(compId);

  if (!isTwoRound) {
    const sorted = levelRegs
      .map((reg, idx) => {
        const isAbsent = Boolean(absentMap[reg.id]);
        const recusedForReg = recusedJudgesMap?.[reg.id];
        const rawJudgeScores = isAbsent ? {} : scoresMap[reg.id] || {};
        const filteredJudgeScores: Record<string, number> = {};
        Object.entries(rawJudgeScores).forEach(([jid, val]) => {
          if (!recusedForReg?.[jid]) filteredJudgeScores[jid] = val;
        });
        const calc = isAbsent
          ? { average100: 0, judgeCount: 0 }
          : calculateNormalizedScore(filteredJudgeScores, recusedForReg);
        const hasScore = !isAbsent && calc.judgeCount > 0;
        const roundInfo = getRegRoundBreakdown(compId, reg.id, scoresMap, roundScoresMap, recusedJudgesMap);
        return {
          reg,
          idx,
          isAbsent,
          hasScore,
          score: calc.average100,
          judgeScores: filteredJudgeScores,
          roundInfo
        };
      })
      .sort((a, b) => {
        if (a.isAbsent !== b.isAbsent) return a.isAbsent ? 1 : -1;
        if (a.hasScore !== b.hasScore) return a.hasScore ? -1 : 1;
        if (b.score !== a.score) return b.score - a.score;
        return a.idx - b.idx;
      });

    let rankCounter = 0;
    return sorted.map((item) => {
      if (item.hasScore) rankCounter += 1;
      return {
        reg: item.reg,
        isAbsent: item.isAbsent,
        hasScore: item.hasScore,
        score: item.score,
        judgeScores: item.judgeScores,
        rankNum: item.hasScore ? rankCounter : null,
        qualifyingRank: null,
        roundGroup: item.isAbsent ? 'absent' : item.hasScore ? 'standard' : 'pending',
        roundInfo: item.roundInfo
      };
    });
  }

  const baseItems = levelRegs.map((reg, idx) => {
    const isAbsent = Boolean(absentMap[reg.id]);
    const recusedForReg = recusedJudgesMap?.[reg.id];
    const rs = roundScoresMap[reg.id] || {};
    const rawFinalScores = isAbsent ? {} : rs.final || {};
    const hasRoundStore = Boolean(roundScoresMap[reg.id]);
    const rawQualScores = isAbsent
      ? {}
      : rs.qualifying || (!hasRoundStore || Object.keys(rawFinalScores).length === 0 ? scoresMap[reg.id] || {} : {});
    const finalScores: Record<string, number> = {};
    Object.entries(rawFinalScores).forEach(([jid, val]) => {
      if (!recusedForReg?.[jid]) finalScores[jid] = val;
    });
    const qualScores: Record<string, number> = {};
    Object.entries(rawQualScores).forEach(([jid, val]) => {
      if (!recusedForReg?.[jid]) qualScores[jid] = val;
    });
    const roundInfo = getRegRoundBreakdown(compId, reg.id, scoresMap, roundScoresMap, recusedJudgesMap);
    return {
      reg,
      idx,
      isAbsent,
      qualScores,
      finalScores,
      roundInfo
    };
  });

  const qualifyingRanked = baseItems
    .filter((item) => !item.isAbsent && item.roundInfo.qualifyingCalc.judgeCount > 0)
    .sort((a, b) => {
      if (b.roundInfo.qualifyingCalc.average100 !== a.roundInfo.qualifyingCalc.average100) {
        return b.roundInfo.qualifyingCalc.average100 - a.roundInfo.qualifyingCalc.average100;
      }
      return a.idx - b.idx;
    });

  const qualifyingRankMap: Record<string, number> = {};
  qualifyingRanked.forEach((item, qIdx) => {
    qualifyingRankMap[item.reg.id] = qIdx + 1;
  });
  const hasAnyQualifyingScores = qualifyingRanked.length > 0;

  const finalTop10: Array<{
    reg: RegistrationItem;
    idx: number;
    isAbsent: boolean;
    hasScore: boolean;
    score: number;
    judgeScores: Record<string, number>;
    qualifyingRank: number | null;
    roundGroup: TwoRoundGroup;
    roundInfo: ReturnType<typeof getRegRoundBreakdown>;
  }> = [];
  const qualifyingRest: typeof finalTop10 = [];
  const pendingItems: typeof finalTop10 = [];
  const absentItems: typeof finalTop10 = [];

  baseItems.forEach((item) => {
    const qRank = qualifyingRankMap[item.reg.id] ?? null;
    if (item.isAbsent) {
      absentItems.push({
        reg: item.reg,
        idx: item.idx,
        isAbsent: true,
        hasScore: false,
        score: 0,
        judgeScores: {},
        qualifyingRank: null,
        roundGroup: 'absent',
        roundInfo: item.roundInfo
      });
      return;
    }

    const hasQual = item.roundInfo.qualifyingCalc.judgeCount > 0;
    const hasFinal = item.roundInfo.finalCalc.judgeCount > 0;
    if (!hasQual && !hasFinal) {
      pendingItems.push({
        reg: item.reg,
        idx: item.idx,
        isAbsent: false,
        hasScore: false,
        score: 0,
        judgeScores: {},
        qualifyingRank: null,
        roundGroup: 'pending',
        roundInfo: item.roundInfo
      });
      return;
    }

    const isTop10Finalist =
      (qRank !== null && qRank <= 10) || (!hasAnyQualifyingScores && hasFinal);

    if (isTop10Finalist) {
      const effectiveScore = hasFinal
        ? item.roundInfo.finalCalc.average100
        : item.roundInfo.qualifyingCalc.average100;
      const effectiveJudgeScores = hasFinal ? item.finalScores : item.qualScores;
      finalTop10.push({
        reg: item.reg,
        idx: item.idx,
        isAbsent: false,
        hasScore: true,
        score: effectiveScore,
        judgeScores: effectiveJudgeScores,
        qualifyingRank: qRank,
        roundGroup: 'final_top10',
        roundInfo: item.roundInfo
      });
    } else {
      qualifyingRest.push({
        reg: item.reg,
        idx: item.idx,
        isAbsent: false,
        hasScore: true,
        score: item.roundInfo.qualifyingCalc.average100,
        judgeScores: item.qualScores,
        qualifyingRank: qRank,
        roundGroup: 'qualifying_rest',
        roundInfo: item.roundInfo
      });
    }
  });

  finalTop10.sort((a, b) => {
    const aHasFinal = a.roundInfo.finalCalc.judgeCount > 0 ? 1 : 0;
    const bHasFinal = b.roundInfo.finalCalc.judgeCount > 0 ? 1 : 0;
    if (bHasFinal !== aHasFinal) return bHasFinal - aHasFinal;
    if (b.score !== a.score) return b.score - a.score;
    if (b.roundInfo.qualifyingCalc.average100 !== a.roundInfo.qualifyingCalc.average100) {
      return b.roundInfo.qualifyingCalc.average100 - a.roundInfo.qualifyingCalc.average100;
    }
    return a.idx - b.idx;
  });

  qualifyingRest.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.idx - b.idx;
  });

  const combined = [...finalTop10, ...qualifyingRest, ...pendingItems, ...absentItems];
  let rankCounter = 0;
  return combined.map((item) => {
    if (item.hasScore) rankCounter += 1;
    return {
      reg: item.reg,
      isAbsent: item.isAbsent,
      hasScore: item.hasScore,
      score: item.score,
      judgeScores: item.judgeScores,
      rankNum: item.hasScore ? rankCounter : null,
      qualifyingRank: item.qualifyingRank,
      roundGroup: item.roundGroup,
      roundInfo: item.roundInfo
    };
  });
}

function buildRankedEntryLookup(
  registrations: RegistrationItem[],
  scoresMap: ScoresMap,
  roundScoresMap: RoundScoresMap,
  absentMap: Record<string, boolean>,
  recusedJudgesMap?: Record<string, Record<string, boolean>>
): Record<string, RankedCompetitionEntry> {
  const map: Record<string, RankedCompetitionEntry> = {};
  const seenKeys = new Set<string>();
  registrations.forEach((r) => {
    const lvl = String(r.level || '').trim();
    const key = `${r.competitionId}__${lvl}`;
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    const list = buildCompetitionRankedList(
      r.competitionId,
      lvl,
      registrations,
      scoresMap,
      roundScoresMap,
      absentMap,
      recusedJudgesMap
    );
    list.forEach((entry) => {
      map[entry.reg.id] = entry;
    });
  });
  return map;
}

/**
 * คำนวณระดับเหรียญรางวัลตามเกณฑ์คะแนน (เต็ม 100)
 * - 80 ขึ้นไป : เหรียญทอง
 * - 70 - 79.99 : เหรียญเงิน
 * - 60 - 69.99 : เหรียญทองแดง
 * - ต่ำกว่า 60 : เข้าร่วม
 */
function getMedalTier(score: number, hasScores = true) {
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
function toThaiDigits(val: unknown) {
  const thaiDigits = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];
  return String(val).replace(/[0-9]/g, (d) => thaiDigits[Number(d)]);
}

/**
 * แปลงตัวเลขในข้อความ HTML ของเอกสารให้เป็นเลขไทย (ยกเว้นภายใน HTML tags และ attributes)
 */
function convertHtmlTextToThaiDigits(htmlString: string) {
  return String(htmlString || '').replace(/(<[^>]+>)|([^<]+)/g, (_match, tag, text) => {
    if (tag) return tag;
    return toThaiDigits(text);
  });
}

function formatCertificateNumber(roleCode: string, sequenceNum: number) {
  const paddedSeq = String(sequenceNum).padStart(3, '0');
  return `เลขที่ จอ.0010.มฆ_${roleCode}_${paddedSeq} /2570`;
}

/**
 * จัดเรียงบัตรเป็นชุดละ 4 ใบในแนวตั้ง (4 ต่อ 1) หรือแยกใบเดี่ยว (1 ต่อ 1)
 */
function buildCardSheetsHtml(cardsArray: string[], layoutMode = '4-up') {
  if (layoutMode === '1-up') {
    return cardsArray
      .map((cardHtml) => `<div class="page-break" style="display:flex;justify-content:center;align-items:center;">${cardHtml}</div>`)
      .join('');
  }

  const sheets: string[] = [];
  for (let i = 0; i < cardsArray.length; i += 4) {
    const chunk = cardsArray.slice(i, i + 4);
    const cells = chunk
      .map(
        (cardHtml) =>
          `<div class="card-slot-4up" style="width:100%;height:100%;min-width:0;min-height:0;display:flex;justify-content:center;align-items:center;">${cardHtml}</div>`
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
 * สร้างเอกสาร HTML พร้อมพิมพ์/บันทึกเป็น PDF ด้วยขนาดกระดาษที่กำหนดอย่างแม่นยำ
 * รองรับ:
 * - บัตรผู้เข้าแข่งขัน / บัตรครูผู้ฝึกสอน / บัตรกรรมการ ขนาด 148.5mm x 105mm (14.85 x 10.5 ซม.) แนวตั้ง
 *   ทั้งแบบ 4 ต่อ 1 (ลงกระดาษ A4 แนวตั้ง แผ่นละ 4 ใบ) และแบบ 1 ต่อ 1
 * - เกียรติบัตร ขนาด A4 แนวนอน (297mm x 210mm)
 * - รายงานผลการแข่งขัน ขนาด A4 แนวตั้ง
 */
function buildPrintableHtmlDoc(
  title: string,
  bodyHtml: string,
  pageSizeCss: string,
  extraStyleCss = '',
  includeToolbar = true
): string {
  const safeTitle = escapeHtml(title);
  const baseHref = escapeHtml(getAppBaseHref());
  const thaiBodyHtml = convertHtmlTextToThaiDigits(bodyHtml);
  return `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
        <base href="${baseHref}" />
        <title>${safeTitle}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Thai:wght@300;400;500;600;700&family=Sarabun:wght@300;400;500;600;700&display=swap" rel="stylesheet" crossorigin="anonymous">
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
            background: #e2e8f0;
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
            padding-bottom: 16px;
          }
          .sheet-wrap > .page-break {
            box-shadow: 0 6px 20px rgba(15, 23, 42, 0.14);
          }
          .a4-4up-sheet {
            width: 297mm;
            height: 210mm;
            background: #ffffff;
            padding: 6mm;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            box-shadow: 0 6px 20px rgba(15, 23, 42, 0.12);
          }
          .a4-4up-sheet.portrait-4up {
            width: 210mm;
            height: 297mm;
            padding: 6mm;
            overflow: hidden;
          }
          .grid-4up {
            width: 100%;
            height: 100%;
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 3mm;
            align-items: center;
            justify-items: center;
          }
          .grid-4up.portrait-grid-4up {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            grid-template-rows: repeat(2, minmax(0, 1fr));
            gap: 4mm;
          }
          .card-slot-4up {
            width: 100%;
            height: 100%;
            min-width: 0;
            min-height: 0;
            display: flex;
            align-items: center;
            justify-content: center;
          }
          .grid-4up .card-item {
            flex-shrink: 0;
            transform: scale(0.66);
            transform-origin: center center;
          }
          .grid-4up.portrait-grid-4up .card-item {
            flex-shrink: 0;
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
              padding-bottom: 0;
            }
            .sheet-wrap > .page-break,
            .a4-4up-sheet {
              box-shadow: none !important;
              page-break-after: always;
              break-after: page;
            }
            .sheet-wrap > .page-break:last-child,
            .a4-4up-sheet:last-child {
              page-break-after: auto;
              break-after: auto;
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
        ${
          includeToolbar
            ? `<div class="print-toolbar">
          <div>
            <strong>${safeTitle}</strong> — เลือก "Save as PDF / บันทึกเป็น PDF" หรือเลือกเครื่องพิมพ์ในหน้าต่างพิมพ์
          </div>
          <button class="print-btn" onclick="triggerPdfPrint()">พิมพ์ / ดาวน์โหลด PDF</button>
        </div>`
            : ''
        }
        <div class="sheet-wrap">
          ${thaiBodyHtml}
        </div>
        ${'<scr' + 'ipt>'}
          function triggerPdfPrint() {
            window.focus();
            window.print();
          }
        ${'</scr' + 'ipt>'}
      </body>
      </html>
    `;
}

// ============================================================================
// 4. MAIN APPLICATION COMPONENT
// ============================================================================

const SESSION_TOKEN_KEY = 'mb_session_token';
const ACTIVE_MENU_KEY = 'mb_active_menu';

function readStoredSessionToken(): string {
  try {
    return localStorage.getItem(SESSION_TOKEN_KEY) || sessionStorage.getItem(SESSION_TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

function persistSessionToken(token: string): void {
  if (!token) return;
  try {
    localStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // ignore storage quota/privacy mode errors
  }
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, token);
  } catch {
    // ignore
  }
}

function clearStoredSessionToken(): void {
  try {
    localStorage.removeItem(SESSION_TOKEN_KEY);
    localStorage.removeItem(ACTIVE_MENU_KEY);
  } catch {
    // ignore
  }
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
    sessionStorage.removeItem(ACTIVE_MENU_KEY);
  } catch {
    // ignore
  }
}

function readStoredActiveMenu(): string {
  try {
    const saved = sessionStorage.getItem(ACTIVE_MENU_KEY) || localStorage.getItem(ACTIVE_MENU_KEY) || '';
    return saved && !saved.startsWith('login') ? saved : 'home';
  } catch {
    return 'home';
  }
}

export default function App() {
  const apiTokenRef = useRef<string>(readStoredSessionToken());
  const restoreBackupInputRef = useRef<HTMLInputElement | null>(null);
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState<boolean>(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState<boolean>(false);
  const [restoreConfirmData, setRestoreConfirmData] = useState<{
    filename: string;
    backup: Record<string, any>;
    schoolsCount: number;
    registrationsCount: number;
    judgesCount: number;
  } | null>(null);

  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>({
    username: 'admin',
    password: '',
    displayName: 'ผู้ดูแลระบบ'
  });

  // ---------------- Session & Navigation State ----------------
  // role: 'guest' | 'admin' | 'manager' | 'registrar' | 'school' | 'judge'
  const [rememberLogin, setRememberLogin] = useState<boolean>(true);
  const [authSession, setAuthSession] = useState<AuthSession>({
    role: 'guest',
    userId: null,
    displayName: 'ผู้เยี่ยมชมทั่วไป',
    schoolId: null,
    judgeId: null
  });

  const [activeMenu, setActiveMenu] = useState<string>(() => readStoredActiveMenu());
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(true);
  const [topLoginMenuOpen, setTopLoginMenuOpen] = useState<boolean>(false);
  const [postLoginRedirect, setPostLoginRedirect] = useState<string | null>(null);

  // ---------------- Print / PDF Preview Modal (Real PDF + Direct Print + HTML Export) ----------------
  const [printPreviewModal, setPrintPreviewModal] = useState<PrintPreviewDocument | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);
  const [pdfProgressText, setPdfProgressText] = useState<string>('');
  const printIframeRef = useRef<HTMLIFrameElement | null>(null);
  const lastDirectPrintDocRef = useRef<PrintPreviewDocument | null>(null);

  const syncDirectPrintRoot = (doc: PrintPreviewDocument) => {
    if (lastDirectPrintDocRef.current === doc && document.getElementById('direct-print-root')) {
      return;
    }

    const styleId = 'direct-print-style';
    const rootId = 'direct-print-root';

    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = styleId;
      document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
      @media screen {
        #${rootId} {
          display: none !important;
        }
      }
      @media print {
        @page {
          size: ${doc.pageSizeCss};
          margin: 0;
        }
        html, body {
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          width: auto !important;
          height: auto !important;
          overflow: visible !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body > *:not(#${rootId}) {
          display: none !important;
        }
        #${rootId} {
          display: block !important;
          position: static !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #ffffff !important;
          color: #0f172a !important;
          font-family: 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', 'Tahoma', sans-serif !important;
        }
        #${rootId} * {
          box-sizing: border-box;
          font-family: 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', 'Tahoma', sans-serif;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #${rootId} h1, #${rootId} h2, #${rootId} h3 {
          font-weight: 700;
        }
        #${rootId} h2 {
          font-size: 1.5em;
        }
        #${rootId} .sheet-wrap {
          display: block !important;
          gap: 0 !important;
          padding: 0 !important;
          margin: 0 !important;
        }
        #${rootId} .sheet-wrap > .page-break,
        #${rootId} .a4-4up-sheet {
          box-shadow: none !important;
          border: none !important;
          page-break-after: always;
          break-after: page;
          margin: 0 auto !important;
        }
        #${rootId} .sheet-wrap > .page-break:last-child,
        #${rootId} .a4-4up-sheet:last-child {
          page-break-after: auto;
          break-after: auto;
        }
        #${rootId} .a4-4up-sheet .page-break {
          page-break-after: auto;
          break-after: auto;
        }
        #${rootId} .a4-4up-sheet {
          width: 297mm;
          height: 210mm;
          background: #ffffff;
          padding: 6mm;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        #${rootId} .a4-4up-sheet.portrait-4up {
          width: 210mm;
          height: 297mm;
          padding: 6mm;
          overflow: hidden;
        }
        #${rootId} .grid-4up {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 3mm;
          align-items: center;
          justify-items: center;
        }
        #${rootId} .grid-4up.portrait-grid-4up {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-rows: repeat(2, minmax(0, 1fr));
          gap: 4mm;
        }
        #${rootId} .card-slot-4up {
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #${rootId} .grid-4up .card-item {
          flex-shrink: 0;
          transform: scale(0.66);
          transform-origin: center center;
        }
        #${rootId} .grid-4up.portrait-grid-4up .card-item {
          flex-shrink: 0;
          transform: scale(0.88);
          transform-origin: center center;
        }
        ${doc.extraStyleCss || ''}
      }
    `;

    let rootEl = document.getElementById(rootId) as HTMLDivElement | null;
    if (!rootEl) {
      rootEl = document.createElement('div');
      rootEl.id = rootId;
      rootEl.setAttribute('aria-hidden', 'true');
      document.body.appendChild(rootEl);
    }
    rootEl.innerHTML = `<div class="sheet-wrap">${convertHtmlTextToThaiDigits(doc.bodyHtml)}</div>`;
    lastDirectPrintDocRef.current = doc;
  };

  React.useEffect(() => {
    if (printPreviewModal) {
      syncDirectPrintRoot(printPreviewModal);
      return;
    }
    const existingRoot = document.getElementById('direct-print-root');
    if (existingRoot && existingRoot.parentNode) {
      existingRoot.parentNode.removeChild(existingRoot);
    }
    const existingStyle = document.getElementById('direct-print-style');
    if (existingStyle && existingStyle.parentNode) {
      existingStyle.parentNode.removeChild(existingStyle);
    }
    lastDirectPrintDocRef.current = null;
  }, [printPreviewModal]);

  React.useEffect(() => {
    return () => {
      const existingRoot = document.getElementById('direct-print-root');
      if (existingRoot && existingRoot.parentNode) {
        existingRoot.parentNode.removeChild(existingRoot);
      }
      const existingStyle = document.getElementById('direct-print-style');
      if (existingStyle && existingStyle.parentNode) {
        existingStyle.parentNode.removeChild(existingStyle);
      }
    };
  }, []);

  const openPrintableDocument = (
    title: string,
    bodyHtml: string,
    pageSizeCss: string,
    extraStyleCss = ''
  ): { ok: boolean; message: string } => {
    try {
      const htmlDoc = buildPrintableHtmlDoc(title, bodyHtml, pageSizeCss, extraStyleCss, false);
      setPrintPreviewModal({ title, bodyHtml, pageSizeCss, extraStyleCss, htmlDoc });
      return { ok: true, message: 'เปิดหน้าตัวอย่างเอกสารพร้อมดาวน์โหลด PDF และสั่งพิมพ์เรียบร้อยแล้ว' };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { ok: false, message: `เกิดข้อผิดพลาดในการสร้างเอกสาร: ${msg}` };
    }
  };

  const handleDownloadActualPdf = async (doc: PrintPreviewDocument | null = printPreviewModal) => {
    if (!doc || isGeneratingPdf) return;
    setIsGeneratingPdf(true);
    setPdfProgressText('กำลังเตรียมหน้าเอกสาร...');

    let host: HTMLDivElement | null = null;
    try {
      const isLandscape = doc.pageSizeCss.includes('landscape');
      const isCard1Up = doc.pageSizeCss.includes('105mm');
      const orientation: 'portrait' | 'landscape' = isLandscape ? 'landscape' : 'portrait';
      const pageW = isLandscape ? 297 : isCard1Up ? 105 : 210;
      const pageH = isLandscape ? 210 : isCard1Up ? 148.5 : 297;

      host = document.createElement('div');
      host.style.cssText =
        'position:fixed; left:-24000px; top:0; z-index:-1; pointer-events:none; background:#ffffff; color:#0f172a; font-family:"Sarabun","Noto Sans Thai","TH Sarabun New","Tahoma",sans-serif;';

      const styleEl = document.createElement('style');
      styleEl.textContent = `
        .pdf-host-wrap * {
          box-sizing: border-box;
          font-family: 'Sarabun', 'Noto Sans Thai', 'TH Sarabun New', 'Tahoma', sans-serif !important;
        }
        .pdf-host-wrap .a4-4up-sheet {
          width: 297mm;
          height: 210mm;
          background: #ffffff;
          padding: 6mm;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          box-shadow: none !important;
        }
        .pdf-host-wrap .a4-4up-sheet.portrait-4up {
          width: 210mm;
          height: 297mm;
          padding: 6mm;
          overflow: hidden;
        }
        .pdf-host-wrap .grid-4up {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 3mm;
          align-items: center;
          justify-items: center;
        }
        .pdf-host-wrap .grid-4up.portrait-grid-4up {
          grid-template-columns: repeat(2, minmax(0, 1fr));
          grid-template-rows: repeat(2, minmax(0, 1fr));
          gap: 4mm;
        }
        .pdf-host-wrap .card-slot-4up {
          width: 100%;
          height: 100%;
          min-width: 0;
          min-height: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pdf-host-wrap .grid-4up .card-item {
          flex-shrink: 0;
          transform: scale(0.66);
          transform-origin: center center;
        }
        .pdf-host-wrap .grid-4up.portrait-grid-4up .card-item {
          flex-shrink: 0;
          transform: scale(0.88);
          transform-origin: center center;
        }
        ${doc.extraStyleCss || ''}
      `;

      const wrap = document.createElement('div');
      wrap.className = 'pdf-host-wrap';
      wrap.style.cssText = 'display:flex; flex-direction:column; align-items:flex-start; gap:0; background:#ffffff;';
      wrap.innerHTML = convertHtmlTextToThaiDigits(doc.bodyHtml);

      host.appendChild(styleEl);
      host.appendChild(wrap);
      document.body.appendChild(host);

      if (document.fonts && document.fonts.ready) {
        await document.fonts.ready;
      }

      const dataUriCache = new Map<string, Promise<string>>();
      const toDataUri = (url: string): Promise<string> => {
        if (!url || url.startsWith('data:')) return Promise.resolve(url);
        let absUrl = url;
        try {
          absUrl = new URL(url, getAppBaseHref()).href;
        } catch {
          absUrl = url;
        }
        const existing = dataUriCache.get(absUrl);
        if (existing) return existing;
        const job = (async () => {
          try {
            const sameOrigin = absUrl.startsWith(window.location.origin);
            const resp = await fetch(absUrl, {
              credentials: sameOrigin ? 'include' : 'omit',
              mode: sameOrigin ? 'same-origin' : 'cors'
            });
            if (!resp.ok) return url;
            const blob = await resp.blob();
            return await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : url);
              reader.onerror = () => resolve(url);
              reader.readAsDataURL(blob);
            });
          } catch {
            return url;
          }
        })();
        dataUriCache.set(absUrl, job);
        return job;
      };

      const imgs = Array.from(wrap.querySelectorAll('img'));
      const bgNodes = Array.from(wrap.querySelectorAll<HTMLElement>('[style*="background-image"]'));

      await Promise.all([
        ...imgs.map(async (img) => {
          const srcAttr = img.getAttribute('src') || '';
          if (srcAttr && !srcAttr.startsWith('data:')) {
            const inlined = await toDataUri(srcAttr);
            if (inlined && inlined !== srcAttr) {
              img.src = inlined;
            }
          }
        }),
        ...bgNodes.map(async (el) => {
          const bg = el.style.backgroundImage || '';
          const match = bg.match(/url\((['"]?)([^'")]+)\1\)/i);
          if (match && match[2] && !match[2].startsWith('data:')) {
            const inlined = await toDataUri(match[2]);
            if (inlined && inlined !== match[2]) {
              el.style.backgroundImage = `url("${inlined}")`;
            }
          }
        })
      ]);

      const refreshedImgs = Array.from(wrap.querySelectorAll('img'));
      if (refreshedImgs.length > 0) {
        await Promise.race([
          Promise.all(
            refreshedImgs.map(
              (img) =>
                new Promise<void>((resolve) => {
                  const finish = () => {
                    if (typeof img.decode === 'function') {
                      img.decode().catch(() => {}).finally(resolve);
                    } else {
                      resolve();
                    }
                  };
                  if (img.complete && img.naturalWidth > 0) {
                    finish();
                    return;
                  }
                  if (img.complete && img.naturalWidth === 0) {
                    resolve();
                    return;
                  }
                  img.onload = finish;
                  img.onerror = () => resolve();
                })
            )
          ),
          new Promise<void>((resolve) => setTimeout(resolve, 8000))
        ]);
      }

      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      const rawChildren = Array.from(wrap.children).filter(
        (el): el is HTMLElement => el instanceof HTMLElement && el.tagName !== 'STYLE'
      );
      const targets: HTMLElement[] = rawChildren.length > 0 ? rawChildren : [wrap];

      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: [pageW, pageH],
        compress: true
      });

      let addedPages = 0;

      for (let i = 0; i < targets.length; i++) {
        setPdfProgressText(`กำลังสร้างไฟล์ PDF (${i + 1}/${targets.length})...`);
        const rawTarget = targets[i];
        const cardInner = isCard1Up ? (rawTarget.querySelector('.card-item') as HTMLElement | null) : null;
        const captureEl = cardInner || rawTarget;

        let canvas: HTMLCanvasElement;
        try {
          canvas = await toCanvas(captureEl, {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            cacheBust: false
          });
        } catch {
          canvas = await toCanvas(captureEl, {
            pixelRatio: 2,
            backgroundColor: '#ffffff',
            skipFonts: true,
            cacheBust: false
          });
        }

        if (!canvas.width || !canvas.height) continue;

        const mmPerPx = pageW / canvas.width;
        const totalMmHeight = canvas.height * mmPerPx;

        if (totalMmHeight <= pageH + 3) {
          if (addedPages > 0) {
            pdf.addPage([pageW, pageH], orientation);
          }
          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 0, 0, pageW, Math.min(pageH, totalMmHeight), undefined, 'FAST');
          addedPages += 1;
        } else {
          const slicePx = Math.max(100, Math.floor(pageH / mmPerPx));
          for (let offsetY = 0; offsetY < canvas.height; offsetY += slicePx) {
            const curSlicePx = Math.min(slicePx, canvas.height - offsetY);
            const curSliceMm = curSlicePx * mmPerPx;
            const sliceCanvas = document.createElement('canvas');
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = curSlicePx;
            const ctx = sliceCanvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
              ctx.drawImage(canvas, 0, offsetY, canvas.width, curSlicePx, 0, 0, canvas.width, curSlicePx);
            }
            if (addedPages > 0) {
              pdf.addPage([pageW, pageH], orientation);
            }
            pdf.addImage(sliceCanvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, Math.min(pageH, curSliceMm), undefined, 'FAST');
            addedPages += 1;
          }
        }
      }

      if (addedPages === 0) {
        showToast('ไม่พบเนื้อหาสำหรับสร้างไฟล์ PDF', 'error');
        return;
      }

      const safeFileName = doc.title.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'document';
      pdf.save(`${safeFileName}.pdf`);
      showToast(`ดาวน์โหลดไฟล์ "${safeFileName}.pdf" เรียบร้อยแล้ว`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`ไม่สามารถสร้างไฟล์ PDF ได้: ${msg}`, 'error');
    } finally {
      if (host && host.parentNode) {
        host.parentNode.removeChild(host);
      }
      setIsGeneratingPdf(false);
      setPdfProgressText('');
    }
  };

  const handlePrintDocument = (doc: PrintPreviewDocument | null = printPreviewModal) => {
    if (!doc) return;
    try {
      syncDirectPrintRoot(doc);

      let beforePrintFired = false;
      const onBeforePrint = () => {
        beforePrintFired = true;
      };
      window.addEventListener('beforeprint', onBeforePrint, { once: true });

      window.focus();
      window.print();

      window.setTimeout(() => {
        window.removeEventListener('beforeprint', onBeforePrint);
        if (!beforePrintFired) {
          let iframePrinted = false;
          try {
            const iframeWin = printIframeRef.current?.contentWindow;
            if (iframeWin) {
              const onIframeBeforePrint = () => {
                iframePrinted = true;
              };
              iframeWin.addEventListener('beforeprint', onIframeBeforePrint, { once: true });
              iframeWin.focus();
              iframeWin.print();
              iframeWin.removeEventListener('beforeprint', onIframeBeforePrint);
            }
          } catch {
            // ignore nested iframe print error
          }

          if (!iframePrinted) {
            showToast(
              'หน้าต่างตัวอย่างนี้ถูกจำกัดการเรียกเครื่องพิมพ์โดยตรง กำลังสร้างไฟล์ PDF ให้สั่งพิมพ์แทน...',
              'error'
            );
            void handleDownloadActualPdf(doc);
          }
        }
      }, 450);
    } catch {
      showToast('เบราว์เซอร์จำกัดการสั่งพิมพ์โดยตรง กำลังสร้างไฟล์ PDF ให้แทน...', 'error');
      void handleDownloadActualPdf(doc);
    }
  };

  // ---------------- System Settings & Backgrounds ----------------
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(true);
  const [menuPermissions, setMenuPermissions] = useState<Record<string, boolean>>({
    'student-card': true,
    'coach-card': true,
    'judge-card': true,
    'judge-cert': true,
    'school-cert': true,
    'school-results': true,
    'results': true
  });
  const [bannerBgUrl, setBannerBgUrl] = useState<string>('');
  const [studentCardBgUrl, setStudentCardBgUrl] = useState<string>('');
  const [coachCardBgUrl, setCoachCardBgUrl] = useState<string>('');
  const [judgeCardBgUrl, setJudgeCardBgUrl] = useState<string>('');
  const [certBgUrl, setCertBgUrl] = useState<string>('');

  // ---------------- Core Domain Entities ----------------
  const [schools, setSchools] = useState<SchoolItem[]>(INITIAL_SCHOOLS);
  const [judges, setJudges] = useState<JudgeItem[]>(INITIAL_JUDGES);
  const [managers, setManagers] = useState<ManagerItem[]>([]);
  const [registrars, setRegistrars] = useState<RegistrarItem[]>([]);
  const [schedules, setSchedules] = useState<Record<string, ScheduleItem>>(() => buildInitialSchedules());
  const [registrations, setRegistrations] = useState<RegistrationItem[]>(INITIAL_REGISTRATIONS);
  const [scores, setScores] = useState<ScoresMap>(INITIAL_SCORES);
  const [scoreCriteriaDetails, setScoreCriteriaDetails] = useState<ScoreCriteriaDetailsMap>(INITIAL_SCORE_CRITERIA);
  const [roundScores, setRoundScores] = useState<RoundScoresMap>({});
  const [roundScoreCriteriaDetails, setRoundScoreCriteriaDetails] = useState<RoundScoreCriteriaDetailsMap>({});
  const [checkIns, setCheckIns] = useState<CheckInsMap>({});
  const [evalMeta, setEvalMeta] = useState<EvalMetaMap>(INITIAL_EVAL_META);
  const [absentRegs, setAbsentRegs] = useState<Record<string, boolean>>({});
  const [recusedJudges, setRecusedJudges] = useState<Record<string, Record<string, boolean>>>({});

  // ---------------- UI Filters & Modals ----------------
  const [toast, setToast] = useState<ToastState | null>(null);
  const [closedMenuModal, setClosedMenuModal] = useState<ClosedMenuModalState | null>(null);
  const [customCriteriaByComp, setCustomCriteriaByComp] = useState<Record<string, CriterionItem[]>>(() => {
    const initialMap: Record<string, CriterionItem[]> = {};
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
  });
  const [newCriterionLabel, setNewCriterionLabel] = useState<string>('');
  const [newCriterionMax, setNewCriterionMax] = useState<string>('10');
  const [editingCriterionIdx, setEditingCriterionIdx] = useState<number | null>(null);
  const [loginTab, setLoginTab] = useState<'admin' | 'manager' | 'registrar' | 'school' | 'judge'>('school');
  const [schoolAuthMode, setSchoolAuthMode] = useState<'login' | 'register'>('login');

  // Filter states for various menus
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ทั้งหมด');
  const [selectedCompFilter, setSelectedCompFilter] = useState<string>('all');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('all');
  const [adminCompManageId, setAdminCompManageId] = useState<string>(COMPETITIONS[0].id);
  const [adminCompManageLevel, setAdminCompManageLevel] = useState<string>('ทั้งหมด');
  const [adminCompManageTab, setAdminCompManageTab] = useState<'sheets' | 'criteria'>('sheets');
  const [compManageRegMode, setCompManageRegMode] = useState<'team' | 'school'>('team');
  const [compManageCheckinFilter, setCompManageCheckinFilter] = useState<'all' | 'checked_in' | 'pending' | 'absent'>('all');
  const [compManageCheckinSearch, setCompManageCheckinSearch] = useState<string>('');
  const [scoreEntryCompId, setScoreEntryCompId] = useState<string>(COMPETITIONS[0].id);
  const [scoreEntryLevel, setScoreEntryLevel] = useState<string>(COMPETITIONS[0].levels[0]);
  const [scoreEntryRound, setScoreEntryRound] = useState<SingingRound>('qualifying');
  const [scoreEntryDraft, setScoreEntryDraft] = useState<Record<string, Record<string, string>>>({});
  const [judgeScoringRound, setJudgeScoringRound] = useState<SingingRound>('qualifying');
  const [cardPrintLayout, setCardPrintLayout] = useState<'4-up' | '1-up'>('4-up');
  const [certRecipientType, setCertRecipientType] = useState<'student' | 'coach' | 'director'>('student');
  const [expandedScheduleKey, setExpandedScheduleKey] = useState<string | null>(null);
  const [resultsSearch, setResultsSearch] = useState<string>('');
  const [resultsApprovalFilter, setResultsApprovalFilter] = useState<string>('all');
  const [resultsPageSize, setResultsPageSize] = useState<number>(25);
  const [resultsPage, setResultsPage] = useState<number>(1);
  const [resultsSort, setResultsSort] = useState<{
    key: 'default' | 'competition' | 'level' | 'teams' | 'scored' | 'approval';
    dir: 'asc' | 'desc';
  }>({ key: 'default', dir: 'asc' });
  const [viewingResultTarget, setViewingResultTarget] = useState<{
    compId: string;
    level: string;
  } | null>(null);
  const [resultsModalSearch, setResultsModalSearch] = useState<string>('');
  const [resultsModalMedalFilter, setResultsModalMedalFilter] = useState<string>('all');
  const [viewingActivityTarget, setViewingActivityTarget] = useState<{
    compId: string;
    level: string;
  } | null>(null);
  const [schoolResultsViewTab, setSchoolResultsViewTab] = useState<'scores' | 'medals'>('scores');
  const [medalSummaryTab, setMedalSummaryTab] = useState<'school' | 'standings'>('school');
  const [medalSummaryFilter, setMedalSummaryFilter] = useState<'all' | 'gold' | 'silver' | 'bronze' | 'participant'>('all');
  const [medalStandingsSearch, setMedalStandingsSearch] = useState<string>('');
  const [judgeAbsentSearch, setJudgeAbsentSearch] = useState<string>('');
  const [judgeAbsentFilter, setJudgeAbsentFilter] = useState<'all' | 'present' | 'absent'>('all');
  const [editingScheduleKey, setEditingScheduleKey] = useState<string | null>(null);
  const [scheduleDrafts, setScheduleDrafts] = useState<Record<string, ScheduleItem>>({});

  // ---------------- Form States ----------------
  // Login form
  const [loginUser, setLoginUser] = useState<string>('');
  const [loginPass, setLoginPass] = useState<string>('');
  const [loginError, setLoginError] = useState<string>('');
  const [showLoginPass, setShowLoginPass] = useState<boolean>(false);
  const [showSignupPass, setShowSignupPass] = useState<boolean>(false);
  const [showSignupConfirmPass, setShowSignupConfirmPass] = useState<boolean>(false);
  const [signupConfirmPass, setSignupConfirmPass] = useState<string>('');

  // Admin: Change Admin credentials form
  const [adminCredForm, setAdminCredForm] = useState({
    currentPass: '',
    newUsername: adminCredentials.username,
    newDisplayName: adminCredentials.displayName,
    newPass: '',
    confirmNewPass: ''
  });

  // School sign-up form
  const [newSchoolForm, setNewSchoolForm] = useState({
    schoolCode: '',
    password: '',
    name: '',
    director: '',
    phone: ''
  });

  // Registration form (สมัครแข่งขัน)
  const [regForm, setRegForm] = useState<{
    editingId: string | null;
    competitionId: string;
    level: string;
    studentNames: string[];
    studentPhotos: string[];
    coachNames: string[];
    coachPhotos: string[];
    qualifyingSong: string;
    finalSong: string;
  }>({
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

  // By-School Inline Registration Edit Modal & Safe Delete Confirmation
  const [confirmDeleteRegId, setConfirmDeleteRegId] = useState<string | null>(null);
  const [bySchoolEditForm, setBySchoolEditForm] = useState<{
    id: string;
    schoolId: string;
    competitionId: string;
    level: string;
    studentNames: string[];
    studentPhotos: string[];
    coachNames: string[];
    coachPhotos: string[];
    qualifyingSong: string;
    finalSong: string;
  } | null>(null);

  // Admin: Add/Edit School modal/form
  const [adminSchoolForm, setAdminSchoolForm] = useState<{
    id: string | null;
    schoolCode: string;
    password: string;
    name: string;
    director: string;
    phone: string;
  }>({
    id: null,
    schoolCode: '',
    password: '',
    name: '',
    director: '',
    phone: ''
  });

  // Admin: Add/Edit Judge form
  const [adminJudgeForm, setAdminJudgeForm] = useState<{
    id: string | null;
    username: string;
    password: string;
    name: string;
    position: string;
    competitionId: string;
    level: string;
    schoolId: string;
    photoUrl: string;
  }>({
    id: null,
    username: '',
    password: '',
    name: '',
    position: 'กรรมการตัดสิน',
    competitionId: COMPETITIONS[0].id,
    level: COMPETITIONS[0].levels[0],
    schoolId: '',
    photoUrl: ''
  });

  // Admin: Add/Edit Manager form
  const [adminManagerForm, setAdminManagerForm] = useState<{
    id: string | null;
    username: string;
    password: string;
    name: string;
    phone: string;
  }>({
    id: null,
    username: '',
    password: '',
    name: '',
    phone: ''
  });

  // Admin: Add/Edit Registrar form
  const [adminRegistrarForm, setAdminRegistrarForm] = useState<{
    id: string | null;
    username: string;
    password: string;
    name: string;
    phone: string;
  }>({
    id: null,
    username: '',
    password: '',
    name: '',
    phone: ''
  });

  // Competition Management inline registration form (ลงทะเบียนเข้าร่วมแข่งขัน ในการจัดการแข่งขัน)
  const [compManageRegForm, setCompManageRegForm] = useState<{
    editingId: string | null;
    schoolId: string;
    level: string;
    studentNames: string[];
    studentPhotos: string[];
    coachNames: string[];
    coachPhotos: string[];
    qualifyingSong: string;
    finalSong: string;
  }>({
    editingId: null,
    schoolId: INITIAL_SCHOOLS[0]?.id || '',
    level: COMPETITIONS[0].levels[0],
    studentNames: [''],
    studentPhotos: [''],
    coachNames: [''],
    coachPhotos: [''],
    qualifyingSong: '',
    finalSong: ''
  });

  // Judge scoring draft state: draftCriteriaScores[regId] = { [criterionKey]: number | '' }
  const [draftCriteriaScores, setDraftCriteriaScores] = useState<Record<string, Record<string, number | ''>>>({});
  // Track which team cards are currently in edit mode after being saved: unlockedScoreCards[regId] = boolean
  const [unlockedScoreCards, setUnlockedScoreCards] = useState<Record<string, boolean>>({});

  const buildJudgeDraftForRound = (
    judgeObj: JudgeItem,
    round: SingingRound,
    regsList: RegistrationItem[],
    criteriaMap: Record<string, CriterionItem[]>,
    detailsMap: ScoreCriteriaDetailsMap,
    totalsMap: ScoresMap,
    rDetailsMap: RoundScoreCriteriaDetailsMap,
    rTotalsMap: RoundScoresMap
  ): Record<string, Record<string, number | ''>> => {
    const isTwoRound = isTwoRoundCompetition(judgeObj.competitionId);
    const criteriaList =
      judgeObj.competitionId === 'comp-7'
        ? [{ key: 'correctAnswers', label: 'จำนวนข้อสอบที่ตอบถูกต้อง (ลงคะแนนตามข้อที่ตอบถูก)', max: 100, maxLabel: '100 ข้อ/คะแนน' }]
        : getCompetitionCriteria(judgeObj.competitionId, criteriaMap);
    const initialDraft: Record<string, Record<string, number | ''>> = {};
    regsList
      .filter((r) => r.competitionId === judgeObj.competitionId && r.level === judgeObj.level)
      .forEach((r) => {
        const hasRoundStore = Boolean(rTotalsMap[r.id] || rDetailsMap[r.id]);
        const existingDetail = isTwoRound
          ? rDetailsMap[r.id]?.[round]?.[judgeObj.id] ??
            (round === 'qualifying' && !hasRoundStore ? detailsMap[r.id]?.[judgeObj.id] : undefined)
          : detailsMap[r.id]?.[judgeObj.id];
        const existingTotal = isTwoRound
          ? rTotalsMap[r.id]?.[round]?.[judgeObj.id] ??
            (round === 'qualifying' && !hasRoundStore ? totalsMap[r.id]?.[judgeObj.id] : undefined)
          : totalsMap[r.id]?.[judgeObj.id];
        const rowDraft: Record<string, number | ''> = {};
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
    return initialDraft;
  };

  const applyAppServerState = (srv: Record<string, any> | null | undefined) => {
    if (!srv || typeof srv !== 'object') return;
    if (srv.authSession && typeof srv.authSession === 'object') {
      setAuthSession(srv.authSession as AuthSession);
    }
    if (srv.adminCredentials && typeof srv.adminCredentials === 'object') {
      const nextAdminCreds: AdminCredentials = {
        username: String(srv.adminCredentials.username || 'admin'),
        password: '',
        displayName: String(srv.adminCredentials.displayName || 'ผู้ดูแลระบบ')
      };
      setAdminCredentials(nextAdminCreds);
      setAdminCredForm((prev) => ({
        ...prev,
        newUsername: nextAdminCreds.username || prev.newUsername,
        newDisplayName: nextAdminCreds.displayName
      }));
    }
    if (typeof srv.registrationOpen === 'boolean') {
      setRegistrationOpen(srv.registrationOpen);
    }
    if (srv.menuPermissions && typeof srv.menuPermissions === 'object') {
      setMenuPermissions((prev) => ({ ...prev, ...srv.menuPermissions }));
    }
    if (srv.backgrounds && typeof srv.backgrounds === 'object') {
      setBannerBgUrl(String(srv.backgrounds.bannerBgUrl || ''));
      setStudentCardBgUrl(String(srv.backgrounds.studentCardBgUrl || ''));
      setCoachCardBgUrl(String(srv.backgrounds.coachCardBgUrl || ''));
      setJudgeCardBgUrl(String(srv.backgrounds.judgeCardBgUrl || ''));
      setCertBgUrl(String(srv.backgrounds.certBgUrl || ''));
    }
    if (Array.isArray(srv.schools)) {
      setSchools(srv.schools);
    }
    if (Array.isArray(srv.judges)) {
      setJudges(srv.judges);
    }
    if (Array.isArray(srv.managers)) {
      setManagers(srv.managers);
    }
    if (Array.isArray(srv.registrars)) {
      setRegistrars(srv.registrars);
    }
    if (srv.schedules && typeof srv.schedules === 'object') {
      setSchedules({ ...buildInitialSchedules(), ...srv.schedules });
    }
    if (Array.isArray(srv.registrations)) {
      setRegistrations(srv.registrations);
    }
    if (srv.scores && typeof srv.scores === 'object') {
      setScores(srv.scores);
    }
    if (srv.scoreCriteriaDetails && typeof srv.scoreCriteriaDetails === 'object') {
      setScoreCriteriaDetails(srv.scoreCriteriaDetails);
    }
    if (srv.roundScores && typeof srv.roundScores === 'object') {
      setRoundScores(srv.roundScores);
    }
    if (srv.roundScoreCriteriaDetails && typeof srv.roundScoreCriteriaDetails === 'object') {
      setRoundScoreCriteriaDetails(srv.roundScoreCriteriaDetails);
    }
    if (srv.checkIns && typeof srv.checkIns === 'object') {
      setCheckIns(srv.checkIns);
    }
    if (srv.evalMeta && typeof srv.evalMeta === 'object') {
      setEvalMeta(srv.evalMeta);
    }
    if (srv.absentRegs && typeof srv.absentRegs === 'object') {
      setAbsentRegs(srv.absentRegs);
    }
    if (srv.recusedJudges && typeof srv.recusedJudges === 'object') {
      setRecusedJudges(srv.recusedJudges);
    }
    if (srv.customCriteriaByComp && typeof srv.customCriteriaByComp === 'object') {
      setCustomCriteriaByComp(srv.customCriteriaByComp);
    }
    setStorageStats(srv.storageStats && typeof srv.storageStats === 'object' ? (srv.storageStats as StorageStats) : null);
  };

  const getAppApiUrl = (endpoint: string): string => {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const basePath = getAppBasePath();
    const normalizedBase = basePath.endsWith('/') ? basePath : `${basePath}/`;
    return `${normalizedBase}api/app${cleanEndpoint}`;
  };

  const appApiCall = async <T = Record<string, any>>(
    endpoint: string,
    body?: unknown,
    method: 'GET' | 'POST' = 'POST'
  ): Promise<T & { ok?: boolean; error?: string; message?: string; token?: string; state?: Record<string, any> }> => {
    const headers: Record<string, string> = {
      'X-Requested-With': 'XMLHttpRequest'
    };
    const activeToken = apiTokenRef.current || readStoredSessionToken();
    if (activeToken) {
      apiTokenRef.current = activeToken;
      headers.Authorization = `Bearer ${activeToken}`;
      headers['X-App-Token'] = activeToken;
    }
    if (method === 'POST') {
      headers['Content-Type'] = 'application/json';
    }
    const resp = await fetch(getAppApiUrl(endpoint), {
      method,
      credentials: 'include',
      headers,
      body: method === 'POST' ? JSON.stringify(body ?? {}) : undefined
    });
    const contentType = resp.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await resp.json().catch(() => ({})) : {};
    if (resp.status === 404 || (resp.ok && !isJson)) {
      throw new Error(
        data?.error ||
          'ไม่พบระบบหลังบ้านบนเซิร์ฟเวอร์ (404) — หากใช้งานบนโฮสต์ PHP กรุณาอัปโหลดไฟล์ในโฟลเดอร์ php-app/ หรือรันเซิร์ฟเวอร์ Node.js ด้วยคำสั่ง npm start'
      );
    }
    if (!resp.ok || data?.ok === false) {
      throw new Error(data?.error || `เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ (${resp.status})`);
    }
    if (typeof data?.token === 'string' && data.token) {
      apiTokenRef.current = data.token;
      persistSessionToken(data.token);
    }
    if (data?.state) {
      applyAppServerState(data.state);
    }
    return data;
  };

  const uploadImageToServer = async (
    file: File,
    category: 'students' | 'coaches' | 'judges' | 'backgrounds',
    maxDim = 600,
    quality = 0.85
  ): Promise<string> => {
    setIsUploadingImage(true);
    try {
      const compressed = await compressImageFile(file, maxDim, quality);
      if (!compressed || !compressed.startsWith('data:image/')) {
        throw new Error('ไฟล์รูปภาพไม่ถูกต้อง รองรับ PNG, JPG, GIF หรือ WebP');
      }
      const res = await appApiCall<{ url?: string }>('/upload-image', { category, dataUrl: compressed });
      const uploadedUrl = safeImageUrl(res.url || '');
      if (!uploadedUrl) {
        throw new Error('ไม่สามารถบันทึกไฟล์รูปภาพบนเซิร์ฟเวอร์ได้');
      }
      showToast('อัปโหลดและบันทึกไฟล์ภาพลงบนเซิร์ฟเวอร์เรียบร้อยแล้ว');
      return uploadedUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถอัปโหลดรูปภาพได้';
      showToast(msg, 'error');
      return '';
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleDownloadServerBackup = async () => {
    try {
      const headers: Record<string, string> = { 'X-Requested-With': 'XMLHttpRequest' };
      const activeToken = apiTokenRef.current || readStoredSessionToken();
      if (activeToken) {
        apiTokenRef.current = activeToken;
        headers.Authorization = `Bearer ${activeToken}`;
        headers['X-App-Token'] = activeToken;
      }
      const resp = await fetch(getAppApiUrl('/admin/backup'), {
        method: 'GET',
        credentials: 'include',
        headers
      });
      if (!resp.ok) {
        throw new Error('ไม่สามารถดาวน์โหลดไฟล์สำรองข้อมูลได้');
      }
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `makhapuja_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('ดาวน์โหลดไฟล์สำรองข้อมูลระบบเรียบร้อยแล้ว');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการสำรองข้อมูล', 'error');
    }
  };

  const handleSelectRestoreBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('รูปแบบไฟล์ JSON ไม่ถูกต้อง');
      }
      const hasCore =
        Array.isArray(parsed.schools) ||
        Array.isArray(parsed.registrations) ||
        (parsed.schedules && typeof parsed.schedules === 'object');
      if (!hasCore) {
        throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองข้อมูลของระบบการแข่งขัน');
      }
      setRestoreConfirmData({
        filename: file.name,
        backup: parsed,
        schoolsCount: Array.isArray(parsed.schools) ? parsed.schools.length : 0,
        registrationsCount: Array.isArray(parsed.registrations) ? parsed.registrations.length : 0,
        judgesCount: Array.isArray(parsed.judges) ? parsed.judges.length : 0
      });
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ไม่สามารถอ่านไฟล์ JSON สำรองข้อมูลได้', 'error');
    }
  };

  const handleConfirmRestoreBackup = async () => {
    if (!restoreConfirmData) return;
    setIsRestoringBackup(true);
    try {
      const res = await appApiCall<{ message?: string }>('/admin/restore', {
        backup: restoreConfirmData.backup
      });
      setRestoreConfirmData(null);
      showToast(res.message || 'นำเข้าและกู้คืนข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ไม่สามารถกู้คืนข้อมูลจากไฟล์สำรองได้', 'error');
    } finally {
      setIsRestoringBackup(false);
    }
  };

  React.useEffect(() => {
    LEGACY_LOCAL_KEYS.forEach((k) => {
      try {
        localStorage.removeItem(k);
      } catch {
        // ignore storage errors
      }
    });
    let cancelled = false;
    (async () => {
      try {
        const headers: Record<string, string> = {};
        const storedTok = apiTokenRef.current || readStoredSessionToken();
        if (storedTok) {
          apiTokenRef.current = storedTok;
          headers.Authorization = `Bearer ${storedTok}`;
          headers['X-App-Token'] = storedTok;
        }
        const resp = await fetch(getAppApiUrl('/bootstrap'), {
          credentials: 'include',
          headers
        });
        if (!resp.ok || cancelled) return;
        const data = await resp.json();
        if (!cancelled && data?.ok && data?.state) {
          const restoredRole = (data.state?.authSession?.role || 'guest') as RoleType;
          if (restoredRole === 'guest') {
            apiTokenRef.current = '';
            clearStoredSessionToken();
            setActiveMenu((cur) =>
              ['home', 'competitions', 'schedule', 'results', 'register', 'login', 'login-admin', 'login-manager', 'login-registrar', 'login-school', 'login-judge'].includes(cur) ? cur : 'home'
            );
          } else {
            if (typeof data?.token === 'string' && data.token) {
              apiTokenRef.current = data.token;
              persistSessionToken(data.token);
            }
            if (restoredRole === 'manager') {
              setActiveMenu((cur) =>
                MANAGER_ALLOWED_MENUS.includes(cur) ? cur : 'admin-competition-manage'
              );
            } else if (restoredRole === 'registrar') {
              setActiveMenu((cur) =>
                REGISTRAR_ALLOWED_MENUS.includes(cur) ? cur : 'competition-checkin'
              );
            }
          }
          if (restoredRole === 'judge') {
            const loggedJudgeId = data.state?.authSession?.judgeId;
            const srvJudges: JudgeItem[] = Array.isArray(data.state?.judges) ? data.state.judges : [];
            const foundJudge = srvJudges.find((j) => j.id === loggedJudgeId);
            const srvRegs: RegistrationItem[] = Array.isArray(data.state?.registrations) ? data.state.registrations : [];
            const srvCriteria = data.state?.customCriteriaByComp || customCriteriaByComp;
            const srvDetails = data.state?.scoreCriteriaDetails || {};
            const srvScores = data.state?.scores || {};
            const srvRoundDetails = data.state?.roundScoreCriteriaDetails || {};
            const srvRoundScores = data.state?.roundScores || {};
            if (foundJudge) {
              setDraftCriteriaScores(
                buildJudgeDraftForRound(
                  foundJudge,
                  'qualifying',
                  srvRegs,
                  srvCriteria,
                  srvDetails,
                  srvScores,
                  srvRoundDetails,
                  srvRoundScores
                )
              );
            }
          }
          applyAppServerState(data.state);
        }
      } catch {
        // keep default view if offline during boot
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (!activeMenu || activeMenu.startsWith('login')) return;
    try {
      sessionStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
      localStorage.setItem(ACTIVE_MENU_KEY, activeMenu);
    } catch {
      // ignore storage errors
    }
  }, [activeMenu]);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
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
    const getStatusMeta = (id: string) => {
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
      { id: 'home', baseLabel: 'หน้าแรก', icon: Home, roles: ['guest', 'admin', 'manager', 'registrar', 'school', 'judge'] },
      {
        id: 'register',
        baseLabel: 'ระบบสมัครแข่งขัน',
        icon: registrationOpen ? UserPlus : Lock,
        roles: ['guest', 'admin', 'manager', 'school']
      },
      { id: 'competitions', baseLabel: 'รายการแข่งขัน', icon: ListChecks, roles: ['guest', 'admin', 'manager', 'registrar', 'school', 'judge'] },
      { id: 'schedule', baseLabel: 'ตารางการแข่งขัน', icon: Calendar, roles: ['guest', 'admin', 'manager', 'registrar', 'school', 'judge'] },
      { id: 'by-school', baseLabel: 'รายชื่อแยกตามโรงเรียน', icon: Users, roles: ['admin', 'school'] },
      { id: 'by-activity', baseLabel: 'รายชื่อแยกตามกิจกรรม', icon: Layers, roles: ['admin', 'school'] },
      { id: 'student-card', baseLabel: 'พิมพ์บัตรผู้เข้าแข่งขัน', icon: IdCard, roles: ['admin', 'school'] },
      { id: 'coach-card', baseLabel: 'พิมพ์บัตรครูผู้ฝึกสอน', icon: IdCard, roles: ['admin', 'school'] },
      { id: 'judge-card', baseLabel: 'พิมพ์บัตรกรรมการตัดสิน', icon: IdCard, roles: ['admin', 'manager', 'judge'] },
      { id: 'judge-cert', baseLabel: 'เกียรติบัตรกรรมการ', icon: Award, roles: ['admin', 'manager', 'judge'] },
      { id: 'school-cert', baseLabel: 'เกียรติบัตรนักเรียน/ครู/ผอ.โรงเรียน', icon: Award, roles: ['admin', 'school'] },
      { id: 'school-results', baseLabel: 'ผลคะแนนของโรงเรียน', icon: Trophy, roles: ['admin', 'school'] },
      { id: 'results', baseLabel: 'ประกาศผลคะแนน', icon: Trophy, roles: ['guest', 'admin', 'manager', 'judge'] },
      { id: 'competition-checkin', baseLabel: 'ลงทะเบียนเข้าร่วมแข่งขัน', icon: ClipboardCheck, roles: ['admin', 'manager', 'registrar'] },
      { id: 'score-entry', baseLabel: 'บันทึกผลคะแนนการแข่งขัน', icon: Edit3, roles: ['admin', 'manager'] },
      { id: 'admin-competition-manage', baseLabel: 'การจัดการแข่งขัน', icon: FileText, roles: ['admin', 'manager'] },
      { id: 'admin-manage', baseLabel: 'จัดการระบบ (Admin)', icon: ShieldCheck, roles: ['admin'] },
      { id: 'judge-scoring', baseLabel: 'ลงคะแนนตัดสิน (กรรมการ)', icon: Gavel, roles: ['judge'] },
      { id: 'judge-absent', baseLabel: 'แจ้งไม่เข้าร่วมแข่งขัน', icon: UserX, roles: ['judge'] },
      { id: 'login', baseLabel: authSession.role === 'guest' ? 'เข้าสู่ระบบ' : 'เปลี่ยนบัญชี/เข้าสู่ระบบ', icon: LogIn, roles: ['guest', 'admin', 'manager', 'registrar', 'school', 'judge'] }
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

  const handleSelectMenu = (menuId: string) => {
    const isLoginTarget =
      menuId === 'login' ||
      menuId === 'login-admin' ||
      menuId === 'login-manager' ||
      menuId === 'login-registrar' ||
      menuId === 'login-school' ||
      menuId === 'login-judge';

    if (authSession.role === 'manager' && !MANAGER_ALLOWED_MENUS.includes(menuId) && !isLoginTarget) {
      setTopLoginMenuOpen(false);
      setActiveMenu('admin-competition-manage');
      setMobileMenuOpen(false);
      return;
    }

    if (authSession.role === 'registrar' && !REGISTRAR_ALLOWED_MENUS.includes(menuId) && !isLoginTarget) {
      setTopLoginMenuOpen(false);
      setActiveMenu('competition-checkin');
      setMobileMenuOpen(false);
      return;
    }

    if (
      authSession.role !== 'admin' &&
      authSession.role !== 'manager' &&
      authSession.role !== 'registrar' &&
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
    if (isLoginTarget) {
      setLoginError('');
      setLoginUser('');
      setLoginPass('');
      setShowLoginPass(false);
      setTopLoginMenuOpen(false);
      if (menuId === 'login-admin') setLoginTab('admin');
      else if (menuId === 'login-manager') setLoginTab('manager');
      else if (menuId === 'login-registrar') setLoginTab('registrar');
      else if (menuId === 'login-school') setLoginTab('school');
      else if (menuId === 'login-judge') setLoginTab('judge');
      if (activeMenu && !activeMenu.startsWith('login') && activeMenu !== 'home') {
        setPostLoginRedirect(activeMenu);
      }
    } else {
      setTopLoginMenuOpen(false);
    }
    setActiveMenu(menuId);
    setMobileMenuOpen(false);
    if (menuId === 'judge-scoring' && currentJudge) {
      setUnlockedScoreCards({});
      setDraftCriteriaScores(
        buildJudgeDraftForRound(
          currentJudge,
          judgeScoringRound,
          registrations,
          customCriteriaByComp,
          scoreCriteriaDetails,
          scores,
          roundScoreCriteriaDetails,
          roundScores
        )
      );
    }
  };

  // ---------------- Authentication Handlers ----------------
  const resolvePostLoginMenu = (role: RoleType, fallbackMenu: string): string => {
    if (!postLoginRedirect) return fallbackMenu;
    const roleAllowedMenus: Record<RoleType, string[]> = {
      guest: ['home', 'competitions', 'schedule', 'results'],
      admin: [
        'register',
        'by-school',
        'by-activity',
        'student-card',
        'coach-card',
        'judge-card',
        'judge-cert',
        'school-cert',
        'school-results',
        'results',
        'competition-checkin',
        'score-entry',
        'admin-competition-manage',
        'admin-manage',
        'competitions',
        'schedule'
      ],
      manager: MANAGER_ALLOWED_MENUS,
      registrar: REGISTRAR_ALLOWED_MENUS,
      school: ['register', 'by-school', 'by-activity', 'student-card', 'coach-card', 'school-cert', 'school-results', 'competitions', 'schedule'],
      judge: ['judge-card', 'judge-cert', 'judge-scoring', 'judge-absent', 'results', 'competitions', 'schedule']
    };
    const allowed = roleAllowedMenus[role] || [];
    return allowed.includes(postLoginRedirect) ? postLoginRedirect : fallbackMenu;
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const u = loginUser.trim();
    const p = loginPass.trim();
    setLoginError('');

    if (!u || !p) {
      const msg = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน';
      setLoginError(msg);
      showToast(msg, 'error');
      return;
    }

    try {
      const res = await appApiCall('/login', {
        loginTab,
        username: u,
        password: p,
        remember: rememberLogin
      });
      const nextRole = (res.state?.authSession?.role || loginTab) as RoleType;
      if (nextRole === 'judge') {
        const loggedJudgeId = res.state?.authSession?.judgeId;
        const srvJudges: JudgeItem[] = Array.isArray(res.state?.judges) ? res.state.judges : judges;
        const foundJudge = srvJudges.find((j) => j.id === loggedJudgeId);
        const srvRegs: RegistrationItem[] = Array.isArray(res.state?.registrations) ? res.state.registrations : registrations;
        const srvCriteria = res.state?.customCriteriaByComp || customCriteriaByComp;
        const srvDetails = res.state?.scoreCriteriaDetails || scoreCriteriaDetails;
        const srvScores = res.state?.scores || scores;
        const srvRoundDetails = res.state?.roundScoreCriteriaDetails || roundScoreCriteriaDetails;
        const srvRoundScores = res.state?.roundScores || roundScores;
        if (foundJudge) {
          setJudgeScoringRound('qualifying');
          setUnlockedScoreCards({});
          setDraftCriteriaScores(
            buildJudgeDraftForRound(
              foundJudge,
              'qualifying',
              srvRegs,
              srvCriteria,
              srvDetails,
              srvScores,
              srvRoundDetails,
              srvRoundScores
            )
          );
        }
      }

      setLoginUser('');
      setLoginPass('');
      setShowLoginPass(false);
      const fallbackMenu =
        nextRole === 'admin'
          ? 'admin-manage'
          : nextRole === 'manager'
          ? 'admin-competition-manage'
          : nextRole === 'registrar'
          ? 'competition-checkin'
          : nextRole === 'judge'
          ? 'judge-scoring'
          : 'by-school';
      const dest = resolvePostLoginMenu(nextRole, fallbackMenu);
      setPostLoginRedirect(null);
      setActiveMenu(dest);
      showToast(res.message || 'เข้าสู่ระบบสำเร็จ');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
      setLoginError(msg);
      showToast(msg, 'error');
    }
  };

  const handleSchoolSignupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    const code = newSchoolForm.schoolCode.trim();
    const name = newSchoolForm.name.trim();
    const director = newSchoolForm.director.trim();
    const password = newSchoolForm.password.trim();

    if (!code || !name || !director || !password) {
      const msg = 'กรุณากรอกข้อมูลโรงเรียนให้ครบถ้วน';
      setLoginError(msg);
      showToast(msg, 'error');
      return;
    }
    if (password.length < 4) {
      const msg = 'กรุณากำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษร';
      setLoginError(msg);
      showToast(msg, 'error');
      return;
    }
    if (password !== signupConfirmPass.trim()) {
      const msg = 'รหัสผ่านและยืนยันรหัสผ่านไม่ตรงกัน';
      setLoginError(msg);
      showToast(msg, 'error');
      return;
    }

    try {
      const res = await appApiCall('/signup', {
        schoolCode: code,
        name,
        director,
        phone: newSchoolForm.phone.trim() || '-',
        password,
        remember: rememberLogin
      });
      setNewSchoolForm({ schoolCode: '', password: '', name: '', director: '', phone: '' });
      setSignupConfirmPass('');
      setShowSignupPass(false);
      setShowSignupConfirmPass(false);
      setPostLoginRedirect(null);
      setActiveMenu('register');
      showToast(res.message || `สมัครสมาชิกโรงเรียน "${name}" สำเร็จ และเข้าสู่ระบบแล้ว`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถสมัครสมาชิกโรงเรียนได้';
      setLoginError(msg);
      showToast(msg, 'error');
    }
  };

  const handleLogout = async () => {
    try {
      await appApiCall('/logout', {});
    } catch {
      // clear local state even if request fails
    }
    apiTokenRef.current = '';
    clearStoredSessionToken();
    setStorageStats(null);
    setAuthSession({
      role: 'guest',
      userId: null,
      displayName: 'ผู้เยี่ยมชมทั่วไป',
      schoolId: null,
      judgeId: null
    });
    setPostLoginRedirect(null);
    setActiveMenu('home');
    showToast('ออกจากระบบเรียบร้อยแล้ว');
  };

  // ---------------- Registration Handlers (สมัคร / แก้ไข / ลบ) ----------------
  const prepareRegistrationForm = (
    compId: string = COMPETITIONS[0].id,
    lvl: string | null = null,
    existingReg: RegistrationItem | null = null
  ) => {
    const comp = COMPETITIONS.find((c) => c.id === compId) || COMPETITIONS[0];
    const targetLevel = lvl && comp.levels.includes(lvl) ? lvl : comp.levels[0];

    if (existingReg) {
      if ((authSession.role === 'admin' || authSession.role === 'manager') && existingReg.schoolId) {
        setSelectedSchoolFilter(existingReg.schoolId);
      }
      const targetSize = Math.max(comp.teamSize, existingReg.students.length, 1);
      const normalizedStudents = Array.from({ length: targetSize }, (_, idx) => ({
        name: existingReg.students[idx]?.name || '',
        photoUrl: existingReg.students[idx]?.photoUrl || ''
      }));
      const normalizedCoaches =
        existingReg.coaches.length > 0
          ? existingReg.coaches.map((c) => (typeof c === 'string' ? { name: c, photoUrl: '' } : { name: c.name || '', photoUrl: c.photoUrl || '' }))
          : [{ name: '', photoUrl: '' }];
      setRegForm({
        editingId: existingReg.id,
        competitionId: existingReg.competitionId,
        level: comp.levels.includes(existingReg.level) ? existingReg.level : targetLevel,
        studentNames: normalizedStudents.map((s) => s.name),
        studentPhotos: normalizedStudents.map((s) => s.photoUrl),
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

  const handleRegCompChange = (newCompId: string) => {
    const comp = COMPETITIONS.find((c) => c.id === newCompId) || COMPETITIONS[0];
    setRegForm((prev) => ({
      ...prev,
      competitionId: comp.id,
      level: comp.levels.includes(prev.level) ? prev.level : comp.levels[0],
      studentNames: Array.from({ length: Math.max(1, comp.teamSize) }, (_, idx) => prev.studentNames[idx] || ''),
      studentPhotos: Array.from({ length: Math.max(1, comp.teamSize) }, (_, idx) => prev.studentPhotos[idx] || ''),
      qualifyingSong: comp.requiresSongs ? prev.qualifyingSong : '',
      finalSong: comp.requiresSongs ? prev.finalSong : ''
    }));
  };

  const handleStudentPhotoUpload = async (idx: number, file?: File) => {
    if (!file) return;
    const uploadedUrl = await uploadImageToServer(file, 'students', 600, 0.85);
    if (!uploadedUrl) return;
    setRegForm((prev) => {
      const nextPhotos = [...prev.studentPhotos];
      nextPhotos[idx] = uploadedUrl;
      return { ...prev, studentPhotos: nextPhotos };
    });
  };

  const handleCoachPhotoUpload = async (idx: number, file?: File) => {
    if (!file) return;
    const uploadedUrl = await uploadImageToServer(file, 'coaches', 600, 0.85);
    if (!uploadedUrl) return;
    setRegForm((prev) => {
      const nextPhotos = [...prev.coachPhotos];
      nextPhotos[idx] = uploadedUrl;
      return { ...prev, coachPhotos: nextPhotos };
    });
  };

  const handleRegistrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationOpen && authSession.role !== 'admin' && authSession.role !== 'manager' && !regForm.editingId) {
      showToast('ขณะนี้ระบบปิดรับสมัครแข่งขันแล้ว สามารถแก้ไขข้อมูลรายการที่สมัครไว้ได้เท่านั้น', 'error');
      return;
    }

    const targetSchoolId =
      authSession.role === 'school'
        ? authSession.schoolId
        : (authSession.role === 'admin' || authSession.role === 'manager') && selectedSchoolFilter !== 'all'
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

    if (cleanedStudents.length === 0) {
      showToast('กรุณาระบุชื่อผู้เข้าแข่งขันอย่างน้อย 1 คน', 'error');
      return;
    }

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

    const resolvedLevel =
      comp && comp.levels.includes(regForm.level)
        ? regForm.level
        : comp?.levels[0] || regForm.level;

    try {
      const res = await appApiCall('/registrations/save', {
        id: regForm.editingId || undefined,
        schoolId: targetSchoolId,
        competitionId: regForm.competitionId,
        level: resolvedLevel,
        students: cleanedStudents,
        coaches: cleanedCoaches.length > 0 ? cleanedCoaches : [{ name: 'ครูผู้ฝึกสอน', photoUrl: '' }],
        qualifyingSong: comp?.requiresSongs ? regForm.qualifyingSong.trim() : '',
        finalSong: comp?.requiresSongs ? regForm.finalSong.trim() : ''
      });
      showToast(res.message || 'บันทึกการสมัครแข่งขันเรียบร้อยแล้ว');
      prepareRegistrationForm(regForm.competitionId, resolvedLevel, null);
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลการสมัครได้', 'error');
    }
  };

  const handleDeleteRegistration = async (regId: string) => {
    try {
      const res = await appApiCall('/registrations/delete', { id: regId });
      if (bySchoolEditForm?.id === regId) {
        setBySchoolEditForm(null);
      }
      setConfirmDeleteRegId(null);
      showToast(res.message || 'ลบรายการสมัครเรียบร้อยแล้ว');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ไม่สามารถลบรายการสมัครได้', 'error');
    }
  };

  const openBySchoolEditModal = (reg: RegistrationItem) => {
    const canEdit =
      authSession.role === 'admin' ||
      authSession.role === 'manager' ||
      (authSession.role === 'school' && authSession.schoolId === reg.schoolId);
    if (!canEdit) {
      showToast('ไม่มีสิทธิ์แก้ไขข้อมูลการสมัครของโรงเรียนอื่น', 'error');
      return;
    }

    const comp = COMPETITIONS.find((c) => c.id === reg.competitionId) || COMPETITIONS[0];
    const targetSize = Math.max(comp.teamSize, reg.students.length, 1);
    const normalizedStudents = Array.from({ length: targetSize }, (_, idx) => ({
      name: reg.students[idx]?.name || '',
      photoUrl: reg.students[idx]?.photoUrl || ''
    }));
    const normalizedCoaches =
      reg.coaches.length > 0
        ? reg.coaches.map((c) =>
            typeof c === 'string'
              ? { name: c, photoUrl: '' }
              : { name: c.name || '', photoUrl: c.photoUrl || '' }
          )
        : [{ name: '', photoUrl: '' }];

    setBySchoolEditForm({
      id: reg.id,
      schoolId: reg.schoolId,
      competitionId: reg.competitionId,
      level: reg.level,
      studentNames: normalizedStudents.map((s) => s.name),
      studentPhotos: normalizedStudents.map((s) => s.photoUrl),
      coachNames: normalizedCoaches.map((c) => c.name),
      coachPhotos: normalizedCoaches.map((c) => c.photoUrl),
      qualifyingSong: reg.qualifyingSong || '',
      finalSong: reg.finalSong || ''
    });
  };

  const handleBySchoolEditCompChange = (newCompId: string) => {
    const comp = COMPETITIONS.find((c) => c.id === newCompId) || COMPETITIONS[0];
    setBySchoolEditForm((prev) => {
      if (!prev) return null;
      const targetSize = Math.max(1, comp.teamSize);
      return {
        ...prev,
        competitionId: comp.id,
        level: comp.levels.includes(prev.level) ? prev.level : comp.levels[0],
        studentNames: Array.from({ length: targetSize }, (_, idx) => prev.studentNames[idx] || ''),
        studentPhotos: Array.from({ length: targetSize }, (_, idx) => prev.studentPhotos[idx] || ''),
        qualifyingSong: comp.requiresSongs ? prev.qualifyingSong : '',
        finalSong: comp.requiresSongs ? prev.finalSong : ''
      };
    });
  };

  const handleBySchoolEditPhotoUpload = async (kind: 'student' | 'coach', idx: number, file?: File) => {
    if (!file) return;
    const uploadedUrl = await uploadImageToServer(file, kind === 'coach' ? 'coaches' : 'students', 600, 0.85);
    if (!uploadedUrl) return;
    setBySchoolEditForm((prev) => {
      if (!prev) return null;
      if (kind === 'student') {
        const next = [...prev.studentPhotos];
        next[idx] = uploadedUrl;
        return { ...prev, studentPhotos: next };
      }
      const next = [...prev.coachPhotos];
      next[idx] = uploadedUrl;
      return { ...prev, coachPhotos: next };
    });
  };

  const handleBySchoolEditSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const draft = bySchoolEditForm;
    if (!draft) return;

    const comp = COMPETITIONS.find((c) => c.id === draft.competitionId);
    const cleanedStudents = draft.studentNames
      .map((name, i) => ({
        name: name.trim(),
        photoUrl: draft.studentPhotos[i] || ''
      }))
      .filter((s) => s.name.length > 0);

    if (cleanedStudents.length === 0) {
      showToast('กรุณาระบุชื่อผู้เข้าแข่งขันอย่างน้อย 1 คน', 'error');
      return;
    }

    const cleanedCoaches = draft.coachNames
      .map((c, i) => ({
        name: c.trim(),
        photoUrl: draft.coachPhotos[i] || ''
      }))
      .filter((c) => c.name.length > 0);

    if (
      comp?.requiresSongs &&
      (!draft.qualifyingSong.trim() || !draft.finalSong.trim())
    ) {
      showToast('รายการร้องเพลงไทยลูกทุ่งต้องระบุเพลงรอบคัดเลือกและรอบตัดสินให้ครบถ้วน', 'error');
      return;
    }

    const resolvedLevel =
      comp && comp.levels.includes(draft.level)
        ? draft.level
        : comp?.levels[0] || draft.level;

    const targetSchoolId =
      authSession.role === 'admin' || authSession.role === 'manager'
        ? draft.schoolId
        : authSession.schoolId || draft.schoolId;

    try {
      const res = await appApiCall('/registrations/save', {
        id: draft.id,
        schoolId: targetSchoolId,
        competitionId: draft.competitionId,
        level: resolvedLevel,
        students: cleanedStudents,
        coaches: cleanedCoaches.length > 0 ? cleanedCoaches : [{ name: 'ครูผู้ฝึกสอน', photoUrl: '' }],
        qualifyingSong: comp?.requiresSongs ? draft.qualifyingSong.trim() : '',
        finalSong: comp?.requiresSongs ? draft.finalSong.trim() : ''
      });
      setBySchoolEditForm(null);
      showToast(res.message || 'แก้ไขข้อมูลการสมัครแข่งขันเรียบร้อยแล้ว');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'ไม่สามารถแก้ไขข้อมูลการสมัครได้', 'error');
    }
  };

  // ---------------- PDF / Print Generators ----------------
  const handleDownloadStudentCardsPdf = (
    targetSchoolId: string | null,
    targetCompId = 'all',
    layoutMode: '4-up' | '1-up' = cardPrintLayout
  ) => {
    const filteredRegs = registrations.filter((r) => {
      const matchSchool = targetSchoolId === 'all' ? authSession.role === 'admin' : r.schoolId === targetSchoolId;
      const matchComp = targetCompId === 'all' ? true : r.competitionId === targetCompId;
      return matchSchool && matchComp;
    });

    if (filteredRegs.length === 0) {
      showToast('ไม่พบข้อมูลบัตรผู้เข้าแข่งขันตามเงื่อนไขที่เลือก', 'error');
      return;
    }

    const cardsHtml: string[] = [];
    const safeBgUrl = safeImageUrl(studentCardBgUrl);
    filteredRegs.forEach((reg) => {
      const school = schools.find((s) => s.id === reg.schoolId);
      const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
      const sched = schedules[`${reg.competitionId}__${reg.level}`] || {
        venue: 'กำหนดในวันงาน',
        timeRange: '08.30 น. เป็นต้นไป'
      };

      reg.students.forEach((st, idx) => {
        const bgFallback = `background: linear-gradient(160deg, #fffbeb 0%, #fef3c7 48%, #fff7ed 100%);`;
        const bgImgHtml = safeBgUrl
          ? `<img src="${escapeHtml(safeBgUrl)}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0; pointer-events: none;" />`
          : '';
        const safePhoto = safeImageUrl(st.photoUrl);

        cardsHtml.push(`
          <div class="card-item" style="width: 105mm; height: 148.5mm; ${bgFallback} border: none; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
            ${bgImgHtml}
            <div style="position: relative; z-index: 1; text-align: center; padding-bottom: 8px; background: rgba(255,255,255,0.6); border-radius: 8px; padding-top: 6px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #78350f;">บัตรประจำตัวผู้เข้าแข่งขัน</div>
              <div style="font-size: 10.5px; font-weight: 700; color: #b45309;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>
              <div style="font-size: 9.5px; color: #92400e;">${escapeHtml(EVENT_DATE_TH)}</div>
            </div>

            <div style="position: relative; z-index: 1; display: flex; justify-content: center; margin: 4px 0;">
              <div style="width: 44mm; height: 56mm; border-radius: 10px; border: 2px solid rgba(255,255,255,0.92); box-shadow: 0 2px 8px rgba(15,23,42,0.12); background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${
                  safePhoto
                    ? `<img src="${escapeHtml(safePhoto)}" style="width: 100%; height: 100%; object-fit: cover; object-position: center top;" />`
                    : `<span style="font-size: 11px; color: #94a3b8; text-align: center; padding: 6px;">รูปภาพนักเรียน<br/>(คนที่ ${idx + 1})</span>`
                }
              </div>
            </div>

            <div style="position: relative; z-index: 1; background: rgba(255,255,255,0.72); border-radius: 10px; padding: 8px 10px; font-size: 11px; line-height: 1.45;">
              <div><strong>ชื่อ-สกุล:</strong> ${escapeHtml(st.name)}</div>
              <div><strong>โรงเรียน:</strong> ${escapeHtml(school ? school.name : '-')}</div>
              <div><strong>กิจกรรม:</strong> ${escapeHtml(comp ? comp.name : '-')}</div>
              <div><strong>ระดับชั้น:</strong> ${escapeHtml(reg.level)}</div>
              <div><strong>สถานที่:</strong> ${escapeHtml(sched.venue)}</div>
              <div><strong>เวลา:</strong> ${escapeHtml(sched.timeRange)}</div>
            </div>

            <div style="position: relative; z-index: 1; text-align: center; font-size: 9.5px; font-weight: 600; color: #78350f; background: rgba(255,255,255,0.6); padding: 4px; border-radius: 6px;">
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
  const handleDownloadCoachCardsPdf = (
    targetSchoolId: string | null,
    targetCompId = 'all',
    layoutMode: '4-up' | '1-up' = cardPrintLayout
  ) => {
    const filteredRegs = registrations.filter((r) => {
      const matchSchool = targetSchoolId === 'all' ? authSession.role === 'admin' : r.schoolId === targetSchoolId;
      const matchComp = targetCompId === 'all' ? true : r.competitionId === targetCompId;
      return matchSchool && matchComp;
    });

    if (filteredRegs.length === 0) {
      showToast('ไม่พบข้อมูลบัตรครูผู้ฝึกสอนตามเงื่อนไขที่เลือก', 'error');
      return;
    }

    const cardsHtml: string[] = [];
    const safeBgUrl = safeImageUrl(coachCardBgUrl);
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
        const coachPhoto = safeImageUrl(typeof coachItem === 'string' ? '' : coachItem.photoUrl || '');
        const bgFallback = `background: linear-gradient(160deg, #ecfdf5 0%, #d1fae5 48%, #f0fdfa 100%);`;
        const bgImgHtml = safeBgUrl
          ? `<img src="${escapeHtml(safeBgUrl)}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0; pointer-events: none;" />`
          : '';

        cardsHtml.push(`
          <div class="card-item" style="width: 105mm; height: 148.5mm; ${bgFallback} border: none; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
            ${bgImgHtml}
            <div style="position: relative; z-index: 1; text-align: center; padding-bottom: 8px; background: rgba(255,255,255,0.6); border-radius: 8px; padding-top: 6px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #064e3b;">บัตรประจำตัวครูผู้ฝึกสอน</div>
              <div style="font-size: 10.5px; font-weight: 700; color: #047857;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>
              <div style="font-size: 9.5px; color: #059669;">${escapeHtml(EVENT_DATE_TH)}</div>
            </div>

            <div style="position: relative; z-index: 1; display: flex; justify-content: center; margin: 4px 0;">
              <div style="width: 42mm; height: 52mm; border-radius: 10px; border: 2px solid rgba(255,255,255,0.92); box-shadow: 0 2px 8px rgba(15,23,42,0.12); background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${
                  coachPhoto
                    ? `<img src="${escapeHtml(coachPhoto)}" style="width: 100%; height: 100%; object-fit: cover; object-position: center top;" />`
                    : `<span style="font-size: 11px; color: #64748b; text-align: center; padding: 6px;">รูปภาพครูผู้ฝึกสอน<br/>(คนที่ ${cIdx + 1})</span>`
                }
              </div>
            </div>

            <div style="position: relative; z-index: 1; background: rgba(255,255,255,0.72); border-radius: 10px; padding: 8px 10px; font-size: 10.5px; line-height: 1.4;">
              <div><strong>ครูผู้ฝึกสอน:</strong> ${escapeHtml(coachName)}</div>
              <div><strong>โรงเรียน:</strong> ${escapeHtml(school ? school.name : '-')}</div>
              <div><strong>ผู้แข่งขัน:</strong> ${escapeHtml(competitorSummary)}</div>
              <div><strong>กิจกรรม:</strong> ${escapeHtml(comp ? comp.name : '-')}</div>
              <div><strong>ระดับชั้น:</strong> ${escapeHtml(reg.level)}</div>
              <div><strong>สถานที่:</strong> ${escapeHtml(sched.venue)}</div>
              <div><strong>เวลา:</strong> ${escapeHtml(sched.timeRange)}</div>
            </div>

            <div style="position: relative; z-index: 1; text-align: center; font-size: 9.5px; font-weight: 700; color: #065f46; background: rgba(255,255,255,0.6); padding: 4px; border-radius: 6px;">
              ครูผู้ฝึกสอน
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

  const handleDownloadJudgeCardsPdf = (
    targetJudges: JudgeItem[],
    layoutMode: '4-up' | '1-up' = cardPrintLayout
  ) => {
    if (!targetJudges || targetJudges.length === 0) {
      showToast('ไม่พบข้อมูลบัตรกรรมการตัดสิน', 'error');
      return;
    }

    const safeBgUrl = safeImageUrl(judgeCardBgUrl);
    const cardsHtml = targetJudges.map((jdg) => {
      const comp = COMPETITIONS.find((c) => c.id === jdg.competitionId);
      const sched = schedules[`${jdg.competitionId}__${jdg.level}`] || {
        venue: 'กำหนดในวันงาน',
        timeRange: '08.30 น. เป็นต้นไป'
      };
      const bgFallback = `background: linear-gradient(160deg, #eff6ff 0%, #dbeafe 50%, #f0fdf4 100%);`;
      const bgImgHtml = safeBgUrl
        ? `<img src="${escapeHtml(safeBgUrl)}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0; pointer-events: none;" />`
        : '';
      const safeJudgePhoto = safeImageUrl(jdg.photoUrl);

      return `
        <div class="card-item" style="width: 105mm; height: 148.5mm; ${bgFallback} border: none; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
          ${bgImgHtml}
          <div style="position: relative; z-index: 1; text-align: center; padding-bottom: 8px; background: rgba(255,255,255,0.6); border-radius: 8px; padding-top: 6px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0c4a6e;">บัตรประจำตัวกรรมการตัดสิน</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #0369a1;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>
            <div style="font-size: 9.5px; color: #0284c7;">${escapeHtml(EVENT_DATE_TH)}</div>
          </div>

          <div style="position: relative; z-index: 1; display: flex; justify-content: center; margin: 4px 0;">
            <div style="width: 40mm; height: 50mm; border-radius: 10px; border: 2px solid rgba(255,255,255,0.92); box-shadow: 0 2px 8px rgba(15,23,42,0.12); background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${
                safeJudgePhoto
                  ? `<img src="${escapeHtml(safeJudgePhoto)}" style="width: 100%; height: 100%; object-fit: cover; object-position: center top;" />`
                  : `<span style="font-size: 11px; color: #64748b; text-align: center; padding: 6px;">รูปภาพกรรมการ</span>`
              }
            </div>
          </div>

          <div style="position: relative; z-index: 1; background: rgba(255,255,255,0.72); border-radius: 10px; padding: 8px 10px; font-size: 10.5px; line-height: 1.38;">
            <div><strong>ชื่อ-สกุล:</strong> ${escapeHtml(jdg.name)}</div>
            <div><strong>ตำแหน่ง:</strong> ${escapeHtml(jdg.position)}</div>
            <div><strong>กิจกรรมที่ตัดสิน:</strong> ${escapeHtml(comp ? comp.name : '-')}</div>
            <div><strong>ระดับชั้น:</strong> ${escapeHtml(jdg.level)}</div>
            <div><strong>สถานที่:</strong> ${escapeHtml(sched.venue)}</div>
            <div><strong>เวลา:</strong> ${escapeHtml(sched.timeRange)}</div>
            <div style="margin-top: 4px; padding-top: 4px; color: #0c4a6e;">
              <strong>ชื่อผู้ใช้:</strong> ${escapeHtml(jdg.username || '-')} | <strong>สถานะรหัสผ่าน:</strong> เข้ารหัสปลอดภัยในระบบ
            </div>
          </div>

          <div style="position: relative; z-index: 1; text-align: center; font-size: 9.5px; font-weight: 700; color: #0369a1; background: rgba(255,255,255,0.6); padding: 4px; border-radius: 6px;">
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

  const handleDownloadCertificateA4Landscape = (certsList: CertificateItem[], docTitle: string) => {
    if (!certsList || certsList.length === 0) {
      showToast('ไม่พบรายชื่อสำหรับออกเกียรติบัตร', 'error');
      return;
    }

    const safeCertBg = safeImageUrl(certBgUrl);
    const pagesHtml = certsList.map((cert) => {
      const bgFallback = `background: linear-gradient(135deg, #fffdf7 0%, #fef9c3 35%, #fffbeb 70%, #fef3c7 100%);`;
      const certBgImgHtml = safeCertBg
        ? `<img src="${escapeHtml(safeCertBg)}" alt="" style="position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: center; z-index: 0; pointer-events: none;" />`
        : '';

      const line1Name = cert.line1Name || cert.recipientName || '';
      const line2Position = cert.line2Position || (cert.roleLabel ? `เป็น${cert.roleLabel}` : '');
      const line3Activity =
        cert.line3Activity ||
        `เป็นกรรมการตัดสินกิจกรรมการ${cert.activityName || ''} ${cert.levelName || ''}`.trim();

      const fitLine3FontSize = (text: string, basePt = 13.5, minPt = 9.5) => {
        const len = String(text || '').trim().length;
        if (len <= 48) return basePt;
        const scaled = basePt - (len - 48) * 0.08;
        return Math.max(minPt, Number(scaled.toFixed(1)));
      };

      const line3FontPt = cert.fitSingleLine
        ? fitLine3FontSize(line3Activity, 13.5, 9.5)
        : 13.5;

      return `
        <div class="page-break" style="width: 297mm; height: 210mm; ${bgFallback} padding: 16mm; position: relative; overflow: hidden; display: flex; justify-content: center;">
          ${certBgImgHtml}
          ${
            cert.certNumber
              ? `<div style="position: absolute; top: 4cm; right: 1cm; z-index: 1; font-size: 10pt; font-weight: 600; color: #0f172a; text-align: right;">${escapeHtml(cert.certNumber)}</div>`
              : ''
          }
          <div style="position: absolute; top: 7.3cm; left: 0; right: 0; width: 100%; z-index: 1; background: transparent; padding: 0 36px; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; gap: 10px;">
            <div style="font-size: 19pt; font-weight: 700; color: #0f172a; line-height: 1.4;">
              ${escapeHtml(line1Name)}
            </div>
            <div style="font-size: 14pt; font-weight: 700; color: #0f172a; line-height: 1.4;">
              ${escapeHtml(line2Position)}
            </div>
            <div style="${
              cert.fitSingleLine
                ? `font-size: ${line3FontPt}pt; white-space: nowrap; max-width: 100%;`
                : 'font-size: 13.5pt; max-width: 820px;'
            } font-weight: 600; color: #0f172a; line-height: 1.5;">
              ${escapeHtml(line3Activity)}
            </div>
          </div>
        </div>
      `;
    });

    const res = openPrintableDocument(docTitle, pagesHtml.join(''), 'A4 landscape');
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  const handleDownloadResultsPdf = (compId: string, level: string) => {
    const comp = COMPETITIONS.find((c) => c.id === compId);
    const normalizedLevel = level.trim();
    const metaKey = `${compId}__${normalizedLevel}`;
    const meta = evalMeta[metaKey] || evalMeta[`${compId}__${level}`] || { status: 'pending', approved: false };
    const canViewStaffResults = authSession.role === 'admin' || authSession.role === 'manager';

    if (!meta.approved && !canViewStaffResults) {
      showToast('ผลคะแนนกิจกรรมนี้ยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ', 'error');
      return;
    }

    const isTwoRound = isTwoRoundCompetition(compId);
    const rankedList = buildCompetitionRankedList(
      compId,
      level,
      registrations,
      scores,
      roundScores,
      absentRegs,
      recusedJudges
    );

    const rows = rankedList.map((entry) => {
      const sch = schools.find((s) => s.id === entry.reg.schoolId);
      const medal = entry.isAbsent
        ? { label: 'ไม่เข้าร่วมแข่งขัน', printColor: '#be123c', badgeCls: '' }
        : getMedalTier(entry.score, entry.hasScore);
      return {
        reg: entry.reg,
        isAbsent: entry.isAbsent,
        hasScore: entry.hasScore,
        schoolName: sch ? sch.name : '-',
        studentNames: entry.reg.students.map((s) => s.name).join(', '),
        score: entry.score,
        medal,
        judgeScores: entry.judgeScores,
        rankNum: entry.rankNum,
        qualifyingRank: entry.qualifyingRank,
        roundGroup: entry.roundGroup,
        roundInfo: entry.roundInfo
      };
    });

    const visiblePdfRows = rows.filter((item) => {
      if (canViewStaffResults) return true;
      return !item.isAbsent && item.hasScore;
    });

    const colSpanCount = canViewStaffResults ? 6 : 5;
    let lastGroup: TwoRoundGroup | null = null;
    const tableRowsHtml = visiblePdfRows
      .map((item) => {
        const rankLabel = getRankAwardLabel(item.rankNum || 0, item.isAbsent, item.hasScore, 'ลำดับที่');
        let groupHeaderHtml = '';
        if (isTwoRound && item.hasScore && item.roundGroup !== lastGroup) {
          lastGroup = item.roundGroup;
          if (item.roundGroup === 'final_top10') {
            groupHeaderHtml = `
              <tr style="background:#ecfdf5;color:#065f46;">
                <td colspan="${colSpanCount}" style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:800;font-size:12.5px;">
                  รอบตัดสิน (ผู้ผ่านเข้ารอบลำดับที่ 1–10 จากรอบคัดเลือก เรียงตามคะแนนรอบตัดสิน)
                </td>
              </tr>`;
          } else if (item.roundGroup === 'qualifying_rest') {
            groupHeaderHtml = `
              <tr style="background:#fffbeb;color:#92400e;">
                <td colspan="${colSpanCount}" style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:800;font-size:12.5px;">
                  รอบคัดเลือก (ลำดับที่ไม่เข้าเกณฑ์ 1–10 ต่อท้าย เรียงตามคะแนนรอบคัดเลือก)
                </td>
              </tr>`;
          }
        }
        const roundTag =
          item.hasScore && item.roundInfo.isTwoRound
            ? `<div style="font-size:11px;color:${item.roundGroup === 'final_top10' ? '#047857' : '#b45309'};font-weight:700;">${
                item.roundGroup === 'final_top10'
                  ? item.roundInfo.finalCalc.judgeCount > 0
                    ? `รอบตัดสิน (คัดเลือก #${item.qualifyingRank || '-'} ได้ ${item.roundInfo.qualifyingCalc.average100.toFixed(2)} • ตัดสิน ${item.roundInfo.finalCalc.average100.toFixed(2)})`
                    : `ผ่านเข้ารอบตัดสิน 1-10 (คัดเลือก #${item.qualifyingRank || '-'})`
                  : `รอบคัดเลือกไม่เข้าเกณฑ์ 1-10 (คัดเลือก #${item.qualifyingRank || '-'} ได้ ${item.roundInfo.qualifyingCalc.average100.toFixed(2)})`
              }</div>`
            : '';
        const judgeBreakdown =
          canViewStaffResults
            ? `<td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 12px;">${
                item.isAbsent
                  ? '<span style="color:#be123c;font-weight:700;">แจ้งไม่เข้าร่วมแข่งขัน</span>'
                  : Object.entries(item.judgeScores)
                      .map(([jId, sc]) => {
                        const jObj = judges.find((j) => j.id === jId);
                        return `${escapeHtml(jObj ? jObj.name : jId)}: ${escapeHtml(sc)}`;
                      })
                      .join(' | ') || 'เข้าร่วมการแข่งขัน (ยังไม่มีคะแนน)'
              }</td>`
            : '';

        return `${groupHeaderHtml}
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700;">${escapeHtml(rankLabel)}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(item.studentNames)}${roundTag}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(item.schoolName)}</td>
            ${judgeBreakdown}
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: right; font-weight: 700; color: #b45309;">${item.hasScore ? item.score.toFixed(2) : '-'}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700; color: ${item.medal.printColor};">${escapeHtml(item.medal.label)}</td>
          </tr>
        `;
      })
      .join('');

    const bodyHtml = `
      <div style="width: 210mm; min-height: 297mm; background: white; padding: 24px; border: 1px solid #e2e8f0;">
        <div style="text-align: center; border-bottom: 2px solid #f59e0b; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="margin: 0; color: #78350f;">ประกาศผลการแข่งขัน</h2>
          <div style="font-size: 15px; font-weight: 700; margin-top: 4px;">${escapeHtml(EVENT_TITLE_TH)}</div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px;">
            กิจกรรม: <strong>${escapeHtml(comp ? comp.name : '')}</strong> | ระดับ: <strong>${escapeHtml(level)}</strong>
          </div>
          <div style="font-size: 12px; color: #059669; margin-top: 4px;">
            สถานะ: ${meta.approved ? 'อนุมัติผลการแข่งขันอย่างเป็นทางการแล้ว' : 'ฉบับร่าง (รอผู้ดูแลระบบอนุมัติ)'}
          </div>
          ${isTwoRound ? '<div style="font-size:11.5px;color:#0369a1;margin-top:4px;font-weight:700;">เกณฑ์ประกาศผล 2 รอบ: รอบตัดสิน (ลำดับที่ 1-10 จากรอบคัดเลือก) ต่อท้ายด้วยผลรอบคัดเลือกที่ไม่เข้าเกณฑ์ 1-10</div>' : ''}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: #fef3c7; color: #78350f;">
              <th style="padding: 8px; border: 1px solid #cbd5e1;">ลำดับที่ / รางวัล</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">ผู้เข้าแข่งขัน</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1;">โรงเรียน</th>
              ${canViewStaffResults ? '<th style="padding: 8px; border: 1px solid #cbd5e1;">คะแนนกรรมการรายท่าน</th>' : ''}
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: right;">คะแนนรวม (เต็ม ๑๐๐)</th>
              <th style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">ระดับเหรียญรางวัล</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml || `<tr><td colspan="${colSpanCount}" style="padding: 16px; text-align: center;">ยังไม่มีข้อมูลผู้เข้าแข่งขันในระดับนี้</td></tr>`}
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

            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-weight: 700;">${escapeHtml(lvl)}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(item.venue)}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(item.dateLabel || EVENT_DATE_TH)}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; white-space: nowrap;">${escapeHtml(item.timeRange)}</td>
                <td style="padding: 8px; border: 1px solid #cbd5e1; font-size: 12px;">${escapeHtml(item.notes || '-')}</td>
              </tr>
            `;
          })
          .join('');

        return `
          <div style="margin-bottom: 18px;">
            <div style="background: #fef3c7; color: #78350f; font-weight: 700; padding: 8px 12px; border: 1px solid #fcd34d; border-bottom: none; border-radius: 8px 8px 0 0; font-size: 14px;">
              ${escapeHtml(comp.name)} (${escapeHtml(comp.type)})
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
          <div style="font-size: 15px; font-weight: 700; margin-top: 4px; color: #0f172a;">${escapeHtml(EVENT_TITLE_TH)}</div>
          <div style="font-size: 13px; color: #475569; margin-top: 4px;">
            ${escapeHtml(EVENT_DATE_TH)} • สถานที่หลัก: ${escapeHtml(EVENT_VENUE_TH)}
          </div>
        </div>
        ${sectionsHtml || '<div style="text-align:center;padding:24px;color:#64748b;">ไม่พบข้อมูลตารางการแข่งขันตามตัวกรองที่เลือก</div>'}
      </div>
    `;

    const res = openPrintableDocument('ตารางการแข่งขันและสถานที่แข่งขัน', bodyHtml, 'A4 portrait');
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  /**
   * สร้างและเปิดหน้าต่างพิมพ์ / ดาวน์โหลด PDF รายละเอียดการแข่งขันทั้งหมด แยกตามโรงเรียน
   */
  const handlePrintBySchoolDetails = (targetSchoolId?: string) => {
    const isAdmin = authSession.role === 'admin';
    const isSchool = authSession.role === 'school';

    let targetSchools: SchoolItem[] = [];
    if (targetSchoolId) {
      targetSchools = schools.filter((s) => s.id === targetSchoolId);
    } else if (isSchool && authSession.schoolId) {
      targetSchools = schools.filter((s) => s.id === authSession.schoolId);
    } else if (isAdmin) {
      targetSchools =
        selectedSchoolFilter === 'all'
          ? schools
          : schools.filter((s) => s.id === selectedSchoolFilter);
    }

    if (targetSchools.length === 0) {
      showToast('ไม่พบข้อมูลโรงเรียนสำหรับพิมพ์รายละเอียด', 'error');
      return;
    }

    const compOrderMap = new Map<string, number>();
    COMPETITIONS.forEach((c, idx) => compOrderMap.set(c.id, idx));

    const sheetsHtml = targetSchools
      .map((sch) => {
        const schRegs = registrations
          .filter((r) => r.schoolId === sch.id)
          .slice()
          .sort((a, b) => {
            const ca = compOrderMap.get(a.competitionId) ?? 999;
            const cb = compOrderMap.get(b.competitionId) ?? 999;
            if (ca !== cb) return ca - cb;
            return String(a.level || '').localeCompare(String(b.level || ''), 'th');
          });

        const totalStudents = schRegs.reduce((sum, r) => sum + (r.students?.length || 0), 0);
        const totalCoaches = schRegs.reduce((sum, r) => sum + (r.coaches?.length || 0), 0);

        const rowsHtml = schRegs
          .map((reg, idx) => {
            const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
            const scheduleKey = `${reg.competitionId}__${String(reg.level || '').trim()}`;
            const schedule =
              schedules[scheduleKey] ||
              schedules[`${reg.competitionId}__${reg.level}`] || {
                venue: 'กำหนดในวันงาน',
                dateLabel: EVENT_DATE_TH,
                timeRange: '08.30 น. เป็นต้นไป',
                notes: '-'
              };

            const studentsHtml =
              reg.students && reg.students.length > 0
                ? reg.students
                    .map(
                      (s, sIdx) =>
                        `<div style="line-height: 1.45;">${sIdx + 1}. ${escapeHtml(s.name || '-')}</div>`
                    )
                    .join('')
                : '<div>-</div>';

            const coachesHtml =
              reg.coaches && reg.coaches.length > 0
                ? reg.coaches
                    .map((c, cIdx) => {
                      const cName = typeof c === 'string' ? c : c?.name || '-';
                      return `<div style="line-height: 1.45;">${cIdx + 1}. ${escapeHtml(cName)}</div>`;
                    })
                    .join('')
                : '<div>-</div>';

            const songInfoHtml = comp?.requiresSongs
              ? `<div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #cbd5e1; color: #0369a1; font-size: 11px;">
                   <div><strong>เพลงคัดเลือก:</strong> ${escapeHtml(reg.qualifyingSong || '-')}</div>
                   <div><strong>เพลงตัดสิน:</strong> ${escapeHtml(reg.finalSong || '-')}</div>
                 </div>`
              : '';

            const notesHtml =
              schedule.notes && schedule.notes !== '-'
                ? `<div style="font-size: 11px; color: #475569; margin-top: 2px;">หมายเหตุ: ${escapeHtml(schedule.notes)}</div>`
                : '';

            return `
              <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center; vertical-align: top; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 7px 8px; border: 1px solid #cbd5e1; vertical-align: top;">
                  <div style="font-weight: 700; color: #0f172a;">${escapeHtml(comp?.name || '-')}</div>
                  <div style="font-size: 11px; color: #64748b;">ประเภท: ${escapeHtml(comp?.type || '-')}</div>
                  ${songInfoHtml}
                </td>
                <td style="padding: 7px 8px; border: 1px solid #cbd5e1; vertical-align: top; font-weight: 600; color: #1e293b;">${escapeHtml(reg.level || '-')}</td>
                <td style="padding: 7px 8px; border: 1px solid #cbd5e1; vertical-align: top;">${studentsHtml}</td>
                <td style="padding: 7px 8px; border: 1px solid #cbd5e1; vertical-align: top;">${coachesHtml}</td>
                <td style="padding: 7px 8px; border: 1px solid #cbd5e1; vertical-align: top; font-size: 11.5px;">
                  <div><strong>สถานที่:</strong> ${escapeHtml(schedule.venue)}</div>
                  <div><strong>วันที่:</strong> ${escapeHtml(schedule.dateLabel || EVENT_DATE_TH)}</div>
                  <div><strong>เวลา:</strong> ${escapeHtml(schedule.timeRange)}</div>
                  ${notesHtml}
                </td>
              </tr>
            `;
          })
          .join('');

        return `
          <div class="school-print-sheet" style="width: 210mm; min-height: 297mm; background: white; padding: 20px 22px; border: 1px solid #e2e8f0; margin-bottom: 12px;">
            <div style="text-align: center; border-bottom: 2px solid #059669; padding-bottom: 10px; margin-bottom: 14px;">
              <h2 style="margin: 0; color: #064e3b; font-size: 18px;">รายละเอียดการแข่งขัน</h2>
              <div style="font-size: 14px; font-weight: 700; margin-top: 3px; color: #0f172a;">${escapeHtml(EVENT_TITLE_TH)}</div>
              <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                ${escapeHtml(EVENT_DATE_TH)} • สถานที่หลัก: ${escapeHtml(EVENT_VENUE_TH)}
              </div>
            </div>

            <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 10px 14px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
              <div>
                <div style="font-size: 15px; font-weight: 800; color: #065f46;">${escapeHtml(sch.name)}</div>
                <div style="font-size: 12px; color: #047857; margin-top: 2px;">
                  รหัสสถานศึกษา: <strong>${escapeHtml(sch.schoolCode)}</strong> • ผู้อำนวยการ: <strong>${escapeHtml(sch.director || '-')}</strong> • โทร: <strong>${escapeHtml(sch.phone || '-')}</strong>
                </div>
              </div>
              <div style="text-align: right; font-size: 12px; color: #065f46; white-space: nowrap;">
                <div><strong>สมัครทั้งหมด:</strong> ${schRegs.length} รายการ</div>
                <div><strong>ผู้เข้าแข่งขัน:</strong> ${totalStudents} คน • <strong>ครูผู้ฝึกสอน:</strong> ${totalCoaches} คน</div>
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
              <thead>
                <tr style="background: #f1f5f9; color: #1e293b;">
                  <th style="padding: 7px 6px; border: 1px solid #cbd5e1; text-align: center; width: 34px;">ที่</th>
                  <th style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left;">กิจกรรมการแข่งขัน</th>
                  <th style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; width: 105px;">ระดับชั้น</th>
                  <th style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left;">ผู้เข้าแข่งขัน</th>
                  <th style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left;">ครูผู้ฝึกสอน</th>
                  <th style="padding: 7px 8px; border: 1px solid #cbd5e1; text-align: left; width: 155px;">สถานที่และเวลาแข่งขัน</th>
                </tr>
              </thead>
              <tbody>
                ${
                  rowsHtml ||
                  '<tr><td colspan="6" style="padding: 18px; text-align: center; border: 1px solid #cbd5e1; color: #64748b;">ยังไม่มีรายการสมัครแข่งขันของโรงเรียนนี้</td></tr>'
                }
              </tbody>
            </table>
          </div>
        `;
      })
      .join('');

    const docTitle =
      targetSchools.length === 1
        ? `รายละเอียดการแข่งขัน ${targetSchools[0].name}`
        : 'รายละเอียดการแข่งขัน แยกตามโรงเรียน';

    const extraCss = `
      .school-print-sheet {
        page-break-after: always;
        break-after: page;
      }
      .school-print-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    `;

    const res = openPrintableDocument(docTitle, sheetsHtml, 'A4 portrait', extraCss);
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  /**
   * สร้างและเปิดหน้าต่างพิมพ์ / ดาวน์โหลด PDF รายละเอียดรายชื่อแยกตามกิจกรรมและระดับชั้น
   */
  const handlePrintByActivityDetails = (targetCompId = 'all', targetLevel = 'ทั้งหมด') => {
    const isSchool = authSession.role === 'school';
    const isAdmin = authSession.role === 'admin';
    if (!isAdmin && !isSchool) {
      showToast('กรุณาเข้าสู่ระบบก่อนพิมพ์รายละเอียด', 'error');
      return;
    }

    const filteredComps = COMPETITIONS.filter((c) =>
      targetCompId === 'all' ? true : c.id === targetCompId
    );

    const sheetBlocks: string[] = [];

    filteredComps.forEach((comp) => {
      const levelsToPrint =
        targetLevel === 'ทั้งหมด'
          ? comp.levels
          : comp.levels.filter((l) => l === targetLevel);

      levelsToPrint.forEach((lvl) => {
        const levelRegs = registrations.filter((r) => {
          const compLvlOk = r.competitionId === comp.id && r.level === lvl;
          const schoolOk = isSchool ? r.schoolId === authSession.schoolId : true;
          return compLvlOk && schoolOk;
        });

        // ถ้าเป็นโรงเรียนและไม่ได้สมัครในกิจกรรม/ระดับนี้ หรือสั่งพิมพ์ทั้งหมดแล้วระดับนี้ไม่มีผู้สมัคร ให้ข้าม
        if (isSchool && levelRegs.length === 0) return;
        if (targetCompId === 'all' && targetLevel === 'ทั้งหมด' && levelRegs.length === 0) return;

        const sched =
          schedules[`${comp.id}__${String(lvl).trim()}`] ||
          schedules[`${comp.id}__${lvl}`] || {
            venue: EVENT_VENUE_TH,
            dateLabel: EVENT_DATE_TH,
            timeRange: '08.30 น. เป็นต้นไป',
            notes: '-'
          };

        const rowsHtml = levelRegs
          .map((reg, idx) => {
            const sch = schools.find((s) => s.id === reg.schoolId);
            const isAbsent = Boolean(absentRegs[reg.id]);
            const studentsHtml =
              reg.students && reg.students.length > 0
                ? reg.students
                    .map(
                      (s, sIdx) =>
                        `<div style="line-height:1.45;">${sIdx + 1}. ${escapeHtml(s.name || '-')}</div>`
                    )
                    .join('')
                : '<div>-</div>';
            const coachesHtml =
              reg.coaches && reg.coaches.length > 0
                ? reg.coaches
                    .map((c, cIdx) => {
                      const cName = typeof c === 'string' ? c : c?.name || '-';
                      return `<div style="line-height:1.45;">${cIdx + 1}. ${escapeHtml(cName)}</div>`;
                    })
                    .join('')
                : '<div>-</div>';
            const extraDetailHtml = [
              comp.requiresSongs
                ? `<div><strong>เพลงคัดเลือก:</strong> ${escapeHtml(reg.qualifyingSong || '-')}</div><div><strong>เพลงตัดสิน:</strong> ${escapeHtml(reg.finalSong || '-')}</div>`
                : '',
              isAbsent
                ? '<div style="margin-top:3px;color:#be123c;font-weight:700;">สถานะ: ไม่เข้าร่วมแข่งขัน</div>'
                : '<div style="margin-top:3px;color:#047857;font-weight:600;">สถานะ: สมัครเข้าร่วมแข่งขัน</div>'
            ]
              .filter(Boolean)
              .join('');

            return `
              <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding:7px 6px;border:1px solid #cbd5e1;text-align:center;vertical-align:top;font-weight:700;">${idx + 1}</td>
                <td style="padding:7px 8px;border:1px solid #cbd5e1;vertical-align:top;">
                  <div style="font-weight:700;color:#0f172a;">${escapeHtml(sch?.name || '-')}</div>
                  <div style="font-size:11px;color:#64748b;">รหัส: ${escapeHtml(sch?.schoolCode || '-')}</div>
                </td>
                <td style="padding:7px 8px;border:1px solid #cbd5e1;vertical-align:top;">${studentsHtml}</td>
                <td style="padding:7px 8px;border:1px solid #cbd5e1;vertical-align:top;">${coachesHtml}</td>
                <td style="padding:7px 8px;border:1px solid #cbd5e1;vertical-align:top;font-size:11.5px;">${extraDetailHtml}</td>
              </tr>
            `;
          })
          .join('');

        const schoolSubTitle =
          isSchool && currentSchool ? ` (${escapeHtml(currentSchool.name)})` : '';

        sheetBlocks.push(`
          <div class="activity-print-sheet" style="width:210mm;min-height:297mm;background:white;padding:20px 22px;border:1px solid #e2e8f0;margin-bottom:12px;">
            <div style="text-align:center;border-bottom:2px solid #d97706;padding-bottom:10px;margin-bottom:14px;">
              <h2 style="margin:0;color:#78350f;font-size:18px;">รายละเอียดรายชื่อผู้เข้าแข่งขันแยกตามกิจกรรม${schoolSubTitle}</h2>
              <div style="font-size:14px;font-weight:700;margin-top:3px;color:#0f172a;">${escapeHtml(EVENT_TITLE_TH)}</div>
              <div style="font-size:12px;color:#475569;margin-top:2px;">
                ${escapeHtml(EVENT_DATE_TH)} • สถานที่หลัก: ${escapeHtml(EVENT_VENUE_TH)}
              </div>
            </div>

            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:10px 14px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
              <div>
                <div style="font-size:15px;font-weight:800;color:#92400e;">${escapeHtml(comp.name)} (${escapeHtml(comp.type)})</div>
                <div style="font-size:12px;color:#78350f;margin-top:2px;">
                  ระดับชั้น: <strong>${escapeHtml(lvl)}</strong> • สถานที่: <strong>${escapeHtml(sched.venue)}</strong> • เวลา: <strong>${escapeHtml(sched.timeRange)}</strong>
                </div>
              </div>
              <div style="text-align:right;font-size:12px;color:#92400e;white-space:nowrap;">
                <div><strong>จำนวน:</strong> ${levelRegs.length} ทีม/ชุด</div>
              </div>
            </div>

            <table style="width:100%;border-collapse:collapse;font-size:12px;">
              <thead>
                <tr style="background:#f1f5f9;color:#1e293b;">
                  <th style="padding:7px 6px;border:1px solid #cbd5e1;text-align:center;width:34px;">ที่</th>
                  <th style="padding:7px 8px;border:1px solid #cbd5e1;text-align:left;width:165px;">โรงเรียน</th>
                  <th style="padding:7px 8px;border:1px solid #cbd5e1;text-align:left;">ผู้เข้าแข่งขัน</th>
                  <th style="padding:7px 8px;border:1px solid #cbd5e1;text-align:left;">ครูผู้ฝึกสอน</th>
                  <th style="padding:7px 8px;border:1px solid #cbd5e1;text-align:left;width:145px;">รายละเอียด / สถานะ</th>
                </tr>
              </thead>
              <tbody>
                ${
                  rowsHtml ||
                  '<tr><td colspan="5" style="padding:18px;text-align:center;border:1px solid #cbd5e1;color:#64748b;">ยังไม่มีผู้สมัครในกิจกรรมและระดับชั้นนี้</td></tr>'
                }
              </tbody>
            </table>
          </div>
        `);
      });
    });

    if (sheetBlocks.length === 0) {
      showToast('ไม่พบรายการสมัครแข่งขันตามเงื่อนไขที่เลือกสำหรับพิมพ์', 'error');
      return;
    }

    const selectedCompObj = COMPETITIONS.find((c) => c.id === targetCompId);
    const docTitle = selectedCompObj
      ? `รายละเอียดกิจกรรม - ${selectedCompObj.name}${targetLevel !== 'ทั้งหมด' ? ` (${targetLevel})` : ''}`
      : 'รายละเอียดรายชื่อผู้เข้าแข่งขันแยกตามกิจกรรม';

    const extraCss = `
      .activity-print-sheet {
        page-break-after: always;
        break-after: page;
      }
      .activity-print-sheet:last-child {
        page-break-after: auto;
        break-after: auto;
      }
    `;

    const res = openPrintableDocument(docTitle, sheetBlocks.join(''), 'A4 portrait', extraCss);
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  /**
   * พิมพ์สรุปเหรียญรางวัลของโรงเรียน หรือ ตารางสรุปเหรียญรางวัลรวมทุกโรงเรียน
   */
  const handlePrintSchoolMedalSummary = (targetSchoolId?: string) => {
    const isAdmin = authSession.role === 'admin';
    const isSchool = authSession.role === 'school';
    if (!isAdmin && !isSchool) {
      showToast('กรุณาเข้าสู่ระบบก่อนพิมพ์สรุปเหรียญรางวัล', 'error');
      return;
    }

    if (targetSchoolId) {
      const sch = schools.find((s) => s.id === targetSchoolId);
      if (!sch) return;

      const schRegs = registrations.filter((r) => r.schoolId === sch.id);
      const rankedLookup = buildRankedEntryLookup(registrations, scores, roundScores, absentRegs, recusedJudges);
      let gold = 0;
      let silver = 0;
      let bronze = 0;
      let participant = 0;

      const rowHtml = schRegs
        .map((reg, idx) => {
          const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
          const metaKey = `${reg.competitionId}__${String(reg.level || '').trim()}`;
          const meta = evalMeta[metaKey] || evalMeta[`${reg.competitionId}__${reg.level}`] || { status: 'pending', approved: false };
          const isApproved = Boolean(meta.approved);
          const isAbsent = Boolean(absentRegs[reg.id]);
          const rankedEntry = rankedLookup[reg.id];
          const avgScore = !isAbsent && rankedEntry?.hasScore ? rankedEntry.score : 0;
          const hasApprovedScore = isApproved && !isAbsent && Boolean(rankedEntry?.hasScore);
          const medal = isAbsent
            ? { label: 'ไม่เข้าร่วมแข่งขัน', printColor: '#be123c' }
            : getMedalTier(avgScore, hasApprovedScore);

          if (hasApprovedScore) {
            if (medal.label.includes('ทองแดง')) bronze += 1;
            else if (medal.label.includes('ทอง')) gold += 1;
            else if (medal.label.includes('เงิน')) silver += 1;
            else participant += 1;
          }

          return `
            <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding:7px 6px;border:1px solid #cbd5e1;text-align:center;font-weight:700;">${idx + 1}</td>
              <td style="padding:7px 8px;border:1px solid #cbd5e1;">
                <div style="font-weight:700;color:#0f172a;">${escapeHtml(comp?.name || '-')}</div>
                <div style="font-size:11px;color:#64748b;">ระดับ: ${escapeHtml(reg.level)}</div>
              </td>
              <td style="padding:7px 8px;border:1px solid #cbd5e1;">${escapeHtml(reg.students.map((s) => s.name).join(', ') || '-')}</td>
              <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:right;font-weight:700;color:#b45309;">${hasApprovedScore ? avgScore.toFixed(2) : '-'}</td>
              <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:700;color:${isApproved || isAbsent ? medal.printColor : '#64748b'};">
                ${isAbsent ? 'ไม่เข้าร่วมแข่งขัน' : isApproved ? escapeHtml(medal.label) : 'รออนุมัติผล'}
              </td>
            </tr>
          `;
        })
        .join('');

      const bodyHtml = `
        <div style="width:210mm;min-height:297mm;background:white;padding:22px;border:1px solid #e2e8f0;">
          <div style="text-align:center;border-bottom:2px solid #d97706;padding-bottom:12px;margin-bottom:16px;">
            <h2 style="margin:0;color:#78350f;font-size:18px;">สรุปเหรียญรางวัลและผลการแข่งขัน</h2>
            <div style="font-size:14px;font-weight:700;margin-top:3px;">${escapeHtml(EVENT_TITLE_TH)}</div>
            <div style="font-size:13px;font-weight:700;color:#065f46;margin-top:4px;">${escapeHtml(sch.name)} (รหัส ${escapeHtml(sch.schoolCode)})</div>
          </div>

          <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px;text-align:center;">
            <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:10px;">
              <div style="font-size:12px;color:#92400e;font-weight:700;">เหรียญทอง</div>
              <div style="font-size:22px;font-weight:800;color:#b45309;">${gold}</div>
            </div>
            <div style="background:#f1f5f9;border:1px solid #cbd5e1;border-radius:8px;padding:10px;">
              <div style="font-size:12px;color:#475569;font-weight:700;">เหรียญเงิน</div>
              <div style="font-size:22px;font-weight:800;color:#334155;">${silver}</div>
            </div>
            <div style="background:#ffedd5;border:1px solid #fdba74;border-radius:8px;padding:10px;">
              <div style="font-size:12px;color:#9a3412;font-weight:700;">เหรียญทองแดง</div>
              <div style="font-size:22px;font-weight:800;color:#c2410c;">${bronze}</div>
            </div>
            <div style="background:#ecfdf5;border:1px solid #a7f3d0;border-radius:8px;padding:10px;">
              <div style="font-size:12px;color:#065f46;font-weight:700;">รวมเหรียญ / เข้าร่วม</div>
              <div style="font-size:22px;font-weight:800;color:#047857;">${gold + silver + bronze} (${participant})</div>
            </div>
          </div>

          <table style="width:100%;border-collapse:collapse;font-size:12px;">
            <thead>
              <tr style="background:#fef3c7;color:#78350f;">
                <th style="padding:7px 6px;border:1px solid #cbd5e1;width:34px;">ที่</th>
                <th style="padding:7px 8px;border:1px solid #cbd5e1;text-align:left;">รายการแข่งขัน / ระดับชั้น</th>
                <th style="padding:7px 8px;border:1px solid #cbd5e1;text-align:left;">ผู้เข้าแข่งขัน</th>
                <th style="padding:7px 8px;border:1px solid #cbd5e1;text-align:right;width:85px;">คะแนนรวม</th>
                <th style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;width:130px;">เหรียญรางวัล / สถานะ</th>
              </tr>
            </thead>
            <tbody>
              ${rowHtml || '<tr><td colspan="5" style="padding:18px;text-align:center;border:1px solid #cbd5e1;">ยังไม่มีรายการสมัครแข่งขัน</td></tr>'}
            </tbody>
          </table>
        </div>
      `;

      const res = openPrintableDocument(`สรุปเหรียญรางวัล - ${sch.name}`, bodyHtml, 'A4 portrait');
      showToast(res.message, res.ok ? 'success' : 'error');
      return;
    }

    const rankedLookupAll = buildRankedEntryLookup(registrations, scores, roundScores, absentRegs, recusedJudges);
    const standings = schools
      .map((sch) => {
        let gold = 0;
        let silver = 0;
        let bronze = 0;
        let participant = 0;
        let scoreSum = 0;
        let scoreCount = 0;

        registrations
          .filter((r) => r.schoolId === sch.id && !absentRegs[r.id])
          .forEach((reg) => {
            const metaKey = `${reg.competitionId}__${String(reg.level || '').trim()}`;
            const meta = evalMeta[metaKey] || evalMeta[`${reg.competitionId}__${reg.level}`] || { status: 'pending', approved: false };
            if (!meta.approved) return;
            const rankedEntry = rankedLookupAll[reg.id];
            if (!rankedEntry?.hasScore) return;
            scoreSum += rankedEntry.score;
            scoreCount += 1;
            const medal = getMedalTier(rankedEntry.score, true);
            if (medal.label.includes('ทองแดง')) bronze += 1;
            else if (medal.label.includes('ทอง')) gold += 1;
            else if (medal.label.includes('เงิน')) silver += 1;
            else participant += 1;
          });

        return {
          sch,
          gold,
          silver,
          bronze,
          participant,
          totalMedals: gold + silver + bronze,
          avgScore: scoreCount > 0 ? scoreSum / scoreCount : 0
        };
      })
      .sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold;
        if (b.silver !== a.silver) return b.silver - a.silver;
        if (b.bronze !== a.bronze) return b.bronze - a.bronze;
        if (b.totalMedals !== a.totalMedals) return b.totalMedals - a.totalMedals;
        return b.avgScore - a.avgScore;
      });

    const rowsHtml = standings
      .map(
        (item, idx) => `
          <tr style="background:${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
            <td style="padding:7px 6px;border:1px solid #cbd5e1;text-align:center;font-weight:700;">${idx + 1}</td>
            <td style="padding:7px 8px;border:1px solid #cbd5e1;font-weight:700;">${escapeHtml(item.sch.name)}</td>
            <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:800;color:#b45309;">${item.gold}</td>
            <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:800;color:#475569;">${item.silver}</td>
            <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:800;color:#c2410c;">${item.bronze}</td>
            <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;font-weight:800;color:#047857;">${item.totalMedals}</td>
            <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:center;color:#64748b;">${item.participant}</td>
          </tr>
        `
      )
      .join('');

    const bodyHtml = `
      <div style="width:210mm;min-height:297mm;background:white;padding:22px;border:1px solid #e2e8f0;">
        <div style="text-align:center;border-bottom:2px solid #059669;padding-bottom:12px;margin-bottom:16px;">
          <h2 style="margin:0;color:#064e3b;font-size:18px;">ตารางสรุปเหรียญรางวัลรวมทุกโรงเรียน</h2>
          <div style="font-size:14px;font-weight:700;margin-top:3px;">${escapeHtml(EVENT_TITLE_TH)}</div>
          <div style="font-size:12px;color:#475569;margin-top:2px;">เฉพาะรายการที่ผู้ดูแลระบบอนุมัติประกาศผลแล้ว</div>
        </div>
        <table style="width:100%;border-collapse:collapse;font-size:12px;">
          <thead>
            <tr style="background:#ecfdf5;color:#065f46;">
              <th style="padding:8px 6px;border:1px solid #cbd5e1;width:44px;">อันดับ</th>
              <th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">โรงเรียน</th>
              <th style="padding:8px;border:1px solid #cbd5e1;width:62px;">ทอง</th>
              <th style="padding:8px;border:1px solid #cbd5e1;width:62px;">เงิน</th>
              <th style="padding:8px;border:1px solid #cbd5e1;width:62px;">ทองแดง</th>
              <th style="padding:8px;border:1px solid #cbd5e1;width:72px;">รวมเหรียญ</th>
              <th style="padding:8px;border:1px solid #cbd5e1;width:68px;">เข้าร่วม</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>
      </div>
    `;

    const res = openPrintableDocument('ตารางสรุปเหรียญรางวัลรวมทุกโรงเรียน', bodyHtml, 'A4 portrait');
    showToast(res.message, res.ok ? 'success' : 'error');
  };

  /**
   * สร้างและเปิดหน้าต่างพิมพ์ / ดาวน์โหลด PDF ใบลงทะเบียนรายกิจกรรมและระดับชั้น
   */
  const handleDownloadRegistrationSheetPdf = (targetCompId: string, targetLevel = 'ทั้งหมด') => {
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
                .map((st, sIdx) => `${reg.students.length > 1 ? `${sIdx + 1}. ` : ''}${escapeHtml(st.name)}`)
                .join('<br/>') || '-';
            const songNote = comp.requiresSongs
              ? `<div style="font-size:11px;color:#0369a1;margin-top:4px;">คัดเลือก: ${escapeHtml(reg.qualifyingSong || '-')}<br/>ตัดสิน: ${escapeHtml(reg.finalSong || '-')}</div>`
              : '';

            return `
              <tr>
                <td style="padding: 8px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 8px; border: 1px solid #94a3b8;">${escapeHtml(sch ? sch.name : '-')}</td>
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
                <div style="font-size: 14px; font-weight: 700; margin-top: 3px;">${escapeHtml(EVENT_TITLE_TH)}</div>
                <div style="font-size: 13px; color: #334155; margin-top: 4px;">
                  กิจกรรม: <strong>${escapeHtml(comp.name)}</strong> (${escapeHtml(comp.type)}) • ระดับ: <strong>${escapeHtml(lvl)}</strong>
                </div>
                <div style="font-size: 12px; color: #475569; margin-top: 2px;">
                  ${escapeHtml(EVENT_DATE_TH)} • สถานที่: ${escapeHtml(sched.venue)} • เวลา: ${escapeHtml(sched.timeRange)}
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
  const handleDownloadScoreSheetPdf = (targetCompId: string, targetLevel = 'ทั้งหมด') => {
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

    const buildLevelSheetHtml = (
      lvl: string,
      judgePerson: JudgeItem | null = null,
      _judgeOrdinal = 0,
      signAllJudges = false
    ) => {
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
              .map((st, sIdx) => `${reg.students.length > 1 ? `${sIdx + 1}. ` : ''}${escapeHtml(st.name)}`)
              .join('<br/>') || '-';
          const existingJudgeScore =
            judgePerson && scores[reg.id] && scores[reg.id][judgePerson.id] !== undefined
              ? scores[reg.id][judgePerson.id]
              : '';
          const formattedScoreText =
            existingJudgeScore !== '' ? Number(existingJudgeScore).toFixed(2) : '';

          if (customCompCriteria) {
            const criterionCells = criteriaList
              .map(() => {
                const colWidthMm = Math.max(12, Math.min(24, Math.floor(95 / criteriaList.length)));
                return `<td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; width: ${colWidthMm}mm;"></td>`;
              })
              .join('');

            return `
              <tr>
                <td style="padding: 6px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
                <td style="padding: 6px; border: 1px solid #94a3b8;">${escapeHtml(sch ? sch.name : '-')}</td>
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
              <td style="padding: 8px; border: 1px solid #94a3b8;">${escapeHtml(sch ? sch.name : '-')}</td>
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
                    <div style="margin-top: 4px; font-weight: 700;">(${escapeHtml(j.name)})</div>
                    <div style="font-size: 11.5px; color: #334155;">${escapeHtml(j.position || 'กรรมการตัดสิน')}</div>
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
            <div style="margin-top: 4px; font-weight: 700;">(${escapeHtml(judgePerson.name)})</div>
            <div style="font-size: 11.5px; color: #334155;">${escapeHtml(judgePerson.position || 'กรรมการตัดสิน')}</div>
          </div>
        `
        : levelJudges.length > 0
        ? levelJudges
            .map(
              (j) => `
                <div style="text-align: center; width: 48%; margin-bottom: 12px;">
                  <div>ลงชื่อ...........................................................กรรมการผู้ให้คะแนน</div>
                  <div style="margin-top: 4px; font-weight: 700;">(${escapeHtml(j.name)})</div>
                  <div style="font-size: 11.5px; color: #334155;">${escapeHtml(j.position || 'กรรมการตัดสิน')}</div>
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
                    `<div>${escapeHtml(c.label)} <strong>(${escapeHtml(c.maxLabel || `${c.max} คะแนน`)})</strong></div>`
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
                    `<th style="padding: 6px 3px; border: 1px solid #94a3b8;">${escapeHtml(c.label)}<br/>(${c.max})</th>`
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
        ? `<div style="font-size: 12px; font-weight: 700; color: #047857; margin-top: 3px;">ใบลงคะแนนรายบุคคล • กรรมการ: ${escapeHtml(judgePerson.name)} (${escapeHtml(judgePerson.position || 'กรรมการตัดสิน')})</div>`
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
              <div style="font-size: 13.5px; font-weight: 700; margin-top: 2px;">${escapeHtml(EVENT_TITLE_TH)}</div>
              <div style="font-size: 12.5px; color: #334155; margin-top: 3px;">
                กิจกรรม: <strong>${escapeHtml(comp.name)}</strong> (${escapeHtml(comp.type)}) • ระดับ: <strong>${escapeHtml(lvl)}</strong>
              </div>
              <div style="font-size: 11.5px; color: #475569; margin-top: 2px;">
                ${escapeHtml(EVENT_DATE_TH)} • สถานที่: ${escapeHtml(sched.venue)} • เวลา: ${escapeHtml(sched.timeRange)}
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

  const handleDownloadCombinedJudgeScoreSheetPdf = (
    targetCompId: string,
    targetLevel: string = 'ทั้งหมด'
  ) => {
    const comp = COMPETITIONS.find((c) => c.id === targetCompId);
    if (!comp) return;
    const levelsToPrint =
      targetLevel && targetLevel !== 'ทั้งหมด' && comp.levels.includes(targetLevel)
        ? [targetLevel]
        : comp.levels;
    const isTwoRound = isTwoRoundCompetition(comp.id);

    const buildCombinedLevelHtml = (lvl: string) => {
      const levelJudges = judges.filter(
        (j) => j.competitionId === comp.id && String(j.level || '').trim() === lvl.trim()
      );
      const levelRegs = registrations.filter(
        (r) => r.competitionId === comp.id && String(r.level || '').trim() === lvl.trim()
      );
      const rankedList = buildCompetitionRankedList(
        comp.id,
        lvl,
        registrations,
        scores,
        roundScores,
        absentRegs,
        recusedJudges
      );
      const rankByRegId: Record<string, (typeof rankedList)[number]> = {};
      rankedList.forEach((e) => {
        rankByRegId[e.reg.id] = e;
      });
      const sched = schedules[`${comp.id}__${lvl}`] || {
        venue: EVENT_VENUE_TH,
        timeRange: '08.30 น. เป็นต้นไป'
      };

      const judgeColsHtml =
        levelJudges.length > 0
          ? levelJudges
              .map(
                (j, idx) =>
                  `<th style="padding: 6px 4px; border: 1px solid #94a3b8; min-width: 24mm; text-align: center; font-size: 10.5px;">กรรมการ ${idx + 1}<br/><span style="font-weight: 500; font-size: 9.5px;">${escapeHtml(j.name)}</span></th>`
              )
              .join('')
          : `<th style="padding: 6px 4px; border: 1px solid #94a3b8; min-width: 28mm; text-align: center;">ยังไม่มีรายชื่อกรรมการ</th>`;

      const rowsHtml = levelRegs
        .map((reg, idx) => {
          const sch = schools.find((s) => s.id === reg.schoolId);
          const isAbsent = Boolean(absentRegs[reg.id]);
          const rankedEntry = rankByRegId[reg.id];
          const rInfo = rankedEntry?.roundInfo;
          const studentList = reg.students.map((s) => escapeHtml(s.name)).join('<br/>');

          const judgeCells =
            levelJudges.length > 0
              ? levelJudges
                  .map((j) => {
                    if (isAbsent) {
                      return `<td style="padding: 6px 4px; border: 1px solid #94a3b8; text-align: center; color: #be123c; font-size: 10px;">ไม่เข้าร่วม</td>`;
                    }
                    if (recusedJudges[reg.id]?.[j.id]) {
                      return `<td style="padding: 6px 4px; border: 1px solid #94a3b8; text-align: center; background: #fffbeb; color: #b45309; font-size: 9.5px; font-weight: 700;">งดเว้น<br/>(โรงเรียนตน)</td>`;
                    }
                    if (isTwoRound) {
                      const rs = roundScores[reg.id] || {};
                      const hasRoundStore = Boolean(roundScores[reg.id]);
                      const qScore =
                        rs.qualifying?.[j.id] ??
                        (!hasRoundStore ? scores[reg.id]?.[j.id] : undefined);
                      const fScore = rs.final?.[j.id];
                      const parts: string[] = [];
                      if (typeof qScore === 'number') parts.push(`ค:${qScore.toFixed(0)}`);
                      if (typeof fScore === 'number') parts.push(`ต:${fScore.toFixed(0)}`);
                      return `<td style="padding: 6px 4px; border: 1px solid #94a3b8; text-align: center; font-weight: 600; font-size: 10.5px;">${parts.length > 0 ? parts.join(' / ') : '-'}</td>`;
                    }
                    const sc = scores[reg.id]?.[j.id];
                    return `<td style="padding: 6px 4px; border: 1px solid #94a3b8; text-align: center; font-weight: 600;">${typeof sc === 'number' ? sc.toFixed(2) : '-'}</td>`;
                  })
                  .join('')
              : `<td style="padding: 6px 4px; border: 1px solid #94a3b8; text-align: center;">-</td>`;

          const avgCell = isAbsent
            ? '<span style="color: #be123c; font-size: 10px;">ไม่เข้าร่วม</span>'
            : rankedEntry?.hasScore
            ? `${rankedEntry.score.toFixed(2)}${isTwoRound && rInfo?.activeRoundLabel ? `<div style="font-size: 9px; color: #0369a1;">(${escapeHtml(rInfo.activeRoundLabel)})</div>` : ''}`
            : '-';
          const awardText = isAbsent
            ? 'ไม่เข้าร่วม'
            : rankedEntry?.hasScore && rankedEntry.rankNum
            ? `${getRankAwardLabel(rankedEntry.rankNum) || `อันดับ ${rankedEntry.rankNum}`}`
            : '-';

          return `
            <tr style="background: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 6px 4px; border: 1px solid #94a3b8; text-align: center; font-weight: 700;">${idx + 1}</td>
              <td style="padding: 6px 6px; border: 1px solid #94a3b8; font-weight: 600;">${escapeHtml(sch?.name || '-')}</td>
              <td style="padding: 6px 6px; border: 1px solid #94a3b8; font-size: 11px;">${studentList || '-'}</td>
              ${judgeCells}
              <td style="padding: 6px 4px; border: 1px solid #94a3b8; text-align: center; font-weight: 800; color: #065f46;">${avgCell}</td>
              <td style="padding: 6px 4px; border: 1px solid #94a3b8; text-align: center; font-size: 10.5px; font-weight: 700;">${escapeHtml(awardText)}</td>
            </tr>
          `;
        })
        .join('');

      const signBlocks =
        levelJudges.length > 0
          ? levelJudges
              .map(
                (j) => `
                <div style="text-align: center; width: 31%; margin-bottom: 10px;">
                  <div>ลงชื่อ................................................</div>
                  <div style="margin-top: 3px; font-weight: 700;">(${escapeHtml(j.name)})</div>
                  <div style="font-size: 10.5px; color: #334155;">${escapeHtml(j.position || 'กรรมการตัดสิน')}</div>
                </div>
              `
              )
              .join('')
          : `<div style="text-align: center; width: 45%;"><div>ลงชื่อ................................................ประธานกรรมการ</div><div style="margin-top: 4px;">(................................................)</div></div>`;

      return `
        <div class="page-break" style="width: 297mm; min-height: 210mm; background: white; padding: 16px 20px; border: 1px solid #e2e8f0; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <div style="text-align: center; border-bottom: 2px solid #0f766e; padding-bottom: 8px; margin-bottom: 10px;">
              <div style="font-size: 16px; font-weight: 700; color: #115e59;">ใบลงคะแนนรวมของคณะกรรมการตัดสินทั้งหมด</div>
              <div style="font-size: 13px; font-weight: 700; margin-top: 2px;">${escapeHtml(EVENT_TITLE_TH)}</div>
              <div style="font-size: 12px; color: #334155; margin-top: 2px;">
                กิจกรรม: <strong>${escapeHtml(comp.name)}</strong> (${escapeHtml(comp.type)}) • ระดับ: <strong>${escapeHtml(lvl)}</strong>
              </div>
              <div style="font-size: 11px; color: #475569; margin-top: 2px;">
                ${escapeHtml(EVENT_DATE_TH)} • สถานที่: ${escapeHtml(sched.venue)} • เวลา: ${escapeHtml(sched.timeRange)}
              </div>
            </div>

            <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
              <thead>
                <tr style="background: #ccfbf1; color: #134e4a;">
                  <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 9mm;">ที่</th>
                  <th style="padding: 6px 6px; border: 1px solid #94a3b8;">โรงเรียน</th>
                  <th style="padding: 6px 6px; border: 1px solid #94a3b8;">ผู้เข้าแข่งขัน</th>
                  ${judgeColsHtml}
                  <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 22mm; text-align: center;">คะแนนเฉลี่ย<br/>(เต็ม ๑๐๐)</th>
                  <th style="padding: 6px 4px; border: 1px solid #94a3b8; width: 28mm; text-align: center;">อันดับ / ผล</th>
                </tr>
              </thead>
              <tbody>
                ${
                  rowsHtml ||
                  `<tr><td colspan="${Math.max(1, levelJudges.length) + 5}" style="padding: 18px; border: 1px solid #94a3b8; text-align: center; color: #64748b;">ยังไม่มีผู้สมัครในระดับชั้นนี้</td></tr>`
                }
              </tbody>
            </table>
          </div>

          <div style="margin-top: 14px; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
            <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; font-size: 11.5px;">
              ${signBlocks}
            </div>
          </div>
        </div>
      `;
    };

    const htmlSections = levelsToPrint.map((lvl) => buildCombinedLevelHtml(lvl)).join('');
    const res = openPrintableDocument(
      `ใบลงคะแนนรวมกรรมการทั้งหมด - ${comp.name}`,
      htmlSections,
      'A4 landscape'
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
    const totalStudents = registrations.reduce(
      (sum, r) => sum + (Array.isArray(r?.students) ? r.students.length : 0),
      0
    );
    const approvedCount = Object.values(evalMeta).filter((m) => Boolean(m && m.approved)).length;

    const safeBannerBg = safeImageUrl(bannerBgUrl);

    return (
      <div className="space-y-6">
        {/* Hero Banner */}
        {safeBannerBg ? (
          <div className="overflow-hidden rounded-3xl bg-white shadow-xl border border-slate-200/80">
            <div className="w-full bg-slate-100/70">
              <img
                src={safeBannerBg}
                alt={EVENT_TITLE_TH}
                className="w-full h-auto max-h-[540px] object-contain mx-auto block"
              />
            </div>
            <div className="px-5 py-4 bg-gradient-to-r from-amber-50/90 via-white to-orange-50/90 border-t border-amber-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-amber-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>{EVENT_DATE_TH}</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-600">
                  สถานที่จัดการแข่งขัน: <strong className="text-slate-800">{EVENT_VENUE_TH}</strong>
                </div>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <button
                  onClick={() => handleSelectMenu('register')}
                  className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white px-4 py-2 text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>ระบบสมัครแข่งขัน</span>
                </button>
                <button
                  onClick={() => handleSelectMenu('competitions')}
                  className="inline-flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  <ListChecks className="w-4 h-4 text-amber-600" />
                  <span>ดูรายการแข่งขัน (10 รายการ)</span>
                </button>
                <button
                  onClick={() => handleSelectMenu('results')}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 text-xs sm:text-sm font-semibold transition cursor-pointer"
                >
                  <Trophy className="w-4 h-4 text-amber-300" />
                  <span>ประกาศผลคะแนน</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-500 via-orange-500 to-rose-500 p-6 sm:p-8 text-white shadow-xl">
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
        )}

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
    const isAdminOrManager = authSession.role === 'admin' || authSession.role === 'manager';
    const isSchool = authSession.role === 'school';

    if (!isAdminOrManager && !isSchool) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-amber-500 mx-auto" />
          <div className="font-bold text-slate-800">
            กรุณาเข้าสู่ระบบโรงเรียน ผู้จัดการแข่งขัน หรือผู้ดูแลระบบเพื่อลงทะเบียนแข่งขัน
          </div>
          <button
            type="button"
            onClick={() => {
              handleSelectMenu('login-school');
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

    const handleStudentNameChange = (idx: number, val: string) => {
      setRegForm((prev) => {
        const nextNames = [...prev.studentNames];
        nextNames[idx] = val;
        return { ...prev, studentNames: nextNames };
      });
    };

    const handleRemoveStudentSlot = (idx: number) => {
      setRegForm((prev) => {
        if (prev.studentNames.length <= 1) return prev;
        return {
          ...prev,
          studentNames: prev.studentNames.filter((_, i) => i !== idx),
          studentPhotos: prev.studentPhotos.filter((_, i) => i !== idx)
        };
      });
    };

    const handleCoachNameChange = (idx: number, val: string) => {
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

    const handleRemoveCoachSlot = (idx: number) => {
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
            {isAdminOrManager && (
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
                        disabled={isUploadingImage}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.currentTarget.value = '';
                          void handleStudentPhotoUpload(idx, f);
                        }}
                      />
                    </label>
                    {regForm.studentPhotos[idx] && (
                      <div className="flex items-center gap-2">
                        <img
                          src={safeImageUrl(regForm.studentPhotos[idx])}
                          alt="รูปผู้เข้าแข่งขัน"
                          className="w-9 h-9 rounded-lg object-cover object-top border border-amber-200 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setRegForm((prev) => {
                              const nextPhotos = [...prev.studentPhotos];
                              nextPhotos[idx] = '';
                              return { ...prev, studentPhotos: nextPhotos };
                            })
                          }
                          className="text-rose-600 hover:underline font-semibold cursor-pointer"
                        >
                          ลบรูป
                        </button>
                      </div>
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
                        disabled={isUploadingImage}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.currentTarget.value = '';
                          void handleCoachPhotoUpload(idx, f);
                        }}
                      />
                    </label>
                    {regForm.coachPhotos[idx] && (
                      <div className="flex items-center gap-2">
                        <img
                          src={safeImageUrl(regForm.coachPhotos[idx])}
                          alt="รูปครูผู้ฝึกสอน"
                          className="w-9 h-9 rounded-lg object-cover object-top border border-emerald-200 bg-white"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setRegForm((prev) => {
                              const nextPhotos = [...prev.coachPhotos];
                              nextPhotos[idx] = '';
                              return { ...prev, coachPhotos: nextPhotos };
                            })
                          }
                          className="text-rose-600 hover:underline font-semibold cursor-pointer"
                        >
                          ลบรูป
                        </button>
                      </div>
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
                      {isAdminOrManager && (
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
                        onClick={() => {
                          setConfirmDeleteRegId(null);
                          prepareRegistrationForm(reg.competitionId, reg.level, reg);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="inline-flex items-center gap-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 px-3 py-1.5 text-xs font-bold cursor-pointer"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>แก้ไข</span>
                      </button>
                      {confirmDeleteRegId === reg.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleDeleteRegistration(reg.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 text-xs font-bold cursor-pointer"
                          >
                            <span>ยืนยันยกเลิก</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteRegId(null)}
                            className="rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 text-xs font-bold cursor-pointer"
                          >
                            กลับ
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteRegId(reg.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ยกเลิกการลงทะเบียน</span>
                        </button>
                      )}
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

    const getDefaultScheduleItem = (key: string): ScheduleItem => ({
      venue: schedules[key]?.venue || EVENT_VENUE_TH,
      dateLabel: schedules[key]?.dateLabel || EVENT_DATE_TH,
      timeRange: schedules[key]?.timeRange || '08.30 - 12.00 น.',
      notes: schedules[key]?.notes || ''
    });

    const handleStartEditSchedule = (key: string) => {
      const baseItem = getDefaultScheduleItem(key);
      setScheduleDrafts((prev) => ({
        ...prev,
        [key]: { ...baseItem }
      }));
      setEditingScheduleKey(key);
    };

    const handleCancelEditSchedule = (key: string) => {
      setScheduleDrafts((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      if (editingScheduleKey === key) {
        setEditingScheduleKey(null);
      }
    };

    const updateScheduleDraftField = (key: string, field: keyof ScheduleItem, value: string) => {
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

    const handleSaveScheduleItem = async (key: string, compName: string, lvlName: string) => {
      const draft = scheduleDrafts[key] || getDefaultScheduleItem(key);
      const cleanedVenue = (draft.venue || '').trim() || EVENT_VENUE_TH;
      const cleanedTime = (draft.timeRange || '').trim() || '08.30 - 12.00 น.';
      const cleanedDate = (draft.dateLabel || '').trim() || EVENT_DATE_TH;
      const cleanedNotes = (draft.notes || '').trim();

      try {
        await appApiCall('/schedules/save', {
          key,
          venue: cleanedVenue,
          dateLabel: cleanedDate,
          timeRange: cleanedTime,
          notes: cleanedNotes
        });
        setScheduleDrafts((prev) => {
          const next = { ...prev };
          delete next[key];
          return next;
        });
        setEditingScheduleKey(null);
        showToast(`บันทึกสถานที่และเวลาแข่งขัน "${compName} (${lvlName})" เรียบร้อยแล้ว`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกตารางการแข่งขันได้', 'error');
      }
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

          <div className="flex flex-wrap items-center gap-2.5">
            {isAdmin && (
              <select
                value={selectedSchoolFilter}
                onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none cursor-pointer"
              >
                <option value="all">ทุกโรงเรียน ({schools.length})</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    [{s.schoolCode}] {s.name}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => handlePrintBySchoolDetails()}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 text-sm font-bold shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                {isAdmin && selectedSchoolFilter === 'all'
                  ? 'พิมพ์รายละเอียดทั้งหมด (ทุกโรงเรียน)'
                  : 'พิมพ์รายละเอียดการแข่งขัน'}
              </span>
            </button>
          </div>
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
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold bg-white/20 px-3 py-1 rounded-full">
                      สมัคร {schRegs.length} รายการ
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePrintBySchoolDetails(sch.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5" />
                      <span>พิมพ์รายละเอียด</span>
                    </button>
                  </div>
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
                        const canManage = isAdmin || (isSchool && reg.schoolId === authSession.schoolId);
                        return (
                          <div
                            key={reg.id}
                            className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 flex flex-col justify-between gap-3 text-xs sm:text-sm"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-orange-700">{comp?.name}</span>
                                <span className="text-xs font-semibold bg-white border border-slate-200 px-2.5 py-0.5 rounded-full text-slate-700 shrink-0">
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
                              {comp?.requiresSongs && (
                                <div className="text-xs text-sky-700">
                                  <strong>เพลง:</strong> คัดเลือก &ldquo;{reg.qualifyingSong || '-'}&rdquo; / ตัดสิน &ldquo;{reg.finalSong || '-'}&rdquo;
                                </div>
                              )}
                            </div>

                            {canManage && (
                              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-200/70">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDeleteRegId(null);
                                    openBySchoolEditModal(reg);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200/70 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                  <span>แก้ไขข้อมูลการสมัคร</span>
                                </button>
                                {confirmDeleteRegId === reg.id ? (
                                  <div className="flex items-center gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRegistration(reg.id)}
                                      className="inline-flex items-center gap-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1.5 text-xs font-bold transition cursor-pointer"
                                    >
                                      <span>ยืนยันยกเลิก</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRegId(null)}
                                      className="rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer"
                                    >
                                      กลับ
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteRegId(reg.id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/70 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>ยกเลิกการลงทะเบียน</span>
                                  </button>
                                )}
                              </div>
                            )}
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

    const schoolRegisteredComps = isSchool
      ? COMPETITIONS.filter((c) =>
          registrations.some(
            (r) => r.schoolId === authSession.schoolId && r.competitionId === c.id
          )
        )
      : COMPETITIONS;

    const effectiveCompFilter =
      selectedCompFilter !== 'all' &&
      !schoolRegisteredComps.some((c) => c.id === selectedCompFilter)
        ? 'all'
        : selectedCompFilter;

    const availableLevelsForDropdown = isSchool
      ? Array.from(
          new Set(
            registrations
              .filter(
                (r) =>
                  r.schoolId === authSession.schoolId &&
                  (effectiveCompFilter === 'all' || r.competitionId === effectiveCompFilter)
              )
              .map((r) => r.level)
          )
        )
      : Array.from(new Set([...LEVELS_STANDARD, ...LEVELS_UNLIMITED]));

    const levelFilters = ['ทั้งหมด', ...availableLevelsForDropdown];
    const effectiveLevelFilter =
      selectedLevelFilter !== 'ทั้งหมด' && !levelFilters.includes(selectedLevelFilter)
        ? 'ทั้งหมด'
        : selectedLevelFilter;

    const filteredComps = schoolRegisteredComps.filter((c) =>
      effectiveCompFilter === 'all' ? true : c.id === effectiveCompFilter
    );

    const activeActivityComp = viewingActivityTarget
      ? COMPETITIONS.find((c) => c.id === viewingActivityTarget.compId) || null
      : null;
    const activeActivityRegs = viewingActivityTarget
      ? registrations.filter(
          (r) =>
            r.competitionId === viewingActivityTarget.compId &&
            r.level === viewingActivityTarget.level &&
            (isSchool ? r.schoolId === authSession.schoolId : true)
        )
      : [];
    const activeActivitySchedule = viewingActivityTarget
      ? schedules[`${viewingActivityTarget.compId}__${String(viewingActivityTarget.level).trim()}`] ||
        schedules[`${viewingActivityTarget.compId}__${viewingActivityTarget.level}`] || {
          venue: EVENT_VENUE_TH,
          dateLabel: EVENT_DATE_TH,
          timeRange: '08.30 น. เป็นต้นไป',
          notes: '-'
        }
      : null;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Layers className="w-6 h-6 text-orange-500" />
                <span>รายชื่อแยกตามกิจกรรม</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                {isSchool
                  ? 'แสดงเฉพาะกิจกรรมและระดับชั้นที่โรงเรียนของท่านสมัครเข้าแข่งขัน พร้อมคำสั่งดูรายละเอียดและพิมพ์'
                  : 'สรุปรายชื่อผู้เข้าแข่งขัน ครูผู้ฝึกสอน และโรงเรียนในแต่ละกิจกรรมและระดับชั้น พร้อมคำสั่งดูรายละเอียดและพิมพ์'}
              </p>
            </div>

            {schoolRegisteredComps.length > 0 && (
              <button
                type="button"
                onClick={() => handlePrintByActivityDetails(effectiveCompFilter, effectiveLevelFilter)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer self-start sm:self-auto"
              >
                <Printer className="w-4 h-4" />
                <span>พิมพ์รายละเอียดทั้งหมด</span>
              </button>
            )}
          </div>

          {schoolRegisteredComps.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <select
                value={effectiveCompFilter}
                onChange={(e) => setSelectedCompFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none cursor-pointer"
              >
                <option value="all">ทุกกิจกรรมที่สมัคร ({schoolRegisteredComps.length})</option>
                {schoolRegisteredComps.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={effectiveLevelFilter}
                onChange={(e) => setSelectedLevelFilter(e.target.value)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none cursor-pointer"
              >
                {levelFilters.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === 'ทั้งหมด' ? 'ทุกระดับชั้น' : lvl}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {schoolRegisteredComps.length === 0 ? (
          <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
            <Layers className="w-9 h-9 text-amber-400 mx-auto" />
            <div className="font-bold text-slate-800">
              โรงเรียนของท่านยังไม่มีรายการสมัครเข้าแข่งขัน
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              ระบบจะแสดงเฉพาะกิจกรรมและระดับชั้นที่โรงเรียนสมัครเข้าแข่งขันแล้วเท่านั้น
            </p>
            {registrationOpen && (
              <button
                type="button"
                onClick={() => handleSelectMenu('register')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 text-sm font-bold cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>ไปหน้าสมัครแข่งขัน</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-5">
            {filteredComps.map((comp) => {
              const baseLevels =
                effectiveLevelFilter === 'ทั้งหมด'
                  ? comp.levels
                  : comp.levels.filter((l) => l === effectiveLevelFilter);

              const levelsToShow = isSchool
                ? baseLevels.filter((lvl) =>
                    registrations.some(
                      (r) =>
                        r.schoolId === authSession.schoolId &&
                        r.competitionId === comp.id &&
                        r.level === lvl
                    )
                  )
                : baseLevels;

              if (levelsToShow.length === 0) return null;

              return (
                <div key={comp.id} className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
                  <div className={`px-5 py-3.5 bg-gradient-to-r ${comp.accentColor} text-white font-bold text-base flex flex-wrap items-center justify-between gap-2`}>
                    <span>
                      {comp.name} ({comp.type})
                    </span>
                    <button
                      type="button"
                      onClick={() => handlePrintByActivityDetails(comp.id, effectiveLevelFilter)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white/95 hover:bg-white text-slate-800 px-3 py-1 text-xs font-bold shadow-xs transition cursor-pointer"
                    >
                      <Printer className="w-3.5 h-3.5 text-amber-600" />
                      <span>พิมพ์กิจกรรมนี้</span>
                    </button>
                  </div>

                  <div className="p-5 space-y-4">
                    {levelsToShow.map((lvl) => {
                      const levelRegs = registrations.filter((r) => {
                        const compLvlOk = r.competitionId === comp.id && r.level === lvl;
                        const schoolOk = isSchool ? r.schoolId === authSession.schoolId : true;
                        return compLvlOk && schoolOk;
                      });

                      return (
                        <div key={`${comp.id}__${lvl}`} className="rounded-xl border border-slate-200/80 p-4 bg-slate-50/40 space-y-3">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${comp.badgeBg}`}>
                                {lvl}
                              </span>
                              <span className="text-xs font-semibold text-slate-500">
                                จำนวน {levelRegs.length} ทีม/ชุด
                              </span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  setViewingActivityTarget({ compId: comp.id, level: lvl })
                                }
                                className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                <span>ดูรายละเอียด</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handlePrintByActivityDetails(comp.id, lvl)}
                                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition cursor-pointer"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>พิมพ์</span>
                              </button>
                            </div>
                          </div>

                          {levelRegs.length === 0 ? (
                            <div className="text-xs text-slate-400">ยังไม่มีผู้สมัครในระดับชั้นนี้</div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs sm:text-sm">
                              {levelRegs.map((reg, idx) => {
                                const sch = schools.find((s) => s.id === reg.schoolId);
                                const isAbsent = Boolean(absentRegs[reg.id]);
                                return (
                                  <div key={reg.id} className="rounded-lg bg-white border border-slate-200/70 p-3 space-y-1">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="font-bold text-slate-800">
                                        {idx + 1}. {sch?.name || '-'}
                                      </div>
                                      {isAbsent && (
                                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                                          ไม่เข้าร่วมแข่งขัน
                                        </span>
                                      )}
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
        )}

        {/* Modal: ดูรายละเอียดกิจกรรมและระดับชั้น */}
        {viewingActivityTarget && activeActivityComp && activeActivitySchedule && (
          <div
            onClick={() => setViewingActivityTarget(null)}
            className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
                      <Layers className="w-5 h-5 text-orange-500 shrink-0" />
                      <span>{activeActivityComp.name}</span>
                    </h3>
                    <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${activeActivityComp.badgeBg}`}>
                      {viewingActivityTarget.level}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>สถานที่: {activeActivitySchedule.venue}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>
                        {activeActivitySchedule.dateLabel || EVENT_DATE_TH} • {activeActivitySchedule.timeRange}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      handlePrintByActivityDetails(
                        activeActivityComp.id,
                        viewingActivityTarget.level
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>พิมพ์รายละเอียด</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewingActivityTarget(null)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                    aria-label="ปิดหน้าต่าง"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-3">
                {activeActivityRegs.length === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-8 text-center text-sm text-slate-400">
                    ยังไม่มีผู้สมัครในกิจกรรมและระดับชั้นนี้
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-200 overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs">
                          <th className="py-2.5 px-3 font-bold text-center w-12">ที่</th>
                          <th className="py-2.5 px-3 font-bold">โรงเรียน</th>
                          <th className="py-2.5 px-3 font-bold">ผู้เข้าแข่งขัน</th>
                          <th className="py-2.5 px-3 font-bold">ครูผู้ฝึกสอน</th>
                          <th className="py-2.5 px-3 font-bold text-center">สถานะ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {activeActivityRegs.map((reg, idx) => {
                          const sch = schools.find((s) => s.id === reg.schoolId);
                          const isAbsent = Boolean(absentRegs[reg.id]);
                          return (
                            <tr key={reg.id} className="hover:bg-amber-50/30">
                              <td className="py-3 px-3 text-center font-bold text-slate-500 align-top">
                                {idx + 1}
                              </td>
                              <td className="py-3 px-3 align-top">
                                <div className="font-bold text-slate-800">{sch?.name || '-'}</div>
                                <div className="text-[11px] text-slate-500">
                                  รหัส: {sch?.schoolCode || '-'}
                                </div>
                              </td>
                              <td className="py-3 px-3 align-top text-slate-700 space-y-0.5">
                                {reg.students.map((s, sIdx) => (
                                  <div key={sIdx}>
                                    {reg.students.length > 1 ? `${sIdx + 1}. ` : ''}
                                    {s.name}
                                  </div>
                                ))}
                                {activeActivityComp.requiresSongs && (
                                  <div className="text-[11px] text-sky-700 pt-1">
                                    เพลงคัดเลือก: {reg.qualifyingSong || '-'} • เพลงตัดสิน:{' '}
                                    {reg.finalSong || '-'}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 align-top text-slate-600 space-y-0.5">
                                {reg.coaches.map((c, cIdx) => {
                                  const cName = typeof c === 'string' ? c : c.name;
                                  return (
                                    <div key={cIdx}>
                                      {reg.coaches.length > 1 ? `${cIdx + 1}. ` : ''}
                                      {cName}
                                    </div>
                                  );
                                })}
                              </td>
                              <td className="py-3 px-3 text-center align-top whitespace-nowrap">
                                {isAbsent ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                    ไม่เข้าร่วมแข่งขัน
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    เข้าร่วมแข่งขัน
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex justify-end">
                <button
                  type="button"
                  onClick={() => setViewingActivityTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}
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
              onChange={(e) => setCardPrintLayout(e.target.value as '4-up' | '1-up')}
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

            return reg.students.map((st, sIdx) => {
              const safeStuBg = safeImageUrl(studentCardBgUrl);
              const safeStuPhoto = safeImageUrl(st.photoUrl);
              return (
              <div
                key={`${reg.id}-${sIdx}`}
                className="relative overflow-hidden w-[265px] min-h-[375px] rounded-2xl bg-gradient-to-b from-amber-50 via-white to-orange-50 p-3.5 flex flex-col justify-between gap-2 shadow-md"
              >
                {safeStuBg && (
                  <img
                    src={safeStuBg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                  />
                )}
                <div className="relative z-10 text-center bg-white/70 rounded-xl py-1.5 px-2">
                  <div className="text-xs font-bold text-slate-800">บัตรประจำตัวผู้เข้าแข่งขัน</div>
                  <div className="text-[10px] font-bold text-amber-700">งานส่งเสริมวันมาฆบูชา ครั้งที่ 14 พ.ศ. 2570</div>
                  <div className="text-[9.5px] text-slate-500">17 กุมภาพันธ์ 2570</div>
                </div>

                <div className="relative z-10 flex justify-center">
                  <div className="w-[112px] h-[140px] rounded-xl border-2 border-white shadow-sm bg-white/75 overflow-hidden flex items-center justify-center">
                    {safeStuPhoto ? (
                      <img src={safeStuPhoto} alt={st.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="text-[11px] text-slate-400 text-center px-2">รูปภาพนักเรียน</span>
                    )}
                  </div>
                </div>

                <div className="relative z-10 bg-white/70 rounded-xl p-2 text-[11px] space-y-0.5 leading-snug">
                  <div><strong>ชื่อ:</strong> {st.name}</div>
                  <div><strong>โรงเรียน:</strong> {sch?.name}</div>
                  <div><strong>กิจกรรม:</strong> {comp?.name}</div>
                  <div><strong>ระดับ:</strong> {reg.level}</div>
                  <div><strong>สถานที่:</strong> {sched.venue}</div>
                  <div><strong>เวลา:</strong> {sched.timeRange}</div>
                </div>

                <div className="relative z-10 text-center text-[12px] font-bold text-amber-800 bg-white/60 rounded-lg py-1">
                  ผู้เข้าแข่งขัน
                </div>
              </div>
              );
            });
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
              onChange={(e) => setCardPrintLayout(e.target.value as '4-up' | '1-up')}
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
              const coachPhoto = safeImageUrl(typeof coachItem === 'string' ? '' : coachItem.photoUrl || '');
              const safeCoachBg = safeImageUrl(coachCardBgUrl);

              return (
                <div
                  key={`${reg.id}-coach-${cIdx}`}
                  className="relative overflow-hidden w-[265px] min-h-[385px] rounded-2xl bg-gradient-to-b from-emerald-50 via-white to-teal-50 p-3.5 flex flex-col justify-between gap-2 shadow-md"
                >
                  {safeCoachBg && (
                    <img
                      src={safeCoachBg}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                    />
                  )}
                  <div className="relative z-10 text-center bg-white/70 rounded-xl py-1.5 px-2">
                    <div className="text-xs font-bold text-slate-800">บัตรประจำตัวครูผู้ฝึกสอน</div>
                    <div className="text-[10px] font-bold text-emerald-700">งานส่งเสริมวันมาฆบูชา ครั้งที่ 14 พ.ศ. 2570</div>
                    <div className="text-[9.5px] text-slate-500">17 กุมภาพันธ์ 2570</div>
                  </div>

                  <div className="relative z-10 flex flex-col items-center gap-1.5">
                    <div className="w-[108px] h-[134px] rounded-xl border-2 border-white shadow-sm bg-white/75 overflow-hidden flex items-center justify-center">
                      {coachPhoto ? (
                        <img src={coachPhoto} alt={coachName} className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className="text-[11px] text-slate-400 text-center px-2">รูปภาพครูผู้ฝึกสอน</span>
                      )}
                    </div>
                  </div>

                  <div className="relative z-10 bg-white/70 rounded-xl p-2 text-[11px] space-y-0.5 leading-snug">
                    <div><strong className="text-slate-800">ครูผู้ฝึกสอน:</strong> {coachName}</div>
                    <div><strong className="text-slate-800">โรงเรียน:</strong> {sch?.name}</div>
                    <div className="truncate"><strong className="text-slate-800">ผู้แข่งขัน:</strong> {competitorNames}</div>
                    <div><strong className="text-slate-800">กิจกรรม:</strong> {comp?.name}</div>
                    <div><strong className="text-slate-800">ระดับ:</strong> {reg.level}</div>
                    <div><strong className="text-slate-800">สถานที่:</strong> {sched.venue}</div>
                    <div><strong className="text-slate-800">เวลา:</strong> {sched.timeRange}</div>
                  </div>

                  <div className="relative z-10 text-center text-[12px] font-bold text-emerald-800 bg-white/60 rounded-lg py-1">
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
    const isStaffViewer = authSession.role === 'admin' || authSession.role === 'manager';
    const isJudge = authSession.role === 'judge';

    if (!isStaffViewer && !isJudge) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-sky-500 mx-auto" />
          <div className="font-bold text-slate-800">เห็นและสามารถดาวน์โหลดได้แค่กรรมการตัดสิน ผู้จัดการแข่งขัน และผู้ดูแลระบบเท่านั้น</div>
          <button
            onClick={() => {
              handleSelectMenu('login-judge');
            }}
            className="rounded-xl bg-sky-600 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบกรรมการ
          </button>
        </div>
      );
    }

    const visibleJudges = isStaffViewer
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
          <div className="flex flex-wrap items-center gap-3">
            {isStaffViewer && (
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
            <select
              value={cardPrintLayout}
              onChange={(e) => setCardPrintLayout(e.target.value as '4-up' | '1-up')}
              className="rounded-xl border border-sky-300 px-3 py-2 text-sm bg-sky-50/70 font-semibold text-sky-900 outline-none"
            >
              <option value="4-up">รูปแบบพิมพ์: 4 ต่อ 1 แนวตั้ง</option>
              <option value="1-up">รูปแบบพิมพ์: 1 ต่อ 1 (14.85×10.5 ซม.)</option>
            </select>
            <button
              onClick={() => handleDownloadJudgeCardsPdf(visibleJudges, cardPrintLayout)}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white px-4 py-2.5 text-sm font-bold shadow-md cursor-pointer"
            >
              <FileDown className="w-4 h-4" />
              <span>พิมพ์ / ดาวน์โหลดบัตรกรรมการ (PDF)</span>
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
            const safeJudgeBg = safeImageUrl(judgeCardBgUrl);
            const safeJudgePhoto = safeImageUrl(jdg.photoUrl);

            return (
              <div
                key={jdg.id}
                className="relative overflow-hidden w-[265px] min-h-[385px] rounded-2xl bg-gradient-to-b from-sky-50 via-white to-indigo-50 p-3.5 flex flex-col justify-between gap-2 shadow-md"
              >
                {safeJudgeBg && (
                  <img
                    src={safeJudgeBg}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover object-center pointer-events-none"
                  />
                )}
                <div className="relative z-10 text-center bg-white/70 rounded-xl py-1.5 px-2">
                  <div className="text-xs font-bold text-slate-800">บัตรประจำตัวกรรมการตัดสิน</div>
                  <div className="text-[10px] font-bold text-sky-700">งานส่งเสริมวันมาฆบูชา ครั้งที่ 14 พ.ศ. 2570</div>
                  <div className="text-[9.5px] text-slate-500">17 กุมภาพันธ์ 2570</div>
                </div>

                <div className="relative z-10 flex justify-center">
                  <div className="w-[102px] h-[126px] rounded-xl border-2 border-white shadow-sm bg-white/75 overflow-hidden flex items-center justify-center">
                    {safeJudgePhoto ? (
                      <img src={safeJudgePhoto} alt={jdg.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="text-[11px] text-slate-400 text-center px-2">รูปภาพกรรมการ</span>
                    )}
                  </div>
                </div>

                <div className="relative z-10 bg-white/70 rounded-xl p-2 text-[11px] space-y-0.5 leading-snug">
                  <div><strong>ชื่อ:</strong> {jdg.name}</div>
                  <div><strong>ตำแหน่ง:</strong> {jdg.position}</div>
                  <div><strong>กิจกรรม:</strong> {comp?.name}</div>
                  <div><strong>ระดับ:</strong> {jdg.level}</div>
                  <div><strong>สถานที่:</strong> {sched.venue}</div>
                  <div><strong>เวลา:</strong> {sched.timeRange}</div>
                  <div className="pt-1 mt-1 text-sky-900">
                    <div><strong>ชื่อผู้ใช้:</strong> <span className="font-mono">{jdg.username || '-'}</span></div>
                    <div><strong>รหัสผ่าน:</strong> <span className="font-mono">••••••••</span></div>
                  </div>
                </div>

                <div className="relative z-10 text-center text-[12px] font-bold text-sky-800 bg-white/60 rounded-lg py-1">
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
    const isStaffViewer = authSession.role === 'admin' || authSession.role === 'manager';
    const isJudge = authSession.role === 'judge';

    if (!isStaffViewer && !isJudge) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-amber-500 mx-auto" />
          <div className="font-bold text-slate-800">เห็นและสามารถดาวน์โหลดได้แค่กิจกรรมที่เป็นกรรมการ ผู้จัดการแข่งขัน และผู้ดูแลระบบเท่านั้น</div>
          <button
            onClick={() => {
              handleSelectMenu('login-judge');
            }}
            className="rounded-xl bg-amber-500 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบกรรมการ
          </button>
        </div>
      );
    }

    const allowedJudges = isStaffViewer ? judges : judges.filter((j) => j.id === authSession.judgeId);
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
        line2Position: activityText ? `เป็น${positionText}  การแข่งขัน${activityText}` : `เป็น${positionText}`,
        line3Activity: levelText
      };
    });

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Award className="w-6 h-6 text-amber-500" />
              <span>เกียรติบัตรกรรมการตัดสิน (A4 แนวนอน)</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              แสดงรายชื่อกรรมการที่มีสิทธิ์รับเกียรติบัตร และสามารถพิมพ์หรือดาวน์โหลดเป็นไฟล์ PDF ได้ทันที
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleDownloadCertificateA4Landscape(certData, 'เกียรติบัตรกรรมการตัดสิน (A4 แนวนอน)')}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-white px-4 py-2.5 text-sm font-bold shadow-md cursor-pointer"
          >
            <FileDown className="w-4 h-4" />
            <span>ดาวน์โหลดเกียรติบัตรกรรมการทั้งหมด (PDF)</span>
          </button>
        </div>

        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
            <span className="text-sm font-bold text-slate-800">รายชื่อกรรมการผู้ได้รับเกียรติบัตร</span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              ทั้งหมด {certData.length} รายการ
            </span>
          </div>

          {certData.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              ไม่พบรายชื่อกรรมการสำหรับออกเกียรติบัตร
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                    <th className="py-3 px-4 font-bold w-14 text-center">ลำดับ</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">เลขที่เกียรติบัตร</th>
                    <th className="py-3 px-4 font-bold">ชื่อ-นามสกุล</th>
                    <th className="py-3 px-4 font-bold">ตำแหน่ง</th>
                    <th className="py-3 px-4 font-bold">กิจกรรม / ระดับชั้น</th>
                    <th className="py-3 px-4 font-bold text-right whitespace-nowrap">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certData.map((c, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">{c.certNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{c.line1Name}</td>
                      <td className="py-3 px-4 text-slate-700">{c.roleLabel}</td>
                      <td className="py-3 px-4 text-slate-600">
                        {c.activityName} {c.levelName}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadCertificateA4Landscape([c], `เกียรติบัตรกรรมการ - ${c.line1Name}`)
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>พิมพ์ / PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
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
            onClick={() => handleSelectMenu('login-school')}
            className="rounded-xl bg-amber-500 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบ
          </button>
        </div>
      );
    }

    const targetSchoolId = isSchool ? authSession.schoolId : selectedSchoolFilter;

    // คำนวณลำดับเลขที่เกียรติบัตรตามประเภทผู้รับทั้งหมดในระบบ (งดออกเกียรติบัตรให้ทีมที่แจ้งไม่เข้าร่วมแข่งขัน)
    const activeRegistrations = registrations.filter((r) => !absentRegs[r.id]);

    const allStudentCertSeqMap: Record<string, number> = {};
    let studentCounter = 0;
    activeRegistrations.forEach((r) => {
      r.students.forEach((_, sIdx) => {
        studentCounter += 1;
        allStudentCertSeqMap[`${r.id}__st__${sIdx}`] = studentCounter;
      });
    });

    const allCoachCertSeqMap: Record<string, number> = {};
    let coachCounter = 0;
    activeRegistrations.forEach((r) => {
      r.coaches.forEach((_, cIdx) => {
        coachCounter += 1;
        allCoachCertSeqMap[`${r.id}__co__${cIdx}`] = coachCounter;
      });
    });

    const allDirectorCertSeqMap: Record<string, number> = {};
    let directorCounter = 0;
    const seenDirectorSchools = new Set<string>();
    activeRegistrations.forEach((r) => {
      const sch = schools.find((s) => s.id === r.schoolId);
      if (sch && !seenDirectorSchools.has(sch.id)) {
        seenDirectorSchools.add(sch.id);
        directorCounter += 1;
        allDirectorCertSeqMap[sch.id] = directorCounter;
      }
    });

    const scopedRegs = registrations.filter((r) => {
      const sOk = isSchool ? r.schoolId === authSession.schoolId : targetSchoolId === 'all' ? true : r.schoolId === targetSchoolId;
      const cOk = selectedCompFilter === 'all' ? true : r.competitionId === selectedCompFilter;
      return sOk && cOk;
    });
    const targetRegs = scopedRegs.filter((r) => !absentRegs[r.id]);

    const certRankedLookup = buildRankedEntryLookup(registrations, scores, roundScores, absentRegs, recusedJudges);
    const certs: CertificateItem[] = [];
    const emittedDirectorSchools = new Set<string>();
    targetRegs.forEach((r) => {
      const sch = schools.find((s) => s.id === r.schoolId);
      const comp = COMPETITIONS.find((c) => c.id === r.competitionId);
      const activityText = comp?.name || '';
      const isUnlimitedLevel = r.competitionId === 'comp-10' || r.level === 'ไม่จำกัดระดับ';
      const levelText = !isUnlimitedLevel && r.level ? `ระดับ${r.level}` : '';
      const rankedEntry = certRankedLookup[r.id];

      if (certRecipientType === 'student') {
        const metaKey = `${r.competitionId}__${r.level}`;
        const meta = evalMeta[metaKey] || { status: 'pending', approved: false };
        const hasApprovedScore = Boolean(meta.approved) && Boolean(rankedEntry?.hasScore);
        const medal = getMedalTier(rankedEntry?.score || 0, hasApprovedScore);
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
        const hasApprovedScore = Boolean(meta.approved) && Boolean(rankedEntry?.hasScore);
        const medal = getMedalTier(rankedEntry?.score || 0, hasApprovedScore);
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
            onChange={(e) => setCertRecipientType(e.target.value as 'student' | 'coach' | 'director')}
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

        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
            <span className="text-sm font-bold text-slate-800">
              รายชื่อผู้ได้รับเกียรติบัตร ({recipientLabelMap[certRecipientType] || ''})
            </span>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
              ทั้งหมด {certs.length} รายการ
            </span>
          </div>

          {certs.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">
              ไม่พบข้อมูลเกียรติบัตรตามเงื่อนไขที่เลือก
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                    <th className="py-3 px-4 font-bold w-14 text-center">ลำดับ</th>
                    <th className="py-3 px-4 font-bold whitespace-nowrap">เลขที่เกียรติบัตร</th>
                    <th className="py-3 px-4 font-bold">ชื่อ-นามสกุล</th>
                    <th className="py-3 px-4 font-bold">โรงเรียน</th>
                    <th className="py-3 px-4 font-bold">รายละเอียด / ผลการแข่งขัน</th>
                    <th className="py-3 px-4 font-bold text-right whitespace-nowrap">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {certs.map((c, idx) => (
                    <tr key={idx} className="hover:bg-amber-50/30 transition-colors">
                      <td className="py-3 px-4 text-center font-semibold text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono text-xs text-slate-700 whitespace-nowrap">{c.certNumber}</td>
                      <td className="py-3 px-4 font-bold text-slate-800">{c.line1Name}</td>
                      <td className="py-3 px-4 text-slate-700">{c.schoolName || '-'}</td>
                      <td className="py-3 px-4 text-slate-600">{c.line3Activity}</td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() =>
                            handleDownloadCertificateA4Landscape(
                              [c],
                              `เกียรติบัตร${recipientLabelMap[certRecipientType] || ''} - ${c.line1Name}`
                            )
                          }
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold cursor-pointer"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                          <span>พิมพ์ / PDF</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderSchoolResultsPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isSchool = authSession.role === 'school';

    if (!isAdmin && !isSchool) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-emerald-600 mx-auto" />
          <div className="font-bold text-slate-800">เมนูนี้สำหรับโรงเรียนและผู้ดูแลระบบเท่านั้น</div>
          <button
            type="button"
            onClick={() => {
              handleSelectMenu('login-school');
            }}
            className="rounded-xl bg-emerald-600 text-white px-5 py-2 text-sm font-bold cursor-pointer"
          >
            เข้าสู่ระบบโรงเรียน
          </button>
        </div>
      );
    }

    const activeSchoolId = isSchool
      ? authSession.schoolId || ''
      : selectedSchoolFilter !== 'all'
      ? selectedSchoolFilter
      : schools[0]?.id || '';
    const focusSchool = isSchool
      ? currentSchool
      : schools.find((s) => s.id === activeSchoolId) || schools[0] || null;
    const myRegs = focusSchool
      ? registrations.filter((r) => r.schoolId === focusSchool.id)
      : [];

    return (
      <div className="space-y-6">
        {/* Top Sub-menu Switcher: ผลคะแนนของโรงเรียน & สรุปเหรียญรางวัล */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="inline-flex flex-wrap gap-1.5 rounded-2xl bg-slate-100 p-1.5 self-start">
            <button
              type="button"
              onClick={() => setSchoolResultsViewTab('scores')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                schoolResultsViewTab === 'scores'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>ผลคะแนนของโรงเรียน</span>
            </button>
            <button
              type="button"
              onClick={() => setSchoolResultsViewTab('medals')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                schoolResultsViewTab === 'medals'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
              }`}
            >
              <Medal className="w-4 h-4" />
              <span>สรุปเหรียญรางวัล</span>
            </button>
          </div>

          {isAdmin && schoolResultsViewTab === 'scores' && schools.length > 0 && (
            <select
              value={activeSchoolId}
              onChange={(e) => setSelectedSchoolFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs sm:text-sm font-semibold text-slate-800 outline-none cursor-pointer"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.schoolCode}] {s.name}
                </option>
              ))}
            </select>
          )}
        </div>

        {schoolResultsViewTab === 'medals' ? (
          renderMedalSummaryPage()
        ) : (
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Trophy className="w-6 h-6 text-emerald-600" />
                  <span>ผลคะแนนของโรงเรียน {focusSchool ? `(${focusSchool.name})` : ''}</span>
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  สรุปผลคะแนน อันดับในระดับชั้น และระดับเหรียญรางวัลของโรงเรียนตนเองในทุกกิจกรรมที่สมัคร
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                <span className="px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                  เข้าร่วม {myRegs.length} รายการ
                </span>
                <button
                  type="button"
                  onClick={() => setSchoolResultsViewTab('medals')}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition cursor-pointer"
                >
                  <Medal className="w-3.5 h-3.5" />
                  <span>ดูสรุปเหรียญรางวัล</span>
                </button>
              </div>
            </div>

            {!focusSchool ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 border border-slate-100">
                ยังไม่มีข้อมูลโรงเรียนในระบบ
              </div>
            ) : myRegs.length === 0 ? (
              <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 border border-slate-100">
                โรงเรียนยังไม่มีรายการสมัครแข่งขัน
              </div>
            ) : (
              <div className="space-y-4">
                {myRegs.map((reg) => {
                  const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
                  const metaKey = `${reg.competitionId}__${reg.level}`;
                  const meta = evalMeta[metaKey] || { status: 'pending', approved: false };
                  const isAbsent = Boolean(absentRegs[reg.id]);

                  const sameLevelRanked = buildCompetitionRankedList(
                    reg.competitionId,
                    reg.level,
                    registrations,
                    scores,
                    roundScores,
                    absentRegs,
                    recusedJudges
                  );
                  const myRankedEntry = sameLevelRanked.find((item) => item.reg.id === reg.id);
                  const myCalc = isAbsent
                    ? { average100: 0, judgeCount: 0 }
                    : { average100: myRankedEntry?.score || 0, judgeCount: myRankedEntry?.hasScore ? 1 : 0 };
                  const rankIndex = !isAbsent && myRankedEntry?.rankNum ? myRankedEntry.rankNum - 1 : -1;
                  const isApproved = Boolean(meta.approved);
                  const medal = isAbsent
                    ? {
                        label: 'ไม่เข้าร่วมแข่งขัน',
                        badgeCls: 'bg-rose-50 text-rose-700 border-rose-200'
                      }
                    : getMedalTier(myCalc.average100, isApproved && myCalc.judgeCount > 0);

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
                          {isAbsent ? (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                              <UserX className="w-3.5 h-3.5" />
                              <span>ไม่เข้าร่วมแข่งขัน (งดออกเกียรติบัตร)</span>
                            </span>
                          ) : isApproved ? (
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
                            {!isAbsent && isApproved && myCalc.judgeCount > 0 ? myCalc.average100.toFixed(2) : '-'}
                          </div>
                        </div>

                        <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-2.5 text-center min-w-[115px]">
                          <div className="text-[11px] text-slate-500">ลำดับในระดับ</div>
                          <div className="text-lg font-extrabold text-amber-700">
                            {!isAbsent && isApproved && myCalc.judgeCount > 0 && rankIndex >= 0 ? `ที่ ${rankIndex + 1}` : '-'}
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
        )}
      </div>
    );
  };

  const renderMedalSummaryPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isSchool = authSession.role === 'school';

    if (!isAdmin && !isSchool) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <Lock className="w-8 h-8 text-amber-500 mx-auto" />
          <div className="font-bold text-slate-800">กรุณาเข้าสู่ระบบโรงเรียนหรือผู้ดูแลระบบเพื่อดูสรุปเหรียญรางวัล</div>
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

    const activeSchoolId = isSchool
      ? authSession.schoolId || ''
      : selectedSchoolFilter !== 'all'
      ? selectedSchoolFilter
      : schools[0]?.id || '';
    const focusSchool = schools.find((s) => s.id === activeSchoolId) || schools[0] || null;

    const getMedalCategory = (label: string): 'gold' | 'silver' | 'bronze' | 'participant' => {
      if (label.includes('ทองแดง')) return 'bronze';
      if (label.includes('ทอง')) return 'gold';
      if (label.includes('เงิน')) return 'silver';
      return 'participant';
    };

    const medalRankedLookup = buildRankedEntryLookup(registrations, scores, roundScores, absentRegs, recusedJudges);
    const schoolStandings = schools
      .map((sch) => {
        let gold = 0;
        let silver = 0;
        let bronze = 0;
        let participant = 0;
        let absentCount = 0;
        let pendingCount = 0;
        let scoreSum = 0;
        let scoredCount = 0;

        const schRegs = registrations.filter((r) => r.schoolId === sch.id);
        schRegs.forEach((reg) => {
          if (absentRegs[reg.id]) {
            absentCount += 1;
            return;
          }
          const metaKey = `${reg.competitionId}__${String(reg.level || '').trim()}`;
          const meta =
            evalMeta[metaKey] ||
            evalMeta[`${reg.competitionId}__${reg.level}`] || { status: 'pending', approved: false };
          if (!meta.approved) {
            pendingCount += 1;
            return;
          }
          const rankedEntry = medalRankedLookup[reg.id];
          if (!rankedEntry?.hasScore) {
            pendingCount += 1;
            return;
          }
          scoredCount += 1;
          scoreSum += rankedEntry.score;
          const medal = getMedalTier(rankedEntry.score, true);
          const cat = getMedalCategory(medal.label);
          if (cat === 'gold') gold += 1;
          else if (cat === 'silver') silver += 1;
          else if (cat === 'bronze') bronze += 1;
          else participant += 1;
        });

        return {
          sch,
          registeredCount: schRegs.length,
          gold,
          silver,
          bronze,
          participant,
          absentCount,
          pendingCount,
          totalMedals: gold + silver + bronze,
          avgScore: scoredCount > 0 ? scoreSum / scoredCount : 0
        };
      })
      .sort((a, b) => {
        if (b.gold !== a.gold) return b.gold - a.gold;
        if (b.silver !== a.silver) return b.silver - a.silver;
        if (b.bronze !== a.bronze) return b.bronze - a.bronze;
        if (b.totalMedals !== a.totalMedals) return b.totalMedals - a.totalMedals;
        return b.avgScore - a.avgScore;
      });

    const focusStandingIndex = focusSchool
      ? schoolStandings.findIndex((item) => item.sch.id === focusSchool.id)
      : -1;
    const focusStats = focusStandingIndex >= 0 ? schoolStandings[focusStandingIndex] : null;

    const focusRankedLookup = buildRankedEntryLookup(registrations, scores, roundScores, absentRegs, recusedJudges);
    const focusDetails = focusSchool
      ? registrations
          .filter((r) => r.schoolId === focusSchool.id)
          .map((reg) => {
            const comp = COMPETITIONS.find((c) => c.id === reg.competitionId);
            const metaKey = `${reg.competitionId}__${String(reg.level || '').trim()}`;
            const meta =
              evalMeta[metaKey] ||
              evalMeta[`${reg.competitionId}__${reg.level}`] || { status: 'pending', approved: false };
            const isApproved = Boolean(meta.approved);
            const isAbsent = Boolean(absentRegs[reg.id]);
            const rankedEntry = focusRankedLookup[reg.id];
            const effectiveScore = !isAbsent && rankedEntry?.hasScore ? rankedEntry.score : 0;
            const hasApprovedScore = isApproved && !isAbsent && Boolean(rankedEntry?.hasScore);

            const medal = isAbsent
              ? { label: 'ไม่เข้าร่วมแข่งขัน', badgeCls: 'bg-rose-50 text-rose-700 border-rose-200' }
              : getMedalTier(effectiveScore, hasApprovedScore);

            return {
              reg,
              comp,
              isApproved,
              isAbsent,
              hasApprovedScore,
              score: effectiveScore,
              rankNum: hasApprovedScore && rankedEntry?.rankNum ? rankedEntry.rankNum : null,
              medalLabel: isAbsent
                ? 'ไม่เข้าร่วมแข่งขัน'
                : !isApproved
                ? 'รออนุมัติผล'
                : medal.label,
              medalBadgeCls: isAbsent
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : !isApproved
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : medal.badgeCls,
              medalCategory: hasApprovedScore ? getMedalCategory(medal.label) : null
            };
          })
      : [];

    const filteredFocusDetails = focusDetails.filter((d) => {
      if (medalSummaryFilter === 'all') return true;
      return d.medalCategory === medalSummaryFilter;
    });

    const filteredStandings = schoolStandings.filter((item) => {
      const q = medalStandingsSearch.trim().toLowerCase();
      if (!q) return true;
      return `${item.sch.name} ${item.sch.schoolCode}`.toLowerCase().includes(q);
    });

    const totalGoldRatio =
      focusStats && focusStats.totalMedals > 0
        ? Math.round((focusStats.gold / focusStats.totalMedals) * 100)
        : 0;
    const totalSilverRatio =
      focusStats && focusStats.totalMedals > 0
        ? Math.round((focusStats.silver / focusStats.totalMedals) * 100)
        : 0;
    const totalBronzeRatio =
      focusStats && focusStats.totalMedals > 0
        ? Math.max(0, 100 - totalGoldRatio - totalSilverRatio)
        : 0;

    return (
      <div className="space-y-6">
        {/* Hero Header */}
        <div className="rounded-3xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-teal-700 p-6 sm:p-7 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/20 border border-amber-300/40 px-3 py-1 text-xs font-bold text-amber-200">
                <Medal className="w-3.5 h-3.5" />
                <span>สรุปเหรียญรางวัลอย่างเป็นทางการ</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                สรุปเหรียญรางวัลสำหรับโรงเรียน
              </h2>
              <p className="text-xs sm:text-sm text-emerald-100">
                คำนวณจากรายการแข่งขันที่ผู้ดูแลระบบอนุมัติประกาศผลแล้ว (ไม่นับรวมรายการที่แจ้งไม่เข้าร่วมแข่งขัน)
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {isAdmin && medalSummaryTab === 'school' && (
                <select
                  value={activeSchoolId}
                  onChange={(e) => setSelectedSchoolFilter(e.target.value)}
                  className="rounded-xl bg-white text-slate-800 px-3.5 py-2 text-xs sm:text-sm font-bold outline-none shadow-sm cursor-pointer"
                >
                  {schools.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.schoolCode}] {s.name}
                    </option>
                  ))}
                </select>
              )}

              <button
                type="button"
                onClick={() =>
                  handlePrintSchoolMedalSummary(
                    medalSummaryTab === 'school' && focusSchool ? focusSchool.id : undefined
                  )
                }
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-900 px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>
                  {medalSummaryTab === 'school' ? 'พิมพ์สรุปเหรียญโรงเรียน' : 'พิมพ์ตารางอันดับเหรียญรวม'}
                </span>
              </button>
            </div>
          </div>

          {/* Segmented Switcher */}
          <div className="relative z-10 mt-5 inline-flex rounded-2xl bg-emerald-950/45 p-1 border border-white/15">
            <button
              type="button"
              onClick={() => setMedalSummaryTab('school')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                medalSummaryTab === 'school'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <School className="w-4 h-4" />
              <span>สรุปเหรียญของโรงเรียน</span>
            </button>
            <button
              type="button"
              onClick={() => setMedalSummaryTab('standings')}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                medalSummaryTab === 'standings'
                  ? 'bg-white text-emerald-900 shadow-sm'
                  : 'text-emerald-100 hover:text-white'
              }`}
            >
              <Trophy className="w-4 h-4" />
              <span>ตารางอันดับเหรียญรวมทุกโรงเรียน</span>
            </button>
          </div>
        </div>

        {medalSummaryTab === 'school' ? (
          focusSchool && focusStats ? (
          <div className="space-y-6">
            {/* School Identity & Overall Rank Strip */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white flex items-center justify-center shadow-sm shrink-0">
                  <School className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-base sm:text-lg font-extrabold text-slate-800">
                    {focusSchool.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    รหัสสถานศึกษา: {focusSchool.schoolCode} • ผู้อำนวยการ: {focusSchool.director || '-'} • สมัครแข่งขัน {focusStats.registeredCount} รายการ
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-3.5 py-2 text-center">
                  <div className="text-[11px] font-semibold text-amber-700">อันดับเหรียญรวม</div>
                  <div className="text-base font-extrabold text-amber-900">
                    {focusStandingIndex >= 0 ? `อันดับที่ ${focusStandingIndex + 1}` : '-'}
                  </div>
                </div>
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-center">
                  <div className="text-[11px] font-semibold text-emerald-700">คะแนนเฉลี่ย</div>
                  <div className="text-base font-extrabold text-emerald-900 tabular-nums">
                    {focusStats.avgScore > 0 ? focusStats.avgScore.toFixed(2) : '-'}
                  </div>
                </div>
              </div>
            </div>

            {/* 4 Medal KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <div className="rounded-2xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 p-5 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-50">
                    เหรียญทอง (Gold)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Medal className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold tabular-nums">{focusStats.gold}</div>
                <div className="mt-1 text-xs text-amber-100">คะแนน 80.00 - 100.00</div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600 p-5 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-100">
                    เหรียญเงิน (Silver)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Medal className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold tabular-nums">{focusStats.silver}</div>
                <div className="mt-1 text-xs text-slate-100">คะแนน 70.00 - 79.99</div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-orange-500 via-amber-700 to-orange-800 p-5 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-orange-100">
                    เหรียญทองแดง (Bronze)
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Medal className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold tabular-nums">{focusStats.bronze}</div>
                <div className="mt-1 text-xs text-orange-100">คะแนน 60.00 - 69.99</div>
              </div>

              <div className="rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 p-5 text-white shadow-md">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-100">
                    รวมเหรียญรางวัลทั้งหมด
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <Trophy className="w-5 h-5" />
                  </div>
                </div>
                <div className="mt-3 text-3xl font-extrabold tabular-nums">{focusStats.totalMedals}</div>
                <div className="mt-1 text-xs text-emerald-100">
                  เข้าร่วม {focusStats.participant} • รอผล {focusStats.pendingCount}
                  {focusStats.absentCount > 0 ? ` • ไม่เข้าร่วม ${focusStats.absentCount}` : ''}
                </div>
              </div>
            </div>

            {/* Medal Ratio Progress Bar */}
            {focusStats.totalMedals > 0 && (
              <div className="rounded-2xl bg-white border border-slate-100 shadow-sm p-5 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-slate-700">
                  <span>สัดส่วนเหรียญรางวัลที่ได้รับ ({focusStats.totalMedals} เหรียญ)</span>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-amber-600">ทอง {totalGoldRatio}%</span>
                    <span className="text-slate-600">เงิน {totalSilverRatio}%</span>
                    <span className="text-orange-700">ทองแดง {totalBronzeRatio}%</span>
                  </div>
                </div>
                <div className="h-3.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
                  {focusStats.gold > 0 && (
                    <div
                      className="bg-amber-400 h-full transition-all"
                      style={{ width: `${totalGoldRatio}%` }}
                    />
                  )}
                  {focusStats.silver > 0 && (
                    <div
                      className="bg-slate-400 h-full transition-all"
                      style={{ width: `${totalSilverRatio}%` }}
                    />
                  )}
                  {focusStats.bronze > 0 && (
                    <div
                      className="bg-orange-600 h-full transition-all"
                      style={{ width: `${totalBronzeRatio}%` }}
                    />
                  )}
                </div>
              </div>
            )}

            {/* Breakdown Table by Competition */}
            <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
                <div className="font-bold text-slate-800 text-sm sm:text-base">
                  รายละเอียดเหรียญรางวัลแยกตามรายการที่สมัคร ({filteredFocusDetails.length} รายการ)
                </div>

                <select
                  value={medalSummaryFilter}
                  onChange={(e) =>
                    setMedalSummaryFilter(
                      e.target.value as 'all' | 'gold' | 'silver' | 'bronze' | 'participant'
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs sm:text-sm outline-none cursor-pointer"
                >
                  <option value="all">แสดง: ทุกรายการ</option>
                  <option value="gold">เฉพาะเหรียญทอง</option>
                  <option value="silver">เฉพาะเหรียญเงิน</option>
                  <option value="bronze">เฉพาะเหรียญทองแดง</option>
                  <option value="participant">เฉพาะเข้าร่วมการแข่งขัน</option>
                </select>
              </div>

              {filteredFocusDetails.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  ไม่พบรายการแข่งขันตามตัวกรองที่เลือก
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs">
                        <th className="py-3 px-4 font-bold text-center w-12">ที่</th>
                        <th className="py-3 px-4 font-bold">กิจกรรมการแข่งขัน / ระดับชั้น</th>
                        <th className="py-3 px-4 font-bold">ผู้เข้าแข่งขัน</th>
                        <th className="py-3 px-4 font-bold text-center">ลำดับที่ / รางวัล</th>
                        <th className="py-3 px-4 font-bold text-right">คะแนนรวม</th>
                        <th className="py-3 px-4 font-bold text-center">เหรียญรางวัล / สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {filteredFocusDetails.map((d, idx) => (
                        <tr key={d.reg.id} className="hover:bg-amber-50/30 transition-colors">
                          <td className="py-3.5 px-4 text-center font-bold text-slate-500">
                            {idx + 1}
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-800">{d.comp?.name || '-'}</div>
                            <div className="mt-1">
                              <span
                                className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                                  d.comp?.badgeBg || 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {d.reg.level}
                              </span>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-700">
                            {d.reg.students.map((s) => s.name).join(', ') || '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center font-bold text-amber-800 whitespace-nowrap">
                            {d.rankNum ? getRankAwardLabel(d.rankNum, false, true, 'อันดับที่') : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-right font-extrabold text-slate-800 tabular-nums whitespace-nowrap">
                            {d.hasApprovedScore ? d.score.toFixed(2) : '-'}
                          </td>
                          <td className="py-3.5 px-4 text-center whitespace-nowrap">
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${d.medalBadgeCls}`}
                            >
                              {d.medalLabel}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
          ) : (
            <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 text-sm text-slate-500">
              ยังไม่มีข้อมูลโรงเรียนในระบบ
            </div>
          )
        ) : (
          /* Standings Leaderboard Across All Schools */
          <div className="rounded-2xl bg-white border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/70">
              <div>
                <div className="font-bold text-slate-800 text-sm sm:text-base">
                  ตารางอันดับเหรียญรางวัลรวมทุกโรงเรียน ({filteredStandings.length} โรงเรียน)
                </div>
                <div className="text-xs text-slate-500">
                  เรียงลำดับตามจำนวน เหรียญทอง &gt; เหรียญเงิน &gt; เหรียญทองแดง &gt; คะแนนเฉลี่ย
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={medalStandingsSearch}
                  onChange={(e) => setMedalStandingsSearch(e.target.value)}
                  placeholder="ค้นหาชื่อโรงเรียน / รหัส..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs">
                    <th className="py-3 px-4 font-bold text-center w-16">อันดับ</th>
                    <th className="py-3 px-4 font-bold">โรงเรียน</th>
                    <th className="py-3 px-4 font-bold text-center text-amber-700">ทอง</th>
                    <th className="py-3 px-4 font-bold text-center text-slate-600">เงิน</th>
                    <th className="py-3 px-4 font-bold text-center text-orange-700">ทองแดง</th>
                    <th className="py-3 px-4 font-bold text-center text-emerald-700">รวมเหรียญ</th>
                    <th className="py-3 px-4 font-bold text-center">เข้าร่วม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {filteredStandings.map((item) => {
                    const globalRank =
                      schoolStandings.findIndex((x) => x.sch.id === item.sch.id) + 1;
                    const isCurrentUserSchool =
                      isSchool && authSession.schoolId === item.sch.id;
                    return (
                      <tr
                        key={item.sch.id}
                        className={
                          isCurrentUserSchool
                            ? 'bg-emerald-50/70 font-semibold'
                            : 'hover:bg-amber-50/30'
                        }
                      >
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-extrabold border ${
                              globalRank === 1
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : globalRank === 2
                                ? 'bg-slate-100 text-slate-800 border-slate-300'
                                : globalRank === 3
                                ? 'bg-orange-100 text-orange-900 border-orange-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200'
                            }`}
                          >
                            {globalRank}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800 flex items-center gap-2">
                            <span>{item.sch.name}</span>
                            {isCurrentUserSchool && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-600 text-white">
                                โรงเรียนของฉัน
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            รหัส: {item.sch.schoolCode} • สมัคร {item.registeredCount} รายการ
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-amber-700 tabular-nums">
                          {item.gold}
                        </td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-slate-700 tabular-nums">
                          {item.silver}
                        </td>
                        <td className="py-3.5 px-4 text-center font-extrabold text-orange-700 tabular-nums">
                          {item.bronze}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="inline-block px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-extrabold tabular-nums">
                            {item.totalMedals}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-600 tabular-nums">
                          {item.participant}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderResultsPage = () => {
    const isAdmin = authSession.role === 'admin';
    const isAdminOrManager = authSession.role === 'admin' || authSession.role === 'manager';
    const selectedCompObj = COMPETITIONS.find((c) => c.id === selectedCompFilter) || null;
    const levelFilters = [
      'ทั้งหมด',
      ...(selectedCompObj
        ? selectedCompObj.levels
        : Array.from(new Set(COMPETITIONS.flatMap((c) => c.levels))))
    ];

    const toggleApprove = async (metaKey: string) => {
      const cur = evalMeta[metaKey] || { status: 'judging', approved: false };
      const nextApproved = !cur.approved;
      try {
        const res = await appApiCall('/admin/approval', { metaKey, approved: nextApproved });
        showToast(res.message || 'อัปเดตสถานะการอนุมัติผลการแข่งขันเรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะการอนุมัติได้', 'error');
      }
    };

    const getMedalCategory = (label: string): 'gold' | 'silver' | 'bronze' | 'participant' => {
      if (label.includes('ทองแดง')) return 'bronze';
      if (label.includes('ทอง')) return 'gold';
      if (label.includes('เงิน')) return 'silver';
      return 'participant';
    };

    interface RankedParticipantItem {
      reg: RegistrationItem;
      schoolId: string;
      schoolName: string;
      studentNames: string;
      score: number;
      judgeCount: number;
      hasScore: boolean;
      isAbsent: boolean;
      rankNum: number | null;
      qualifyingRank: number | null;
      roundGroup: TwoRoundGroup;
      medalLabel: string;
      medalBadgeCls: string;
      medalCategory: 'gold' | 'silver' | 'bronze' | 'participant';
      judgeScores: Record<string, number>;
      roundInfo: ReturnType<typeof getRegRoundBreakdown>;
    }

    interface ActivityLevelResultRow {
      metaKey: string;
      compIndex: number;
      levelIndex: number;
      comp: CompetitionItem;
      level: string;
      isApproved: boolean;
      judgeCompleted: boolean;
      judgeCompletedAt?: string;
      judgeCompletedBy?: string;
      totalRegisteredTeams: number;
      scoredTeamsCount: number;
      rankedItems: RankedParticipantItem[];
    }

    const allCategoryRows: ActivityLevelResultRow[] = [];

    COMPETITIONS.forEach((comp, compIdx) => {
      comp.levels.forEach((lvl, lvlIdx) => {
        const normalizedLvl = lvl.trim();
        const metaKey = `${comp.id}__${normalizedLvl}`;
        const meta =
          evalMeta[metaKey] ||
          evalMeta[`${comp.id}__${lvl}`] || { status: 'pending', approved: false };
        const isApproved = Boolean(meta.approved);
        const judgeCompleted = Boolean(meta.judgeCompleted);

        const rankedList = buildCompetitionRankedList(
          comp.id,
          normalizedLvl,
          registrations,
          scores,
          roundScores,
          absentRegs,
          recusedJudges
        );

        const rankedItems: RankedParticipantItem[] = rankedList.map((entry) => {
          const sch = schools.find((s) => s.id === entry.reg.schoolId);
          const medal = entry.isAbsent
            ? { label: 'ไม่เข้าร่วมแข่งขัน', badgeCls: 'bg-rose-50 text-rose-700 border-rose-200' }
            : getMedalTier(entry.score, entry.hasScore);
          return {
            reg: entry.reg,
            schoolId: entry.reg.schoolId,
            schoolName: sch?.name || '-',
            studentNames: entry.reg.students.map((s) => s.name).join(', '),
            score: entry.score,
            judgeCount: Object.keys(entry.judgeScores).length,
            hasScore: entry.hasScore,
            isAbsent: entry.isAbsent,
            rankNum: entry.rankNum,
            qualifyingRank: entry.qualifyingRank,
            roundGroup: entry.roundGroup,
            medalLabel: medal.label,
            medalBadgeCls: medal.badgeCls,
            medalCategory: getMedalCategory(medal.label),
            judgeScores: entry.judgeScores,
            roundInfo: entry.roundInfo
          };
        });

        const totalRegisteredTeams = rankedItems.length;
        const scoredTeamsCount = rankedItems.filter((item) => item.hasScore).length;

        allCategoryRows.push({
          metaKey,
          compIndex: compIdx,
          levelIndex: lvlIdx,
          comp,
          level: lvl,
          isApproved,
          judgeCompleted,
          judgeCompletedAt: meta.judgeCompletedAt,
          judgeCompletedBy: meta.judgeCompletedBy,
          totalRegisteredTeams,
          scoredTeamsCount,
          rankedItems
        });
      });
    });

    const approvedCategoriesCount = allCategoryRows.filter((r) => r.isApproved).length;
    const pendingCategoriesCount = allCategoryRows.length - approvedCategoriesCount;
    const judgeCompletedPendingApprovalRows = allCategoryRows.filter(
      (r) => r.judgeCompleted && !r.isApproved
    );

    const q = resultsSearch.trim().toLowerCase();
    const filteredRows = allCategoryRows.filter((row) => {
      if (selectedCompFilter !== 'all' && row.comp.id !== selectedCompFilter) return false;
      if (
        selectedLevelFilter !== 'ทั้งหมด' &&
        row.level.trim() !== selectedLevelFilter.trim()
      ) {
        return false;
      }
      if (resultsApprovalFilter === 'approved' && !row.isApproved) return false;
      if (resultsApprovalFilter === 'pending' && row.isApproved) return false;
      if (q) {
        const hay = `${row.comp.name} ${row.comp.type} ${row.level}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    const sortedRows = [...filteredRows].sort((a, b) => {
      const mul = resultsSort.dir === 'asc' ? 1 : -1;
      if (resultsSort.key === 'competition') {
        const cmp = a.comp.name.localeCompare(b.comp.name, 'th');
        if (cmp !== 0) return cmp * mul;
        return a.levelIndex - b.levelIndex;
      }
      if (resultsSort.key === 'level') {
        const cmp = a.level.localeCompare(b.level, 'th');
        if (cmp !== 0) return cmp * mul;
        return a.compIndex - b.compIndex;
      }
      if (resultsSort.key === 'teams') {
        if (a.totalRegisteredTeams !== b.totalRegisteredTeams) {
          return (a.totalRegisteredTeams - b.totalRegisteredTeams) * mul;
        }
        return a.compIndex - b.compIndex;
      }
      if (resultsSort.key === 'scored') {
        if (a.scoredTeamsCount !== b.scoredTeamsCount) {
          return (a.scoredTeamsCount - b.scoredTeamsCount) * mul;
        }
        return a.compIndex - b.compIndex;
      }
      if (resultsSort.key === 'approval') {
        const av = a.isApproved ? 1 : 0;
        const bv = b.isApproved ? 1 : 0;
        if (av !== bv) return (av - bv) * mul;
        return a.compIndex - b.compIndex;
      }
      if (a.compIndex !== b.compIndex) return a.compIndex - b.compIndex;
      return a.levelIndex - b.levelIndex;
    });

    const totalItems = sortedRows.length;
    const effectivePageSize = resultsPageSize <= 0 ? Math.max(1, totalItems) : resultsPageSize;
    const totalPages = Math.max(1, Math.ceil(totalItems / effectivePageSize));
    const currentPage = Math.min(resultsPage, totalPages);
    const startIdx = (currentPage - 1) * effectivePageSize;
    const paginatedRows =
      resultsPageSize <= 0
        ? sortedRows
        : sortedRows.slice(startIdx, startIdx + effectivePageSize);

    const handleSortToggle = (
      key: 'competition' | 'level' | 'teams' | 'scored' | 'approval'
    ) => {
      setResultsSort((prev) => {
        if (prev.key === key) {
          if (prev.dir === 'asc') return { key, dir: 'desc' };
          return { key: 'default', dir: 'asc' };
        }
        return {
          key,
          dir: key === 'teams' || key === 'scored' || key === 'approval' ? 'desc' : 'asc'
        };
      });
      setResultsPage(1);
    };

    const hasActiveFilters =
      selectedCompFilter !== 'all' ||
      selectedLevelFilter !== 'ทั้งหมด' ||
      resultsApprovalFilter !== 'all' ||
      resultsSearch.trim() !== '';

    const resetAllFilters = () => {
      setSelectedCompFilter('all');
      setSelectedLevelFilter('ทั้งหมด');
      setResultsApprovalFilter('all');
      setResultsSearch('');
      setResultsSort({ key: 'default', dir: 'asc' });
      setResultsPage(1);
    };

    const activeModalRow = viewingResultTarget
      ? allCategoryRows.find(
          (r) =>
            r.comp.id === viewingResultTarget.compId &&
            r.level.trim() === viewingResultTarget.level.trim()
        ) || null
      : null;

    const modalSearchQ = resultsModalSearch.trim().toLowerCase();
    const modalVisibleRankedItems = activeModalRow
      ? activeModalRow.rankedItems.filter((item) => {
          if (!isAdminOrManager && (item.isAbsent || !item.hasScore)) return false;
          if (
            resultsModalMedalFilter !== 'all' &&
            item.medalCategory !== resultsModalMedalFilter
          ) {
            return false;
          }
          if (modalSearchQ) {
            const hay = `${item.studentNames} ${item.schoolName} ${item.medalLabel}`.toLowerCase();
            if (!hay.includes(modalSearchQ)) return false;
          }
          return true;
        })
      : [];

    const openResultsModal = (row: ActivityLevelResultRow) => {
      setResultsModalSearch('');
      setResultsModalMedalFilter('all');
      setViewingResultTarget({ compId: row.comp.id, level: row.level });
    };

    return (
      <div className="space-y-5">
        {/* Header Summary Card */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Trophy className="w-6 h-6 text-amber-500" />
              <span>ประกาศผลคะแนนการแข่งขัน</span>
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              สรุปรายการแข่งขันแยกตามกิจกรรมและระดับชั้น พร้อมแสดงสถานะการอนุมัติผล คลิกดูผลคะแนน และสั่งพิมพ์เอกสาร
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-semibold text-slate-700">
              ทั้งหมด <span className="font-extrabold text-slate-900">{allCategoryRows.length}</span> รายการ
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 font-semibold text-emerald-700 inline-flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>
                อนุมัติแล้ว <span className="font-extrabold">{approvedCategoriesCount}</span>
              </span>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2 font-semibold text-amber-700 inline-flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>
                รออนุมัติ <span className="font-extrabold">{pendingCategoriesCount}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Chairman Completed Notification Banner */}
        {isAdminOrManager && judgeCompletedPendingApprovalRows.length > 0 && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 sm:p-5 shadow-xs space-y-2.5">
            <div className="flex items-center gap-2 text-sm font-bold text-emerald-900">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>
                แจ้งเตือน: ประธานกรรมการตัดสินแจ้งการตัดสินเสร็จสมบูรณ์ครบทุกโรงเรียนแล้ว ({judgeCompletedPendingApprovalRows.length} รายการ รอผู้ดูแลระบบอนุมัติผล)
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {judgeCompletedPendingApprovalRows.map((item) => (
                <div
                  key={item.metaKey}
                  className="inline-flex items-center gap-2 rounded-xl bg-white border border-emerald-200 px-3 py-1.5 text-xs text-slate-700 shadow-2xs"
                >
                  <span className="font-bold text-emerald-800">{item.comp.name}</span>
                  <span className="text-slate-500">({item.level})</span>
                  {item.judgeCompletedBy && (
                    <span className="text-[11px] text-slate-500">• โดย {item.judgeCompletedBy}</span>
                  )}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => toggleApprove(item.metaKey)}
                      className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-0.5 text-[11px] font-bold cursor-pointer"
                    >
                      อนุมัติทันที
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Data Table Container */}
        <div className="rounded-2xl bg-white border border-slate-100 shadow-sm">
          {/* Dropdown Menu Filters Toolbar */}
          <div className="p-4 sm:p-5 border-b border-slate-100 space-y-3 bg-slate-50/60 rounded-t-2xl">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                <Filter className="w-4 h-4 text-amber-600" />
                <span>ตัวกรองข้อมูล (Dropdown Menu)</span>
              </div>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                >
                  ล้างตัวกรองทั้งหมด
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              {/* Search Activity / Level */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={resultsSearch}
                  onChange={(e) => {
                    setResultsSearch(e.target.value);
                    setResultsPage(1);
                  }}
                  placeholder="ค้นหาชื่อกิจกรรม / ระดับชั้น..."
                  className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm outline-none focus:border-amber-500"
                />
              </div>

              {/* Dropdown: Competition */}
              <select
                value={selectedCompFilter}
                onChange={(e) => {
                  const nextCompId = e.target.value;
                  setSelectedCompFilter(nextCompId);
                  if (nextCompId !== 'all') {
                    const c = COMPETITIONS.find((item) => item.id === nextCompId);
                    if (c && !c.levels.includes(selectedLevelFilter)) {
                      setSelectedLevelFilter('ทั้งหมด');
                    }
                  }
                  setResultsPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">กิจกรรม: ทั้งหมด</option>
                {COMPETITIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {/* Dropdown: Level */}
              <select
                value={selectedLevelFilter}
                onChange={(e) => {
                  setSelectedLevelFilter(e.target.value);
                  setResultsPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-amber-500 cursor-pointer"
              >
                {levelFilters.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl === 'ทั้งหมด' ? 'ระดับชั้น: ทั้งหมด' : lvl}
                  </option>
                ))}
              </select>

              {/* Dropdown: Approval Status */}
              <select
                value={resultsApprovalFilter}
                onChange={(e) => {
                  setResultsApprovalFilter(e.target.value);
                  setResultsPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="all">สถานะการอนุมัติ: ทั้งหมด</option>
                <option value="approved">อนุมัติประกาศผลแล้ว</option>
                <option value="pending">รออนุมัติผล</option>
              </select>

              {/* Dropdown: Page Size */}
              <select
                value={String(resultsPageSize)}
                onChange={(e) => {
                  setResultsPageSize(Number(e.target.value));
                  setResultsPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="10">แสดง: 10 รายการ/หน้า</option>
                <option value="25">แสดง: 25 รายการ/หน้า</option>
                <option value="50">แสดง: 50 รายการ/หน้า</option>
                <option value="0">แสดง: ทั้งหมด</option>
              </select>
            </div>
          </div>

          {/* Activity & Level Data Table */}
          {totalItems === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">
              ไม่พบข้อมูลกิจกรรมและระดับชั้นตามเงื่อนไขที่เลือก
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs">
                    <th className="py-3 px-4 font-bold text-center w-14 whitespace-nowrap">
                      ลำดับ
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('competition')}
                        className="inline-flex items-center gap-1 font-bold hover:text-amber-700 cursor-pointer"
                      >
                        <span>กิจกรรมการแข่งขัน</span>
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-4 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('level')}
                        className="inline-flex items-center gap-1 font-bold hover:text-amber-700 cursor-pointer"
                      >
                        <span>ระดับชั้น</span>
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('teams')}
                        className="inline-flex items-center gap-1 font-bold hover:text-amber-700 cursor-pointer mx-auto"
                      >
                        <span>ทีมที่สมัคร</span>
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('scored')}
                        className="inline-flex items-center gap-1 font-bold hover:text-amber-700 cursor-pointer mx-auto"
                      >
                        <span>บันทึกคะแนนแล้ว</span>
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleSortToggle('approval')}
                        className="inline-flex items-center gap-1 font-bold hover:text-amber-700 cursor-pointer mx-auto"
                      >
                        <span>สถานะการอนุมัติผล</span>
                        <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                      </button>
                    </th>
                    <th className="py-3 px-4 text-right font-bold whitespace-nowrap">
                      ดำเนินการ
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedRows.map((row, rowIdx) => {
                    const rowNumber = startIdx + rowIdx + 1;
                    const canPrintOrViewScores = row.isApproved || isAdmin;
                    return (
                      <tr
                        key={row.metaKey}
                        className="hover:bg-amber-50/30 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-center font-bold text-slate-500 whitespace-nowrap">
                          {rowNumber}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-800">{row.comp.name}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            ประเภท: {row.comp.type}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`text-xs font-bold px-2.5 py-1 rounded-full border ${row.comp.badgeBg}`}
                          >
                            {row.level}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap font-semibold text-slate-700 tabular-nums">
                          {row.totalRegisteredTeams} ทีม
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap tabular-nums">
                          {row.totalRegisteredTeams === 0 ? (
                            <span className="text-xs text-slate-400">-</span>
                          ) : (
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full border ${
                                row.scoredTeamsCount === row.totalRegisteredTeams
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : row.scoredTeamsCount > 0
                                  ? 'bg-sky-50 text-sky-700 border-sky-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {row.scoredTeamsCount} / {row.totalRegisteredTeams} ทีม
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {row.isApproved ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>อนุมัติประกาศผลแล้ว</span>
                            </span>
                          ) : row.judgeCompleted ? (
                            <span
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-800 bg-teal-50 px-3 py-1 rounded-full border border-teal-200"
                              title={row.judgeCompletedBy ? `แจ้งโดย ${row.judgeCompletedBy}` : undefined}
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                              <span>ประธานกรรมการแจ้งเสร็จสมบูรณ์ — รออนุมัติ</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                              <Clock className="w-3.5 h-3.5" />
                              <span>รออนุมัติผล</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openResultsModal(row)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                canPrintOrViewScores
                                  ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
                                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>ดูผลการแข่งขัน</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDownloadResultsPdf(row.comp.id, row.level)}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                                canPrintOrViewScores
                                  ? 'bg-amber-500 text-white border-amber-500 hover:bg-amber-600 shadow-xs'
                                  : 'bg-slate-100 text-slate-400 border-slate-200 hover:bg-slate-200/70'
                              }`}
                              title={
                                canPrintOrViewScores
                                  ? 'พิมพ์ / บันทึก PDF ใบประกาศผลการแข่งขัน'
                                  : 'ต้องรอผู้ดูแลระบบอนุมัติผลก่อนจึงจะพิมพ์ได้'
                              }
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>พิมพ์</span>
                            </button>

                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => toggleApprove(row.metaKey)}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-white cursor-pointer ${
                                  row.isApproved
                                    ? 'bg-amber-600 hover:bg-amber-700'
                                    : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                              >
                                {row.isApproved ? (
                                  <>
                                    <XCircle className="w-3.5 h-3.5" />
                                    <span>ยกเลิกอนุมัติ</span>
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>อนุมัติผล</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Data Table Pagination Footer */}
          <div className="px-4 sm:px-5 py-3.5 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600 bg-slate-50/50 rounded-b-2xl">
            <div className="flex flex-wrap items-center gap-3">
              <span>
                {totalItems === 0
                  ? 'แสดง 0 รายการ'
                  : `แสดง ${startIdx + 1} - ${Math.min(
                      startIdx + paginatedRows.length,
                      totalItems
                    )} จากทั้งหมด ${totalItems} รายการ`}
              </span>
              <select
                value={String(resultsPageSize)}
                onChange={(e) => {
                  setResultsPageSize(Number(e.target.value));
                  setResultsPage(1);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs outline-none cursor-pointer"
              >
                <option value="10">10 แถว / หน้า</option>
                <option value="25">25 แถว / หน้า</option>
                <option value="50">50 แถว / หน้า</option>
                <option value="0">แสดงทั้งหมด</option>
              </select>
            </div>

            {resultsPageSize > 0 && totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => setResultsPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>ก่อนหน้า</span>
                </button>
                <span className="px-2.5 py-1 font-bold text-slate-700">
                  หน้า {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => setResultsPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer font-semibold"
                >
                  <span>ถัดไป</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Modal: View Competition & Level Results Scoreboard */}
        {activeModalRow && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6">
            <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-gradient-to-r from-amber-50 via-white to-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base sm:text-lg font-extrabold text-slate-800 flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-amber-500 shrink-0" />
                      <span>{activeModalRow.comp.name}</span>
                    </h3>
                    <span
                      className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${activeModalRow.comp.badgeBg}`}
                    >
                      {activeModalRow.level}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    {activeModalRow.isApproved ? (
                      <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>อนุมัติประกาศผลแล้ว</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                        <Clock className="w-3.5 h-3.5" />
                        <span>รออนุมัติผล</span>
                      </span>
                    )}
                    <span>
                      สมัคร {activeModalRow.totalRegisteredTeams} ทีม • บันทึกคะแนนแล้ว{' '}
                      {activeModalRow.scoredTeamsCount}/{activeModalRow.totalRegisteredTeams} ทีม
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => toggleApprove(activeModalRow.metaKey)}
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white cursor-pointer ${
                        activeModalRow.isApproved
                          ? 'bg-amber-600 hover:bg-amber-700'
                          : 'bg-emerald-600 hover:bg-emerald-700'
                      }`}
                    >
                      {activeModalRow.isApproved ? (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>ยกเลิกอนุมัติ</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>อนุมัติประกาศผล</span>
                        </>
                      )}
                    </button>
                  )}

                  {(activeModalRow.isApproved || isAdminOrManager) && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadResultsPdf(activeModalRow.comp.id, activeModalRow.level)
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs cursor-pointer"
                    >
                      <Printer className="w-4 h-4" />
                      <span>พิมพ์ผลการแข่งขัน</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setViewingResultTarget(null)}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 cursor-pointer"
                    aria-label="ปิดหน้าต่าง"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
                {!activeModalRow.isApproved && !isAdminOrManager ? (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center space-y-2.5">
                    <Clock className="w-10 h-10 text-amber-500 mx-auto" />
                    <div className="text-base font-bold text-slate-800">
                      รายการนี้ยังอยู่ระหว่างรออนุมัติผลการแข่งขัน
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-md mx-auto">
                      ขณะนี้คณะกรรมการบันทึกคะแนนแล้ว {activeModalRow.scoredTeamsCount} จาก{' '}
                      {activeModalRow.totalRegisteredTeams} ทีม ระบบจะเปิดแสดงอันดับ คะแนน
                      และพิมพ์ใบประกาศผลเมื่อผู้ดูแลระบบอนุมัติผลอย่างเป็นทางการแล้ว
                    </p>
                  </div>
                ) : (
                  <>
                    {/* Modal Filter Bar */}
                    <div className="flex flex-col sm:flex-row gap-2.5">
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={resultsModalSearch}
                          onChange={(e) => setResultsModalSearch(e.target.value)}
                          placeholder="ค้นหาชื่อผู้เข้าแข่งขัน / โรงเรียน..."
                          className="w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs sm:text-sm outline-none focus:border-amber-500"
                        />
                      </div>
                      <select
                        value={resultsModalMedalFilter}
                        onChange={(e) => setResultsModalMedalFilter(e.target.value)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="all">ระดับเหรียญรางวัล: ทั้งหมด</option>
                        <option value="gold">เหรียญทอง</option>
                        <option value="silver">เหรียญเงิน</option>
                        <option value="bronze">เหรียญทองแดง</option>
                        <option value="participant">เข้าร่วมการแข่งขัน</option>
                      </select>
                    </div>

                    {modalVisibleRankedItems.length === 0 ? (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-8 text-center text-sm text-slate-400">
                        ยังไม่มีข้อมูลผลคะแนนในรายการนี้
                      </div>
                    ) : (
                      <div className="rounded-xl border border-slate-200 overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs sm:text-sm">
                          <thead>
                            <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 text-xs">
                              <th className="py-2.5 px-3.5 font-bold whitespace-nowrap">
                                ลำดับที่ / รางวัล
                              </th>
                              <th className="py-2.5 px-3.5 font-bold">ผู้เข้าแข่งขัน</th>
                              <th className="py-2.5 px-3.5 font-bold">โรงเรียน</th>
                              {isAdminOrManager && (
                                <th className="py-2.5 px-3.5 font-bold">คะแนนกรรมการ</th>
                              )}
                              <th className="py-2.5 px-3.5 font-bold text-right whitespace-nowrap">
                                คะแนนรวม (เต็ม 100)
                              </th>
                              <th className="py-2.5 px-3.5 font-bold text-center whitespace-nowrap">
                                ระดับเหรียญรางวัล
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
                            {modalVisibleRankedItems.map((item, idx) => {
                              const isTwoRoundModal = isTwoRoundCompetition(activeModalRow.comp.id);
                              const prevItem = idx > 0 ? modalVisibleRankedItems[idx - 1] : null;
                              const showFinalHeader =
                                isTwoRoundModal &&
                                item.hasScore &&
                                item.roundGroup === 'final_top10' &&
                                (!prevItem || prevItem.roundGroup !== 'final_top10');
                              const showQualRestHeader =
                                isTwoRoundModal &&
                                item.hasScore &&
                                item.roundGroup === 'qualifying_rest' &&
                                (!prevItem || prevItem.roundGroup !== 'qualifying_rest');
                              const modalCols = isAdminOrManager ? 6 : 5;

                              return (
                                <React.Fragment key={item.reg.id}>
                                  {showFinalHeader && (
                                    <tr className="bg-emerald-50/90 text-emerald-900 border-y border-emerald-200">
                                      <td colSpan={modalCols} className="py-2 px-3.5 text-xs font-extrabold">
                                        รอบตัดสิน (คัดเลือกอันดับที่ 1–10 จากรอบคัดเลือก เรียงตามคะแนนรอบตัดสิน)
                                      </td>
                                    </tr>
                                  )}
                                  {showQualRestHeader && (
                                    <tr className="bg-amber-50/90 text-amber-900 border-y border-amber-200">
                                      <td colSpan={modalCols} className="py-2 px-3.5 text-xs font-extrabold">
                                        รอบคัดเลือก (ไม่เข้าเกณฑ์ 1–10 ต่อท้าย เรียงตามคะแนนรอบคัดเลือก)
                                      </td>
                                    </tr>
                                  )}
                                  <tr className="hover:bg-amber-50/30">
                                    <td className="py-3 px-3.5 whitespace-nowrap">
                                      {item.isAbsent ? (
                                        <span className="text-xs font-bold text-rose-600">
                                          ไม่เข้าร่วม
                                        </span>
                                      ) : item.hasScore && item.rankNum ? (
                                        <span
                                          className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                                            item.rankNum === 1
                                              ? 'bg-amber-100 text-amber-900 border-amber-300'
                                              : item.rankNum === 2
                                              ? 'bg-slate-100 text-slate-800 border-slate-300'
                                              : item.rankNum === 3
                                              ? 'bg-orange-100 text-orange-900 border-orange-300'
                                              : item.rankNum === 4 || item.rankNum === 5
                                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                              : 'bg-slate-50 text-slate-700 border-slate-200'
                                          }`}
                                        >
                                          {getRankAwardLabel(item.rankNum, false, true, 'อันดับที่')}
                                        </span>
                                      ) : (
                                        <span className="text-xs font-semibold text-slate-400">
                                          รอคะแนน
                                        </span>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 font-medium text-slate-800">
                                      <div>{item.studentNames || '-'}</div>
                                      {item.hasScore && item.roundInfo.isTwoRound && (
                                        <div
                                          className={`text-[11px] font-semibold mt-0.5 ${
                                            item.roundGroup === 'final_top10' ? 'text-emerald-700' : 'text-amber-700'
                                          }`}
                                        >
                                          {item.roundGroup === 'final_top10'
                                            ? `รอบตัดสิน (1–10)${
                                                item.roundInfo.qualifyingCalc.judgeCount > 0
                                                  ? ` • คัดเลือก #${item.qualifyingRank || '-'} (${item.roundInfo.qualifyingCalc.average100.toFixed(2)})`
                                                  : ''
                                              }${
                                                item.roundInfo.finalCalc.judgeCount > 0
                                                  ? ` • ตัดสิน (${item.roundInfo.finalCalc.average100.toFixed(2)})`
                                                  : ' • รอคะแนนรอบตัดสิน'
                                              }`
                                            : `รอบคัดเลือก (ไม่เข้าเกณฑ์ 1–10 • คัดเลือก #${item.qualifyingRank || '-'} ได้ ${item.roundInfo.qualifyingCalc.average100.toFixed(2)})`}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 text-slate-600">{item.schoolName}</td>
                                    {isAdminOrManager && (
                                      <td className="py-3 px-3.5 text-xs text-slate-500">
                                        {Object.keys(item.judgeScores).length === 0 ? (
                                          <span className="text-slate-400">ยังไม่มีคะแนน</span>
                                        ) : (
                                          <div className="flex flex-wrap gap-1">
                                            {Object.entries(item.judgeScores).map(([jId, sc]) => {
                                              const jObj = judges.find((j) => j.id === jId);
                                              return (
                                                <span
                                                  key={jId}
                                                  className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-semibold"
                                                >
                                                  {jObj ? jObj.name : jId}: {sc}
                                                </span>
                                              );
                                            })}
                                          </div>
                                        )}
                                      </td>
                                    )}
                                    <td className="py-3 px-3.5 text-right font-extrabold text-amber-700 tabular-nums whitespace-nowrap">
                                      <div>{item.hasScore ? item.score.toFixed(2) : '-'}</div>
                                      {item.hasScore && item.roundInfo.isTwoRound && (
                                        <div className={`text-[10px] font-semibold ${item.roundGroup === 'final_top10' ? 'text-emerald-700' : 'text-amber-700'}`}>
                                          {item.roundGroup === 'final_top10'
                                            ? item.roundInfo.finalCalc.judgeCount > 0
                                              ? 'รอบตัดสิน'
                                              : 'รอผลรอบตัดสิน'
                                            : 'รอบคัดเลือก'}
                                        </div>
                                      )}
                                    </td>
                                    <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                      <span
                                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${item.medalBadgeCls}`}
                                      >
                                        {item.medalLabel}
                                      </span>
                                    </td>
                                  </tr>
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/70 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setViewingResultTarget(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 cursor-pointer"
                >
                  ปิดหน้าต่าง
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderCompetitionCheckinPage = () => {
    if (
      authSession.role !== 'admin' &&
      authSession.role !== 'manager' &&
      authSession.role !== 'registrar'
    ) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <ShieldCheck className="w-8 h-8 text-rose-500 mx-auto" />
          <div className="font-bold text-slate-800">
            เมนูนี้สำหรับผู้ดูแลระบบ ผู้จัดการแข่งขัน หรือเจ้าหน้าที่ลงทะเบียนเท่านั้น
          </div>
        </div>
      );
    }

    const selectedComp = COMPETITIONS.find((c) => c.id === adminCompManageId) || COMPETITIONS[0];
    const compRegistrations = registrations.filter(
      (r) =>
        r.competitionId === selectedComp.id &&
        (adminCompManageLevel === 'ทั้งหมด' ? true : r.level === adminCompManageLevel)
    );

    const resetCompManageRegForm = (
      compId: string = selectedComp.id,
      lvl: string = adminCompManageLevel
    ) => {
      const targetComp = COMPETITIONS.find((c) => c.id === compId) || COMPETITIONS[0];
      const resolvedLevel =
        lvl !== 'ทั้งหมด' && targetComp.levels.includes(lvl) ? lvl : targetComp.levels[0];
      setCompManageRegForm({
        editingId: null,
        schoolId: schools[0]?.id || '',
        level: resolvedLevel,
        studentNames: Array.from({ length: Math.max(1, targetComp.teamSize) }, () => ''),
        studentPhotos: Array.from({ length: Math.max(1, targetComp.teamSize) }, () => ''),
        coachNames: [''],
        coachPhotos: [''],
        qualifyingSong: '',
        finalSong: ''
      });
    };

    const startEditCompManageReg = (reg: RegistrationItem) => {
      const targetSize = Math.max(selectedComp.teamSize, reg.students.length, 1);
      const normalizedStudents = Array.from({ length: targetSize }, (_, idx) => ({
        name: reg.students[idx]?.name || '',
        photoUrl: reg.students[idx]?.photoUrl || ''
      }));
      const normalizedCoaches =
        reg.coaches.length > 0
          ? reg.coaches.map((c) =>
              typeof c === 'string'
                ? { name: c, photoUrl: '' }
                : { name: c.name || '', photoUrl: c.photoUrl || '' }
            )
          : [{ name: '', photoUrl: '' }];
      setCompManageRegForm({
        editingId: reg.id,
        schoolId: reg.schoolId || schools[0]?.id || '',
        level: selectedComp.levels.includes(reg.level) ? reg.level : selectedComp.levels[0],
        studentNames: normalizedStudents.map((s) => s.name),
        studentPhotos: normalizedStudents.map((s) => s.photoUrl),
        coachNames: normalizedCoaches.map((c) => c.name),
        coachPhotos: normalizedCoaches.map((c) => c.photoUrl),
        qualifyingSong: reg.qualifyingSong || '',
        finalSong: reg.finalSong || ''
      });
    };

    const handleCompManagePhotoUpload = async (
      kind: 'student' | 'coach',
      idx: number,
      file?: File
    ) => {
      if (!file) return;
      const uploadedUrl = await uploadImageToServer(
        file,
        kind === 'coach' ? 'coaches' : 'students',
        600,
        0.85
      );
      if (!uploadedUrl) return;
      setCompManageRegForm((prev) => {
        if (kind === 'student') {
          const nextPhotos = [...prev.studentPhotos];
          nextPhotos[idx] = uploadedUrl;
          return { ...prev, studentPhotos: nextPhotos };
        }
        const nextPhotos = [...prev.coachPhotos];
        nextPhotos[idx] = uploadedUrl;
        return { ...prev, coachPhotos: nextPhotos };
      });
    };

    const handleCompManageRegSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!compManageRegForm.schoolId) {
        showToast('กรุณาเลือกโรงเรียนที่เข้าแข่งขัน', 'error');
        return;
      }
      const cleanedStudents = compManageRegForm.studentNames
        .map((name, i) => ({
          name: name.trim(),
          photoUrl: compManageRegForm.studentPhotos[i] || ''
        }))
        .filter((s) => s.name.length > 0);
      if (cleanedStudents.length === 0) {
        showToast('กรุณาระบุชื่อผู้เข้าแข่งขันอย่างน้อย 1 คน', 'error');
        return;
      }
      const cleanedCoaches = compManageRegForm.coachNames
        .map((c, i) => ({
          name: c.trim(),
          photoUrl: compManageRegForm.coachPhotos[i] || ''
        }))
        .filter((c) => c.name.length > 0);

      if (
        selectedComp.requiresSongs &&
        (!compManageRegForm.qualifyingSong.trim() || !compManageRegForm.finalSong.trim())
      ) {
        showToast('รายการร้องเพลงไทยลูกทุ่งต้องระบุเพลงรอบคัดเลือกและรอบตัดสินให้ครบถ้วน', 'error');
        return;
      }

      const resolvedLevel = selectedComp.levels.includes(compManageRegForm.level)
        ? compManageRegForm.level
        : selectedComp.levels[0];

      try {
        const res = await appApiCall('/registrations/save', {
          id: compManageRegForm.editingId || undefined,
          schoolId: compManageRegForm.schoolId,
          competitionId: selectedComp.id,
          level: resolvedLevel,
          students: cleanedStudents,
          coaches:
            cleanedCoaches.length > 0
              ? cleanedCoaches
              : [{ name: 'ครูผู้ฝึกสอน', photoUrl: '' }],
          qualifyingSong: selectedComp.requiresSongs ? compManageRegForm.qualifyingSong.trim() : '',
          finalSong: selectedComp.requiresSongs ? compManageRegForm.finalSong.trim() : ''
        });
        showToast(res.message || 'บันทึกการลงทะเบียนเข้าร่วมแข่งขันเรียบร้อยแล้ว');
        resetCompManageRegForm(selectedComp.id, adminCompManageLevel);
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลการลงทะเบียนได้',
          'error'
        );
      }
    };

    const handleCompCheckinStatus = async (
      regItem: RegistrationItem,
      nextStatus: 'checked_in' | 'pending' | 'absent'
    ) => {
      try {
        const res = await appApiCall('/competition/checkin', {
          registrationId: regItem.id,
          status: nextStatus
        });
        showToast(res.message || 'บันทึกสถานะรายงานตัวเข้าร่วมแข่งขันเรียบร้อยแล้ว');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'ไม่สามารถบันทึกสถานะรายงานตัวได้',
          'error'
        );
      }
    };

    const handleSchoolBatchCheckinStatus = async (
      schoolId: string,
      nextStatus: 'checked_in' | 'pending' | 'absent'
    ) => {
      try {
        const res = await appApiCall('/competition/checkin', {
          schoolId,
          competitionId: selectedComp.id,
          level: adminCompManageLevel,
          status: nextStatus
        });
        showToast(res.message || 'อัปเดตสถานะการลงทะเบียนแบบโรงเรียนเรียบร้อยแล้ว');
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะแบบโรงเรียนได้',
          'error'
        );
      }
    };

    const handleMarkAllPendingAbsent = async () => {
      try {
        const res = await appApiCall('/competition/checkin', {
          competitionId: selectedComp.id,
          level: adminCompManageLevel,
          pendingOnly: true,
          status: 'absent'
        });
        showToast(
          res.message || 'แจ้งสถานะไม่เข้าร่วมแข่งขันสำหรับทีมที่ยังไม่ลงทะเบียนเรียบร้อยแล้ว'
        );
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : 'ไม่สามารถแจ้งไม่เข้าร่วมทีมที่ยังไม่ลงทะเบียนได้',
          'error'
        );
      }
    };

    const checkedInCount = compRegistrations.filter(
      (r) => !absentRegs[r.id] && Boolean(checkIns[r.id]?.checkedIn)
    ).length;
    const absentCompCount = compRegistrations.filter((r) => Boolean(absentRegs[r.id])).length;
    const pendingCheckinCount = Math.max(
      0,
      compRegistrations.length - checkedInCount - absentCompCount
    );

    const checkinSearchQ = compManageCheckinSearch.trim().toLowerCase();
    const filteredCheckinRegs = compRegistrations.filter((r) => {
      const isAbsent = Boolean(absentRegs[r.id]);
      const isCheckedIn = !isAbsent && Boolean(checkIns[r.id]?.checkedIn);
      const resolvedStatus: 'checked_in' | 'pending' | 'absent' = isAbsent
        ? 'absent'
        : isCheckedIn
        ? 'checked_in'
        : 'pending';
      if (compManageCheckinFilter !== 'all' && resolvedStatus !== compManageCheckinFilter) {
        return false;
      }
      if (!checkinSearchQ) return true;
      const sch = schools.find((s) => s.id === r.schoolId);
      const text = [
        sch?.name || '',
        r.level,
        r.students.map((st) => st.name).join(' '),
        r.coaches.map((c) => (typeof c === 'string' ? c : c.name)).join(' ')
      ]
        .join(' ')
        .toLowerCase();
      return text.includes(checkinSearchQ);
    });

    const groupedBySchool = schools
      .map((sch) => {
        const schRegs = compRegistrations.filter((r) => r.schoolId === sch.id);
        return { school: sch, regs: schRegs };
      })
      .filter(({ school, regs }) => {
        if (regs.length === 0) return false;
        if (compManageCheckinFilter !== 'all') {
          const matchesFilter = regs.some((r) => {
            const isAb = Boolean(absentRegs[r.id]);
            const isChk = !isAb && Boolean(checkIns[r.id]?.checkedIn);
            const st = isAb ? 'absent' : isChk ? 'checked_in' : 'pending';
            return st === compManageCheckinFilter;
          });
          if (!matchesFilter) return false;
        }
        if (!checkinSearchQ) return true;
        const text = [
          school.name,
          school.schoolCode,
          ...regs.map((r) => `${r.level} ${r.students.map((s) => s.name).join(' ')}`)
        ]
          .join(' ')
          .toLowerCase();
        return text.includes(checkinSearchQ);
      });

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-6 h-6 text-indigo-600" />
                <span>ลงทะเบียนเข้าร่วมแข่งขัน</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                บันทึกการรายงานตัวเข้าร่วมแข่งขันแบบรายทีมหรือรายโรงเรียน ยกเลิกการลงทะเบียน และแจ้งไม่เข้าร่วมแข่งขัน (เชื่อมโยงกับหน้าลงคะแนนกรรมการ)
              </p>
            </div>
            <button
              type="button"
              disabled={pendingCheckinCount === 0}
              onClick={handleMarkAllPendingAbsent}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition ${
                pendingCheckinCount === 0
                  ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                  : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
              }`}
            >
              <UserX className="w-4 h-4" />
              <span>แจ้งไม่เข้าร่วมทีมที่ยังไม่ลงทะเบียนทั้งหมด ({pendingCheckinCount})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">เลือกกิจกรรมการแข่งขัน</label>
              <select
                value={selectedComp.id}
                onChange={(e) => {
                  const nextCompId = e.target.value;
                  setAdminCompManageId(nextCompId);
                  setAdminCompManageLevel('ทั้งหมด');
                  resetCompManageRegForm(nextCompId, 'ทั้งหมด');
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-indigo-500"
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
                onChange={(e) => {
                  const nextLvl = e.target.value;
                  setAdminCompManageLevel(nextLvl);
                  if (!compManageRegForm.editingId && nextLvl !== 'ทั้งหมด') {
                    setCompManageRegForm((prev) => ({ ...prev, level: nextLvl }));
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-indigo-500"
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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">ลงทะเบียนทั้งหมด</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{compRegistrations.length} ทีม</div>
          </div>
          <div className="rounded-2xl bg-emerald-50/80 p-4 border border-emerald-200 shadow-sm">
            <div className="text-xs font-semibold text-emerald-700">ลงทะเบียนเข้าร่วมแล้ว</div>
            <div className="text-2xl font-extrabold text-emerald-800 mt-1">{checkedInCount} ทีม</div>
          </div>
          <div className="rounded-2xl bg-amber-50/80 p-4 border border-amber-200 shadow-sm">
            <div className="text-xs font-semibold text-amber-700">รอลงทะเบียนเข้าร่วม</div>
            <div className="text-2xl font-extrabold text-amber-800 mt-1">{pendingCheckinCount} ทีม</div>
          </div>
          <div className="rounded-2xl bg-rose-50/80 p-4 border border-rose-200 shadow-sm">
            <div className="text-xs font-semibold text-rose-700">ไม่เข้าร่วมแข่งขัน</div>
            <div className="text-2xl font-extrabold text-rose-800 mt-1">{absentCompCount} ทีม</div>
          </div>
        </div>

        <form
          onSubmit={handleCompManageRegSubmit}
          className="rounded-2xl bg-white p-6 shadow-sm border border-indigo-100 space-y-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-indigo-600" />
                <span>
                  {compManageRegForm.editingId
                    ? `แก้ไขข้อมูลทีมเข้าแข่งขัน — ${selectedComp.name}`
                    : `เพิ่ม / ลงทะเบียนทีมเข้าแข่งขัน — ${selectedComp.name}`}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ผู้ดูแลระบบ ผู้จัดการแข่งขัน และเจ้าหน้าที่ลงทะเบียนสามารถเพิ่ม แก้ไข หรือยกเลิกการลงทะเบียนทีมเข้าแข่งขันได้ตลอดเวลา
              </p>
            </div>
            {compManageRegForm.editingId && (
              <button
                type="button"
                onClick={() => resetCompManageRegForm(selectedComp.id, adminCompManageLevel)}
                className="self-start rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-bold cursor-pointer"
              >
                ยกเลิกการแก้ไข
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">โรงเรียน / สถานศึกษา *</label>
              <select
                value={compManageRegForm.schoolId}
                onChange={(e) => setCompManageRegForm((p) => ({ ...p, schoolId: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
              >
                {schools.map((sch) => (
                  <option key={sch.id} value={sch.id}>
                    {sch.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">ระดับชั้น *</label>
              <select
                value={compManageRegForm.level}
                onChange={(e) => setCompManageRegForm((p) => ({ ...p, level: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
              >
                {selectedComp.levels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                รายชื่อนักเรียนผู้เข้าแข่งขัน ({compManageRegForm.studentNames.length} คน)
              </label>
              <button
                type="button"
                onClick={() =>
                  setCompManageRegForm((p) => ({
                    ...p,
                    studentNames: [...p.studentNames, ''],
                    studentPhotos: [...p.studentPhotos, '']
                  }))
                }
                className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-2.5 py-1 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มนักเรียน</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {compManageRegForm.studentNames.map((stName, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center gap-3">
                  {compManageRegForm.studentPhotos[idx] ? (
                    <img
                      src={compManageRegForm.studentPhotos[idx]}
                      alt="นักเรียน"
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      type="text"
                      value={stName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompManageRegForm((p) => {
                          const next = [...p.studentNames];
                          next[idx] = val;
                          return { ...p, studentNames: next };
                        });
                      }}
                      placeholder={`ชื่อ-นามสกุล นักเรียนคนที่ ${idx + 1}`}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:text-indigo-800 cursor-pointer">
                        <Upload className="w-3 h-3" />
                        <span>{compManageRegForm.studentPhotos[idx] ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCompManagePhotoUpload('student', idx, e.target.files?.[0])}
                        />
                      </label>
                      {compManageRegForm.studentNames.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setCompManageRegForm((p) => ({
                              ...p,
                              studentNames: p.studentNames.filter((_, i) => i !== idx),
                              studentPhotos: p.studentPhotos.filter((_, i) => i !== idx)
                            }))
                          }
                          className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          ลบช่องนี้
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700">
                รายชื่อครูผู้ฝึกสอน ({compManageRegForm.coachNames.length} ท่าน)
              </label>
              <button
                type="button"
                onClick={() =>
                  setCompManageRegForm((p) => ({
                    ...p,
                    coachNames: [...p.coachNames, ''],
                    coachPhotos: [...p.coachPhotos, '']
                  }))
                }
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 text-xs font-bold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มครูผู้ฝึกสอน</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {compManageRegForm.coachNames.map((cName, idx) => (
                <div key={idx} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex items-center gap-3">
                  {compManageRegForm.coachPhotos[idx] ? (
                    <img
                      src={compManageRegForm.coachPhotos[idx]}
                      alt="ครูผู้ฝึกสอน"
                      className="w-11 h-11 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 shrink-0">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <input
                      type="text"
                      value={cName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCompManageRegForm((p) => {
                          const next = [...p.coachNames];
                          next[idx] = val;
                          return { ...p, coachNames: next };
                        });
                      }}
                      placeholder={`ชื่อ-นามสกุล ครูผู้ฝึกสอนท่านที่ ${idx + 1}`}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer">
                        <Upload className="w-3 h-3" />
                        <span>{compManageRegForm.coachPhotos[idx] ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCompManagePhotoUpload('coach', idx, e.target.files?.[0])}
                        />
                      </label>
                      {compManageRegForm.coachNames.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            setCompManageRegForm((p) => ({
                              ...p,
                              coachNames: p.coachNames.filter((_, i) => i !== idx),
                              coachPhotos: p.coachPhotos.filter((_, i) => i !== idx)
                            }))
                          }
                          className="text-[11px] font-bold text-rose-600 hover:underline cursor-pointer"
                        >
                          ลบช่องนี้
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedComp.requiresSongs && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-xl bg-amber-50/70 border border-amber-200 p-4">
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">ชื่อเพลงรอบคัดเลือก *</label>
                <input
                  type="text"
                  value={compManageRegForm.qualifyingSong}
                  onChange={(e) => setCompManageRegForm((p) => ({ ...p, qualifyingSong: e.target.value }))}
                  placeholder="ระบุชื่อเพลงที่ใช้ประกวดรอบคัดเลือก"
                  className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-amber-900 mb-1">ชื่อเพลงรอบตัดสิน *</label>
                <input
                  type="text"
                  value={compManageRegForm.finalSong}
                  onChange={(e) => setCompManageRegForm((p) => ({ ...p, finalSong: e.target.value }))}
                  placeholder="ระบุชื่อเพลงที่ใช้ประกวดรอบตัดสิน"
                  className="w-full rounded-xl border border-amber-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-amber-500"
                />
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-sky-600 hover:opacity-95 text-white font-bold px-5 py-2.5 text-sm shadow-sm cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>{compManageRegForm.editingId ? 'บันทึกการแก้ไขทีมเข้าแข่งขัน' : 'บันทึกการลงทะเบียนเข้าร่วมแข่งขัน'}</span>
            </button>
          </div>
        </form>

        {/* Check-in & Registered Teams / Schools Panel */}
        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-emerald-600" />
                <span>การลงทะเบียนเข้าร่วมแข่งขันและยกเลิกการลงทะเบียน</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เลือกจัดการลงทะเบียนเข้าร่วม ยกเลิกการลงทะเบียน หรือแจ้งไม่เข้าร่วมได้ทั้งแบบรายทีมและแบบรายโรงเรียน
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => setCompManageRegMode('team')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    compManageRegMode === 'team'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>แบบรายทีม</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCompManageRegMode('school')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    compManageRegMode === 'school'
                      ? 'bg-white text-emerald-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <School className="w-3.5 h-3.5" />
                  <span>แบบรายโรงเรียน</span>
                </button>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={compManageCheckinSearch}
                  onChange={(e) => setCompManageCheckinSearch(e.target.value)}
                  placeholder="ค้นหาโรงเรียน / นักเรียน..."
                  className="rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 focus:bg-white outline-none"
                />
              </div>
              <select
                value={compManageCheckinFilter}
                onChange={(e) => setCompManageCheckinFilter(e.target.value as 'all' | 'checked_in' | 'pending' | 'absent')}
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm bg-slate-50 outline-none"
              >
                <option value="all">ทั้งหมด ({compRegistrations.length})</option>
                <option value="checked_in">ลงทะเบียนแล้ว ({checkedInCount})</option>
                <option value="pending">รอลงทะเบียน ({pendingCheckinCount})</option>
                <option value="absent">ไม่เข้าร่วมแข่งขัน ({absentCompCount})</option>
              </select>
            </div>
          </div>

          {compManageRegMode === 'school' ? (
            groupedBySchool.length === 0 ? (
              <div className="text-center py-8 text-sm text-slate-400">
                ไม่พบข้อมูลโรงเรียนที่มีทีมสมัครในเงื่อนไขที่เลือก
              </div>
            ) : (
              <div className="space-y-4">
                {groupedBySchool.map(({ school, regs }) => {
                  const schCheckedIn = regs.filter((r) => !absentRegs[r.id] && Boolean(checkIns[r.id]?.checkedIn)).length;
                  const schAbsent = regs.filter((r) => Boolean(absentRegs[r.id])).length;
                  const schPending = Math.max(0, regs.length - schCheckedIn - schAbsent);
                  const anyLevelApproved = regs.some((r) => Boolean(evalMeta[`${r.competitionId}__${r.level}`]?.approved));
                  return (
                    <div key={school.id} className="rounded-2xl border border-slate-200 bg-slate-50/60 overflow-hidden">
                      <div className="px-4 py-3.5 bg-white border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-bold text-slate-800 text-sm sm:text-base">{school.name}</span>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              รหัส {school.schoolCode}
                            </span>
                            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
                              ทั้งหมด {regs.length} ทีม (เข้าร่วมแล้ว {schCheckedIn} • รอ {schPending}{schAbsent > 0 ? ` • ไม่ร่วม ${schAbsent}` : ''})
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleSchoolBatchCheckinStatus(school.id, 'checked_in')}
                            className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold cursor-pointer shadow-xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ลงทะเบียนทั้งโรงเรียน</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSchoolBatchCheckinStatus(school.id, 'pending')}
                            className="inline-flex items-center gap-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-3 py-1.5 text-xs font-bold cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>ยกเลิกการลงทะเบียนทั้งโรงเรียน</span>
                          </button>
                          <button
                            type="button"
                            disabled={anyLevelApproved}
                            onClick={() => handleSchoolBatchCheckinStatus(school.id, 'absent')}
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold border ${
                              anyLevelApproved
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                            }`}
                          >
                            <UserX className="w-3.5 h-3.5" />
                            <span>ไม่เข้าร่วมทั้งโรงเรียน</span>
                          </button>
                        </div>
                      </div>

                      <div className="p-3 space-y-2">
                        {regs.map((reg) => {
                          const metaApproved = Boolean(evalMeta[`${reg.competitionId}__${reg.level}`]?.approved);
                          const isAbsent = Boolean(absentRegs[reg.id]);
                          const isCheckedIn = !isAbsent && Boolean(checkIns[reg.id]?.checkedIn);
                          return (
                            <div key={reg.id} className="rounded-xl bg-white border border-slate-200/80 px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="font-bold text-indigo-700">{reg.level}</span>
                                  {isAbsent ? (
                                    <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold text-[11px]">ไม่เข้าร่วมแข่งขัน</span>
                                  ) : isCheckedIn ? (
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold text-[11px]">ลงทะเบียนแล้ว</span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold text-[11px]">รอลงทะเบียน</span>
                                  )}
                                </div>
                                <div className="font-semibold text-slate-800 mt-0.5">
                                  {reg.students.map((st) => st.name).join(', ') || '-'}
                                </div>
                              </div>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {!isCheckedIn ? (
                                  <button
                                    type="button"
                                    onClick={() => handleCompCheckinStatus(reg, 'checked_in')}
                                    className="px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold cursor-pointer"
                                  >
                                    ลงทะเบียนเข้าร่วม
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCompCheckinStatus(reg, 'pending')}
                                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold cursor-pointer"
                                  >
                                    ยกเลิกการลงทะเบียน
                                  </button>
                                )}
                                {!isAbsent ? (
                                  <button
                                    type="button"
                                    disabled={metaApproved}
                                    onClick={() => handleCompCheckinStatus(reg, 'absent')}
                                    className={`px-2.5 py-1 rounded-lg font-bold border ${
                                      metaApproved
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                                    }`}
                                  >
                                    ไม่เข้าร่วม
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleCompCheckinStatus(reg, 'pending')}
                                    className="px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-bold cursor-pointer"
                                  >
                                    ยกเลิกไม่เข้าร่วม
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => startEditCompManageReg(reg)}
                                  className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 cursor-pointer"
                                  aria-label="แก้ไขทีม"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                {confirmDeleteRegId === reg.id ? (
                                  <span className="inline-flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteRegistration(reg.id)}
                                      className="px-2 py-1 rounded-lg bg-rose-600 text-white font-bold cursor-pointer"
                                    >
                                      ยืนยันถอนทีม
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRegId(null)}
                                      className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 font-bold cursor-pointer"
                                    >
                                      กลับ
                                    </button>
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    disabled={metaApproved}
                                    onClick={() => setConfirmDeleteRegId(reg.id)}
                                    className={`px-2 py-1 rounded-lg font-bold border ${
                                      metaApproved
                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                        : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                                    }`}
                                  >
                                    ถอนทีม
                                  </button>
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
            )
          ) : filteredCheckinRegs.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              ไม่พบรายการลงทะเบียนเข้าร่วมแข่งขันในเงื่อนไขที่เลือก
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                    <th className="py-2.5 px-3 w-12 text-center">ลำดับ</th>
                    <th className="py-2.5 px-3">โรงเรียน / ระดับชั้น</th>
                    <th className="py-2.5 px-3">ผู้เข้าแข่งขัน & ครูผู้ฝึกสอน</th>
                    <th className="py-2.5 px-3">สถานะการลงทะเบียน</th>
                    <th className="py-2.5 px-3">ลงทะเบียน / ยกเลิกการลงทะเบียน</th>
                    <th className="py-2.5 px-3 text-right">จัดการทีม</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredCheckinRegs.map((reg, idx) => {
                    const sch = schools.find((s) => s.id === reg.schoolId);
                    const metaApproved = Boolean(evalMeta[`${reg.competitionId}__${reg.level}`]?.approved);
                    const isAbsent = Boolean(absentRegs[reg.id]);
                    const isCheckedIn = !isAbsent && Boolean(checkIns[reg.id]?.checkedIn);
                    const checkedRecord = checkIns[reg.id];

                    return (
                      <tr key={reg.id} className={isAbsent ? 'bg-rose-50/30' : 'hover:bg-slate-50/60'}>
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800">{sch?.name || '-'}</div>
                          <div className="text-[11px] font-semibold text-indigo-700 mt-0.5">{reg.level}</div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-medium text-slate-800">
                            {reg.students.map((st) => st.name).join(', ') || '-'}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            ครู: {reg.coaches.map((c) => (typeof c === 'string' ? c : c.name)).join(', ') || '-'}
                          </div>
                          {selectedComp.requiresSongs && (
                            <div className="text-[11px] text-amber-700 mt-0.5">
                              คัดเลือก: {reg.qualifyingSong || '-'} • ตัดสิน: {reg.finalSong || '-'}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {isAbsent ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 px-2.5 py-0.5 text-[11px] font-bold">
                              <UserX className="w-3 h-3" />
                              <span>ไม่เข้าร่วมแข่งขัน</span>
                            </span>
                          ) : isCheckedIn ? (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>ลงทะเบียนแล้ว</span>
                              </span>
                              {checkedRecord?.updatedBy && (
                                <div className="text-[10px] text-slate-500 mt-0.5">โดย {checkedRecord.updatedBy}</div>
                              )}
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 px-2.5 py-0.5 text-[11px] font-bold">
                              <Clock className="w-3 h-3" />
                              <span>รอลงทะเบียน</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleCompCheckinStatus(reg, 'checked_in')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border cursor-pointer ${
                                isCheckedIn
                                  ? 'bg-emerald-600 text-white border-emerald-600'
                                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              }`}
                            >
                              ลงทะเบียนเข้าร่วม
                            </button>
                            {(isCheckedIn || isAbsent) && (
                              <button
                                type="button"
                                onClick={() => handleCompCheckinStatus(reg, 'pending')}
                                className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 cursor-pointer"
                              >
                                ยกเลิกการลงทะเบียน
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={metaApproved}
                              onClick={() => handleCompCheckinStatus(reg, 'absent')}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border ${
                                metaApproved
                                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                  : isAbsent
                                  ? 'bg-rose-600 text-white border-rose-600 cursor-pointer'
                                  : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 cursor-pointer'
                              }`}
                            >
                              ไม่เข้าร่วม
                            </button>
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => startEditCompManageReg(reg)}
                              className="p-1.5 rounded-lg bg-sky-50 text-sky-700 hover:bg-sky-100 cursor-pointer"
                              aria-label="แก้ไขทีม"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {confirmDeleteRegId === reg.id ? (
                              <div className="inline-flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRegistration(reg.id)}
                                  className="px-2 py-1 rounded-lg bg-rose-600 text-white text-[11px] font-bold cursor-pointer"
                                >
                                  ยืนยันยกเลิกทีม
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteRegId(null)}
                                  className="px-2 py-1 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-bold cursor-pointer"
                                >
                                  กลับ
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteRegId(reg.id)}
                                className="px-2 py-1 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1"
                                aria-label="ยกเลิกการลงทะเบียนทีม"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>ถอนทีม</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderAdminCompetitionManagePage = () => {
    if (authSession.role !== 'admin' && authSession.role !== 'manager') {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <ShieldCheck className="w-8 h-8 text-rose-500 mx-auto" />
          <div className="font-bold text-slate-800">เมนูนี้สำหรับผู้ดูแลระบบหรือผู้จัดการแข่งขันเท่านั้น</div>
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

    const handleAddOrUpdateCriterion = async (e: React.FormEvent) => {
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

      let nextList: CriterionItem[];
      let successMsg: string;
      if (editingCriterionIdx !== null && baseList[editingCriterionIdx]) {
        const existingKey = baseList[editingCriterionIdx].key;
        baseList[editingCriterionIdx] = {
          key: existingKey,
          label: trimmedLabel,
          max: numericMax,
          maxLabel: `${numericMax} คะแนน`
        };
        nextList = baseList;
        successMsg = `แก้ไขเกณฑ์การตัดสินของ "${selectedComp.name}" เรียบร้อยแล้ว`;
      } else {
        nextList = [
          ...baseList,
          {
            key: `crit_${selectedComp.id}_${Date.now()}_${baseList.length + 1}`,
            label: trimmedLabel,
            max: numericMax,
            maxLabel: `${numericMax} คะแนน`
          }
        ];
        successMsg = `เพิ่มเกณฑ์การตัดสินใน "${selectedComp.name}" เรียบร้อยแล้ว`;
      }

      try {
        await appApiCall('/criteria/save', { competitionId: selectedComp.id, criteria: nextList });
        setEditingCriterionIdx(null);
        setNewCriterionLabel('');
        setNewCriterionMax('10');
        showToast(successMsg);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกเกณฑ์การตัดสินได้', 'error');
      }
    };

    const handleStartEditCriterion = (idx: number) => {
      const target = activeCriteriaList[idx];
      if (!target) return;
      setEditingCriterionIdx(idx);
      setNewCriterionLabel(target.label);
      setNewCriterionMax(String(target.max));
    };

    const handleDeleteCriterion = async (idx: number) => {
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
      try {
        await appApiCall('/criteria/save', { competitionId: selectedComp.id, criteria: filtered });
        if (editingCriterionIdx === idx) {
          setEditingCriterionIdx(null);
          setNewCriterionLabel('');
          setNewCriterionMax('10');
        }
        showToast('ลบเกณฑ์การตัดสินเรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถลบเกณฑ์การตัดสินได้', 'error');
      }
    };

    const handleResetDefaultCriteria = async () => {
      try {
        await appApiCall('/criteria/reset', { competitionId: selectedComp.id });
        setEditingCriterionIdx(null);
        setNewCriterionLabel('');
        setNewCriterionMax('10');
        showToast(`คืนค่าเกณฑ์เริ่มต้นของ "${selectedComp.name}" เรียบร้อยแล้ว`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถคืนค่าเกณฑ์เริ่มต้นได้', 'error');
      }
    };

    const isTwoRoundSelected = isTwoRoundCompetition(selectedComp.id);

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
                จัดการใบลงทะเบียน ใบลงคะแนนรายบุคคล ใบลงคะแนนรวมของกรรมการทั้งหมด และกำหนดเกณฑ์การตัดสิน
              </p>
            </div>

            {adminCompManageTab === 'sheets' && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleDownloadRegistrationSheetPdf(selectedComp.id, adminCompManageLevel)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white px-3.5 py-2 text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
                >
                  <FileDown className="w-4 h-4" />
                  <span>โหลดใบลงทะเบียน (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadScoreSheetPdf(selectedComp.id, adminCompManageLevel)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white px-3.5 py-2 text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>ใบลงคะแนนรายกรรมการ (PDF)</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadCombinedJudgeScoreSheetPdf(selectedComp.id, adminCompManageLevel)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-700 to-cyan-700 hover:opacity-95 text-white px-3.5 py-2 text-xs sm:text-sm font-bold shadow-sm cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>ใบลงคะแนนรวมของกรรมการทั้งหมด (PDF)</span>
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
                  const nextCompId = e.target.value;
                  setAdminCompManageId(nextCompId);
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
                        <span>ใบลงคะแนนรายกรรมการ (PDF)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadCombinedJudgeScoreSheetPdf(selectedComp.id, lvl)}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-teal-900/90 hover:bg-teal-950 text-white px-3 py-1.5 text-xs font-bold shadow-sm cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-teal-300" />
                        <span>ใบลงคะแนนรวมกรรมการ (PDF)</span>
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
                            <th className="py-2.5 px-3">รายงานตัว</th>
                            <th className="py-2.5 px-3 text-right">
                              {isTwoRoundSelected ? 'คะแนนล่าสุด (คัดเลือก/ตัดสิน)' : 'คะแนนปัจจุบัน'}
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {levelRegs.map((reg, idx) => {
                            const sch = schools.find((s) => s.id === reg.schoolId);
                            const isAbsent = Boolean(absentRegs[reg.id]);
                            const isCheckedIn = !isAbsent && Boolean(checkIns[reg.id]?.checkedIn);
                            const rankedEntry = buildCompetitionRankedList(
                              selectedComp.id,
                              reg.level,
                              registrations,
                              scores,
                              roundScores,
                              absentRegs,
                              recusedJudges
                            ).find((entry) => entry.reg.id === reg.id);
                            const roundInfo =
                              rankedEntry?.roundInfo ||
                              getRegRoundBreakdown(selectedComp.id, reg.id, scores, roundScores, recusedJudges);
                            const hasScore = !isAbsent && Boolean(rankedEntry?.hasScore);
                            const displayScore = rankedEntry?.score || 0;
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
                                <td className="py-2.5 px-3">
                                  {isAbsent ? (
                                    <span className="text-[11px] font-bold text-rose-600">ไม่เข้าร่วม</span>
                                  ) : isCheckedIn ? (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[11px] font-bold">
                                      รายงานตัวแล้ว
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 text-slate-600 px-2 py-0.5 text-[11px] font-semibold">
                                      รอรายงานตัว
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-right font-bold text-emerald-700">
                                  {isAbsent ? (
                                    <span className="text-xs font-bold text-rose-600">ไม่เข้าร่วมแข่งขัน</span>
                                  ) : hasScore ? (
                                    <div>
                                      <div>{displayScore.toFixed(2)} คะแนน</div>
                                      {roundInfo.isTwoRound && roundInfo.activeRoundLabel && (
                                        <div className="text-[10px] font-semibold text-amber-700 mt-0.5">
                                          ประกาศล่าสุด: {rankedEntry?.roundGroup === 'qualifying_rest' ? 'รอบคัดเลือก (ไม่เข้าเกณฑ์ 1–10)' : roundInfo.activeRoundLabel}
                                          {roundInfo.qualifyingCalc.judgeCount > 0 ? ` • คัดเลือก ${roundInfo.qualifyingCalc.average100.toFixed(2)}` : ''}
                                          {rankedEntry?.roundGroup === 'final_top10' && roundInfo.finalCalc.judgeCount > 0 ? ` • ตัดสิน ${roundInfo.finalCalc.average100.toFixed(2)}` : ''}
                                        </div>
                                      )}
                                    </div>
                                  ) : (
                                    'รอคะแนน'
                                  )}
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

        {/* Sub-menu: กำหนดเกณฑ์การตัดสิน (เพิ่มเติม / แก้ไข / ลบ / คืนค่าเริ่มต้น) */}
        {adminCompManageTab === 'criteria' && (
          <div className="space-y-5">
            <div className="rounded-2xl bg-white p-6 shadow-sm border border-emerald-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
                    <SlidersHorizontal className="w-5 h-5 text-emerald-600" />
                    <span>เกณฑ์การตัดสิน — {selectedComp.name}</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    สามารถเพิ่มเติม แก้ไข หรือลบหัวข้อเกณฑ์การให้คะแนนของกิจกรรมนี้ได้ (ใช้ร่วมกับหน้าลงคะแนนกรรมการและใบลงคะแนน)
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-1.5 text-xs font-extrabold text-emerald-800">
                    คะแนนรวมทั้งหมด: {activeCriteriaTotal} คะแนน
                  </span>
                  <button
                    type="button"
                    onClick={handleResetDefaultCriteria}
                    className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 text-xs font-bold cursor-pointer"
                  >
                    คืนค่าเกณฑ์เริ่มต้น
                  </button>
                </div>
              </div>

              {selectedComp.id === 'comp-7' && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-amber-800">
                  กิจกรรมตอบปัญหาธรรมะโดยปกติให้คะแนนตามจำนวนข้อสอบที่ตอบถูกต้อง (เต็ม 100 ข้อ/คะแนน) แต่ยังสามารถเพิ่มเกณฑ์ย่อยได้หากต้องการ
                </div>
              )}

              <form onSubmit={handleAddOrUpdateCriterion} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50/70 border border-slate-200/80 rounded-2xl p-4">
                <div className="md:col-span-6">
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    {editingCriterionIdx !== null ? `แก้ไขชื่อเกณฑ์ (ข้อที่ ${editingCriterionIdx + 1}) *` : 'ชื่อหัวข้อเกณฑ์การตัดสินใหม่ *'}
                  </label>
                  <input
                    type="text"
                    value={newCriterionLabel}
                    onChange={(e) => setNewCriterionLabel(e.target.value)}
                    placeholder="เช่น น้ำเสียงและความชัดเจน, เนื้อหาสอดคล้องธรรมะ"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-xs font-bold text-slate-600 mb-1">คะแนนเต็ม *</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step="1"
                    value={newCriterionMax}
                    onChange={(e) => setNewCriterionMax(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-3 flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 text-sm shadow-sm cursor-pointer"
                  >
                    {editingCriterionIdx !== null ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    <span>{editingCriterionIdx !== null ? 'บันทึกการแก้ไข' : 'เพิ่มเกณฑ์'}</span>
                  </button>
                  {editingCriterionIdx !== null && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCriterionIdx(null);
                        setNewCriterionLabel('');
                        setNewCriterionMax('10');
                      }}
                      className="rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 px-3 py-2.5 text-xs font-bold cursor-pointer"
                    >
                      ยกเลิก
                    </button>
                  )}
                </div>
              </form>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <th className="py-2.5 px-3 w-14 text-center">ลำดับ</th>
                      <th className="py-2.5 px-3">หัวข้อเกณฑ์การตัดสิน</th>
                      <th className="py-2.5 px-3 w-36 text-center">คะแนนเต็ม</th>
                      <th className="py-2.5 px-3 w-36 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {activeCriteriaList.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-slate-400">
                          ยังไม่มีเกณฑ์ย่อยสำหรับกิจกรรมนี้ สามารถเพิ่มเกณฑ์ด้านบนได้
                        </td>
                      </tr>
                    ) : (
                      activeCriteriaList.map((crit, idx) => (
                        <tr
                          key={crit.key}
                          className={editingCriterionIdx === idx ? 'bg-emerald-50/70' : 'hover:bg-slate-50/60'}
                        >
                          <td className="py-3 px-3 text-center font-bold text-slate-700">{idx + 1}</td>
                          <td className="py-3 px-3 font-semibold text-slate-800">{crit.label}</td>
                          <td className="py-3 px-3 text-center font-extrabold text-emerald-700">
                            {crit.max} คะแนน
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEditCriterion(idx)}
                                className="inline-flex items-center gap-1 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 px-2.5 py-1 text-xs font-bold cursor-pointer"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>แก้ไข</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteCriterion(idx)}
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 px-2.5 py-1 text-xs font-bold cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>ลบ</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderScoreEntryPage = () => {
    if (authSession.role !== 'admin' && authSession.role !== 'manager') {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <ShieldCheck className="w-8 h-8 text-rose-500 mx-auto" />
          <div className="font-bold text-slate-800">
            เมนูนี้สำหรับผู้ดูแลระบบหรือผู้จัดการแข่งขันเท่านั้น
          </div>
        </div>
      );
    }

    const selectedComp = COMPETITIONS.find((c) => c.id === scoreEntryCompId) || COMPETITIONS[0];
    const resolvedLevel = selectedComp.levels.includes(scoreEntryLevel)
      ? scoreEntryLevel
      : selectedComp.levels[0];
    const isTwoRound = isTwoRoundCompetition(selectedComp.id);
    const metaKey = `${selectedComp.id}__${resolvedLevel}`;
    const currentMeta = evalMeta[metaKey] || { status: 'pending', approved: false };
    const isApproved = Boolean(currentMeta.approved);

    const assignedJudges = judges.filter(
      (j) =>
        j.competitionId === selectedComp.id &&
        String(j.level || '').trim() === resolvedLevel.trim()
    );
    const levelRegs = registrations.filter(
      (r) =>
        r.competitionId === selectedComp.id &&
        String(r.level || '').trim() === resolvedLevel.trim()
    );
    const activeRegs = levelRegs.filter((r) => !absentRegs[r.id]);
    const absentCount = levelRegs.length - activeRegs.length;

    const rankedList = isTwoRound
      ? buildCompetitionRankedList(
          selectedComp.id,
          resolvedLevel,
          registrations,
          scores,
          roundScores,
          absentRegs,
          recusedJudges
        )
      : [];
    const qualRankByRegId: Record<string, number> = {};
    rankedList.forEach((e) => {
      if (e.qualifyingRank !== null) qualRankByRegId[e.reg.id] = e.qualifyingRank;
    });

    const getStoredJudgeScore = (regId: string, judgeId: string): number | undefined => {
      if (isTwoRound) {
        const rs = roundScores[regId] || {};
        const hasRoundStore = Boolean(roundScores[regId]);
        return scoreEntryRound === 'final'
          ? rs.final?.[judgeId]
          : rs.qualifying?.[judgeId] ?? (!hasRoundStore ? scores[regId]?.[judgeId] : undefined);
      }
      return scores[regId]?.[judgeId];
    };

    const getDraftValue = (regId: string, judgeId: string): string => {
      if (
        scoreEntryDraft[regId] &&
        Object.prototype.hasOwnProperty.call(scoreEntryDraft[regId], judgeId)
      ) {
        return scoreEntryDraft[regId][judgeId];
      }
      const stored = getStoredJudgeScore(regId, judgeId);
      return stored !== undefined && stored !== null ? String(stored) : '';
    };

    const setDraftCell = (regId: string, judgeId: string, val: string) => {
      setScoreEntryDraft((prev) => ({
        ...prev,
        [regId]: {
          ...(prev[regId] || {}),
          [judgeId]: val
        }
      }));
    };

    const handleSaveScoreRows = async (targetRegs: RegistrationItem[]) => {
      if (isApproved) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถบันทึกหรือแก้ไขคะแนนได้', 'error');
        return;
      }
      const entries = targetRegs.map((reg) => {
        const judgeScoresPayload: Record<string, string | number> = {};
        assignedJudges.forEach((j) => {
          if (recusedJudges[reg.id]?.[j.id]) return;
          const raw = getDraftValue(reg.id, j.id).trim();
          if (raw === '') {
            judgeScoresPayload[j.id] = '';
          } else {
            const num = Number(raw);
            if (!Number.isFinite(num) || num < 0 || num > 100) {
              throw new Error(`คะแนนต้องอยู่ระหว่าง 0 - 100 (${j.name})`);
            }
            judgeScoresPayload[j.id] = num;
          }
        });
        return { registrationId: reg.id, judgeScores: judgeScoresPayload };
      });

      const res = await appApiCall('/admin/scores/save', {
        competitionId: selectedComp.id,
        level: resolvedLevel,
        round: isTwoRound ? scoreEntryRound : undefined,
        entries
      });
      setScoreEntryDraft((prev) => {
        const next = { ...prev };
        targetRegs.forEach((r) => {
          delete next[r.id];
        });
        return next;
      });
      showToast(res.message || 'บันทึกผลคะแนนการแข่งขันเรียบร้อยแล้ว');
    };

    const handleSaveSingleRow = async (reg: RegistrationItem) => {
      try {
        await handleSaveScoreRows([reg]);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกผลคะแนนได้', 'error');
      }
    };

    const handleSaveAllRows = async () => {
      try {
        await handleSaveScoreRows(activeRegs);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกผลคะแนนทั้งหมดได้', 'error');
      }
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Edit3 className="w-6 h-6 text-emerald-600" />
                <span>บันทึกผลคะแนนการแข่งขัน (รายทีม แยกตามกรรมการ)</span>
              </h2>
              <p className="text-sm text-slate-500 mt-1">
                ผู้ดูแลระบบและผู้จัดการแข่งขันสามารถบันทึกหรือแก้ไขคะแนนรายทีมตามจำนวนกรรมการที่แต่งตั้งได้ จนกว่าจะอนุมัติผลการแข่งขัน
              </p>
            </div>

            <button
              type="button"
              disabled={isApproved || assignedJudges.length === 0 || activeRegs.length === 0}
              onClick={handleSaveAllRows}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition ${
                isApproved || assignedJudges.length === 0 || activeRegs.length === 0
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white cursor-pointer'
              }`}
            >
              <Check className="w-4 h-4" />
              <span>บันทึกผลคะแนนทั้งหมด</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">เลือกกิจกรรมการแข่งขัน</label>
              <select
                value={selectedComp.id}
                onChange={(e) => {
                  const nextComp = COMPETITIONS.find((c) => c.id === e.target.value) || COMPETITIONS[0];
                  setScoreEntryCompId(nextComp.id);
                  setScoreEntryLevel(nextComp.levels[0]);
                  setScoreEntryRound('qualifying');
                  setScoreEntryDraft({});
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-emerald-500"
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
                value={resolvedLevel}
                onChange={(e) => {
                  setScoreEntryLevel(e.target.value);
                  setScoreEntryDraft({});
                }}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-emerald-500"
              >
                {selectedComp.levels.map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {lvl}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isTwoRound && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs font-bold text-slate-600 mr-1">รอบการบันทึกคะแนน:</span>
              <button
                type="button"
                onClick={() => {
                  setScoreEntryRound('qualifying');
                  setScoreEntryDraft({});
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  scoreEntryRound === 'qualifying'
                    ? 'bg-amber-500 text-white border-amber-500 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                รอบที่ 1: รอบคัดเลือก
              </button>
              <button
                type="button"
                onClick={() => {
                  setScoreEntryRound('final');
                  setScoreEntryDraft({});
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                  scoreEntryRound === 'final'
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                รอบที่ 2: รอบตัดสิน (ลำดับ 1–10)
              </button>
            </div>
          )}

          {isApproved && (
            <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs sm:text-sm font-bold text-emerald-800 flex items-center gap-2">
              <Lock className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>ผู้ดูแลระบบอนุมัติผลการแข่งขันรายการนี้แล้ว ระบบล็อกการบันทึกและแก้ไขคะแนน</span>
            </div>
          )}

          {currentMeta.judgeCompleted && !isApproved && (
            <div className="rounded-xl bg-teal-50 border border-teal-200 px-4 py-3 text-xs font-bold text-teal-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
              <span>
                ประธานกรรมการแจ้งการตัดสินเสร็จสมบูรณ์แล้ว{currentMeta.judgeCompletedBy ? ` (โดย ${currentMeta.judgeCompletedBy})` : ''} — รอผู้ดูแลระบบอนุมัติผล
              </span>
            </div>
          )}
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
            <div>
              ทีมที่เข้าร่วมบันทึกคะแนน: <strong>{activeRegs.length}</strong> ทีม
              {absentCount > 0 && (
                <span className="ml-2 text-rose-600 font-semibold">(งดคิดคะแนน/ไม่เข้าร่วม {absentCount} ทีม)</span>
              )}
            </div>
            <div>
              กรรมการประจำกิจกรรม/ระดับนี้: <strong>{assignedJudges.length}</strong> ท่าน
            </div>
          </div>

          {assignedJudges.length === 0 ? (
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-6 text-center text-sm text-amber-800 font-semibold">
              ยังไม่มีรายชื่อกรรมการตัดสินในกิจกรรมและระดับชั้นนี้ กรุณาเพิ่มกรรมการที่เมนู "จัดการระบบ (Admin)" ก่อนบันทึกคะแนน
            </div>
          ) : activeRegs.length === 0 ? (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-6 text-center text-sm text-slate-500">
              ยังไม่มีทีมผู้เข้าแข่งขัน (หรือถูกแจ้งไม่เข้าร่วมทั้งหมด) ในกิจกรรมและระดับชั้นนี้
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-700 border-b border-slate-200">
                    <th className="py-3 px-3 w-12 text-center">ที่</th>
                    <th className="py-3 px-3 min-w-[180px]">โรงเรียน / ผู้เข้าแข่งขัน</th>
                    {assignedJudges.map((j, jIdx) => (
                      <th key={j.id} className="py-3 px-2.5 min-w-[125px] text-center">
                        <div className="font-bold text-slate-800">กรรมการ {jIdx + 1}</div>
                        <div className="text-[11px] font-medium text-slate-500 truncate max-w-[130px] mx-auto" title={j.name}>
                          {j.name}
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-3 w-24 text-center">คะแนนเฉลี่ย</th>
                    <th className="py-3 px-3 w-28 text-right">บันทึก</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeRegs.map((reg, idx) => {
                    const sch = schools.find((s) => s.id === reg.schoolId);
                    const isCheckedIn = Boolean(checkIns[reg.id]?.checkedIn);
                    const qRank = qualRankByRegId[reg.id];
                    let validSum = 0;
                    let validCount = 0;
                    assignedJudges.forEach((j) => {
                      if (recusedJudges[reg.id]?.[j.id]) return;
                      const vStr = getDraftValue(reg.id, j.id).trim();
                      if (vStr !== '') {
                        const n = Number(vStr);
                        if (Number.isFinite(n)) {
                          validSum += n;
                          validCount += 1;
                        }
                      }
                    });
                    const avgDisplay = validCount > 0 ? (validSum / validCount).toFixed(2) : '-';

                    return (
                      <tr key={reg.id} className="hover:bg-slate-50/70">
                        <td className="py-3 px-3 text-center font-bold text-slate-700">{idx + 1}</td>
                        <td className="py-3 px-3">
                          <div className="font-bold text-slate-800 flex flex-wrap items-center gap-1.5">
                            <span>{sch?.name || '-'}</span>
                            {isCheckedIn ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">รายงานตัวแล้ว</span>
                            ) : (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">ยังไม่รายงานตัว</span>
                            )}
                            {isTwoRound && qRank && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                                คัดเลือก #{qRank}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-600 mt-0.5">
                            {reg.students.map((st) => st.name).join(', ') || '-'}
                          </div>
                        </td>
                        {assignedJudges.map((j) => {
                          const isRecused = Boolean(recusedJudges[reg.id]?.[j.id]);
                          return (
                            <td key={j.id} className="py-3 px-2.5 text-center">
                              {isRecused ? (
                                <span className="inline-block rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-2 py-1 text-[11px] font-bold">
                                  งดเว้น (โรงเรียนตน)
                                </span>
                              ) : (
                                <input
                                  type="number"
                                  min={0}
                                  max={100}
                                  step="0.01"
                                  disabled={isApproved}
                                  value={getDraftValue(reg.id, j.id)}
                                  onChange={(e) => setDraftCell(reg.id, j.id, e.target.value)}
                                  placeholder="0-100"
                                  className={`w-24 rounded-xl border px-2.5 py-1.5 text-center text-sm font-bold outline-none ${
                                    isApproved
                                      ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                      : 'bg-white border-slate-200 focus:border-emerald-500'
                                  }`}
                                />
                              )}
                            </td>
                          );
                        })}
                        <td className="py-3 px-3 text-center font-extrabold text-emerald-700 tabular-nums">
                          {avgDisplay}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            disabled={isApproved}
                            onClick={() => handleSaveSingleRow(reg)}
                            className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold ${
                              isApproved
                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>บันทึก</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
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

    const handleSaveSchoolAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!adminSchoolForm.schoolCode.trim() || !adminSchoolForm.name.trim()) {
        showToast('กรุณากรอกรหัสสถานศึกษาและชื่อโรงเรียนให้ครบถ้วน', 'error');
        return;
      }
      if (!adminSchoolForm.id && !adminSchoolForm.password.trim()) {
        showToast('กรุณากำหนดรหัสผ่านสำหรับโรงเรียนใหม่', 'error');
        return;
      }
      try {
        const res = await appApiCall('/admin/schools/save', {
          id: adminSchoolForm.id || undefined,
          schoolCode: adminSchoolForm.schoolCode.trim(),
          name: adminSchoolForm.name.trim(),
          director: adminSchoolForm.director.trim() || '-',
          phone: adminSchoolForm.phone.trim() || '-',
          password: adminSchoolForm.password.trim()
        });
        setAdminSchoolForm({ id: null, schoolCode: '', password: '', name: '', director: '', phone: '' });
        showToast(res.message || 'บันทึกข้อมูลโรงเรียนเรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลโรงเรียนได้', 'error');
      }
    };

    const handleDeleteSchoolAdmin = async (schoolId: string) => {
      try {
        const res = await appApiCall('/admin/schools/delete', { id: schoolId });
        showToast(res.message || 'ลบโรงเรียนเรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถลบโรงเรียนได้', 'error');
      }
    };

    const handleSaveJudgeAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!adminJudgeForm.username.trim() || !adminJudgeForm.name.trim()) {
        showToast('กรุณากรอก Username และชื่อ-นามสกุลกรรมการให้ครบถ้วน', 'error');
        return;
      }
      if (!adminJudgeForm.id && !adminJudgeForm.password.trim()) {
        showToast('กรุณากำหนดรหัสผ่านสำหรับกรรมการใหม่', 'error');
        return;
      }
      try {
        const res = await appApiCall('/admin/judges/save', {
          id: adminJudgeForm.id || undefined,
          username: adminJudgeForm.username.trim(),
          password: adminJudgeForm.password.trim(),
          name: adminJudgeForm.name.trim(),
          position: adminJudgeForm.position.trim() || 'กรรมการตัดสิน',
          competitionId: adminJudgeForm.competitionId,
          level: adminJudgeForm.level,
          schoolId: adminJudgeForm.schoolId || '',
          photoUrl: adminJudgeForm.photoUrl
        });
        setAdminJudgeForm({
          id: null,
          username: '',
          password: '',
          name: '',
          position: 'กรรมการตัดสิน',
          competitionId: COMPETITIONS[0].id,
          level: COMPETITIONS[0].levels[0],
          schoolId: '',
          photoUrl: ''
        });
        showToast(res.message || 'บันทึกข้อมูลกรรมการเรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลกรรมการได้', 'error');
      }
    };

    const handleDeleteJudgeAdmin = async (judgeId: string) => {
      try {
        const res = await appApiCall('/admin/judges/delete', { id: judgeId });
        showToast(res.message || 'ลบข้อมูลกรรมการเรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถลบข้อมูลกรรมการได้', 'error');
      }
    };

    const handleJudgePhotoAdminUpload = async (file?: File) => {
      if (!file) return;
      const uploadedUrl = await uploadImageToServer(file, 'judges', 600, 0.85);
      if (!uploadedUrl) return;
      setAdminJudgeForm((p) => ({ ...p, photoUrl: uploadedUrl }));
    };

    const handleSaveManagerAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!adminManagerForm.username.trim() || !adminManagerForm.name.trim()) {
        showToast('กรุณากรอก Username และชื่อ-นามสกุลผู้จัดการแข่งขันให้ครบถ้วน', 'error');
        return;
      }
      if (!adminManagerForm.id && adminManagerForm.password.trim().length < 4) {
        showToast('กรุณากำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษรสำหรับผู้จัดการแข่งขันใหม่', 'error');
        return;
      }
      if (adminManagerForm.id && adminManagerForm.password.trim() && adminManagerForm.password.trim().length < 4) {
        showToast('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
        return;
      }
      try {
        const res = await appApiCall('/admin/managers/save', {
          id: adminManagerForm.id || undefined,
          username: adminManagerForm.username.trim(),
          password: adminManagerForm.password.trim(),
          name: adminManagerForm.name.trim(),
          phone: adminManagerForm.phone.trim() || '-'
        });
        setAdminManagerForm({ id: null, username: '', password: '', name: '', phone: '' });
        showToast(res.message || 'บันทึกข้อมูลผู้จัดการแข่งขันเรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลผู้จัดการแข่งขันได้', 'error');
      }
    };

    const handleDeleteManagerAdmin = async (managerId: string) => {
      try {
        const res = await appApiCall('/admin/managers/delete', { id: managerId });
        showToast(res.message || 'ลบผู้จัดการแข่งขันเรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถลบผู้จัดการแข่งขันได้', 'error');
      }
    };

    const handleSaveRegistrarAdmin = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!adminRegistrarForm.username.trim() || !adminRegistrarForm.name.trim()) {
        showToast('กรุณากรอก Username และชื่อ-นามสกุลเจ้าหน้าที่ลงทะเบียนให้ครบถ้วน', 'error');
        return;
      }
      if (!adminRegistrarForm.id && adminRegistrarForm.password.trim().length < 4) {
        showToast('กรุณากำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษรสำหรับเจ้าหน้าที่ลงทะเบียนใหม่', 'error');
        return;
      }
      if (adminRegistrarForm.id && adminRegistrarForm.password.trim() && adminRegistrarForm.password.trim().length < 4) {
        showToast('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
        return;
      }
      try {
        const res = await appApiCall('/admin/registrars/save', {
          id: adminRegistrarForm.id || undefined,
          username: adminRegistrarForm.username.trim(),
          password: adminRegistrarForm.password.trim(),
          name: adminRegistrarForm.name.trim(),
          phone: adminRegistrarForm.phone.trim() || '-'
        });
        setAdminRegistrarForm({ id: null, username: '', password: '', name: '', phone: '' });
        showToast(res.message || 'บันทึกข้อมูลเจ้าหน้าที่ลงทะเบียนเรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกข้อมูลเจ้าหน้าที่ลงทะเบียนได้', 'error');
      }
    };

    const handleDeleteRegistrarAdmin = async (registrarId: string) => {
      try {
        const res = await appApiCall('/admin/registrars/delete', { id: registrarId });
        showToast(res.message || 'ลบเจ้าหน้าที่ลงทะเบียนเรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถลบเจ้าหน้าที่ลงทะเบียนได้', 'error');
      }
    };

    const handleBgFileUpload = async (
      file: File | undefined,
      bgKey: BackgroundKey,
      _setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
      if (!file) return;
      setIsUploadingImage(true);
      try {
        const maxDim = bgKey === 'bannerBgUrl' ? 1920 : 1600;
        const compressed = await compressImageFile(file, maxDim, 0.85);
        if (!compressed || !compressed.startsWith('data:image/')) {
          showToast('ไม่สามารถใช้งานไฟล์รูปภาพนี้ได้ กรุณาเลือกไฟล์ PNG, JPG หรือ WebP', 'error');
          return;
        }
        const res = await appApiCall('/admin/backgrounds', { key: bgKey, dataUrl: compressed });
        showToast(res.message || 'บันทึกภาพพื้นหลังลงบนเซิร์ฟเวอร์เรียบร้อยแล้ว');
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการอัปโหลดภาพพื้นหลัง', 'error');
      } finally {
        setIsUploadingImage(false);
      }
    };

    const handleBgFileRemove = async (
      bgKey: BackgroundKey,
      _setter: React.Dispatch<React.SetStateAction<string>>,
      message: string
    ) => {
      try {
        await appApiCall('/admin/backgrounds', { key: bgKey, dataUrl: '' });
        showToast(message);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถลบรูปภาพพื้นหลังได้', 'error');
      }
    };

    const selectedJudgeComp = COMPETITIONS.find((c) => c.id === adminJudgeForm.competitionId) || COMPETITIONS[0];

    const controllableMenus = [
      { id: 'student-card', label: 'พิมพ์บัตรผู้เข้าแข่งขัน' },
      { id: 'coach-card', label: 'พิมพ์บัตรครูผู้ฝึกสอน' },
      { id: 'judge-card', label: 'พิมพ์บัตรกรรมการตัดสิน' },
      { id: 'judge-cert', label: 'เกียรติบัตรกรรมการ' },
      { id: 'school-cert', label: 'เกียรติบัตรนักเรียน/ครู/ผอ.' },
      { id: 'school-results', label: 'ผลคะแนนของโรงเรียนและสรุปเหรียญรางวัล' },
      { id: 'results', label: 'ประกาศผลคะแนน' }
    ];

    const toggleMenuPermission = async (menuId: string, label: string) => {
      const nextOpen = !menuPermissions[menuId];
      try {
        await appApiCall('/admin/settings', {
          menuPermissions: { ...menuPermissions, [menuId]: nextOpen }
        });
        showToast(`${nextOpen ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}เมนู "${label}" เรียบร้อยแล้ว`);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกการตั้งค่าเมนูได้', 'error');
      }
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
                onClick={async () => {
                  try {
                    await appApiCall('/admin/settings', {
                      menuPermissions: {
                        'student-card': true,
                        'coach-card': true,
                        'judge-card': true,
                        'judge-cert': true,
                        'school-cert': true,
                        'school-results': true,
                        'results': true
                      }
                    });
                    showToast('เปิดใช้งานทุกเมนูเรียบร้อยแล้ว');
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'บันทึกการตั้งค่าไม่สำเร็จ', 'error');
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200 cursor-pointer"
              >
                เปิดทุกเมนู
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await appApiCall('/admin/settings', {
                      menuPermissions: {
                        'student-card': false,
                        'coach-card': false,
                        'judge-card': false,
                        'judge-cert': false,
                        'school-cert': false,
                        'school-results': false,
                        'results': false
                      }
                    });
                    showToast('ปิดใช้งานเมนูทั้งหมดชั่วคราวเรียบร้อยแล้ว');
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'บันทึกการตั้งค่าไม่สำเร็จ', 'error');
                  }
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
                    onClick={() => void toggleMenuPermission(m.id, m.label)}
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
                onClick={async () => {
                  const nextOpen = !registrationOpen;
                  try {
                    await appApiCall('/admin/settings', { registrationOpen: nextOpen });
                    showToast(nextOpen ? 'เปิดรับสมัครแข่งขันแล้ว' : 'ปิดรับสมัครแข่งขันแล้ว');
                  } catch (err) {
                    showToast(err instanceof Error ? err.message : 'บันทึกสถานะรับสมัครไม่สำเร็จ', 'error');
                  }
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
                    disabled={isUploadingImage}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.currentTarget.value = '';
                      void handleBgFileUpload(f, 'bannerBgUrl', setBannerBgUrl);
                    }}
                  />
                </label>
                {bannerBgUrl ? (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-sky-200 bg-sky-50/40 px-2.5 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={bannerBgUrl} alt="ตัวอย่างแบนเนอร์" className="w-20 h-9 rounded object-contain bg-white border border-sky-200 shrink-0" />
                      <span className="text-[11px] font-semibold text-emerald-700 truncate">จัดเก็บบนเซิร์ฟเวอร์แล้ว</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleBgFileRemove('bannerBgUrl', setBannerBgUrl, 'ลบรูปภาพแบนเนอร์เรียบร้อยแล้ว')}
                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer shrink-0"
                    >
                      ลบรูปแบนเนอร์
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-500">
                    ระบบจะแสดงแบนเนอร์ตามขนาดและสัดส่วนภาพจริงอัตโนมัติ (แนะนำแนวนอน เช่น 1600×500 px)
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-amber-300 bg-amber-50/50 hover:bg-amber-50 text-xs font-bold text-amber-800 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{studentCardBgUrl ? 'เปลี่ยนพื้นหลังบัตรประจำตัวผู้เข้าแข่งขัน' : 'พื้นหลังบัตรประจำตัวผู้เข้าแข่งขัน'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingImage}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.currentTarget.value = '';
                      void handleBgFileUpload(f, 'studentCardBgUrl', setStudentCardBgUrl);
                    }}
                  />
                </label>
                {studentCardBgUrl && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50/40 px-2.5 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={safeImageUrl(studentCardBgUrl)} alt="ตัวอย่างพื้นหลังบัตรผู้เข้าแข่งขัน" className="w-8 h-10 rounded object-cover border border-amber-200 shrink-0" />
                      <span className="text-[11px] font-semibold text-emerald-700 truncate">จัดเก็บบนเซิร์ฟเวอร์แล้ว</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleBgFileRemove('studentCardBgUrl', setStudentCardBgUrl, 'ลบพื้นหลังบัตรประจำตัวผู้เข้าแข่งขันเรียบร้อยแล้ว')}
                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer shrink-0"
                    >
                      ลบรูปพื้นหลัง
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-xs font-bold text-emerald-800 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{coachCardBgUrl ? 'เปลี่ยนพื้นหลังบัตรประจำตัวครูผู้ฝึกสอน' : 'พื้นหลังบัตรประจำตัวครูผู้ฝึกสอน'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingImage}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.currentTarget.value = '';
                      void handleBgFileUpload(f, 'coachCardBgUrl', setCoachCardBgUrl);
                    }}
                  />
                </label>
                {coachCardBgUrl && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/40 px-2.5 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={safeImageUrl(coachCardBgUrl)} alt="ตัวอย่างพื้นหลังบัตรครูผู้ฝึกสอน" className="w-8 h-10 rounded object-cover border border-emerald-200 shrink-0" />
                      <span className="text-[11px] font-semibold text-emerald-700 truncate">จัดเก็บบนเซิร์ฟเวอร์แล้ว</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleBgFileRemove('coachCardBgUrl', setCoachCardBgUrl, 'ลบพื้นหลังบัตรประจำตัวครูผู้ฝึกสอนเรียบร้อยแล้ว')}
                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer shrink-0"
                    >
                      ลบรูปพื้นหลัง
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-indigo-300 bg-indigo-50/50 hover:bg-indigo-50 text-xs font-bold text-indigo-800 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{judgeCardBgUrl ? 'เปลี่ยนพื้นหลังบัตรประจำตัวกรรมการตัดสิน' : 'พื้นหลังบัตรประจำตัวกรรมการตัดสิน'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingImage}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.currentTarget.value = '';
                      void handleBgFileUpload(f, 'judgeCardBgUrl', setJudgeCardBgUrl);
                    }}
                  />
                </label>
                {judgeCardBgUrl && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-indigo-200 bg-indigo-50/40 px-2.5 py-1.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img src={safeImageUrl(judgeCardBgUrl)} alt="ตัวอย่างพื้นหลังบัตรกรรมการ" className="w-8 h-10 rounded object-cover border border-indigo-200 shrink-0" />
                      <span className="text-[11px] font-semibold text-emerald-700 truncate">จัดเก็บบนเซิร์ฟเวอร์แล้ว</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleBgFileRemove('judgeCardBgUrl', setJudgeCardBgUrl, 'ลบพื้นหลังบัตรประจำตัวกรรมการตัดสินเรียบร้อยแล้ว')}
                      className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer shrink-0"
                    >
                      ลบรูปพื้นหลัง
                    </button>
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="flex items-center justify-center gap-2 p-3 rounded-xl border border-dashed border-teal-300 bg-teal-50/50 hover:bg-teal-50 text-xs font-bold text-teal-800 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>เปลี่ยนพื้นหลังเกียรติบัตร</span>
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingImage}
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.currentTarget.value = '';
                      void handleBgFileUpload(f, 'certBgUrl', setCertBgUrl);
                    }}
                  />
                </label>
                {certBgUrl && (
                  <div className="flex items-center justify-between gap-2 rounded-lg border border-teal-200 bg-teal-50/40 px-3 py-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img src={safeImageUrl(certBgUrl)} alt="ตัวอย่างพื้นหลังเกียรติบัตร" className="w-14 h-10 rounded object-cover border border-teal-200 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-700 truncate">จัดเก็บพื้นหลังเกียรติบัตรบนเซิร์ฟเวอร์แล้ว</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleBgFileRemove('certBgUrl', setCertBgUrl, 'ลบพื้นหลังเกียรติบัตรเรียบร้อยแล้ว')}
                      className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer shrink-0"
                    >
                      ลบรูปพื้นหลังเกียรติบัตร
                    </button>
                  </div>
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
              placeholder={adminSchoolForm.id ? 'รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'รหัสผ่าน (Password)'}
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
                    <td className="py-2.5 px-3 font-mono text-emerald-700 text-xs">•••••••• (เข้ารหัสแล้ว)</td>
                    <td className="py-2.5 px-3 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => setAdminSchoolForm({ ...s, password: '' })}
                        className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 cursor-pointer"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteSchoolAdmin(s.id)}
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
            <span>จัดการระบบกรรมการตัดสินแบบเต็มรูปแบบ (กำหนด User / Password / ตำแหน่ง / กิจกรรม / ระดับ / รูปภาพ)</span>
          </h3>

          <form onSubmit={handleSaveJudgeAdmin} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Username กรรมการ"
                value={adminJudgeForm.username}
                onChange={(e) => setAdminJudgeForm((p) => ({ ...p, username: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
              />
              <input
                type="text"
                placeholder={adminJudgeForm.id ? 'Password ใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'Password กรรมการ'}
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
              <select
                value={adminJudgeForm.schoolId}
                onChange={(e) => setAdminJudgeForm((p) => ({ ...p, schoolId: e.target.value }))}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-500"
                title="ระบุสังกัดโรงเรียนของกรรมการ เพื่อรองรับการกดไม่ตัดสินลงคะแนนทีมโรงเรียนตนเอง"
              >
                <option value="">สังกัดโรงเรียน (ถ้ามี / ไม่ระบุ)</option>
                {schools.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
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
                        schoolId: '',
                        photoUrl: ''
                      })
                    }
                    className="rounded-xl bg-slate-100 text-slate-600 px-2 text-xs font-bold cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2">
              <label className="inline-flex items-center gap-2 text-xs font-bold text-sky-700 hover:text-sky-800 cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>{adminJudgeForm.photoUrl ? 'เปลี่ยนรูปถ่ายกรรมการ' : 'อัปโหลดรูปถ่ายกรรมการ (บันทึกลงเซิร์ฟเวอร์)'}</span>
                <input
                  type="file"
                  accept="image/*"
                  disabled={isUploadingImage}
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.currentTarget.value = '';
                    void handleJudgePhotoAdminUpload(f);
                  }}
                />
              </label>
              {adminJudgeForm.photoUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={safeImageUrl(adminJudgeForm.photoUrl)}
                    alt="รูปกรรมการ"
                    className="w-9 h-10 rounded-lg object-cover object-top border border-sky-200 bg-white"
                  />
                  <span className="text-xs font-semibold text-emerald-700">บันทึกรูปแล้ว</span>
                  <button
                    type="button"
                    onClick={() => setAdminJudgeForm((p) => ({ ...p, photoUrl: '' }))}
                    className="text-xs font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    ลบรูป
                  </button>
                </div>
              )}
            </div>
          </form>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-100">
                  <th className="py-2.5 px-3">User / สถานะรหัส</th>
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
                  const judgeSchool = j.schoolId ? schools.find((s) => s.id === j.schoolId) : undefined;
                  return (
                    <tr key={j.id}>
                      <td className="py-2.5 px-3 font-mono text-xs">
                        <strong>{j.username}</strong> / <span className="text-sky-700">••••••••</span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-2">
                          {j.photoUrl && (
                            <img
                              src={safeImageUrl(j.photoUrl)}
                              alt={j.name}
                              className="w-7 h-7 rounded-full object-cover object-top border border-sky-200 shrink-0"
                            />
                          )}
                          <div>
                            <div>{j.name}</div>
                            {judgeSchool && (
                              <div className="text-[11px] font-medium text-emerald-700">
                                สังกัด: {judgeSchool.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs font-bold text-indigo-700">{j.position}</td>
                      <td className="py-2.5 px-3 text-slate-700">{comp?.name}</td>
                      <td className="py-2.5 px-3 text-xs font-semibold text-amber-800">{j.level}</td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setAdminJudgeForm({ ...j, schoolId: j.schoolId || '', password: '' })}
                          className="p-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-sky-100 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteJudgeAdmin(j.id)}
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

        {/* 3.5 จัดการบัญชีผู้จัดการแข่งขัน */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="w-5 h-5 text-violet-600" />
                <span>จัดการบัญชีผู้จัดการแข่งขัน ({managers.length} ท่าน)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                ผู้จัดการแข่งขันสามารถเข้าใช้งานการจัดการแข่งขัน ลงทะเบียนเข้าร่วมแข่งขัน บันทึกผลคะแนน ประกาศผล และเอกสารต่าง ๆ ได้ (ก่อนผู้ดูแลระบบอนุมัติ)
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveManagerAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="text"
              required
              placeholder="Username *"
              value={adminManagerForm.username}
              onChange={(e) => setAdminManagerForm((p) => ({ ...p, username: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
            <input
              type="password"
              placeholder={adminManagerForm.id ? 'Password ใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'Password (อย่างน้อย 4 ตัว) *'}
              value={adminManagerForm.password}
              onChange={(e) => setAdminManagerForm((p) => ({ ...p, password: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
            <input
              type="text"
              required
              placeholder="ชื่อ-นามสกุลผู้จัดการแข่งขัน *"
              value={adminManagerForm.name}
              onChange={(e) => setAdminManagerForm((p) => ({ ...p, name: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
            <input
              type="text"
              placeholder="เบอร์โทรติดต่อ"
              value={adminManagerForm.phone}
              onChange={(e) => setAdminManagerForm((p) => ({ ...p, phone: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-sm py-2 px-3 cursor-pointer"
              >
                {adminManagerForm.id ? 'บันทึกแก้ไข' : '+ เพิ่มผู้จัดการแข่งขัน'}
              </button>
              {adminManagerForm.id && (
                <button
                  type="button"
                  onClick={() => setAdminManagerForm({ id: null, username: '', password: '', name: '', phone: '' })}
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
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2.5 px-3">เบอร์ติดต่อ</th>
                  <th className="py-2.5 px-3">สิทธิ์การใช้งาน</th>
                  <th className="py-2.5 px-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {managers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-xs text-slate-400">
                      ยังไม่มีผู้จัดการแข่งขันในระบบ (เพิ่มได้ที่แบบฟอร์มด้านบน)
                    </td>
                  </tr>
                ) : (
                  managers.map((m) => (
                    <tr key={m.id}>
                      <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-800">{m.username}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{m.name}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">{m.phone || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-violet-100 text-violet-700">
                          จัดการแข่งขัน / บันทึกผลคะแนน / รายงานตัว
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setAdminManagerForm({ ...m, password: '' })}
                          className="p-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteManagerAdmin(m.id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3.6 จัดการบัญชีเจ้าหน้าที่ลงทะเบียน (เข้าใช้ได้เฉพาะเมนู ลงทะเบียนเข้าร่วมแข่งขัน) */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ClipboardCheck className="w-5 h-5 text-indigo-600" />
                <span>จัดการบัญชีเจ้าหน้าที่ลงทะเบียน ({registrars.length} ท่าน)</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                เจ้าหน้าที่ลงทะเบียนสามารถเข้าใช้งานเมนู &quot;ลงทะเบียนเข้าร่วมแข่งขัน&quot; เพื่อเช็กชื่อรายงานตัว แจ้งไม่เข้าร่วม เพิ่ม/แก้ไขข้อมูลผู้เข้าแข่งขันได้
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveRegistrarAdmin} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <input
              type="text"
              required
              placeholder="Username *"
              value={adminRegistrarForm.username}
              onChange={(e) => setAdminRegistrarForm((p) => ({ ...p, username: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <input
              type="password"
              placeholder={adminRegistrarForm.id ? 'Password ใหม่ (เว้นว่างถ้าไม่เปลี่ยน)' : 'Password (อย่างน้อย 4 ตัว) *'}
              value={adminRegistrarForm.password}
              onChange={(e) => setAdminRegistrarForm((p) => ({ ...p, password: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              required
              placeholder="ชื่อ-นามสกุลเจ้าหน้าที่ลงทะเบียน *"
              value={adminRegistrarForm.name}
              onChange={(e) => setAdminRegistrarForm((p) => ({ ...p, name: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="เบอร์โทรติดต่อ"
              value={adminRegistrarForm.phone}
              onChange={(e) => setAdminRegistrarForm((p) => ({ ...p, phone: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="flex-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm py-2 px-3 cursor-pointer"
              >
                {adminRegistrarForm.id ? 'บันทึกแก้ไข' : '+ เพิ่มเจ้าหน้าที่ลงทะเบียน'}
              </button>
              {adminRegistrarForm.id && (
                <button
                  type="button"
                  onClick={() => setAdminRegistrarForm({ id: null, username: '', password: '', name: '', phone: '' })}
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
                  <th className="py-2.5 px-3">Username</th>
                  <th className="py-2.5 px-3">ชื่อ-นามสกุล</th>
                  <th className="py-2.5 px-3">เบอร์ติดต่อ</th>
                  <th className="py-2.5 px-3">สิทธิ์การใช้งาน</th>
                  <th className="py-2.5 px-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrars.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-5 text-center text-xs text-slate-400">
                      ยังไม่มีเจ้าหน้าที่ลงทะเบียนในระบบ (เพิ่มได้ที่แบบฟอร์มด้านบน)
                    </td>
                  </tr>
                ) : (
                  registrars.map((regAcc) => (
                    <tr key={regAcc.id}>
                      <td className="py-2.5 px-3 font-mono text-xs font-bold text-slate-800">{regAcc.username}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{regAcc.name}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">{regAcc.phone || '-'}</td>
                      <td className="py-2.5 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-700">
                          เฉพาะลงทะเบียนเข้าร่วมแข่งขัน
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => setAdminRegistrarForm({ ...regAcc, password: '' })}
                          className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 cursor-pointer"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteRegistrarAdmin(regAcc.id)}
                          className="p-1.5 rounded-lg bg-rose-50 text-rose-600 hover:bg-rose-100 cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 4. ตั้งค่าบัญชีผู้ดูแลระบบ (เปลี่ยน Username / รหัสผ่าน Admin) */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-amber-600" />
            <span>ตั้งค่าบัญชีผู้ดูแลระบบ (เปลี่ยนชื่อผู้ใช้ / รหัสผ่าน Admin)</span>
          </h3>
          <p className="text-sm text-slate-500">
            แก้ไขชื่อแสดงผล ชื่อผู้ใช้ หรือเปลี่ยนรหัสผ่านเข้าสู่ระบบของผู้ดูแลระบบ (ปัจจุบันใช้ชื่อผู้ใช้:{' '}
            <strong className="font-mono text-slate-700">{adminCredentials.username}</strong>)
          </p>

          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const nextUser = adminCredForm.newUsername.trim();
              const nextName = adminCredForm.newDisplayName.trim() || adminCredentials.displayName;
              const nextPass = adminCredForm.newPass.trim();
              if (!nextUser) {
                showToast('กรุณาระบุชื่อผู้ใช้ Admin', 'error');
                return;
              }
              if (nextPass && nextPass.length < 4) {
                showToast('รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร', 'error');
                return;
              }
              if (nextPass && nextPass !== adminCredForm.confirmNewPass.trim()) {
                showToast('รหัสผ่านใหม่และยืนยันรหัสผ่านไม่ตรงกัน', 'error');
                return;
              }
              try {
                await appApiCall('/admin/settings', {
                  adminCredentials: {
                    currentPass: adminCredForm.currentPass,
                    newUsername: nextUser,
                    newDisplayName: nextName,
                    newPass: nextPass
                  }
                });
                setAdminCredForm({
                  currentPass: '',
                  newUsername: nextUser,
                  newDisplayName: nextName,
                  newPass: '',
                  confirmNewPass: ''
                });
                showToast('อัปเดตข้อมูลและรหัสผ่านผู้ดูแลระบบเรียบร้อยแล้ว');
              } catch (err) {
                showToast(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตข้อมูล Admin ได้', 'error');
              }
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3"
          >
            <input
              type="text"
              placeholder="ชื่อผู้ใช้ (Username)"
              value={adminCredForm.newUsername}
              onChange={(e) => setAdminCredForm((p) => ({ ...p, newUsername: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <input
              type="text"
              placeholder="ชื่อแสดงผลผู้ดูแลระบบ"
              value={adminCredForm.newDisplayName}
              onChange={(e) => setAdminCredForm((p) => ({ ...p, newDisplayName: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <input
              type="password"
              required
              placeholder="รหัสผ่านปัจจุบัน *"
              value={adminCredForm.currentPass}
              onChange={(e) => setAdminCredForm((p) => ({ ...p, currentPass: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <input
              type="password"
              placeholder="รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)"
              value={adminCredForm.newPass}
              onChange={(e) => setAdminCredForm((p) => ({ ...p, newPass: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
            />
            <div className="flex gap-2">
              <input
                type="password"
                placeholder="ยืนยันรหัสผ่านใหม่"
                value={adminCredForm.confirmNewPass}
                onChange={(e) => setAdminCredForm((p) => ({ ...p, confirmNewPass: e.target.value }))}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                className="shrink-0 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm py-2 px-4 cursor-pointer"
              >
                บันทึก
              </button>
            </div>
          </form>
        </div>

        {/* 5. ระบบจัดเก็บข้อมูลและไฟล์ภาพบนเซิร์ฟเวอร์ + สำรองข้อมูล */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-teal-600" />
                <span>ระบบจัดเก็บข้อมูลและไฟล์ภาพบนเซิร์ฟเวอร์ (Systematic Server Storage)</span>
              </h3>
              <p className="text-sm text-slate-500 mt-0.5">
                ข้อมูลทั้งหมดจัดเก็บแยกเป็นหมวดหมู่บนเซิร์ฟเวอร์ (data/store/*.json) และรูปภาพจัดเก็บเป็นไฟล์จริงแยกโฟลเดอร์ (students / coaches / judges / backgrounds)
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <input
                ref={restoreBackupInputRef}
                type="file"
                accept=".json,application/json"
                onChange={(e) => void handleSelectRestoreBackupFile(e)}
                className="hidden"
              />
              <button
                type="button"
                disabled={isRestoringBackup}
                onClick={() => restoreBackupInputRef.current?.click()}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
              >
                {isRestoringBackup ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                <span>นำเข้าไฟล์สำรอง (.json)</span>
              </button>
              <button
                type="button"
                onClick={() => void handleDownloadServerBackup()}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>สำรองข้อมูลระบบ (.json)</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="text-xs text-slate-500">ไฟล์ภาพรวม</div>
              <div className="text-lg font-extrabold text-slate-800 mt-0.5">
                {storageStats ? storageStats.totalUploadFiles : 0} ไฟล์
              </div>
              <div className="text-[11px] text-slate-500">
                {storageStats ? `${(storageStats.totalUploadBytes / 1024).toFixed(1)} KB` : '0 KB'}
              </div>
            </div>
            <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
              <div className="text-xs text-amber-800">ภาพนักเรียน</div>
              <div className="text-lg font-extrabold text-amber-900 mt-0.5">
                {storageStats?.categories?.students?.files ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
              <div className="text-xs text-emerald-800">ภาพครูผู้ฝึกสอน</div>
              <div className="text-lg font-extrabold text-emerald-900 mt-0.5">
                {storageStats?.categories?.coaches?.files ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-sky-200 bg-sky-50/50 p-3">
              <div className="text-xs text-sky-800">ภาพกรรมการ</div>
              <div className="text-lg font-extrabold text-sky-900 mt-0.5">
                {storageStats?.categories?.judges?.files ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
              <div className="text-xs text-indigo-800">พื้นหลัง/แบนเนอร์</div>
              <div className="text-lg font-extrabold text-indigo-900 mt-0.5">
                {storageStats?.categories?.backgrounds?.files ?? 0}
              </div>
            </div>
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-3">
              <div className="text-xs text-teal-800">ชุดข้อมูลในระบบ</div>
              <div className="text-xs font-bold text-teal-900 mt-1 leading-relaxed">
                รร. {storageStats?.collections?.schools ?? schools.length} • ทีม {storageStats?.collections?.registrations ?? registrations.length} • กรรมการ {storageStats?.collections?.judges ?? judges.length} • จนท.ลงทะเบียน {storageStats?.collections?.registrars ?? registrars.length}
              </div>
            </div>
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
    const isTwoRound = isTwoRoundCompetition(currentJudge.competitionId);
    const activeRoundLabel = judgeScoringRound === 'final' ? 'รอบตัดสิน' : 'รอบคัดเลือก';
    const assignedComp = COMPETITIONS.find((c) => c.id === currentJudge.competitionId);
    const metaKey = `${currentJudge.competitionId}__${currentJudge.level}`;
    const isApprovedByAdmin = Boolean(evalMeta[metaKey]?.approved);
    const isJudgeCompleted = Boolean(evalMeta[metaKey]?.judgeCompleted);
    const isChairman =
      currentJudge.position.includes('ประธาน') && !currentJudge.position.includes('รองประธาน');
    const criteriaList = isDharmaQuiz
      ? [{ key: 'correctAnswers', label: 'จำนวนข้อสอบที่ตอบถูกต้อง (ลงคะแนนตามข้อที่ตอบถูก)', max: 100, maxLabel: '100 ข้อ/คะแนน' }]
      : getCompetitionCriteria(currentJudge.competitionId, customCriteriaByComp);
    const assignedRegs = registrations.filter(
      (r) => r.competitionId === currentJudge.competitionId && r.level === currentJudge.level
    );

    const handleSwitchJudgeRound = (nextRound: SingingRound) => {
      setJudgeScoringRound(nextRound);
      setUnlockedScoreCards({});
      setDraftCriteriaScores(
        buildJudgeDraftForRound(
          currentJudge,
          nextRound,
          registrations,
          customCriteriaByComp,
          scoreCriteriaDetails,
          scores,
          roundScoreCriteriaDetails,
          roundScores
        )
      );
    };

    const computeRowTotal = (regId: string) => {
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

    const handleCriterionInputChange = (regId: string, critKey: string, maxScore: number, rawVal: string) => {
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

    const handleSaveScores = async (e: React.FormEvent) => {
      e.preventDefault();
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถแก้ไขคะแนนได้', 'error');
        return;
      }
      const entries: Array<{ registrationId: string; criteria: Record<string, number | ''> }> = [];
      const newlySavedIds: string[] = [];

      for (const r of assignedRegs) {
        if (absentRegs[r.id]) continue;
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
        entries.push({
          registrationId: r.id,
          criteria: draftCriteriaScores[r.id] || {}
        });
        newlySavedIds.push(r.id);
      }

      if (entries.length === 0) {
        showToast('กรุณากรอกคะแนนอย่างน้อย 1 รายการก่อนบันทึก', 'error');
        return;
      }

      try {
        await appApiCall('/judge/scores', {
          entries,
          ...(isTwoRound ? { round: judgeScoringRound } : {})
        });
        if (newlySavedIds.length > 0) {
          setUnlockedScoreCards((prev) => {
            const next = { ...prev };
            newlySavedIds.forEach((id) => {
              delete next[id];
            });
            return next;
          });
        }
        showToast(
          isDharmaQuiz
            ? 'บันทึกคะแนนตามจำนวนข้อสอบที่ตอบถูกต้องเรียบร้อยแล้ว'
            : isTwoRound
            ? `บันทึกคะแนน${activeRoundLabel}เรียบร้อยแล้ว (อัปเดตผลล่าสุดสำหรับประกาศผลอัตโนมัติ)`
            : 'บันทึกคะแนนเรียบร้อยแล้ว'
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกคะแนนได้', 'error');
      }
    };

    const handleSaveSingleTeamScore = async (regItem: RegistrationItem) => {
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถแก้ไขคะแนนได้', 'error');
        return;
      }
      if (absentRegs[regItem.id]) {
        showToast('ทีมนี้ถูกแจ้งไม่เข้าร่วมแข่งขันแล้ว หากมาแข่งขันกรุณากดยกเลิกแจ้งไม่เข้าร่วมก่อน', 'error');
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

      try {
        await appApiCall('/judge/scores', {
          entries: [
            {
              registrationId: regItem.id,
              criteria: draftCriteriaScores[regItem.id] || {}
            }
          ],
          ...(isTwoRound ? { round: judgeScoringRound } : {})
        });
        setUnlockedScoreCards((prev) => {
          const next = { ...prev };
          delete next[regItem.id];
          return next;
        });
        const teamSchool = schools.find((s) => s.id === regItem.schoolId);
        const teamLabel = regItem.students.map((s) => s.name).join(', ') || teamSchool?.name || 'ทีมผู้เข้าแข่งขัน';
        showToast(
          isTwoRound
            ? `บันทึกคะแนน${activeRoundLabel}ของ "${teamLabel}" เรียบร้อยแล้ว`
            : `บันทึกคะแนนของ "${teamLabel}" เรียบร้อยแล้ว`
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถบันทึกคะแนนได้', 'error');
      }
    };

    const handleEnableEditTeamScore = (regId: string) => {
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถแก้ไขคะแนนได้', 'error');
        return;
      }
      setUnlockedScoreCards((prev) => ({
        ...prev,
        [regId]: true
      }));
    };

    const handleToggleAbsentTeam = async (regItem: RegistrationItem) => {
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถเปลี่ยนสถานะเข้าร่วมแข่งขันได้', 'error');
        return;
      }
      const currentlyAbsent = Boolean(absentRegs[regItem.id]);
      const nextAbsent = !currentlyAbsent;
      const teamSchool = schools.find((s) => s.id === regItem.schoolId);
      const teamLabel =
        regItem.students.map((s) => s.name).join(', ') || teamSchool?.name || 'ทีมผู้เข้าแข่งขัน';

      try {
        await appApiCall('/judge/absent', { registrationId: regItem.id, absent: nextAbsent });
        if (nextAbsent) {
          setDraftCriteriaScores((prev) => {
            const emptyRow: Record<string, number | ''> = {};
            criteriaList.forEach((c) => {
              emptyRow[c.key] = '';
            });
            return { ...prev, [regItem.id]: emptyRow };
          });
          setUnlockedScoreCards((prev) => {
            if (!prev[regItem.id]) return prev;
            const next = { ...prev };
            delete next[regItem.id];
            return next;
          });
          showToast(
            `แจ้งไม่เข้าร่วมแข่งขัน "${teamLabel}" เรียบร้อยแล้ว (ระบบจะงดออกเกียรติบัตรผู้เข้าแข่งขันและครูผู้ฝึกสอนให้ทีมนี้)`
          );
        } else {
          showToast(`ยกเลิกสถานะไม่เข้าร่วมแข่งขัน "${teamLabel}" แล้ว สามารถกรอกคะแนนได้ตามปกติ`);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะเข้าร่วมแข่งขันได้', 'error');
      }
    };

    const handleToggleRecuseTeam = async (regItem: RegistrationItem) => {
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถเปลี่ยนแปลงการงดเว้นลงคะแนนได้', 'error');
        return;
      }
      if (absentRegs[regItem.id]) {
        showToast('ทีมนี้ถูกแจ้งไม่เข้าร่วมแข่งขันแล้ว', 'error');
        return;
      }
      const currentlyRecused = Boolean(recusedJudges[regItem.id]?.[currentJudge.id]);
      const nextRecused = !currentlyRecused;
      const teamSchool = schools.find((s) => s.id === regItem.schoolId);
      const teamLabel =
        regItem.students.map((s) => s.name).join(', ') || teamSchool?.name || 'ทีมผู้เข้าแข่งขัน';

      try {
        await appApiCall('/judge/recuse', { registrationId: regItem.id, recused: nextRecused });
        if (nextRecused) {
          setDraftCriteriaScores((prev) => {
            const emptyRow: Record<string, number | ''> = {};
            criteriaList.forEach((c) => {
              emptyRow[c.key] = '';
            });
            return { ...prev, [regItem.id]: emptyRow };
          });
          setUnlockedScoreCards((prev) => {
            if (!prev[regItem.id]) return prev;
            const next = { ...prev };
            delete next[regItem.id];
            return next;
          });
          showToast(`งดเว้นไม่ตัดสินลงคะแนนให้ "${teamLabel}" เรียบร้อยแล้ว (ระบบจะไม่นำคะแนนของท่านไปคิดคำนวณในทีมนี้)`);
        } else {
          showToast(`ยกเลิกงดเว้นการตัดสิน "${teamLabel}" แล้ว สามารถลงคะแนนได้ตามปกติ`);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะงดเว้นลงคะแนนได้', 'error');
      }
    };

    const handleToggleChairmanComplete = async () => {
      if (!isChairman) return;
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันรายการนี้แล้ว', 'error');
        return;
      }
      const nextCompleted = !isJudgeCompleted;
      try {
        const res = await appApiCall('/judge/complete', { completed: nextCompleted });
        showToast(
          res.message ||
            (nextCompleted
              ? 'แจ้งผลการตัดสินเสร็จสมบูรณ์ทุกโรงเรียนไปยังผู้ดูแลระบบเรียบร้อยแล้ว'
              : 'ยกเลิกการแจ้งเสร็จสมบูรณ์เรียบร้อยแล้ว')
        );
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถส่งแจ้งสถานะการตัดสินได้', 'error');
      }
    };

    const qualScoredCount = isTwoRound
      ? assignedRegs.filter((r) => {
          const hasRoundStore = Boolean(roundScores[r.id] || roundScoreCriteriaDetails[r.id]);
          const val = roundScores[r.id]?.qualifying?.[currentJudge.id] ?? (!hasRoundStore ? scores[r.id]?.[currentJudge.id] : undefined);
          return !absentRegs[r.id] && !recusedJudges[r.id]?.[currentJudge.id] && val !== undefined && val !== null;
        }).length
      : 0;
    const finalScoredCount = isTwoRound
      ? assignedRegs.filter((r) => {
          const val = roundScores[r.id]?.final?.[currentJudge.id];
          return !absentRegs[r.id] && !recusedJudges[r.id]?.[currentJudge.id] && val !== undefined && val !== null;
        }).length
      : 0;

    const twoRoundRankedEntries = isTwoRound
      ? buildCompetitionRankedList(
          currentJudge.competitionId,
          currentJudge.level,
          registrations,
          scores,
          roundScores,
          absentRegs,
          recusedJudges
        )
      : [];
    const qualRankByRegId: Record<string, number> = {};
    twoRoundRankedEntries.forEach((e) => {
      if (e.qualifyingRank !== null) qualRankByRegId[e.reg.id] = e.qualifyingRank;
    });
    const orderedAssignedRegs =
      isTwoRound && judgeScoringRound === 'final'
        ? [...assignedRegs].sort((a, b) => {
            const qa = qualRankByRegId[a.id] ?? 9999;
            const qb = qualRankByRegId[b.id] ?? 9999;
            return qa - qb;
          })
        : assignedRegs;
    const finalistRegsCount = isTwoRound
      ? assignedRegs.filter((r) => qualRankByRegId[r.id] !== undefined && qualRankByRegId[r.id] <= 10).length
      : 0;

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-sky-100">
              {isDharmaQuiz
                ? 'ระบบลงคะแนนสำหรับกรรมการตัดสิน (ลงคะแนนตามข้อสอบที่ตอบถูกต้อง)'
                : isTwoRound
                ? 'ระบบลงคะแนน 2 รอบ (รอบคัดเลือก & รอบตัดสิน)'
                : 'ระบบลงคะแนนสำหรับกรรมการตัดสิน (ตามเกณฑ์ใบลงคะแนน 100 คะแนน)'}
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1">
              {currentJudge.name}
              <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 text-white">
                {currentJudge.position}
              </span>
            </h2>
            <p className="text-sm text-sky-100 mt-1">
              รายการที่รับผิดชอบ: <strong>{assignedComp?.name}</strong> • ระดับ: <strong>{currentJudge.level}</strong>
              {currentJudge.schoolId && (
                <>
                  {' '}• สังกัด: <strong>{schools.find((s) => s.id === currentJudge.schoolId)?.name || '-'}</strong>
                </>
              )}
            </p>
            <p className="text-xs text-sky-200 mt-2">
              {isApprovedByAdmin
                ? 'ผลการแข่งขันนี้ได้รับการอนุมัติจากผู้ดูแลระบบแล้ว ระบบล็อกการกรอกและแก้ไขคะแนน'
                : isDharmaQuiz
                ? 'กรอกจำนวนข้อสอบที่ผู้เข้าแข่งขันตอบถูกต้อง หรือแจ้งไม่เข้าร่วมแข่งขันหากไม่ปรากฏผู้เข้าแข่งขัน'
                : isTwoRound
                ? 'รอบตัดสินคัดเลือกอันดับที่ 1–10 จากรอบคัดเลือก และประกาศผลรวมโดยนำรอบตัดสิน 1–10 ต่อท้ายด้วยรอบคัดเลือกที่ไม่เข้าเกณฑ์ 1–10'
                : 'กรอกคะแนนแยกตามเกณฑ์ในใบลงคะแนน หรือกดปุ่ม "ไม่ตัดสินลงคะแนน" หากเป็นทีมโรงเรียนของตน'}
            </p>
          </div>
          <div className="flex flex-col sm:items-end gap-2 shrink-0">
            {isChairman && (
              <button
                type="button"
                disabled={isApprovedByAdmin}
                onClick={() => void handleToggleChairmanComplete()}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition ${
                  isApprovedByAdmin
                    ? 'bg-white/10 text-white/60 border border-white/20 cursor-not-allowed'
                    : isJudgeCompleted
                    ? 'bg-emerald-500 hover:bg-emerald-600 text-white border border-emerald-300 cursor-pointer'
                    : 'bg-amber-400 hover:bg-amber-300 text-slate-900 border border-amber-200 cursor-pointer'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isJudgeCompleted
                    ? 'แจ้งเสร็จสมบูรณ์แล้ว (คลิกยกเลิก)'
                    : 'แจ้งการตัดสินว่าเสร็จสมบูรณ์ทุกโรงเรียน'}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSelectMenu('judge-absent')}
              className="self-start sm:self-end inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2 text-xs font-bold backdrop-blur-sm transition cursor-pointer"
            >
              <UserX className="w-4 h-4" />
              <span>ไปที่เมนูแจ้งไม่เข้าร่วมแข่งขัน</span>
            </button>
          </div>
        </div>

        {isJudgeCompleted && !isApprovedByAdmin && (
          <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 flex items-center gap-3 text-emerald-800 text-xs sm:text-sm font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              ประธานกรรมการตัดสินได้แจ้งการตัดสินเสร็จสมบูรณ์ทุกโรงเรียนไปยังผู้ดูแลระบบแล้ว (รอผู้ดูแลระบบตรวจสอบและอนุมัติผลคะแนน)
            </span>
          </div>
        )}

        {isTwoRound && (
          <div className="rounded-2xl bg-white p-4 sm:p-5 border border-amber-200 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Music className="w-4 h-4 text-amber-600" />
                  <span>เลือกรอบการลงคะแนน (กิจกรรมร้องเพลงไทยลูกทุ่ง 2 รอบ)</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  รอบตัดสินนำผู้เข้าแข่งขันลำดับที่ 1–10 ของรอบคัดเลือกมาแข่งต่อ และประกาศผลเรียง 1–10 ต่อท้ายด้วยผลคัดเลือกที่ไม่เข้าเกณฑ์ 1–10
                </p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 text-amber-800 px-3 py-1 text-xs font-bold self-start">
                กำลังลงคะแนน: {activeRoundLabel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleSwitchJudgeRound('qualifying')}
                className={`rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                  judgeScoringRound === 'qualifying'
                    ? 'bg-amber-50 border-amber-400 text-amber-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-sm">1. รอบคัดเลือก</div>
                <div className="text-xs mt-0.5 opacity-80">ลงคะแนนแล้ว {qualScoredCount}/{assignedRegs.length} ทีม</div>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchJudgeRound('final')}
                className={`rounded-xl border px-4 py-3 text-left transition cursor-pointer ${
                  judgeScoringRound === 'final'
                    ? 'bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <div className="font-bold text-sm">2. รอบตัดสิน (ลำดับที่ 1–10)</div>
                <div className="text-xs mt-0.5 opacity-80">
                  ผ่านเข้ารอบ {finalistRegsCount} ทีม • ลงคะแนนแล้ว {finalScoredCount} ทีม
                </div>
              </button>
            </div>
          </div>
        )}

        {isApprovedByAdmin && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-3 text-rose-800 text-xs sm:text-sm font-bold">
            <Lock className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              ผู้ดูแลระบบอนุมัติผลคะแนนรายการและระดับชั้นนี้แล้ว จึงไม่สามารถบันทึกหรือแก้ไขคะแนนเพิ่มเติมได้
            </span>
          </div>
        )}

        <form onSubmit={handleSaveScores} className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100 space-y-4">
          {orderedAssignedRegs.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-400">
              ยังไม่มีผู้เข้าแข่งขันในรายการและระดับชั้นที่ท่านรับผิดชอบ
            </div>
          ) : (
            <div className="space-y-4">
              {orderedAssignedRegs.map((r, idx) => {
                const sch = schools.find((s) => s.id === r.schoolId);
                const isAbsent = Boolean(absentRegs[r.id]);
                const isCheckedIn = Boolean(checkIns[r.id]?.checkedIn);
                const isRecused = Boolean(recusedJudges[r.id]?.[currentJudge.id]);
                const isOwnSchool = Boolean(currentJudge.schoolId && r.schoolId === currentJudge.schoolId);
                const qRank = qualRankByRegId[r.id] ?? null;
                const isTop10Qual = qRank !== null && qRank <= 10;
                const { total, hasAny } = computeRowTotal(r.id);
                const hasRoundStore = Boolean(roundScores[r.id] || roundScoreCriteriaDetails[r.id]);
                const savedRoundScore = isTwoRound
                  ? roundScores[r.id]?.[judgeScoringRound]?.[currentJudge.id] ??
                    (judgeScoringRound === 'qualifying' && !hasRoundStore ? scores[r.id]?.[currentJudge.id] : undefined)
                  : scores[r.id]?.[currentJudge.id];
                const hasSavedScore =
                  !isAbsent &&
                  !isRecused &&
                  savedRoundScore !== undefined &&
                  savedRoundScore !== null;
                const qualSavedByJudge = isTwoRound
                  ? roundScores[r.id]?.qualifying?.[currentJudge.id] ??
                    (!hasRoundStore ? scores[r.id]?.[currentJudge.id] : undefined)
                  : undefined;
                const finalSavedByJudge = isTwoRound
                  ? roundScores[r.id]?.final?.[currentJudge.id]
                  : undefined;
                const isEditingRow = Boolean(unlockedScoreCards[r.id]) && !isApprovedByAdmin;
                const isInputDisabled =
                  isApprovedByAdmin || isAbsent || isRecused || (hasSavedScore && !isEditingRow);

                return (
                  <div
                    key={r.id}
                    className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                      isAbsent
                        ? 'border-rose-200 bg-rose-50/40'
                        : isRecused
                        ? 'border-amber-300 bg-amber-50/50'
                        : isOwnSchool
                        ? 'border-emerald-300 bg-emerald-50/25'
                        : isTwoRound && judgeScoringRound === 'final' && qRank !== null && !isTop10Qual
                        ? 'border-amber-200/80 bg-amber-50/30 opacity-85'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-sky-700">ผู้เข้าแข่งขันชุดที่ {idx + 1}</span>
                          {!isAbsent && (
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                                isCheckedIn
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isCheckedIn ? 'ลงทะเบียนรายงานตัวแล้ว' : 'ยังไม่รายงานตัว'}
                            </span>
                          )}
                          {isOwnSchool && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              โรงเรียนเดียวกับกรรมการ
                            </span>
                          )}
                          {isRecused && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-600 text-white">
                              งดเว้นลงคะแนน (ทีมโรงเรียนของตน)
                            </span>
                          )}
                          {isTwoRound && (
                            <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 px-2.5 py-0.5 text-[11px] font-bold">
                              {activeRoundLabel}
                            </span>
                          )}
                          {isTwoRound && !isAbsent && qRank !== null && (
                            <span
                              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                                isTop10Qual
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isTop10Qual
                                ? `ผ่านเข้ารอบตัดสิน 1-10 (คัดเลือกอันดับที่ ${qRank})`
                                : `ไม่เข้าเกณฑ์ 1-10 (คัดเลือกอันดับที่ ${qRank})`}
                            </span>
                          )}
                          {isAbsent && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-600 text-white">
                              <UserX className="w-3 h-3" />
                              <span>ไม่เข้าร่วมแข่งขัน</span>
                            </span>
                          )}
                        </div>
                        <div className="font-bold text-slate-800 text-base mt-0.5">
                          {r.students.map((s) => s.name).join(', ')}
                        </div>
                        <div className="text-xs text-slate-600">{sch?.name}</div>
                        {isTwoRound && (
                          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-0.5 font-semibold">
                              <Music className="w-3 h-3" />
                              <span>
                                {judgeScoringRound === 'final'
                                  ? `เพลงรอบตัดสิน: ${r.finalSong || '-'}`
                                  : `เพลงรอบคัดเลือก: ${r.qualifyingSong || '-'}`}
                              </span>
                            </span>
                            {qualSavedByJudge !== undefined && (
                              <span className="rounded-lg bg-white border border-slate-200 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                                คัดเลือก: {Number(qualSavedByJudge).toFixed(2)}
                              </span>
                            )}
                            {finalSavedByJudge !== undefined && (
                              <span className="rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                                ตัดสิน: {Number(finalSavedByJudge).toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div
                        className={`rounded-xl border px-4 py-2 text-right shrink-0 ${
                          isAbsent
                            ? 'bg-rose-50 border-rose-200'
                            : isRecused
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-sky-50 border-sky-200'
                        }`}
                      >
                        <div
                          className={`text-[11px] font-semibold ${
                            isAbsent ? 'text-rose-700' : isRecused ? 'text-amber-800' : 'text-sky-800'
                          }`}
                        >
                          {isAbsent
                            ? 'สถานะการเข้าแข่งขัน'
                            : isRecused
                            ? 'สถานะการตัดสินของท่าน'
                            : isDharmaQuiz
                            ? 'คะแนนตามข้อที่ตอบถูก'
                            : isTwoRound
                            ? `คะแนน${activeRoundLabel} (เต็ม 100)`
                            : 'คะแนนรวมตามเกณฑ์ (เต็ม 100)'}
                        </div>
                        <div
                          className={`text-lg font-extrabold ${
                            isAbsent ? 'text-rose-700' : isRecused ? 'text-amber-900' : 'text-sky-900'
                          }`}
                        >
                          {isAbsent
                            ? 'ไม่เข้าร่วมแข่งขัน'
                            : isRecused
                            ? 'ไม่ตัดสิน (งดเว้น)'
                            : hasAny
                            ? `${total} ${isDharmaQuiz ? 'ข้อ/คะแนน' : 'คะแนน'}`
                            : '-'}
                        </div>
                      </div>
                    </div>

                    {!isAbsent && isRecused && (
                      <div className="rounded-xl bg-amber-100/70 border border-amber-200 px-4 py-3 text-xs sm:text-sm font-semibold text-amber-900">
                        ท่านเลือก &quot;ไม่ตัดสินลงคะแนน (ทีมโรงเรียนของตน)&quot; ระบบจะไม่นำคะแนนของท่านไปคิดคำนวณรวมสำหรับทีมนี้ (ใช้คะแนนจากกรรมการท่านอื่นแทน)
                      </div>
                    )}

                    {!isAbsent && !isRecused && (
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
                    )}

                    <div className="flex flex-wrap justify-between items-center gap-2 pt-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          disabled={isApprovedByAdmin}
                          onClick={() => handleToggleAbsentTeam(r)}
                          className={`inline-flex items-center gap-1.5 rounded-xl font-bold px-3.5 py-2 text-xs sm:text-sm border transition ${
                            isApprovedByAdmin
                              ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                              : isAbsent
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 cursor-pointer'
                              : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-300 cursor-pointer'
                          }`}
                        >
                          {isAbsent ? (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>ยกเลิกแจ้งไม่เข้าร่วม (กลับมาแข่งขัน)</span>
                            </>
                          ) : (
                            <>
                              <UserX className="w-4 h-4" />
                              <span>แจ้งไม่เข้าร่วมแข่งขัน</span>
                            </>
                          )}
                        </button>

                        {!isAbsent && (
                          <button
                            type="button"
                            disabled={isApprovedByAdmin}
                            onClick={() => void handleToggleRecuseTeam(r)}
                            className={`inline-flex items-center gap-1.5 rounded-xl font-bold px-3.5 py-2 text-xs sm:text-sm border transition ${
                              isApprovedByAdmin
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : isRecused
                                ? 'bg-amber-600 hover:bg-amber-700 text-white border-amber-700 cursor-pointer'
                                : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-300 cursor-pointer'
                            }`}
                          >
                            <ShieldCheck className="w-4 h-4" />
                            <span>
                              {isRecused
                                ? 'ยกเลิกไม่ตัดสินลงคะแนน'
                                : 'ไม่ตัดสินลงคะแนน (ทีมโรงเรียนของตน)'}
                            </span>
                          </button>
                        )}
                      </div>

                      {!isAbsent && !isRecused && (
                        <div className="flex flex-wrap justify-end gap-2">
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
                      )}
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

  const renderJudgeAbsentPage = () => {
    if (authSession.role !== 'judge' || !currentJudge) {
      return (
        <div className="rounded-2xl bg-white p-8 text-center border border-slate-100 space-y-3">
          <UserX className="w-8 h-8 text-rose-500 mx-auto" />
          <div className="font-bold text-slate-800">เมนูนี้สำหรับกรรมการตัดสินที่เข้าสู่ระบบแล้วเท่านั้น</div>
        </div>
      );
    }

    const assignedComp = COMPETITIONS.find((c) => c.id === currentJudge.competitionId);
    const metaKey = `${currentJudge.competitionId}__${currentJudge.level}`;
    const isApprovedByAdmin = Boolean(evalMeta[metaKey]?.approved);
    const assignedRegs = registrations.filter(
      (r) => r.competitionId === currentJudge.competitionId && r.level === currentJudge.level
    );

    const absentCount = assignedRegs.filter((r) => Boolean(absentRegs[r.id])).length;
    const presentCount = assignedRegs.length - absentCount;

    const searchQ = judgeAbsentSearch.trim().toLowerCase();
    const filteredRegs = assignedRegs.filter((r) => {
      const isAbsent = Boolean(absentRegs[r.id]);
      if (judgeAbsentFilter === 'present' && isAbsent) return false;
      if (judgeAbsentFilter === 'absent' && !isAbsent) return false;
      if (!searchQ) return true;
      const sch = schools.find((s) => s.id === r.schoolId);
      const schoolText = (sch?.name || '').toLowerCase();
      const studentText = r.students.map((s) => s.name).join(' ').toLowerCase();
      const coachText = r.coaches.map((c) => (typeof c === 'string' ? c : c.name)).join(' ').toLowerCase();
      return schoolText.includes(searchQ) || studentText.includes(searchQ) || coachText.includes(searchQ);
    });

    const handleToggleAbsentFromMenu = async (regItem: RegistrationItem) => {
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถเปลี่ยนสถานะเข้าร่วมแข่งขันได้', 'error');
        return;
      }
      const currentlyAbsent = Boolean(absentRegs[regItem.id]);
      const nextAbsent = !currentlyAbsent;
      const teamSchool = schools.find((s) => s.id === regItem.schoolId);
      const teamLabel =
        regItem.students.map((s) => s.name).join(', ') || teamSchool?.name || 'ทีมผู้เข้าแข่งขัน';

      try {
        await appApiCall('/judge/absent', { registrationId: regItem.id, absent: nextAbsent });
        if (nextAbsent) {
          setDraftCriteriaScores((prev) => {
            if (!prev[regItem.id]) return prev;
            const next = { ...prev };
            delete next[regItem.id];
            return next;
          });
          setUnlockedScoreCards((prev) => {
            if (!prev[regItem.id]) return prev;
            const next = { ...prev };
            delete next[regItem.id];
            return next;
          });
          showToast(
            `แจ้งไม่เข้าร่วมแข่งขัน "${teamLabel}" เรียบร้อยแล้ว และตัดรายชื่อออกจากระบบเกียรติบัตรผู้เข้าแข่งขันและครูผู้ฝึกสอนแล้ว`
          );
        } else {
          showToast(`ยกเลิกแจ้งไม่เข้าร่วมแข่งขัน "${teamLabel}" เรียบร้อยแล้ว`);
        }
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'ไม่สามารถเปลี่ยนสถานะเข้าร่วมแข่งขันได้', 'error');
      }
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-rose-100">
              บันทึกสถานะการมาแข่งขัน (กรรมการตัดสิน)
            </div>
            <h2 className="text-xl sm:text-2xl font-bold mt-1 flex items-center gap-2">
              <UserX className="w-6 h-6 shrink-0" />
              <span>แจ้งไม่เข้าร่วมแข่งขัน</span>
            </h2>
            <p className="text-sm text-rose-50 mt-1">
              กรรมการ: <strong>{currentJudge.name}</strong> • กิจกรรม: <strong>{assignedComp?.name}</strong> • ระดับ: <strong>{currentJudge.level}</strong>
            </p>
            <p className="text-xs text-rose-100 mt-2">
              หากไม่ปรากฏนักเรียนเข้าแข่งขันตามรายชื่อ ให้กดปุ่ม &ldquo;แจ้งไม่เข้าร่วมแข่งขัน&rdquo; ระบบจะตัดรายชื่อนี้ออกจากระบบเกียรติบัตรผู้เข้าร่วมแข่งขันและครูผู้ฝึกสอน และงดการคิดคะแนนรายการนี้โดยอัตโนมัติ
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSelectMenu('judge-scoring')}
            className="self-start sm:self-center inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2.5 text-xs sm:text-sm font-bold backdrop-blur-sm transition cursor-pointer shrink-0"
          >
            <Gavel className="w-4 h-4" />
            <span>ไปหน้าลงคะแนนตัดสิน</span>
          </button>
        </div>

        {isApprovedByAdmin && (
          <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 flex items-center gap-3 text-rose-800 text-xs sm:text-sm font-bold">
            <Lock className="w-5 h-5 text-rose-600 shrink-0" />
            <span>
              ผู้ดูแลระบบอนุมัติผลคะแนนรายการและระดับชั้นนี้แล้ว จึงไม่สามารถเปลี่ยนแปลงสถานะการเข้าร่วมแข่งขันได้
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white p-4 border border-slate-100 shadow-sm">
            <div className="text-xs font-semibold text-slate-500">รายชื่อที่สมัครทั้งหมด</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">{assignedRegs.length} รายการ</div>
          </div>
          <div className="rounded-2xl bg-emerald-50/70 p-4 border border-emerald-200 shadow-sm">
            <div className="text-xs font-semibold text-emerald-700">เข้าแข่งขันปกติ</div>
            <div className="text-2xl font-extrabold text-emerald-800 mt-1">{presentCount} รายการ</div>
          </div>
          <div className="rounded-2xl bg-rose-50/80 p-4 border border-rose-200 shadow-sm">
            <div className="text-xs font-semibold text-rose-700">แจ้งไม่เข้าร่วม (ตัดเกียรติบัตรแล้ว)</div>
            <div className="text-2xl font-extrabold text-rose-800 mt-1">{absentCount} รายการ</div>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-100 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={judgeAbsentSearch}
                onChange={(e) => setJudgeAbsentSearch(e.target.value)}
                placeholder="ค้นหาชื่อโรงเรียน / ชื่อนักเรียน / ครูผู้ฝึกสอน..."
                className="w-full rounded-xl border border-slate-200 pl-10 pr-3.5 py-2 text-sm bg-slate-50 focus:bg-white focus:border-rose-400 outline-none"
              />
            </div>

            <select
              value={judgeAbsentFilter}
              onChange={(e) => setJudgeAbsentFilter(e.target.value as 'all' | 'present' | 'absent')}
              className="rounded-xl border border-slate-200 px-3.5 py-2 text-sm bg-slate-50 outline-none"
            >
              <option value="all">สถานะทั้งหมด ({assignedRegs.length})</option>
              <option value="present">เข้าแข่งขันปกติ ({presentCount})</option>
              <option value="absent">แจ้งไม่เข้าร่วมแข่งขัน ({absentCount})</option>
            </select>
          </div>

          {filteredRegs.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-400">
              {assignedRegs.length === 0
                ? 'ยังไม่มีรายชื่อผู้เข้าแข่งขันในรายการและระดับชั้นที่ท่านรับผิดชอบ'
                : 'ไม่พบรายชื่อตามเงื่อนไขที่ค้นหา'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-600 text-xs border-b border-slate-200">
                    <th className="py-3 px-3 w-14 text-center font-bold">ลำดับ</th>
                    <th className="py-3 px-3 font-bold">โรงเรียน</th>
                    <th className="py-3 px-3 font-bold">ผู้เข้าแข่งขัน (นักเรียน)</th>
                    <th className="py-3 px-3 font-bold">ครูผู้ฝึกสอน</th>
                    <th className="py-3 px-3 font-bold text-center">สถานะ</th>
                    <th className="py-3 px-3 font-bold text-right">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRegs.map((reg, idx) => {
                    const sch = schools.find((s) => s.id === reg.schoolId);
                    const isAbsent = Boolean(absentRegs[reg.id]);
                    return (
                      <tr key={reg.id} className={isAbsent ? 'bg-rose-50/40' : 'hover:bg-slate-50/70'}>
                        <td className="py-3 px-3 text-center font-bold text-slate-600">{idx + 1}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{sch?.name || '-'}</td>
                        <td className="py-3 px-3 text-slate-700">
                          {reg.students.map((st) => st.name).join(', ') || '-'}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          {reg.coaches.map((co) => (typeof co === 'string' ? co : co.name)).join(', ') || '-'}
                        </td>
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          {isAbsent ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              <UserX className="w-3.5 h-3.5" />
                              <span>ไม่เข้าร่วม (งดเกียรติบัตร)</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>เข้าแข่งขันปกติ</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            disabled={isApprovedByAdmin}
                            onClick={() => handleToggleAbsentFromMenu(reg)}
                            className={`inline-flex items-center gap-1.5 rounded-xl font-bold px-3.5 py-2 text-xs border transition ${
                              isApprovedByAdmin
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : isAbsent
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-300 cursor-pointer'
                                : 'bg-rose-600 hover:bg-rose-700 text-white border-rose-600 shadow-sm cursor-pointer'
                            }`}
                          >
                            {isAbsent ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>ยกเลิกแจ้งไม่เข้าร่วม</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>แจ้งไม่เข้าร่วมแข่งขัน</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderLoginPage = () => {
    const roleDefaultMenu =
      authSession.role === 'admin'
        ? 'admin-manage'
        : authSession.role === 'manager'
        ? 'admin-competition-manage'
        : authSession.role === 'registrar'
        ? 'competition-checkin'
        : authSession.role === 'school'
        ? 'by-school'
        : authSession.role === 'judge'
        ? 'judge-scoring'
        : 'home';

    const activeRoleTab: 'admin' | 'manager' | 'registrar' | 'school' | 'judge' =
      activeMenu === 'login-admin'
        ? 'admin'
        : activeMenu === 'login-manager'
        ? 'manager'
        : activeMenu === 'login-registrar'
        ? 'registrar'
        : activeMenu === 'login-judge'
        ? 'judge'
        : activeMenu === 'login-school'
        ? 'school'
        : loginTab;

    const currentRoleMeta =
      activeRoleTab === 'admin'
        ? {
            title: 'เข้าสู่ระบบ: ผู้ดูแลระบบ',
            desc: 'สำหรับผู้ดูแลระบบในการจัดการข้อมูล กรรมการ และอนุมัติผลการแข่งขัน',
            icon: ShieldCheck,
            badgeCls: 'bg-orange-100 text-orange-700'
          }
        : activeRoleTab === 'manager'
        ? {
            title: 'เข้าสู่ระบบ: ผู้จัดการแข่งขัน',
            desc: 'สำหรับผู้จัดการแข่งขันในการจัดการเอกสาร บันทึกผลคะแนน เกณฑ์การตัดสิน และลงทะเบียนเข้าร่วมแข่งขัน',
            icon: FileText,
            badgeCls: 'bg-violet-100 text-violet-700'
          }
        : activeRoleTab === 'registrar'
        ? {
            title: 'เข้าสู่ระบบ: เจ้าหน้าที่ลงทะเบียน',
            desc: 'สำหรับเจ้าหน้าที่ลงทะเบียนเพื่อบันทึกการรายงานตัว แจ้งไม่เข้าร่วม และจัดการรายชื่อผู้เข้าแข่งขัน',
            icon: ClipboardCheck,
            badgeCls: 'bg-indigo-100 text-indigo-700'
          }
        : activeRoleTab === 'judge'
        ? {
            title: 'เข้าสู่ระบบ: ระบบกรรมการ',
            desc: 'สำหรับคณะกรรมการตัดสินเพื่อบันทึกคะแนนและพิมพ์เอกสารกรรมการ',
            icon: Gavel,
            badgeCls: 'bg-sky-100 text-sky-700'
          }
        : {
            title: 'เข้าสู่ระบบ: ระบบโรงเรียน',
            desc: 'สำหรับสถานศึกษาในการลงทะเบียนแข่งขัน พิมพ์บัตร และดาวน์โหลดเกียรติบัตร',
            icon: School,
            badgeCls: 'bg-emerald-100 text-emerald-700'
          };

    const RoleHeaderIcon = currentRoleMeta.icon;

    return (
      <div className={`${activeMenu === 'login' ? 'max-w-5xl' : 'max-w-2xl'} mx-auto space-y-6`}>
        {authSession.role !== 'guest' && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-700">
                  เข้าสู่ระบบอยู่แล้ว ({authSession.role === 'admin' ? 'ผู้ดูแลระบบ' : authSession.role === 'manager' ? 'ผู้จัดการแข่งขัน' : authSession.role === 'registrar' ? 'เจ้าหน้าที่ลงทะเบียน' : authSession.role === 'school' ? 'โรงเรียน' : 'กรรมการตัดสิน'})
                </div>
                <div className="text-sm font-bold text-slate-800 truncate">{authSession.displayName}</div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleSelectMenu(roleDefaultMenu)}
                className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 text-xs font-bold cursor-pointer"
              >
                ไปยังหน้าจัดการ
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 px-3.5 py-2 text-xs font-bold cursor-pointer"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        )}

        {activeMenu === 'login' ? (
          <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-sm border border-slate-100 space-y-6">
            <div className="text-center space-y-1.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 text-orange-600 flex items-center justify-center mx-auto">
                <LogIn className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-800">เข้าสู่ระบบ</h2>
              <p className="text-sm text-slate-500">
                กรุณาเลือกประเภทระบบที่ต้องการเข้าสู่ระบบ
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <button
                type="button"
                onClick={() => handleSelectMenu('login-admin')}
                className="group rounded-2xl border border-slate-200 hover:border-orange-400 hover:bg-orange-50/40 p-5 text-center transition shadow-xs hover:shadow-md cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-orange-100 text-orange-600 group-hover:bg-orange-500 group-hover:text-white flex items-center justify-center transition">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">ผู้ดูแลระบบ</div>
                  <div className="text-xs text-slate-500 mt-1">จัดการระบบ กรรมการ และอนุมัติผลการแข่งขัน</div>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-orange-600">
                  <span>เข้าสู่ระบบ</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMenu('login-manager')}
                className="group rounded-2xl border border-slate-200 hover:border-violet-400 hover:bg-violet-50/40 p-5 text-center transition shadow-xs hover:shadow-md cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white flex items-center justify-center transition">
                  <FileText className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">ผู้จัดการแข่งขัน</div>
                  <div className="text-xs text-slate-500 mt-1">จัดการแข่งขัน บันทึกคะแนน และเกณฑ์ตัดสิน</div>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-violet-700">
                  <span>เข้าสู่ระบบ</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMenu('login-registrar')}
                className="group rounded-2xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/40 p-5 text-center transition shadow-xs hover:shadow-md cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-indigo-100 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white flex items-center justify-center transition">
                  <ClipboardCheck className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">เจ้าหน้าที่ลงทะเบียน</div>
                  <div className="text-xs text-slate-500 mt-1">เช็กชื่อลงทะเบียนเข้าร่วมแข่งขันหน้างาน</div>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-indigo-700">
                  <span>เข้าสู่ระบบ</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMenu('login-school')}
                className="group rounded-2xl border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 p-5 text-center transition shadow-xs hover:shadow-md cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white flex items-center justify-center transition">
                  <School className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">ระบบโรงเรียน</div>
                  <div className="text-xs text-slate-500 mt-1">สมัครแข่งขัน พิมพ์บัตร และเกียรติบัตร</div>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                  <span>เข้าสู่ระบบ</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectMenu('login-judge')}
                className="group rounded-2xl border border-slate-200 hover:border-sky-400 hover:bg-sky-50/40 p-5 text-center transition shadow-xs hover:shadow-md cursor-pointer flex flex-col items-center gap-3"
              >
                <div className="w-14 h-14 rounded-2xl bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white flex items-center justify-center transition">
                  <Gavel className="w-7 h-7" />
                </div>
                <div>
                  <div className="text-base font-bold text-slate-800">ระบบกรรมการ</div>
                  <div className="text-xs text-slate-500 mt-1">บันทึกคะแนนตัดสินและพิมพ์บัตรกรรมการ</div>
                </div>
                <span className="mt-auto inline-flex items-center gap-1 text-xs font-bold text-sky-700">
                  <span>เข้าสู่ระบบ</span>
                  <ChevronRight className="w-4 h-4" />
                </span>
              </button>
            </div>
          </div>
        ) : (
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100">
          <div className="mb-4">
            <button
              type="button"
              onClick={() => handleSelectMenu('login')}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 transition cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>เลือกประเภทเข้าสู่ระบบอื่น</span>
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${currentRoleMeta.badgeCls}`}>
              <RoleHeaderIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{currentRoleMeta.title}</h2>
              <p className="text-sm text-slate-500 mt-0.5">{currentRoleMeta.desc}</p>
            </div>
          </div>

          {loginError && (
            <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Tab 1: Admin */}
          {activeRoleTab === 'admin' && (
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อผู้ใช้ผู้ดูแลระบบ (Admin)</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={loginUser}
                  onChange={(e) => {
                    setLoginUser(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="ระบุชื่อผู้ใช้ Admin"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginPass}
                    onChange={(e) => {
                      setLoginPass(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2.5 text-sm outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass((v) => !v)}
                    aria-label={showLoginPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                />
                <span>จดจำการเข้าสู่ระบบในเบราว์เซอร์นี้</span>
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:opacity-95 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
              >
                เข้าสู่ระบบผู้ดูแลระบบ
              </button>
            </form>
          )}

          {/* Tab 2: School (Login & Sign-up) */}
          {activeRoleTab === 'school' && (
            <div className="mt-5 space-y-4">
              <div className="flex gap-2 border-b border-slate-100 pb-3">
                <button
                  type="button"
                  onClick={() => {
                    setSchoolAuthMode('login');
                    setLoginError('');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    schoolAuthMode === 'login' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  เข้าสู่ระบบโรงเรียน
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSchoolAuthMode('register');
                    setLoginError('');
                  }}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                    schoolAuthMode === 'register' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  สมัครใช้งานโรงเรียนใหม่ (1 User / โรงเรียน)
                </button>
              </div>

              {schoolAuthMode === 'login' ? (
                <form onSubmit={handleLoginSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">รหัสสถานศึกษา (User)</label>
                    <input
                      type="text"
                      autoComplete="username"
                      value={loginUser}
                      onChange={(e) => {
                        setLoginUser(e.target.value);
                        if (loginError) setLoginError('');
                      }}
                      placeholder="ระบุรหัสสถานศึกษา"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่าน</label>
                    <div className="relative">
                      <input
                        type={showLoginPass ? 'text' : 'password'}
                        autoComplete="current-password"
                        value={loginPass}
                        onChange={(e) => {
                          setLoginPass(e.target.value);
                          if (loginError) setLoginError('');
                        }}
                        placeholder="••••••••"
                        className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2.5 text-sm outline-none focus:border-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPass((v) => !v)}
                        aria-label={showLoginPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                        className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberLogin}
                      onChange={(e) => setRememberLogin(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>จดจำการเข้าสู่ระบบในเบราว์เซอร์นี้</span>
                  </label>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
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
                      onChange={(e) => {
                        setNewSchoolForm((p) => ({ ...p, schoolCode: e.target.value }));
                        if (loginError) setLoginError('');
                      }}
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
                      onChange={(e) => {
                        setNewSchoolForm((p) => ({ ...p, name: e.target.value }));
                        if (loginError) setLoginError('');
                      }}
                      placeholder="ระบุชื่อโรงเรียนเต็ม"
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">
                        ชื่อผู้อำนวยการโรงเรียน / ผู้บริหาร *
                      </label>
                      <input
                        type="text"
                        required
                        value={newSchoolForm.director}
                        onChange={(e) => {
                          setNewSchoolForm((p) => ({ ...p, director: e.target.value }));
                          if (loginError) setLoginError('');
                        }}
                        placeholder="ระบุชื่อผู้อำนวยการโรงเรียน"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-emerald-600" />
                        <span>เบอร์โทรศัพท์ติดต่อ</span>
                      </label>
                      <input
                        type="tel"
                        value={newSchoolForm.phone}
                        onChange={(e) => setNewSchoolForm((p) => ({ ...p, phone: e.target.value }))}
                        placeholder="เช่น 08x-xxx-xxxx"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">กำหนดรหัสผ่าน (อย่างน้อย 4 ตัว) *</label>
                      <div className="relative">
                        <input
                          type={showSignupPass ? 'text' : 'password'}
                          required
                          value={newSchoolForm.password}
                          onChange={(e) => {
                            setNewSchoolForm((p) => ({ ...p, password: e.target.value }));
                            if (loginError) setLoginError('');
                          }}
                          placeholder="กำหนดรหัสผ่าน"
                          className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupPass((v) => !v)}
                          aria-label={showSignupPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                          className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSignupPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-600 mb-1">ยืนยันรหัสผ่าน *</label>
                      <div className="relative">
                        <input
                          type={showSignupConfirmPass ? 'text' : 'password'}
                          required
                          value={signupConfirmPass}
                          onChange={(e) => {
                            setSignupConfirmPass(e.target.value);
                            if (loginError) setLoginError('');
                          }}
                          placeholder="พิมพ์รหัสผ่านอีกครั้ง"
                          className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2 text-sm outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignupConfirmPass((v) => !v)}
                          aria-label={showSignupConfirmPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                          className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showSignupConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:opacity-95 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
                  >
                    สมัครบัญชีโรงเรียนและเข้าสู่ระบบ
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Tab 3: Judge */}
          {activeRoleTab === 'judge' && (
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Username กรรมการตัดสิน</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={loginUser}
                  onChange={(e) => {
                    setLoginUser(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="ระบุชื่อผู้ใช้กรรมการตัดสิน"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Password กรรมการตัดสิน</label>
                <div className="relative">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginPass}
                    onChange={(e) => {
                      setLoginPass(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2.5 text-sm outline-none focus:border-sky-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass((v) => !v)}
                    aria-label={showLoginPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                <span>จดจำการเข้าสู่ระบบในเบราว์เซอร์นี้</span>
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 hover:opacity-95 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
              >
                เข้าสู่ระบบกรรมการตัดสิน
              </button>
            </form>
          )}

          {/* Tab 4: Competition Manager */}
          {activeRoleTab === 'manager' && (
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Username ผู้จัดการแข่งขัน</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={loginUser}
                  onChange={(e) => {
                    setLoginUser(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="ระบุชื่อผู้ใช้ผู้จัดการแข่งขัน"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-violet-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginPass}
                    onChange={(e) => {
                      setLoginPass(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2.5 text-sm outline-none focus:border-violet-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass((v) => !v)}
                    aria-label={showLoginPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                />
                <span>จดจำการเข้าสู่ระบบในเบราว์เซอร์นี้</span>
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:opacity-95 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
              >
                เข้าสู่ระบบผู้จัดการแข่งขัน
              </button>
            </form>
          )}

          {/* Tab 5: Registrar */}
          {activeRoleTab === 'registrar' && (
            <form onSubmit={handleLoginSubmit} className="mt-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Username เจ้าหน้าที่ลงทะเบียน</label>
                <input
                  type="text"
                  autoComplete="username"
                  value={loginUser}
                  onChange={(e) => {
                    setLoginUser(e.target.value);
                    if (loginError) setLoginError('');
                  }}
                  placeholder="ระบุชื่อผู้ใช้เจ้าหน้าที่ลงทะเบียน"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">รหัสผ่าน</label>
                <div className="relative">
                  <input
                    type={showLoginPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={loginPass}
                    onChange={(e) => {
                      setLoginPass(e.target.value);
                      if (loginError) setLoginError('');
                    }}
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-200 pl-3.5 pr-10 py-2.5 text-sm outline-none focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPass((v) => !v)}
                    aria-label={showLoginPass ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                    className="absolute inset-y-0 right-2.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <label className="inline-flex items-center gap-2 text-xs text-slate-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberLogin}
                  onChange={(e) => setRememberLogin(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span>จดจำการเข้าสู่ระบบในเบราว์เซอร์นี้</span>
              </label>
              <button
                type="submit"
                className="w-full rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:opacity-95 text-white font-bold py-3 text-sm shadow-md cursor-pointer"
              >
                เข้าสู่ระบบเจ้าหน้าที่ลงทะเบียน
              </button>
            </form>
          )}
        </div>
        )}
      </div>
    );
  };

  // ============================================================================
  // 6. MAIN LAYOUT SHELL (Responsive Sidebar + Topbar + Content)
  // ============================================================================

  const renderActiveContent = () => {
    if (authSession.role === 'manager' && !MANAGER_ALLOWED_MENUS.includes(activeMenu) && !activeMenu.startsWith('login')) {
      return renderAdminCompetitionManagePage();
    }
    if (authSession.role === 'registrar' && !REGISTRAR_ALLOWED_MENUS.includes(activeMenu) && !activeMenu.startsWith('login')) {
      return renderCompetitionCheckinPage();
    }
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
      case 'medal-summary':
        return renderSchoolResultsPage();
      case 'results':
        return renderResultsPage();
      case 'competition-checkin':
        return renderCompetitionCheckinPage();
      case 'score-entry':
        return renderScoreEntryPage();
      case 'admin-competition-manage':
        return renderAdminCompetitionManagePage();
      case 'admin-manage':
        return renderAdminManagePage();
      case 'judge-scoring':
        return renderJudgeScoringPage();
      case 'judge-absent':
        return renderJudgeAbsentPage();
      case 'login':
      case 'login-admin':
      case 'login-manager':
      case 'login-registrar':
      case 'login-school':
      case 'login-judge':
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
          className={`fixed bottom-5 right-5 z-[90] flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg text-sm font-semibold text-white transition-all ${
            toast.type === 'error' ? 'bg-rose-600' : 'bg-slate-900'
          }`}
        >
          {toast.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 text-amber-400 shrink-0" />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* By-School Edit Registration Modal */}
      {bySchoolEditForm && (() => {
        const editComp =
          COMPETITIONS.find((c) => c.id === bySchoolEditForm.competitionId) || COMPETITIONS[0];
        const editSchool = schools.find((s) => s.id === bySchoolEditForm.schoolId);

        return (
          <div
            onClick={() => setBySchoolEditForm(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-3 sm:p-6 animate-fadeIn"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
            >
              <div className="flex items-center justify-between gap-3 bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-4 text-white shrink-0">
                <div className="flex items-center gap-2.5 min-w-0">
                  <Edit3 className="w-5 h-5 text-amber-300 shrink-0" />
                  <div className="min-w-0">
                    <h3 className="text-base sm:text-lg font-bold truncate">
                      แก้ไขข้อมูลการสมัครแข่งขัน
                    </h3>
                    <div className="text-xs text-emerald-100 truncate">
                      {editSchool ? `[${editSchool.schoolCode}] ${editSchool.name}` : 'สถานศึกษา'}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBySchoolEditForm(null)}
                  aria-label="ปิดหน้าต่างแก้ไข"
                  className="rounded-full bg-white/20 hover:bg-white/30 p-1.5 text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleBySchoolEditSave} className="flex-1 overflow-y-auto p-6 space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {authSession.role === 'admin' && (
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-600 mb-1">โรงเรียนที่สมัคร</label>
                      <select
                        value={bySchoolEditForm.schoolId}
                        onChange={(e) =>
                          setBySchoolEditForm((p) => (p ? { ...p, schoolId: e.target.value } : null))
                        }
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-emerald-500"
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
                      value={bySchoolEditForm.competitionId}
                      onChange={(e) => handleBySchoolEditCompChange(e.target.value)}
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-emerald-500"
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
                      value={bySchoolEditForm.level}
                      onChange={(e) =>
                        setBySchoolEditForm((p) => (p ? { ...p, level: e.target.value } : null))
                      }
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm bg-slate-50 outline-none focus:border-emerald-500"
                    >
                      {editComp.levels.map((lvl) => (
                        <option key={lvl} value={lvl}>
                          {lvl}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Students */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      รายชื่อผู้เข้าแข่งขัน ({editComp.type}) *
                    </label>
                    {bySchoolEditForm.studentNames.length < editComp.teamSize && (
                      <button
                        type="button"
                        onClick={() =>
                          setBySchoolEditForm((p) =>
                            p
                              ? {
                                  ...p,
                                  studentNames: [...p.studentNames, ''],
                                  studentPhotos: [...p.studentPhotos, '']
                                }
                              : null
                          )
                        }
                        className="inline-flex items-center gap-1 text-xs font-bold text-amber-700 hover:text-amber-800 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>เพิ่มผู้เข้าแข่งขัน</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bySchoolEditForm.studentNames.map((stName, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required={idx === 0}
                            value={stName}
                            onChange={(e) =>
                              setBySchoolEditForm((p) => {
                                if (!p) return null;
                                const next = [...p.studentNames];
                                next[idx] = e.target.value;
                                return { ...p, studentNames: next };
                              })
                            }
                            placeholder={`ชื่อ-นามสกุล ผู้เข้าแข่งขันคนที่ ${idx + 1}`}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-amber-500"
                          />
                          {bySchoolEditForm.studentNames.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setBySchoolEditForm((p) =>
                                  p && p.studentNames.length > 1
                                    ? {
                                        ...p,
                                        studentNames: p.studentNames.filter((_, i) => i !== idx),
                                        studentPhotos: p.studentPhotos.filter((_, i) => i !== idx)
                                      }
                                    : p
                                )
                              }
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
                            <span>
                              {bySchoolEditForm.studentPhotos[idx]
                                ? 'เปลี่ยนรูปถ่ายนักเรียน'
                                : 'อัปโหลดรูปถ่ายนักเรียน'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingImage}
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.currentTarget.value = '';
                                void handleBySchoolEditPhotoUpload('student', idx, f);
                              }}
                            />
                          </label>
                          {bySchoolEditForm.studentPhotos[idx] && (
                            <div className="flex items-center gap-2">
                              <img
                                src={safeImageUrl(bySchoolEditForm.studentPhotos[idx])}
                                alt="รูปผู้เข้าแข่งขัน"
                                className="w-9 h-9 rounded-lg object-cover object-top border border-amber-200 bg-white"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setBySchoolEditForm((p) => {
                                    if (!p) return null;
                                    const next = [...p.studentPhotos];
                                    next[idx] = '';
                                    return { ...p, studentPhotos: next };
                                  })
                                }
                                className="text-rose-600 hover:underline font-semibold cursor-pointer"
                              >
                                ลบรูป
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Coaches */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700">
                      รายชื่อครูผู้ฝึกสอน (สูงสุด 3 ท่านต่อกิจกรรม • {bySchoolEditForm.coachNames.length}/3) *
                    </label>
                    <button
                      type="button"
                      disabled={bySchoolEditForm.coachNames.length >= 3}
                      onClick={() =>
                        setBySchoolEditForm((p) => {
                          if (!p || p.coachNames.length >= 3) return p;
                          return {
                            ...p,
                            coachNames: [...p.coachNames, ''],
                            coachPhotos: [...p.coachPhotos, '']
                          };
                        })
                      }
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        bySchoolEditForm.coachNames.length >= 3
                          ? 'text-slate-400 cursor-not-allowed'
                          : 'text-emerald-700 hover:text-emerald-800 cursor-pointer'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>
                        {bySchoolEditForm.coachNames.length >= 3 ? 'ครบ 3 ท่านแล้ว' : 'เพิ่มครูผู้ฝึกสอน'}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {bySchoolEditForm.coachNames.map((cName, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-3 flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            required={idx === 0}
                            value={cName}
                            onChange={(e) =>
                              setBySchoolEditForm((p) => {
                                if (!p) return null;
                                const next = [...p.coachNames];
                                next[idx] = e.target.value;
                                return { ...p, coachNames: next };
                              })
                            }
                            placeholder={`ชื่อ-นามสกุล ครูผู้ฝึกสอนคนที่ ${idx + 1}`}
                            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500"
                          />
                          {bySchoolEditForm.coachNames.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                setBySchoolEditForm((p) =>
                                  p && p.coachNames.length > 1
                                    ? {
                                        ...p,
                                        coachNames: p.coachNames.filter((_, i) => i !== idx),
                                        coachPhotos: p.coachPhotos.filter((_, i) => i !== idx)
                                      }
                                    : p
                                )
                              }
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
                            <span>
                              {bySchoolEditForm.coachPhotos[idx]
                                ? 'เปลี่ยนรูปถ่ายครูผู้ฝึกสอน'
                                : 'อัปโหลดรูปถ่ายครูผู้ฝึกสอน'}
                            </span>
                            <input
                              type="file"
                              accept="image/*"
                              disabled={isUploadingImage}
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                e.currentTarget.value = '';
                                void handleBySchoolEditPhotoUpload('coach', idx, f);
                              }}
                            />
                          </label>
                          {bySchoolEditForm.coachPhotos[idx] && (
                            <div className="flex items-center gap-2">
                              <img
                                src={safeImageUrl(bySchoolEditForm.coachPhotos[idx])}
                                alt="รูปครูผู้ฝึกสอน"
                                className="w-9 h-9 rounded-lg object-cover object-top border border-emerald-200 bg-white"
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setBySchoolEditForm((p) => {
                                    if (!p) return null;
                                    const next = [...p.coachPhotos];
                                    next[idx] = '';
                                    return { ...p, coachPhotos: next };
                                  })
                                }
                                className="text-rose-600 hover:underline font-semibold cursor-pointer"
                              >
                                ลบรูป
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Songs for Folk Song Competitions */}
                {editComp.requiresSongs && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-sky-50/70 border border-sky-200 p-4">
                    <div>
                      <label className="block text-xs font-bold text-sky-900 mb-1 flex items-center gap-1.5">
                        <Music className="w-3.5 h-3.5" />
                        <span>เพลงรอบคัดเลือก *</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={bySchoolEditForm.qualifyingSong}
                        onChange={(e) =>
                          setBySchoolEditForm((p) =>
                            p ? { ...p, qualifyingSong: e.target.value } : null
                          )
                        }
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
                        value={bySchoolEditForm.finalSong}
                        onChange={(e) =>
                          setBySchoolEditForm((p) =>
                            p ? { ...p, finalSong: e.target.value } : null
                          )
                        }
                        placeholder="ระบุชื่อเพลงรอบตัดสิน"
                        className="w-full rounded-xl border border-sky-200 bg-white px-3.5 py-2 text-sm outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setBySchoolEditForm(null)}
                    className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold px-4 py-2.5 text-sm cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-bold px-5 py-2.5 text-sm shadow-md cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>บันทึกการแก้ไข</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* Print / PDF Preview Modal (Real PDF Download + Direct Print) */}
      {printPreviewModal && (
        <div
          onClick={() => {
            if (!isGeneratingPdf) setPrintPreviewModal(null);
          }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 backdrop-blur-sm p-3 sm:p-6 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-emerald-800 via-emerald-700 to-teal-700 px-5 py-3.5 text-white shrink-0">
              <div className="flex items-center gap-2.5 min-w-0">
                <FileText className="w-5 h-5 text-amber-300 shrink-0" />
                <div className="min-w-0">
                  <h3 className="text-sm sm:text-base font-bold truncate">
                    {printPreviewModal.title}
                  </h3>
                  <div className="text-[11px] text-emerald-100 hidden sm:block">
                    {isGeneratingPdf && pdfProgressText
                      ? pdfProgressText
                      : 'กด "พิมพ์เอกสาร" เพื่อสั่งพิมพ์ไปยังเครื่องพิมพ์โดยตรง หรือกด "ดาวน์โหลด PDF"'}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => handleDownloadActualPdf(printPreviewModal)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs sm:text-sm font-bold shadow-sm transition ${
                    isGeneratingPdf
                      ? 'bg-amber-200 text-slate-700 cursor-wait'
                      : 'bg-amber-400 hover:bg-amber-300 text-slate-900 cursor-pointer'
                  }`}
                >
                  {isGeneratingPdf ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  <span>{isGeneratingPdf ? pdfProgressText || 'กำลังสร้าง PDF...' : 'ดาวน์โหลด PDF (.pdf)'}</span>
                </button>
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => handlePrintDocument(printPreviewModal)}
                  title="สั่งพิมพ์เอกสารไปยังเครื่องพิมพ์โดยตรง"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-900 px-3.5 py-2 text-xs sm:text-sm font-bold shadow-sm transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>พิมพ์เอกสาร</span>
                </button>
                <button
                  type="button"
                  disabled={isGeneratingPdf}
                  onClick={() => setPrintPreviewModal(null)}
                  className="inline-flex items-center gap-1 rounded-xl bg-rose-500/80 hover:bg-rose-500 text-white px-3 py-2 text-xs sm:text-sm font-bold transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                  <span>ปิด</span>
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-200 overflow-hidden">
              <iframe
                ref={printIframeRef}
                title={printPreviewModal.title}
                srcDoc={printPreviewModal.htmlDoc}
                className="w-full h-full border-0 bg-slate-200"
              />
            </div>
          </div>
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

      {/* Confirm Restore JSON Backup Modal */}
      {restoreConfirmData && (
        <div
          onClick={() => { if (!isRestoringBackup) setRestoreConfirmData(null); }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-white shadow-2xl border border-slate-100 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-6 py-5 text-white">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-extrabold flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  <span>ยืนยันการนำเข้าไฟล์สำรองข้อมูล</span>
                </h3>
                <button
                  type="button"
                  disabled={isRestoringBackup}
                  onClick={() => setRestoreConfirmData(null)}
                  className="rounded-full bg-white/20 hover:bg-white/30 p-1 text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-amber-100 mt-1 truncate">
                ไฟล์: {restoreConfirmData.filename}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-xs text-amber-900 space-y-1.5">
                <div className="font-bold text-sm">ข้อมูลที่จะนำเข้าสู่ระบบ:</div>
                <div>• โรงเรียน: <strong>{restoreConfirmData.schoolsCount}</strong> แห่ง</div>
                <div>• ทีมสมัครแข่งขัน: <strong>{restoreConfirmData.registrationsCount}</strong> ทีม</div>
                <div>• คณะกรรมการ: <strong>{restoreConfirmData.judgesCount}</strong> ท่าน</div>
              </div>
              <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-3 leading-relaxed">
                ⚠ การกู้คืนจะเขียนทับข้อมูลปัจจุบันบนเซิร์ฟเวอร์ด้วยข้อมูลจากไฟล์สำรอง (บัญชีผู้ดูแลระบบปัจจุบันจะยังคงอยู่เพื่อป้องกันการหลุดออกจากระบบ)
              </p>
              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  disabled={isRestoringBackup}
                  onClick={() => setRestoreConfirmData(null)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 text-sm transition cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="button"
                  disabled={isRestoringBackup}
                  onClick={() => void handleConfirmRestoreBackup()}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white font-bold py-2.5 text-sm shadow-sm transition cursor-pointer"
                >
                  {isRestoringBackup && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>ยืนยันกู้คืนข้อมูล</span>
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

          <button
            type="button"
            onClick={() => setDesktopSidebarOpen((prev) => !prev)}
            className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer"
            aria-label={desktopSidebarOpen ? 'ซ่อนแถบเมนูด้านข้าง' : 'แสดงแถบเมนูด้านข้าง'}
            title={desktopSidebarOpen ? 'ซ่อนแถบเมนูด้านข้าง' : 'แสดงแถบเมนูด้านข้าง'}
          >
            {desktopSidebarOpen ? (
              <PanelLeftClose className="w-5 h-5" />
            ) : (
              <>
                <PanelLeftOpen className="w-5 h-5" />
                <span>แสดงเมนู</span>
              </>
            )}
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
            <div className="relative z-50">
              <button
                type="button"
                onClick={() => setTopLoginMenuOpen((prev) => !prev)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white text-emerald-700 hover:bg-emerald-50 px-3.5 py-2 text-xs font-bold shadow-sm cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>เข้าสู่ระบบ</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {topLoginMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setTopLoginMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 rounded-2xl bg-white border border-slate-200 shadow-xl p-1.5 z-50 space-y-1 text-slate-700">
                    <button
                      type="button"
                      onClick={() => handleSelectMenu('login-admin')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-orange-50 hover:text-orange-700 transition text-left cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
                      <span>ผู้ดูแลระบบ</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMenu('login-manager')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-violet-50 hover:text-violet-700 transition text-left cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-violet-600 shrink-0" />
                      <span>ผู้จัดการแข่งขัน</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMenu('login-registrar')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-indigo-50 hover:text-indigo-700 transition text-left cursor-pointer"
                    >
                      <ClipboardCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                      <span>เจ้าหน้าที่ลงทะเบียน</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMenu('login-school')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-emerald-50 hover:text-emerald-700 transition text-left cursor-pointer"
                    >
                      <School className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>ระบบโรงเรียน</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSelectMenu('login-judge')}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold hover:bg-sky-50 hover:text-sky-700 transition text-left cursor-pointer"
                    >
                      <Gavel className="w-4 h-4 text-sky-600 shrink-0" />
                      <span>ระบบกรรมการ</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 flex relative">
        {/* Sidebar (Collapsible Desktop + Mobile Drawer) */}
        <aside
          className={`${
            mobileMenuOpen ? 'max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:top-[61px] max-lg:z-40 w-72 flex flex-col' : 'hidden'
          } ${
            desktopSidebarOpen ? 'lg:flex lg:flex-col lg:w-72' : 'lg:hidden'
          } shrink-0 bg-white border-r border-slate-200/80 p-4 overflow-y-auto`}
        >
          <div>
            <div className="flex items-center justify-between gap-2 px-3 mb-2">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                เมนูหลัก ({authSession.role === 'judge' ? 'โหมดกรรมการ' : authSession.role === 'admin' ? 'โหมดผู้ดูแลระบบ' : authSession.role === 'manager' ? 'โหมดผู้จัดการแข่งขัน' : authSession.role === 'registrar' ? 'โหมดเจ้าหน้าที่ลงทะเบียน' : authSession.role === 'school' ? 'โหมดโรงเรียน' : 'ทั่วไป'})
              </div>
              <button
                type="button"
                onClick={() => setDesktopSidebarOpen(false)}
                className="hidden lg:inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
                title="ซ่อนแถบเมนูด้านข้าง"
                aria-label="ซ่อนแถบเมนูด้านข้าง"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
                <span>ซ่อน</span>
              </button>
            </div>
            <nav className="space-y-1">
              {allMenuItems
                .filter((item) => item.id !== 'login')
                .map((item) => {
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

          {/* Sidebar: สถานะของผู้ใช้ และปุ่มเข้าสู่ระบบแยกตามบทบาท */}
          <div className="mt-4 pt-4 border-t border-slate-200/80">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2">
              สถานะของผู้ใช้
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-slate-50 to-amber-50/60 border border-slate-200/90 p-3.5 space-y-3 shadow-xs">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-white shadow-xs ${
                    authSession.role === 'admin'
                      ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                      : authSession.role === 'manager'
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600'
                      : authSession.role === 'registrar'
                      ? 'bg-gradient-to-br from-indigo-500 to-blue-600'
                      : authSession.role === 'school'
                      ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                      : authSession.role === 'judge'
                      ? 'bg-gradient-to-br from-sky-500 to-indigo-600'
                      : 'bg-slate-400'
                  }`}
                >
                  {authSession.role === 'admin' ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : authSession.role === 'manager' ? (
                    <FileText className="w-5 h-5" />
                  ) : authSession.role === 'registrar' ? (
                    <ClipboardCheck className="w-5 h-5" />
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
                        : authSession.role === 'manager'
                        ? 'ผู้จัดการแข่งขัน'
                        : authSession.role === 'registrar'
                        ? 'เจ้าหน้าที่ลงทะเบียน'
                        : authSession.role === 'school'
                        ? `โรงเรียน (${currentSchool?.schoolCode || 'School'})`
                        : authSession.role === 'judge'
                        ? 'กรรมการตัดสิน'
                        : 'ยังไม่ได้เข้าสู่ระบบ'}
                    </span>
                  </div>
                </div>
              </div>

              {authSession.role !== 'guest' && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ออกจากระบบ</span>
                </button>
              )}

              <div className="pt-2 border-t border-slate-200/80 space-y-1">
                {[
                  { id: 'login-admin', label: 'ผู้ดูแลระบบ', icon: ShieldCheck, activeCls: 'bg-orange-100/80 text-orange-800 border-orange-300', iconCls: 'text-orange-600' },
                  { id: 'login-manager', label: 'ผู้จัดการแข่งขัน', icon: FileText, activeCls: 'bg-violet-100/80 text-violet-800 border-violet-300', iconCls: 'text-violet-600' },
                  { id: 'login-registrar', label: 'เจ้าหน้าที่ลงทะเบียน', icon: ClipboardCheck, activeCls: 'bg-indigo-100/80 text-indigo-800 border-indigo-300', iconCls: 'text-indigo-600' },
                  { id: 'login-school', label: 'ระบบโรงเรียน', icon: School, activeCls: 'bg-emerald-100/80 text-emerald-800 border-emerald-300', iconCls: 'text-emerald-600' },
                  { id: 'login-judge', label: 'ระบบกรรมการ', icon: Gavel, activeCls: 'bg-sky-100/80 text-sky-800 border-sky-300', iconCls: 'text-sky-600' }
                ].map((sub) => {
                  const SubIcon = sub.icon;
                  const subActive = activeMenu === sub.id;
                  return (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => handleSelectMenu(sub.id)}
                      className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs font-bold transition text-left cursor-pointer border ${
                        subActive
                          ? sub.activeCls
                          : 'border-transparent bg-white/70 text-slate-600 hover:bg-white hover:text-slate-900'
                      }`}
                    >
                      <SubIcon className={`w-3.5 h-3.5 shrink-0 ${sub.iconCls}`} />
                      <span className="truncate">{sub.label}</span>
                    </button>
                  );
                })}
              </div>
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