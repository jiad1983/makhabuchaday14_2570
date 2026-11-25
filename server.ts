import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createAppStoreRouter, UPLOAD_CATEGORIES } from './src/server/appStore';
import { COMPETITIONS, getCompetitionById } from './src/shared/competitions';
import type {
  ActivityLevelSummary,
  AuthUser,
  CoachMember,
  CompetitionLevel,
  Judge,
  JudgeAssignment,
  RankedResultEntry,
  Registration,
  ResultApproval,
  ScheduleItem,
  School,
  ScoreRecord,
  StudentMember,
  SystemSettings,
  TemplateSettings,
} from './src/shared/types';

dotenv.config();

const PORT = Number(process.env.PORT) || 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.resolve(DATA_DIR, 'uploads');
const DB_FILE = path.resolve(DATA_DIR, 'db.json');

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

interface StoredSchool extends School {
  passwordHash: string;
}

interface StoredJudge extends Judge {
  passwordHash: string;
}

interface DatabaseState {
  adminCredentialHash?: string;
  settings: SystemSettings;
  templates: TemplateSettings;
  schedules: ScheduleItem[];
  schools: StoredSchool[];
  judges: StoredJudge[];
  registrations: Registration[];
  scores: ScoreRecord[];
  approvals: ResultApproval[];
}

function buildDefaultSchedules(): ScheduleItem[] {
  const items: ScheduleItem[] = [];
  for (const comp of COMPETITIONS) {
    for (const level of comp.levels) {
      items.push({
        competitionId: comp.id,
        level,
        venue: '',
        dateText: '18 กุมภาพันธ์ 2570',
        timeText: '09:00 - 12:00 น.',
        notes: '',
      });
    }
  }
  return items;
}

function createInitialDb(): DatabaseState {
  return {
    settings: {
      registrationOpen: true,
      eventName: 'งานสัปดาห์ส่งเสริมวันสำคัญทางพระพุทธศาสนา วันมาฆบูชา ครั้งที่ ๑๔',
      eventSubtitle: 'ประจำปี ๒๕๗๐',
      eventDateText: 'วันที่ 18 กุมภาพันธ์ 2570',
      organizerName: 'คณะกรรมการดำเนินงานสัปดาห์ส่งเสริมวันสำคัญทางพระพุทธศาสนา วันมาฆบูชา',
    },
    templates: {},
    schedules: buildDefaultSchedules(),
    schools: [],
    judges: [],
    registrations: [],
    scores: [],
    approvals: [],
  };
}

function loadDb(): DatabaseState {
  if (!fs.existsSync(DB_FILE)) {
    const initial = createInitialDb();
    saveDb(initial);
    return initial;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<DatabaseState>;
    const defaults = createInitialDb();
    const existingSchedules = Array.isArray(parsed.schedules) ? parsed.schedules : [];
    const mergedSchedules = defaults.schedules.map((defItem) => {
      const found = existingSchedules.find(
        (s) => s.competitionId === defItem.competitionId && s.level === defItem.level
      );
      return found ? { ...defItem, ...found } : defItem;
    });
    return {
      adminCredentialHash: parsed.adminCredentialHash,
      settings: { ...defaults.settings, ...(parsed.settings || {}) },
      templates: { ...defaults.templates, ...(parsed.templates || {}) },
      schedules: mergedSchedules,
      schools: Array.isArray(parsed.schools) ? parsed.schools : [],
      judges: Array.isArray(parsed.judges) ? parsed.judges : [],
      registrations: Array.isArray(parsed.registrations) ? parsed.registrations : [],
      scores: Array.isArray(parsed.scores) ? parsed.scores : [],
      approvals: Array.isArray(parsed.approvals) ? parsed.approvals : [],
    };
  } catch {
    const initial = createInitialDb();
    saveDb(initial);
    return initial;
  }
}

function saveDb(state: DatabaseState): void {
  const tmpFile = `${DB_FILE}.${crypto.randomUUID()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

let db: DatabaseState = loadDb();

// Password hashing via Node scrypt
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, originalHex] = parts;
  if (!salt || !originalHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const original = Buffer.from(originalHex, 'hex');
    if (derived.length !== original.length) return false;
    return crypto.timingSafeEqual(derived, original);
  } catch {
    return false;
  }
}

// HMAC-SHA256 stateless Bearer token
interface TokenPayload {
  user: AuthUser;
  exp: number;
}

function signToken(user: AuthUser): string {
  const payload: TokenPayload = {
    user,
    exp: Date.now() + 1000 * 60 * 60 * 12, // 12 hours
  };
  const encoded = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  return `${encoded}.${sig}`;
}

function verifyToken(token: string): AuthUser | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encoded, sig] = parts;
  if (!encoded || !sig) return null;
  const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(encoded).digest('base64url');
  const sigBuf = Buffer.from(sig, 'utf-8');
  const expectedBuf = Buffer.from(expectedSig, 'utf-8');
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8')) as TokenPayload;
    if (!decoded.exp || decoded.exp < Date.now()) return null;
    return decoded.user;
  } catch {
    return null;
  }
}

interface AuthedRequest extends Request {
  user?: AuthUser;
}

function extractUser(req: AuthedRequest): AuthUser | null {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return null;
  const token = header.slice(7).trim();
  if (!token) return null;
  return verifyToken(token);
}

function attachOptionalAuth(req: AuthedRequest, _res: Response, next: NextFunction): void {
  const user = extractUser(req);
  if (user) req.user = user;
  next();
}

function requireAuth(roles?: Array<'admin' | 'school' | 'judge'>) {
  return (req: AuthedRequest, res: Response, next: NextFunction): void => {
    const user = extractUser(req);
    if (!user) {
      res.status(401).json({ error: 'กรุณาเข้าสู่ระบบก่อนดำเนินการ' });
      return;
    }
    if (roles && !roles.includes(user.role)) {
      res.status(403).json({ error: 'คุณไม่มีสิทธิ์เข้าถึงส่วนนี้' });
      return;
    }
    req.user = user;
    next();
  };
}

function sanitizeSchool(s: StoredSchool): School {
  const { passwordHash: _ph, ...rest } = s;
  return rest;
}

function sanitizeJudge(j: StoredJudge): Judge {
  const { passwordHash: _ph, ...rest } = j;
  return rest;
}

function enrichRegistration(reg: Registration): Registration {
  const school = db.schools.find((s) => s.id === reg.schoolId);
  return {
    ...reg,
    schoolName: school?.schoolName || reg.schoolName || 'ไม่ระบุโรงเรียน',
    schoolCode: school?.schoolCode || reg.schoolCode || '',
    directorName: school?.directorName || reg.directorName || '',
  };
}

function isJudgeAssigned(judge: StoredJudge, competitionId: string, level: CompetitionLevel): boolean {
  return judge.assignments.some((a) => a.competitionId === competitionId && a.level === level);
}

function computeRankedResults(
  competitionId: string,
  level: CompetitionLevel,
  includeIndividualScores: boolean
): RankedResultEntry[] {
  const regs = db.registrations.filter(
    (r) => r.competitionId === competitionId && r.level === level
  );
  const assignedJudges = db.judges.filter((j) => isJudgeAssigned(j, competitionId, level));
  const expectedJudgesCount = assignedJudges.length;

  const entries: RankedResultEntry[] = regs.map((reg) => {
    const school = db.schools.find((s) => s.id === reg.schoolId);
    const teamScores = db.scores.filter(
      (sc) => sc.registrationId === reg.id && sc.competitionId === competitionId && sc.level === level
    );
    const sum = teamScores.reduce((acc, item) => acc + Number(item.score || 0), 0);
    const finalScore = teamScores.length > 0 ? Number((sum / teamScores.length).toFixed(2)) : 0;

    const studentNames = reg.students.map((st) => st.fullName).filter(Boolean);
    const teamLabel =
      reg.teamName?.trim() ||
      (studentNames.length === 1
        ? studentNames[0]
        : studentNames.length > 1
        ? `${studentNames[0]} และคณะ (${studentNames.length} คน)`
        : school?.schoolName || 'ไม่ระบุชื่อ');

    const entry: RankedResultEntry = {
      rank: 0,
      registrationId: reg.id,
      schoolId: reg.schoolId,
      schoolName: school?.schoolName || 'ไม่ระบุโรงเรียน',
      teamLabel,
      students: reg.students,
      coaches: reg.coaches,
      directorName: school?.directorName || '',
      finalScore,
      judgeScoresCount: teamScores.length,
      expectedJudgesCount,
    };

    if (includeIndividualScores) {
      entry.individualScores = teamScores.map((sc) => {
        const j = db.judges.find((jd) => jd.id === sc.judgeId);
        return {
          judgeId: sc.judgeId,
          judgeName: j?.fullName || sc.judgeName || 'กรรมการ',
          score: sc.score,
          comment: sc.comment,
        };
      });
    }

    return entry;
  });

  entries.sort((a, b) => {
    if (b.finalScore !== a.finalScore) return b.finalScore - a.finalScore;
    return b.judgeScoresCount - a.judgeScoresCount;
  });

  entries.forEach((item, idx) => {
    item.rank = idx + 1;
  });

  return entries;
}

function buildSummaries(): ActivityLevelSummary[] {
  const summaries: ActivityLevelSummary[] = [];
  for (const comp of COMPETITIONS) {
    for (const level of comp.levels) {
      const regs = db.registrations.filter(
        (r) => r.competitionId === comp.id && r.level === level
      );
      const assignedJudges = db.judges.filter((j) => isJudgeAssigned(j, comp.id, level));
      const scoredRegIds = new Set(
        db.scores
          .filter((sc) => sc.competitionId === comp.id && sc.level === level)
          .map((sc) => sc.registrationId)
      );
      const approval = db.approvals.find(
        (a) => a.competitionId === comp.id && a.level === level
      );
      summaries.push({
        competitionId: comp.id,
        level,
        registeredTeamsCount: regs.length,
        judgesAssignedCount: assignedJudges.length,
        scoredTeamsCount: scoredRegIds.size,
        approved: Boolean(approval?.approved),
        approvedAt: approval?.approvedAt,
      });
    }
  }
  return summaries;
}

function isEnvAdminConfigured(): boolean {
  return Boolean(process.env.ADMIN_PASSCODE && process.env.ADMIN_PASSCODE.trim().length > 0);
}

function isAdminClaimed(): boolean {
  return isEnvAdminConfigured() || Boolean(db.adminCredentialHash);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  // Safely serve categorized uploaded images from data/uploads/:category/:filename
  app.get('/uploads/:category/:filename', (req: Request, res: Response) => {
    const category = String(req.params.category || '').trim().toLowerCase();
    if (!(UPLOAD_CATEGORIES as readonly string[]).includes(category)) {
      res.status(404).end();
      return;
    }
    const safeName = path.basename(String(req.params.filename || ''));
    if (!safeName || !/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|gif|webp)$/.test(safeName)) {
      res.status(404).end();
      return;
    }
    const catDir = path.resolve(UPLOADS_DIR, category);
    const resolved = path.resolve(catDir, safeName);
    if (!resolved.startsWith(catDir + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).end();
      return;
    }
    res.sendFile(resolved);
  });

  // Safely serve uploaded images from data/uploads
  app.get('/uploads/:filename', (req: Request, res: Response) => {
    const safeName = path.basename(String(req.params.filename || ''));
    if (!safeName || !/^[a-zA-Z0-9_-]+\.(png|jpg|jpeg|webp)$/.test(safeName)) {
      res.status(404).end();
      return;
    }
    const resolved = path.resolve(UPLOADS_DIR, safeName);
    if (!resolved.startsWith(UPLOADS_DIR + path.sep) || !fs.existsSync(resolved)) {
      res.status(404).end();
      return;
    }
    res.sendFile(resolved);
  });

  // Organized App Store & Real Image Upload API (/api/app/*)
  app.use(
    '/api/app',
    createAppStoreRouter({
      dataDir: DATA_DIR,
      uploadsDir: UPLOADS_DIR,
      sessionSecret: SESSION_SECRET,
    })
  );

  // Auth status
  app.get('/api/auth/status', (_req: Request, res: Response) => {
    res.json({
      adminClaimed: isAdminClaimed(),
      envManaged: isEnvAdminConfigured(),
      adminUsername: process.env.ADMIN_USERNAME?.trim() || 'admin',
    });
  });

  // First-run Admin claim (locked permanently once claimed or when ADMIN_PASSCODE is configured)
  app.post('/api/auth/admin-setup', (req: Request, res: Response) => {
    if (isAdminClaimed()) {
      res.status(409).json({ error: 'บัญชีผู้ดูแลระบบถูกตั้งค่าไว้แล้ว' });
      return;
    }
    const password = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    if (password.length < 6) {
      res.status(400).json({ error: 'รหัสผ่านผู้ดูแลระบบต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }
    db.adminCredentialHash = hashPassword(password);
    saveDb(db);

    const adminUsername = process.env.ADMIN_USERNAME?.trim() || 'admin';
    const user: AuthUser = {
      role: 'admin',
      id: 'admin-root',
      username: adminUsername,
      displayName: 'ผู้ดูแลระบบ',
    };
    res.json({ token: signToken(user), user });
  });

  // Public School Registration (1 user per school code)
  app.post('/api/auth/school/register', (req: Request, res: Response) => {
    const schoolCode = typeof req.body?.schoolCode === 'string' ? req.body.schoolCode.trim() : '';
    const schoolName = typeof req.body?.schoolName === 'string' ? req.body.schoolName.trim() : '';
    const directorName = typeof req.body?.directorName === 'string' ? req.body.directorName.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!schoolCode || !schoolName || !directorName || password.length < 4) {
      res.status(400).json({
        error: 'กรุณากรอกรหัสสถานศึกษา ชื่อโรงเรียน ชื่อผู้อำนวยการ และรหัสผ่าน (อย่างน้อย 4 ตัวอักษร)',
      });
      return;
    }

    const exists = db.schools.some(
      (s) => s.schoolCode.toLowerCase() === schoolCode.toLowerCase()
    );
    if (exists) {
      res.status(409).json({
        error: 'รหัสสถานศึกษานี้ลงทะเบียนใช้งานแล้ว (กำหนดให้โรงเรียนละ ๑ บัญชีผู้ใช้เท่านั้น)',
      });
      return;
    }

    const newSchool: StoredSchool = {
      id: `sch_${crypto.randomUUID()}`,
      schoolCode,
      schoolName,
      directorName,
      phone,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    db.schools.push(newSchool);
    saveDb(db);

    const user: AuthUser = {
      role: 'school',
      id: newSchool.id,
      username: newSchool.schoolCode,
      displayName: newSchool.schoolName,
      schoolId: newSchool.id,
    };
    res.status(201).json({
      token: signToken(user),
      user,
      school: sanitizeSchool(newSchool),
    });
  });

  // Unified Login (admin / school / judge)
  app.post('/api/auth/login', (req: Request, res: Response) => {
    const role = req.body?.role;
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน' });
      return;
    }

    if (role === 'admin') {
      const expectedAdminUser = process.env.ADMIN_USERNAME?.trim() || 'admin';
      if (username !== expectedAdminUser) {
        res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' });
        return;
      }

      const envPass = process.env.ADMIN_PASSCODE?.trim();
      let valid = false;
      if (envPass) {
        const a = Buffer.from(password, 'utf-8');
        const b = Buffer.from(envPass, 'utf-8');
        valid = a.length === b.length && crypto.timingSafeEqual(a, b);
      } else if (db.adminCredentialHash) {
        valid = verifyPassword(password, db.adminCredentialHash);
      } else {
        res.status(400).json({ error: 'กรุณาตั้งค่ารหัสผ่านผู้ดูแลระบบครั้งแรกก่อนเข้าสู่ระบบ' });
        return;
      }

      if (!valid) {
        res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านผู้ดูแลระบบไม่ถูกต้อง' });
        return;
      }

      const user: AuthUser = {
        role: 'admin',
        id: 'admin-root',
        username: expectedAdminUser,
        displayName: 'ผู้ดูแลระบบ',
      };
      res.json({ token: signToken(user), user });
      return;
    }

    if (role === 'school') {
      const school = db.schools.find(
        (s) => s.schoolCode.toLowerCase() === username.toLowerCase()
      );
      if (!school || !verifyPassword(password, school.passwordHash)) {
        res.status(401).json({ error: 'รหัสสถานศึกษาหรือรหัสผ่านไม่ถูกต้อง' });
        return;
      }
      const user: AuthUser = {
        role: 'school',
        id: school.id,
        username: school.schoolCode,
        displayName: school.schoolName,
        schoolId: school.id,
      };
      res.json({ token: signToken(user), user, school: sanitizeSchool(school) });
      return;
    }

    if (role === 'judge') {
      const judge = db.judges.find(
        (j) => j.username.toLowerCase() === username.toLowerCase()
      );
      if (!judge || !verifyPassword(password, judge.passwordHash)) {
        res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านกรรมการไม่ถูกต้อง' });
        return;
      }
      const user: AuthUser = {
        role: 'judge',
        id: judge.id,
        username: judge.username,
        displayName: judge.fullName,
        judgeId: judge.id,
      };
      res.json({ token: signToken(user), user, judge: sanitizeJudge(judge) });
      return;
    }

    res.status(400).json({ error: 'ประเภทผู้ใช้งานไม่ถูกต้อง' });
  });

  app.get('/api/auth/me', requireAuth(), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'school') {
      const school = db.schools.find((s) => s.id === user.schoolId);
      if (!school) {
        res.status(401).json({ error: 'ไม่พบบัญชีโรงเรียน' });
        return;
      }
      res.json({ user, school: sanitizeSchool(school) });
      return;
    }
    if (user.role === 'judge') {
      const judge = db.judges.find((j) => j.id === user.judgeId);
      if (!judge) {
        res.status(401).json({ error: 'ไม่พบบัญชีกรรมการ' });
        return;
      }
      res.json({ user, judge: sanitizeJudge(judge) });
      return;
    }
    res.json({ user });
  });

  // Public bootstrap: competition defs, settings, schedules, templates, aggregated level counts, approved results
  app.get('/api/public/bootstrap', attachOptionalAuth, (req: AuthedRequest, res: Response) => {
    const summaries = buildSummaries();
    const isAdmin = req.user?.role === 'admin';

    const approvedResults: Record<string, RankedResultEntry[]> = {};
    for (const sum of summaries) {
      if (sum.approved || isAdmin) {
        approvedResults[`${sum.competitionId}__${sum.level}`] = computeRankedResults(
          sum.competitionId,
          sum.level,
          isAdmin
        );
      }
    }

    res.json({
      competitions: COMPETITIONS,
      settings: db.settings,
      templates: db.templates,
      schedules: db.schedules,
      summaries,
      approvedResults,
      totals: {
        totalSchools: db.schools.length,
        totalRegistrations: db.registrations.length,
        totalJudges: db.judges.length,
      },
    });
  });

  // Upload image (base64 dataUrl -> saved safely to data/uploads)
  app.post('/api/upload-photo', requireAuth(), (req: AuthedRequest, res: Response) => {
    const dataUrl = typeof req.body?.dataUrl === 'string' ? req.body.dataUrl : '';
    const match = dataUrl.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/);
    if (!match) {
      res.status(400).json({ error: 'รูปแบบไฟล์รูปภาพไม่ถูกต้อง (รองรับ PNG, JPG, WebP เท่านั้น)' });
      return;
    }
    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 4 * 1024 * 1024) {
      res.status(400).json({ error: 'ขนาดไฟล์รูปภาพต้องไม่เกิน 4 MB' });
      return;
    }
    const filename = `${crypto.randomUUID()}.${ext}`;
    const targetPath = path.resolve(UPLOADS_DIR, filename);
    if (!targetPath.startsWith(UPLOADS_DIR + path.sep)) {
      res.status(400).json({ error: 'ชื่อไฟล์ไม่ถูกต้อง' });
      return;
    }
    fs.writeFileSync(targetPath, buffer);
    res.json({ url: `/uploads/${filename}` });
  });

  // Registrations CRUD (strictly scoped by role)
  app.get('/api/registrations', requireAuth(), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'admin') {
      res.json({
        registrations: db.registrations.map(enrichRegistration),
        schools: db.schools.map(sanitizeSchool),
      });
      return;
    }
    if (user.role === 'school') {
      const own = db.registrations
        .filter((r) => r.schoolId === user.schoolId)
        .map(enrichRegistration);
      res.json({ registrations: own });
      return;
    }
    if (user.role === 'judge') {
      const judge = db.judges.find((j) => j.id === user.judgeId);
      if (!judge) {
        res.status(403).json({ error: 'ไม่พบข้อมูลกรรมการ' });
        return;
      }
      const allowed = db.registrations
        .filter((r) => isJudgeAssigned(judge, r.competitionId, r.level))
        .map(enrichRegistration);
      res.json({ registrations: allowed });
      return;
    }
    res.status(403).json({ error: 'ไม่มีสิทธิ์เข้าถึง' });
  });

  app.post('/api/registrations', requireAuth(['admin', 'school']), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'school' && !db.settings.registrationOpen) {
      res.status(403).json({ error: 'ขณะนี้ผู้ดูแลระบบปิดรับสมัครการแข่งขันแล้ว' });
      return;
    }

    const schoolId =
      user.role === 'admin'
        ? String(req.body?.schoolId || '').trim()
        : String(user.schoolId || '');
    const school = db.schools.find((s) => s.id === schoolId);
    if (!school) {
      res.status(400).json({ error: 'ไม่พบข้อมูลโรงเรียนที่เลือก' });
      return;
    }

    const competitionId = String(req.body?.competitionId || '').trim();
    const comp = getCompetitionById(competitionId);
    if (!comp) {
      res.status(400).json({ error: 'ไม่พบรายการแข่งขันที่เลือก' });
      return;
    }

    const level = req.body?.level as CompetitionLevel;
    if (!comp.levels.includes(level)) {
      res.status(400).json({ error: 'ระดับชั้นไม่ถูกต้องสำหรับรายการแข่งขันนี้' });
      return;
    }

    const rawStudents: StudentMember[] = Array.isArray(req.body?.students) ? req.body.students : [];
    const students: StudentMember[] = rawStudents
      .slice(0, comp.teamSize)
      .map((st) => ({
        id: st.id || `stu_${crypto.randomUUID()}`,
        fullName: String(st.fullName || '').trim(),
        grade: String(st.grade || '').trim(),
        photoUrl: typeof st.photoUrl === 'string' ? st.photoUrl.trim() : undefined,
      }))
      .filter((st) => st.fullName.length > 0);

    if (students.length === 0) {
      res.status(400).json({ error: 'กรุณาระบุรายชื่อผู้เข้าแข่งขันอย่างน้อย 1 คน' });
      return;
    }

    const rawCoaches: CoachMember[] = Array.isArray(req.body?.coaches) ? req.body.coaches : [];
    const coaches: CoachMember[] = rawCoaches
      .map((c) => ({
        id: c.id || `coa_${crypto.randomUUID()}`,
        fullName: String(c.fullName || '').trim(),
        position: String(c.position || 'ครูผู้ฝึกสอน').trim(),
        photoUrl: typeof c.photoUrl === 'string' ? c.photoUrl.trim() : undefined,
      }))
      .filter((c) => c.fullName.length > 0);

    if (coaches.length === 0) {
      res.status(400).json({ error: 'กรุณาระบุชื่อครูผู้ฝึกสอนอย่างน้อย 1 ท่าน' });
      return;
    }

    const preliminarySong =
      typeof req.body?.preliminarySong === 'string' ? req.body.preliminarySong.trim() : '';
    const finalSong = typeof req.body?.finalSong === 'string' ? req.body.finalSong.trim() : '';

    if (comp.requiresSongs && (!preliminarySong || !finalSong)) {
      res.status(400).json({
        error: 'รายการประกวดร้องเพลงไทยลูกทุ่งฯ ต้องระบุทั้งชื่อเพลงรอบคัดเลือกและชื่อเพลงรอบตัดสิน',
      });
      return;
    }

    const now = new Date().toISOString();
    const newReg: Registration = {
      id: `reg_${crypto.randomUUID()}`,
      schoolId: school.id,
      competitionId: comp.id,
      level,
      teamName: typeof req.body?.teamName === 'string' ? req.body.teamName.trim() : '',
      students,
      coaches,
      preliminarySong: comp.requiresSongs ? preliminarySong : undefined,
      finalSong: comp.requiresSongs ? finalSong : undefined,
      createdAt: now,
      updatedAt: now,
    };

    db.registrations.push(newReg);
    saveDb(db);
    res.status(201).json({ registration: enrichRegistration(newReg) });
  });

  app.put('/api/registrations/:id', requireAuth(['admin', 'school']), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const idx = db.registrations.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลการสมัคร' });
      return;
    }
    const existing = db.registrations[idx];
    if (user.role === 'school') {
      if (existing.schoolId !== user.schoolId) {
        res.status(403).json({ error: 'คุณสามารถแก้ไขข้อมูลได้เฉพาะโรงเรียนของตนเองเท่านั้น' });
        return;
      }
      if (!db.settings.registrationOpen) {
        res.status(403).json({ error: 'ขณะนี้ปิดรับสมัครแล้ว ไม่สามารถแก้ไขรายการสมัครได้' });
        return;
      }
    }

    const competitionId = String(req.body?.competitionId || existing.competitionId).trim();
    const comp = getCompetitionById(competitionId);
    if (!comp) {
      res.status(400).json({ error: 'ไม่พบรายการแข่งขัน' });
      return;
    }

    const level = (req.body?.level || existing.level) as CompetitionLevel;
    if (!comp.levels.includes(level)) {
      res.status(400).json({ error: 'ระดับชั้นไม่ถูกต้องสำหรับรายการแข่งขันนี้' });
      return;
    }

    const rawStudents: StudentMember[] = Array.isArray(req.body?.students)
      ? req.body.students
      : existing.students;
    const students: StudentMember[] = rawStudents
      .slice(0, comp.teamSize)
      .map((st) => ({
        id: st.id || `stu_${crypto.randomUUID()}`,
        fullName: String(st.fullName || '').trim(),
        grade: String(st.grade || '').trim(),
        photoUrl: typeof st.photoUrl === 'string' ? st.photoUrl.trim() : undefined,
      }))
      .filter((st) => st.fullName.length > 0);

    if (students.length === 0) {
      res.status(400).json({ error: 'กรุณาระบุรายชื่อผู้เข้าแข่งขันอย่างน้อย 1 คน' });
      return;
    }

    const rawCoaches: CoachMember[] = Array.isArray(req.body?.coaches)
      ? req.body.coaches
      : existing.coaches;
    const coaches: CoachMember[] = rawCoaches
      .map((c) => ({
        id: c.id || `coa_${crypto.randomUUID()}`,
        fullName: String(c.fullName || '').trim(),
        position: String(c.position || 'ครูผู้ฝึกสอน').trim(),
        photoUrl: typeof c.photoUrl === 'string' ? c.photoUrl.trim() : undefined,
      }))
      .filter((c) => c.fullName.length > 0);

    if (coaches.length === 0) {
      res.status(400).json({ error: 'กรุณาระบุชื่อครูผู้ฝึกสอนอย่างน้อย 1 ท่าน' });
      return;
    }

    const preliminarySong =
      typeof req.body?.preliminarySong === 'string' ? req.body.preliminarySong.trim() : existing.preliminarySong || '';
    const finalSong =
      typeof req.body?.finalSong === 'string' ? req.body.finalSong.trim() : existing.finalSong || '';

    if (comp.requiresSongs && (!preliminarySong || !finalSong)) {
      res.status(400).json({
        error: 'รายการประกวดร้องเพลงไทยลูกทุ่งฯ ต้องระบุทั้งเพลงรอบคัดเลือกและเพลงรอบตัดสิน',
      });
      return;
    }

    const updated: Registration = {
      ...existing,
      competitionId: comp.id,
      level,
      teamName: typeof req.body?.teamName === 'string' ? req.body.teamName.trim() : existing.teamName,
      students,
      coaches,
      preliminarySong: comp.requiresSongs ? preliminarySong : undefined,
      finalSong: comp.requiresSongs ? finalSong : undefined,
      updatedAt: new Date().toISOString(),
    };

    db.registrations[idx] = updated;
    saveDb(db);
    res.json({ registration: enrichRegistration(updated) });
  });

  app.delete('/api/registrations/:id', requireAuth(['admin', 'school']), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const idx = db.registrations.findIndex((r) => r.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลการสมัคร' });
      return;
    }
    const existing = db.registrations[idx];
    if (user.role === 'school') {
      if (existing.schoolId !== user.schoolId) {
        res.status(403).json({ error: 'ไม่มีสิทธิ์ลบข้อมูลของโรงเรียนอื่น' });
        return;
      }
      if (!db.settings.registrationOpen) {
        res.status(403).json({ error: 'ขณะนี้ปิดรับสมัครแล้ว ไม่สามารถลบรายการสมัครได้' });
        return;
      }
    }

    db.registrations.splice(idx, 1);
    db.scores = db.scores.filter((sc) => sc.registrationId !== existing.id);
    saveDb(db);
    res.json({ ok: true });
  });

  // School updates its own profile
  app.put('/api/school/profile', requireAuth(['school']), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const idx = db.schools.findIndex((s) => s.id === user.schoolId);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลโรงเรียน' });
      return;
    }
    const school = db.schools[idx];
    const schoolName = typeof req.body?.schoolName === 'string' ? req.body.schoolName.trim() : school.schoolName;
    const directorName = typeof req.body?.directorName === 'string' ? req.body.directorName.trim() : school.directorName;
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : school.phone;
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!schoolName || !directorName) {
      res.status(400).json({ error: 'กรุณาระบุชื่อโรงเรียนและชื่อผู้อำนวยการ' });
      return;
    }

    school.schoolName = schoolName;
    school.directorName = directorName;
    school.phone = phone;
    if (newPassword.length > 0) {
      if (newPassword.length < 4) {
        res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 4 ตัวอักษร' });
        return;
      }
      school.passwordHash = hashPassword(newPassword);
    }

    db.schools[idx] = school;
    saveDb(db);
    res.json({ school: sanitizeSchool(school) });
  });

  // Admin: Manage Schools
  app.get('/api/admin/schools', requireAuth(['admin']), (_req: AuthedRequest, res: Response) => {
    res.json({ schools: db.schools.map(sanitizeSchool) });
  });

  app.post('/api/admin/schools', requireAuth(['admin']), (req: AuthedRequest, res: Response) => {
    const schoolCode = typeof req.body?.schoolCode === 'string' ? req.body.schoolCode.trim() : '';
    const schoolName = typeof req.body?.schoolName === 'string' ? req.body.schoolName.trim() : '';
    const directorName = typeof req.body?.directorName === 'string' ? req.body.directorName.trim() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!schoolCode || !schoolName || !directorName || password.length < 4) {
      res.status(400).json({ error: 'กรุณากรอกรหัสสถานศึกษา ชื่อโรงเรียน ผู้อำนวยการ และรหัสผ่าน (อย่างน้อย 4 ตัวอักษร)' });
      return;
    }
    if (db.schools.some((s) => s.schoolCode.toLowerCase() === schoolCode.toLowerCase())) {
      res.status(409).json({ error: 'รหัสสถานศึกษานี้มีอยู่ในระบบแล้ว' });
      return;
    }

    const school: StoredSchool = {
      id: `sch_${crypto.randomUUID()}`,
      schoolCode,
      schoolName,
      directorName,
      phone,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    db.schools.push(school);
    saveDb(db);
    res.status(201).json({ school: sanitizeSchool(school) });
  });

  app.put('/api/admin/schools/:id', requireAuth(['admin']), (req: AuthedRequest, res: Response) => {
    const idx = db.schools.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลโรงเรียน' });
      return;
    }
    const existing = db.schools[idx];
    const schoolCode = typeof req.body?.schoolCode === 'string' ? req.body.schoolCode.trim() : existing.schoolCode;
    const schoolName = typeof req.body?.schoolName === 'string' ? req.body.schoolName.trim() : existing.schoolName;
    const directorName = typeof req.body?.directorName === 'string' ? req.body.directorName.trim() : existing.directorName;
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.trim() : existing.phone;
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';

    if (!schoolCode || !schoolName || !directorName) {
      res.status(400).json({ error: 'กรุณากรอกข้อมูลโรงเรียนให้ครบถ้วน' });
      return;
    }

    const dup = db.schools.some(
      (s) => s.id !== existing.id && s.schoolCode.toLowerCase() === schoolCode.toLowerCase()
    );
    if (dup) {
      res.status(409).json({ error: 'รหัสสถานศึกษานี้ซ้ำกับโรงเรียนอื่น' });
      return;
    }

    existing.schoolCode = schoolCode;
    existing.schoolName = schoolName;
    existing.directorName = directorName;
    existing.phone = phone;
    if (newPassword.length > 0) {
      if (newPassword.length < 4) {
        res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' });
        return;
      }
      existing.passwordHash = hashPassword(newPassword);
    }

    db.schools[idx] = existing;
    saveDb(db);
    res.json({ school: sanitizeSchool(existing) });
  });

  app.delete('/api/admin/schools/:id', requireAuth(['admin']), (req: AuthedRequest, res: Response) => {
    const idx = db.schools.findIndex((s) => s.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลโรงเรียน' });
      return;
    }
    const removedId = db.schools[idx].id;
    db.schools.splice(idx, 1);
    const removedRegIds = new Set(
      db.registrations.filter((r) => r.schoolId === removedId).map((r) => r.id)
    );
    db.registrations = db.registrations.filter((r) => r.schoolId !== removedId);
    db.scores = db.scores.filter((sc) => !removedRegIds.has(sc.registrationId));
    saveDb(db);
    res.json({ ok: true });
  });

  // Judges endpoints (Admin full management, Judge reads/updates own photo)
  app.get('/api/judges', requireAuth(['admin', 'judge']), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    if (user.role === 'admin') {
      res.json({ judges: db.judges.map(sanitizeJudge) });
      return;
    }
    const own = db.judges.find((j) => j.id === user.judgeId);
    if (!own) {
      res.status(404).json({ error: 'ไม่พบข้อมูลกรรมการ' });
      return;
    }
    res.json({ judges: [sanitizeJudge(own)] });
  });

  app.put('/api/judge/photo', requireAuth(['judge', 'admin']), (req: AuthedRequest, res: Response) => {
    const user = req.user!;
    const targetId = user.role === 'admin' ? String(req.body?.judgeId || '') : String(user.judgeId || '');
    const idx = db.judges.findIndex((j) => j.id === targetId);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลกรรมการ' });
      return;
    }
    db.judges[idx].photoUrl = typeof req.body?.photoUrl === 'string' ? req.body.photoUrl.trim() : '';
    saveDb(db);
    res.json({ judge: sanitizeJudge(db.judges[idx]) });
  });

  app.post('/api/admin/judges', requireAuth(['admin']), (req: AuthedRequest, res: Response) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : '';
    const position = typeof req.body?.position === 'string' ? req.body.position.trim() : '';
    const photoUrl = typeof req.body?.photoUrl === 'string' ? req.body.photoUrl.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    const assignments: JudgeAssignment[] = Array.isArray(req.body?.assignments)
      ? req.body.assignments.filter(
          (a: JudgeAssignment) =>
            getCompetitionById(a.competitionId)?.levels.includes(a.level)
        )
      : [];

    if (!username || !fullName || password.length < 4) {
      res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้ ชื่อ-นามสกุลกรรมการ และรหัสผ่าน (อย่างน้อย 4 ตัวอักษร)' });
      return;
    }
    if (db.judges.some((j) => j.username.toLowerCase() === username.toLowerCase())) {
      res.status(409).json({ error: 'ชื่อผู้ใช้กรรมการนี้มีอยู่ในระบบแล้ว' });
      return;
    }

    const newJudge: StoredJudge = {
      id: `jdg_${crypto.randomUUID()}`,
      username,
      fullName,
      position: position || 'กรรมการตัดสิน',
      photoUrl: photoUrl || undefined,
      assignments,
      passwordHash: hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    db.judges.push(newJudge);
    saveDb(db);
    res.status(201).json({ judge: sanitizeJudge(newJudge) });
  });

  app.put('/api/admin/judges/:id', requireAuth(['admin']), (req: AuthedRequest, res: Response) => {
    const idx = db.judges.findIndex((j) => j.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลกรรมการ' });
      return;
    }
    const existing = db.judges[idx];
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : existing.username;
    const fullName = typeof req.body?.fullName === 'string' ? req.body.fullName.trim() : existing.fullName;
    const position = typeof req.body?.position === 'string' ? req.body.position.trim() : existing.position;
    const photoUrl =
      typeof req.body?.photoUrl === 'string' ? req.body.photoUrl.trim() : existing.photoUrl;
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword : '';
    const assignments: JudgeAssignment[] = Array.isArray(req.body?.assignments)
      ? req.body.assignments.filter(
          (a: JudgeAssignment) =>
            getCompetitionById(a.competitionId)?.levels.includes(a.level)
        )
      : existing.assignments;

    if (!username || !fullName) {
      res.status(400).json({ error: 'กรุณาระบุชื่อผู้ใช้และชื่อ-นามสกุลกรรมการ' });
      return;
    }
    if (
      db.judges.some(
        (j) => j.id !== existing.id && j.username.toLowerCase() === username.toLowerCase()
      )
    ) {
      res.status(409).json({ error: 'ชื่อผู้ใช้กรรมการซ้ำกับท่านอื่น' });
      return;
    }

    existing.username = username;
    existing.fullName = fullName;
    existing.position = position;
    existing.photoUrl = photoUrl;
    existing.assignments = assignments;
    if (newPassword.length > 0) {
      if (newPassword.length < 4) {
        res.status(400).json({ error: 'รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร' });
        return;
      }
      existing.passwordHash = hashPassword(newPassword);
    }

    db.judges[idx] = existing;
    saveDb(db);
    res.json({ judge: sanitizeJudge(existing) });
  });

  app.delete('/api/admin/judges/:id', requireAuth(['admin']), (req: AuthedRequest, res: Response) => {
    const idx = db.judges.findIndex((j) => j.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'ไม่พบข้อมูลกรรมการ' });
      return;
    }
    const removedId = db.judges[idx].id;
    db.judges.splice(idx, 1);
    db.scores = db.scores.filter((sc) => sc.judgeId !== removedId);
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: System Settings & Templates
  app.put('/api/admin/settings', requireAuth(['admin']), (req: AuthedRequest, res: Response) => {
    if (req.body?.settings && typeof req.body.settings === 'object') {
      const s = req.body.settings;
      db.settings = {
        registrationOpen:
          typeof s.registrationOpen === 'boolean'
            ? s.registrationOpen
            : db.settings.registrationOpen,
        eventName:
          typeof s.eventName === 'string' && s.eventName.trim()
            ? s.eventName.trim()
            : db.settings.eventName,
        eventSubtitle:
          typeof s.eventSubtitle === 'string'
            ? s.eventSubtitle.trim()
            : db.settings.eventSubtitle,
        eventDateText:
          typeof s.eventDateText === 'string' && s.eventDateText.trim()
            ? s.eventDateText.trim()
            : db.settings.eventDateText,
        organizerName:
          typeof s.organizerName === 'string'
            ? s.organizerName.trim()
            : db.settings.organizerName,
      };
    }

    if (req.body?.templates && typeof req.body.templates === 'object') {
      const t = req.body.templates;
      db.templates = {
        contestantCardBg:
          t.contestantCardBg !== undefined ? String(t.contestantCardBg || '') : db.templates.contestantCardBg,
        coachCardBg:
          t.coachCardBg !== undefined ? String(t.coachCardBg || '') : db.templates.coachCardBg,
        judgeCardBg:
          t.judgeCardBg !== undefined ? String(t.judgeCardBg || '') : db.templates.judgeCardBg,
        judgeCertBg:
          t.judgeCertBg !== undefined ? String(t.judgeCertBg || '') : db.templates.judgeCertBg,
        participantCertBg:
          t.participantCertBg !== undefined ? String(t.participantCertBg || '') : db.templates.participantCertBg,
      };
    }

    saveDb(db);
    res.json({ settings: db.settings, templates: db.templates });
  });

  // Admin: Change Admin Password
  app.put('/api/admin/password', requireAuth(['admin']), (req: AuthedRequest, res: Response) => {
    if (isEnvAdminConfigured()) {
      res.status(400).json({
        error: 'รหัสผ่านผู้ดูแลระบบถูกกำหนดไว้ผ่านตัวแปรสภาพแวดล้อม ADMIN_PASSCODE กรุณาแก้ไขในหน้า Settings -> Secrets',
      });
      return;
    }
    const currentPassword = typeof req.body?.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body?.newPassword === 'string' ? req.body.newPassword.trim() : '';

    if (!db.adminCredentialHash || !verifyPassword(currentPassword, db.adminCredentialHash)) {
      res.status(401).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
      return;
    }
    if (newPassword.length < 6) {
      res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
      return;
    }

    db.adminCredentialHash = hashPassword(newPassword);
    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: Schedule Update per Activity & Level
  app.put('/api/admin/schedules', requireAuth(['admin']), (req: AuthedRequest, res: Response) => {
    const items = Array.isArray(req.body?.schedules) ? req.body.schedules : [req.body];
    for (const item of items) {
      if (!item?.competitionId || !item?.level) continue;
      const idx = db.schedules.findIndex(
        (s) => s.competitionId === item.competitionId && s.level === item.level
      );
      if (idx !== -1) {
        db.schedules[idx] = {
          competitionId: item.competitionId,
          level: item.level,
          venue: typeof item.venue === 'string' ? item.venue.trim() : db.schedules[idx].venue,
          dateText: typeof item.dateText === 'string' ? item.dateText.trim() : db.schedules[idx].dateText,
          timeText: typeof item.timeText === 'string' ? item.timeText.trim() : db.schedules[idx].timeText,
          notes: typeof item.notes === 'string' ? item.notes.trim() : db.schedules[idx].notes,
        };
      }
    }
    saveDb(db);
    res.json({ schedules: db.schedules });
  });

  // Judge: Submit / Update Score (only for assigned activity + level, 0-100)
  app.get('/api/judge/scores', requireAuth(['judge']), (req: AuthedRequest, res: Response) => {
    const judgeId = req.user!.judgeId!;
    const ownScores = db.scores.filter((sc) => sc.judgeId === judgeId);
    res.json({ scores: ownScores });
  });

  app.post('/api/judge/scores', requireAuth(['judge']), (req: AuthedRequest, res: Response) => {
    const judgeId = req.user!.judgeId!;
    const judge = db.judges.find((j) => j.id === judgeId);
    if (!judge) {
      res.status(403).json({ error: 'ไม่พบข้อมูลกรรมการ' });
      return;
    }

    const registrationId = String(req.body?.registrationId || '').trim();
    const reg = db.registrations.find((r) => r.id === registrationId);
    if (!reg) {
      res.status(404).json({ error: 'ไม่พบข้อมูลทีมผู้เข้าแข่งขัน' });
      return;
    }

    if (!isJudgeAssigned(judge, reg.competitionId, reg.level)) {
      res.status(403).json({ error: 'ท่านไม่ได้รับมอบหมายให้ตัดสินรายการแข่งขันและระดับชั้นนี้' });
      return;
    }

    const score = Number(req.body?.score);
    if (Number.isNaN(score) || score < 0 || score > 100) {
      res.status(400).json({ error: 'คะแนนต้องอยู่ระหว่าง 0 ถึง 100 คะแนน' });
      return;
    }

    const comment = typeof req.body?.comment === 'string' ? req.body.comment.trim() : '';
    const now = new Date().toISOString();
    const idx = db.scores.findIndex(
      (sc) =>
        sc.registrationId === reg.id &&
        sc.judgeId === judge.id &&
        sc.competitionId === reg.competitionId &&
        sc.level === reg.level
    );

    if (idx !== -1) {
      db.scores[idx] = {
        ...db.scores[idx],
        score: Number(score.toFixed(2)),
        comment,
        judgeName: judge.fullName,
        updatedAt: now,
      };
    } else {
      db.scores.push({
        id: `scr_${crypto.randomUUID()}`,
        registrationId: reg.id,
        competitionId: reg.competitionId,
        level: reg.level,
        judgeId: judge.id,
        judgeName: judge.fullName,
        score: Number(score.toFixed(2)),
        comment,
        updatedAt: now,
      });
    }

    saveDb(db);
    res.json({ ok: true });
  });

  // Admin: Inspect Detailed Results + Approve / Unapprove
  app.get('/api/results', attachOptionalAuth, (req: AuthedRequest, res: Response) => {
    const competitionId = String(req.query?.competitionId || '');
    const level = String(req.query?.level || '') as CompetitionLevel;
    const isAdmin = req.user?.role === 'admin';

    const approval = db.approvals.find(
      (a) => a.competitionId === competitionId && a.level === level
    );
    const approved = Boolean(approval?.approved);

    if (!approved && !isAdmin) {
      res.json({
        approved: false,
        results: [],
      });
      return;
    }

    const results = computeRankedResults(competitionId, level, isAdmin);
    res.json({
      approved,
      approvedAt: approval?.approvedAt,
      results,
    });
  });

  app.put('/api/admin/results/approve', requireAuth(['admin']), (req: AuthedRequest, res: Response) => {
    const competitionId = String(req.body?.competitionId || '').trim();
    const level = req.body?.level as CompetitionLevel;
    const approved = Boolean(req.body?.approved);

    const comp = getCompetitionById(competitionId);
    if (!comp || !comp.levels.includes(level)) {
      res.status(400).json({ error: 'รายการแข่งขันหรือระดับชั้นไม่ถูกต้อง' });
      return;
    }

    const idx = db.approvals.findIndex(
      (a) => a.competitionId === competitionId && a.level === level
    );
    const record: ResultApproval = {
      competitionId,
      level,
      approved,
      approvedAt: approved ? new Date().toISOString() : undefined,
    };

    if (idx !== -1) {
      db.approvals[idx] = record;
    } else {
      db.approvals.push(record);
    }

    saveDb(db);
    res.json({ approval: record, summaries: buildSummaries() });
  });

  // Vite middleware in development, static files in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(
      express.static(distDir, {
        setHeaders: (res, filePath) => {
          if (filePath.endsWith('.js') || filePath.endsWith('.mjs')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
          } else if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
          } else if (filePath.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          } else if (filePath.endsWith('.svg')) {
            res.setHeader('Content-Type', 'image/svg+xml');
          } else if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
          }
        },
      }),
    );
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Makha Bucha Competition Server running on http://localhost:${PORT}`);
  });
}

startServer();
