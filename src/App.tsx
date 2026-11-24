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
  UserX
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { toCanvas } from 'html-to-image';

// ============================================================================
// 1. MASTER DATA, TYPES & CONSTANTS (รายการแข่งขัน 10 รายการ & ระดับชั้น)
// ============================================================================

type RoleType = 'guest' | 'admin' | 'school' | 'judge';

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
  photoUrl: string;
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

interface CriterionItem {
  key: string;
  label: string;
  max: number;
  maxLabel?: string;
}

interface EvalMetaItem {
  status: string;
  approved: boolean;
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

interface PrintPreviewDocument {
  title: string;
  bodyHtml: string;
  pageSizeCss: string;
  extraStyleCss: string;
  htmlDoc: string;
}

const STORAGE_KEY = 'makhapuja_2570_dashboard_v1';
const CORE_STORAGE_KEY = 'makhapuja_2570_core_v1';
const SESSION_STORAGE_KEY = 'makhapuja_2570_session_v1';

type BackgroundKey =
  | 'bannerBgUrl'
  | 'studentCardBgUrl'
  | 'coachCardBgUrl'
  | 'judgeCardBgUrl'
  | 'certBgUrl';

const BG_STORAGE_KEYS: Record<BackgroundKey, string> = {
  bannerBgUrl: 'makhapuja_2570_bg_banner',
  studentCardBgUrl: 'makhapuja_2570_bg_student_card',
  coachCardBgUrl: 'makhapuja_2570_bg_coach_card',
  judgeCardBgUrl: 'makhapuja_2570_bg_judge_card',
  certBgUrl: 'makhapuja_2570_bg_cert'
};

const MEDIA_DB_NAME = 'makhapuja_2570_media_db';
const MEDIA_STORE_NAME = 'backgrounds';

function openMediaDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(MEDIA_DB_NAME, 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(MEDIA_STORE_NAME)) {
          db.createObjectStore(MEDIA_STORE_NAME, { keyPath: 'key' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function saveBackgroundToIdb(key: BackgroundKey, dataUrl: string): Promise<boolean> {
  const db = await openMediaDb();
  if (!db) return false;
  return await new Promise<boolean>((resolve) => {
    try {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readwrite');
      const store = tx.objectStore(MEDIA_STORE_NAME);
      if (dataUrl) {
        store.put({ key, dataUrl, updatedAt: Date.now() });
      } else {
        store.delete(key);
      }
      tx.oncomplete = () => {
        db.close();
        resolve(true);
      };
      tx.onerror = () => {
        db.close();
        resolve(false);
      };
      tx.onabort = () => {
        db.close();
        resolve(false);
      };
    } catch {
      db.close();
      resolve(false);
    }
  });
}

async function loadAllBackgroundsFromIdb(): Promise<Partial<Record<BackgroundKey, string>>> {
  const db = await openMediaDb();
  if (!db) return {};
  return await new Promise<Partial<Record<BackgroundKey, string>>>((resolve) => {
    try {
      const tx = db.transaction(MEDIA_STORE_NAME, 'readonly');
      const store = tx.objectStore(MEDIA_STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const result: Partial<Record<BackgroundKey, string>> = {};
        const items = Array.isArray(req.result) ? req.result : [];
        items.forEach((item: { key?: string; dataUrl?: string }) => {
          if (item?.key && typeof item.dataUrl === 'string' && item.key in BG_STORAGE_KEYS) {
            result[item.key as BackgroundKey] = item.dataUrl;
          }
        });
        db.close();
        resolve(result);
      };
      req.onerror = () => {
        db.close();
        resolve({});
      };
    } catch {
      db.close();
      resolve({});
    }
  });
}

function saveBackgroundCache(key: BackgroundKey, dataUrl: string): boolean {
  try {
    const lsKey = BG_STORAGE_KEYS[key];
    if (!dataUrl) {
      localStorage.removeItem(lsKey);
    } else {
      localStorage.setItem(lsKey, dataUrl);
    }
    return true;
  } catch {
    return false;
  }
}

function loadBackgroundCache(key: BackgroundKey): string {
  try {
    return localStorage.getItem(BG_STORAGE_KEYS[key]) || '';
  } catch {
    return '';
  }
}

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

function safeImageUrl(value: unknown): string {
  const str = String(value ?? '').trim();
  if (!str) return '';
  if (/^data:image\/(png|jpeg|jpg|gif|webp|svg\+xml)(?:;charset=[^;,]+)?;base64,[A-Za-z0-9+/=]+$/i.test(str)) {
    return str;
  }
  if (/^(https?:\/\/|\/)/i.test(str) && !/["'<>`\\]/.test(str)) {
    return str;
  }
  return '';
}

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

const INITIAL_JUDGES: JudgeItem[] = [
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
function calculateNormalizedScore(scoresObj?: Record<string, number>) {
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
  const thaiBodyHtml = convertHtmlTextToThaiDigits(bodyHtml);
  return `
      <!DOCTYPE html>
      <html lang="th">
      <head>
        <meta charset="UTF-8" />
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

export default function App() {
  const savedState = useMemo(() => {
    try {
      const rawFull = localStorage.getItem(STORAGE_KEY);
      const rawCore = localStorage.getItem(CORE_STORAGE_KEY);
      const fullParsed = rawFull ? JSON.parse(rawFull) : null;
      const coreParsed = rawCore ? JSON.parse(rawCore) : null;
      const merged =
        fullParsed && coreParsed
          ? { ...fullParsed, ...coreParsed }
          : coreParsed || fullParsed || {};
      return {
        ...merged,
        bannerBgUrl: loadBackgroundCache('bannerBgUrl') || merged?.bannerBgUrl || '',
        studentCardBgUrl: loadBackgroundCache('studentCardBgUrl') || merged?.studentCardBgUrl || '',
        coachCardBgUrl: loadBackgroundCache('coachCardBgUrl') || merged?.coachCardBgUrl || '',
        judgeCardBgUrl: loadBackgroundCache('judgeCardBgUrl') || merged?.judgeCardBgUrl || '',
        certBgUrl: loadBackgroundCache('certBgUrl') || merged?.certBgUrl || ''
      };
    } catch {
      return null;
    }
  }, []);

  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>(() => {
    const savedAdmin = savedState?.adminCredentials;
    if (
      savedAdmin &&
      typeof savedAdmin.username === 'string' &&
      typeof savedAdmin.password === 'string' &&
      savedAdmin.username.trim() &&
      savedAdmin.password.trim()
    ) {
      return {
        username: savedAdmin.username.trim(),
        password: savedAdmin.password,
        displayName: String(savedAdmin.displayName || 'พระบุญทัน ธมฺมธาตา (Admin)')
      };
    }
    return {
      username: 'admin',
      password: '1234',
      displayName: 'พระบุญทัน ธมฺมธาตา (Admin)'
    };
  });

  // ---------------- Session & Navigation State ----------------
  // role: 'guest' | 'admin' | 'school' | 'judge'
  const [rememberLogin, setRememberLogin] = useState<boolean>(true);
  const [authSession, setAuthSession] = useState<AuthSession>(() => {
    try {
      const rawSession = localStorage.getItem(SESSION_STORAGE_KEY);
      if (rawSession) {
        const parsed = JSON.parse(rawSession) as AuthSession;
        if (parsed && (parsed.role === 'admin' || parsed.role === 'school' || parsed.role === 'judge')) {
          return parsed;
        }
      }
    } catch {
      // ignore invalid stored session
    }
    return {
      role: 'guest',
      userId: null,
      displayName: 'ผู้เยี่ยมชมทั่วไป',
      schoolId: null,
      judgeId: null
    };
  });

  const [activeMenu, setActiveMenu] = useState<string>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState<boolean>(true);
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

      const imgs = Array.from(wrap.querySelectorAll('img'));
      if (imgs.length > 0) {
        await Promise.race([
          Promise.all(
            imgs.map(
              (img) =>
                new Promise<void>((resolve) => {
                  if (img.complete) {
                    if (typeof img.decode === 'function') {
                      img.decode().catch(() => {}).finally(resolve);
                    } else {
                      resolve();
                    }
                    return;
                  }
                  img.onload = () => resolve();
                  img.onerror = () => resolve();
                })
            )
          ),
          new Promise<void>((resolve) => setTimeout(resolve, 3000))
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
  const [registrationOpen, setRegistrationOpen] = useState<boolean>(() =>
    typeof savedState?.registrationOpen === 'boolean' ? savedState.registrationOpen : true
  );
  const [menuPermissions, setMenuPermissions] = useState<Record<string, boolean>>(() =>
    savedState?.menuPermissions && typeof savedState.menuPermissions === 'object'
      ? {
          'student-card': true,
          'coach-card': true,
          'judge-card': true,
          'judge-cert': true,
          'school-cert': true,
          'school-results': true,
          'results': true,
          ...savedState.menuPermissions
        }
      : {
          'student-card': true,
          'coach-card': true,
          'judge-card': true,
          'judge-cert': true,
          'school-cert': true,
          'school-results': true,
          'results': true
        }
  );
  const [bannerBgUrl, setBannerBgUrl] = useState<string>(() => savedState?.bannerBgUrl || '');
  const [studentCardBgUrl, setStudentCardBgUrl] = useState<string>(() => savedState?.studentCardBgUrl || '');
  const [coachCardBgUrl, setCoachCardBgUrl] = useState<string>(() => savedState?.coachCardBgUrl || '');
  const [judgeCardBgUrl, setJudgeCardBgUrl] = useState<string>(() => savedState?.judgeCardBgUrl || '');
  const [certBgUrl, setCertBgUrl] = useState<string>(() => savedState?.certBgUrl || '');

  // ---------------- Core Domain Entities ----------------
  const [schools, setSchools] = useState<SchoolItem[]>(() =>
    Array.isArray(savedState?.schools) ? savedState.schools : INITIAL_SCHOOLS
  );
  const [judges, setJudges] = useState<JudgeItem[]>(() =>
    Array.isArray(savedState?.judges) ? savedState.judges : INITIAL_JUDGES
  );
  const [schedules, setSchedules] = useState<Record<string, ScheduleItem>>(() =>
    savedState?.schedules && typeof savedState.schedules === 'object'
      ? savedState.schedules
      : buildInitialSchedules()
  );
  const [registrations, setRegistrations] = useState<RegistrationItem[]>(() =>
    Array.isArray(savedState?.registrations) ? savedState.registrations : INITIAL_REGISTRATIONS
  );
  const [scores, setScores] = useState<ScoresMap>(() =>
    savedState?.scores && typeof savedState.scores === 'object' ? savedState.scores : INITIAL_SCORES
  );
  const [scoreCriteriaDetails, setScoreCriteriaDetails] = useState<ScoreCriteriaDetailsMap>(() =>
    savedState?.scoreCriteriaDetails && typeof savedState.scoreCriteriaDetails === 'object'
      ? savedState.scoreCriteriaDetails
      : INITIAL_SCORE_CRITERIA
  );
  const [evalMeta, setEvalMeta] = useState<EvalMetaMap>(() =>
    savedState?.evalMeta && typeof savedState.evalMeta === 'object'
      ? savedState.evalMeta
      : INITIAL_EVAL_META
  );
  const [absentRegs, setAbsentRegs] = useState<Record<string, boolean>>(() =>
    savedState?.absentRegs && typeof savedState.absentRegs === 'object'
      ? savedState.absentRegs
      : {}
  );

  // ---------------- UI Filters & Modals ----------------
  const [toast, setToast] = useState<ToastState | null>(null);
  const [closedMenuModal, setClosedMenuModal] = useState<ClosedMenuModalState | null>(null);
  const [customCriteriaByComp, setCustomCriteriaByComp] = useState<Record<string, CriterionItem[]>>(() => {
    if (savedState?.customCriteriaByComp && typeof savedState.customCriteriaByComp === 'object') {
      return savedState.customCriteriaByComp;
    }
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
  const [loginTab, setLoginTab] = useState<'admin' | 'school' | 'judge'>('school');
  const [schoolAuthMode, setSchoolAuthMode] = useState<'login' | 'register'>('login');

  // Filter states for various menus
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('ทั้งหมด');
  const [selectedCompFilter, setSelectedCompFilter] = useState<string>('all');
  const [selectedSchoolFilter, setSelectedSchoolFilter] = useState<string>('all');
  const [adminCompManageId, setAdminCompManageId] = useState<string>(COMPETITIONS[0].id);
  const [adminCompManageLevel, setAdminCompManageLevel] = useState<string>('ทั้งหมด');
  const [adminCompManageTab, setAdminCompManageTab] = useState<'sheets' | 'criteria'>('sheets');
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
    photoUrl: string;
  }>({
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
  const [draftCriteriaScores, setDraftCriteriaScores] = useState<Record<string, Record<string, number | ''>>>({});
  // Track which team cards are currently in edit mode after being saved: unlockedScoreCards[regId] = boolean
  const [unlockedScoreCards, setUnlockedScoreCards] = useState<Record<string, boolean>>({});

  const idbBgHydratedRef = useRef<boolean>(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      const storedBgs = await loadAllBackgroundsFromIdb();
      if (cancelled) return;

      const entries: Array<{
        key: BackgroundKey;
        current: string;
        setter: React.Dispatch<React.SetStateAction<string>>;
      }> = [
        { key: 'bannerBgUrl', current: bannerBgUrl, setter: setBannerBgUrl },
        { key: 'studentCardBgUrl', current: studentCardBgUrl, setter: setStudentCardBgUrl },
        { key: 'coachCardBgUrl', current: coachCardBgUrl, setter: setCoachCardBgUrl },
        { key: 'judgeCardBgUrl', current: judgeCardBgUrl, setter: setJudgeCardBgUrl },
        { key: 'certBgUrl', current: certBgUrl, setter: setCertBgUrl }
      ];

      for (const item of entries) {
        const fromIdb = storedBgs[item.key];
        if (fromIdb) {
          item.setter((prev) => prev || fromIdb);
          saveBackgroundCache(item.key, fromIdb);
        } else if (item.current) {
          await saveBackgroundToIdb(item.key, item.current);
          saveBackgroundCache(item.key, item.current);
        }
      }

      idbBgHydratedRef.current = true;
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    const corePayload = {
      adminCredentials,
      registrationOpen,
      menuPermissions,
      schools,
      judges,
      schedules,
      registrations,
      scores,
      scoreCriteriaDetails,
      evalMeta,
      absentRegs,
      customCriteriaByComp
    };
    let coreSaved = false;
    try {
      localStorage.setItem(CORE_STORAGE_KEY, JSON.stringify(corePayload));
      coreSaved = true;
    } catch {
      // If registrations with large photos still exceed quota, save stripped core fallback
      try {
        const compactRegs = registrations.map((r) => ({
          ...r,
          students: r.students.map((st) => ({ ...st, photoUrl: '' })),
          coaches: r.coaches.map((c) => (typeof c === 'string' ? c : { ...c, photoUrl: '' }))
        }));
        localStorage.setItem(CORE_STORAGE_KEY, JSON.stringify({ ...corePayload, registrations: compactRegs }));
        coreSaved = true;
      } catch {
        // Ignore if storage completely blocked
      }
    }

    // Remove legacy combined STORAGE_KEY copy once corePayload + backgrounds are safely stored separately
    if (coreSaved && idbBgHydratedRef.current) {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignore
      }
    }
  }, [
    adminCredentials,
    registrationOpen,
    menuPermissions,
    schools,
    judges,
    schedules,
    registrations,
    scores,
    scoreCriteriaDetails,
    evalMeta,
    absentRegs,
    customCriteriaByComp
  ]);

  React.useEffect(() => {
    const bgPairs: Array<[BackgroundKey, string]> = [
      ['bannerBgUrl', bannerBgUrl],
      ['studentCardBgUrl', studentCardBgUrl],
      ['coachCardBgUrl', coachCardBgUrl],
      ['judgeCardBgUrl', judgeCardBgUrl],
      ['certBgUrl', certBgUrl]
    ];
    bgPairs.forEach(([key, val]) => {
      saveBackgroundCache(key, val);
      if (idbBgHydratedRef.current) {
        void saveBackgroundToIdb(key, val);
      }
    });
  }, [bannerBgUrl, studentCardBgUrl, coachCardBgUrl, judgeCardBgUrl, certBgUrl]);

  React.useEffect(() => {
    try {
      if (authSession.role === 'guest' || !rememberLogin) {
        localStorage.removeItem(SESSION_STORAGE_KEY);
      } else {
        localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(authSession));
      }
    } catch {
      // Ignore storage errors cleanly
    }
  }, [authSession, rememberLogin]);

  // Verify persisted session matches existing schools/judges and keep displayName synced
  React.useEffect(() => {
    if (authSession.role === 'school') {
      const matched = schools.find((s) => s.id === authSession.schoolId);
      if (!matched) {
        setAuthSession({
          role: 'guest',
          userId: null,
          displayName: 'ผู้เยี่ยมชมทั่วไป',
          schoolId: null,
          judgeId: null
        });
      } else if (matched.name !== authSession.displayName) {
        setAuthSession((prev) => ({ ...prev, displayName: matched.name }));
      }
    } else if (authSession.role === 'judge') {
      const matched = judges.find((j) => j.id === authSession.judgeId);
      if (!matched) {
        setAuthSession({
          role: 'guest',
          userId: null,
          displayName: 'ผู้เยี่ยมชมทั่วไป',
          schoolId: null,
          judgeId: null
        });
      } else if (matched.name !== authSession.displayName) {
        setAuthSession((prev) => ({ ...prev, displayName: matched.name }));
      }
    } else if (authSession.role === 'admin' && adminCredentials.displayName !== authSession.displayName) {
      setAuthSession((prev) => ({ ...prev, displayName: adminCredentials.displayName }));
    }
  }, [schools, judges, adminCredentials.displayName, authSession.role, authSession.schoolId, authSession.judgeId, authSession.displayName]);

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
      { id: 'school-results', baseLabel: 'ผลคะแนนของโรงเรียน', icon: Trophy, roles: ['admin', 'school'] },
      { id: 'results', baseLabel: 'ประกาศผลคะแนน', icon: Trophy, roles: ['guest', 'admin', 'judge'] },
      { id: 'admin-competition-manage', baseLabel: 'การจัดการแข่งขัน', icon: FileText, roles: ['admin'] },
      { id: 'admin-manage', baseLabel: 'จัดการระบบ (Admin)', icon: ShieldCheck, roles: ['admin'] },
      { id: 'judge-scoring', baseLabel: 'ลงคะแนนตัดสิน (กรรมการ)', icon: Gavel, roles: ['judge'] },
      { id: 'judge-absent', baseLabel: 'แจ้งไม่เข้าร่วมแข่งขัน', icon: UserX, roles: ['judge'] },
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

  const handleSelectMenu = (menuId: string) => {
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
    if (menuId === 'login') {
      setLoginError('');
      if (activeMenu && activeMenu !== 'login' && activeMenu !== 'home') {
        setPostLoginRedirect(activeMenu);
      }
    }
    setActiveMenu(menuId);
    setMobileMenuOpen(false);
    if (menuId === 'judge-scoring' && currentJudge) {
      const criteriaList =
        currentJudge.competitionId === 'comp-7'
          ? [{ key: 'correctAnswers', label: 'จำนวนข้อสอบที่ตอบถูกต้อง (ลงคะแนนตามข้อที่ตอบถูก)', max: 100, maxLabel: '100 ข้อ/คะแนน' }]
          : getCompetitionCriteria(currentJudge.competitionId, customCriteriaByComp);
      const initialDraft: Record<string, Record<string, number | ''>> = {};
      registrations
        .filter((r) => r.competitionId === currentJudge.competitionId && r.level === currentJudge.level)
        .forEach((r) => {
          const existingDetail = scoreCriteriaDetails[r.id]?.[currentJudge.id];
          const existingTotal = scores[r.id]?.[currentJudge.id];
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
      setDraftCriteriaScores(initialDraft);
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
        'admin-competition-manage',
        'admin-manage',
        'competitions',
        'schedule'
      ],
      school: ['register', 'by-school', 'by-activity', 'student-card', 'coach-card', 'school-cert', 'school-results', 'competitions', 'schedule'],
      judge: ['judge-card', 'judge-cert', 'judge-scoring', 'judge-absent', 'results', 'competitions', 'schedule']
    };
    const allowed = roleAllowedMenus[role] || [];
    return allowed.includes(postLoginRedirect) ? postLoginRedirect : fallbackMenu;
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
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

    if (loginTab === 'admin') {
      if (u === adminCredentials.username && p === adminCredentials.password) {
        setAuthSession({
          role: 'admin',
          userId: 'admin-01',
          displayName: adminCredentials.displayName,
          schoolId: null,
          judgeId: null
        });
        setLoginUser('');
        setLoginPass('');
        setShowLoginPass(false);
        const dest = resolvePostLoginMenu('admin', 'admin-manage');
        setPostLoginRedirect(null);
        setActiveMenu(dest);
        showToast(`เข้าสู่ระบบผู้ดูแลระบบสำเร็จ (${adminCredentials.displayName})`);
      } else {
        const msg = 'ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง';
        setLoginError(msg);
        showToast(msg, 'error');
      }
      return;
    }

    if (loginTab === 'school') {
      const found = schools.find((s) => s.schoolCode.trim() === u && s.password === p);
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
        setShowLoginPass(false);
        const dest = resolvePostLoginMenu('school', 'by-school');
        setPostLoginRedirect(null);
        setActiveMenu(dest);
        showToast(`ยินดีต้อนรับ ${found.name}`);
      } else {
        const msg = 'รหัสสถานศึกษาหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง';
        setLoginError(msg);
        showToast(msg, 'error');
      }
      return;
    }

    if (loginTab === 'judge') {
      const foundJudge = judges.find((j) => j.username.trim() === u && j.password === p);
      if (foundJudge) {
        setAuthSession({
          role: 'judge',
          userId: foundJudge.id,
          displayName: foundJudge.name,
          schoolId: null,
          judgeId: foundJudge.id
        });
        const criteriaList =
          foundJudge.competitionId === 'comp-7'
            ? [{ key: 'correctAnswers', label: 'จำนวนข้อสอบที่ตอบถูกต้อง (ลงคะแนนตามข้อที่ตอบถูก)', max: 100, maxLabel: '100 ข้อ/คะแนน' }]
            : getCompetitionCriteria(foundJudge.competitionId, customCriteriaByComp);
        const initialDraft: Record<string, Record<string, number | ''>> = {};
        registrations
          .filter((r) => r.competitionId === foundJudge.competitionId && r.level === foundJudge.level)
          .forEach((r) => {
            const existingDetail = scoreCriteriaDetails[r.id]?.[foundJudge.id];
            const existingTotal = scores[r.id]?.[foundJudge.id];
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
        setDraftCriteriaScores(initialDraft);
        setLoginUser('');
        setLoginPass('');
        setShowLoginPass(false);
        const dest = resolvePostLoginMenu('judge', 'judge-scoring');
        setPostLoginRedirect(null);
        setActiveMenu(dest);
        showToast(`เข้าสู่ระบบกรรมการตัดสิน: ${foundJudge.name}`);
      } else {
        const msg = 'Username หรือ Password ของกรรมการไม่ถูกต้อง';
        setLoginError(msg);
        showToast(msg, 'error');
      }
    }
  };

  const handleSchoolSignupSubmit = (e: React.FormEvent) => {
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
    if (schools.some((s) => s.schoolCode.trim() === code)) {
      const msg = 'รหัสสถานศึกษานี้มีในระบบแล้ว (จำกัดโรงเรียนละ ๑ User)';
      setLoginError(msg);
      showToast(msg, 'error');
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
    setSignupConfirmPass('');
    setShowSignupPass(false);
    setShowSignupConfirmPass(false);
    setPostLoginRedirect(null);
    setActiveMenu('register');
    showToast(`สมัครสมาชิกโรงเรียน "${created.name}" สำเร็จ และเข้าสู่ระบบแล้ว`);
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
      // ignore storage errors
    }
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
      if (authSession.role === 'admin' && existingReg.schoolId) {
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
    const compressed = await compressImageFile(file, 600, 0.85);
    setRegForm((prev) => {
      const nextPhotos = [...prev.studentPhotos];
      nextPhotos[idx] = compressed;
      return { ...prev, studentPhotos: nextPhotos };
    });
  };

  const handleCoachPhotoUpload = async (idx: number, file?: File) => {
    if (!file) return;
    const compressed = await compressImageFile(file, 600, 0.85);
    setRegForm((prev) => {
      const nextPhotos = [...prev.coachPhotos];
      nextPhotos[idx] = compressed;
      return { ...prev, coachPhotos: nextPhotos };
    });
  };

  const handleRegistrationSubmit = (e: React.FormEvent) => {
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

    if (regForm.editingId) {
      const editId = regForm.editingId;
      setRegistrations((prev) =>
        prev.map((r) =>
          r.id === editId
            ? {
                ...r,
                schoolId: authSession.role === 'admin' ? targetSchoolId : r.schoolId,
                competitionId: regForm.competitionId,
                level: resolvedLevel,
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
        level: resolvedLevel,
        students: cleanedStudents,
        coaches: cleanedCoaches.length > 0 ? cleanedCoaches : [{ name: 'ครูผู้ฝึกสอน', photoUrl: '' }],
        qualifyingSong: comp?.requiresSongs ? regForm.qualifyingSong.trim() : '',
        finalSong: comp?.requiresSongs ? regForm.finalSong.trim() : ''
      };
      setRegistrations((prev) => [...prev, createdReg]);
      showToast('บันทึกการสมัครแข่งขันเรียบร้อยแล้ว');
    }

    prepareRegistrationForm(regForm.competitionId, resolvedLevel, null);
  };

  const handleDeleteRegistration = (regId: string) => {
    setRegistrations((prev) => prev.filter((r) => r.id !== regId));
    setAbsentRegs((prev) => {
      if (!prev[regId]) return prev;
      const next = { ...prev };
      delete next[regId];
      return next;
    });
    setScores((prev) => {
      if (!prev[regId]) return prev;
      const next = { ...prev };
      delete next[regId];
      return next;
    });
    setScoreCriteriaDetails((prev) => {
      if (!prev[regId]) return prev;
      const next = { ...prev };
      delete next[regId];
      return next;
    });
    if (bySchoolEditForm?.id === regId) {
      setBySchoolEditForm(null);
    }
    setConfirmDeleteRegId(null);
    showToast('ลบรายการสมัครเรียบร้อยแล้ว');
  };

  const openBySchoolEditModal = (reg: RegistrationItem) => {
    const canEdit =
      authSession.role === 'admin' ||
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
    const dataUrl = await compressImageFile(file, 600, 0.85);
    setBySchoolEditForm((prev) => {
      if (!prev) return null;
      if (kind === 'student') {
        const next = [...prev.studentPhotos];
        next[idx] = dataUrl;
        return { ...prev, studentPhotos: next };
      }
      const next = [...prev.coachPhotos];
      next[idx] = dataUrl;
      return { ...prev, coachPhotos: next };
    });
  };

  const handleBySchoolEditSave = (e: React.FormEvent) => {
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
      authSession.role === 'admin' ? draft.schoolId : authSession.schoolId || draft.schoolId;

    setRegistrations((prev) =>
      prev.map((r) =>
        r.id === draft.id
          ? {
              ...r,
              schoolId: targetSchoolId,
              competitionId: draft.competitionId,
              level: resolvedLevel,
              students: cleanedStudents,
              coaches:
                cleanedCoaches.length > 0 ? cleanedCoaches : [{ name: 'ครูผู้ฝึกสอน', photoUrl: '' }],
              qualifyingSong: comp?.requiresSongs ? draft.qualifyingSong.trim() : '',
              finalSong: comp?.requiresSongs ? draft.finalSong.trim() : ''
            }
          : r
      )
    );

    setBySchoolEditForm(null);
    showToast('แก้ไขข้อมูลการสมัครแข่งขันเรียบร้อยแล้ว');
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
        const bgStyle = safeBgUrl
          ? `background-image: url('${safeBgUrl}'); background-size: cover; background-position: center;`
          : `background: linear-gradient(160deg, #fffbeb 0%, #fef3c7 48%, #fff7ed 100%);`;
        const safePhoto = safeImageUrl(st.photoUrl);

        cardsHtml.push(`
          <div class="card-item" style="width: 105mm; height: 148.5mm; ${bgStyle} border: none; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
            <div style="text-align: center; padding-bottom: 8px; background: rgba(255,255,255,0.6); border-radius: 8px; padding-top: 6px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #78350f;">บัตรประจำตัวผู้เข้าแข่งขัน</div>
              <div style="font-size: 10.5px; font-weight: 700; color: #b45309;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>
              <div style="font-size: 9.5px; color: #92400e;">${escapeHtml(EVENT_DATE_TH)}</div>
            </div>

            <div style="display: flex; justify-content: center; margin: 4px 0;">
              <div style="width: 44mm; height: 56mm; border-radius: 10px; border: 2px solid rgba(255,255,255,0.92); box-shadow: 0 2px 8px rgba(15,23,42,0.12); background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${
                  safePhoto
                    ? `<img src="${safePhoto}" style="width: 100%; height: 100%; object-fit: cover; object-position: center top;" />`
                    : `<span style="font-size: 11px; color: #94a3b8; text-align: center; padding: 6px;">รูปภาพนักเรียน<br/>(คนที่ ${idx + 1})</span>`
                }
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.72); border-radius: 10px; padding: 8px 10px; font-size: 11px; line-height: 1.45;">
              <div><strong>ชื่อ-สกุล:</strong> ${escapeHtml(st.name)}</div>
              <div><strong>โรงเรียน:</strong> ${escapeHtml(school ? school.name : '-')}</div>
              <div><strong>กิจกรรม:</strong> ${escapeHtml(comp ? comp.name : '-')}</div>
              <div><strong>ระดับชั้น:</strong> ${escapeHtml(reg.level)}</div>
              <div><strong>สถานที่:</strong> ${escapeHtml(sched.venue)}</div>
              <div><strong>เวลา:</strong> ${escapeHtml(sched.timeRange)}</div>
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
        const bgStyle = safeBgUrl
          ? `background-image: url('${safeBgUrl}'); background-size: cover; background-position: center;`
          : `background: linear-gradient(160deg, #ecfdf5 0%, #d1fae5 48%, #f0fdfa 100%);`;

        cardsHtml.push(`
          <div class="card-item" style="width: 105mm; height: 148.5mm; ${bgStyle} border: none; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; position: relative; overflow: hidden;">
            <div style="text-align: center; padding-bottom: 8px; background: rgba(255,255,255,0.6); border-radius: 8px; padding-top: 6px;">
              <div style="font-size: 13.5px; font-weight: 700; color: #064e3b;">บัตรประจำตัวครูผู้ฝึกสอน</div>
              <div style="font-size: 10.5px; font-weight: 700; color: #047857;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>
              <div style="font-size: 9.5px; color: #059669;">${escapeHtml(EVENT_DATE_TH)}</div>
            </div>

            <div style="display: flex; justify-content: center; margin: 4px 0;">
              <div style="width: 42mm; height: 52mm; border-radius: 10px; border: 2px solid rgba(255,255,255,0.92); box-shadow: 0 2px 8px rgba(15,23,42,0.12); background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${
                  coachPhoto
                    ? `<img src="${coachPhoto}" style="width: 100%; height: 100%; object-fit: cover; object-position: center top;" />`
                    : `<span style="font-size: 11px; color: #64748b; text-align: center; padding: 6px;">รูปภาพครูผู้ฝึกสอน<br/>(คนที่ ${cIdx + 1})</span>`
                }
              </div>
            </div>

            <div style="background: rgba(255,255,255,0.72); border-radius: 10px; padding: 8px 10px; font-size: 10.5px; line-height: 1.4;">
              <div><strong>ครูผู้ฝึกสอน:</strong> ${escapeHtml(coachName)}</div>
              <div><strong>โรงเรียน:</strong> ${escapeHtml(school ? school.name : '-')}</div>
              <div><strong>ผู้แข่งขัน:</strong> ${escapeHtml(competitorSummary)}</div>
              <div><strong>กิจกรรม:</strong> ${escapeHtml(comp ? comp.name : '-')}</div>
              <div><strong>ระดับชั้น:</strong> ${escapeHtml(reg.level)}</div>
              <div><strong>สถานที่:</strong> ${escapeHtml(sched.venue)}</div>
              <div><strong>เวลา:</strong> ${escapeHtml(sched.timeRange)}</div>
            </div>

            <div style="text-align: center; font-size: 9.5px; font-weight: 700; color: #065f46; background: rgba(255,255,255,0.6); padding: 4px; border-radius: 6px;">
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
      const bgStyle = safeBgUrl
        ? `background-image: url('${safeBgUrl}'); background-size: cover; background-position: center;`
        : `background: linear-gradient(160deg, #eff6ff 0%, #dbeafe 50%, #f0fdf4 100%);`;
      const safeJudgePhoto = safeImageUrl(jdg.photoUrl);

      return `
        <div class="card-item" style="width: 105mm; height: 148.5mm; ${bgStyle} border: none; border-radius: 12px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;">
          <div style="text-align: center; padding-bottom: 8px; background: rgba(255,255,255,0.6); border-radius: 8px; padding-top: 6px;">
            <div style="font-size: 13.5px; font-weight: 700; color: #0c4a6e;">บัตรประจำตัวกรรมการตัดสิน</div>
            <div style="font-size: 10.5px; font-weight: 700; color: #0369a1;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>
            <div style="font-size: 9.5px; color: #0284c7;">${escapeHtml(EVENT_DATE_TH)}</div>
          </div>

          <div style="display: flex; justify-content: center; margin: 4px 0;">
            <div style="width: 40mm; height: 50mm; border-radius: 10px; border: 2px solid rgba(255,255,255,0.92); box-shadow: 0 2px 8px rgba(15,23,42,0.12); background: rgba(255,255,255,0.75); display: flex; align-items: center; justify-content: center; overflow: hidden;">
              ${
                safeJudgePhoto
                  ? `<img src="${safeJudgePhoto}" style="width: 100%; height: 100%; object-fit: cover; object-position: center top;" />`
                  : `<span style="font-size: 11px; color: #64748b; text-align: center; padding: 6px;">รูปภาพกรรมการ</span>`
              }
            </div>
          </div>

          <div style="background: rgba(255,255,255,0.72); border-radius: 10px; padding: 8px 10px; font-size: 10.5px; line-height: 1.38;">
            <div><strong>ชื่อ-สกุล:</strong> ${escapeHtml(jdg.name)}</div>
            <div><strong>ตำแหน่ง:</strong> ${escapeHtml(jdg.position)}</div>
            <div><strong>กิจกรรมที่ตัดสิน:</strong> ${escapeHtml(comp ? comp.name : '-')}</div>
            <div><strong>ระดับชั้น:</strong> ${escapeHtml(jdg.level)}</div>
            <div><strong>สถานที่:</strong> ${escapeHtml(sched.venue)}</div>
            <div><strong>เวลา:</strong> ${escapeHtml(sched.timeRange)}</div>
            <div style="margin-top: 4px; padding-top: 4px; color: #0c4a6e;">
              <strong>ชื่อผู้ใช้:</strong> ${escapeHtml(jdg.username || '-')} | <strong>รหัสผ่าน:</strong> ${escapeHtml(jdg.password || '-')}
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

  const handleDownloadCertificateA4Landscape = (certsList: CertificateItem[], docTitle: string) => {
    if (!certsList || certsList.length === 0) {
      showToast('ไม่พบรายชื่อสำหรับออกเกียรติบัตร', 'error');
      return;
    }

    const safeCertBg = safeImageUrl(certBgUrl);
    const pagesHtml = certsList.map((cert) => {
      const bgStyle = safeCertBg
        ? `background-image: url('${safeCertBg}'); background-size: cover; background-position: center;`
        : `background: linear-gradient(135deg, #fffdf7 0%, #fef9c3 35%, #fffbeb 70%, #fef3c7 100%);`;

      const line1Name = cert.line1Name || cert.recipientName || '';
      const line2Position = cert.line2Position || cert.roleLabel || '';
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
        <div class="page-break" style="width: 297mm; height: 210mm; ${bgStyle} padding: 16mm; position: relative; display: flex; justify-content: center;">
          ${
            cert.certNumber
              ? `<div style="position: absolute; top: 4cm; right: 1cm; font-size: 10pt; font-weight: 600; color: #0f172a; text-align: right;">${escapeHtml(cert.certNumber)}</div>`
              : ''
          }
          <div style="position: absolute; top: 7.3cm; left: 0; right: 0; width: 100%; background: transparent; padding: 0 36px; display: flex; flex-direction: column; justify-content: flex-start; align-items: center; text-align: center; gap: 10px;">
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

    if (!meta.approved && authSession.role !== 'admin') {
      showToast('ผลคะแนนกิจกรรมนี้ยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ', 'error');
      return;
    }

    const rows = registrations
      .filter((r) => r.competitionId === compId && r.level === level)
      .map((r) => {
        const sch = schools.find((s) => s.id === r.schoolId);
        const isAbsent = Boolean(absentRegs[r.id]);
        const rawJudgeScores = isAbsent ? {} : scores[r.id] || {};
        const calc = isAbsent
          ? { average100: 0, judgeCount: 0 }
          : calculateNormalizedScore(rawJudgeScores);
        const hasScore = !isAbsent && calc.judgeCount > 0;
        const medal = isAbsent
          ? { label: 'ไม่เข้าร่วมแข่งขัน', printColor: '#be123c', badgeCls: '' }
          : getMedalTier(calc.average100, hasScore);
        return {
          reg: r,
          isAbsent,
          hasScore,
          schoolName: sch ? sch.name : '-',
          studentNames: r.students.map((s) => s.name).join(', '),
          score: calc.average100,
          medal,
          judgeScores: rawJudgeScores
        };
      })
      .sort((a, b) => {
        if (a.isAbsent !== b.isAbsent) return a.isAbsent ? 1 : -1;
        if (a.hasScore !== b.hasScore) return a.hasScore ? -1 : 1;
        return b.score - a.score;
      });

    const visiblePdfRows = rows.filter((item) => {
      if (authSession.role === 'admin') return true;
      return !item.isAbsent && item.hasScore;
    });

    let scoredRank = 0;
    const tableRowsHtml = visiblePdfRows
      .map((item) => {
        if (item.hasScore) scoredRank += 1;
        const rankLabel = item.isAbsent
          ? 'ไม่เข้าร่วมแข่งขัน'
          : !item.hasScore
          ? 'เข้าร่วมการแข่งขัน'
          : scoredRank === 1
          ? 'รางวัลชนะเลิศ (อันดับ ๑)'
          : scoredRank === 2
          ? 'รองชนะเลิศอันดับ ๑'
          : scoredRank === 3
          ? 'รองชนะเลิศอันดับ ๒'
          : `ลำดับที่ ${scoredRank}`;
        const judgeBreakdown =
          authSession.role === 'admin'
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

        return `
          <tr>
            <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: 700;">${escapeHtml(rankLabel)}</td>
            <td style="padding: 8px; border: 1px solid #cbd5e1;">${escapeHtml(item.studentNames)}</td>
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
          const calc = isAbsent ? { average100: 0, judgeCount: 0 } : calculateNormalizedScore(scores[reg.id]);
          const hasApprovedScore = isApproved && !isAbsent && calc.judgeCount > 0;
          const medal = isAbsent
            ? { label: 'ไม่เข้าร่วมแข่งขัน', printColor: '#be123c' }
            : getMedalTier(calc.average100, hasApprovedScore);

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
              <td style="padding:7px 8px;border:1px solid #cbd5e1;text-align:right;font-weight:700;color:#b45309;">${hasApprovedScore ? calc.average100.toFixed(2) : '-'}</td>
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
            const calc = calculateNormalizedScore(scores[reg.id]);
            if (calc.judgeCount <= 0) return;
            scoreSum += calc.average100;
            scoreCount += 1;
            const medal = getMedalTier(calc.average100, true);
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
                            <span>ยืนยันลบ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteRegId(null)}
                            className="rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 text-xs font-bold cursor-pointer"
                          >
                            ยกเลิก
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteRegId(reg.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>ลบ</span>
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

    const handleSaveScheduleItem = (key: string, compName: string, lvlName: string) => {
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
                                      <span>ยืนยันลบ</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteRegId(null)}
                                      className="rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 px-2.5 py-1.5 text-xs font-bold transition cursor-pointer"
                                    >
                                      ยกเลิก
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteRegId(reg.id)}
                                    className="inline-flex items-center gap-1 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200/70 px-3 py-1.5 text-xs font-bold transition cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>ลบ</span>
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

            return reg.students.map((st, sIdx) => (
              <div
                key={`${reg.id}-${sIdx}`}
                style={
                  studentCardBgUrl
                    ? { backgroundImage: `url(${studentCardBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : undefined
                }
                className="w-[265px] min-h-[375px] rounded-2xl bg-gradient-to-b from-amber-50 via-white to-orange-50 p-3.5 flex flex-col justify-between gap-2 shadow-md"
              >
                <div className="text-center bg-white/70 rounded-xl py-1.5 px-2">
                  <div className="text-xs font-bold text-slate-800">บัตรประจำตัวผู้เข้าแข่งขัน</div>
                  <div className="text-[10px] font-bold text-amber-700">งานส่งเสริมวันมาฆบูชา ครั้งที่ 14 พ.ศ. 2570</div>
                  <div className="text-[9.5px] text-slate-500">17 กุมภาพันธ์ 2570</div>
                </div>

                <div className="flex justify-center">
                  <div className="w-[112px] h-[140px] rounded-xl border-2 border-white shadow-sm bg-white/75 overflow-hidden flex items-center justify-center">
                    {st.photoUrl ? (
                      <img src={st.photoUrl} alt={st.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="text-[11px] text-slate-400 text-center px-2">รูปภาพนักเรียน</span>
                    )}
                  </div>
                </div>

                <div className="bg-white/70 rounded-xl p-2 text-[11px] space-y-0.5 leading-snug">
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
              const coachPhoto = typeof coachItem === 'string' ? '' : coachItem.photoUrl || '';

              return (
                <div
                  key={`${reg.id}-coach-${cIdx}`}
                  style={
                    coachCardBgUrl
                      ? { backgroundImage: `url(${coachCardBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                      : undefined
                  }
                  className="w-[265px] min-h-[385px] rounded-2xl bg-gradient-to-b from-emerald-50 via-white to-teal-50 p-3.5 flex flex-col justify-between gap-2 shadow-md"
                >
                  <div className="text-center bg-white/70 rounded-xl py-1.5 px-2">
                    <div className="text-xs font-bold text-slate-800">บัตรประจำตัวครูผู้ฝึกสอน</div>
                    <div className="text-[10px] font-bold text-emerald-700">งานส่งเสริมวันมาฆบูชา ครั้งที่ 14 พ.ศ. 2570</div>
                    <div className="text-[9.5px] text-slate-500">17 กุมภาพันธ์ 2570</div>
                  </div>

                  <div className="flex flex-col items-center gap-1.5">
                    <div className="w-[108px] h-[134px] rounded-xl border-2 border-white shadow-sm bg-white/75 overflow-hidden flex items-center justify-center">
                      {coachPhoto ? (
                        <img src={coachPhoto} alt={coachName} className="w-full h-full object-cover object-top" />
                      ) : (
                        <span className="text-[11px] text-slate-400 text-center px-2">รูปภาพครูผู้ฝึกสอน</span>
                      )}
                    </div>
                  </div>

                  <div className="bg-white/70 rounded-xl p-2 text-[11px] space-y-0.5 leading-snug">
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
          <div className="flex flex-wrap items-center gap-3">
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

            return (
              <div
                key={jdg.id}
                style={
                  judgeCardBgUrl
                    ? { backgroundImage: `url(${judgeCardBgUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }
                    : undefined
                }
                className="w-[265px] min-h-[385px] rounded-2xl bg-gradient-to-b from-sky-50 via-white to-indigo-50 p-3.5 flex flex-col justify-between gap-2 shadow-md"
              >
                <div className="text-center bg-white/70 rounded-xl py-1.5 px-2">
                  <div className="text-xs font-bold text-slate-800">บัตรประจำตัวกรรมการตัดสิน</div>
                  <div className="text-[10px] font-bold text-sky-700">งานส่งเสริมวันมาฆบูชา ครั้งที่ 14 พ.ศ. 2570</div>
                  <div className="text-[9.5px] text-slate-500">17 กุมภาพันธ์ 2570</div>
                </div>

                <div className="flex justify-center">
                  <div className="w-[102px] h-[126px] rounded-xl border-2 border-white shadow-sm bg-white/75 overflow-hidden flex items-center justify-center">
                    {jdg.photoUrl ? (
                      <img src={jdg.photoUrl} alt={jdg.name} className="w-full h-full object-cover object-top" />
                    ) : (
                      <span className="text-[11px] text-slate-400 text-center px-2">รูปภาพกรรมการ</span>
                    )}
                  </div>
                </div>

                <div className="bg-white/70 rounded-xl p-2 text-[11px] space-y-0.5 leading-snug">
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
            onClick={() => handleSelectMenu('login')}
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

    const certs: CertificateItem[] = [];
    const emittedDirectorSchools = new Set<string>();
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

                  const sameLevelRanked = registrations
                    .filter(
                      (r) =>
                        r.competitionId === reg.competitionId &&
                        r.level === reg.level &&
                        !absentRegs[r.id]
                    )
                    .map((r) => {
                      const calc = calculateNormalizedScore(scores[r.id]);
                      return {
                        id: r.id,
                        score: calc.average100,
                        judgeCount: calc.judgeCount
                      };
                    })
                    .filter((item) => item.judgeCount > 0)
                    .sort((a, b) => b.score - a.score);

                  const rankIndex = isAbsent
                    ? -1
                    : sameLevelRanked.findIndex((item) => item.id === reg.id);
                  const myCalc = isAbsent
                    ? { average100: 0, judgeCount: 0 }
                    : calculateNormalizedScore(scores[reg.id]);
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
          const calc = calculateNormalizedScore(scores[reg.id]);
          if (calc.judgeCount <= 0) {
            pendingCount += 1;
            return;
          }
          scoredCount += 1;
          scoreSum += calc.average100;
          const medal = getMedalTier(calc.average100, true);
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
            const calc = isAbsent
              ? { average100: 0, judgeCount: 0 }
              : calculateNormalizedScore(scores[reg.id]);
            const hasApprovedScore = isApproved && !isAbsent && calc.judgeCount > 0;

            const levelRanked = registrations
              .filter(
                (r) =>
                  r.competitionId === reg.competitionId &&
                  String(r.level || '').trim() === String(reg.level || '').trim() &&
                  !absentRegs[r.id]
              )
              .map((r) => ({
                id: r.id,
                calc: calculateNormalizedScore(scores[r.id])
              }))
              .filter((x) => x.calc.judgeCount > 0)
              .sort((a, b) => b.calc.average100 - a.calc.average100);
            const rankIdx = levelRanked.findIndex((x) => x.id === reg.id);

            const medal = isAbsent
              ? { label: 'ไม่เข้าร่วมแข่งขัน', badgeCls: 'bg-rose-50 text-rose-700 border-rose-200' }
              : getMedalTier(calc.average100, hasApprovedScore);

            return {
              reg,
              comp,
              isApproved,
              isAbsent,
              hasApprovedScore,
              score: calc.average100,
              rankNum: hasApprovedScore && rankIdx >= 0 ? rankIdx + 1 : null,
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
                        <th className="py-3 px-4 font-bold text-center">อันดับ</th>
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
                            {d.rankNum ? `อันดับที่ ${d.rankNum}` : '-'}
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
    const selectedCompObj = COMPETITIONS.find((c) => c.id === selectedCompFilter) || null;
    const levelFilters = [
      'ทั้งหมด',
      ...(selectedCompObj
        ? selectedCompObj.levels
        : Array.from(new Set(COMPETITIONS.flatMap((c) => c.levels))))
    ];

    const toggleApprove = (metaKey: string) => {
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
      medalLabel: string;
      medalBadgeCls: string;
      medalCategory: 'gold' | 'silver' | 'bronze' | 'participant';
      judgeScores: Record<string, number>;
    }

    interface ActivityLevelResultRow {
      metaKey: string;
      compIndex: number;
      levelIndex: number;
      comp: CompetitionItem;
      level: string;
      isApproved: boolean;
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

        const rawItems = registrations
          .filter(
            (r) =>
              r.competitionId === comp.id &&
              String(r.level || '').trim() === normalizedLvl
          )
          .map((r) => {
            const sch = schools.find((s) => s.id === r.schoolId);
            const isAbsent = Boolean(absentRegs[r.id]);
            const rawJudgeScores = isAbsent ? {} : scores[r.id] || {};
            const calc = isAbsent
              ? { average100: 0, judgeCount: 0 }
              : calculateNormalizedScore(rawJudgeScores);
            return {
              reg: r,
              isAbsent,
              schoolId: r.schoolId,
              schoolName: sch?.name || '-',
              studentNames: r.students.map((s) => s.name).join(', '),
              score: calc.average100,
              judgeCount: calc.judgeCount,
              judgeScores: rawJudgeScores
            };
          })
          .sort((a, b) => {
            if (a.isAbsent !== b.isAbsent) return a.isAbsent ? 1 : -1;
            if (b.judgeCount > 0 !== a.judgeCount > 0) {
              return b.judgeCount > 0 ? 1 : -1;
            }
            return b.score - a.score;
          });

        let scoredRankCounter = 0;
        const rankedItems: RankedParticipantItem[] = rawItems.map((item) => {
          const hasScore = !item.isAbsent && item.judgeCount > 0;
          if (hasScore) scoredRankCounter += 1;
          const medal = item.isAbsent
            ? { label: 'ไม่เข้าร่วมแข่งขัน', badgeCls: 'bg-rose-50 text-rose-700 border-rose-200' }
            : getMedalTier(item.score, hasScore);
          return {
            ...item,
            hasScore,
            rankNum: hasScore ? scoredRankCounter : null,
            medalLabel: medal.label,
            medalBadgeCls: medal.badgeCls,
            medalCategory: getMedalCategory(medal.label)
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
          totalRegisteredTeams,
          scoredTeamsCount,
          rankedItems
        });
      });
    });

    const approvedCategoriesCount = allCategoryRows.filter((r) => r.isApproved).length;
    const pendingCategoriesCount = allCategoryRows.length - approvedCategoriesCount;

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
          if (!isAdmin && (item.isAbsent || !item.hasScore)) return false;
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

                  {(activeModalRow.isApproved || isAdmin) && (
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
                {!activeModalRow.isApproved && !isAdmin ? (
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
                                อันดับที่
                              </th>
                              <th className="py-2.5 px-3.5 font-bold">ผู้เข้าแข่งขัน</th>
                              <th className="py-2.5 px-3.5 font-bold">โรงเรียน</th>
                              {isAdmin && (
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
                            {modalVisibleRankedItems.map((item) => (
                              <tr key={item.reg.id} className="hover:bg-amber-50/30">
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
                                          : 'bg-slate-50 text-slate-700 border-slate-200'
                                      }`}
                                    >
                                      อันดับที่ {item.rankNum}
                                    </span>
                                  ) : (
                                    <span className="text-xs font-semibold text-slate-400">
                                      รอคะแนน
                                    </span>
                                  )}
                                </td>
                                <td className="py-3 px-3.5 font-medium text-slate-800">
                                  {item.studentNames || '-'}
                                </td>
                                <td className="py-3 px-3.5 text-slate-600">{item.schoolName}</td>
                                {isAdmin && (
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
                                  {item.hasScore ? item.score.toFixed(2) : '-'}
                                </td>
                                <td className="py-3 px-3.5 text-center whitespace-nowrap">
                                  <span
                                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${item.medalBadgeCls}`}
                                  >
                                    {item.medalLabel}
                                  </span>
                                </td>
                              </tr>
                            ))}
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

    const handleAddOrUpdateCriterion = (e: React.FormEvent) => {
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

    const handleStartEditCriterion = (idx: number) => {
      const target = activeCriteriaList[idx];
      if (!target) return;
      setEditingCriterionIdx(idx);
      setNewCriterionLabel(target.label);
      setNewCriterionMax(String(target.max));
    };

    const handleDeleteCriterion = (idx: number) => {
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
                            const isAbsent = Boolean(absentRegs[reg.id]);
                            const calc = isAbsent ? { average100: 0, judgeCount: 0 } : calculateNormalizedScore(scores[reg.id]);
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
                                  {isAbsent ? (
                                    <span className="text-xs font-bold text-rose-600">ไม่เข้าร่วมแข่งขัน</span>
                                  ) : calc.judgeCount > 0 ? (
                                    `${calc.average100.toFixed(2)} คะแนน`
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

    const handleSaveSchoolAdmin = (e: React.FormEvent) => {
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

    const handleSaveJudgeAdmin = (e: React.FormEvent) => {
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

    const handleBgFileUpload = async (
      file: File | undefined,
      bgKey: BackgroundKey,
      setter: React.Dispatch<React.SetStateAction<string>>
    ) => {
      if (!file) return;
      try {
        const maxDim = bgKey === 'bannerBgUrl' ? 1920 : 1600;
        const compressed = await compressImageFile(file, maxDim, 0.85);
        const safeUrl = safeImageUrl(compressed);
        if (!safeUrl) {
          showToast('ไม่สามารถใช้งานไฟล์รูปภาพนี้ได้ กรุณาเลือกไฟล์ PNG, JPG หรือ WebP', 'error');
          return;
        }
        setter(safeUrl);
        const cacheSaved = saveBackgroundCache(bgKey, safeUrl);
        const idbSaved = await saveBackgroundToIdb(bgKey, safeUrl);
        if (!cacheSaved && !idbSaved) {
          showToast('พื้นที่จัดเก็บของเบราว์เซอร์เต็ม ไม่สามารถบันทึกภาพพื้นหลังได้', 'error');
          return;
        }
        showToast('บันทึกภาพพื้นหลังลงในระบบเรียบร้อยแล้ว');
      } catch {
        showToast('เกิดข้อผิดพลาดในการอัปโหลดภาพพื้นหลัง กรุณาลองใหม่อีกครั้ง', 'error');
      }
    };

    const handleBgFileRemove = async (
      bgKey: BackgroundKey,
      setter: React.Dispatch<React.SetStateAction<string>>,
      message: string
    ) => {
      setter('');
      saveBackgroundCache(bgKey, '');
      await saveBackgroundToIdb(bgKey, '');
      showToast(message);
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

    const toggleMenuPermission = (menuId: string, label: string) => {
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
                      <span className="text-[11px] font-semibold text-emerald-700 truncate">บันทึกในระบบแล้ว</span>
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
                      <img src={studentCardBgUrl} alt="ตัวอย่างพื้นหลังบัตรผู้เข้าแข่งขัน" className="w-8 h-10 rounded object-cover border border-amber-200 shrink-0" />
                      <span className="text-[11px] font-semibold text-emerald-700 truncate">บันทึกในระบบแล้ว</span>
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
                      <img src={coachCardBgUrl} alt="ตัวอย่างพื้นหลังบัตรครูผู้ฝึกสอน" className="w-8 h-10 rounded object-cover border border-emerald-200 shrink-0" />
                      <span className="text-[11px] font-semibold text-emerald-700 truncate">บันทึกในระบบแล้ว</span>
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
                      <img src={judgeCardBgUrl} alt="ตัวอย่างพื้นหลังบัตรกรรมการ" className="w-8 h-10 rounded object-cover border border-indigo-200 shrink-0" />
                      <span className="text-[11px] font-semibold text-emerald-700 truncate">บันทึกในระบบแล้ว</span>
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
                      <img src={certBgUrl} alt="ตัวอย่างพื้นหลังเกียรติบัตร" className="w-14 h-10 rounded object-cover border border-teal-200 shrink-0" />
                      <span className="text-xs font-semibold text-emerald-700 truncate">บันทึกพื้นหลังเกียรติบัตรในระบบแล้ว</span>
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
            onSubmit={(e) => {
              e.preventDefault();
              if (adminCredForm.currentPass !== adminCredentials.password) {
                showToast('รหัสผ่านปัจจุบันไม่ถูกต้อง', 'error');
                return;
              }
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
              const updatedPass = nextPass || adminCredentials.password;
              setAdminCredentials({
                username: nextUser,
                password: updatedPass,
                displayName: nextName
              });
              setAuthSession((prev) =>
                prev.role === 'admin' ? { ...prev, displayName: nextName } : prev
              );
              setAdminCredForm({
                currentPass: '',
                newUsername: nextUser,
                newDisplayName: nextName,
                newPass: '',
                confirmNewPass: ''
              });
              showToast('อัปเดตข้อมูลและรหัสผ่านผู้ดูแลระบบเรียบร้อยแล้ว');
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

    const handleSaveScores = (e: React.FormEvent) => {
      e.preventDefault();
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถแก้ไขคะแนนได้', 'error');
        return;
      }
      const nextScores = { ...scores };
      const nextCriteriaDetails = { ...scoreCriteriaDetails };
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

        const cleanedDetail: Record<string, number> = {};
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

    const handleSaveSingleTeamScore = (regItem: RegistrationItem) => {
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

      const cleanedDetail: Record<string, number> = {};
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

    const handleToggleAbsentTeam = (regItem: RegistrationItem) => {
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถเปลี่ยนสถานะเข้าร่วมแข่งขันได้', 'error');
        return;
      }
      const currentlyAbsent = Boolean(absentRegs[regItem.id]);
      const nextAbsent = !currentlyAbsent;
      const teamSchool = schools.find((s) => s.id === regItem.schoolId);
      const teamLabel =
        regItem.students.map((s) => s.name).join(', ') || teamSchool?.name || 'ทีมผู้เข้าแข่งขัน';

      setAbsentRegs((prev) => {
        const next = { ...prev };
        if (nextAbsent) {
          next[regItem.id] = true;
        } else {
          delete next[regItem.id];
        }
        return next;
      });

      if (nextAbsent) {
        setScores((prev) => {
          if (!prev[regItem.id]) return prev;
          const next = { ...prev };
          delete next[regItem.id];
          return next;
        });
        setScoreCriteriaDetails((prev) => {
          if (!prev[regItem.id]) return prev;
          const next = { ...prev };
          delete next[regItem.id];
          return next;
        });
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
    };

    return (
      <div className="space-y-6">
        <div className="rounded-2xl bg-gradient-to-r from-sky-600 to-indigo-600 p-6 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
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
                ? 'กรอกจำนวนข้อสอบที่ผู้เข้าแข่งขันตอบถูกต้อง หรือแจ้งไม่เข้าร่วมแข่งขันหากไม่ปรากฏผู้เข้าแข่งขัน'
                : 'กรอกคะแนนแยกตามเกณฑ์ในใบลงคะแนน หรือกดปุ่ม "แจ้งไม่เข้าร่วมแข่งขัน" หากไม่ปรากฏผู้เข้าแข่งขัน (งดออกเกียรติบัตรอัตโนมัติ)'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => handleSelectMenu('judge-absent')}
            className="self-start sm:self-center inline-flex items-center gap-2 rounded-xl bg-white/15 hover:bg-white/25 border border-white/30 text-white px-4 py-2.5 text-xs sm:text-sm font-bold backdrop-blur-sm transition cursor-pointer shrink-0"
          >
            <UserX className="w-4 h-4" />
            <span>ไปที่เมนูแจ้งไม่เข้าร่วมแข่งขัน</span>
          </button>
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
                const isAbsent = Boolean(absentRegs[r.id]);
                const { total, hasAny } = computeRowTotal(r.id);
                const hasSavedScore =
                  !isAbsent &&
                  scores[r.id]?.[currentJudge.id] !== undefined &&
                  scores[r.id]?.[currentJudge.id] !== null;
                const isEditingRow = Boolean(unlockedScoreCards[r.id]) && !isApprovedByAdmin;
                const isInputDisabled =
                  isApprovedByAdmin || isAbsent || (hasSavedScore && !isEditingRow);

                return (
                  <div
                    key={r.id}
                    className={`p-4 sm:p-5 rounded-2xl border space-y-4 ${
                      isAbsent
                        ? 'border-rose-200 bg-rose-50/40'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-bold text-sky-700">ผู้เข้าแข่งขันชุดที่ {idx + 1}</span>
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
                      </div>

                      <div
                        className={`rounded-xl border px-4 py-2 text-right shrink-0 ${
                          isAbsent
                            ? 'bg-rose-50 border-rose-200'
                            : 'bg-sky-50 border-sky-200'
                        }`}
                      >
                        <div
                          className={`text-[11px] font-semibold ${
                            isAbsent ? 'text-rose-700' : 'text-sky-800'
                          }`}
                        >
                          {isAbsent
                            ? 'สถานะการเข้าแข่งขัน'
                            : isDharmaQuiz
                            ? 'คะแนนตามข้อที่ตอบถูก'
                            : 'คะแนนรวมตามเกณฑ์ (เต็ม 100)'}
                        </div>
                        <div
                          className={`text-lg font-extrabold ${
                            isAbsent ? 'text-rose-700' : 'text-sky-900'
                          }`}
                        >
                          {isAbsent
                            ? 'ไม่เข้าร่วมแข่งขัน'
                            : hasAny
                            ? `${total} ${isDharmaQuiz ? 'ข้อ/คะแนน' : 'คะแนน'}`
                            : '-'}
                        </div>
                      </div>
                    </div>

                    {!isAbsent && (
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

    const handleToggleAbsentFromMenu = (regItem: RegistrationItem) => {
      if (isApprovedByAdmin) {
        showToast('ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถเปลี่ยนสถานะเข้าร่วมแข่งขันได้', 'error');
        return;
      }
      const currentlyAbsent = Boolean(absentRegs[regItem.id]);
      const nextAbsent = !currentlyAbsent;
      const teamSchool = schools.find((s) => s.id === regItem.schoolId);
      const teamLabel =
        regItem.students.map((s) => s.name).join(', ') || teamSchool?.name || 'ทีมผู้เข้าแข่งขัน';

      setAbsentRegs((prev) => {
        const next = { ...prev };
        if (nextAbsent) {
          next[regItem.id] = true;
        } else {
          delete next[regItem.id];
        }
        return next;
      });

      if (nextAbsent) {
        setScores((prev) => {
          if (!prev[regItem.id]) return prev;
          const next = { ...prev };
          delete next[regItem.id];
          return next;
        });
        setScoreCriteriaDetails((prev) => {
          if (!prev[regItem.id]) return prev;
          const next = { ...prev };
          delete next[regItem.id];
          return next;
        });
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
    const switchRoleTab = (nextTab: 'admin' | 'school' | 'judge') => {
      setLoginTab(nextTab);
      setLoginUser('');
      setLoginPass('');
      setLoginError('');
      setShowLoginPass(false);
    };

    const roleDefaultMenu =
      authSession.role === 'admin'
        ? 'admin-manage'
        : authSession.role === 'school'
        ? 'by-school'
        : authSession.role === 'judge'
        ? 'judge-scoring'
        : 'home';

    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {authSession.role !== 'guest' && (
          <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-emerald-700">
                  เข้าสู่ระบบอยู่แล้ว ({authSession.role === 'admin' ? 'ผู้ดูแลระบบ' : authSession.role === 'school' ? 'โรงเรียน' : 'กรรมการตัดสิน'})
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
              onClick={() => switchRoleTab('admin')}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                loginTab === 'admin' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>ผู้ดูแลระบบ</span>
            </button>

            <button
              type="button"
              onClick={() => switchRoleTab('school')}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                loginTab === 'school' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <School className="w-4 h-4 shrink-0" />
              <span>ระบบโรงเรียน</span>
            </button>

            <button
              type="button"
              onClick={() => switchRoleTab('judge')}
              className={`py-2.5 px-2 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition cursor-pointer ${
                loginTab === 'judge' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-800'
              }`}
            >
              <Gavel className="w-4 h-4 shrink-0" />
              <span>ระบบกรรมการ</span>
            </button>
          </div>

          {loginError && (
            <div className="mt-4 rounded-xl bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Tab 1: Admin */}
          {loginTab === 'admin' && (
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
          {loginTab === 'school' && (
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
          {loginTab === 'judge' && (
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
      case 'medal-summary':
        return renderSchoolResultsPage();
      case 'results':
        return renderResultsPage();
      case 'admin-competition-manage':
        return renderAdminCompetitionManagePage();
      case 'admin-manage':
        return renderAdminManagePage();
      case 'judge-scoring':
        return renderJudgeScoringPage();
      case 'judge-absent':
        return renderJudgeAbsentPage();
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
                              className="hidden"
                              onChange={(e) =>
                                handleBySchoolEditPhotoUpload('student', idx, e.target.files?.[0])
                              }
                            />
                          </label>
                          {bySchoolEditForm.studentPhotos[idx] && (
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-700 font-semibold">มีรูปภาพแล้ว</span>
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
                              className="hidden"
                              onChange={(e) =>
                                handleBySchoolEditPhotoUpload('coach', idx, e.target.files?.[0])
                              }
                            />
                          </label>
                          {bySchoolEditForm.coachPhotos[idx] && (
                            <div className="flex items-center gap-2">
                              <span className="text-emerald-700 font-semibold">มีรูปภาพแล้ว</span>
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
                เมนูหลัก ({authSession.role === 'judge' ? 'โหมดกรรมการ' : authSession.role === 'admin' ? 'โหมดผู้ดูแลระบบ' : authSession.role === 'school' ? 'โหมดโรงเรียน' : 'ทั่วไป'})
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