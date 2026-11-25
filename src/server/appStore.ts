import crypto from 'crypto';
import express, { type Request, type Response, type Router } from 'express';
import fs from 'fs';
import path from 'path';

export const UPLOAD_CATEGORIES = ['students', 'coaches', 'judges', 'backgrounds'] as const;
export type UploadCategory = (typeof UPLOAD_CATEGORIES)[number];

const EVENT_DATE_TH = 'วันพุธที่ 17 กุมภาพันธ์ พ.ศ. 2570';
const EVENT_VENUE_TH = 'โรงเรียนบ้านหนองบัว ตำบลหนองบัว อำเภอศีขรภูมิ จังหวัดสุรินทร์';

const LEVELS_STANDARD = [
  'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
  'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
  'มัธยมศึกษาตอนปลาย (ม.4-ม.6)',
];
const LEVELS_UNLIMITED = ['ไม่จำกัดระดับ'];

export interface AppCompetitionDef {
  id: string;
  name: string;
  type: string;
  teamSize: number;
  levels: string[];
  requiresSongs: boolean;
}

export const APP_COMPETITIONS: AppCompetitionDef[] = [
  { id: 'comp-1', name: 'การบรรยายธรรม', type: 'เดี่ยว', teamSize: 1, levels: LEVELS_STANDARD, requiresSongs: false },
  { id: 'comp-2', name: 'การเล่านิทานธรรม', type: 'เดี่ยว', teamSize: 1, levels: LEVELS_STANDARD, requiresSongs: false },
  { id: 'comp-3', name: 'การร้องเพลงไทยลูกทุ่งส่งเสริมคุณธรรม (ชาย)', type: 'เดี่ยว', teamSize: 1, levels: LEVELS_STANDARD, requiresSongs: true },
  { id: 'comp-4', name: 'การร้องเพลงไทยลูกทุ่งส่งเสริมคุณธรรม (หญิง)', type: 'เดี่ยว', teamSize: 1, levels: LEVELS_STANDARD, requiresSongs: true },
  { id: 'comp-5', name: 'การวาดภาพลายเส้น', type: 'เดี่ยว', teamSize: 1, levels: LEVELS_STANDARD, requiresSongs: false },
  { id: 'comp-6', name: 'การเขียนเรียงความแก้กระทู้ธรรมชั้นตรี', type: 'เดี่ยว', teamSize: 1, levels: LEVELS_STANDARD, requiresSongs: false },
  { id: 'comp-7', name: 'ตอบปัญหาธรรม', type: 'ทีมละ 2 คน', teamSize: 2, levels: LEVELS_STANDARD, requiresSongs: false },
  { id: 'comp-8', name: 'การกล่าวคำอาราธนาและถวายทานในพุทธศาสนพิธี', type: 'ทีมละ 5 คน', teamSize: 5, levels: LEVELS_STANDARD, requiresSongs: false },
  { id: 'comp-9', name: 'การสวดมนต์หมู่สรรเสริญพระรัตนตรัยทำนองสรภัญญะ (หญิงล้วน)', type: 'ทีมละ 5 คน', teamSize: 5, levels: LEVELS_STANDARD, requiresSongs: false },
  { id: 'comp-10', name: 'การจัดโต๊ะหมู่บูชา หมู่ 7', type: 'ทีมละ 10 คน', teamSize: 10, levels: LEVELS_UNLIMITED, requiresSongs: false },
];

export interface CriterionDef {
  key: string;
  label: string;
  max: number;
  maxLabel?: string;
}

export interface StoredAppSchool {
  id: string;
  schoolCode: string;
  passwordHash: string;
  name: string;
  director: string;
  phone: string;
}

export interface StoredAppJudge {
  id: string;
  username: string;
  passwordHash: string;
  name: string;
  position: string;
  competitionId: string;
  level: string;
  photoUrl: string;
}

export interface AppScheduleItem {
  venue: string;
  dateLabel: string;
  timeRange: string;
  notes: string;
}

export interface AppStudentMember {
  name: string;
  photoUrl: string;
}

export interface AppCoachMember {
  name: string;
  photoUrl: string;
}

export interface AppRegistration {
  id: string;
  schoolId: string;
  competitionId: string;
  level: string;
  students: AppStudentMember[];
  coaches: AppCoachMember[];
  qualifyingSong: string;
  finalSong: string;
}

export interface AppBackgrounds {
  bannerBgUrl: string;
  studentCardBgUrl: string;
  coachCardBgUrl: string;
  judgeCardBgUrl: string;
  certBgUrl: string;
}

export interface AppSessionUser {
  role: 'guest' | 'admin' | 'school' | 'judge';
  userId: string | null;
  displayName: string;
  schoolId: string | null;
  judgeId: string | null;
}

interface AppStoreState {
  adminCredentials: {
    username: string;
    passwordHash: string;
    displayName: string;
  };
  registrationOpen: boolean;
  menuPermissions: Record<string, boolean>;
  backgrounds: AppBackgrounds;
  schools: StoredAppSchool[];
  judges: StoredAppJudge[];
  schedules: Record<string, AppScheduleItem>;
  registrations: AppRegistration[];
  scores: Record<string, Record<string, number>>;
  scoreCriteriaDetails: Record<string, Record<string, Record<string, number>>>;
  evalMeta: Record<string, { status: string; approved: boolean }>;
  absentRegs: Record<string, boolean>;
  customCriteriaByComp: Record<string, CriterionDef[]>;
}

const COOKIE_NAME = 'mb_app_session';

function getDefaultAppCriteria(compId: string): CriterionDef[] {
  switch (compId) {
    case 'comp-1':
      return [
        { key: 'dt1', label: '๑) การปรากฏตัวและมารยาทไทย', max: 10, maxLabel: '๑๐ คะแนน' },
        { key: 'dt2', label: '๒) กล่าวทักทายที่ประชุม และอารัมภบท', max: 10, maxLabel: '๑๐ คะแนน' },
        { key: 'dt3', label: '๓) เนื้อหาของการบรรยายมีความต่อเนื่อง มีเหตุผลและความเหมาะสมกลมกลืน', max: 30, maxLabel: '๓๐ คะแนน' },
        { key: 'dt4', label: '๔) การใช้ภาษา ถ้อยคำสำเนียง และออกเสียงอักขระควบกล้ำชัดเจน', max: 20, maxLabel: '๒๐ คะแนน' },
        { key: 'dt5', label: '๕) บุคลิกลักษณะ การใช้สายตา และลีลาท่าทาง', max: 10, maxLabel: '๑๐ คะแนน' },
        { key: 'dt6', label: '๖) การกล่าวสรุปจบ', max: 10, maxLabel: '๑๐ คะแนน' },
        { key: 'dt7', label: '๗) การรักษาเวลา', max: 10, maxLabel: '๑๐ คะแนน' },
      ];
    case 'comp-2':
      return [
        { key: 'st1', label: '๑) มารยาทไทย กล่าวทักทายที่ประชุม และอารัมภบท', max: 10, maxLabel: '๑๐ คะแนน' },
        { key: 'st2', label: '๒) เนื้อหาสาระเน้นคุณธรรม จริยธรรม มีข้อคิด คติเตือนใจ', max: 30, maxLabel: '๓๐ คะแนน' },
        { key: 'st3', label: '๓) การใช้ภาษาถูกต้องตามอักขระและความต่อเนื่องในการเล่า', max: 20, maxLabel: '๒๐ คะแนน' },
        { key: 'st4', label: '๔) บุคลิกภาพ น้ำเสียง และลีลาท่าทาง', max: 20, maxLabel: '๒๐ คะแนน' },
        { key: 'st6', label: '๖) ความคิดริเริ่มสร้างสรรค์ การใช้สื่อ อุปกรณ์เหมาะสม', max: 15, maxLabel: '๑๕ คะแนน' },
        { key: 'st7', label: '๗) ใช้เวลาตามกำหนด', max: 5, maxLabel: '๕ คะแนน' },
      ];
    case 'comp-3':
    case 'comp-4':
      return [
        { key: 'fs1', label: '๑) น้ำเสียง ความไพเราะของเสียง', max: 30, maxLabel: '30 คะแนน' },
        { key: 'fs2', label: '๒) เทคนิคการขับร้อง', max: 20, maxLabel: '20 คะแนน' },
        { key: 'fs3', label: '3) จังหวะ ทำนอง ถูกต้อง', max: 25, maxLabel: '25 คะแนน' },
        { key: 'fs4', label: '4) อักขระวิธีถูกต้อง', max: 15, maxLabel: '15 คะแนน' },
        { key: 'fs5', label: '5) บุคลิก ลีลา อารมณ์', max: 10, maxLabel: '10 คะแนน' },
      ];
    case 'comp-5':
      return [
        { key: 'ld1', label: '๑) ลักษณะความสมบูรณ์ของเส้น ความถูกต้องของแสงเงา', max: 30, maxLabel: '30 คะแนน' },
        { key: 'ld2', label: '๒) การจัดภาพ / องค์ประกอบ', max: 20, maxLabel: '20 คะแนน' },
        { key: 'ld3', label: '๓) ความคิดสร้างสรรค์', max: 20, maxLabel: '20 คะแนน' },
        { key: 'ld4', label: '๔) ความสมบูรณ์ ความประณีตของชิ้นงาน', max: 20, maxLabel: '20 คะแนน' },
        { key: 'ld5', label: '๕) ความสอดคล้องกับหัวข้อที่กำหนด', max: 10, maxLabel: '10 คะแนน' },
      ];
    case 'comp-6':
      return [
        { key: 'es1', label: '1) แต่งได้ครบตามกำหนด', max: 15, maxLabel: '๑๕ คะแนน' },
        { key: 'es2', label: '2) อ้างสุภาษิตที่เชื่อมได้ตามกฎ และบอกที่มาได้ถูกต้อง', max: 10, maxLabel: '๑๐ คะแนน' },
        { key: 'es3', label: '3) ใช้ตัวอักษรแบบกระทรวงศึกษาธิการ', max: 20, maxLabel: '๒๐ คะแนน' },
        { key: 'es4', label: '4) อธิบายความสมกับกระทู้ที่ตั้งไว้', max: 30, maxLabel: '๓๐ คะแนน' },
        { key: 'es5', label: '5) ใช้ตัวสะกดการันต์ถูกต้อง (เขียนผิดซํ้าให้นับเป็น ๑ คํา)', max: 15, maxLabel: '๑๕ คะแนน' },
        { key: 'es6', label: '6) สะอาดไม่เปรอะเปื้อน', max: 10, maxLabel: '๑๐ คะแนน' },
      ];
    case 'comp-7':
      return [];
    case 'comp-8':
      return [
        { key: 'co1', label: '1) มารยาทเรียบร้อยถูกต้องตามหลักศาสนพิธี', max: 10, maxLabel: 'จำนวน ๑๐ คะแนน' },
        { key: 'co2', label: '2) ความถูกต้องของอักขระ', max: 20, maxLabel: 'จำนวน ๒๐ คะแนน' },
        { key: 'co3', label: '3) ความถูกต้องของจังหวะ และวรรคตอน', max: 15, maxLabel: 'จำนวน ๑๕ คะแนน' },
        { key: 'co4', label: '4) ความถูกต้องของทำนอง (ธรรมวัตร)', max: 15, maxLabel: 'จำนวน ๑๕ คะแนน' },
        { key: 'co5', label: '5) ความไพเราะของน้ำเสียง', max: 15, maxLabel: 'จำนวน ๑๕ คะแนน' },
        { key: 'co6', label: '6) ลำดับขั้นตอนถูกต้อง', max: 15, maxLabel: 'จำนวน ๑๕ คะแนน' },
        { key: 'co7', label: '7) ความพร้อมเพรียงโดยรวม', max: 10, maxLabel: 'จำนวน ๑๐ คะแนน' },
      ];
    case 'comp-9':
      return [
        { key: 'ch1', label: '๑) ความถูกต้องของอักขระ', max: 20, maxLabel: '๒๐ คะแนน' },
        { key: 'ch2', label: '๒) ความถูกต้องของจังหวะ', max: 20, maxLabel: '๒๐ คะแนน' },
        { key: 'ch3', label: '๓) ความถูกต้องของทำนอง', max: 20, maxLabel: '๒๐ คะแนน' },
        { key: 'ch4', label: '๔) ความไพเราะของน้ำเสียง', max: 20, maxLabel: '๒๐ คะแนน' },
        { key: 'ch5', label: '๕) มารยาทและท่าทาง', max: 10, maxLabel: '๑๐ คะแนน' },
        { key: 'ch6', label: '๖) ความพร้อมเพียงโดยรวม', max: 10, maxLabel: '๑๐ คะแนน' },
      ];
    case 'comp-10':
      return [
        { key: 'al1', label: '๑) ขั้นตอนกระบวนการการทำงาน', max: 10, maxLabel: '๑๐ คะแนน' },
        { key: 'al2', label: '๒) ความถูกต้องของโต๊ะหมู่ตามชนิดที่กำหนด และการจัดวางโต๊ะหมู่บูชา จะต้องประกอบไปด้วย พระพุทธรูปแจกัน พานพุ่ม ดอกไม้สด เชิงเทียน กระถางธูป', max: 20, maxLabel: '๒๐ คะแนน' },
        { key: 'al3', label: '๓) ความประณีต สวยงาม ของเครื่องประดับตกแต่งและการจัดดอกไม้สด', max: 30, maxLabel: '๓๐ คะแนน' },
        { key: 'al4', label: '๔) ความถูกต้องในการจัดโต๊ะหมู่บูชาตามแบบธรรมเนียมพิธีการ', max: 20, maxLabel: '๒๐ คะแนน' },
        { key: 'al5', label: '๕) ความคิดสร้างสรรค์', max: 10, maxLabel: '๑๐ คะแนน' },
        { key: 'al6', label: '๖) สำเร็จทันเวลา', max: 10, maxLabel: '๑๐ คะแนน' },
        { key: 'al7', label: '๗) ความสะอาดเรียบร้อย', max: 10, maxLabel: '๑๐ คะแนน' },
      ];
    default:
      return [];
  }
}

function buildInitialSchedules(): Record<string, AppScheduleItem> {
  const map: Record<string, AppScheduleItem> = {};
  APP_COMPETITIONS.forEach((comp, idx) => {
    comp.levels.forEach((lvl, lIdx) => {
      const startHour = 8 + (idx % 4);
      const startMin = lIdx === 1 ? '30' : '00';
      const endHour = startHour + 1;
      map[`${comp.id}__${lvl}`] = {
        venue: `${EVENT_VENUE_TH} — ห้องที่ ${idx + 1}.${lIdx + 1}`,
        dateLabel: EVENT_DATE_TH,
        timeRange: `${String(startHour).padStart(2, '0')}.${startMin} - ${String(endHour).padStart(2, '0')}.${startMin} น.`,
        notes: 'รายงานตัวก่อนเวลาแข่งขัน 30 นาที',
      };
    });
  });
  return map;
}

function hashSecret(secret: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(secret, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifySecret(secret: string, storedHash: string): boolean {
  const parts = String(storedHash || '').split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  try {
    const derived = crypto.scryptSync(secret, salt, 64);
    const original = Buffer.from(originalHex, 'hex');
    return derived.length === original.length && crypto.timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

function detectImageExtension(buf: Buffer): 'png' | 'jpg' | 'gif' | 'webp' | null {
  if (buf.length < 12) return null;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) {
    return 'png';
  }
  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return 'jpg';
  }
  // GIF: GIF87a / GIF89a
  const hdr = buf.subarray(0, 6).toString('ascii');
  if (hdr === 'GIF87a' || hdr === 'GIF89a') {
    return 'gif';
  }
  // WEBP: RIFF....WEBP
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'webp';
  }
  return null;
}

function createInitialAppStore(): AppStoreState {
  const defaultHash = hashSecret('1234');
  const criteriaMap: Record<string, CriterionDef[]> = {};
  APP_COMPETITIONS.forEach((c) => {
    criteriaMap[c.id] = getDefaultAppCriteria(c.id);
  });

  return {
    adminCredentials: {
      username: 'admin',
      passwordHash: defaultHash,
      displayName: 'พระบุญทัน ธมฺมธาตา (Admin)',
    },
    registrationOpen: true,
    menuPermissions: {
      'student-card': true,
      'coach-card': true,
      'judge-card': true,
      'judge-cert': true,
      'school-cert': true,
      'school-results': true,
      results: true,
    },
    backgrounds: {
      bannerBgUrl: '',
      studentCardBgUrl: '',
      coachCardBgUrl: '',
      judgeCardBgUrl: '',
      certBgUrl: '',
    },
    schools: [
      {
        id: 'sch-10112201',
        schoolCode: '10112201',
        passwordHash: defaultHash,
        name: 'โรงเรียนสุรินทร์ธรรมวิทยาคม',
        director: 'นายสมชาย ใจดีมีธรรม',
        phone: '044-511-234',
      },
      {
        id: 'sch-10112202',
        schoolCode: '10112202',
        passwordHash: defaultHash,
        name: 'โรงเรียนศรีณรงค์พุทธอุปถัมภ์',
        director: 'นางสาววิภาดา รักสงบ',
        phone: '044-512-890',
      },
      {
        id: 'sch-10112203',
        schoolCode: '10112203',
        passwordHash: defaultHash,
        name: 'โรงเรียนปราสาทปัญญาคุณ',
        director: 'นายเกรียงไกร บุญญารักษ์',
        phone: '044-513-456',
      },
    ],
    judges: [
      {
        id: 'jdg-1',
        username: 'judge1',
        passwordHash: defaultHash,
        name: 'พระมหาสมปอง ปัญญาธโร',
        position: 'ประธานกรรมการตัดสิน',
        competitionId: 'comp-1',
        level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
        photoUrl: '',
      },
      {
        id: 'jdg-2',
        username: 'judge2',
        passwordHash: defaultHash,
        name: 'ดร.กัญญาณี สุนทรธรรม',
        position: 'กรรมการตัดสิน',
        competitionId: 'comp-1',
        level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
        photoUrl: '',
      },
      {
        id: 'jdg-3',
        username: 'judge3',
        passwordHash: defaultHash,
        name: 'อาจารย์ธนวัฒน์ ศรีสวัสดิ์',
        position: 'กรรมการตัดสิน',
        competitionId: 'comp-1',
        level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
        photoUrl: '',
      },
      {
        id: 'jdg-4',
        username: 'judge4',
        passwordHash: defaultHash,
        name: 'นางสาวพิมพ์ชนก วรรณศิลป์',
        position: 'กรรมการตัดสิน',
        competitionId: 'comp-1',
        level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
        photoUrl: '',
      },
      {
        id: 'jdg-5',
        username: 'judge5',
        passwordHash: defaultHash,
        name: 'ครูสุรศักดิ์ เสียงไพเราะ',
        position: 'ประธานกรรมการตัดสิน',
        competitionId: 'comp-3',
        level: 'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
        photoUrl: '',
      },
    ],
    schedules: buildInitialSchedules(),
    registrations: [
      {
        id: 'reg-1',
        schoolId: 'sch-10112201',
        competitionId: 'comp-1',
        level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
        students: [{ name: 'ด.ช.ปวริศร์ เจริญสุข', photoUrl: '' }],
        coaches: [{ name: 'นายอดิศร มีเมตตา', photoUrl: '' }],
        qualifyingSong: '',
        finalSong: '',
      },
      {
        id: 'reg-2',
        schoolId: 'sch-10112202',
        competitionId: 'comp-1',
        level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
        students: [{ name: 'ด.ญ.ณัฐนิชา งามสง่า', photoUrl: '' }],
        coaches: [{ name: 'นางนภาภรณ์ สอนดี', photoUrl: '' }],
        qualifyingSong: '',
        finalSong: '',
      },
      {
        id: 'reg-3',
        schoolId: 'sch-10112203',
        competitionId: 'comp-1',
        level: 'ประถมศึกษาตอนปลาย (ป.4-ป.6)',
        students: [{ name: 'ด.ช.กิตติภพ พัฒนธรรม', photoUrl: '' }],
        coaches: [{ name: 'นายวัฒนา แสงธรรม', photoUrl: '' }],
        qualifyingSong: '',
        finalSong: '',
      },
      {
        id: 'reg-4',
        schoolId: 'sch-10112201',
        competitionId: 'comp-3',
        level: 'มัธยมศึกษาตอนต้น (ม.1-ม.3)',
        students: [{ name: 'ด.ช.ธีรภัทร ขับขาน', photoUrl: '' }],
        coaches: [{ name: 'ครูสุเมธ ดนตรีไทย', photoUrl: '' }],
        qualifyingSong: 'วอนลมฝากข่าว (เพลงส่งเสริมคุณธรรม)',
        finalSong: 'จดหมายจากแนวหน้า / น้ำตาแม่',
      },
      {
        id: 'reg-5',
        schoolId: 'sch-10112201',
        competitionId: 'comp-7',
        level: 'มัธยมศึกษาตอนปลาย (ม.4-ม.6)',
        students: [
          { name: 'นายภูมิพัฒน์ ใฝ่รู้', photoUrl: '' },
          { name: 'นางสาวอารยา ปัญญาดี', photoUrl: '' },
        ],
        coaches: [{ name: 'นางสมฤดี วิชาการ', photoUrl: '' }],
        qualifyingSong: '',
        finalSong: '',
      },
      {
        id: 'reg-6',
        schoolId: 'sch-10112202',
        competitionId: 'comp-10',
        level: 'ไม่จำกัดระดับ',
        students: Array.from({ length: 10 }, (_, i) => ({
          name: `นักเรียนสมาชิกโต๊ะหมู่ที่ ${i + 1}`,
          photoUrl: '',
        })),
        coaches: [
          { name: 'นายประเสริฐ ศิลป์ไทย', photoUrl: '' },
          { name: 'นางสาวดวงใจ พุทธศิลป์', photoUrl: '' },
        ],
        qualifyingSong: '',
        finalSong: '',
      },
    ],
    scores: {
      'reg-1': { 'jdg-1': 92, 'jdg-2': 90, 'jdg-3': 89, 'jdg-4': 93 },
      'reg-2': { 'jdg-1': 95, 'jdg-2': 94, 'jdg-3': 96, 'jdg-4': 95 },
    },
    scoreCriteriaDetails: {},
    evalMeta: {
      'comp-1__ประถมศึกษาตอนปลาย (ป.4-ป.6)': { status: 'completed', approved: true },
      'comp-3__มัธยมศึกษาตอนต้น (ม.1-ม.3)': { status: 'judging', approved: false },
    },
    absentRegs: {},
    customCriteriaByComp: criteriaMap,
  };
}

function writeAtomicJson(filePath: string, data: unknown): void {
  const tmpFile = `${filePath}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2), 'utf-8');
  fs.renameSync(tmpFile, filePath);
}

function readJsonSafe<T>(filePath: string, fallback: T): T {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!cookieHeader) return out;
  cookieHeader.split(';').forEach((part) => {
    const idx = part.indexOf('=');
    if (idx === -1) return;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  });
  return out;
}

export function createAppStoreRouter(options: {
  dataDir: string;
  uploadsDir: string;
  sessionSecret: string;
}): Router {
  const { dataDir, uploadsDir, sessionSecret } = options;
  const storeDir = path.resolve(dataDir, 'store');

  fs.mkdirSync(storeDir, { recursive: true });
  fs.mkdirSync(uploadsDir, { recursive: true });
  for (const cat of UPLOAD_CATEGORIES) {
    fs.mkdirSync(path.resolve(uploadsDir, cat), { recursive: true });
  }

  const storeFiles = {
    system: path.resolve(storeDir, 'system.json'),
    schools: path.resolve(storeDir, 'schools.json'),
    judges: path.resolve(storeDir, 'judges.json'),
    schedules: path.resolve(storeDir, 'schedules.json'),
    registrations: path.resolve(storeDir, 'registrations.json'),
    scores: path.resolve(storeDir, 'scores.json'),
    criteria: path.resolve(storeDir, 'criteria.json'),
  };

  function saveStore(state: AppStoreState): void {
    writeAtomicJson(storeFiles.system, {
      adminCredentials: state.adminCredentials,
      registrationOpen: state.registrationOpen,
      menuPermissions: state.menuPermissions,
      backgrounds: state.backgrounds,
    });
    writeAtomicJson(storeFiles.schools, state.schools);
    writeAtomicJson(storeFiles.judges, state.judges);
    writeAtomicJson(storeFiles.schedules, state.schedules);
    writeAtomicJson(storeFiles.registrations, state.registrations);
    writeAtomicJson(storeFiles.scores, {
      scores: state.scores,
      scoreCriteriaDetails: state.scoreCriteriaDetails,
      evalMeta: state.evalMeta,
      absentRegs: state.absentRegs,
    });
    writeAtomicJson(storeFiles.criteria, state.customCriteriaByComp);
  }

  function loadStore(): AppStoreState {
    if (!fs.existsSync(storeFiles.system)) {
      const initial = createInitialAppStore();
      saveStore(initial);
      return initial;
    }
    const defaults = createInitialAppStore();
    const sys = readJsonSafe<Partial<AppStoreState>>(storeFiles.system, {});
    const schools = readJsonSafe<StoredAppSchool[]>(storeFiles.schools, defaults.schools);
    const judges = readJsonSafe<StoredAppJudge[]>(storeFiles.judges, defaults.judges);
    const schedules = readJsonSafe<Record<string, AppScheduleItem>>(storeFiles.schedules, {});
    const registrations = readJsonSafe<AppRegistration[]>(storeFiles.registrations, defaults.registrations);
    const scoreBundle = readJsonSafe<Partial<AppStoreState>>(storeFiles.scores, {});
    const criteria = readJsonSafe<Record<string, CriterionDef[]>>(storeFiles.criteria, defaults.customCriteriaByComp);

    return {
      adminCredentials: sys.adminCredentials || defaults.adminCredentials,
      registrationOpen: typeof sys.registrationOpen === 'boolean' ? sys.registrationOpen : true,
      menuPermissions: { ...defaults.menuPermissions, ...(sys.menuPermissions || {}) },
      backgrounds: { ...defaults.backgrounds, ...(sys.backgrounds || {}) },
      schools: Array.isArray(schools) ? schools : defaults.schools,
      judges: Array.isArray(judges) ? judges : defaults.judges,
      schedules: { ...defaults.schedules, ...(schedules || {}) },
      registrations: Array.isArray(registrations) ? registrations : defaults.registrations,
      scores: scoreBundle.scores || {},
      scoreCriteriaDetails: scoreBundle.scoreCriteriaDetails || {},
      evalMeta: scoreBundle.evalMeta || {},
      absentRegs: scoreBundle.absentRegs || {},
      customCriteriaByComp: criteria && Object.keys(criteria).length > 0 ? criteria : defaults.customCriteriaByComp,
    };
  }

  let appState: AppStoreState = loadStore();

  const SESSION_TTL_SEC = 60 * 60 * 24 * 365;

  function signAppToken(sessionUser: AppSessionUser): string {
    const payload = { user: sessionUser, exp: Date.now() + SESSION_TTL_SEC * 1000 };
    const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
    const sig = crypto.createHmac('sha256', sessionSecret).update(`app:${encoded}`).digest('base64url');
    return `${encoded}.${sig}`;
  }

  function verifyAppToken(token: string): AppSessionUser | null {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [encoded, sig] = parts;
    if (!encoded || !sig) return null;
    const expected = crypto.createHmac('sha256', sessionSecret).update(`app:${encoded}`).digest('base64url');
    const sigBuf = Buffer.from(sig, 'utf-8');
    const expBuf = Buffer.from(expected, 'utf-8');
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    try {
      const parsed = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as { user: AppSessionUser; exp: number };
      if (!parsed.exp || parsed.exp < Date.now()) return null;
      return parsed.user;
    } catch {
      return null;
    }
  }

  function isHttpsRequest(req: Request): boolean {
    const proto = String(req.headers['x-forwarded-proto'] || '').toLowerCase();
    return Boolean(req.secure || proto.includes('https') || req.headers['x-forwarded-ssl'] === 'on');
  }

  function buildCookieSameSite(req: Request): string {
    const isHttps = isHttpsRequest(req);
    const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
    if (isHttps && secFetchSite === 'cross-site') {
      return 'SameSite=None; Secure; Partitioned';
    }
    return isHttps ? 'SameSite=Lax; Secure' : 'SameSite=Lax';
  }

  function setSessionCookie(req: Request, res: Response, token: string): void {
    const attrs = [
      `${COOKIE_NAME}=${encodeURIComponent(token)}`,
      'Path=/',
      'HttpOnly',
      `Max-Age=${SESSION_TTL_SEC}`,
      buildCookieSameSite(req),
    ];
    res.setHeader('Set-Cookie', attrs.join('; '));
  }

  function clearSessionCookie(req: Request, res: Response): void {
    const attrs = [
      `${COOKIE_NAME}=`,
      'Path=/',
      'HttpOnly',
      'Max-Age=0',
      buildCookieSameSite(req),
    ];
    res.setHeader('Set-Cookie', attrs.join('; '));
  }

  function getSessionFromReq(req: Request, isMutation: boolean): AppSessionUser {
    const guest: AppSessionUser = {
      role: 'guest',
      userId: null,
      displayName: 'ผู้เยี่ยมชมทั่วไป',
      schoolId: null,
      judgeId: null,
    };

    const candidates: string[] = [];

    const xAppToken = typeof req.headers['x-app-token'] === 'string' ? req.headers['x-app-token'].trim() : '';
    if (xAppToken) {
      candidates.push(xAppToken);
    }

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearer = authHeader.slice(7).trim();
      if (bearer && !candidates.includes(bearer)) {
        candidates.push(bearer);
      }
    }

    const cookies = parseCookies(req.headers.cookie);
    const cookieToken = cookies[COOKIE_NAME] || '';
    if (cookieToken && (!isMutation || req.headers['x-requested-with'] === 'XMLHttpRequest')) {
      if (!candidates.includes(cookieToken)) {
        candidates.push(cookieToken);
      }
    }

    let verified: AppSessionUser | null = null;
    for (const cand of candidates) {
      const parsed = verifyAppToken(cand);
      if (parsed) {
        verified = parsed;
        break;
      }
    }
    if (!verified) return guest;

    // Validate active record
    if (verified.role === 'school') {
      const found = appState.schools.find((s) => s.id === verified.schoolId);
      if (!found) return guest;
      return { ...verified, displayName: found.name };
    }
    if (verified.role === 'judge') {
      const found = appState.judges.find((j) => j.id === verified.judgeId);
      if (!found) return guest;
      return { ...verified, displayName: found.name };
    }
    if (verified.role === 'admin') {
      return { ...verified, displayName: appState.adminCredentials.displayName };
    }
    return guest;
  }

  function normalizeCategory(raw: unknown): UploadCategory {
    const val = String(raw || '').trim().toLowerCase();
    return (UPLOAD_CATEGORIES as readonly string[]).includes(val) ? (val as UploadCategory) : 'students';
  }

  function isSafeUploadUrl(url: string): boolean {
    return /^\/uploads\/(?:(?:students|coaches|judges|backgrounds)\/)?[a-zA-Z0-9_\-]+\.(png|jpg|jpeg|gif|webp)$/i.test(url.trim());
  }

  function saveImageToUploadFolder(dataUrl: string, category: UploadCategory, prefix: string): string {
    const trimmed = String(dataUrl || '').trim();
    if (!trimmed) return '';
    if (isSafeUploadUrl(trimmed)) return trimmed;

    const match = trimmed.match(/^data:image\/(png|jpeg|jpg|gif|webp);base64,([A-Za-z0-9+/=]+)$/i);
    if (!match) return '';

    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > 6 * 1024 * 1024) {
      return '';
    }
    const detectedExt = detectImageExtension(buffer);
    if (!detectedExt) return '';

    const safePrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '') || 'img';
    const filename = `${safePrefix}_${crypto.randomBytes(8).toString('hex')}.${detectedExt}`;
    const catDir = path.resolve(uploadsDir, category);
    fs.mkdirSync(catDir, { recursive: true });
    const targetPath = path.resolve(catDir, filename);
    if (!targetPath.startsWith(catDir + path.sep)) return '';
    fs.writeFileSync(targetPath, buffer);
    return `/uploads/${category}/${filename}`;
  }

  function deleteUploadIfUnused(url: string): void {
    const trimmed = String(url || '').trim();
    const match = trimmed.match(/^\/uploads\/(?:(students|coaches|judges|backgrounds)\/)?([a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|webp))$/i);
    if (!match) return;

    const serialized = JSON.stringify({
      backgrounds: appState.backgrounds,
      judges: appState.judges.map((j) => j.photoUrl),
      registrations: appState.registrations.map((r) => ({
        s: r.students.map((st) => st.photoUrl),
        c: r.coaches.map((co) => co.photoUrl),
      })),
    });
    if (serialized.includes(trimmed)) return;

    const sub = match[1] ? match[1].toLowerCase() : '';
    const target = sub
      ? path.resolve(uploadsDir, sub, path.basename(match[2]))
      : path.resolve(uploadsDir, path.basename(match[2]));
    if (!target.startsWith(uploadsDir + path.sep)) return;
    if (fs.existsSync(target) && fs.statSync(target).isFile()) {
      try {
        fs.unlinkSync(target);
      } catch {
        // ignore cleanup error
      }
    }
  }

  function getStorageStats() {
    const categories: Record<string, { files: number; bytes: number }> = {};
    let totalUploadFiles = 0;
    let totalUploadBytes = 0;

    for (const cat of UPLOAD_CATEGORIES) {
      const dir = path.resolve(uploadsDir, cat);
      let files = 0;
      let bytes = 0;
      if (fs.existsSync(dir)) {
        for (const name of fs.readdirSync(dir)) {
          const full = path.resolve(dir, name);
          if (fs.statSync(full).isFile()) {
            files += 1;
            bytes += fs.statSync(full).size;
          }
        }
      }
      categories[cat] = { files, bytes };
      totalUploadFiles += files;
      totalUploadBytes += bytes;
    }

    return {
      totalUploadFiles,
      totalUploadBytes,
      categories,
      collections: {
        schools: appState.schools.length,
        judges: appState.judges.length,
        registrations: appState.registrations.length,
        schedules: Object.keys(appState.schedules).length,
        scores: Object.keys(appState.scores).length,
      },
    };
  }

  function buildClientState(sessionUser: AppSessionUser) {
    const isAdmin = sessionUser.role === 'admin';
    return {
      authSession: sessionUser,
      adminCredentials: {
        username: isAdmin ? appState.adminCredentials.username : '',
        password: '',
        displayName: appState.adminCredentials.displayName,
      },
      registrationOpen: appState.registrationOpen,
      menuPermissions: appState.menuPermissions,
      backgrounds: appState.backgrounds,
      schools: appState.schools.map((s) => ({
        id: s.id,
        schoolCode: s.schoolCode,
        password: '',
        name: s.name,
        director: s.director,
        phone: s.phone,
      })),
      judges: appState.judges.map((j) => ({
        id: j.id,
        username: j.username,
        password: '',
        name: j.name,
        position: j.position,
        competitionId: j.competitionId,
        level: j.level,
        photoUrl: j.photoUrl,
      })),
      schedules: appState.schedules,
      registrations: appState.registrations,
      scores: appState.scores,
      scoreCriteriaDetails: appState.scoreCriteriaDetails,
      evalMeta: appState.evalMeta,
      absentRegs: appState.absentRegs,
      customCriteriaByComp: appState.customCriteriaByComp,
      storageStats: isAdmin ? getStorageStats() : null,
    };
  }

  function collectRegImages(reg: AppRegistration): string[] {
    const list: string[] = [];
    reg.students.forEach((s) => { if (s.photoUrl) list.push(s.photoUrl); });
    reg.coaches.forEach((c) => { if (c.photoUrl) list.push(c.photoUrl); });
    return list;
  }

  const router = express.Router();

  router.get('/bootstrap', (req: Request, res: Response) => {
    const sessionUser = getSessionFromReq(req, false);
    if (sessionUser.role !== 'guest') {
      const refreshedToken = signAppToken(sessionUser);
      setSessionCookie(req, res, refreshedToken);
      res.json({ ok: true, token: refreshedToken, state: buildClientState(sessionUser) });
      return;
    }
    res.json({ ok: true, state: buildClientState(sessionUser) });
  });

  router.post('/login', (req: Request, res: Response) => {
    const tab = String(req.body?.loginTab || 'school');
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();

    if (!username || !password) {
      res.status(400).json({ ok: false, error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่านให้ครบถ้วน' });
      return;
    }

    if (tab === 'admin') {
      if (
        username === appState.adminCredentials.username &&
        verifySecret(password, appState.adminCredentials.passwordHash)
      ) {
        const user: AppSessionUser = {
          role: 'admin',
          userId: 'admin-01',
          displayName: appState.adminCredentials.displayName,
          schoolId: null,
          judgeId: null,
        };
        const token = signAppToken(user);
        setSessionCookie(req, res, token);
        res.json({
          ok: true,
          token,
          message: `เข้าสู่ระบบผู้ดูแลระบบสำเร็จ (${user.displayName})`,
          state: buildClientState(user),
        });
        return;
      }
      res.status(401).json({ ok: false, error: 'ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' });
      return;
    }

    if (tab === 'school') {
      const found = appState.schools.find(
        (s) => s.schoolCode.trim() === username && verifySecret(password, s.passwordHash)
      );
      if (found) {
        const user: AppSessionUser = {
          role: 'school',
          userId: found.id,
          displayName: found.name,
          schoolId: found.id,
          judgeId: null,
        };
        const token = signAppToken(user);
        setSessionCookie(req, res, token);
        res.json({
          ok: true,
          token,
          message: `ยินดีต้อนรับ ${found.name}`,
          state: buildClientState(user),
        });
        return;
      }
      res.status(401).json({ ok: false, error: 'รหัสสถานศึกษาหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง' });
      return;
    }

    if (tab === 'judge') {
      const foundJudge = appState.judges.find(
        (j) => j.username.trim() === username && verifySecret(password, j.passwordHash)
      );
      if (foundJudge) {
        const user: AppSessionUser = {
          role: 'judge',
          userId: foundJudge.id,
          displayName: foundJudge.name,
          schoolId: null,
          judgeId: foundJudge.id,
        };
        const token = signAppToken(user);
        setSessionCookie(req, res, token);
        res.json({
          ok: true,
          token,
          message: `เข้าสู่ระบบกรรมการตัดสิน: ${foundJudge.name}`,
          state: buildClientState(user),
        });
        return;
      }
      res.status(401).json({ ok: false, error: 'Username หรือ Password ของกรรมการไม่ถูกต้อง' });
      return;
    }

    res.status(400).json({ ok: false, error: 'ประเภทการเข้าสู่ระบบไม่ถูกต้อง' });
  });

  router.post('/signup', (req: Request, res: Response) => {
    const schoolCode = String(req.body?.schoolCode || '').trim();
    const name = String(req.body?.name || '').trim();
    const director = String(req.body?.director || '').trim();
    const phone = String(req.body?.phone || '').trim() || '-';
    const password = String(req.body?.password || '').trim();

    if (!schoolCode || !name || !director || !password) {
      res.status(400).json({ ok: false, error: 'กรุณากรอกข้อมูลโรงเรียนให้ครบถ้วน' });
      return;
    }
    if (password.length < 4) {
      res.status(400).json({ ok: false, error: 'กรุณากำหนดรหัสผ่านอย่างน้อย 4 ตัวอักษร' });
      return;
    }
    if (appState.schools.some((s) => s.schoolCode.trim() === schoolCode)) {
      res.status(409).json({ ok: false, error: 'รหัสสถานศึกษานี้มีในระบบแล้ว (จำกัดโรงเรียนละ ๑ User)' });
      return;
    }

    const safeSlug = schoolCode.replace(/[^a-zA-Z0-9_-]/g, '') || crypto.randomBytes(3).toString('hex');
    const created: StoredAppSchool = {
      id: `sch-${safeSlug}-${Date.now()}`,
      schoolCode,
      passwordHash: hashSecret(password),
      name,
      director,
      phone,
    };
    appState.schools.push(created);
    saveStore(appState);

    const user: AppSessionUser = {
      role: 'school',
      userId: created.id,
      displayName: created.name,
      schoolId: created.id,
      judgeId: null,
    };
    const token = signAppToken(user);
    setSessionCookie(req, res, token);
    res.status(201).json({
      ok: true,
      token,
      message: `สมัครสมาชิกโรงเรียน "${created.name}" สำเร็จ และเข้าสู่ระบบแล้ว`,
      state: buildClientState(user),
    });
  });

  router.post('/logout', (req: Request, res: Response) => {
    clearSessionCookie(req, res);
    const guest: AppSessionUser = {
      role: 'guest',
      userId: null,
      displayName: 'ผู้เยี่ยมชมทั่วไป',
      schoolId: null,
      judgeId: null,
    };
    res.json({ ok: true, message: 'ออกจากระบบเรียบร้อยแล้ว', state: buildClientState(guest) });
  });

  router.post('/upload-image', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role === 'guest') {
      res.status(403).json({ ok: false, error: 'กรุณาเข้าสู่ระบบก่อนอัปโหลดรูปภาพ' });
      return;
    }
    const category = normalizeCategory(req.body?.category);
    if (category === 'backgrounds' && user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้นที่อัปโหลดภาพพื้นหลังได้' });
      return;
    }
    if (category === 'judges' && user.role !== 'admin' && user.role !== 'judge') {
      res.status(403).json({ ok: false, error: 'ไม่มีสิทธิ์อัปโหลดภาพกรรมการ' });
      return;
    }
    if ((category === 'students' || category === 'coaches') && user.role !== 'admin' && user.role !== 'school') {
      res.status(403).json({ ok: false, error: 'ไม่มีสิทธิ์อัปโหลดภาพผู้เข้าแข่งขันหรือครูผู้ฝึกสอน' });
      return;
    }

    const prefixMap: Record<UploadCategory, string> = {
      students: 'stu',
      coaches: 'coach',
      judges: 'jdg',
      backgrounds: 'bg',
    };
    const savedUrl = saveImageToUploadFolder(String(req.body?.dataUrl || ''), category, prefixMap[category]);
    if (!savedUrl) {
      res.status(400).json({ ok: false, error: 'ไฟล์รูปภาพไม่ถูกต้อง รองรับ PNG, JPG, GIF, WebP ขนาดไม่เกิน 6 MB' });
      return;
    }
    res.json({
      ok: true,
      url: savedUrl,
      category,
      message: 'อัปโหลดและจัดเก็บไฟล์รูปภาพลงบนเซิร์ฟเวอร์เรียบร้อยแล้ว',
    });
  });

  router.post('/registrations/save', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin' && user.role !== 'school') {
      res.status(403).json({ ok: false, error: 'กรุณาเข้าสู่ระบบโรงเรียนหรือผู้ดูแลระบบก่อนดำเนินการ' });
      return;
    }

    const editingId = typeof req.body?.id === 'string' && req.body.id.trim() ? req.body.id.trim() : null;
    if (user.role === 'school' && !appState.registrationOpen && !editingId) {
      res.status(403).json({ ok: false, error: 'ขณะนี้ระบบปิดรับสมัครแข่งขันแล้ว' });
      return;
    }

    const schoolId = user.role === 'school' ? String(user.schoolId || '') : String(req.body?.schoolId || '').trim();
    const compId = String(req.body?.competitionId || '').trim();
    const comp = APP_COMPETITIONS.find((c) => c.id === compId);
    const level = String(req.body?.level || '').trim();

    if (!comp || !comp.levels.includes(level)) {
      res.status(400).json({ ok: false, error: 'รายการแข่งขันหรือระดับชั้นไม่ถูกต้อง' });
      return;
    }
    if (!appState.schools.some((s) => s.id === schoolId)) {
      res.status(400).json({ ok: false, error: 'ไม่พบข้อมูลโรงเรียนที่เลือก' });
      return;
    }

    const rawStudents = Array.isArray(req.body?.students) ? req.body.students : [];
    const students: AppStudentMember[] = [];
    for (const st of rawStudents) {
      const name = String(st?.name || '').trim();
      if (!name) continue;
      const photoUrl = saveImageToUploadFolder(String(st?.photoUrl || ''), 'students', 'stu');
      students.push({ name, photoUrl });
    }
    if (students.length === 0 || students.length > comp.teamSize) {
      res.status(400).json({ ok: false, error: `กรุณาระบุผู้เข้าแข่งขันให้ถูกต้อง (${comp.type})` });
      return;
    }

    const rawCoaches = Array.isArray(req.body?.coaches) ? req.body.coaches : [];
    const coaches: AppCoachMember[] = [];
    for (const c of rawCoaches) {
      const cName = typeof c === 'string' ? c.trim() : String(c?.name || '').trim();
      if (!cName) continue;
      const cPhoto = typeof c === 'object' && c ? saveImageToUploadFolder(String(c.photoUrl || ''), 'coaches', 'coach') : '';
      coaches.push({ name: cName, photoUrl: cPhoto });
    }
    if (coaches.length === 0) {
      coaches.push({ name: 'ครูผู้ฝึกสอน', photoUrl: '' });
    } else if (coaches.length > 3) {
      res.status(400).json({ ok: false, error: 'กำหนดครูผู้ฝึกสอนได้สูงสุด 3 ท่าน' });
      return;
    }

    const qualifyingSong = comp.requiresSongs ? String(req.body?.qualifyingSong || '').trim() : '';
    const finalSong = comp.requiresSongs ? String(req.body?.finalSong || '').trim() : '';
    if (comp.requiresSongs && (!qualifyingSong || !finalSong)) {
      res.status(400).json({ ok: false, error: 'รายการร้องเพลงไทยลูกทุ่งต้องระบุเพลงรอบคัดเลือกและรอบตัดสินให้ครบถ้วน' });
      return;
    }

    let removedImages: string[] = [];
    let msg = '';
    if (editingId) {
      const idx = appState.registrations.findIndex((r) => r.id === editingId);
      if (idx === -1) {
        res.status(404).json({ ok: false, error: 'ไม่พบรายการสมัครที่ต้องการแก้ไข' });
        return;
      }
      const existing = appState.registrations[idx];
      if (user.role === 'school' && existing.schoolId !== schoolId) {
        res.status(403).json({ ok: false, error: 'ไม่มีสิทธิ์แก้ไขข้อมูลการสมัครของโรงเรียนอื่น' });
        return;
      }
      removedImages = collectRegImages(existing);
      appState.registrations[idx] = {
        id: editingId,
        schoolId: user.role === 'admin' ? schoolId : existing.schoolId,
        competitionId: compId,
        level,
        students,
        coaches,
        qualifyingSong,
        finalSong,
      };
      msg = 'แก้ไขข้อมูลการสมัครแข่งขันเรียบร้อยแล้ว';
    } else {
      const newReg: AppRegistration = {
        id: `reg-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        schoolId,
        competitionId: compId,
        level,
        students,
        coaches,
        qualifyingSong,
        finalSong,
      };
      appState.registrations.push(newReg);
      msg = 'บันทึกการสมัครแข่งขันเรียบร้อยแล้ว';
    }

    saveStore(appState);
    removedImages.forEach(deleteUploadIfUnused);
    res.json({ ok: true, message: msg, state: buildClientState(user) });
  });

  router.post('/registrations/delete', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin' && user.role !== 'school') {
      res.status(403).json({ ok: false, error: 'ไม่มีสิทธิ์ลบรายการสมัคร' });
      return;
    }
    const id = String(req.body?.id || '').trim();
    const idx = appState.registrations.findIndex((r) => r.id === id);
    if (idx === -1) {
      res.status(404).json({ ok: false, error: 'ไม่พบรายการสมัครที่ต้องการลบ' });
      return;
    }
    const target = appState.registrations[idx];
    if (user.role === 'school' && target.schoolId !== user.schoolId) {
      res.status(403).json({ ok: false, error: 'ไม่สามารถลบรายการสมัครของโรงเรียนอื่นได้' });
      return;
    }

    const removedImages = collectRegImages(target);
    appState.registrations.splice(idx, 1);
    delete appState.absentRegs[id];
    delete appState.scores[id];
    delete appState.scoreCriteriaDetails[id];
    saveStore(appState);
    removedImages.forEach(deleteUploadIfUnused);
    res.json({ ok: true, message: 'ลบรายการสมัครเรียบร้อยแล้ว', state: buildClientState(user) });
  });

  router.post('/schedules/save', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }
    const key = String(req.body?.key || '').trim();
    if (!key) {
      res.status(400).json({ ok: false, error: 'ไม่พบรหัสตารางแข่งขัน' });
      return;
    }
    appState.schedules[key] = {
      venue: String(req.body?.venue || '').trim() || EVENT_VENUE_TH,
      dateLabel: String(req.body?.dateLabel || '').trim() || EVENT_DATE_TH,
      timeRange: String(req.body?.timeRange || '').trim() || '08.30 - 12.00 น.',
      notes: String(req.body?.notes || '').trim(),
    };
    saveStore(appState);
    res.json({ ok: true, message: 'บันทึกตารางการแข่งขันเรียบร้อยแล้ว', state: buildClientState(user) });
  });

  router.post('/criteria/save', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }
    const competitionId = String(req.body?.competitionId || '').trim();
    if (!APP_COMPETITIONS.some((c) => c.id === competitionId)) {
      res.status(400).json({ ok: false, error: 'ไม่พบรายการแข่งขัน' });
      return;
    }
    const items = Array.isArray(req.body?.criteria) ? req.body.criteria : [];
    const cleaned: CriterionDef[] = [];
    items.forEach((it: any, idx: number) => {
      const label = String(it?.label || '').trim();
      const max = Number(it?.max || 0);
      if (!label || !Number.isFinite(max) || max <= 0) return;
      const key = String(it?.key || '').trim() || `crit_${competitionId}_${Date.now()}_${idx + 1}`;
      cleaned.push({ key, label, max, maxLabel: `${max} คะแนน` });
    });
    if (cleaned.length === 0) {
      res.status(400).json({ ok: false, error: 'ต้องมีเกณฑ์การตัดสินอย่างน้อย 1 ข้อ' });
      return;
    }
    appState.customCriteriaByComp[competitionId] = cleaned;
    saveStore(appState);
    res.json({ ok: true, message: 'บันทึกเกณฑ์การให้คะแนนเรียบร้อยแล้ว', state: buildClientState(user) });
  });

  router.post('/criteria/reset', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }
    const competitionId = String(req.body?.competitionId || '').trim();
    if (!APP_COMPETITIONS.some((c) => c.id === competitionId)) {
      res.status(400).json({ ok: false, error: 'ไม่พบรายการแข่งขัน' });
      return;
    }
    appState.customCriteriaByComp[competitionId] = getDefaultAppCriteria(competitionId);
    saveStore(appState);
    res.json({ ok: true, message: 'คืนค่าเกณฑ์เริ่มต้นเรียบร้อยแล้ว', state: buildClientState(user) });
  });

  router.post('/admin/schools/save', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }
    const id = typeof req.body?.id === 'string' && req.body.id.trim() ? req.body.id.trim() : null;
    const schoolCode = String(req.body?.schoolCode || '').trim();
    const name = String(req.body?.name || '').trim();
    const director = String(req.body?.director || '').trim() || '-';
    const phone = String(req.body?.phone || '').trim() || '-';
    const password = String(req.body?.password || '').trim();

    if (!schoolCode || !name) {
      res.status(400).json({ ok: false, error: 'กรุณากรอกรหัสสถานศึกษาและชื่อโรงเรียน' });
      return;
    }
    if (appState.schools.some((s) => s.id !== id && s.schoolCode.trim() === schoolCode)) {
      res.status(409).json({ ok: false, error: 'รหัสสถานศึกษานี้มีในระบบแล้ว' });
      return;
    }

    let msg = '';
    if (id) {
      const idx = appState.schools.findIndex((s) => s.id === id);
      if (idx === -1) {
        res.status(404).json({ ok: false, error: 'ไม่พบข้อมูลโรงเรียน' });
        return;
      }
      appState.schools[idx] = {
        ...appState.schools[idx],
        schoolCode,
        name,
        director,
        phone,
        passwordHash: password ? hashSecret(password) : appState.schools[idx].passwordHash,
      };
      msg = 'แก้ไขข้อมูลโรงเรียนเรียบร้อยแล้ว';
    } else {
      const safeSlug = schoolCode.replace(/[^a-zA-Z0-9_-]/g, '') || crypto.randomBytes(3).toString('hex');
      appState.schools.push({
        id: `sch-${safeSlug}-${Date.now()}`,
        schoolCode,
        passwordHash: hashSecret(password || '1234'),
        name,
        director,
        phone,
      });
      msg = 'เพิ่มโรงเรียนเข้าสู่ระบบเรียบร้อยแล้ว';
    }

    saveStore(appState);
    res.json({ ok: true, message: msg, state: buildClientState(user) });
  });

  router.post('/admin/schools/delete', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }
    const id = String(req.body?.id || '').trim();
    const before = appState.schools.length;
    appState.schools = appState.schools.filter((s) => s.id !== id);
    if (appState.schools.length === before) {
      res.status(404).json({ ok: false, error: 'ไม่พบข้อมูลโรงเรียน' });
      return;
    }
    const removedImages: string[] = [];
    appState.registrations = appState.registrations.filter((r) => {
      if (r.schoolId === id) {
        removedImages.push(...collectRegImages(r));
        delete appState.scores[r.id];
        delete appState.scoreCriteriaDetails[r.id];
        delete appState.absentRegs[r.id];
        return false;
      }
      return true;
    });
    saveStore(appState);
    removedImages.forEach(deleteUploadIfUnused);
    res.json({ ok: true, message: 'ลบโรงเรียนเรียบร้อยแล้ว', state: buildClientState(user) });
  });

  router.post('/admin/judges/save', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }
    const id = typeof req.body?.id === 'string' && req.body.id.trim() ? req.body.id.trim() : null;
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '').trim();
    const name = String(req.body?.name || '').trim();
    const position = String(req.body?.position || 'กรรมการตัดสิน').trim() || 'กรรมการตัดสิน';
    const competitionId = String(req.body?.competitionId || 'comp-1').trim();
    const level = String(req.body?.level || '').trim();
    const photoUrl = saveImageToUploadFolder(String(req.body?.photoUrl || ''), 'judges', 'jdg');

    const comp = APP_COMPETITIONS.find((c) => c.id === competitionId);
    if (!comp || !comp.levels.includes(level)) {
      res.status(400).json({ ok: false, error: 'รายการแข่งขันหรือระดับชั้นไม่ถูกต้อง' });
      return;
    }
    if (!username || !name) {
      res.status(400).json({ ok: false, error: 'กรุณากรอก Username และชื่อ-นามสกุลกรรมการ' });
      return;
    }
    if (appState.judges.some((j) => j.id !== id && j.username.trim() === username)) {
      res.status(409).json({ ok: false, error: 'Username กรรมการนี้มีอยู่ในระบบแล้ว' });
      return;
    }

    let oldPhoto = '';
    let msg = '';
    if (id) {
      const idx = appState.judges.findIndex((j) => j.id === id);
      if (idx === -1) {
        res.status(404).json({ ok: false, error: 'ไม่พบข้อมูลกรรมการ' });
        return;
      }
      oldPhoto = appState.judges[idx].photoUrl || '';
      appState.judges[idx] = {
        ...appState.judges[idx],
        username,
        name,
        position,
        competitionId,
        level,
        photoUrl,
        passwordHash: password ? hashSecret(password) : appState.judges[idx].passwordHash,
      };
      msg = 'แก้ไขข้อมูลกรรมการเรียบร้อยแล้ว';
    } else {
      appState.judges.push({
        id: `jdg-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        username,
        passwordHash: hashSecret(password || '1234'),
        name,
        position,
        competitionId,
        level,
        photoUrl,
      });
      msg = 'เพิ่มกรรมการตัดสินเรียบร้อยแล้ว';
    }

    saveStore(appState);
    if (oldPhoto && oldPhoto !== photoUrl) deleteUploadIfUnused(oldPhoto);
    res.json({ ok: true, message: msg, state: buildClientState(user) });
  });

  router.post('/admin/judges/delete', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }
    const id = String(req.body?.id || '').trim();
    const target = appState.judges.find((j) => j.id === id);
    if (!target) {
      res.status(404).json({ ok: false, error: 'ไม่พบข้อมูลกรรมการ' });
      return;
    }
    appState.judges = appState.judges.filter((j) => j.id !== id);
    saveStore(appState);
    if (target.photoUrl) deleteUploadIfUnused(target.photoUrl);
    res.json({ ok: true, message: 'ลบข้อมูลกรรมการเรียบร้อยแล้ว', state: buildClientState(user) });
  });

  router.post('/admin/settings', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }

    if (typeof req.body?.registrationOpen === 'boolean') {
      appState.registrationOpen = req.body.registrationOpen;
    }
    if (req.body?.menuPermissions && typeof req.body.menuPermissions === 'object') {
      for (const [k, v] of Object.entries(req.body.menuPermissions)) {
        if (Object.prototype.hasOwnProperty.call(appState.menuPermissions, k)) {
          appState.menuPermissions[k] = Boolean(v);
        }
      }
    }
    let refreshedToken: string | undefined;
    if (req.body?.adminCredentials && typeof req.body.adminCredentials === 'object') {
      const c = req.body.adminCredentials;
      const curPass = String(c.currentPass || '').trim();
      const newUser = String(c.newUsername || '').trim();
      const newDisplay = String(c.newDisplayName || '').trim();
      const newPass = String(c.newPass || '').trim();

      if (!verifySecret(curPass, appState.adminCredentials.passwordHash)) {
        res.status(400).json({ ok: false, error: 'รหัสผ่านปัจจุบันไม่ถูกต้อง' });
        return;
      }
      if (!newUser) {
        res.status(400).json({ ok: false, error: 'กรุณาระบุชื่อผู้ใช้ Admin' });
        return;
      }
      if (newPass && newPass.length < 4) {
        res.status(400).json({ ok: false, error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' });
        return;
      }
      appState.adminCredentials.username = newUser;
      if (newDisplay) {
        appState.adminCredentials.displayName = newDisplay;
        user.displayName = newDisplay;
      }
      if (newPass) {
        appState.adminCredentials.passwordHash = hashSecret(newPass);
      }
      refreshedToken = signAppToken(user);
      setSessionCookie(req, res, refreshedToken);
    }

    saveStore(appState);
    res.json({
      ok: true,
      ...(refreshedToken ? { token: refreshedToken } : {}),
      message: 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว',
      state: buildClientState(user),
    });
  });

  router.post('/admin/backgrounds', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }
    const key = String(req.body?.key || '').trim() as keyof AppBackgrounds;
    const allowed: Array<keyof AppBackgrounds> = ['bannerBgUrl', 'studentCardBgUrl', 'coachCardBgUrl', 'judgeCardBgUrl', 'certBgUrl'];
    if (!allowed.includes(key)) {
      res.status(400).json({ ok: false, error: 'ประเภทภาพพื้นหลังไม่ถูกต้อง' });
      return;
    }
    const rawVal = String(req.body?.dataUrl || '').trim();
    const oldVal = appState.backgrounds[key] || '';
    if (!rawVal) {
      appState.backgrounds[key] = '';
      saveStore(appState);
      if (oldVal) deleteUploadIfUnused(oldVal);
      res.json({ ok: true, message: 'ลบรูปภาพพื้นหลังเรียบร้อยแล้ว', state: buildClientState(user) });
      return;
    }
    const savedUrl = saveImageToUploadFolder(rawVal, 'backgrounds', `bg_${key}`);
    if (!savedUrl) {
      res.status(400).json({ ok: false, error: 'ไม่สามารถบันทึกไฟล์รูปภาพพื้นหลังได้ กรุณาใช้ไฟล์ PNG, JPG, GIF หรือ WebP' });
      return;
    }
    appState.backgrounds[key] = savedUrl;
    saveStore(appState);
    if (oldVal && oldVal !== savedUrl) deleteUploadIfUnused(oldVal);
    res.json({ ok: true, url: savedUrl, message: 'บันทึกภาพพื้นหลังลงบนเซิร์ฟเวอร์เรียบร้อยแล้ว', state: buildClientState(user) });
  });

  router.post('/admin/approval', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }
    const metaKey = String(req.body?.metaKey || '').trim();
    const approved = Boolean(req.body?.approved);
    if (!metaKey || !metaKey.includes('__')) {
      res.status(400).json({ ok: false, error: 'ไม่พบรายการที่ต้องการอนุมัติ' });
      return;
    }
    appState.evalMeta[metaKey] = { status: approved ? 'completed' : 'judging', approved };
    saveStore(appState);
    res.json({
      ok: true,
      message: approved ? 'อนุมัติผลการแข่งขันเรียบร้อยแล้ว' : 'ยกเลิกการอนุมัติผลการแข่งขันเรียบร้อยแล้ว',
      state: buildClientState(user),
    });
  });

  router.post('/judge/scores', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'judge' || !user.judgeId) {
      res.status(403).json({ ok: false, error: 'สำหรับกรรมการตัดสินที่เข้าสู่ระบบแล้วเท่านั้น' });
      return;
    }
    const judge = appState.judges.find((j) => j.id === user.judgeId);
    if (!judge) {
      res.status(403).json({ ok: false, error: 'ไม่พบข้อมูลกรรมการ' });
      return;
    }
    const metaKey = `${judge.competitionId}__${judge.level}`;
    if (appState.evalMeta[metaKey]?.approved) {
      res.status(403).json({ ok: false, error: 'ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถแก้ไขคะแนนได้' });
      return;
    }

    const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];
    const criteriaList =
      judge.competitionId === 'comp-7'
        ? [{ key: 'correctAnswers', label: 'จำนวนข้อสอบที่ตอบถูกต้อง', max: 100 }]
        : appState.customCriteriaByComp[judge.competitionId] || getDefaultAppCriteria(judge.competitionId);

    for (const entry of entries) {
      const regId = String(entry?.registrationId || '').trim();
      const reg = appState.registrations.find((r) => r.id === regId);
      if (!reg || reg.competitionId !== judge.competitionId || reg.level !== judge.level) continue;
      if (appState.absentRegs[regId]) continue;

      const rawCriteria = entry?.criteria && typeof entry.criteria === 'object' ? entry.criteria : {};
      const detailOut: Record<string, number> = {};
      let total = 0;
      let hasAny = false;

      for (const crit of criteriaList) {
        const rawVal = rawCriteria[crit.key];
        if (rawVal !== '' && rawVal !== undefined && rawVal !== null && !Number.isNaN(Number(rawVal))) {
          const clamped = Math.max(0, Math.min(Number(crit.max || 100), Number(rawVal)));
          const rounded = Number(clamped.toFixed(2));
          detailOut[crit.key] = rounded;
          total += rounded;
          hasAny = true;
        }
      }

      if (hasAny) {
        if (total > 100) {
          res.status(400).json({ ok: false, error: 'คะแนนรวมต้องไม่เกิน 100 คะแนน' });
          return;
        }
        appState.scores[regId] = { ...(appState.scores[regId] || {}), [judge.id]: Number(total.toFixed(2)) };
        appState.scoreCriteriaDetails[regId] = {
          ...(appState.scoreCriteriaDetails[regId] || {}),
          [judge.id]: detailOut,
        };
      }
    }

    appState.evalMeta[metaKey] = {
      status: appState.evalMeta[metaKey]?.approved ? 'completed' : 'judging',
      approved: Boolean(appState.evalMeta[metaKey]?.approved),
    };
    saveStore(appState);
    res.json({ ok: true, message: 'บันทึกคะแนนตัดสินเรียบร้อยแล้ว', state: buildClientState(user) });
  });

  router.post('/judge/absent', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, true);
    if (user.role !== 'judge' || !user.judgeId) {
      res.status(403).json({ ok: false, error: 'สำหรับกรรมการตัดสินที่เข้าสู่ระบบแล้วเท่านั้น' });
      return;
    }
    const judge = appState.judges.find((j) => j.id === user.judgeId);
    if (!judge) {
      res.status(403).json({ ok: false, error: 'ไม่พบข้อมูลกรรมการ' });
      return;
    }
    const metaKey = `${judge.competitionId}__${judge.level}`;
    if (appState.evalMeta[metaKey]?.approved) {
      res.status(403).json({ ok: false, error: 'ผู้ดูแลระบบอนุมัติผลการแข่งขันแล้ว ไม่สามารถเปลี่ยนสถานะได้' });
      return;
    }
    const regId = String(req.body?.registrationId || '').trim();
    const reg = appState.registrations.find((r) => r.id === regId);
    if (!reg || reg.competitionId !== judge.competitionId || reg.level !== judge.level) {
      res.status(403).json({ ok: false, error: 'ไม่มีสิทธิ์จัดการรายการนี้' });
      return;
    }

    const absent = Boolean(req.body?.absent);
    if (absent) {
      appState.absentRegs[regId] = true;
      delete appState.scores[regId];
      delete appState.scoreCriteriaDetails[regId];
    } else {
      delete appState.absentRegs[regId];
    }
    saveStore(appState);
    res.json({
      ok: true,
      message: absent ? 'บันทึกสถานะไม่เข้าร่วมแข่งขันเรียบร้อยแล้ว' : 'ยกเลิกสถานะไม่เข้าร่วมแข่งขันเรียบร้อยแล้ว',
      state: buildClientState(user),
    });
  });

  router.get('/admin/backup', (req: Request, res: Response) => {
    const user = getSessionFromReq(req, false);
    if (user.role !== 'admin') {
      res.status(403).json({ ok: false, error: 'เฉพาะผู้ดูแลระบบเท่านั้น' });
      return;
    }
    const payload = {
      ...buildClientState(user),
      exportedAt: new Date().toISOString(),
    };
    res.setHeader('Content-Disposition', `attachment; filename="makhapuja_backup_${new Date().toISOString().slice(0, 10)}.json"`);
    res.json(payload);
  });

  return router;
}
