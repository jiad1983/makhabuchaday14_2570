import type { CompetitionDef, CompetitionLevel } from './types';

export const STANDARD_LEVELS: CompetitionLevel[] = [
  'ประถมปลาย (ป.๔-๖)',
  'มัธยมต้น (ม.๑-๓)',
  'มัธยมปลาย (ม.๔-๖)',
];

export const UNLIMITED_LEVEL: CompetitionLevel[] = ['ไม่จำกัดระดับ'];

export const COMPETITIONS: CompetitionDef[] = [
  {
    id: 'dhamma-lecture',
    order: 1,
    name: 'การบรรยายธรรม',
    typeLabel: 'ประเภทเดี่ยว (๑ คน)',
    teamSize: 1,
    levels: STANDARD_LEVELS,
    description: 'แข่งขันทักษะการถ่ายทอดหลักธรรมคำสอนทางพระพุทธศาสนาอย่างมีปฏิภาณและน่าเลื่อมใส',
    accentHex: '#D97706',
  },
  {
    id: 'dhamma-storytelling',
    order: 2,
    name: 'การเล่านิทานธรรม',
    typeLabel: 'ประเภทเดี่ยว (๑ คน)',
    teamSize: 1,
    levels: STANDARD_LEVELS,
    description: 'นำเสนอนิทานชาดกหรือนิทานคติธรรมเพื่อปลูกฝังคุณธรรมจริยธรรมแก่ผู้ฟัง',
    accentHex: '#059669',
  },
  {
    id: 'lukthung-male',
    order: 3,
    name: 'การร้องเพลงไทยลูกทุ่งส่งเสริมคุณธรรม (ชาย)',
    typeLabel: 'ประเภทเดี่ยว (๑ คน)',
    teamSize: 1,
    levels: STANDARD_LEVELS,
    requiresSongs: true,
    description: 'ขับร้องเพลงไทยลูกทุ่งเนื้อหาส่งเสริมคุณธรรม (ผู้สมัครต้องระบุเพลงรอบคัดเลือกและรอบตัดสิน)',
    accentHex: '#0284C7',
  },
  {
    id: 'lukthung-female',
    order: 4,
    name: 'การร้องเพลงไทยลูกทุ่งส่งเสริมคุณธรรม (หญิง)',
    typeLabel: 'ประเภทเดี่ยว (๑ คน)',
    teamSize: 1,
    levels: STANDARD_LEVELS,
    requiresSongs: true,
    description: 'ขับร้องเพลงไทยลูกทุ่งเนื้อหาส่งเสริมคุณธรรม (ผู้สมัครต้องระบุเพลงรอบคัดเลือกและรอบตัดสิน)',
    accentHex: '#DB2777',
  },
  {
    id: 'line-drawing',
    order: 5,
    name: 'การวาดภาพลายเส้น',
    typeLabel: 'ประเภทเดี่ยว (๑ คน)',
    teamSize: 1,
    levels: STANDARD_LEVELS,
    description: 'ถ่ายทอดจินตนาการและคติธรรมวันมาฆบูชาผ่านศิลปะการวาดภาพลายเส้นอันประณีต',
    accentHex: '#7C3AED',
  },
  {
    id: 'dhamma-essay',
    order: 6,
    name: 'การเขียนเรียงความแก้กระทู้ธรรมชั้นตรี',
    typeLabel: 'ประเภทเดี่ยว (๑ คน)',
    teamSize: 1,
    levels: STANDARD_LEVELS,
    description: 'เรียงความอธิบายขยายความพุทธศาสนสุภาษิตและกระทู้ธรรมชั้นตรีอย่างถูกต้องตามหลักธรรม',
    accentHex: '#EA580C',
  },
  {
    id: 'dhamma-quiz',
    order: 7,
    name: 'ตอบปัญหาธรรม',
    typeLabel: 'ประเภททีมละ ๒ คน',
    teamSize: 2,
    levels: STANDARD_LEVELS,
    description: 'แข่งขันความรู้ความเข้าใจหลักธรรมคำสอน ประวัติพระพุทธศาสนา และวันมาฆบูชา',
    accentHex: '#0D9488',
  },
  {
    id: 'buddhist-ceremony',
    order: 8,
    name: 'การกล่าวคำอาราธนาและถวายทานในพุทธศาสนพิธี',
    typeLabel: 'ประเภททีมละ ๕ คน',
    teamSize: 5,
    levels: STANDARD_LEVELS,
    description: 'ปฏิบัติศาสนพิธี คำอาราธนาศีล อาราธนาธรรม อาราธนาพระปริตร และคำถวายทานอย่างถูกต้อง',
    accentHex: '#B45309',
  },
  {
    id: 'saraphanya-chanting',
    order: 9,
    name: 'การสวดมนต์หมู่สรรเสริญพระรัตนตรัยทำนองสรภัญญะ (หญิงล้วน)',
    typeLabel: 'ประเภททีมละ ๕ คน',
    teamSize: 5,
    levels: STANDARD_LEVELS,
    description: 'ขับร้องสวดมนต์ทำนองสรภัญญะอย่างพร้อมเพรียง ไพเราะ และสำรวมตามแบบแผน',
    accentHex: '#4F46E5',
  },
  {
    id: 'altar-table-7',
    order: 10,
    name: 'การจัดโต๊ะหมู่บูชา หมู่ ๗',
    typeLabel: 'ประเภททีมละ ๑๐ คน',
    teamSize: 10,
    levels: UNLIMITED_LEVEL,
    description: 'จัดตั้งโต๊ะหมู่บูชา หมู่ ๗ พร้อมเครื่องสักการะอย่างถูกต้องตามระเบียบและสวยงาม',
    accentHex: '#CA8A04',
  },
];

export function getCompetitionById(id: string): CompetitionDef | undefined {
  return COMPETITIONS.find((c) => c.id === id);
}

export function getScheduleKey(competitionId: string, level: CompetitionLevel): string {
  return `${competitionId}__${level}`;
}
