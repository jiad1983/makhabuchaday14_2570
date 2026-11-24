export type CompetitionLevel =
  | 'ประถมปลาย (ป.๔-๖)'
  | 'มัธยมต้น (ม.๑-๓)'
  | 'มัธยมปลาย (ม.๔-๖)'
  | 'ไม่จำกัดระดับ';

export interface CompetitionDef {
  id: string;
  order: number;
  name: string;
  typeLabel: string;
  teamSize: number;
  levels: CompetitionLevel[];
  requiresSongs?: boolean;
  description: string;
  accentHex: string;
}

export type UserRole = 'admin' | 'school' | 'judge';

export interface AuthUser {
  role: UserRole;
  id: string;
  username: string;
  displayName: string;
  schoolId?: string;
  judgeId?: string;
}

export interface School {
  id: string;
  schoolCode: string;
  schoolName: string;
  directorName: string;
  phone?: string;
  createdAt: string;
}

export interface JudgeAssignment {
  competitionId: string;
  level: CompetitionLevel;
}

export interface Judge {
  id: string;
  username: string;
  fullName: string;
  position: string;
  photoUrl?: string;
  assignments: JudgeAssignment[];
  createdAt: string;
}

export interface StudentMember {
  id: string;
  fullName: string;
  grade: string;
  photoUrl?: string;
}

export interface CoachMember {
  id: string;
  fullName: string;
  position?: string;
  photoUrl?: string;
}

export interface Registration {
  id: string;
  schoolId: string;
  schoolName?: string;
  schoolCode?: string;
  directorName?: string;
  competitionId: string;
  level: CompetitionLevel;
  teamName?: string;
  students: StudentMember[];
  coaches: CoachMember[];
  preliminarySong?: string;
  finalSong?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleItem {
  competitionId: string;
  level: CompetitionLevel;
  venue: string;
  dateText: string;
  timeText: string;
  notes?: string;
}

export interface ScoreRecord {
  id: string;
  registrationId: string;
  competitionId: string;
  level: CompetitionLevel;
  judgeId: string;
  judgeName?: string;
  score: number;
  comment?: string;
  updatedAt: string;
}

export interface ResultApproval {
  competitionId: string;
  level: CompetitionLevel;
  approved: boolean;
  approvedAt?: string;
}

export interface TemplateSettings {
  contestantCardBg?: string;
  coachCardBg?: string;
  judgeCardBg?: string;
  judgeCertBg?: string;
  participantCertBg?: string;
}

export interface SystemSettings {
  registrationOpen: boolean;
  eventName: string;
  eventSubtitle: string;
  eventDateText: string;
  organizerName: string;
}

export interface RankedResultEntry {
  rank: number;
  registrationId: string;
  schoolId: string;
  schoolName: string;
  teamLabel: string;
  students: StudentMember[];
  coaches: CoachMember[];
  directorName: string;
  finalScore: number;
  judgeScoresCount: number;
  expectedJudgesCount: number;
  individualScores?: Array<{
    judgeId: string;
    judgeName: string;
    score: number;
    comment?: string;
  }>;
}

export interface ActivityLevelSummary {
  competitionId: string;
  level: CompetitionLevel;
  registeredTeamsCount: number;
  judgesAssignedCount: number;
  scoredTeamsCount: number;
  approved: boolean;
  approvedAt?: string;
}
