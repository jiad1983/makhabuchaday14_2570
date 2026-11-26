(function () {
  'use strict';

  const P = window.MakhaPrint;
  const esc = P.escapeHtml;
  const safeImg = P.safeImageUrl;

  const bootstrapEl = document.getElementById('initial-bootstrap');
  let initialState = {};
  try {
    initialState = JSON.parse(bootstrapEl ? bootstrapEl.textContent : '{}') || {};
  } catch (_err) {
    initialState = {};
  }

  const MANAGER_ALLOWED_MENUS = ['home', 'register', 'competitions', 'schedule', 'results', 'judge-card', 'judge-cert', 'admin-competition-manage'];

  const state = {
    csrfToken: initialState.csrfToken || '',
    authSession: initialState.authSession || { role: 'guest', userId: null, displayName: 'ผู้เยี่ยมชมทั่วไป', schoolId: null, judgeId: null },
    competitions: Array.isArray(initialState.competitions) ? initialState.competitions : [],
    eventMeta: initialState.eventMeta || {},
    adminProfile: initialState.adminProfile || {},
    registrationOpen: Boolean(initialState.registrationOpen),
    menuPermissions: initialState.menuPermissions || {},
    backgrounds: initialState.backgrounds || {},
    schools: Array.isArray(initialState.schools) ? initialState.schools : [],
    judges: Array.isArray(initialState.judges) ? initialState.judges : [],
    managers: Array.isArray(initialState.managers) ? initialState.managers : [],
    schedules: initialState.schedules || {},
    registrations: Array.isArray(initialState.registrations) ? initialState.registrations : [],
    scores: initialState.scores || {},
    scoreCriteriaDetails: initialState.scoreCriteriaDetails || {},
    roundScores: initialState.roundScores || {},
    roundScoreCriteriaDetails: initialState.roundScoreCriteriaDetails || {},
    checkIns: initialState.checkIns || {},
    evalMeta: initialState.evalMeta || {},
    absentRegs: initialState.absentRegs || {},
    customCriteriaByComp: initialState.customCriteriaByComp || {},

    // UI State
    activeMenu: (initialState.authSession && initialState.authSession.role === 'manager') ? 'admin-competition-manage' : 'home',
    mobileMenuOpen: false,
    desktopSidebarOpen: true,
    loginMenuExpanded: true,
    topLoginMenuOpen: false,
    postLoginRedirect: null,
    loginTab: 'school',
    schoolAuthMode: 'login',
    schoolResultsViewTab: 'scores',
    medalSummaryTab: 'school',
    medalSummaryFilter: 'all',
    selectedSchoolFilter: 'all',
    selectedCompFilter: 'all',
    selectedLevelFilter: 'ทั้งหมด',
    cardPrintLayout: '4-up',
    certRecipientType: 'student',
    resultsSearch: '',
    resultsApprovalFilter: 'all',
    resultsPage: 1,
    resultsPageSize: 25,
    adminCompManageId: 'comp-1',
    adminCompManageLevel: 'ทั้งหมด',
    adminCompManageTab: 'sheets',
    compManageRegMode: 'team',
    compManageCheckinFilter: 'all',
    compManageCheckinSearch: '',
    judgeScoringRound: 'qualifying',
    editingCriterionIdx: null,
    editingScheduleKey: null,
    judgeAbsentSearch: '',
    judgeAbsentFilter: 'all',
    unlockedScoreCards: {},
    draftCriteriaScores: {},
    regForm: null,
    compManageRegForm: null,
    editingSchoolId: null,
    editingJudgeId: null,
    editingJudgePhotoDraft: '',
    editingManagerId: null,
  };

  function resetRegForm(compId) {
    const comp = state.competitions.find(function (c) { return c.id === (compId || 'comp-1'); }) || state.competitions[0] || { id: 'comp-1', levels: [''] };
    state.regForm = {
      editingId: null,
      schoolId: state.authSession.role === 'school' ? state.authSession.schoolId : (state.schools[0] ? state.schools[0].id : ''),
      competitionId: comp.id,
      level: comp.levels[0] || '',
      students: [{ name: '', photoUrl: '' }],
      coaches: [{ name: '', photoUrl: '' }],
      qualifyingSong: '',
      finalSong: '',
    };
  }
  function resetCompManageRegForm(compId, lvl) {
    const comp = state.competitions.find(function (c) { return c.id === (compId || state.adminCompManageId || 'comp-1'); }) || state.competitions[0] || { id: 'comp-1', levels: [''], teamSize: 1 };
    const resolvedLvl = lvl && lvl !== 'ทั้งหมด' && (comp.levels || []).indexOf(lvl) !== -1 ? lvl : (comp.levels[0] || '');
    const slotCount = Math.max(1, Number(comp.teamSize) || 1);
    const stuSlots = [];
    for (let i = 0; i < slotCount; i += 1) stuSlots.push({ name: '', photoUrl: '' });
    state.compManageRegForm = {
      editingId: null,
      schoolId: state.schools[0] ? state.schools[0].id : '',
      level: resolvedLvl,
      students: stuSlots,
      coaches: [{ name: '', photoUrl: '' }],
      qualifyingSong: '',
      finalSong: '',
    };
  }
  resetRegForm('comp-1');
  resetCompManageRegForm('comp-1', 'ทั้งหมด');

  function showToast(message, type) {
    const container = document.getElementById('toastContainer');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = 'toast ' + (type === 'error' ? 'error' : 'success');
    toast.textContent = (type === 'error' ? '⚠ ' : '✓ ') + message;
    container.innerHTML = '';
    container.appendChild(toast);
    setTimeout(function () {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3500);
  }

  async function apiCall(action, payload) {
    const res = await fetch('api.php?action=' + encodeURIComponent(action), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': state.csrfToken,
      },
      body: JSON.stringify(payload || {}),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      throw new Error(data.error || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
    if (data.state) {
      applyServerState(data.state);
    }
    return data;
  }

  function applyServerState(s) {
    state.csrfToken = s.csrfToken || state.csrfToken;
    state.authSession = s.authSession || state.authSession;
    state.adminProfile = s.adminProfile || state.adminProfile;
    state.registrationOpen = Boolean(s.registrationOpen);
    state.menuPermissions = s.menuPermissions || {};
    state.backgrounds = s.backgrounds || {};
    state.schools = Array.isArray(s.schools) ? s.schools : [];
    state.judges = Array.isArray(s.judges) ? s.judges : [];
    state.managers = Array.isArray(s.managers) ? s.managers : [];
    state.schedules = s.schedules || {};
    state.registrations = Array.isArray(s.registrations) ? s.registrations : [];
    state.scores = s.scores || {};
    state.scoreCriteriaDetails = s.scoreCriteriaDetails || {};
    state.roundScores = s.roundScores || {};
    state.roundScoreCriteriaDetails = s.roundScoreCriteriaDetails || {};
    state.checkIns = s.checkIns || {};
    state.evalMeta = s.evalMeta || {};
    state.absentRegs = s.absentRegs || {};
    state.customCriteriaByComp = s.customCriteriaByComp || {};
    state.storageStats = s.storageStats || null;
  }

  function compressImageFile(file, maxDim, quality) {
    maxDim = maxDim || 640;
    quality = quality || 0.82;
    return new Promise(function (resolve, reject) {
      const reader = new FileReader();
      reader.onload = function () {
        const rawUrl = String(reader.result || '');
        if (!rawUrl) { resolve(''); return; }
        const img = new Image();
        img.onload = function () {
          try {
            const w = img.naturalWidth || img.width;
            const h = img.naturalHeight || img.height;
            if (!w || !h) { resolve(rawUrl); return; }
            const scale = Math.min(1, maxDim / Math.max(w, h));
            const tw = Math.max(1, Math.round(w * scale));
            const th = Math.max(1, Math.round(h * scale));
            const canvas = document.createElement('canvas');
            canvas.width = tw;
            canvas.height = th;
            const ctx = canvas.getContext('2d');
            if (!ctx) { resolve(rawUrl); return; }
            ctx.drawImage(img, 0, 0, tw, th);
            resolve(canvas.toDataURL('image/jpeg', quality));
          } catch (_err) {
            resolve(rawUrl);
          }
        };
        img.onerror = function () { resolve(''); };
        img.src = rawUrl;
      };
      reader.onerror = function () { reject(new Error('ไม่สามารถอ่านไฟล์รูปภาพได้')); };
      reader.readAsDataURL(file);
    });
  }

  function dataUrlToBlob(dataUrl) {
    const parts = String(dataUrl || '').split(',');
    if (parts.length !== 2) return null;
    const mimeMatch = parts[0].match(/data:([^;]+);base64/i);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bin = atob(parts[1]);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) {
      arr[i] = bin.charCodeAt(i);
    }
    return new Blob([arr], { type: mime });
  }

  async function uploadImageFile(file, category, maxDim, quality) {
    const dataUrl = await compressImageFile(file, maxDim || 640, quality || 0.85);
    if (!dataUrl) {
      throw new Error('ไม่สามารถประมวลผลไฟล์รูปภาพได้ กรุณาเลือกไฟล์ PNG, JPG หรือ WebP');
    }
    const blob = dataUrlToBlob(dataUrl);
    if (blob) {
      const fd = new FormData();
      fd.append('category', category || 'students');
      fd.append('image', blob, (category || 'img') + '.jpg');
      const res = await fetch('api.php?action=upload_image', {
        method: 'POST',
        headers: { 'X-CSRF-Token': state.csrfToken },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.ok || !data.url) {
        throw new Error(data.error || 'อัปโหลดไฟล์รูปภาพไม่สำเร็จ');
      }
      return data.url;
    }
    const fallbackRes = await apiCall('upload_image', { category: category || 'students', dataUrl: dataUrl });
    return fallbackRes.url;
  }

  function getComp(id) {
    return state.competitions.find(function (c) { return c.id === id; }) || null;
  }

  function getSchool(id) {
    return state.schools.find(function (s) { return s.id === id; }) || null;
  }

  function getJudge(id) {
    return state.judges.find(function (j) { return j.id === id; }) || null;
  }

  function getManager(id) {
    return state.managers.find(function (m) { return m.id === id; }) || null;
  }

  function getCurrentSchool() {
    return state.authSession.role === 'school' ? getSchool(state.authSession.schoolId) : null;
  }

  function getCurrentJudge() {
    return state.authSession.role === 'judge' ? getJudge(state.authSession.judgeId) : null;
  }

  function getRankAwardLabel(rankNum, isAbsent, hasScore, otherPrefix) {
    if (isAbsent) return 'ไม่เข้าร่วมแข่งขัน';
    if (!hasScore || !rankNum || rankNum <= 0) return 'เข้าร่วมการแข่งขัน';
    if (rankNum === 1) return 'ชนะเลิศ';
    if (rankNum === 2) return 'รองชนะเลิศอันดับ 1';
    if (rankNum === 3) return 'รองชนะเลิศอันดับ 2';
    if (rankNum === 4) return 'ชมเชยอันดับ 1';
    if (rankNum === 5) return 'ชมเชยอันดับ 2';
    return (otherPrefix || 'อันดับที่') + ' ' + rankNum;
  }

  function getCriteria(compId) {
    if (compId === 'comp-7') {
      return [{ key: 'correctAnswers', label: 'จำนวนข้อสอบที่ตอบถูกต้อง (ลงคะแนนตามข้อที่ตอบถูก)', max: 100, maxLabel: '100 ข้อ/คะแนน' }];
    }
    const list = state.customCriteriaByComp[compId];
    return Array.isArray(list) ? list : [];
  }

  function isTwoRoundComp(compId) {
    return compId === 'comp-3' || compId === 'comp-4';
  }

  function getRoundBreakdown(compId, regId) {
    const isTwoRound = isTwoRoundComp(compId);
    if (!isTwoRound) {
      return {
        isTwoRound: false,
        activeRound: null,
        activeRoundLabel: '',
        qualifyingCalc: { average100: 0, judgeCount: 0 },
        finalCalc: { average100: 0, judgeCount: 0 },
      };
    }
    const rs = state.roundScores[regId] || {};
    const finalScores = rs.final || {};
    const hasFinalMap = Object.keys(finalScores).length > 0;
    const qualScores = rs.qualifying || (!hasFinalMap ? (state.scores[regId] || {}) : {});
    const qualifyingCalc = P.calculateNormalizedScore(qualScores);
    const finalCalc = P.calculateNormalizedScore(finalScores);
    const activeRound = finalCalc.judgeCount > 0 ? 'final' : (qualifyingCalc.judgeCount > 0 ? 'qualifying' : null);
    const activeRoundLabel = activeRound === 'final' ? 'รอบตัดสิน' : (activeRound === 'qualifying' ? 'รอบคัดเลือก' : '');
    return {
      isTwoRound: true,
      activeRound: activeRound,
      activeRoundLabel: activeRoundLabel,
      qualifyingCalc: qualifyingCalc,
      finalCalc: finalCalc,
    };
  }

  function buildCompetitionRankedList(compId, level) {
    const normalizedLevel = String(level || '').trim();
    const levelRegs = state.registrations.filter(function (r) {
      return r.competitionId === compId && String(r.level || '').trim() === normalizedLevel;
    });
    const isTwoRound = isTwoRoundComp(compId);

    if (!isTwoRound) {
      const sorted = levelRegs
        .map(function (reg, idx) {
          const isAbsent = Boolean(state.absentRegs[reg.id]);
          const rawScores = isAbsent ? {} : (state.scores[reg.id] || {});
          const calc = isAbsent ? { average100: 0, judgeCount: 0 } : P.calculateNormalizedScore(rawScores);
          const hasScore = !isAbsent && calc.judgeCount > 0;
          const roundInfo = getRoundBreakdown(compId, reg.id);
          return {
            reg: reg,
            idx: idx,
            isAbsent: isAbsent,
            hasScore: hasScore,
            score: calc.average100,
            judgeScores: rawScores,
            roundInfo: roundInfo,
          };
        })
        .sort(function (a, b) {
          if (a.isAbsent !== b.isAbsent) return a.isAbsent ? 1 : -1;
          if (a.hasScore !== b.hasScore) return a.hasScore ? -1 : 1;
          if (b.score !== a.score) return b.score - a.score;
          return a.idx - b.idx;
        });

      let rankCounter = 0;
      return sorted.map(function (item) {
        if (item.hasScore) rankCounter += 1;
        return {
          reg: item.reg,
          isAbsent: item.isAbsent,
          hasScore: item.hasScore,
          score: item.score,
          judgeScores: item.judgeScores,
          rankNum: item.hasScore ? rankCounter : null,
          qualifyingRank: null,
          roundGroup: item.isAbsent ? 'absent' : (item.hasScore ? 'standard' : 'pending'),
          roundInfo: item.roundInfo,
        };
      });
    }

    const baseItems = levelRegs.map(function (reg, idx) {
      const isAbsent = Boolean(state.absentRegs[reg.id]);
      const rs = state.roundScores[reg.id] || {};
      const finalScores = isAbsent ? {} : (rs.final || {});
      const hasRoundStore = Boolean(state.roundScores[reg.id]);
      const qualScores = isAbsent
        ? {}
        : (rs.qualifying || (!hasRoundStore || Object.keys(finalScores).length === 0 ? (state.scores[reg.id] || {}) : {}));
      const roundInfo = getRoundBreakdown(compId, reg.id);
      return {
        reg: reg,
        idx: idx,
        isAbsent: isAbsent,
        qualScores: qualScores,
        finalScores: finalScores,
        roundInfo: roundInfo,
      };
    });

    const qualifyingRanked = baseItems
      .filter(function (item) { return !item.isAbsent && item.roundInfo.qualifyingCalc.judgeCount > 0; })
      .sort(function (a, b) {
        if (b.roundInfo.qualifyingCalc.average100 !== a.roundInfo.qualifyingCalc.average100) {
          return b.roundInfo.qualifyingCalc.average100 - a.roundInfo.qualifyingCalc.average100;
        }
        return a.idx - b.idx;
      });

    const qualifyingRankMap = {};
    qualifyingRanked.forEach(function (item, qIdx) {
      qualifyingRankMap[item.reg.id] = qIdx + 1;
    });
    const hasAnyQualifyingScores = qualifyingRanked.length > 0;

    const finalTop10 = [];
    const qualifyingRest = [];
    const pendingItems = [];
    const absentItems = [];

    baseItems.forEach(function (item) {
      const qRank = qualifyingRankMap[item.reg.id] !== undefined ? qualifyingRankMap[item.reg.id] : null;
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
          roundInfo: item.roundInfo,
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
          roundInfo: item.roundInfo,
        });
        return;
      }

      const isTop10Finalist = (qRank !== null && qRank <= 10) || (!hasAnyQualifyingScores && hasFinal);
      if (isTop10Finalist) {
        finalTop10.push({
          reg: item.reg,
          idx: item.idx,
          isAbsent: false,
          hasScore: true,
          score: hasFinal ? item.roundInfo.finalCalc.average100 : item.roundInfo.qualifyingCalc.average100,
          judgeScores: hasFinal ? item.finalScores : item.qualScores,
          qualifyingRank: qRank,
          roundGroup: 'final_top10',
          roundInfo: item.roundInfo,
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
          roundInfo: item.roundInfo,
        });
      }
    });

    finalTop10.sort(function (a, b) {
      const aHasFinal = a.roundInfo.finalCalc.judgeCount > 0 ? 1 : 0;
      const bHasFinal = b.roundInfo.finalCalc.judgeCount > 0 ? 1 : 0;
      if (bHasFinal !== aHasFinal) return bHasFinal - aHasFinal;
      if (b.score !== a.score) return b.score - a.score;
      if (b.roundInfo.qualifyingCalc.average100 !== a.roundInfo.qualifyingCalc.average100) {
        return b.roundInfo.qualifyingCalc.average100 - a.roundInfo.qualifyingCalc.average100;
      }
      return a.idx - b.idx;
    });

    qualifyingRest.sort(function (a, b) {
      if (b.score !== a.score) return b.score - a.score;
      return a.idx - b.idx;
    });

    const combined = finalTop10.concat(qualifyingRest, pendingItems, absentItems);
    let rankCounter = 0;
    return combined.map(function (item) {
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
        roundInfo: item.roundInfo,
      };
    });
  }

  function buildRankedEntryLookup() {
    const map = {};
    const seen = {};
    state.registrations.forEach(function (r) {
      const lvl = String(r.level || '').trim();
      const key = r.competitionId + '__' + lvl;
      if (seen[key]) return;
      seen[key] = true;
      buildCompetitionRankedList(r.competitionId, lvl).forEach(function (entry) {
        map[entry.reg.id] = entry;
      });
    });
    return map;
  }

  function isRegCheckedIn(regId) {
    const rec = state.checkIns[regId];
    return Boolean(!state.absentRegs[regId] && rec && (rec.checkedIn === true || rec.status === 'checked_in'));
  }

  function getMenuItems() {
    const role = state.authSession.role;
    const all = [
      { id: 'home', baseLabel: 'หน้าแรก', icon: '🏠', roles: ['guest', 'admin', 'manager', 'school', 'judge'] },
      { id: 'register', baseLabel: 'ระบบสมัครแข่งขัน', icon: state.registrationOpen ? '📝' : '🔒', roles: ['guest', 'admin', 'manager', 'school'] },
      { id: 'competitions', baseLabel: 'รายการแข่งขัน', icon: '📋', roles: ['guest', 'admin', 'manager', 'school', 'judge'] },
      { id: 'schedule', baseLabel: 'ตารางการแข่งขัน', icon: '📅', roles: ['guest', 'admin', 'manager', 'school', 'judge'] },
      { id: 'by-school', baseLabel: 'รายชื่อแยกตามโรงเรียน', icon: '🏫', roles: ['admin', 'school'] },
      { id: 'by-activity', baseLabel: 'รายชื่อแยกตามกิจกรรม', icon: '🗂', roles: ['admin', 'school'] },
      { id: 'student-card', baseLabel: 'พิมพ์บัตรผู้เข้าแข่งขัน', icon: '🪪', roles: ['admin', 'school'] },
      { id: 'coach-card', baseLabel: 'พิมพ์บัตรครูผู้ฝึกสอน', icon: '🪪', roles: ['admin', 'school'] },
      { id: 'judge-card', baseLabel: 'พิมพ์บัตรกรรมการตัดสิน', icon: '🪪', roles: ['admin', 'manager', 'judge'] },
      { id: 'judge-cert', baseLabel: 'เกียรติบัตรกรรมการ', icon: '🏅', roles: ['admin', 'manager', 'judge'] },
      { id: 'school-cert', baseLabel: 'เกียรติบัตรนักเรียน/ครู/ผอ.โรงเรียน', icon: '🏅', roles: ['admin', 'school'] },
      { id: 'school-results', baseLabel: 'ผลคะแนนของโรงเรียน', icon: '🏆', roles: ['admin', 'school'] },
      { id: 'results', baseLabel: 'ประกาศผลคะแนน', icon: '🏆', roles: ['guest', 'admin', 'manager', 'judge'] },
      { id: 'admin-competition-manage', baseLabel: 'การจัดการแข่งขัน', icon: '📄', roles: ['admin', 'manager'] },
      { id: 'admin-manage', baseLabel: 'จัดการระบบ (Admin)', icon: '🛡', roles: ['admin'] },
      { id: 'judge-scoring', baseLabel: 'ลงคะแนนตัดสิน (กรรมการ)', icon: '⚖', roles: ['judge'] },
      { id: 'judge-absent', baseLabel: 'แจ้งไม่เข้าร่วมแข่งขัน', icon: '🚫', roles: ['judge'] },
      { id: 'login', baseLabel: role === 'guest' ? 'เข้าสู่ระบบ' : 'เปลี่ยนบัญชี/เข้าสู่ระบบ', icon: '🔑', roles: ['guest', 'admin', 'manager', 'school', 'judge'] },
    ];
    return all
      .filter(function (item) { return item.roles.indexOf(role) !== -1; })
      .map(function (item) {
        let statusMeta = null;
        if (item.id === 'register') {
          statusMeta = { isOpen: state.registrationOpen, label: state.registrationOpen ? 'เปิด' : 'ปิด' };
        } else if (Object.prototype.hasOwnProperty.call(state.menuPermissions, item.id)) {
          const open = Boolean(state.menuPermissions[item.id]);
          statusMeta = { isOpen: open, label: open ? 'เปิด' : 'ปิด' };
        }
        return Object.assign({}, item, { statusMeta: statusMeta });
      });
  }

  function showClosedMenuModal(label) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    container.innerHTML =
      '<div class="modal-backdrop" id="closedMenuBackdrop">' +
        '<div class="modal-box narrow">' +
          '<div style="background:linear-gradient(135deg,#f43f5e,#f97316,#f59e0b);padding:26px;text-align:center;color:#fff;">' +
            '<div style="font-size:34px;margin-bottom:8px;">🔒</div>' +
            '<span class="badge" style="background:rgba(255,255,255,0.2);color:#fff;border-color:rgba(255,255,255,0.35);">สถานะเมนู: ปิดชั่วคราว</span>' +
            '<h3 style="margin:10px 0 0;font-size:20px;">ระบบยังไม่เปิดให้ดำเนินการ</h3>' +
          '</div>' +
          '<div style="padding:22px;text-align:center;" class="stack-sm">' +
            '<div style="background:#fff1f2;border:1px solid #fecdd3;border-radius:14px;padding:12px;">' +
              '<div style="font-size:12px;color:#e11d48;font-weight:700;">เมนูที่ท่านเลือก</div>' +
              '<div style="font-size:15px;font-weight:800;color:#1e293b;margin-top:2px;">' + esc(label) + '</div>' +
            '</div>' +
            '<p style="font-size:13.5px;color:#475569;margin:4px 0;">ขณะนี้ผู้ดูแลระบบยังไม่เปิดให้เข้าใช้งานในส่วนนี้ กรุณาติดตามประกาศหรือติดต่อผู้ดูแลระบบ</p>' +
            '<button type="button" class="btn btn-dark" id="btnCloseMenuModal">รับทราบและปิดหน้าต่าง</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('closedMenuBackdrop').onclick = function (e) {
      if (e.target.id === 'closedMenuBackdrop') container.innerHTML = '';
    };
    document.getElementById('btnCloseMenuModal').onclick = function () { container.innerHTML = ''; };
  }

  function openConfirmModal(title, message, onConfirm) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    container.innerHTML =
      '<div class="modal-backdrop" id="confirmModalBackdrop">' +
        '<div class="modal-box narrow">' +
          '<div class="modal-header" style="background:linear-gradient(to right,#be123c,#e11d48);">' +
            '<strong>' + esc(title) + '</strong>' +
            '<button type="button" class="btn btn-outline btn-xs" style="background:#fff;color:#be123c;" id="btnConfirmCancelX">✕</button>' +
          '</div>' +
          '<div class="modal-body stack">' +
            '<p style="margin:0;font-size:14px;color:#334155;">' + esc(message) + '</p>' +
            '<div class="row-wrap" style="justify-content:flex-end;">' +
              '<button type="button" class="btn btn-outline btn-sm" id="btnConfirmCancel">ยกเลิก</button>' +
              '<button type="button" class="btn btn-rose-solid btn-sm" id="btnConfirmOk">ยืนยันการลบ</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    const close = function () { container.innerHTML = ''; };
    document.getElementById('confirmModalBackdrop').onclick = function (e) { if (e.target.id === 'confirmModalBackdrop') close(); };
    document.getElementById('btnConfirmCancelX').onclick = close;
    document.getElementById('btnConfirmCancel').onclick = close;
    document.getElementById('btnConfirmOk').onclick = async function () {
      close();
      await onConfirm();
    };
  }

  function selectMenu(menuId) {
    const isLoginRoute = menuId === 'login' || menuId === 'login-admin' || menuId === 'login-manager' || menuId === 'login-school' || menuId === 'login-judge';
    if (state.authSession.role === 'manager' && MANAGER_ALLOWED_MENUS.indexOf(menuId) === -1 && !isLoginRoute) {
      state.topLoginMenuOpen = false;
      state.activeMenu = 'admin-competition-manage';
      state.mobileMenuOpen = false;
      renderAll();
      return;
    }
    if (
      state.authSession.role !== 'admin' &&
      state.authSession.role !== 'manager' &&
      Object.prototype.hasOwnProperty.call(state.menuPermissions, menuId) &&
      !state.menuPermissions[menuId]
    ) {
      const target = getMenuItems().find(function (m) { return m.id === menuId; });
      state.mobileMenuOpen = false;
      showClosedMenuModal(target ? target.baseLabel : 'เมนูที่เลือก');
      renderLayoutChrome();
      return;
    }
    if (isLoginRoute) {
      if (state.activeMenu && state.activeMenu.indexOf('login') !== 0 && state.activeMenu !== 'home') {
        state.postLoginRedirect = state.activeMenu;
      }
      state.topLoginMenuOpen = false;
      if (menuId === 'login-admin') state.loginTab = 'admin';
      else if (menuId === 'login-manager') state.loginTab = 'manager';
      else if (menuId === 'login-school') state.loginTab = 'school';
      else if (menuId === 'login-judge') state.loginTab = 'judge';
    } else {
      state.topLoginMenuOpen = false;
    }
    state.activeMenu = menuId;
    state.mobileMenuOpen = false;

    if (menuId === 'judge-scoring') {
      initJudgeDrafts();
    }
    renderAll();
  }

  function initJudgeDrafts(roundOverride) {
    const jdg = getCurrentJudge();
    if (!jdg) return;
    const isTwoRound = isTwoRoundComp(jdg.competitionId);
    const activeRound = roundOverride || state.judgeScoringRound || 'qualifying';
    const criteriaList = getCriteria(jdg.competitionId);
    const draft = {};
    state.registrations
      .filter(function (r) { return r.competitionId === jdg.competitionId && r.level === jdg.level; })
      .forEach(function (r) {
        const hasRoundStore = Boolean(state.roundScores[r.id] || state.roundScoreCriteriaDetails[r.id]);
        const existingDetail = isTwoRound
          ? ((state.roundScoreCriteriaDetails[r.id] && state.roundScoreCriteriaDetails[r.id][activeRound] && state.roundScoreCriteriaDetails[r.id][activeRound][jdg.id])
            || (activeRound === 'qualifying' && !hasRoundStore && state.scoreCriteriaDetails[r.id] ? state.scoreCriteriaDetails[r.id][jdg.id] : null))
          : ((state.scoreCriteriaDetails[r.id] && state.scoreCriteriaDetails[r.id][jdg.id]) || null);
        const existingTotal = isTwoRound
          ? ((state.roundScores[r.id] && state.roundScores[r.id][activeRound] ? state.roundScores[r.id][activeRound][jdg.id] : undefined)
            !== undefined
              ? state.roundScores[r.id][activeRound][jdg.id]
              : (activeRound === 'qualifying' && !hasRoundStore && state.scores[r.id] ? state.scores[r.id][jdg.id] : undefined))
          : (state.scores[r.id] ? state.scores[r.id][jdg.id] : undefined);
        const row = {};
        criteriaList.forEach(function (c, idx) {
          if (existingDetail && existingDetail[c.key] !== undefined) {
            row[c.key] = existingDetail[c.key];
          } else if (idx === 0 && existingTotal !== undefined && !existingDetail) {
            row[c.key] = existingTotal;
          } else {
            row[c.key] = '';
          }
        });
        draft[r.id] = row;
      });
    state.draftCriteriaScores = draft;
  }

  async function doLogout() {
    try {
      const res = await apiCall('logout', {});
      state.activeMenu = 'home';
      showToast(res.message || 'ออกจากระบบเรียบร้อยแล้ว');
      renderAll();
    } catch (err) {
      showToast(err.message, 'error');
    }
  }

  // ---------------- Print Document Builders ----------------
  function openPreview(title, bodyHtml, pageSizeCss) {
    P.openPreviewModal(
      { title: title, bodyHtml: bodyHtml, pageSizeCss: pageSizeCss, extraStyleCss: '' },
      document.getElementById('printModalContainer'),
      showToast
    );
  }

  function printStudentCards(targetSchoolId, targetCompId, layoutMode) {
    const filtered = state.registrations.filter(function (r) {
      const mSch = targetSchoolId === 'all' ? state.authSession.role === 'admin' : r.schoolId === targetSchoolId;
      const mComp = targetCompId === 'all' ? true : r.competitionId === targetCompId;
      return mSch && mComp;
    });
    if (filtered.length === 0) {
      showToast('ไม่พบข้อมูลบัตรผู้เข้าแข่งขันตามเงื่อนไขที่เลือก', 'error');
      return;
    }
    const bgUrl = safeImg(state.backgrounds.studentCardBgUrl);
    const cards = [];
    filtered.forEach(function (reg) {
      const sch = getSchool(reg.schoolId);
      const comp = getComp(reg.competitionId);
      const sched = state.schedules[reg.competitionId + '__' + reg.level] || { venue: 'กำหนดในวันงาน', timeRange: '08.30 น. เป็นต้นไป' };
      (reg.students || []).forEach(function (st, idx) {
        const bgFallback = 'background:linear-gradient(160deg,#fffbeb 0%,#fef3c7 48%,#fff7ed 100%);';
        const bgImgHtml = bgUrl
          ? '<img src="' + esc(bgUrl) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;pointer-events:none;" />'
          : '';
        const photo = safeImg(st.photoUrl);
        cards.push(
          '<div class="card-item" style="width:105mm;height:148.5mm;' + bgFallback + 'border-radius:12px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;">' +
            bgImgHtml +
            '<div style="position:relative;z-index:1;text-align:center;padding:6px 8px 8px;background:rgba(255,255,255,0.65);border-radius:8px;">' +
              '<div style="font-size:13.5px;font-weight:700;color:#78350f;">บัตรประจำตัวผู้เข้าแข่งขัน</div>' +
              '<div style="font-size:10.5px;font-weight:700;color:#b45309;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>' +
              '<div style="font-size:9.5px;color:#92400e;">' + esc(state.eventMeta.dateTh || '') + '</div>' +
            '</div>' +
            '<div style="position:relative;z-index:1;display:flex;justify-content:center;margin:4px 0;">' +
              '<div style="width:44mm;height:56mm;border-radius:10px;border:2px solid rgba(255,255,255,0.92);box-shadow:0 2px 8px rgba(15,23,42,0.12);background:rgba(255,255,255,0.75);display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
                (photo ? '<img src="' + esc(photo) + '" style="width:100%;height:100%;object-fit:cover;object-position:center top;" />' : '<span style="font-size:11px;color:#94a3b8;text-align:center;">รูปภาพนักเรียน<br/>(คนที่ ' + (idx + 1) + ')</span>') +
              '</div>' +
            '</div>' +
            '<div style="position:relative;z-index:1;background:rgba(255,255,255,0.75);border-radius:10px;padding:8px 10px;font-size:11px;line-height:1.45;">' +
              '<div><strong>ชื่อ-สกุล:</strong> ' + esc(st.name) + '</div>' +
              '<div><strong>โรงเรียน:</strong> ' + esc(sch ? sch.name : '-') + '</div>' +
              '<div><strong>กิจกรรม:</strong> ' + esc(comp ? comp.name : '-') + '</div>' +
              '<div><strong>ระดับชั้น:</strong> ' + esc(reg.level) + '</div>' +
              '<div><strong>สถานที่:</strong> ' + esc(sched.venue) + '</div>' +
              '<div><strong>เวลา:</strong> ' + esc(sched.timeRange) + '</div>' +
            '</div>' +
            '<div style="position:relative;z-index:1;text-align:center;font-size:9.5px;font-weight:600;color:#78350f;background:rgba(255,255,255,0.65);padding:4px;border-radius:6px;">กรุณาติดบัตรนี้ตลอดการแข่งขัน</div>' +
          '</div>'
        );
      });
    });
    const is4 = layoutMode === '4-up';
    openPreview('บัตรประจำตัวผู้เข้าแข่งขัน (' + (is4 ? 'พิมพ์ 4 ต่อ 1 แนวตั้ง' : '148.5 x 105 มม.') + ')', P.buildCardSheetsHtml(cards, layoutMode), is4 ? 'A4 portrait' : '105mm 148.5mm portrait');
  }

  function printCoachCards(targetSchoolId, targetCompId, layoutMode) {
    const filtered = state.registrations.filter(function (r) {
      const mSch = targetSchoolId === 'all' ? state.authSession.role === 'admin' : r.schoolId === targetSchoolId;
      const mComp = targetCompId === 'all' ? true : r.competitionId === targetCompId;
      return mSch && mComp;
    });
    if (filtered.length === 0) {
      showToast('ไม่พบข้อมูลบัตรครูผู้ฝึกสอนตามเงื่อนไขที่เลือก', 'error');
      return;
    }
    const bgUrl = safeImg(state.backgrounds.coachCardBgUrl);
    const cards = [];
    filtered.forEach(function (reg) {
      const sch = getSchool(reg.schoolId);
      const comp = getComp(reg.competitionId);
      const sched = state.schedules[reg.competitionId + '__' + reg.level] || { venue: 'กำหนดในวันงาน', timeRange: '08.30 น. เป็นต้นไป' };
      const stuList = (reg.students || []).map(function (s) { return s.name; }).join(', ') || '-';
      (reg.coaches || []).forEach(function (c, idx) {
        const cName = typeof c === 'string' ? c : (c.name || '');
        const cPhoto = safeImg(typeof c === 'string' ? '' : (c.photoUrl || ''));
        const bgFallback = 'background:linear-gradient(160deg,#ecfdf5 0%,#d1fae5 48%,#f0fdfa 100%);';
        const bgImgHtml = bgUrl
          ? '<img src="' + esc(bgUrl) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;pointer-events:none;" />'
          : '';
        cards.push(
          '<div class="card-item" style="width:105mm;height:148.5mm;' + bgFallback + 'border-radius:12px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;">' +
            bgImgHtml +
            '<div style="position:relative;z-index:1;text-align:center;padding:6px 8px 8px;background:rgba(255,255,255,0.65);border-radius:8px;">' +
              '<div style="font-size:13.5px;font-weight:700;color:#064e3b;">บัตรประจำตัวครูผู้ฝึกสอน</div>' +
              '<div style="font-size:10.5px;font-weight:700;color:#047857;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>' +
              '<div style="font-size:9.5px;color:#059669;">' + esc(state.eventMeta.dateTh || '') + '</div>' +
            '</div>' +
            '<div style="position:relative;z-index:1;display:flex;justify-content:center;margin:4px 0;">' +
              '<div style="width:42mm;height:52mm;border-radius:10px;border:2px solid rgba(255,255,255,0.92);box-shadow:0 2px 8px rgba(15,23,42,0.12);background:rgba(255,255,255,0.75);display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
                (cPhoto ? '<img src="' + esc(cPhoto) + '" style="width:100%;height:100%;object-fit:cover;object-position:center top;" />' : '<span style="font-size:11px;color:#64748b;text-align:center;">รูปภาพครูผู้ฝึกสอน<br/>(คนที่ ' + (idx + 1) + ')</span>') +
              '</div>' +
            '</div>' +
            '<div style="position:relative;z-index:1;background:rgba(255,255,255,0.75);border-radius:10px;padding:8px 10px;font-size:10.5px;line-height:1.4;">' +
              '<div><strong>ครูผู้ฝึกสอน:</strong> ' + esc(cName) + '</div>' +
              '<div><strong>โรงเรียน:</strong> ' + esc(sch ? sch.name : '-') + '</div>' +
              '<div><strong>ผู้แข่งขัน:</strong> ' + esc(stuList) + '</div>' +
              '<div><strong>กิจกรรม:</strong> ' + esc(comp ? comp.name : '-') + '</div>' +
              '<div><strong>ระดับชั้น:</strong> ' + esc(reg.level) + '</div>' +
              '<div><strong>สถานที่:</strong> ' + esc(sched.venue) + '</div>' +
              '<div><strong>เวลา:</strong> ' + esc(sched.timeRange) + '</div>' +
            '</div>' +
            '<div style="position:relative;z-index:1;text-align:center;font-size:9.5px;font-weight:700;color:#065f46;background:rgba(255,255,255,0.65);padding:4px;border-radius:6px;">ครูผู้ฝึกสอน</div>' +
          '</div>'
        );
      });
    });
    const is4 = layoutMode === '4-up';
    openPreview('บัตรประจำตัวครูผู้ฝึกสอน (' + (is4 ? 'พิมพ์ 4 ต่อ 1 แนวตั้ง' : '148.5 x 105 มม.') + ')', P.buildCardSheetsHtml(cards, layoutMode), is4 ? 'A4 portrait' : '105mm 148.5mm portrait');
  }

  function printJudgeCards(targetJudges, layoutMode) {
    if (!targetJudges || targetJudges.length === 0) {
      showToast('ไม่พบข้อมูลบัตรกรรมการตัดสิน', 'error');
      return;
    }
    const bgUrl = safeImg(state.backgrounds.judgeCardBgUrl);
    const cards = targetJudges.map(function (jdg) {
      const comp = getComp(jdg.competitionId);
      const sched = state.schedules[jdg.competitionId + '__' + jdg.level] || { venue: 'กำหนดในวันงาน', timeRange: '08.30 น. เป็นต้นไป' };
      const bgFallback = 'background:linear-gradient(160deg,#eff6ff 0%,#dbeafe 50%,#f0fdf4 100%);';
      const bgImgHtml = bgUrl
        ? '<img src="' + esc(bgUrl) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;pointer-events:none;" />'
        : '';
      const photo = safeImg(jdg.photoUrl);
      return (
        '<div class="card-item" style="width:105mm;height:148.5mm;' + bgFallback + 'border-radius:12px;padding:14px;display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden;">' +
          bgImgHtml +
          '<div style="position:relative;z-index:1;text-align:center;padding:6px 8px 8px;background:rgba(255,255,255,0.65);border-radius:8px;">' +
            '<div style="font-size:13.5px;font-weight:700;color:#0c4a6e;">บัตรประจำตัวกรรมการตัดสิน</div>' +
            '<div style="font-size:10.5px;font-weight:700;color:#0369a1;">งานส่งเสริมวันมาฆบูชา ครั้งที่ ๑๔ พ.ศ. ๒๕๗๐</div>' +
            '<div style="font-size:9.5px;color:#0284c7;">' + esc(state.eventMeta.dateTh || '') + '</div>' +
          '</div>' +
          '<div style="position:relative;z-index:1;display:flex;justify-content:center;margin:4px 0;">' +
            '<div style="width:40mm;height:50mm;border-radius:10px;border:2px solid rgba(255,255,255,0.92);box-shadow:0 2px 8px rgba(15,23,42,0.12);background:rgba(255,255,255,0.75);display:flex;align-items:center;justify-content:center;overflow:hidden;">' +
              (photo ? '<img src="' + esc(photo) + '" style="width:100%;height:100%;object-fit:cover;object-position:center top;" />' : '<span style="font-size:11px;color:#64748b;text-align:center;">รูปภาพกรรมการ</span>') +
            '</div>' +
          '</div>' +
          '<div style="position:relative;z-index:1;background:rgba(255,255,255,0.75);border-radius:10px;padding:8px 10px;font-size:10.5px;line-height:1.38;">' +
            '<div><strong>ชื่อ-สกุล:</strong> ' + esc(jdg.name) + '</div>' +
            '<div><strong>ตำแหน่ง:</strong> ' + esc(jdg.position) + '</div>' +
            '<div><strong>กิจกรรมที่ตัดสิน:</strong> ' + esc(comp ? comp.name : '-') + '</div>' +
            '<div><strong>ระดับชั้น:</strong> ' + esc(jdg.level) + '</div>' +
            '<div><strong>สถานที่:</strong> ' + esc(sched.venue) + '</div>' +
            '<div><strong>เวลา:</strong> ' + esc(sched.timeRange) + '</div>' +
            '<div style="margin-top:4px;padding-top:4px;color:#0c4a6e;"><strong>ชื่อผู้ใช้:</strong> ' + esc(jdg.username || '-') + '</div>' +
          '</div>' +
          '<div style="position:relative;z-index:1;text-align:center;font-size:9.5px;font-weight:700;color:#0369a1;background:rgba(255,255,255,0.65);padding:4px;border-radius:6px;">คณะกรรมการตัดสินการแข่งขัน</div>' +
        '</div>'
      );
    });
    const is4 = layoutMode === '4-up';
    openPreview('บัตรประจำตัวกรรมการตัดสิน (' + (is4 ? 'พิมพ์ 4 ต่อ 1 แนวตั้ง' : '148.5 x 105 มม.') + ')', P.buildCardSheetsHtml(cards, layoutMode), is4 ? 'A4 portrait' : '105mm 148.5mm portrait');
  }

  function printCertificates(certsList, docTitle) {
    if (!certsList || certsList.length === 0) {
      showToast('ไม่พบรายชื่อสำหรับออกเกียรติบัตร', 'error');
      return;
    }
    const bgUrl = safeImg(state.backgrounds.certBgUrl);
    const pagesHtml = certsList.map(function (cert) {
      const bgFallback = 'background:linear-gradient(135deg,#fffdf7 0%,#fef9c3 35%,#fffbeb 70%,#fef3c7 100%);';
      const bgImgHtml = bgUrl
        ? '<img src="' + esc(bgUrl) + '" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;z-index:0;pointer-events:none;" />'
        : '';
      const line3 = cert.line3Activity || '';
      const len = line3.trim().length;
      const line3Pt = cert.fitSingleLine && len > 48 ? Math.max(9.5, Number((13.5 - (len - 48) * 0.08).toFixed(1))) : 13.5;
      return (
        '<div class="page-break" style="width:297mm;height:210mm;' + bgFallback + 'padding:16mm;position:relative;overflow:hidden;display:flex;justify-content:center;">' +
          bgImgHtml +
          (cert.certNumber ? '<div style="position:absolute;top:4cm;right:1cm;z-index:1;font-size:10pt;font-weight:600;color:#0f172a;text-align:right;">' + esc(cert.certNumber) + '</div>' : '') +
          '<div style="position:absolute;top:7.3cm;left:0;right:0;width:100%;z-index:1;padding:0 36px;display:flex;flex-direction:column;align-items:center;text-align:center;gap:10px;">' +
            '<div style="font-size:19pt;font-weight:700;color:#0f172a;line-height:1.4;">' + esc(cert.line1Name) + '</div>' +
            '<div style="font-size:14pt;font-weight:700;color:#0f172a;line-height:1.4;">' + esc(cert.line2Position) + '</div>' +
            '<div style="' + (cert.fitSingleLine ? 'font-size:' + line3Pt + 'pt;white-space:nowrap;max-width:100%;' : 'font-size:13.5pt;max-width:820px;') + 'font-weight:600;color:#0f172a;line-height:1.5;">' + esc(line3) + '</div>' +
          '</div>' +
        '</div>'
      );
    }).join('');
    openPreview(docTitle, pagesHtml, 'A4 landscape');
  }

  function printResultsReport(compId, level) {
    const comp = getComp(compId);
    const metaKey = compId + '__' + level.trim();
    const meta = state.evalMeta[metaKey] || state.evalMeta[compId + '__' + level] || { status: 'pending', approved: false };
    const isAdminOrManager = state.authSession.role === 'admin' || state.authSession.role === 'manager';
    const isAdmin = state.authSession.role === 'admin';
    if (!meta.approved && !isAdminOrManager) {
      showToast('ผลคะแนนกิจกรรมนี้ยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ', 'error');
      return;
    }
    const isTwoRound = isTwoRoundComp(compId);
    const rankedList = buildCompetitionRankedList(compId, level);
    const visible = rankedList.filter(function (x) { return isAdminOrManager || (!x.isAbsent && x.hasScore); });
    const colCount = isAdmin ? 6 : 5;
    let lastGroup = '';
    const trHtml = visible.map(function (item) {
      const sch = getSchool(item.reg.schoolId);
      const rankLabel = getRankAwardLabel(item.rankNum, item.isAbsent, item.hasScore, 'ลำดับที่');
      const medal = item.isAbsent
        ? { label: 'ไม่เข้าร่วมแข่งขัน', printColor: '#be123c' }
        : P.getMedalTier(item.score, item.hasScore);
      let sectionRow = '';
      if (isTwoRound && item.roundGroup !== lastGroup) {
        if (item.roundGroup === 'final_top10') {
          sectionRow = '<tr style="background:#fef3c7;"><td colspan="' + colCount + '" style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:700;color:#78350f;">🏆 รอบตัดสิน — ผู้ผ่านเข้ารอบ 10 อันดับแรกจากรอบคัดเลือก (ลำดับที่ 1–10)</td></tr>';
        } else if (item.roundGroup === 'qualifying_rest') {
          sectionRow = '<tr style="background:#f1f5f9;"><td colspan="' + colCount + '" style="padding:7px 10px;border:1px solid #cbd5e1;font-weight:700;color:#334155;">🎵 รอบคัดเลือก (ต่อท้าย) — ผู้ไม่เข้าเกณฑ์รอบตัดสิน (ลำดับที่ 11 เป็นต้นไป)</td></tr>';
        }
        lastGroup = item.roundGroup;
      }
      let judgeCell = '';
      if (isAdmin) {
        const jText = item.isAbsent
          ? '<span style="color:#be123c;font-weight:700;">แจ้งไม่เข้าร่วมแข่งขัน</span>'
          : (Object.entries(item.judgeScores || {}).map(function (pair) {
              const jObj = getJudge(pair[0]);
              return esc(jObj ? jObj.name : pair[0]) + ': ' + esc(pair[1]);
            }).join(' | ') || 'ยังไม่มีคะแนน');
        judgeCell = '<td style="padding:8px;border:1px solid #cbd5e1;font-size:12px;">' + jText + '</td>';
      }
      let roundNote = '';
      if (item.roundInfo.isTwoRound && item.hasScore) {
        if (item.roundGroup === 'qualifying_rest') {
          roundNote = '<div style="font-size:10.5px;color:#475569;">รอบคัดเลือก (อันดับคัดเลือก ' + (item.qualifyingRank || '-') + ')</div>';
        } else {
          roundNote = '<div style="font-size:10.5px;color:#0369a1;">' +
            (item.roundInfo.finalCalc.judgeCount > 0 ? 'รอบตัดสิน (1–10)' : 'เข้าเกณฑ์รอบตัดสิน (คัดเลือก 1–10)') +
            (item.roundInfo.qualifyingCalc.judgeCount > 0 ? ' • คัดเลือก ' + item.roundInfo.qualifyingCalc.average100.toFixed(2) : '') +
            (item.roundInfo.finalCalc.judgeCount > 0 ? ' • ตัดสิน ' + item.roundInfo.finalCalc.average100.toFixed(2) : '') +
          '</div>';
        }
      }
      return sectionRow + '<tr>' +
        '<td style="padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:700;">' + esc(rankLabel) + '</td>' +
        '<td style="padding:8px;border:1px solid #cbd5e1;">' + esc((item.reg.students || []).map(function (s) { return s.name; }).join(', ')) + '</td>' +
        '<td style="padding:8px;border:1px solid #cbd5e1;">' + esc(sch ? sch.name : '-') + '</td>' +
        judgeCell +
        '<td style="padding:8px;border:1px solid #cbd5e1;text-align:right;font-weight:700;color:#b45309;">' + (item.hasScore ? item.score.toFixed(2) : '-') + roundNote + '</td>' +
        '<td style="padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:700;color:' + medal.printColor + ';">' + esc(medal.label) + '</td>' +
      '</tr>';
    }).join('');

    const bodyHtml =
      '<div style="width:210mm;min-height:297mm;background:#fff;padding:24px;border:1px solid #e2e8f0;">' +
        '<div style="text-align:center;border-bottom:2px solid #f59e0b;padding-bottom:12px;margin-bottom:16px;">' +
          '<h2 style="margin:0;color:#78350f;">ประกาศผลการแข่งขัน</h2>' +
          '<div style="font-size:15px;font-weight:700;margin-top:4px;">' + esc(state.eventMeta.titleTh || '') + '</div>' +
          '<div style="font-size:13px;color:#475569;margin-top:4px;">กิจกรรม: <strong>' + esc(comp ? comp.name : '') + '</strong> | ระดับ: <strong>' + esc(level) + '</strong></div>' +
          '<div style="font-size:12px;color:#059669;margin-top:4px;">สถานะ: ' + (meta.approved ? 'อนุมัติผลการแข่งขันอย่างเป็นทางการแล้ว' : 'ฉบับร่าง (รอผู้ดูแลระบบอนุมัติ)') + '</div>' +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
          '<thead><tr style="background:#fef3c7;color:#78350f;">' +
            '<th style="padding:8px;border:1px solid #cbd5e1;">ลำดับที่ / รางวัล</th>' +
            '<th style="padding:8px;border:1px solid #cbd5e1;">ผู้เข้าแข่งขัน</th>' +
            '<th style="padding:8px;border:1px solid #cbd5e1;">โรงเรียน</th>' +
            (isAdmin ? '<th style="padding:8px;border:1px solid #cbd5e1;">คะแนนกรรมการรายท่าน (Admin)</th>' : '') +
            '<th style="padding:8px;border:1px solid #cbd5e1;text-align:right;">คะแนนรวม (เต็ม ๑๐๐)</th>' +
            '<th style="padding:8px;border:1px solid #cbd5e1;text-align:center;">ระดับเหรียญรางวัล</th>' +
          '</tr></thead>' +
          '<tbody>' + (trHtml || '<tr><td colspan="6" style="padding:16px;text-align:center;">ยังไม่มีข้อมูลผู้เข้าแข่งขันในระดับนี้</td></tr>') + '</tbody>' +
        '</table>' +
      '</div>';
    openPreview('ผลการแข่งขัน - ' + (comp ? comp.name : '') + ' (' + level + ')', bodyHtml, 'A4 portrait');
  }

  function printScheduleReport(targetCompId, targetLevel) {
    const comps = state.competitions.filter(function (c) { return targetCompId === 'all' || c.id === targetCompId; });
    const sections = comps.map(function (c) {
      const levels = targetLevel === 'ทั้งหมด' ? c.levels : c.levels.filter(function (l) { return l === targetLevel; });
      if (levels.length === 0) return '';
      const rows = levels.map(function (lvl) {
        const item = state.schedules[c.id + '__' + lvl] || { venue: 'กำหนดในวันงาน', dateLabel: state.eventMeta.dateTh, timeRange: '08.30 น.', notes: '-' };
        return '<tr><td style="padding:8px;border:1px solid #cbd5e1;font-weight:700;">' + esc(lvl) + '</td><td style="padding:8px;border:1px solid #cbd5e1;">' + esc(item.venue) + '</td><td style="padding:8px;border:1px solid #cbd5e1;">' + esc(item.dateLabel) + '</td><td style="padding:8px;border:1px solid #cbd5e1;white-space:nowrap;">' + esc(item.timeRange) + '</td><td style="padding:8px;border:1px solid #cbd5e1;font-size:12px;">' + esc(item.notes || '-') + '</td></tr>';
      }).join('');
      return '<div style="margin-bottom:18px;"><div style="background:#fef3c7;color:#78350f;font-weight:700;padding:8px 12px;border:1px solid #fcd34d;border-bottom:none;border-radius:8px 8px 0 0;font-size:14px;">' + esc(c.name) + ' (' + esc(c.type) + ')</div><table style="width:100%;border-collapse:collapse;font-size:12.5px;"><thead><tr style="background:#f8fafc;"><th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">ระดับชั้น</th><th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">สถานที่แข่งขัน</th><th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">วันที่แข่งขัน</th><th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">เวลาแข่งขัน</th><th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">หมายเหตุ</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    }).join('');
    const body = '<div style="width:210mm;min-height:297mm;background:#fff;padding:24px;border:1px solid #e2e8f0;"><div style="text-align:center;border-bottom:2px solid #059669;padding-bottom:12px;margin-bottom:18px;"><h2 style="margin:0;color:#064e3b;">ตารางการแข่งขันและสถานที่แข่งขัน</h2><div style="font-size:15px;font-weight:700;margin-top:4px;">' + esc(state.eventMeta.titleTh || '') + '</div></div>' + (sections || '<div style="text-align:center;padding:24px;">ไม่พบข้อมูล</div>') + '</div>';
    openPreview('ตารางการแข่งขันและสถานที่แข่งขัน', body, 'A4 portrait');
  }

  function printSchoolMedalSummary(standings, focusSchool) {
    if (!standings || standings.length === 0) {
      showToast('ยังไม่มีข้อมูลสรุปเหรียญรางวัล', 'error');
      return;
    }
    const rowsHtml = standings.map(function (st, idx) {
      const highlight = focusSchool && st.sch.id === focusSchool.id ? 'background:#fffbeb;font-weight:700;' : '';
      return '<tr style="' + highlight + '">' +
        '<td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">' + (idx + 1) + '</td>' +
        '<td style="padding:8px;border:1px solid #cbd5e1;">' + esc(st.sch.name) + '</td>' +
        '<td style="padding:8px;border:1px solid #cbd5e1;text-align:center;color:#b45309;font-weight:700;">' + st.gold + '</td>' +
        '<td style="padding:8px;border:1px solid #cbd5e1;text-align:center;color:#334155;font-weight:700;">' + st.silver + '</td>' +
        '<td style="padding:8px;border:1px solid #cbd5e1;text-align:center;color:#c2410c;font-weight:700;">' + st.bronze + '</td>' +
        '<td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">' + st.part + '</td>' +
        '<td style="padding:8px;border:1px solid #cbd5e1;text-align:center;font-weight:700;">' + st.total + '</td>' +
      '</tr>';
    }).join('');
    const body =
      '<div style="width:210mm;min-height:297mm;background:#fff;padding:24px;border:1px solid #e2e8f0;">' +
        '<div style="text-align:center;border-bottom:2px solid #f59e0b;padding-bottom:12px;margin-bottom:16px;">' +
          '<h2 style="margin:0;color:#78350f;">สรุปเหรียญรางวัลการแข่งขัน</h2>' +
          '<div style="font-size:15px;font-weight:700;margin-top:4px;">' + esc(state.eventMeta.titleTh || '') + '</div>' +
          (focusSchool ? '<div style="font-size:13px;color:#047857;margin-top:4px;">โรงเรียน: <strong>' + esc(focusSchool.name) + '</strong></div>' : '') +
        '</div>' +
        '<table style="width:100%;border-collapse:collapse;font-size:13px;">' +
          '<thead><tr style="background:#fef3c7;color:#78350f;">' +
            '<th style="padding:8px;border:1px solid #cbd5e1;text-align:center;">อันดับ</th>' +
            '<th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">โรงเรียน</th>' +
            '<th style="padding:8px;border:1px solid #cbd5e1;text-align:center;">เหรียญทอง</th>' +
            '<th style="padding:8px;border:1px solid #cbd5e1;text-align:center;">เหรียญเงิน</th>' +
            '<th style="padding:8px;border:1px solid #cbd5e1;text-align:center;">เหรียญทองแดง</th>' +
            '<th style="padding:8px;border:1px solid #cbd5e1;text-align:center;">เข้าร่วม</th>' +
            '<th style="padding:8px;border:1px solid #cbd5e1;text-align:center;">รวมเหรียญ</th>' +
          '</tr></thead>' +
          '<tbody>' + rowsHtml + '</tbody>' +
        '</table>' +
      '</div>';
    openPreview('สรุปเหรียญรางวัลการแข่งขัน', body, 'A4 portrait');
  }

  function printBySchoolDetails(targetSchoolId) {
    let targetSchools = [];
    if (targetSchoolId) targetSchools = state.schools.filter(function (s) { return s.id === targetSchoolId; });
    else if (state.authSession.role === 'school') targetSchools = state.schools.filter(function (s) { return s.id === state.authSession.schoolId; });
    else targetSchools = state.selectedSchoolFilter === 'all' ? state.schools : state.schools.filter(function (s) { return s.id === state.selectedSchoolFilter; });

    if (targetSchools.length === 0) { showToast('ไม่พบข้อมูลโรงเรียน', 'error'); return; }
    const sheets = targetSchools.map(function (sch) {
      const schRegs = state.registrations.filter(function (r) { return r.schoolId === sch.id; });
      const rows = schRegs.map(function (r, idx) {
        const comp = getComp(r.competitionId);
        const sched = state.schedules[r.competitionId + '__' + r.level] || { venue: 'กำหนดในวันงาน', timeRange: '-' };
        const stText = (r.students || []).map(function (s, i) { return (i + 1) + '. ' + s.name; }).join('<br/>');
        const coText = (r.coaches || []).map(function (c, i) { return (i + 1) + '. ' + (typeof c === 'string' ? c : c.name); }).join('<br/>');
        return '<tr><td style="padding:7px;border:1px solid #cbd5e1;text-align:center;">' + (idx + 1) + '</td><td style="padding:7px;border:1px solid #cbd5e1;"><strong>' + esc(comp ? comp.name : '-') + '</strong><br/><span style="font-size:11.5px;color:#475569;">' + esc(r.level) + '</span></td><td style="padding:7px;border:1px solid #cbd5e1;">' + stText + '</td><td style="padding:7px;border:1px solid #cbd5e1;">' + coText + '</td><td style="padding:7px;border:1px solid #cbd5e1;font-size:12px;">' + esc(sched.venue) + '<br/>เวลา: ' + esc(sched.timeRange) + '</td></tr>';
      }).join('');
      return '<div class="page-break" style="width:210mm;min-height:297mm;background:#fff;padding:24px;border:1px solid #e2e8f0;"><div style="text-align:center;border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:14px;"><h2 style="margin:0;color:#064e3b;">รายละเอียดการแข่งขัน</h2><div style="font-size:15px;font-weight:700;margin-top:4px;">' + esc(sch.name) + ' (รหัส ' + esc(sch.schoolCode) + ')</div><div style="font-size:12.5px;color:#475569;margin-top:3px;">ผู้อำนวยการ: ' + esc(sch.director) + ' • โทร: ' + esc(sch.phone || '-') + '</div></div><table style="width:100%;border-collapse:collapse;font-size:12.5px;"><thead><tr style="background:#d1fae5;color:#064e3b;"><th style="padding:8px;border:1px solid #cbd5e1;">ที่</th><th style="padding:8px;border:1px solid #cbd5e1;">กิจกรรม / ระดับชั้น</th><th style="padding:8px;border:1px solid #cbd5e1;">ผู้เข้าแข่งขัน</th><th style="padding:8px;border:1px solid #cbd5e1;">ครูผู้ฝึกสอน</th><th style="padding:8px;border:1px solid #cbd5e1;">สถานที่และเวลา</th></tr></thead><tbody>' + (rows || '<tr><td colspan="5" style="padding:16px;text-align:center;">ยังไม่มีรายการสมัครแข่งขัน</td></tr>') + '</tbody></table></div>';
    }).join('');
    openPreview('รายละเอียดการแข่งขัน', sheets, 'A4 portrait');
  }

  function printByActivityDetails(targetCompId, targetLevel) {
    const isSchool = state.authSession.role === 'school';
    const comps = state.competitions.filter(function (c) { return targetCompId === 'all' || c.id === targetCompId; });
    const sheets = [];
    comps.forEach(function (comp) {
      const levels = targetLevel === 'ทั้งหมด' ? comp.levels : comp.levels.filter(function (l) { return l === targetLevel; });
      levels.forEach(function (lvl) {
        const regs = state.registrations.filter(function (r) {
          if (r.competitionId !== comp.id || r.level !== lvl) return false;
          if (isSchool) return r.schoolId === state.authSession.schoolId;
          return state.selectedSchoolFilter === 'all' || r.schoolId === state.selectedSchoolFilter;
        });
        if (regs.length === 0) return;
        const sched = state.schedules[comp.id + '__' + lvl] || { venue: 'กำหนดในวันงาน', timeRange: '-' };
        const rows = regs.map(function (r, idx) {
          const sch = getSchool(r.schoolId);
          const stText = (r.students || []).map(function (s, i) { return (i + 1) + '. ' + s.name; }).join('<br/>');
          const coText = (r.coaches || []).map(function (c, i) { return (i + 1) + '. ' + (typeof c === 'string' ? c : c.name); }).join('<br/>');
          return '<tr><td style="padding:7px;border:1px solid #cbd5e1;text-align:center;">' + (idx + 1) + '</td><td style="padding:7px;border:1px solid #cbd5e1;font-weight:700;">' + esc(sch ? sch.name : '-') + '</td><td style="padding:7px;border:1px solid #cbd5e1;">' + stText + '</td><td style="padding:7px;border:1px solid #cbd5e1;">' + coText + '</td></tr>';
        }).join('');
        sheets.push('<div class="page-break" style="width:210mm;min-height:297mm;background:#fff;padding:24px;border:1px solid #e2e8f0;"><div style="text-align:center;border-bottom:2px solid #f59e0b;padding-bottom:10px;margin-bottom:14px;"><h2 style="margin:0;color:#78350f;">รายละเอียดรายชื่อผู้เข้าแข่งขันตามกิจกรรม</h2><div style="font-size:15px;font-weight:700;margin-top:4px;">' + esc(comp.name) + ' — ' + esc(lvl) + '</div><div style="font-size:12.5px;color:#475569;margin-top:4px;">สถานที่: ' + esc(sched.venue) + ' | เวลา: ' + esc(sched.timeRange) + '</div></div><table style="width:100%;border-collapse:collapse;font-size:12.5px;"><thead><tr style="background:#fef3c7;color:#78350f;"><th style="padding:8px;border:1px solid #cbd5e1;">ที่</th><th style="padding:8px;border:1px solid #cbd5e1;">โรงเรียน</th><th style="padding:8px;border:1px solid #cbd5e1;">ผู้เข้าแข่งขัน</th><th style="padding:8px;border:1px solid #cbd5e1;">ครูผู้ฝึกสอน</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
      });
    });
    if (sheets.length === 0) { showToast('ไม่พบรายการแข่งขันตามเงื่อนไขที่เลือก', 'error'); return; }
    openPreview('รายละเอียดรายชื่อตามกิจกรรม', sheets.join(''), 'A4 portrait');
  }

  function printAdminSheet(mode, targetCompId, targetLevel) {
    const comps = state.competitions.filter(function (c) { return targetCompId === 'all' || c.id === targetCompId; });
    const sheets = [];
    const useWide = mode === 'score';
    comps.forEach(function (comp) {
      const levels = targetLevel === 'ทั้งหมด' ? comp.levels : comp.levels.filter(function (l) { return l === targetLevel; });
      levels.forEach(function (lvl) {
        const regs = state.registrations.filter(function (r) { return r.competitionId === comp.id && r.level === lvl; });
        if (regs.length === 0) return;
        const sched = state.schedules[comp.id + '__' + lvl] || { venue: '-', timeRange: '-' };
        if (mode === 'register') {
          const rows = regs.map(function (r, idx) {
            const sch = getSchool(r.schoolId);
            const stText = (r.students || []).map(function (s, i) { return (i + 1) + '. ' + s.name; }).join('<br/>');
            const coText = (r.coaches || []).map(function (c, i) { return (i + 1) + '. ' + (typeof c === 'string' ? c : c.name); }).join('<br/>');
            return '<tr><td style="padding:8px;border:1px solid #cbd5e1;text-align:center;">' + (idx + 1) + '</td><td style="padding:8px;border:1px solid #cbd5e1;">' + esc(sch ? sch.name : '-') + '</td><td style="padding:8px;border:1px solid #cbd5e1;">' + stText + '</td><td style="padding:8px;border:1px solid #cbd5e1;">' + coText + '</td><td style="padding:8px;border:1px solid #cbd5e1;width:90px;"></td></tr>';
          }).join('');
          sheets.push('<div class="page-break" style="width:210mm;min-height:297mm;background:#fff;padding:24px;"><div style="text-align:center;border-bottom:2px solid #059669;padding-bottom:10px;margin-bottom:14px;"><h2 style="margin:0;">แบบลงทะเบียนผู้เข้าแข่งขัน (ใบเซ็นชื่อ)</h2><div style="font-size:14px;font-weight:700;">' + esc(comp.name) + ' • ' + esc(lvl) + '</div><div style="font-size:12px;color:#475569;">สถานที่: ' + esc(sched.venue) + ' | เวลา: ' + esc(sched.timeRange) + '</div></div><table style="width:100%;border-collapse:collapse;font-size:12.5px;"><thead><tr style="background:#d1fae5;"><th style="padding:8px;border:1px solid #cbd5e1;text-align:center;">ที่</th><th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">โรงเรียน</th><th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">รายชื่อผู้เข้าแข่งขัน</th><th style="padding:8px;border:1px solid #cbd5e1;text-align:left;">ครูผู้ฝึกสอน</th><th style="padding:8px;border:1px solid #cbd5e1;text-align:center;">ลงลายมือชื่อ</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
        } else {
          const crit = getCriteria(comp.id);
          const critHeads = crit.map(function (c) { return '<th style="padding:6px;border:1px solid #cbd5e1;font-size:11px;">' + esc(c.label) + '<br/>(' + esc(c.max) + ')</th>'; }).join('');
          const rows = regs.map(function (r, idx) {
            const sch = getSchool(r.schoolId);
            const stText = (r.students || []).map(function (s) { return s.name; }).join(', ');
            const emptyCells = crit.map(function () { return '<td style="border:1px solid #cbd5e1;"></td>'; }).join('');
            return '<tr><td style="padding:7px;border:1px solid #cbd5e1;text-align:center;">' + (idx + 1) + '</td><td style="padding:7px;border:1px solid #cbd5e1;">' + esc(sch ? sch.name : '-') + '</td><td style="padding:7px;border:1px solid #cbd5e1;">' + esc(stText) + '</td>' + emptyCells + '<td style="border:1px solid #cbd5e1;"></td></tr>';
          }).join('');
          sheets.push('<div class="page-break" style="width:297mm;min-height:210mm;background:#fff;padding:20px;"><div style="text-align:center;border-bottom:2px solid #f59e0b;padding-bottom:8px;margin-bottom:12px;"><h2 style="margin:0;">ใบบันทึกคะแนนกรรมการตัดสิน</h2><div style="font-size:14px;font-weight:700;">' + esc(comp.name) + ' • ' + esc(lvl) + '</div></div><table style="width:100%;border-collapse:collapse;font-size:12px;"><thead><tr style="background:#fef3c7;"><th style="padding:7px;border:1px solid #cbd5e1;text-align:center;">ที่</th><th style="padding:7px;border:1px solid #cbd5e1;text-align:left;">โรงเรียน</th><th style="padding:7px;border:1px solid #cbd5e1;text-align:left;">ผู้เข้าแข่งขัน</th>' + critHeads + '<th style="padding:7px;border:1px solid #cbd5e1;text-align:center;">รวม (100)</th></tr></thead><tbody>' + rows + '</tbody></table></div>');
        }
      });
    });
    if (sheets.length === 0) { showToast('ไม่พบข้อมูลสำหรับพิมพ์เอกสาร', 'error'); return; }
    openPreview(mode === 'register' ? 'ใบลงทะเบียนผู้เข้าแข่งขัน' : 'ใบบันทึกคะแนนกรรมการ', sheets.join(''), useWide ? 'A4 landscape' : 'A4 portrait');
  }

  // ---------------- Layout Chrome & Navigation ----------------
  function renderLayoutChrome() {
    const role = state.authSession.role;
    const roleText = role === 'judge' ? 'โหมดกรรมการ' : role === 'admin' ? 'โหมดผู้ดูแลระบบ' : role === 'manager' ? 'โหมดผู้จัดการแข่งขัน' : role === 'school' ? 'โหมดโรงเรียน' : 'ทั่วไป';
    const currentSch = getCurrentSchool();

    document.getElementById('topbarDisplayName').textContent = state.authSession.displayName || 'ผู้เยี่ยมชมทั่วไป';
    document.getElementById('topbarRoleTag').textContent = '(' + role.toUpperCase() + ')';
    document.getElementById('sidebarRoleTitle').textContent = 'เมนูหลัก (' + roleText + ')';

    const authActionsEl = document.getElementById('topbarAuthActions');
    if (role !== 'guest') {
      authActionsEl.innerHTML = '<button type="button" id="btnTopLogout" class="btn btn-danger-white btn-sm">🚪 ออกจากระบบ</button>';
      document.getElementById('btnTopLogout').onclick = doLogout;
    } else {
      authActionsEl.innerHTML =
        '<div class="topbar-login-wrap">' +
          '<button type="button" id="btnTopLogin" class="btn btn-white btn-sm">🔑 เข้าสู่ระบบ ▾</button>' +
          (state.topLoginMenuOpen
            ? '<div class="topbar-dropdown" id="topLoginDropdown" style="z-index:50;">' +
                '<button type="button" class="topbar-dropdown-item" data-login-menu="login-admin">🛡 ผู้ดูแลระบบ</button>' +
                '<button type="button" class="topbar-dropdown-item" data-login-menu="login-manager">📄 ผู้จัดการแข่งขัน</button>' +
                '<button type="button" class="topbar-dropdown-item" data-login-menu="login-school">🏫 ระบบโรงเรียน</button>' +
                '<button type="button" class="topbar-dropdown-item" data-login-menu="login-judge">⚖ ระบบกรรมการ</button>' +
              '</div>'
            : '') +
        '</div>';
      document.getElementById('btnTopLogin').onclick = function (e) {
        e.stopPropagation();
        state.topLoginMenuOpen = !state.topLoginMenuOpen;
        renderLayoutChrome();
      };
      authActionsEl.querySelectorAll('[data-login-menu]').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          selectMenu(btn.getAttribute('data-login-menu'));
        };
      });
    }

    // Sidebar state
    const sidebarEl = document.getElementById('appSidebar');
    const overlayEl = document.getElementById('mobileOverlay');
    const desktopLbl = document.getElementById('desktopSidebarLabel');
    if (state.desktopSidebarOpen) {
      sidebarEl.classList.remove('desktop-collapsed');
      desktopLbl.classList.add('hidden');
    } else {
      sidebarEl.classList.add('desktop-collapsed');
      desktopLbl.classList.remove('hidden');
    }
    if (state.mobileMenuOpen) {
      sidebarEl.classList.add('mobile-open');
      overlayEl.classList.remove('hidden');
    } else {
      sidebarEl.classList.remove('mobile-open');
      overlayEl.classList.add('hidden');
    }

    // Sidebar Nav Items (login menu consolidated inside #sidebarAccountCard)
    const navEl = document.getElementById('sidebarNav');
    navEl.innerHTML = getMenuItems()
      .filter(function (item) { return item.id !== 'login'; })
      .map(function (item) {
        const activeCls = state.activeMenu === item.id ? ' active' : '';
        const pill = item.statusMeta
          ? '<span class="status-pill ' + (item.statusMeta.isOpen ? 'open' : 'closed') + '">● ' + esc(item.statusMeta.label) + '</span>'
          : '';
        return '<button type="button" class="nav-btn' + activeCls + '" data-menu="' + esc(item.id) + '">' +
          '<span class="nav-btn-left"><span>' + item.icon + '</span><span>' + esc(item.baseLabel) + '</span></span>' +
          pill +
        '</button>';
      }).join('');

    navEl.querySelectorAll('[data-menu]').forEach(function (btn) {
      btn.onclick = function () { selectMenu(btn.getAttribute('data-menu')); };
    });

    // Sidebar Account Card: สถานะของผู้ใช้ และการเข้าสู่ระบบทั้ง 4 ระบบ
    const accEl = document.getElementById('sidebarAccountCard');
    const avatarIcon = role === 'admin' ? '🛡' : role === 'manager' ? '📄' : role === 'school' ? '🏫' : role === 'judge' ? '⚖' : '👥';
    const subRoleText = role === 'admin' ? 'ผู้ดูแลระบบ (Admin)'
      : role === 'manager' ? 'ผู้จัดการแข่งขัน'
      : role === 'school' ? 'โรงเรียน (' + (currentSch ? currentSch.schoolCode : 'School') + ')'
      : role === 'judge' ? 'กรรมการตัดสิน'
      : 'ยังไม่ได้เข้าสู่ระบบ';
    const dotColor = role === 'guest' ? '#94a3b8' : '#10b981';

    const subLoginHtml = state.loginMenuExpanded
      ? '<div class="acc-login-submenu">' +
          '<button type="button" class="nav-subbtn ' + (state.activeMenu === 'login-admin' ? 'active-admin' : '') + '" data-acc-menu="login-admin">🛡 ผู้ดูแลระบบ</button>' +
          '<button type="button" class="nav-subbtn ' + (state.activeMenu === 'login-manager' ? 'active-manager' : '') + '" data-acc-menu="login-manager">📄 ผู้จัดการแข่งขัน</button>' +
          '<button type="button" class="nav-subbtn ' + (state.activeMenu === 'login-school' ? 'active-school' : '') + '" data-acc-menu="login-school">🏫 ระบบโรงเรียน</button>' +
          '<button type="button" class="nav-subbtn ' + (state.activeMenu === 'login-judge' ? 'active-judge' : '') + '" data-acc-menu="login-judge">⚖ ระบบกรรมการ</button>' +
        '</div>'
      : '';

    accEl.innerHTML =
      '<div class="account-row">' +
        '<div class="account-avatar ' + esc(role) + '">' + avatarIcon + '</div>' +
        '<div style="min-width:0;flex:1;">' +
          '<div style="font-size:12.5px;font-weight:700;color:#1e293b;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + esc(state.authSession.displayName) + '</div>' +
          '<div style="font-size:11px;font-weight:600;color:#64748b;display:flex;align-items:center;gap:6px;margin-top:2px;">' +
            '<span style="width:7px;height:7px;border-radius:999px;background:' + dotColor + ';display:inline-block;flex-shrink:0;"></span>' +
            '<span>' + esc(subRoleText) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      (role !== 'guest'
        ? '<button type="button" id="btnAccLogout" class="btn btn-rose btn-xs" style="width:100%;">🚪 ออกจากระบบ</button>'
        : '') +
      '<div style="padding-top:8px;border-top:1px solid rgba(226,232,240,0.9);display:flex;flex-direction:column;gap:6px;">' +
        '<button type="button" id="btnToggleLoginAccordion" aria-expanded="' + (state.loginMenuExpanded ? 'true' : 'false') + '" style="width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 8px;border:none;border-radius:10px;background:transparent;font-size:11.5px;font-weight:700;color:#475569;cursor:pointer;">' +
          '<span>🔑 การเข้าสู่ระบบทั้ง 4 ระบบ</span>' +
          '<span>' + (state.loginMenuExpanded ? '▾' : '▸') + '</span>' +
        '</button>' +
        subLoginHtml +
      '</div>';

    if (document.getElementById('btnAccLogout')) {
      document.getElementById('btnAccLogout').onclick = doLogout;
    }
    document.getElementById('btnToggleLoginAccordion').onclick = function (e) {
      e.stopPropagation();
      state.loginMenuExpanded = !state.loginMenuExpanded;
      renderLayoutChrome();
    };

    accEl.querySelectorAll('[data-acc-menu]').forEach(function (btn) {
      btn.onclick = function () { selectMenu(btn.getAttribute('data-acc-menu')); };
    });
  }

  // ---------------- Page Renderers ----------------
  function renderHome(main) {
    const totalTeams = state.registrations.length;
    const totalStudents = state.registrations.reduce(function (sum, r) { return sum + (Array.isArray(r.students) ? r.students.length : 0); }, 0);
    const approvedCount = Object.values(state.evalMeta).filter(function (m) { return m && m.approved; }).length;
    const bannerBg = safeImg(state.backgrounds.bannerBgUrl);

    const heroHtml = bannerBg
      ? '<div class="hero-banner-custom">' +
          '<img src="' + bannerBg + '" alt="' + esc(state.eventMeta.titleTh) + '" />' +
          '<div class="row-between" style="padding:16px 20px;background:linear-gradient(to right,#fffbeb,#fff,#fff7ed);border-top:1px solid #fde68a;">' +
            '<div><div style="font-size:12px;font-weight:700;color:#b45309;">✨ ' + esc(state.eventMeta.dateTh) + '</div>' +
            '<div style="font-size:13px;color:#475569;">สถานที่จัดการแข่งขัน: <strong>' + esc(state.eventMeta.venueTh) + '</strong></div></div>' +
            '<div class="row-wrap">' +
              '<button type="button" class="btn btn-amber btn-sm" data-go="register">📝 ระบบสมัครแข่งขัน</button>' +
              '<button type="button" class="btn btn-outline btn-sm" data-go="competitions">📋 ดูรายการแข่งขัน (10 รายการ)</button>' +
              '<button type="button" class="btn btn-dark btn-sm" data-go="results">🏆 ประกาศผลคะแนน</button>' +
            '</div>' +
          '</div>' +
        '</div>'
      : '<div class="hero-banner">' +
          '<div class="hero-pill">✨ ' + esc(state.eventMeta.dateTh) + '</div>' +
          '<h1 class="hero-title">' + esc(state.eventMeta.titleTh) + '</h1>' +
          '<p style="color:#fffbeb;font-size:15px;margin:0 0 18px;">สถานที่จัดการแข่งขัน: <strong>' + esc(state.eventMeta.venueTh) + '</strong> • ดำเนินการโดยคณะสงฆ์อำเภอศีขรภูมิ จังหวัดสุรินทร์ ภาค 11</p>' +
          '<div class="row-wrap">' +
            '<button type="button" class="btn btn-white" style="color:#ea580c;" data-go="register">📝 ระบบสมัครแข่งขัน</button>' +
            '<button type="button" class="btn" style="background:rgba(255,255,255,0.18);color:#fff;border-color:rgba(255,255,255,0.35);" data-go="competitions">📋 ดูรายการแข่งขัน (10 รายการ)</button>' +
            '<button type="button" class="btn" style="background:rgba(15,23,42,0.3);color:#fff;" data-go="results">🏆 ประกาศผลคะแนน</button>' +
          '</div>' +
        '</div>';

    const shortcuts = getMenuItems().filter(function (m) { return m.id !== 'home'; }).map(function (m) {
      const badge = m.statusMeta ? '<span class="status-pill ' + (m.statusMeta.isOpen ? 'open' : 'closed') + '">● ' + esc(m.statusMeta.label) + '</span>' : '';
      return '<button type="button" class="shortcut-btn" data-go="' + esc(m.id) + '">' +
        '<div style="display:flex;align-items:center;gap:12px;min-width:0;">' +
          '<span style="width:40px;height:40px;border-radius:12px;background:#fef3c7;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">' + m.icon + '</span>' +
          '<span style="font-weight:700;font-size:13.5px;color:#334155;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">' + esc(m.baseLabel) + '</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">' + badge + '<span style="color:#94a3b8;">›</span></div>' +
      '</button>';
    }).join('');

    main.innerHTML =
      '<div class="stack">' +
        heroHtml +
        '<div class="grid-4">' +
          '<div class="kpi-card"><div style="font-size:12px;font-weight:700;color:#64748b;">รายการแข่งขันทั้งหมด</div><div class="kpi-val">10 รายการ</div><div style="font-size:12px;color:#64748b;">ครอบคลุมเดี่ยวและทีม</div></div>' +
          '<div class="kpi-card"><div style="font-size:12px;font-weight:700;color:#64748b;">สถานศึกษาที่เข้าร่วม</div><div class="kpi-val">' + state.schools.length + ' โรงเรียน</div><div style="font-size:12px;color:#64748b;">ลงทะเบียนแล้ว ' + totalTeams + ' ทีม/ชุด</div></div>' +
          '<div class="kpi-card"><div style="font-size:12px;font-weight:700;color:#64748b;">ผู้เข้าแข่งขันรวม</div><div class="kpi-val">' + totalStudents + ' คน</div><div style="font-size:12px;color:#64748b;">กรรมการตัดสิน ' + state.judges.length + ' ท่าน</div></div>' +
          '<div class="kpi-card"><div style="font-size:12px;font-weight:700;color:#64748b;">สถานะรับสมัคร</div><div class="kpi-val">' + (state.registrationOpen ? 'เปิดรับสมัคร' : 'ปิดรับสมัคร') + '</div><div style="font-size:12px;color:#64748b;">อนุมัติผลแล้ว ' + approvedCount + ' ชุด</div></div>' +
        '</div>' +
        '<div class="card">' +
          '<h2 style="margin:0 0 16px;font-size:18px;font-weight:800;">✨ ทางลัดเข้าใช้งานระบบ</h2>' +
          '<div class="grid-3">' + shortcuts + '</div>' +
        '</div>' +
      '</div>';

    main.querySelectorAll('[data-go]').forEach(function (el) {
      el.onclick = function () { selectMenu(el.getAttribute('data-go')); };
    });
  }

  function renderRegister(main) {
    const role = state.authSession.role;
    if (role !== 'admin' && role !== 'manager' && role !== 'school') {
      main.innerHTML = '<div class="card" style="text-align:center;padding:40px;"><div style="font-size:32px;">🔒</div><h3>กรุณาเข้าสู่ระบบโรงเรียน ผู้จัดการแข่งขัน หรือผู้ดูแลระบบเพื่อลงทะเบียนแข่งขัน</h3><button type="button" class="btn btn-primary" id="btnNeedLoginReg">เข้าสู่ระบบโรงเรียน</button></div>';
      document.getElementById('btnNeedLoginReg').onclick = function () { selectMenu('login-school'); };
      return;
    }

    const f = state.regForm;
    const comp = getComp(f.competitionId) || state.competitions[0];
    const targetSchoolId = role === 'school' ? state.authSession.schoolId : (f.schoolId || (state.schools[0] ? state.schools[0].id : ''));
    f.schoolId = targetSchoolId;
    const myRegs = state.registrations.filter(function (r) { return r.schoolId === targetSchoolId; });

    const studentSlotsHtml = f.students.map(function (st, idx) {
      const thumb = safeImg(st.photoUrl);
      return '<div class="card-compact stack-sm" style="background:#f8fafc;">' +
        '<div class="row-between" style="gap:8px;">' +
          '<input type="text" class="input stu-name" data-idx="' + idx + '" value="' + esc(st.name) + '" placeholder="ชื่อ-นามสกุล ผู้เข้าแข่งขันคนที่ ' + (idx + 1) + '" required />' +
          (f.students.length > 1 ? '<button type="button" class="btn btn-rose btn-xs stu-del" data-idx="' + idx + '">ลบ</button>' : '') +
        '</div>' +
        '<div class="row-between" style="font-size:12px;gap:8px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            (thumb ? '<img src="' + thumb + '" alt="รูปนักเรียน" style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #cbd5e1;" />' : '') +
            '<label style="cursor:pointer;color:#047857;font-weight:700;">📷 ' + (thumb ? 'เปลี่ยนรูปถ่ายนักเรียน' : 'อัปโหลดรูปถ่ายนักเรียน') +
              '<input type="file" accept="image/*" class="hidden stu-photo" data-idx="' + idx + '" />' +
            '</label>' +
          '</div>' +
          (thumb ? '<button type="button" class="btn btn-rose btn-xs stu-photo-clear" data-idx="' + idx + '">ลบรูป</button>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    const coachSlotsHtml = f.coaches.map(function (c, idx) {
      const cThumb = safeImg(c.photoUrl);
      return '<div class="card-compact stack-sm" style="background:#f8fafc;">' +
        '<div class="row-between" style="gap:8px;">' +
          '<input type="text" class="input coach-name" data-idx="' + idx + '" value="' + esc(c.name) + '" placeholder="ชื่อ-นามสกุล ครูผู้ฝึกสอนคนที่ ' + (idx + 1) + '" required />' +
          (f.coaches.length > 1 ? '<button type="button" class="btn btn-rose btn-xs coach-del" data-idx="' + idx + '">ลบ</button>' : '') +
        '</div>' +
        '<div class="row-between" style="font-size:12px;gap:8px;">' +
          '<div style="display:flex;align-items:center;gap:8px;">' +
            (cThumb ? '<img src="' + cThumb + '" alt="รูปครู" style="width:40px;height:40px;border-radius:8px;object-fit:cover;border:1px solid #cbd5e1;" />' : '') +
            '<label style="cursor:pointer;color:#047857;font-weight:700;">📷 ' + (cThumb ? 'เปลี่ยนรูปถ่ายครู' : 'อัปโหลดรูปถ่ายครู') +
              '<input type="file" accept="image/*" class="hidden coach-photo" data-idx="' + idx + '" />' +
            '</label>' +
          '</div>' +
          (cThumb ? '<button type="button" class="btn btn-rose btn-xs coach-photo-clear" data-idx="' + idx + '">ลบรูป</button>' : '') +
        '</div>' +
      '</div>';
    }).join('');

    const myRegsRows = myRegs.map(function (r) {
      const c = getComp(r.competitionId);
      const stu = (r.students || []).map(function (s) { return s.name; }).join(', ');
      return '<tr>' +
        '<td><strong>' + esc(c ? c.name : '-') + '</strong><div style="font-size:12px;color:#64748b;">' + esc(r.level) + '</div></td>' +
        '<td>' + esc(stu) + '</td>' +
        '<td style="white-space:nowrap;">' +
          '<button type="button" class="btn btn-outline btn-xs reg-edit" data-id="' + esc(r.id) + '">✏ แก้ไข</button> ' +
          '<button type="button" class="btn btn-rose btn-xs reg-del" data-id="' + esc(r.id) + '">ยกเลิกการลงทะเบียน</button>' +
        '</td>' +
      '</tr>';
    }).join('');

    main.innerHTML =
      '<div class="stack">' +
        '<div class="card">' +
          '<div class="row-between" style="margin-bottom:16px;">' +
            '<div><h2 style="margin:0;">📝 ' + (f.editingId ? 'แก้ไขข้อมูลการสมัครแข่งขัน' : 'ลงทะเบียนสมัครเข้าร่วมการแข่งขัน') + '</h2>' +
            '<p style="margin:4px 0 0;font-size:13px;color:#64748b;">กรอกข้อมูลผู้เข้าแข่งขันและครูผู้ฝึกสอนให้ครบถ้วน</p></div>' +
            (f.editingId ? '<button type="button" class="btn btn-outline btn-sm" id="btnCancelRegEdit">ยกเลิกแก้ไข</button>' : '') +
          '</div>' +
          '<form id="regFormEl" class="stack">' +
            '<div class="grid-2">' +
              ((role === 'admin' || role === 'manager')
                ? '<div style="grid-column:1 / -1;"><label class="field-label">เลือกโรงเรียน</label><select class="select" id="regSchoolSel">' +
                    state.schools.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === targetSchoolId ? ' selected' : '') + '>[' + esc(s.schoolCode) + '] ' + esc(s.name) + '</option>'; }).join('') +
                  '</select></div>'
                : '') +
              '<div><label class="field-label">รายการแข่งขัน *</label><select class="select" id="regCompSel">' +
                state.competitions.map(function (c) { return '<option value="' + esc(c.id) + '"' + (c.id === f.competitionId ? ' selected' : '') + '>' + esc(c.name) + ' (' + esc(c.type) + ')</option>'; }).join('') +
              '</select></div>' +
              '<div><label class="field-label">ระดับชั้น *</label><select class="select" id="regLevelSel">' +
                comp.levels.map(function (l) { return '<option value="' + esc(l) + '"' + (l === f.level ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') +
              '</select></div>' +
            '</div>' +
            '<div class="stack-sm">' +
              '<div class="row-between"><label class="field-label" style="margin:0;">รายชื่อผู้เข้าแข่งขัน (' + esc(comp.type) + ') *</label>' +
                (f.students.length < comp.teamSize ? '<button type="button" class="btn btn-amber btn-xs" id="btnAddStudent">+ เพิ่มผู้เข้าแข่งขัน</button>' : '') +
              '</div>' +
              '<div class="grid-2">' + studentSlotsHtml + '</div>' +
            '</div>' +
            '<div class="stack-sm">' +
              '<div class="row-between"><label class="field-label" style="margin:0;">รายชื่อครูผู้ฝึกสอน (สูงสุด 3 ท่าน) *</label>' +
                (f.coaches.length < 3 ? '<button type="button" class="btn btn-primary btn-xs" id="btnAddCoach">+ เพิ่มครูผู้ฝึกสอน</button>' : '') +
              '</div>' +
              '<div class="grid-2">' + coachSlotsHtml + '</div>' +
            '</div>' +
            (comp.requiresSongs
              ? '<div class="grid-2" style="background:#f0f9ff;padding:14px;border-radius:14px;border:1px solid #bae6fd;">' +
                  '<div><label class="field-label">เพลงรอบคัดเลือก *</label><input type="text" class="input" id="regQSong" value="' + esc(f.qualifyingSong) + '" required placeholder="ระบุชื่อเพลงรอบคัดเลือก" /></div>' +
                  '<div><label class="field-label">เพลงรอบตัดสิน *</label><input type="text" class="input" id="regFSong" value="' + esc(f.finalSong) + '" required placeholder="ระบุชื่อเพลงรอบตัดสิน" /></div>' +
                '</div>'
              : '') +
            '<div class="row-wrap"><button type="submit" class="btn btn-primary">✓ ' + (f.editingId ? 'บันทึกการแก้ไข' : 'ยืนยันการสมัครแข่งขัน') + '</button></div>' +
          '</form>' +
        '</div>' +
        '<div class="card">' +
          '<h3 style="margin:0 0 12px;">📋 รายการที่สมัครแล้ว (' + myRegs.length + ' รายการ)</h3>' +
          '<div class="table-wrap"><table class="data-table"><thead><tr><th>กิจกรรม / ระดับชั้น</th><th>ผู้เข้าแข่งขัน</th><th>จัดการ</th></tr></thead><tbody>' +
            (myRegsRows || '<tr><td colspan="3" style="text-align:center;color:#94a3b8;padding:24px;">ยังไม่มีรายการสมัครแข่งขัน</td></tr>') +
          '</tbody></table></div>' +
        '</div>' +
      '</div>';

    if (document.getElementById('btnCancelRegEdit')) {
      document.getElementById('btnCancelRegEdit').onclick = function () { resetRegForm('comp-1'); renderAll(); };
    }
    if (document.getElementById('regSchoolSel')) {
      document.getElementById('regSchoolSel').onchange = function (e) { f.schoolId = e.target.value; renderAll(); };
    }
    document.getElementById('regCompSel').onchange = function (e) {
      const nextComp = getComp(e.target.value) || state.competitions[0];
      f.competitionId = nextComp.id;
      f.level = nextComp.levels[0] || '';
      if (f.students.length > nextComp.teamSize) f.students = f.students.slice(0, nextComp.teamSize);
      renderAll();
    };
    document.getElementById('regLevelSel').onchange = function (e) { f.level = e.target.value; };
    if (document.getElementById('btnAddStudent')) {
      document.getElementById('btnAddStudent').onclick = function () {
        if (f.students.length < comp.teamSize) { f.students.push({ name: '', photoUrl: '' }); renderAll(); }
      };
    }
    if (document.getElementById('btnAddCoach')) {
      document.getElementById('btnAddCoach').onclick = function () {
        if (f.coaches.length < 3) { f.coaches.push({ name: '', photoUrl: '' }); renderAll(); }
      };
    }
    main.querySelectorAll('.stu-name').forEach(function (inp) {
      inp.oninput = function () { f.students[Number(inp.getAttribute('data-idx'))].name = inp.value; };
    });
    main.querySelectorAll('.stu-del').forEach(function (btn) {
      btn.onclick = function () { f.students.splice(Number(btn.getAttribute('data-idx')), 1); renderAll(); };
    });
    main.querySelectorAll('.stu-photo').forEach(function (inp) {
      inp.onchange = async function () {
        const file = inp.files && inp.files[0];
        if (!file) return;
        try {
          const uploadedUrl = await uploadImageFile(file, 'students', 600, 0.85);
          f.students[Number(inp.getAttribute('data-idx'))].photoUrl = uploadedUrl;
          showToast('อัปโหลดรูปถ่ายนักเรียนลงเซิร์ฟเวอร์เรียบร้อยแล้ว');
          renderAll();
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    });
    main.querySelectorAll('.stu-photo-clear').forEach(function (btn) {
      btn.onclick = function () { f.students[Number(btn.getAttribute('data-idx'))].photoUrl = ''; renderAll(); };
    });
    main.querySelectorAll('.coach-name').forEach(function (inp) {
      inp.oninput = function () { f.coaches[Number(inp.getAttribute('data-idx'))].name = inp.value; };
    });
    main.querySelectorAll('.coach-del').forEach(function (btn) {
      btn.onclick = function () { f.coaches.splice(Number(btn.getAttribute('data-idx')), 1); renderAll(); };
    });
    main.querySelectorAll('.coach-photo').forEach(function (inp) {
      inp.onchange = async function () {
        const file = inp.files && inp.files[0];
        if (!file) return;
        try {
          const uploadedUrl = await uploadImageFile(file, 'coaches', 600, 0.85);
          f.coaches[Number(inp.getAttribute('data-idx'))].photoUrl = uploadedUrl;
          showToast('อัปโหลดรูปถ่ายครูผู้ฝึกสอนลงเซิร์ฟเวอร์เรียบร้อยแล้ว');
          renderAll();
        } catch (err) {
          showToast(err.message, 'error');
        }
      };
    });
    main.querySelectorAll('.coach-photo-clear').forEach(function (btn) {
      btn.onclick = function () { f.coaches[Number(btn.getAttribute('data-idx'))].photoUrl = ''; renderAll(); };
    });
    if (document.getElementById('regQSong')) {
      document.getElementById('regQSong').oninput = function (e) { f.qualifyingSong = e.target.value; };
      document.getElementById('regFSong').oninput = function (e) { f.finalSong = e.target.value; };
    }

    document.getElementById('regFormEl').onsubmit = async function (e) {
      e.preventDefault();
      try {
        const res = await apiCall('save_registration', {
          id: f.editingId,
          schoolId: f.schoolId,
          competitionId: f.competitionId,
          level: f.level,
          students: f.students,
          coaches: f.coaches,
          qualifyingSong: f.qualifyingSong,
          finalSong: f.finalSong,
        });
        resetRegForm(f.competitionId);
        showToast(res.message);
        renderAll();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };

    main.querySelectorAll('.reg-edit').forEach(function (btn) {
      btn.onclick = function () {
        const r = state.registrations.find(function (x) { return x.id === btn.getAttribute('data-id'); });
        if (!r) return;
        state.regForm = {
          editingId: r.id,
          schoolId: r.schoolId,
          competitionId: r.competitionId,
          level: r.level,
          students: (r.students || []).map(function (s) { return { name: s.name || '', photoUrl: s.photoUrl || '' }; }),
          coaches: (r.coaches || []).map(function (c) { return typeof c === 'string' ? { name: c, photoUrl: '' } : { name: c.name || '', photoUrl: c.photoUrl || '' }; }),
          qualifyingSong: r.qualifyingSong || '',
          finalSong: r.finalSong || '',
        };
        window.scrollTo({ top: 0, behavior: 'smooth' });
        renderAll();
      };
    });

    main.querySelectorAll('.reg-del').forEach(function (btn) {
      btn.onclick = function () {
        const regId = btn.getAttribute('data-id');
        openConfirmModal('ยืนยันยกเลิกการลงทะเบียน', 'ต้องการยกเลิกการลงทะเบียนรายการแข่งขันนี้ใช่หรือไม่? (คะแนนที่เกี่ยวข้องจะถูกลบด้วย)', async function () {
          try {
            const res = await apiCall('delete_registration', { id: regId });
            showToast(res.message);
            renderAll();
          } catch (err) {
            showToast(err.message, 'error');
          }
        });
      };
    });
  }

  function renderCompetitions(main) {
    const cards = state.competitions.map(function (c, idx) {
      const regCount = state.registrations.filter(function (r) { return r.competitionId === c.id; }).length;
      const lvlTags = c.levels.map(function (l) { return '<span class="badge badge-slate">' + esc(l) + '</span>'; }).join(' ');
      return '<div class="card-compact stack-sm">' +
        '<div class="row-between">' +
          '<span class="badge badge-amber">รายการที่ ' + (idx + 1) + '</span>' +
          '<span class="badge badge-emerald">' + esc(c.type) + '</span>' +
        '</div>' +
        '<h3 style="margin:0;font-size:16px;">' + esc(c.name) + '</h3>' +
        '<div class="row-wrap">' + lvlTags + '</div>' +
        '<div style="font-size:12.5px;color:#64748b;">สมัครแล้วทั้งหมด <strong>' + regCount + '</strong> ทีม/ชุด</div>' +
      '</div>';
    }).join('');
    main.innerHTML = '<div class="stack"><div class="card"><h2 style="margin:0;">📋 รายการแข่งขันทั้งหมด 10 รายการ</h2><p style="margin:4px 0 0;color:#64748b;font-size:13.5px;">' + esc(state.eventMeta.titleTh) + '</p></div><div class="grid-2">' + cards + '</div></div>';
  }

  function renderSchedule(main) {
    const isAdmin = state.authSession.role === 'admin';
    const blocks = state.competitions
      .filter(function (c) { return state.selectedCompFilter === 'all' || c.id === state.selectedCompFilter; })
      .map(function (c) {
        const levels = state.selectedLevelFilter === 'ทั้งหมด' ? c.levels : c.levels.filter(function (l) { return l === state.selectedLevelFilter; });
        if (levels.length === 0) return '';
        const rows = levels.map(function (lvl) {
          const key = c.id + '__' + lvl;
          const item = state.schedules[key] || { venue: '-', dateLabel: state.eventMeta.dateTh, timeRange: '-', notes: '-' };
          if (isAdmin && state.editingScheduleKey === key) {
            return '<tr style="background:#fffbeb;">' +
              '<td><strong>' + esc(lvl) + '</strong></td>' +
              '<td><input type="text" class="input" id="schVenue" value="' + esc(item.venue) + '" /></td>' +
              '<td><input type="text" class="input" id="schDate" value="' + esc(item.dateLabel) + '" /></td>' +
              '<td><input type="text" class="input" id="schTime" value="' + esc(item.timeRange) + '" /></td>' +
              '<td><input type="text" class="input" id="schNotes" value="' + esc(item.notes || '') + '" /></td>' +
              '<td style="white-space:nowrap;"><button type="button" class="btn btn-primary btn-xs sch-save" data-key="' + esc(key) + '">บันทึก</button> <button type="button" class="btn btn-outline btn-xs sch-cancel">ยกเลิก</button></td>' +
            '</tr>';
          }
          return '<tr>' +
            '<td><strong>' + esc(lvl) + '</strong></td>' +
            '<td>' + esc(item.venue) + '</td>' +
            '<td>' + esc(item.dateLabel) + '</td>' +
            '<td>' + esc(item.timeRange) + '</td>' +
            '<td>' + esc(item.notes || '-') + '</td>' +
            (isAdmin ? '<td><button type="button" class="btn btn-outline btn-xs sch-edit" data-key="' + esc(key) + '">แก้ไข</button></td>' : '') +
          '</tr>';
        }).join('');
        return '<div class="card stack-sm"><h3 style="margin:0;">' + esc(c.name) + ' <span class="badge badge-amber">' + esc(c.type) + '</span></h3><div class="table-wrap"><table class="data-table"><thead><tr><th>ระดับชั้น</th><th>สถานที่</th><th>วันที่</th><th>เวลา</th><th>หมายเหตุ</th>' + (isAdmin ? '<th>จัดการ</th>' : '') + '</tr></thead><tbody>' + rows + '</tbody></table></div></div>';
      }).join('');

    main.innerHTML =
      '<div class="stack">' +
        '<div class="card row-between">' +
          '<div><h2 style="margin:0;">📅 ตารางการแข่งขันและสถานที่แข่งขัน</h2></div>' +
          '<div class="row-wrap">' +
            '<select class="select" style="width:auto;" id="schFilterComp"><option value="all">ทุกกิจกรรม</option>' + state.competitions.map(function (c) { return '<option value="' + esc(c.id) + '"' + (state.selectedCompFilter === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
            '<button type="button" class="btn btn-primary btn-sm" id="btnPrintSchedule">🖨 พิมพ์ตารางแข่งขัน</button>' +
          '</div>' +
        '</div>' +
        blocks +
      '</div>';

    document.getElementById('schFilterComp').onchange = function (e) { state.selectedCompFilter = e.target.value; renderAll(); };
    document.getElementById('btnPrintSchedule').onclick = function () { printScheduleReport(state.selectedCompFilter, state.selectedLevelFilter); };
    main.querySelectorAll('.sch-edit').forEach(function (btn) {
      btn.onclick = function () { state.editingScheduleKey = btn.getAttribute('data-key'); renderAll(); };
    });
    main.querySelectorAll('.sch-cancel').forEach(function (btn) {
      btn.onclick = function () { state.editingScheduleKey = null; renderAll(); };
    });
    main.querySelectorAll('.sch-save').forEach(function (btn) {
      btn.onclick = async function () {
        try {
          const res = await apiCall('save_schedule', {
            key: btn.getAttribute('data-key'),
            venue: document.getElementById('schVenue').value,
            dateLabel: document.getElementById('schDate').value,
            timeRange: document.getElementById('schTime').value,
            notes: document.getElementById('schNotes').value,
          });
          state.editingScheduleKey = null;
          showToast(res.message);
          renderAll();
        } catch (err) { showToast(err.message, 'error'); }
      };
    });
  }

  function renderBySchool(main) {
    const isAdmin = state.authSession.role === 'admin';
    const isSchool = state.authSession.role === 'school';
    if (!isAdmin && !isSchool) { main.innerHTML = '<div class="card">กรุณาเข้าสู่ระบบ</div>'; return; }

    const targetSchools = isSchool
      ? state.schools.filter(function (s) { return s.id === state.authSession.schoolId; })
      : (state.selectedSchoolFilter === 'all' ? state.schools : state.schools.filter(function (s) { return s.id === state.selectedSchoolFilter; }));

    const canModify = isAdmin || (isSchool && state.registrationOpen);
    const cards = targetSchools.map(function (sch) {
      const schRegs = state.registrations.filter(function (r) { return r.schoolId === sch.id; });
      const rows = schRegs.map(function (r) {
        const comp = getComp(r.competitionId);
        return '<tr>' +
          '<td><strong>' + esc(comp ? comp.name : '-') + '</strong><div style="font-size:12px;color:#64748b;">' + esc(r.level) + '</div></td>' +
          '<td>' + esc((r.students || []).map(function (s) { return s.name; }).join(', ')) + '</td>' +
          '<td>' + esc((r.coaches || []).map(function (c) { return typeof c === 'string' ? c : c.name; }).join(', ')) + '</td>' +
          (canModify
            ? '<td style="white-space:nowrap;"><button type="button" class="btn btn-outline btn-xs bysch-edit" data-id="' + esc(r.id) + '">✏ แก้ไข</button> <button type="button" class="btn btn-rose btn-xs bysch-del" data-id="' + esc(r.id) + '">ยกเลิกการลงทะเบียน</button></td>'
            : '') +
        '</tr>';
      }).join('');
      return '<div class="card stack-sm">' +
        '<div class="row-between">' +
          '<div><h3 style="margin:0;">🏫 ' + esc(sch.name) + '</h3><div style="font-size:12.5px;color:#64748b;">รหัส: ' + esc(sch.schoolCode) + ' • ผอ.: ' + esc(sch.director) + ' • สมัคร ' + schRegs.length + ' รายการ</div></div>' +
          '<button type="button" class="btn btn-primary btn-sm print-sch-btn" data-id="' + esc(sch.id) + '">🖨 พิมพ์รายละเอียดการแข่งขัน</button>' +
        '</div>' +
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>กิจกรรม / ระดับชั้น</th><th>ผู้เข้าแข่งขัน</th><th>ครูผู้ฝึกสอน</th>' + (canModify ? '<th>จัดการ</th>' : '') + '</tr></thead><tbody>' +
          (rows || '<tr><td colspan="' + (canModify ? 4 : 3) + '" style="text-align:center;color:#94a3b8;padding:18px;">ยังไม่มีรายการสมัครแข่งขัน</td></tr>') +
        '</tbody></table></div>' +
      '</div>';
    }).join('');

    main.innerHTML =
      '<div class="stack">' +
        '<div class="card row-between">' +
          '<div><h2 style="margin:0;">🏫 รายชื่อผู้เข้าแข่งขันแยกตามโรงเรียน</h2></div>' +
          '<div class="row-wrap">' +
            (isAdmin ? '<select class="select" style="width:auto;" id="bySchFilter"><option value="all">ทุกโรงเรียน</option>' + state.schools.map(function (s) { return '<option value="' + esc(s.id) + '"' + (state.selectedSchoolFilter === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>' : '') +
            '<button type="button" class="btn btn-amber btn-sm" id="btnPrintAllSch">🖨 พิมพ์รายละเอียดทั้งหมด</button>' +
          '</div>' +
        '</div>' +
        cards +
      '</div>';

    if (document.getElementById('bySchFilter')) {
      document.getElementById('bySchFilter').onchange = function (e) { state.selectedSchoolFilter = e.target.value; renderAll(); };
    }
    document.getElementById('btnPrintAllSch').onclick = function () { printBySchoolDetails(); };
    main.querySelectorAll('.print-sch-btn').forEach(function (btn) {
      btn.onclick = function () { printBySchoolDetails(btn.getAttribute('data-id')); };
    });
    main.querySelectorAll('.bysch-edit').forEach(function (btn) {
      btn.onclick = function () {
        const r = state.registrations.find(function (x) { return x.id === btn.getAttribute('data-id'); });
        if (!r) return;
        state.regForm = {
          editingId: r.id,
          schoolId: r.schoolId,
          competitionId: r.competitionId,
          level: r.level,
          students: (r.students || []).map(function (s) { return { name: s.name || '', photoUrl: s.photoUrl || '' }; }),
          coaches: (r.coaches || []).map(function (c) { return typeof c === 'string' ? { name: c, photoUrl: '' } : { name: c.name || '', photoUrl: c.photoUrl || '' }; }),
          qualifyingSong: r.qualifyingSong || '',
          finalSong: r.finalSong || '',
        };
        state.activeMenu = 'register';
        renderAll();
      };
    });
    main.querySelectorAll('.bysch-del').forEach(function (btn) {
      btn.onclick = function () {
        const regId = btn.getAttribute('data-id');
        openConfirmModal('ยืนยันยกเลิกการลงทะเบียน', 'ต้องการยกเลิกการลงทะเบียนแข่งขันรายการนี้ใช่หรือไม่?', async function () {
          try {
            const res = await apiCall('delete_registration', { id: regId });
            showToast(res.message);
            renderAll();
          } catch (err) { showToast(err.message, 'error'); }
        });
      };
    });
  }

  function renderByActivity(main) {
    const isAdmin = state.authSession.role === 'admin';
    const isSchool = state.authSession.role === 'school';
    if (!isAdmin && !isSchool) { main.innerHTML = '<div class="card">กรุณาเข้าสู่ระบบ</div>'; return; }

    // School sees ONLY activities & levels that the school has registered for
    const blocks = [];
    state.competitions.forEach(function (comp) {
      if (state.selectedCompFilter !== 'all' && comp.id !== state.selectedCompFilter) return;
      comp.levels.forEach(function (lvl) {
        if (state.selectedLevelFilter !== 'ทั้งหมด' && lvl !== state.selectedLevelFilter) return;
        const regs = state.registrations.filter(function (r) {
          if (r.competitionId !== comp.id || r.level !== lvl) return false;
          if (isSchool) return r.schoolId === state.authSession.schoolId;
          return state.selectedSchoolFilter === 'all' || r.schoolId === state.selectedSchoolFilter;
        });
        if (regs.length === 0) return;
        blocks.push(
          '<div class="card-compact stack-sm">' +
            '<div class="row-between">' +
              '<div><span class="badge badge-amber">' + esc(lvl) + '</span><h3 style="margin:6px 0 0;font-size:16px;">' + esc(comp.name) + '</h3><div style="font-size:12.5px;color:#64748b;">จำนวนทีมที่สมัคร: <strong>' + regs.length + '</strong> ทีม</div></div>' +
              '<div class="row-wrap">' +
                '<button type="button" class="btn btn-outline btn-sm act-view" data-comp="' + esc(comp.id) + '" data-lvl="' + esc(lvl) + '">👁 ดูรายละเอียด</button>' +
                '<button type="button" class="btn btn-primary btn-sm act-print" data-comp="' + esc(comp.id) + '" data-lvl="' + esc(lvl) + '">🖨 พิมพ์</button>' +
              '</div>' +
            '</div>' +
          '</div>'
        );
      });
    });

    const visibleComps = isSchool
      ? state.competitions.filter(function (c) { return state.registrations.some(function (r) { return r.schoolId === state.authSession.schoolId && r.competitionId === c.id; }); })
      : state.competitions;

    main.innerHTML =
      '<div class="stack">' +
        '<div class="card row-between">' +
          '<div><h2 style="margin:0;">🗂 รายชื่อผู้เข้าแข่งขันแยกตามกิจกรรม</h2>' + (isSchool ? '<p style="margin:4px 0 0;font-size:13px;color:#64748b;">แสดงเฉพาะกิจกรรมและระดับชั้นที่โรงเรียนของท่านสมัครเข้าร่วม</p>' : '') + '</div>' +
          '<div class="row-wrap">' +
            '<select class="select" style="width:auto;" id="actCompFilter"><option value="all">ทุกกิจกรรม</option>' + visibleComps.map(function (c) { return '<option value="' + esc(c.id) + '"' + (state.selectedCompFilter === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
            '<button type="button" class="btn btn-amber btn-sm" id="btnPrintAllAct">🖨 พิมพ์รายละเอียดทั้งหมด</button>' +
          '</div>' +
        '</div>' +
        (blocks.length > 0 ? '<div class="grid-2">' + blocks.join('') + '</div>' : '<div class="card" style="text-align:center;color:#94a3b8;">ไม่พบรายการสมัครแข่งขันตามเงื่อนไขที่เลือก</div>') +
      '</div>';

    document.getElementById('actCompFilter').onchange = function (e) { state.selectedCompFilter = e.target.value; renderAll(); };
    document.getElementById('btnPrintAllAct').onclick = function () { printByActivityDetails(state.selectedCompFilter, state.selectedLevelFilter); };
    main.querySelectorAll('.act-print').forEach(function (btn) {
      btn.onclick = function () { printByActivityDetails(btn.getAttribute('data-comp'), btn.getAttribute('data-lvl')); };
    });
    main.querySelectorAll('.act-view').forEach(function (btn) {
      btn.onclick = function () {
        const compId = btn.getAttribute('data-comp');
        const lvl = btn.getAttribute('data-lvl');
        const comp = getComp(compId);
        const regs = state.registrations.filter(function (r) {
          if (r.competitionId !== compId || r.level !== lvl) return false;
          return isSchool ? r.schoolId === state.authSession.schoolId : true;
        });
        const mc = document.getElementById('modalContainer');
        mc.innerHTML =
          '<div class="modal-backdrop" id="actDetailBackdrop"><div class="modal-box"><div class="modal-header"><div><strong>' + esc(comp ? comp.name : '') + '</strong><div style="font-size:12px;">' + esc(lvl) + '</div></div><button type="button" class="btn btn-rose-solid btn-sm" id="btnCloseActModal">ปิด</button></div><div class="modal-body"><div class="table-wrap"><table class="data-table"><thead><tr><th>โรงเรียน</th><th>ผู้เข้าแข่งขัน</th><th>ครูผู้ฝึกสอน</th></tr></thead><tbody>' +
            regs.map(function (r) {
              const sch = getSchool(r.schoolId);
              return '<tr><td><strong>' + esc(sch ? sch.name : '-') + '</strong></td><td>' + esc((r.students || []).map(function (s) { return s.name; }).join(', ')) + '</td><td>' + esc((r.coaches || []).map(function (c) { return typeof c === 'string' ? c : c.name; }).join(', ')) + '</td></tr>';
            }).join('') +
          '</tbody></table></div></div></div></div>';
        document.getElementById('actDetailBackdrop').onclick = function (e) { if (e.target.id === 'actDetailBackdrop') mc.innerHTML = ''; };
        document.getElementById('btnCloseActModal').onclick = function () { mc.innerHTML = ''; };
      };
    });
  }

  function renderCardsPage(main, kind) {
    const isAdminOrManager = state.authSession.role === 'admin' || state.authSession.role === 'manager';
    const isSchool = state.authSession.role === 'school';
    const isJudge = state.authSession.role === 'judge';

    if (kind === 'judge') {
      const targetJudges = isAdminOrManager ? state.judges : (isJudge ? state.judges.filter(function (j) { return j.id === state.authSession.judgeId; }) : []);
      main.innerHTML =
        '<div class="stack">' +
          '<div class="card row-between">' +
            '<div><h2 style="margin:0;">🪪 พิมพ์บัตรกรรมการตัดสิน (14.85 x 10.5 ซม.)</h2></div>' +
            '<div class="row-wrap">' +
              '<select class="select" style="width:auto;" id="cardLayoutSel"><option value="4-up"' + (state.cardPrintLayout === '4-up' ? ' selected' : '') + '>4 ใบ / แผ่น A4</option><option value="1-up"' + (state.cardPrintLayout === '1-up' ? ' selected' : '') + '>1 ใบ / หน้า</option></select>' +
              '<button type="button" class="btn btn-sky" id="btnPrintAllJdgCards">🖨 พิมพ์บัตรกรรมการ (' + targetJudges.length + ' ท่าน)</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      document.getElementById('cardLayoutSel').onchange = function (e) { state.cardPrintLayout = e.target.value; };
      document.getElementById('btnPrintAllJdgCards').onclick = function () { printJudgeCards(targetJudges, state.cardPrintLayout); };
      return;
    }

    const schId = isSchool ? state.authSession.schoolId : (state.selectedSchoolFilter || 'all');
    main.innerHTML =
      '<div class="stack">' +
        '<div class="card row-between">' +
          '<div><h2 style="margin:0;">🪪 ' + (kind === 'student' ? 'พิมพ์บัตรประจำตัวผู้เข้าแข่งขัน' : 'พิมพ์บัตรประจำตัวครูผู้ฝึกสอน') + '</h2><p style="margin:4px 0 0;font-size:13px;color:#64748b;">ขนาดบัตร 14.85 x 10.5 ซม. (4 ต่อ 1 หรือ 1 ต่อ 1)</p></div>' +
          '<div class="row-wrap">' +
            (isAdminOrManager ? '<select class="select" style="width:auto;" id="cardSchSel"><option value="all">ทุกโรงเรียน</option>' + state.schools.map(function (s) { return '<option value="' + esc(s.id) + '"' + (schId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>' : '') +
            '<select class="select" style="width:auto;" id="cardCompSel"><option value="all">ทุกกิจกรรม</option>' + state.competitions.map(function (c) { return '<option value="' + esc(c.id) + '"' + (state.selectedCompFilter === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
            '<select class="select" style="width:auto;" id="cardLayoutSel"><option value="4-up"' + (state.cardPrintLayout === '4-up' ? ' selected' : '') + '>4 ใบ / แผ่น A4</option><option value="1-up"' + (state.cardPrintLayout === '1-up' ? ' selected' : '') + '>1 ใบ / หน้า</option></select>' +
            '<button type="button" class="btn btn-primary" id="btnPrintCards">🖨 พิมพ์บัตรทั้งหมด</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    if (document.getElementById('cardSchSel')) document.getElementById('cardSchSel').onchange = function (e) { state.selectedSchoolFilter = e.target.value; };
    document.getElementById('cardCompSel').onchange = function (e) { state.selectedCompFilter = e.target.value; };
    document.getElementById('cardLayoutSel').onchange = function (e) { state.cardPrintLayout = e.target.value; };
    document.getElementById('btnPrintCards').onclick = function () {
      const sVal = isSchool ? state.authSession.schoolId : (document.getElementById('cardSchSel') ? document.getElementById('cardSchSel').value : 'all');
      if (kind === 'student') printStudentCards(sVal, state.selectedCompFilter, state.cardPrintLayout);
      else printCoachCards(sVal, state.selectedCompFilter, state.cardPrintLayout);
    };
  }

  function renderJudgeCert(main) {
    const isAdminOrManager = state.authSession.role === 'admin' || state.authSession.role === 'manager';
    const isJudge = state.authSession.role === 'judge';
    const targets = isAdminOrManager ? state.judges : (isJudge ? state.judges.filter(function (j) { return j.id === state.authSession.judgeId; }) : []);
    const certs = targets.map(function (jdg, idx) {
      const comp = getComp(jdg.competitionId);
      const posText = jdg.position || 'กรรมการตัดสิน';
      const actText = comp ? comp.name : '';
      const isUnl = jdg.competitionId === 'comp-10' || jdg.level === 'ไม่จำกัดระดับ';
      const lvlText = !isUnl && jdg.level ? 'ระดับ' + jdg.level : '';
      return {
        certNumber: P.formatCertNumber('กต', idx + 1),
        line1Name: jdg.name,
        line2Position: (actText ? ('เป็น' + posText + '  การแข่งขัน' + actText) : ('เป็น' + posText)).trim(),
        line3Activity: lvlText,
        fitSingleLine: true,
      };
    });
    main.innerHTML =
      '<div class="card row-between">' +
        '<div><h2 style="margin:0;">🏅 เกียรติบัตรกรรมการตัดสิน (A4 แนวนอน)</h2><p style="margin:4px 0 0;font-size:13px;color:#64748b;">จำนวน ' + certs.length + ' ฉบับ</p></div>' +
        '<button type="button" class="btn btn-amber" id="btnPrintJudgeCert">🖨 พิมพ์เกียรติบัตรกรรมการ</button>' +
      '</div>';
    document.getElementById('btnPrintJudgeCert').onclick = function () { printCertificates(certs, 'เกียรติบัตรกรรมการตัดสิน'); };
  }

  function renderSchoolCert(main) {
    const isAdmin = state.authSession.role === 'admin';
    const isSchool = state.authSession.role === 'school';
    if (!isAdmin && !isSchool) { main.innerHTML = '<div class="card">กรุณาเข้าสู่ระบบ</div>'; return; }

    const activeSchId = isSchool ? state.authSession.schoolId : (state.selectedSchoolFilter || 'all');
    const regs = state.registrations.filter(function (r) {
      if (state.absentRegs[r.id]) return false; // Never issue certs for absent teams
      if (isSchool && r.schoolId !== state.authSession.schoolId) return false;
      if (isAdmin && activeSchId !== 'all' && r.schoolId !== activeSchId) return false;
      if (state.selectedCompFilter !== 'all' && r.competitionId !== state.selectedCompFilter) return false;
      return true;
    });

    const certRankedLookup = buildRankedEntryLookup();
    const certs = [];
    if (state.certRecipientType === 'student') {
      let seq = 1;
      regs.forEach(function (r) {
        const sch = getSchool(r.schoolId);
        const comp = getComp(r.competitionId);
        const meta = state.evalMeta[r.competitionId + '__' + r.level] || { approved: false };
        const rankedEntry = certRankedLookup[r.id];
        const medal = P.getMedalTier(rankedEntry ? rankedEntry.score : 0, Boolean(meta.approved && rankedEntry && rankedEntry.hasScore));
        (r.students || []).forEach(function (st) {
          certs.push({
            certNumber: P.formatCertNumber('นร', seq++),
            line1Name: st.name,
            line2Position: sch ? sch.name : '',
            line3Activity: medal.certText + ' กิจกรรม' + (comp ? comp.name : '') + ' ระดับ' + r.level,
            fitSingleLine: true,
          });
        });
      });
    } else if (state.certRecipientType === 'coach') {
      let seq = 1;
      regs.forEach(function (r) {
        const sch = getSchool(r.schoolId);
        const comp = getComp(r.competitionId);
        (r.coaches || []).forEach(function (c) {
          const cName = typeof c === 'string' ? c : (c.name || '');
          certs.push({
            certNumber: P.formatCertNumber('คฝ', seq++),
            line1Name: cName,
            line2Position: 'ครูผู้ฝึกสอน ' + (sch ? sch.name : ''),
            line3Activity: 'เป็นผู้ฝึกสอนนักเรียนเข้าร่วมกิจกรรม' + (comp ? comp.name : '') + ' ระดับ' + r.level,
            fitSingleLine: true,
          });
        });
      });
    } else {
      let seq = 1;
      const seenSch = {};
      regs.forEach(function (r) {
        const sch = getSchool(r.schoolId);
        if (!sch || seenSch[sch.id]) return;
        seenSch[sch.id] = true;
        certs.push({
          certNumber: P.formatCertNumber('ผอ', seq++),
          line1Name: sch.director,
          line2Position: 'ผู้อำนวยการ' + sch.name,
          line3Activity: 'ให้การสนับสนุนส่งนักเรียนเข้าร่วมแข่งขันงานวันมาฆบูชา ครั้งที่ ๑๔',
          fitSingleLine: true,
        });
      });
    }

    const visibleCertComps = isSchool
      ? state.competitions.filter(function (c) {
          return state.registrations.some(function (r) {
            return !state.absentRegs[r.id] && r.schoolId === state.authSession.schoolId && r.competitionId === c.id;
          });
        })
      : state.competitions;

    if (state.selectedCompFilter !== 'all' && !visibleCertComps.some(function (c) { return c.id === state.selectedCompFilter; })) {
      state.selectedCompFilter = 'all';
    }

    main.innerHTML =
      '<div class="stack">' +
        '<div class="card row-between">' +
          '<div><h2 style="margin:0;">🏅 เกียรติบัตรนักเรียน / ครูผู้ฝึกสอน / ผู้บริหารสถานศึกษา</h2><p style="margin:4px 0 0;font-size:13px;color:#64748b;">พบรายชื่อมีสิทธิ์ออกเกียรติบัตร ' + certs.length + ' ฉบับ</p></div>' +
          '<div class="row-wrap">' +
            '<select class="select" style="width:auto;" id="certTypeSel">' +
              '<option value="student"' + (state.certRecipientType === 'student' ? ' selected' : '') + '>เกียรติบัตรนักเรียน</option>' +
              '<option value="coach"' + (state.certRecipientType === 'coach' ? ' selected' : '') + '>เกียรติบัตรครูผู้ฝึกสอน</option>' +
              '<option value="director"' + (state.certRecipientType === 'director' ? ' selected' : '') + '>เกียรติบัตรผู้อำนวยการ</option>' +
            '</select>' +
            (isAdmin ? '<select class="select" style="width:auto;" id="certSchSel"><option value="all">ทุกโรงเรียน</option>' + state.schools.map(function (s) { return '<option value="' + esc(s.id) + '"' + (activeSchId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select>' : '') +
            '<select class="select" style="width:auto;" id="certCompSel"><option value="all">ทุกกิจกรรม</option>' + visibleCertComps.map(function (c) { return '<option value="' + esc(c.id) + '"' + (state.selectedCompFilter === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
            '<button type="button" class="btn btn-amber" id="btnPrintSchoolCert">🖨 พิมพ์เกียรติบัตร (' + certs.length + ' ฉบับ)</button>' +
          '</div>' +
        '</div>' +
      '</div>';
    document.getElementById('certTypeSel').onchange = function (e) { state.certRecipientType = e.target.value; renderAll(); };
    if (document.getElementById('certSchSel')) {
      document.getElementById('certSchSel').onchange = function (e) { state.selectedSchoolFilter = e.target.value; renderAll(); };
    }
    document.getElementById('certCompSel').onchange = function (e) { state.selectedCompFilter = e.target.value; renderAll(); };
    document.getElementById('btnPrintSchoolCert').onclick = function () { printCertificates(certs, 'เกียรติบัตรโรงเรียน'); };
  }

  function renderSchoolResults(main) {
    const isAdmin = state.authSession.role === 'admin';
    const isSchool = state.authSession.role === 'school';
    if (!isAdmin && !isSchool) { main.innerHTML = '<div class="card">เมนูนี้สำหรับโรงเรียนและผู้ดูแลระบบ</div>'; return; }

    const activeSchoolId = isSchool ? state.authSession.schoolId : (state.selectedSchoolFilter !== 'all' ? state.selectedSchoolFilter : (state.schools[0] ? state.schools[0].id : ''));
    const focusSchool = getSchool(activeSchoolId) || state.schools[0] || null;
    const myRegs = focusSchool ? state.registrations.filter(function (r) { return r.schoolId === focusSchool.id; }) : [];

    // Compute school standings for medal summary sub-tab
    const schoolRankedLookup = buildRankedEntryLookup();
    const standings = state.schools.map(function (sch) {
      let gold = 0, silver = 0, bronze = 0, part = 0, absent = 0, pending = 0, sumScore = 0, scored = 0;
      const regs = state.registrations.filter(function (r) { return r.schoolId === sch.id; });
      regs.forEach(function (reg) {
        if (state.absentRegs[reg.id]) { absent += 1; return; }
        const meta = state.evalMeta[reg.competitionId + '__' + reg.level] || { approved: false };
        if (!meta.approved) { pending += 1; return; }
        const rankedEntry = schoolRankedLookup[reg.id];
        if (!rankedEntry || !rankedEntry.hasScore) { pending += 1; return; }
        scored += 1; sumScore += rankedEntry.score;
        const m = P.getMedalTier(rankedEntry.score, true);
        if (m.label.indexOf('ทองแดง') !== -1) bronze += 1;
        else if (m.label.indexOf('ทอง') !== -1) gold += 1;
        else if (m.label.indexOf('เงิน') !== -1) silver += 1;
        else part += 1;
      });
      return { sch: sch, regCount: regs.length, gold: gold, silver: silver, bronze: bronze, part: part, absent: absent, pending: pending, total: gold + silver + bronze, avg: scored > 0 ? sumScore / scored : 0 };
    }).sort(function (a, b) {
      if (b.gold !== a.gold) return b.gold - a.gold;
      if (b.silver !== a.silver) return b.silver - a.silver;
      if (b.bronze !== a.bronze) return b.bronze - a.bronze;
      return b.avg - a.avg;
    });

    const tabBar =
      '<div class="card row-between">' +
        '<div class="tabs">' +
          '<button type="button" class="tab-btn ' + (state.schoolResultsViewTab === 'scores' ? 'active' : '') + '" id="tabSchScores">🏆 ผลคะแนนของโรงเรียน</button>' +
          '<button type="button" class="tab-btn ' + (state.schoolResultsViewTab === 'medals' ? 'active-amber' : '') + '" id="tabSchMedals">🥇 สรุปเหรียญรางวัล</button>' +
        '</div>' +
        (isAdmin && state.schools.length > 0 ? '<select class="select" style="width:auto;" id="schResSelect">' + state.schools.map(function (s) { return '<option value="' + esc(s.id) + '"' + (s.id === activeSchoolId ? ' selected' : '') + '>[' + esc(s.schoolCode) + '] ' + esc(s.name) + '</option>'; }).join('') + '</select>' : '') +
      '</div>';

    let bodyContent = '';
    if (state.schoolResultsViewTab === 'medals') {
      const focusStats = standings.find(function (x) { return focusSchool && x.sch.id === focusSchool.id; }) || { gold: 0, silver: 0, bronze: 0, part: 0, total: 0 };
      const standingRows = standings.map(function (st, idx) {
        return '<tr style="' + (focusSchool && st.sch.id === focusSchool.id ? 'background:#fffbeb;font-weight:700;' : '') + '">' +
          '<td>อันดับ ' + (idx + 1) + '</td><td>' + esc(st.sch.name) + '</td><td style="text-align:center;">' + st.gold + '</td><td style="text-align:center;">' + st.silver + '</td><td style="text-align:center;">' + st.bronze + '</td><td style="text-align:center;">' + st.part + '</td><td style="text-align:center;"><strong>' + st.total + '</strong></td>' +
        '</tr>';
      }).join('');
      bodyContent =
        '<div class="stack">' +
          '<div class="grid-4">' +
            '<div class="kpi-card" style="border-color:#fde68a;background:#fffbeb;"><div style="font-size:12px;font-weight:700;color:#92400e;">🥇 เหรียญทอง</div><div class="kpi-val" style="color:#b45309;">' + focusStats.gold + '</div></div>' +
            '<div class="kpi-card" style="border-color:#cbd5e1;background:#f8fafc;"><div style="font-size:12px;font-weight:700;color:#334155;">🥈 เหรียญเงิน</div><div class="kpi-val" style="color:#334155;">' + focusStats.silver + '</div></div>' +
            '<div class="kpi-card" style="border-color:#fed7aa;background:#fff7ed;"><div style="font-size:12px;font-weight:700;color:#9a3412;">🥉 เหรียญทองแดง</div><div class="kpi-val" style="color:#c2410c;">' + focusStats.bronze + '</div></div>' +
            '<div class="kpi-card" style="border-color:#bae6fd;background:#f0f9ff;"><div style="font-size:12px;font-weight:700;color:#075985;">🎖 เข้าร่วม</div><div class="kpi-val" style="color:#0369a1;">' + focusStats.part + '</div></div>' +
          '</div>' +
          '<div class="card stack-sm"><div class="row-between"><h3 style="margin:0;">ตารางสรุปเหรียญรางวัลรวมทุกโรงเรียน</h3><button type="button" class="btn btn-amber btn-sm" id="btnPrintMedals">🖨 พิมพ์สรุปเหรียญรางวัล</button></div><div class="table-wrap"><table class="data-table"><thead><tr><th>อันดับ</th><th>โรงเรียน</th><th style="text-align:center;">ทอง</th><th style="text-align:center;">เงิน</th><th style="text-align:center;">ทองแดง</th><th style="text-align:center;">เข้าร่วม</th><th style="text-align:center;">รวมเหรียญ</th></tr></thead><tbody>' + standingRows + '</tbody></table></div></div>' +
        '</div>';
    } else {
      const regCards = myRegs.map(function (reg) {
        const comp = getComp(reg.competitionId);
        const meta = state.evalMeta[reg.competitionId + '__' + reg.level] || { approved: false };
        const isAbsent = Boolean(state.absentRegs[reg.id]);
        const rankedEntry = schoolRankedLookup[reg.id];
        const hasScore = !isAbsent && Boolean(rankedEntry && rankedEntry.hasScore);
        const effScore = hasScore ? rankedEntry.score : 0;
        const medal = isAbsent ? { label: 'ไม่เข้าร่วมแข่งขัน', badgeCls: 'badge-rose' } : P.getMedalTier(effScore, meta.approved && hasScore);
        const rankStr = !isAbsent && meta.approved && hasScore && rankedEntry.rankNum
          ? ' <span class="badge badge-amber">' + esc(getRankAwardLabel(rankedEntry.rankNum, false, true, 'อันดับที่')) + '</span>'
          : '';
        return '<div class="card-compact row-between">' +
          '<div><span class="badge badge-slate">' + esc(reg.level) + '</span> ' + (isAbsent ? '<span class="badge badge-rose">ไม่เข้าร่วมแข่งขัน</span>' : (meta.approved ? '<span class="badge badge-emerald">อนุมัติผลแล้ว</span>' : '<span class="badge badge-amber">รออนุมัติผล</span>')) + rankStr +
          '<h3 style="margin:6px 0 4px;">' + esc(comp ? comp.name : '-') + '</h3>' +
          '<div style="font-size:13px;color:#475569;">ผู้เข้าแข่งขัน: ' + esc((reg.students || []).map(function (s) { return s.name; }).join(', ')) + '</div></div>' +
          '<div class="row-wrap"><div class="card-compact" style="min-width:110px;text-align:center;"><div style="font-size:11px;color:#64748b;">คะแนนรวม</div><strong style="font-size:18px;">' + (!isAbsent && meta.approved && hasScore ? effScore.toFixed(2) : '-') + '</strong></div><span class="badge ' + medal.badgeCls + '" style="padding:10px 16px;font-size:13px;">' + esc(medal.label) + '</span></div>' +
        '</div>';
      }).join('');
      bodyContent = '<div class="stack">' + (regCards || '<div class="card" style="text-align:center;color:#94a3b8;">โรงเรียนยังไม่มีรายการสมัครแข่งขัน</div>') + '</div>';
    }

    main.innerHTML = '<div class="stack">' + tabBar + bodyContent + '</div>';
    document.getElementById('tabSchScores').onclick = function () { state.schoolResultsViewTab = 'scores'; renderAll(); };
    document.getElementById('tabSchMedals').onclick = function () { state.schoolResultsViewTab = 'medals'; renderAll(); };
    if (document.getElementById('btnPrintMedals')) {
      document.getElementById('btnPrintMedals').onclick = function () { printSchoolMedalSummary(standings, focusSchool); };
    }
    if (document.getElementById('schResSelect')) {
      document.getElementById('schResSelect').onchange = function (e) { state.selectedSchoolFilter = e.target.value; renderAll(); };
    }
  }

  function renderResults(main) {
    const isAdmin = state.authSession.role === 'admin';
    function getFilteredResultRows() {
      const pairs = [];
      state.competitions.forEach(function (c) {
        c.levels.forEach(function (lvl) {
          const key = c.id + '__' + lvl;
          const meta = state.evalMeta[key] || { status: 'pending', approved: false };
          const regs = state.registrations.filter(function (r) { return r.competitionId === c.id && r.level === lvl; });
          const scored = regs.filter(function (r) { return !state.absentRegs[r.id] && P.calculateNormalizedScore(state.scores[r.id]).judgeCount > 0; }).length;
          if (state.resultsSearch && (c.name + ' ' + lvl).toLowerCase().indexOf(state.resultsSearch.toLowerCase()) === -1) return;
          if (state.resultsApprovalFilter === 'approved' && !meta.approved) return;
          if (state.resultsApprovalFilter === 'pending' && meta.approved) return;
          pairs.push({ comp: c, level: lvl, key: key, meta: meta, teamsCount: regs.length, scoredCount: scored });
        });
      });
      return pairs.map(function (p) {
        return '<tr>' +
          '<td><strong>' + esc(p.comp.name) + '</strong></td>' +
          '<td>' + esc(p.level) + '</td>' +
          '<td style="text-align:center;">' + p.teamsCount + '</td>' +
          '<td style="text-align:center;">' + p.scoredCount + '</td>' +
          '<td>' + (p.meta.approved ? '<span class="badge badge-emerald">อนุมัติแล้ว</span>' : '<span class="badge badge-amber">รอการอนุมัติ</span>') + '</td>' +
          '<td style="white-space:nowrap;">' +
            '<button type="button" class="btn btn-outline btn-xs res-view" data-comp="' + esc(p.comp.id) + '" data-lvl="' + esc(p.level) + '">👁 ดูผลการแข่งขัน</button> ' +
            (isAdmin ? '<button type="button" class="btn ' + (p.meta.approved ? 'btn-rose' : 'btn-primary') + ' btn-xs res-approve" data-key="' + esc(p.key) + '" data-next="' + (!p.meta.approved ? '1' : '0') + '">' + (p.meta.approved ? 'ยกเลิกอนุมัติ' : '✓ อนุมัติผล') + '</button>' : '') +
          '</td>' +
        '</tr>';
      }).join('') || '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">ไม่พบข้อมูล</td></tr>';
    }

    function bindResultRowActions() {
      main.querySelectorAll('.res-approve').forEach(function (btn) {
        btn.onclick = async function () {
          try {
            const res = await apiCall('toggle_approval', { metaKey: btn.getAttribute('data-key'), approved: btn.getAttribute('data-next') === '1' });
            showToast(res.message);
            renderAll();
          } catch (err) { showToast(err.message, 'error'); }
        };
      });
      main.querySelectorAll('.res-view').forEach(function (btn) {
        btn.onclick = function () { openResultsDetailModal(btn.getAttribute('data-comp'), btn.getAttribute('data-lvl')); };
      });
    }

    main.innerHTML =
      '<div class="stack">' +
        '<div class="card row-between">' +
          '<div><h2 style="margin:0;">🏆 ประกาศผลคะแนนการแข่งขัน</h2></div>' +
          '<div class="row-wrap">' +
            '<input type="text" class="input" style="width:220px;" id="resSearchInp" value="' + esc(state.resultsSearch) + '" placeholder="ค้นหากิจกรรม..." />' +
            '<select class="select" style="width:auto;" id="resFilterSel"><option value="all">ทั้งหมด</option><option value="approved"' + (state.resultsApprovalFilter === 'approved' ? ' selected' : '') + '>อนุมัติแล้ว</option><option value="pending"' + (state.resultsApprovalFilter === 'pending' ? ' selected' : '') + '>รออนุมัติ</option></select>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap"><table class="data-table"><thead><tr><th>รายการแข่งขัน</th><th>ระดับชั้น</th><th style="text-align:center;">ทีมที่สมัคร</th><th style="text-align:center;">ตัดสินแล้ว</th><th>สถานะ</th><th>คำสั่ง</th></tr></thead><tbody id="resTableBody">' +
          getFilteredResultRows() +
        '</tbody></table></div>' +
      '</div>';

    document.getElementById('resSearchInp').oninput = function (e) {
      state.resultsSearch = e.target.value;
      document.getElementById('resTableBody').innerHTML = getFilteredResultRows();
      bindResultRowActions();
    };
    document.getElementById('resFilterSel').onchange = function (e) { state.resultsApprovalFilter = e.target.value; renderAll(); };
    bindResultRowActions();
  }

  function openResultsDetailModal(compId, level) {
    const comp = getComp(compId);
    const meta = state.evalMeta[compId + '__' + level] || { approved: false };
    const isAdminOrManager = state.authSession.role === 'admin' || state.authSession.role === 'manager';
    const mc = document.getElementById('resultsModalContainer');

    if (!meta.approved && !isAdminOrManager) {
      showToast('ผลคะแนนรายการนี้ยังไม่ได้รับการอนุมัติจากผู้ดูแลระบบ', 'error');
      return;
    }

    const isTwoRound = isTwoRoundComp(compId);
    const list = buildCompetitionRankedList(compId, level).filter(function (x) {
      return isAdminOrManager || (!x.isAbsent && x.hasScore);
    });

    let lastGroup = '';
    const rows = list.map(function (x) {
      const sch = getSchool(x.reg.schoolId);
      const medal = x.isAbsent ? { label: 'ไม่เข้าร่วมแข่งขัน', badgeCls: 'badge-rose' } : P.getMedalTier(x.score, x.hasScore);
      let sectionRow = '';
      if (isTwoRound && x.roundGroup !== lastGroup) {
        if (x.roundGroup === 'final_top10') {
          sectionRow = '<tr style="background:#fffbeb;"><td colspan="5" style="font-weight:700;color:#92400e;">🏆 รอบตัดสิน — ผู้ผ่านเข้ารอบ 10 อันดับแรกจากรอบคัดเลือก (ลำดับที่ 1–10)</td></tr>';
        } else if (x.roundGroup === 'qualifying_rest') {
          sectionRow = '<tr style="background:#f8fafc;"><td colspan="5" style="font-weight:700;color:#475569;">🎵 ผลรอบคัดเลือก (ต่อท้าย) — ผู้ไม่เข้าเกณฑ์รอบตัดสิน (ลำดับที่ 11 เป็นต้นไป)</td></tr>';
        }
        lastGroup = x.roundGroup;
      }

      const rankBadge = x.isAbsent
        ? '<span class="badge badge-rose">ไม่เข้าร่วม</span>'
        : x.hasScore && x.rankNum
        ? '<span class="badge ' + (x.rankNum === 1 ? 'badge-amber' : x.rankNum <= 3 ? 'badge-emerald' : 'badge-slate') + '">' + esc(getRankAwardLabel(x.rankNum, false, true, 'อันดับที่')) + '</span>'
        : '<span style="color:#94a3b8;font-size:12px;">รอคะแนน</span>';
      let roundDetails = '';
      if (x.roundInfo.isTwoRound && x.hasScore) {
        if (x.roundGroup === 'qualifying_rest') {
          roundDetails = '<div style="font-size:11px;color:#64748b;margin-top:2px;">รอบคัดเลือก (อันดับคัดเลือก ' + (x.qualifyingRank || '-') + ')</div>';
        } else {
          roundDetails = '<div style="font-size:11px;color:#0369a1;margin-top:2px;">' +
            (x.roundInfo.finalCalc.judgeCount > 0 ? 'รอบตัดสิน (1–10)' : 'เข้าเกณฑ์รอบตัดสิน (คัดเลือก 1–10)') +
            (x.roundInfo.qualifyingCalc.judgeCount > 0 ? ' • คัดเลือก ' + x.roundInfo.qualifyingCalc.average100.toFixed(2) : '') +
            (x.roundInfo.finalCalc.judgeCount > 0 ? ' • ตัดสิน ' + x.roundInfo.finalCalc.average100.toFixed(2) : '') + '</div>';
        }
      }
      return sectionRow + '<tr>' +
        '<td style="text-align:center;white-space:nowrap;">' + rankBadge + '</td>' +
        '<td>' + esc((x.reg.students || []).map(function (s) { return s.name; }).join(', ')) + '</td>' +
        '<td>' + esc(sch ? sch.name : '-') + '</td>' +
        '<td style="text-align:right;"><strong>' + (x.hasScore ? x.score.toFixed(2) : '-') + '</strong>' + roundDetails + '</td>' +
        '<td><span class="badge ' + medal.badgeCls + '">' + esc(medal.label) + '</span></td>' +
      '</tr>';
    }).join('');

    mc.innerHTML =
      '<div class="modal-backdrop z-results" id="resDetailBackdrop">' +
        '<div class="modal-box">' +
          '<div class="modal-header">' +
            '<div><strong>' + esc(comp ? comp.name : '') + '</strong><div style="font-size:12px;">' + esc(level) + (isTwoRound ? ' • ประกาศผลรวม 2 รอบ (รอบตัดสิน 1–10 + รอบคัดเลือกต่อท้าย)' : '') + '</div></div>' +
            '<div class="row-wrap">' +
              '<button type="button" class="btn btn-amber btn-sm" id="btnPrintFromResModal">🖨 พิมพ์ผลการแข่งขัน</button>' +
              '<button type="button" class="btn btn-rose-solid btn-sm" id="btnCloseResModal">ปิด</button>' +
            '</div>' +
          '</div>' +
          '<div class="modal-body">' +
            '<div class="table-wrap"><table class="data-table"><thead><tr><th style="text-align:center;">ลำดับที่ / รางวัล</th><th>ผู้เข้าแข่งขัน</th><th>โรงเรียน</th><th style="text-align:right;">คะแนนรวม</th><th>ระดับเหรียญ</th></tr></thead><tbody>' +
              (rows || '<tr><td colspan="5" style="text-align:center;padding:24px;">ยังไม่มีผลคะแนน</td></tr>') +
            '</tbody></table></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    document.getElementById('resDetailBackdrop').onclick = function (e) { if (e.target.id === 'resDetailBackdrop') mc.innerHTML = ''; };
    document.getElementById('btnCloseResModal').onclick = function () { mc.innerHTML = ''; };
    document.getElementById('btnPrintFromResModal').onclick = function () { printResultsReport(compId, level); };
  }

  function renderAdminCompManage(main) {
    if (state.authSession.role !== 'admin' && state.authSession.role !== 'manager') { main.innerHTML = '<div class="card">สำหรับผู้ดูแลระบบหรือผู้จัดการแข่งขันเท่านั้น</div>'; return; }
    const comp = getComp(state.adminCompManageId) || state.competitions[0];
    if (!state.compManageRegForm) resetCompManageRegForm(comp.id, state.adminCompManageLevel);
    const crit = getCriteria(comp.id);
    const compRegs = state.registrations.filter(function (r) {
      return r.competitionId === comp.id && (state.adminCompManageLevel === 'ทั้งหมด' || r.level === state.adminCompManageLevel);
    });
    const checkedInCount = compRegs.filter(function (r) { return isRegCheckedIn(r.id); }).length;
    const absentCompCount = compRegs.filter(function (r) { return Boolean(state.absentRegs[r.id]); }).length;
    const pendingCount = Math.max(0, compRegs.length - checkedInCount - absentCompCount);

    const critRows = crit.map(function (c, idx) {
      return '<tr><td>' + esc(c.label) + '</td><td style="text-align:center;"><strong>' + esc(c.max) + '</strong></td><td><button type="button" class="btn btn-rose btn-xs crit-del" data-idx="' + idx + '">ลบ</button></td></tr>';
    }).join('');

    let tabBodyHtml = '';
    if (state.adminCompManageTab === 'sheets') {
      const sheetRankedLookup = buildRankedEntryLookup();
      const sheetRows = compRegs.map(function (r, idx) {
        const sch = getSchool(r.schoolId);
        const isAbs = Boolean(state.absentRegs[r.id]);
        const isChk = isRegCheckedIn(r.id);
        const rankedEntry = sheetRankedLookup[r.id];
        const rInfo = (rankedEntry && rankedEntry.roundInfo) || getRoundBreakdown(comp.id, r.id);
        const hasScore = !isAbs && Boolean(rankedEntry && rankedEntry.hasScore);
        const dispScore = hasScore ? rankedEntry.score : 0;
        return '<tr>' +
          '<td style="text-align:center;">' + (idx + 1) + '</td>' +
          '<td><strong>' + esc(sch ? sch.name : '-') + '</strong><div style="font-size:11.5px;color:#64748b;">' + esc(r.level) + '</div></td>' +
          '<td>' + esc((r.students || []).map(function (s) { return s.name; }).join(', ')) + '</td>' +
          '<td>' + (isAbs ? '<span class="badge badge-rose">ไม่เข้าร่วม</span>' : (isChk ? '<span class="badge badge-emerald">ลงทะเบียนแล้ว</span>' : '<span class="badge badge-slate">รอลงทะเบียน</span>')) + '</td>' +
          '<td style="text-align:right;">' + (isAbs ? '<span style="color:#be123c;font-weight:700;">ไม่เข้าร่วมแข่งขัน</span>' : (hasScore ? ('<strong>' + dispScore.toFixed(2) + '</strong>' + (rInfo.isTwoRound && rInfo.activeRoundLabel ? '<div style="font-size:11px;color:#b45309;">ผลล่าสุด: ' + esc(rankedEntry.roundGroup === 'qualifying_rest' ? 'รอบคัดเลือก (ไม่เข้าเกณฑ์ 1–10)' : rInfo.activeRoundLabel) + '</div>' : '')) : 'รอคะแนน')) + '</td>' +
        '</tr>';
      }).join('');
      tabBodyHtml =
        '<div class="card stack">' +
          '<div class="row-wrap">' +
            '<select class="select" style="width:auto;" id="admSheetComp">' + state.competitions.map(function (c) { return '<option value="' + esc(c.id) + '"' + (comp.id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
            '<select class="select" style="width:auto;" id="admSheetLvl"><option value="ทั้งหมด">ทุกระดับชั้น</option>' + comp.levels.map(function (l) { return '<option value="' + esc(l) + '"' + (state.adminCompManageLevel === l ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>' +
            '<button type="button" class="btn btn-primary" id="btnPrintRegSheet">🖨 พิมพ์ใบลงทะเบียน (เซ็นชื่อ)</button>' +
            '<button type="button" class="btn btn-amber" id="btnPrintScoreSheet">🖨 พิมพ์ใบบันทึกคะแนนกรรมการ</button>' +
          '</div>' +
          '<div class="table-wrap"><table class="data-table"><thead><tr><th style="text-align:center;">ที่</th><th>โรงเรียน / ระดับชั้น</th><th>ผู้เข้าแข่งขัน</th><th>สถานะลงทะเบียน</th><th style="text-align:right;">คะแนนล่าสุด</th></tr></thead><tbody>' +
            (sheetRows || '<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8;">ยังไม่มีรายการแข่งขัน</td></tr>') +
          '</tbody></table></div>' +
        '</div>';
    } else if (state.adminCompManageTab === 'registration') {
      const rf = state.compManageRegForm;
      const stuInputs = rf.students.map(function (st, idx) {
        const thumb = safeImg(st.photoUrl);
        return '<div class="card-compact stack-sm" style="background:#f8fafc;">' +
          '<div class="row-between" style="gap:8px;">' +
            '<input type="text" class="input cm-stu-name" data-idx="' + idx + '" value="' + esc(st.name) + '" placeholder="ชื่อ-นามสกุล นักเรียนคนที่ ' + (idx + 1) + '" required />' +
            (rf.students.length > 1 ? '<button type="button" class="btn btn-rose btn-xs cm-stu-del" data-idx="' + idx + '">ลบ</button>' : '') +
          '</div>' +
          '<div class="row-between" style="font-size:12px;">' +
            '<label style="cursor:pointer;color:#047857;font-weight:700;">📷 ' + (thumb ? 'เปลี่ยนรูป' : 'อัปโหลดรูป') + '<input type="file" accept="image/*" class="hidden cm-stu-photo" data-idx="' + idx + '" /></label>' +
            (thumb ? '<img src="' + thumb + '" alt="" style="width:32px;height:32px;border-radius:6px;object-fit:cover;" />' : '') +
          '</div>' +
        '</div>';
      }).join('');
      const coachInputs = rf.coaches.map(function (c, idx) {
        const cThumb = safeImg(c.photoUrl);
        return '<div class="card-compact stack-sm" style="background:#f8fafc;">' +
          '<div class="row-between" style="gap:8px;">' +
            '<input type="text" class="input cm-coach-name" data-idx="' + idx + '" value="' + esc(c.name) + '" placeholder="ชื่อ-นามสกุล ครูผู้ฝึกสอนท่านที่ ' + (idx + 1) + '" />' +
            (rf.coaches.length > 1 ? '<button type="button" class="btn btn-rose btn-xs cm-coach-del" data-idx="' + idx + '">ลบ</button>' : '') +
          '</div>' +
          '<div class="row-between" style="font-size:12px;">' +
            '<label style="cursor:pointer;color:#047857;font-weight:700;">📷 ' + (cThumb ? 'เปลี่ยนรูป' : 'อัปโหลดรูป') + '<input type="file" accept="image/*" class="hidden cm-coach-photo" data-idx="' + idx + '" /></label>' +
            (cThumb ? '<img src="' + cThumb + '" alt="" style="width:32px;height:32px;border-radius:6px;object-fit:cover;" />' : '') +
          '</div>' +
        '</div>';
      }).join('');

      const q = (state.compManageCheckinSearch || '').trim().toLowerCase();
      const filteredRegs = compRegs.filter(function (r) {
        const isAbs = Boolean(state.absentRegs[r.id]);
        const isChk = isRegCheckedIn(r.id);
        const stKey = isAbs ? 'absent' : (isChk ? 'checked_in' : 'pending');
        if (state.compManageCheckinFilter !== 'all' && stKey !== state.compManageCheckinFilter) return false;
        if (!q) return true;
        const sch = getSchool(r.schoolId);
        const txt = ((sch ? sch.name : '') + ' ' + r.level + ' ' + (r.students || []).map(function (s) { return s.name; }).join(' ')).toLowerCase();
        return txt.indexOf(q) !== -1;
      });

      let regListHtml = '';
      if (state.compManageRegMode === 'school') {
        const schoolBuckets = {};
        filteredRegs.forEach(function (r) {
          if (!schoolBuckets[r.schoolId]) schoolBuckets[r.schoolId] = [];
          schoolBuckets[r.schoolId].push(r);
        });
        const schoolGroups = Object.keys(schoolBuckets).map(function (sId) {
          return { school: getSchool(sId) || { id: sId, name: 'ไม่ระบุโรงเรียน', schoolCode: '-' }, regs: schoolBuckets[sId] };
        });
        regListHtml = schoolGroups.length === 0
          ? '<div style="text-align:center;padding:24px;color:#94a3b8;">ไม่พบข้อมูลโรงเรียนที่มีทีมสมัครในเงื่อนไขที่เลือก</div>'
          : '<div class="stack">' + schoolGroups.map(function (grp) {
              const sch = grp.school;
              const regs = grp.regs;
              const schChk = regs.filter(function (r) { return isRegCheckedIn(r.id); }).length;
              const schAbs = regs.filter(function (r) { return Boolean(state.absentRegs[r.id]); }).length;
              const schPend = Math.max(0, regs.length - schChk - schAbs);
              const anyApproved = regs.some(function (r) { return Boolean((state.evalMeta[r.competitionId + '__' + r.level] || {}).approved); });
              const teamItems = regs.map(function (r) {
                const isAbs = Boolean(state.absentRegs[r.id]);
                const isChk = isRegCheckedIn(r.id);
                const metaApproved = Boolean((state.evalMeta[r.competitionId + '__' + r.level] || {}).approved);
                return '<div class="row-between" style="background:#fff;border:1px solid #e2e8f0;border-radius:10px;padding:10px 12px;">' +
                  '<div>' +
                    '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">' +
                      '<span class="badge badge-slate">' + esc(r.level) + '</span>' +
                      (isAbs ? '<span class="badge badge-rose">ไม่เข้าร่วมแข่งขัน</span>' : (isChk ? '<span class="badge badge-emerald">ลงทะเบียนแล้ว</span>' : '<span class="badge badge-amber">รอลงทะเบียน</span>')) +
                    '</div>' +
                    '<div style="font-size:13px;font-weight:600;margin-top:4px;">' + esc((r.students || []).map(function (s) { return s.name; }).join(', ') || '-') + '</div>' +
                  '</div>' +
                  '<div class="row-wrap">' +
                    (!isChk
                      ? '<button type="button" class="btn btn-primary btn-xs cm-chk" data-id="' + esc(r.id) + '" data-st="checked_in">ลงทะเบียนเข้าร่วม</button>'
                      : '<button type="button" class="btn btn-amber btn-xs cm-chk" data-id="' + esc(r.id) + '" data-st="pending">ยกเลิกการลงทะเบียน</button>') +
                    (isAbs ? '<button type="button" class="btn btn-amber btn-xs cm-chk" data-id="' + esc(r.id) + '" data-st="pending">ยกเลิกไม่เข้าร่วม</button>' : '') +
                    '<button type="button" class="btn btn-outline btn-xs cm-edit" data-id="' + esc(r.id) + '">✏</button>' +
                    '<button type="button" class="btn btn-rose btn-xs cm-del" data-id="' + esc(r.id) + '"' + (metaApproved ? ' disabled' : '') + '>ถอนทีม</button>' +
                  '</div>' +
                '</div>';
              }).join('');
              return '<div class="card-compact stack-sm" style="background:#f8fafc;">' +
                '<div class="row-between">' +
                  '<div><strong>' + esc(sch.name) + '</strong> <span class="badge badge-slate">รหัส ' + esc(sch.schoolCode) + '</span> <span class="badge badge-amber">ทั้งหมด ' + regs.length + ' ทีม (เข้าร่วมแล้ว ' + schChk + ' • รอ ' + schPend + (schAbs > 0 ? ' • ไม่ร่วม ' + schAbs : '') + ')</span></div>' +
                  '<div class="row-wrap">' +
                    '<button type="button" class="btn btn-primary btn-xs cm-sch-chk" data-sch="' + esc(sch.id) + '" data-st="checked_in">ลงทะเบียนทั้งโรงเรียน</button>' +
                    '<button type="button" class="btn btn-amber btn-xs cm-sch-chk" data-sch="' + esc(sch.id) + '" data-st="pending">ยกเลิกการลงทะเบียนทั้งโรงเรียน</button>' +
                    '<button type="button" class="btn btn-rose btn-xs cm-sch-chk" data-sch="' + esc(sch.id) + '" data-st="absent"' + (anyApproved ? ' disabled' : '') + '>ไม่เข้าร่วมทั้งโรงเรียน</button>' +
                  '</div>' +
                '</div>' +
                '<div class="stack-sm">' + teamItems + '</div>' +
              '</div>';
            }).join('') + '</div>';
      } else {
        const checkinRows = filteredRegs.map(function (r, idx) {
          const sch = getSchool(r.schoolId);
          const isAbs = Boolean(state.absentRegs[r.id]);
          const isChk = isRegCheckedIn(r.id);
          const metaApproved = Boolean((state.evalMeta[r.competitionId + '__' + r.level] || {}).approved);
          return '<tr>' +
            '<td style="text-align:center;">' + (idx + 1) + '</td>' +
            '<td><strong>' + esc(sch ? sch.name : '-') + '</strong><div style="font-size:11.5px;color:#4f46e5;">' + esc(r.level) + '</div></td>' +
            '<td><div>' + esc((r.students || []).map(function (s) { return s.name; }).join(', ')) + '</div>' +
              '<div style="font-size:11.5px;color:#64748b;">ครู: ' + esc((r.coaches || []).map(function (c) { return typeof c === 'string' ? c : c.name; }).join(', ')) + '</div></td>' +
            '<td>' + (isAbs ? '<span class="badge badge-rose">ไม่เข้าร่วมแข่งขัน</span>' : (isChk ? '<span class="badge badge-emerald">ลงทะเบียนแล้ว</span>' : '<span class="badge badge-amber">รอลงทะเบียน</span>')) + '</td>' +
            '<td style="white-space:nowrap;">' +
              '<button type="button" class="btn ' + (isChk ? 'btn-primary' : 'btn-outline') + ' btn-xs cm-chk" data-id="' + esc(r.id) + '" data-st="checked_in">ลงทะเบียนเข้าร่วม</button> ' +
              '<button type="button" class="btn ' + (!isChk && !isAbs ? 'btn-amber' : 'btn-outline') + ' btn-xs cm-chk" data-id="' + esc(r.id) + '" data-st="pending">ยกเลิกการลงทะเบียน</button> ' +
              '<button type="button" class="btn ' + (isAbs ? 'btn-rose-solid' : 'btn-rose') + ' btn-xs cm-chk" data-id="' + esc(r.id) + '" data-st="absent"' + (metaApproved ? ' disabled' : '') + '>ไม่เข้าร่วม</button>' +
            '</td>' +
            '<td style="white-space:nowrap;">' +
              '<button type="button" class="btn btn-outline btn-xs cm-edit" data-id="' + esc(r.id) + '">✏</button> ' +
              '<button type="button" class="btn btn-rose btn-xs cm-del" data-id="' + esc(r.id) + '"' + (metaApproved ? ' disabled' : '') + '>ถอนทีม</button>' +
            '</td>' +
          '</tr>';
        }).join('');
        regListHtml =
          '<div class="table-wrap"><table class="data-table"><thead><tr><th style="text-align:center;">ที่</th><th>โรงเรียน / ระดับ</th><th>ผู้เข้าแข่งขัน</th><th>สถานะการลงทะเบียน</th><th>ลงทะเบียน / ยกเลิกการลงทะเบียน</th><th>จัดการทีม</th></tr></thead><tbody>' +
            (checkinRows || '<tr><td colspan="6" style="text-align:center;padding:24px;color:#94a3b8;">ไม่พบข้อมูล</td></tr>') +
          '</tbody></table></div>';
      }

      tabBodyHtml =
        '<div class="stack">' +
          '<div class="grid-4">' +
            '<div class="kpi-card"><div style="font-size:12px;color:#64748b;font-weight:700;">ทั้งหมด</div><div class="kpi-val">' + compRegs.length + ' ทีม</div></div>' +
            '<div class="kpi-card" style="background:#ecfdf5;border-color:#a7f3d0;"><div style="font-size:12px;color:#047857;font-weight:700;">ลงทะเบียนแล้ว</div><div class="kpi-val" style="color:#065f46;">' + checkedInCount + ' ทีม</div></div>' +
            '<div class="kpi-card" style="background:#fffbeb;border-color:#fde68a;"><div style="font-size:12px;color:#b45309;font-weight:700;">รอลงทะเบียน</div><div class="kpi-val" style="color:#92400e;">' + pendingCount + ' ทีม</div></div>' +
            '<div class="kpi-card" style="background:#fff1f2;border-color:#fecdd3;"><div style="font-size:12px;color:#be123c;font-weight:700;">ไม่เข้าร่วม</div><div class="kpi-val" style="color:#9f1239;">' + absentCompCount + ' ทีม</div></div>' +
          '</div>' +
          '<div class="card stack">' +
            '<div class="row-between">' +
              '<h3 style="margin:0;">' + (rf.editingId ? '✏ แก้ไขทีมเข้าแข่งขัน: ' : '➕ ลงทะเบียนเข้าร่วมแข่งขัน: ') + esc(comp.name) + '</h3>' +
              (rf.editingId ? '<button type="button" class="btn btn-outline btn-xs" id="btnCancelCmEdit">ยกเลิกแก้ไข</button>' : '') +
            '</div>' +
            '<div class="row-wrap">' +
              '<select class="select" style="width:auto;" id="cmRegComp">' + state.competitions.map(function (c) { return '<option value="' + esc(c.id) + '"' + (comp.id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
              '<select class="select" style="width:auto;" id="cmRegFilterLvl"><option value="ทั้งหมด">ทุกระดับชั้น</option>' + comp.levels.map(function (l) { return '<option value="' + esc(l) + '"' + (state.adminCompManageLevel === l ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>' +
            '</div>' +
            '<form id="cmRegForm" class="stack">' +
              '<div class="grid-2">' +
                '<div><label class="field-label">โรงเรียน *</label><select class="select" id="cmSchSel">' + state.schools.map(function (s) { return '<option value="' + esc(s.id) + '"' + (rf.schoolId === s.id ? ' selected' : '') + '>' + esc(s.name) + '</option>'; }).join('') + '</select></div>' +
                '<div><label class="field-label">ระดับชั้น *</label><select class="select" id="cmLvlSel">' + comp.levels.map(function (l) { return '<option value="' + esc(l) + '"' + (rf.level === l ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select></div>' +
              '</div>' +
              '<div class="stack-sm"><div class="row-between"><label class="field-label" style="margin:0;">ผู้เข้าแข่งขัน *</label><button type="button" class="btn btn-amber btn-xs" id="btnCmAddStu">+ เพิ่มนักเรียน</button></div><div class="grid-2">' + stuInputs + '</div></div>' +
              '<div class="stack-sm"><div class="row-between"><label class="field-label" style="margin:0;">ครูผู้ฝึกสอน</label><button type="button" class="btn btn-primary btn-xs" id="btnCmAddCoach">+ เพิ่มครู</button></div><div class="grid-2">' + coachInputs + '</div></div>' +
              (comp.requiresSongs
                ? '<div class="grid-2" style="background:#fffbeb;padding:12px;border-radius:12px;border:1px solid #fde68a;">' +
                    '<div><label class="field-label">เพลงรอบคัดเลือก *</label><input type="text" class="input" id="cmQSong" value="' + esc(rf.qualifyingSong) + '" required /></div>' +
                    '<div><label class="field-label">เพลงรอบตัดสิน *</label><input type="text" class="input" id="cmFSong" value="' + esc(rf.finalSong) + '" required /></div>' +
                  '</div>'
                : '') +
              '<div><button type="submit" class="btn btn-primary">✓ ' + (rf.editingId ? 'บันทึกการแก้ไขทีม' : 'บันทึกการลงทะเบียนเข้าร่วมแข่งขัน') + '</button></div>' +
            '</form>' +
          '</div>' +
          '<div class="card stack">' +
            '<div class="row-between">' +
              '<div><h3 style="margin:0;">📋 ลงทะเบียน / ยกเลิกการลงทะเบียนผู้เข้าร่วมแข่งขัน</h3><p style="margin:2px 0 0;font-size:12px;color:#64748b;">เลือกจัดการลงทะเบียนเข้าร่วมหรือยกเลิกการลงทะเบียนได้ทั้งแบบรายทีมและแบบรายโรงเรียน</p></div>' +
              '<div class="row-wrap">' +
                '<div class="tabs">' +
                  '<button type="button" class="tab-btn ' + (state.compManageRegMode === 'team' ? 'active' : '') + '" id="btnCmModeTeam">แบบรายทีม</button>' +
                  '<button type="button" class="tab-btn ' + (state.compManageRegMode === 'school' ? 'active-amber' : '') + '" id="btnCmModeSchool">แบบรายโรงเรียน</button>' +
                '</div>' +
                '<input type="text" class="input" style="width:200px;" id="cmSearchInp" value="' + esc(state.compManageCheckinSearch) + '" placeholder="ค้นหาโรงเรียน / นักเรียน..." />' +
                '<select class="select" style="width:auto;" id="cmFilterSel"><option value="all">ทั้งหมด</option><option value="checked_in"' + (state.compManageCheckinFilter === 'checked_in' ? ' selected' : '') + '>ลงทะเบียนแล้ว</option><option value="pending"' + (state.compManageCheckinFilter === 'pending' ? ' selected' : '') + '>รอลงทะเบียน</option><option value="absent"' + (state.compManageCheckinFilter === 'absent' ? ' selected' : '') + '>ไม่เข้าร่วม</option></select>' +
              '</div>' +
            '</div>' +
            regListHtml +
          '</div>' +
        '</div>';
    } else {
      tabBodyHtml =
        '<div class="card stack">' +
          '<div class="row-between">' +
            '<select class="select" style="width:auto;" id="admCritComp">' + state.competitions.map(function (c) { return '<option value="' + esc(c.id) + '"' + (comp.id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
            '<button type="button" class="btn btn-outline btn-sm" id="btnResetCrit">↺ คืนค่ามาตรฐาน</button>' +
          '</div>' +
          '<form id="addCritForm" class="row-wrap"><input type="text" class="input" style="flex:1;" id="newCritLabel" placeholder="หัวข้อเกณฑ์การให้คะแนน..." required /><input type="number" class="input" style="width:120px;" id="newCritMax" value="10" min="1" max="100" required /><button type="submit" class="btn btn-primary">+ เพิ่มเกณฑ์</button></form>' +
          '<div class="table-wrap"><table class="data-table"><thead><tr><th>หัวข้อเกณฑ์</th><th style="text-align:center;">คะแนนเต็ม</th><th>ลบ</th></tr></thead><tbody>' + (critRows || '<tr><td colspan="3" style="text-align:center;padding:18px;">ไม่มีเกณฑ์ย่อย</td></tr>') + '</tbody></table></div>' +
        '</div>';
    }

    main.innerHTML =
      '<div class="stack">' +
        '<div class="card row-between">' +
          '<div><h2 style="margin:0;">📄 การจัดการแข่งขัน (เอกสาร ลงทะเบียน & เกณฑ์คะแนน)</h2></div>' +
          '<div class="tabs">' +
            '<button type="button" class="tab-btn ' + (state.adminCompManageTab === 'sheets' ? 'active' : '') + '" id="tabAdmSheets">เอกสารลงทะเบียน / ใบคะแนน</button>' +
            '<button type="button" class="tab-btn ' + (state.adminCompManageTab === 'registration' ? 'active' : '') + '" id="tabAdmReg">ลงทะเบียนเข้าร่วมแข่งขัน</button>' +
            '<button type="button" class="tab-btn ' + (state.adminCompManageTab === 'criteria' ? 'active-amber' : '') + '" id="tabAdmCrit">ตั้งค่าเกณฑ์คะแนน</button>' +
          '</div>' +
        '</div>' +
        tabBodyHtml +
      '</div>';

    document.getElementById('tabAdmSheets').onclick = function () { state.adminCompManageTab = 'sheets'; renderAll(); };
    document.getElementById('tabAdmReg').onclick = function () { state.adminCompManageTab = 'registration'; renderAll(); };
    document.getElementById('tabAdmCrit').onclick = function () { state.adminCompManageTab = 'criteria'; renderAll(); };
    if (document.getElementById('admSheetComp')) {
      document.getElementById('admSheetComp').onchange = function (e) { state.adminCompManageId = e.target.value; state.adminCompManageLevel = 'ทั้งหมด'; resetCompManageRegForm(e.target.value, 'ทั้งหมด'); renderAll(); };
      document.getElementById('admSheetLvl').onchange = function (e) { state.adminCompManageLevel = e.target.value; renderAll(); };
      document.getElementById('btnPrintRegSheet').onclick = function () { printAdminSheet('register', state.adminCompManageId, state.adminCompManageLevel); };
      document.getElementById('btnPrintScoreSheet').onclick = function () { printAdminSheet('score', state.adminCompManageId, state.adminCompManageLevel); };
    }
    if (document.getElementById('cmRegForm')) {
      const rf = state.compManageRegForm;
      if (document.getElementById('btnCancelCmEdit')) {
        document.getElementById('btnCancelCmEdit').onclick = function () { resetCompManageRegForm(comp.id, state.adminCompManageLevel); renderAll(); };
      }
      document.getElementById('cmRegComp').onchange = function (e) { state.adminCompManageId = e.target.value; state.adminCompManageLevel = 'ทั้งหมด'; resetCompManageRegForm(e.target.value, 'ทั้งหมด'); renderAll(); };
      document.getElementById('cmRegFilterLvl').onchange = function (e) { state.adminCompManageLevel = e.target.value; if (!rf.editingId && e.target.value !== 'ทั้งหมด') rf.level = e.target.value; renderAll(); };
      document.getElementById('cmSchSel').onchange = function (e) { rf.schoolId = e.target.value; };
      document.getElementById('cmLvlSel').onchange = function (e) { rf.level = e.target.value; };
      document.getElementById('btnCmAddStu').onclick = function () { rf.students.push({ name: '', photoUrl: '' }); renderAll(); };
      document.getElementById('btnCmAddCoach').onclick = function () { rf.coaches.push({ name: '', photoUrl: '' }); renderAll(); };
      main.querySelectorAll('.cm-stu-name').forEach(function (inp) { inp.oninput = function () { rf.students[Number(inp.getAttribute('data-idx'))].name = inp.value; }; });
      main.querySelectorAll('.cm-stu-del').forEach(function (btn) { btn.onclick = function () { rf.students.splice(Number(btn.getAttribute('data-idx')), 1); renderAll(); }; });
      main.querySelectorAll('.cm-stu-photo').forEach(function (inp) {
        inp.onchange = async function () {
          const f0 = inp.files && inp.files[0]; if (!f0) return;
          try { rf.students[Number(inp.getAttribute('data-idx'))].photoUrl = await uploadImageFile(f0, 'students', 600, 0.85); showToast('อัปโหลดรูปถ่ายนักเรียนแล้ว'); renderAll(); }
          catch (err) { showToast(err.message, 'error'); }
        };
      });
      main.querySelectorAll('.cm-coach-name').forEach(function (inp) { inp.oninput = function () { rf.coaches[Number(inp.getAttribute('data-idx'))].name = inp.value; }; });
      main.querySelectorAll('.cm-coach-del').forEach(function (btn) { btn.onclick = function () { rf.coaches.splice(Number(btn.getAttribute('data-idx')), 1); renderAll(); }; });
      main.querySelectorAll('.cm-coach-photo').forEach(function (inp) {
        inp.onchange = async function () {
          const f0 = inp.files && inp.files[0]; if (!f0) return;
          try { rf.coaches[Number(inp.getAttribute('data-idx'))].photoUrl = await uploadImageFile(f0, 'coaches', 600, 0.85); showToast('อัปโหลดรูปถ่ายครูแล้ว'); renderAll(); }
          catch (err) { showToast(err.message, 'error'); }
        };
      });
      if (document.getElementById('cmQSong')) {
        document.getElementById('cmQSong').oninput = function (e) { rf.qualifyingSong = e.target.value; };
        document.getElementById('cmFSong').oninput = function (e) { rf.finalSong = e.target.value; };
      }
      document.getElementById('cmRegForm').onsubmit = async function (e) {
        e.preventDefault();
        try {
          const res = await apiCall('save_registration', {
            id: rf.editingId,
            schoolId: rf.schoolId,
            competitionId: comp.id,
            level: rf.level,
            students: rf.students,
            coaches: rf.coaches,
            qualifyingSong: rf.qualifyingSong,
            finalSong: rf.finalSong,
          });
          resetCompManageRegForm(comp.id, state.adminCompManageLevel);
          showToast(res.message);
          renderAll();
        } catch (err) { showToast(err.message, 'error'); }
      };
      document.getElementById('btnCmModeTeam').onclick = function () { state.compManageRegMode = 'team'; renderAll(); };
      document.getElementById('btnCmModeSchool').onclick = function () { state.compManageRegMode = 'school'; renderAll(); };
      document.getElementById('cmSearchInp').oninput = function (e) { state.compManageCheckinSearch = e.target.value; renderAll(); };
      document.getElementById('cmFilterSel').onchange = function (e) { state.compManageCheckinFilter = e.target.value; renderAll(); };
      main.querySelectorAll('.cm-chk').forEach(function (btn) {
        btn.onclick = async function () {
          try {
            const res = await apiCall('save_competition_checkin', { registrationId: btn.getAttribute('data-id'), status: btn.getAttribute('data-st') });
            showToast(res.message); renderAll();
          } catch (err) { showToast(err.message, 'error'); }
        };
      });
      main.querySelectorAll('.cm-sch-chk').forEach(function (btn) {
        btn.onclick = async function () {
          try {
            const res = await apiCall('save_competition_checkin', {
              schoolId: btn.getAttribute('data-sch'),
              competitionId: comp.id,
              level: state.adminCompManageLevel !== 'ทั้งหมด' ? state.adminCompManageLevel : undefined,
              status: btn.getAttribute('data-st'),
            });
            showToast(res.message); renderAll();
          } catch (err) { showToast(err.message, 'error'); }
        };
      });
      main.querySelectorAll('.cm-edit').forEach(function (btn) {
        btn.onclick = function () {
          const r = state.registrations.find(function (x) { return x.id === btn.getAttribute('data-id'); });
          if (!r) return;
          state.compManageRegForm = {
            editingId: r.id,
            schoolId: r.schoolId,
            level: r.level,
            students: (r.students || []).map(function (s) { return { name: s.name || '', photoUrl: s.photoUrl || '' }; }),
            coaches: (r.coaches || []).map(function (c) { return typeof c === 'string' ? { name: c, photoUrl: '' } : { name: c.name || '', photoUrl: c.photoUrl || '' }; }),
            qualifyingSong: r.qualifyingSong || '',
            finalSong: r.finalSong || '',
          };
          renderAll();
        };
      });
      main.querySelectorAll('.cm-del').forEach(function (btn) {
        btn.onclick = function () {
          openConfirmModal('ยืนยันถอนทีม / ยกเลิกการลงทะเบียน', 'ต้องการถอนทีมและยกเลิกการลงทะเบียนรายการนี้ใช่หรือไม่?', async function () {
            try {
              const res = await apiCall('delete_registration', { id: btn.getAttribute('data-id') });
              showToast(res.message); renderAll();
            } catch (err) { showToast(err.message, 'error'); }
          });
        };
      });
    }
    if (document.getElementById('admCritComp')) {
      document.getElementById('admCritComp').onchange = function (e) { state.adminCompManageId = e.target.value; renderAll(); };
      document.getElementById('btnResetCrit').onclick = async function () {
        try { const res = await apiCall('reset_criteria', { competitionId: comp.id }); showToast(res.message); renderAll(); }
        catch (err) { showToast(err.message, 'error'); }
      };
      document.getElementById('addCritForm').onsubmit = async function (e) {
        e.preventDefault();
        const next = crit.concat([{ key: 'c_' + Date.now(), label: document.getElementById('newCritLabel').value, max: Number(document.getElementById('newCritMax').value) }]);
        try { const res = await apiCall('save_criteria', { competitionId: comp.id, criteria: next }); showToast(res.message); renderAll(); }
        catch (err) { showToast(err.message, 'error'); }
      };
      main.querySelectorAll('.crit-del').forEach(function (btn) {
        btn.onclick = async function () {
          const next = crit.filter(function (_x, i) { return i !== Number(btn.getAttribute('data-idx')); });
          try { const res = await apiCall('save_criteria', { competitionId: comp.id, criteria: next }); showToast(res.message); renderAll(); }
          catch (err) { showToast(err.message, 'error'); }
        };
      });
    }
  }

  function renderAdminManage(main) {
    if (state.authSession.role !== 'admin') { main.innerHTML = '<div class="card">สำหรับผู้ดูแลระบบเท่านั้น</div>'; return; }

    const permLabels = {
      'student-card': 'พิมพ์บัตรผู้เข้าแข่งขัน',
      'coach-card': 'พิมพ์บัตรครูผู้ฝึกสอน',
      'judge-card': 'พิมพ์บัตรกรรมการตัดสิน',
      'judge-cert': 'เกียรติบัตรกรรมการ',
      'school-cert': 'เกียรติบัตรนักเรียน/ครู/ผอ.',
      'school-results': 'ผลคะแนนของโรงเรียน',
      'results': 'ประกาศผลคะแนน',
    };

    const bgLabels = [
      { key: 'bannerBgUrl', label: 'รูปแบนเนอร์หน้าแรก' },
      { key: 'studentCardBgUrl', label: 'พื้นหลังบัตรผู้เข้าแข่งขัน' },
      { key: 'coachCardBgUrl', label: 'พื้นหลังบัตรครูผู้ฝึกสอน' },
      { key: 'judgeCardBgUrl', label: 'พื้นหลังบัตรกรรมการ' },
      { key: 'certBgUrl', label: 'พื้นหลังเกียรติบัตร (A4 แนวนอน)' },
    ];

    const editSch = state.editingSchoolId ? getSchool(state.editingSchoolId) : null;
    const editJdg = state.editingJudgeId ? getJudge(state.editingJudgeId) : null;
    const editMgr = state.editingManagerId ? getManager(state.editingManagerId) : null;
    const jdgComp = getComp(editJdg ? editJdg.competitionId : 'comp-1') || state.competitions[0];

    main.innerHTML =
      '<div class="stack">' +
        '<div class="card stack">' +
          '<h2 style="margin:0;">🛡 จัดการระบบและสิทธิ์การเข้าถึง (Admin)</h2>' +
          '<div class="row-between card-compact" style="background:#f8fafc;">' +
            '<div><strong>สถานะระบบสมัครแข่งขัน</strong><div style="font-size:12px;color:#64748b;">' + (state.registrationOpen ? 'กำลังเปิดรับสมัคร' : 'ปิดรับสมัครแล้ว') + '</div></div>' +
            '<button type="button" class="btn ' + (state.registrationOpen ? 'btn-rose' : 'btn-primary') + '" id="btnToggleRegOpen">' + (state.registrationOpen ? '🔒 ปิดรับสมัคร' : '🔓 เปิดรับสมัคร') + '</button>' +
          '</div>' +
          '<div class="grid-3">' +
            Object.keys(permLabels).map(function (k) {
              const open = Boolean(state.menuPermissions[k]);
              return '<div class="card-compact row-between"><span style="font-size:13px;font-weight:700;">' + esc(permLabels[k]) + '</span><button type="button" class="btn btn-xs perm-toggle ' + (open ? 'btn-primary' : 'btn-rose') + '" data-key="' + esc(k) + '">' + (open ? 'เปิด' : 'ปิด') + '</button></div>';
            }).join('') +
          '</div>' +
        '</div>' +

        '<div class="card stack">' +
          '<h3 style="margin:0;">🖼 อัปโหลดรูปพื้นหลังเอกสารและแบนเนอร์</h3>' +
          '<div class="grid-3">' +
            bgLabels.map(function (b) {
              const url = safeImg(state.backgrounds[b.key]);
              return '<div class="card-compact stack-sm"><strong style="font-size:13px;">' + esc(b.label) + '</strong>' +
                (url ? '<img src="' + url + '" style="width:100%;height:90px;object-fit:cover;border-radius:10px;" />' : '<div style="height:90px;background:#f1f5f9;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:12px;color:#94a3b8;">ใช้ค่าเริ่มต้น</div>') +
                '<div class="row-between"><label class="btn btn-outline btn-xs" style="cursor:pointer;">อัปโหลด<input type="file" accept="image/*" class="hidden bg-upload" data-key="' + esc(b.key) + '" /></label>' +
                (url ? '<button type="button" class="btn btn-rose btn-xs bg-clear" data-key="' + esc(b.key) + '">ลบ</button>' : '') + '</div></div>';
            }).join('') +
          '</div>' +
        '</div>' +

        '<div class="card stack">' +
          '<h3 style="margin:0;">🏫 จัดการข้อมูลโรงเรียน (' + state.schools.length + ' แห่ง)</h3>' +
          '<form id="admSchForm" class="grid-3">' +
            '<input type="text" class="input" id="admSchCode" value="' + esc(editSch ? editSch.schoolCode : '') + '" placeholder="รหัสสถานศึกษา *" required />' +
            '<input type="text" class="input" id="admSchName" value="' + esc(editSch ? editSch.name : '') + '" placeholder="ชื่อโรงเรียน *" required />' +
            '<input type="text" class="input" id="admSchDir" value="' + esc(editSch ? editSch.director : '') + '" placeholder="ชื่อผู้อำนวยการ *" required />' +
            '<input type="text" class="input" id="admSchPhone" value="' + esc(editSch ? editSch.phone : '') + '" placeholder="เบอร์โทรศัพท์" />' +
            '<input type="password" class="input" id="admSchPass" placeholder="' + (editSch ? 'รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)' : 'รหัสผ่าน (ค่าเริ่มต้น 1234)') + '" />' +
            '<div class="row-wrap"><button type="submit" class="btn btn-primary">' + (editSch ? 'บันทึกแก้ไข' : '+ เพิ่มโรงเรียน') + '</button>' + (editSch ? '<button type="button" class="btn btn-outline" id="btnCancelSchEdit">ยกเลิก</button>' : '') + '</div>' +
          '</form>' +
          '<div class="table-wrap"><table class="data-table"><thead><tr><th>รหัส</th><th>ชื่อโรงเรียน</th><th>ผู้อำนวยการ</th><th>จัดการ</th></tr></thead><tbody>' +
            state.schools.map(function (s) {
              return '<tr><td>' + esc(s.schoolCode) + '</td><td><strong>' + esc(s.name) + '</strong></td><td>' + esc(s.director) + '</td><td><button type="button" class="btn btn-outline btn-xs adm-sch-edit" data-id="' + esc(s.id) + '">แก้ไข</button> <button type="button" class="btn btn-rose btn-xs adm-sch-del" data-id="' + esc(s.id) + '">ลบ</button></td></tr>';
            }).join('') +
          '</tbody></table></div>' +
        '</div>' +

        '<div class="card stack">' +
          '<h3 style="margin:0;">⚖ จัดการข้อมูลกรรมการตัดสิน (' + state.judges.length + ' ท่าน)</h3>' +
          '<form id="admJdgForm" class="grid-3">' +
            '<input type="text" class="input" id="admJdgUser" value="' + esc(editJdg ? editJdg.username : '') + '" placeholder="Username *" required />' +
            '<input type="password" class="input" id="admJdgPass" placeholder="' + (editJdg ? 'รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)' : 'รหัสผ่าน (ค่าเริ่มต้น 1234)') + '" />' +
            '<input type="text" class="input" id="admJdgName" value="' + esc(editJdg ? editJdg.name : '') + '" placeholder="ชื่อ-นามสกุลกรรมการ *" required />' +
            '<input type="text" class="input" id="admJdgPos" value="' + esc(editJdg ? editJdg.position : 'กรรมการตัดสิน') + '" placeholder="ตำแหน่ง" />' +
            '<select class="select" id="admJdgComp">' + state.competitions.map(function (c) { return '<option value="' + esc(c.id) + '"' + (jdgComp.id === c.id ? ' selected' : '') + '>' + esc(c.name) + '</option>'; }).join('') + '</select>' +
            '<select class="select" id="admJdgLvl">' + jdgComp.levels.map(function (l) { return '<option value="' + esc(l) + '"' + (editJdg && editJdg.level === l ? ' selected' : '') + '>' + esc(l) + '</option>'; }).join('') + '</select>' +
            '<div class="card-compact row-between" style="grid-column:1 / -1;background:#f8fafc;">' +
              '<div class="row-wrap">' +
                (safeImg(state.editingJudgePhotoDraft)
                  ? '<img src="' + safeImg(state.editingJudgePhotoDraft) + '" style="width:44px;height:44px;border-radius:10px;object-fit:cover;border:1px solid #cbd5e1;" />'
                  : '<span style="font-size:12.5px;color:#64748b;">ยังไม่มีรูปถ่ายกรรมการ</span>') +
                '<label class="btn btn-outline btn-xs" style="cursor:pointer;">📷 ' + (state.editingJudgePhotoDraft ? 'เปลี่ยนรูปถ่ายกรรมการ' : 'อัปโหลดรูปถ่ายกรรมการ') + '<input type="file" accept="image/*" class="hidden" id="admJdgPhotoFile" /></label>' +
                (state.editingJudgePhotoDraft ? '<button type="button" class="btn btn-rose btn-xs" id="btnClearJdgPhoto">ลบรูป</button>' : '') +
              '</div>' +
              '<div class="row-wrap"><button type="submit" class="btn btn-sky">' + (editJdg ? 'บันทึกแก้ไขกรรมการ' : '+ เพิ่มกรรมการ') + '</button>' + (editJdg ? '<button type="button" class="btn btn-outline" id="btnCancelJdgEdit">ยกเลิก</button>' : '') + '</div>' +
            '</div>' +
          '</form>' +
          '<div class="table-wrap"><table class="data-table"><thead><tr><th>Username</th><th>ชื่อ-สกุล</th><th>กิจกรรม / ระดับ</th><th>จัดการ</th></tr></thead><tbody>' +
            state.judges.map(function (j) {
              const jc = getComp(j.competitionId);
              return '<tr><td>' + esc(j.username) + '</td><td><strong>' + esc(j.name) + '</strong></td><td>' + esc(jc ? jc.name : '-') + ' • ' + esc(j.level) + '</td><td><button type="button" class="btn btn-outline btn-xs adm-jdg-edit" data-id="' + esc(j.id) + '">แก้ไข</button> <button type="button" class="btn btn-rose btn-xs adm-jdg-del" data-id="' + esc(j.id) + '">ลบ</button></td></tr>';
            }).join('') +
          '</tbody></table></div>' +
        '</div>' +

        '<div class="card stack">' +
          '<div><h3 style="margin:0;">📄 จัดการบัญชีผู้จัดการแข่งขัน (' + state.managers.length + ' ท่าน)</h3><p style="margin:4px 0 0;font-size:12.5px;color:#64748b;">ผู้จัดการแข่งขันสามารถเข้าใช้งานได้เฉพาะเมนู &quot;การจัดการแข่งขัน&quot; เท่านั้น</p></div>' +
          '<form id="admMgrForm" class="grid-3">' +
            '<input type="text" class="input" id="admMgrUser" value="' + esc(editMgr ? editMgr.username : '') + '" placeholder="Username *" required />' +
            '<input type="password" class="input" id="admMgrPass" placeholder="' + (editMgr ? 'รหัสผ่านใหม่ (เว้นว่างหากไม่เปลี่ยน)' : 'รหัสผ่าน (อย่างน้อย 4 ตัว) *') + '" />' +
            '<input type="text" class="input" id="admMgrName" value="' + esc(editMgr ? editMgr.name : '') + '" placeholder="ชื่อ-นามสกุลผู้จัดการแข่งขัน *" required />' +
            '<input type="text" class="input" id="admMgrPhone" value="' + esc(editMgr ? editMgr.phone : '') + '" placeholder="เบอร์โทรศัพท์ติดต่อ" />' +
            '<div class="row-wrap"><button type="submit" class="btn btn-primary">' + (editMgr ? 'บันทึกแก้ไขผู้จัดการแข่งขัน' : '+ เพิ่มผู้จัดการแข่งขัน') + '</button>' + (editMgr ? '<button type="button" class="btn btn-outline" id="btnCancelMgrEdit">ยกเลิก</button>' : '') + '</div>' +
          '</form>' +
          '<div class="table-wrap"><table class="data-table"><thead><tr><th>Username</th><th>ชื่อ-นามสกุล</th><th>เบอร์ติดต่อ</th><th>สิทธิ์การใช้งาน</th><th>จัดการ</th></tr></thead><tbody>' +
            (state.managers.map(function (m) {
              return '<tr><td>' + esc(m.username) + '</td><td><strong>' + esc(m.name) + '</strong></td><td>' + esc(m.phone || '-') + '</td><td><span class="badge badge-sky">เฉพาะ การจัดการแข่งขัน</span></td><td><button type="button" class="btn btn-outline btn-xs adm-mgr-edit" data-id="' + esc(m.id) + '">แก้ไข</button> <button type="button" class="btn btn-rose btn-xs adm-mgr-del" data-id="' + esc(m.id) + '">ลบ</button></td></tr>';
            }).join('') || '<tr><td colspan="5" style="text-align:center;padding:18px;color:#94a3b8;">ยังไม่มีผู้จัดการแข่งขันในระบบ</td></tr>') +
          '</tbody></table></div>' +
        '</div>' +

        '<div class="card stack">' +
          '<h3 style="margin:0;">🔐 เปลี่ยนรหัสผ่านผู้ดูแลระบบ (Admin)</h3>' +
          '<form id="admCredForm" class="grid-2">' +
            '<input type="password" class="input" id="admCurPass" placeholder="รหัสผ่านปัจจุบัน *" required />' +
            '<input type="text" class="input" id="admNewUser" value="' + esc(state.adminProfile.username || 'admin') + '" placeholder="ชื่อผู้ใช้ Admin ใหม่ *" required />' +
            '<input type="text" class="input" id="admNewDisplay" value="' + esc(state.adminProfile.displayName || '') + '" placeholder="ชื่อที่แสดง" />' +
            '<input type="password" class="input" id="admNewPass" placeholder="รหัสผ่านใหม่ (อย่างน้อย 4 ตัวอักษร)" />' +
            '<div><button type="submit" class="btn btn-dark">บันทึกบัญชีผู้ดูแลระบบ</button></div>' +
          '</form>' +
        '</div>' +

        '<div class="card stack">' +
          '<div class="row-between">' +
            '<div><h3 style="margin:0;">💾 ระบบจัดเก็บข้อมูลและไฟล์ภาพบนเซิร์ฟเวอร์</h3><p style="margin:4px 0 0;font-size:13px;color:#64748b;">จัดเก็บแยกหมวดหมู่ใน data/*.json และ uploads/{students,coaches,judges,backgrounds}/</p></div>' +
            '<a href="api.php?action=export_backup" class="btn btn-amber btn-sm" download>⬇ สำรองข้อมูลระบบ (.json)</a>' +
          '</div>' +
          (state.storageStats
            ? '<div class="grid-4">' +
                '<div class="kpi-card"><div style="font-size:12px;color:#64748b;font-weight:700;">ภาพนักเรียน (uploads/students)</div><div class="kpi-val">' + ((state.storageStats.categories && state.storageStats.categories.students && state.storageStats.categories.students.files) || 0) + ' ไฟล์</div></div>' +
                '<div class="kpi-card"><div style="font-size:12px;color:#64748b;font-weight:700;">ภาพครูผู้ฝึกสอน (uploads/coaches)</div><div class="kpi-val">' + ((state.storageStats.categories && state.storageStats.categories.coaches && state.storageStats.categories.coaches.files) || 0) + ' ไฟล์</div></div>' +
                '<div class="kpi-card"><div style="font-size:12px;color:#64748b;font-weight:700;">ภาพกรรมการ (uploads/judges)</div><div class="kpi-val">' + ((state.storageStats.categories && state.storageStats.categories.judges && state.storageStats.categories.judges.files) || 0) + ' ไฟล์</div></div>' +
                '<div class="kpi-card"><div style="font-size:12px;color:#64748b;font-weight:700;">พื้นหลัง & แบนเนอร์</div><div class="kpi-val">' + ((state.storageStats.categories && state.storageStats.categories.backgrounds && state.storageStats.categories.backgrounds.files) || 0) + ' ไฟล์</div></div>' +
              '</div>'
            : '') +
        '</div>' +
      '</div>';

    document.getElementById('btnToggleRegOpen').onclick = async function () {
      try { const res = await apiCall('save_admin_settings', { registrationOpen: !state.registrationOpen }); showToast(res.message); renderAll(); }
      catch (err) { showToast(err.message, 'error'); }
    };
    main.querySelectorAll('.perm-toggle').forEach(function (btn) {
      btn.onclick = async function () {
        const k = btn.getAttribute('data-key');
        const next = {}; next[k] = !state.menuPermissions[k];
        try { const res = await apiCall('save_admin_settings', { menuPermissions: next }); showToast(res.message); renderAll(); }
        catch (err) { showToast(err.message, 'error'); }
      };
    });
    main.querySelectorAll('.bg-upload').forEach(function (inp) {
      inp.onchange = async function () {
        const file = inp.files && inp.files[0];
        if (!file) return;
        const bgKey = inp.getAttribute('data-key');
        const maxDim = bgKey === 'bannerBgUrl' ? 1920 : 1600;
        try {
          const uploadedUrl = await uploadImageFile(file, 'backgrounds', maxDim, 0.85);
          const res = await apiCall('save_background', { key: bgKey, dataUrl: uploadedUrl });
          showToast(res.message); renderAll();
        } catch (err) { showToast(err.message, 'error'); }
      };
    });
    main.querySelectorAll('.bg-clear').forEach(function (btn) {
      btn.onclick = async function () {
        try { const res = await apiCall('save_background', { key: btn.getAttribute('data-key'), dataUrl: '' }); showToast(res.message); renderAll(); }
        catch (err) { showToast(err.message, 'error'); }
      };
    });

    document.getElementById('admSchForm').onsubmit = async function (e) {
      e.preventDefault();
      try {
        const res = await apiCall('save_admin_school', {
          id: state.editingSchoolId,
          schoolCode: document.getElementById('admSchCode').value,
          name: document.getElementById('admSchName').value,
          director: document.getElementById('admSchDir').value,
          phone: document.getElementById('admSchPhone').value,
          password: document.getElementById('admSchPass').value,
        });
        state.editingSchoolId = null; showToast(res.message); renderAll();
      } catch (err) { showToast(err.message, 'error'); }
    };
    if (document.getElementById('btnCancelSchEdit')) document.getElementById('btnCancelSchEdit').onclick = function () { state.editingSchoolId = null; renderAll(); };
    main.querySelectorAll('.adm-sch-edit').forEach(function (b) { b.onclick = function () { state.editingSchoolId = b.getAttribute('data-id'); renderAll(); }; });
    main.querySelectorAll('.adm-sch-del').forEach(function (b) {
      b.onclick = function () {
        const sId = b.getAttribute('data-id');
        openConfirmModal('ยืนยันลบโรงเรียน', 'ต้องการลบข้อมูลโรงเรียนนี้และรายการสมัครของโรงเรียนนี้ทั้งหมดใช่หรือไม่?', async function () {
          try { const res = await apiCall('delete_admin_school', { id: sId }); showToast(res.message); renderAll(); }
          catch (err) { showToast(err.message, 'error'); }
        });
      };
    });

    document.getElementById('admJdgComp').onchange = function (e) {
      const c = getComp(e.target.value) || state.competitions[0];
      document.getElementById('admJdgLvl').innerHTML = c.levels.map(function (l) { return '<option value="' + esc(l) + '">' + esc(l) + '</option>'; }).join('');
    };
    document.getElementById('admJdgPhotoFile').onchange = async function (e) {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        state.editingJudgePhotoDraft = await uploadImageFile(file, 'judges', 600, 0.85);
        showToast('อัปโหลดรูปถ่ายกรรมการลงเซิร์ฟเวอร์เรียบร้อยแล้ว');
        renderAll();
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
    if (document.getElementById('btnClearJdgPhoto')) {
      document.getElementById('btnClearJdgPhoto').onclick = function () { state.editingJudgePhotoDraft = ''; renderAll(); };
    }
    document.getElementById('admJdgForm').onsubmit = async function (e) {
      e.preventDefault();
      try {
        const res = await apiCall('save_admin_judge', {
          id: state.editingJudgeId,
          username: document.getElementById('admJdgUser').value,
          password: document.getElementById('admJdgPass').value,
          name: document.getElementById('admJdgName').value,
          position: document.getElementById('admJdgPos').value,
          competitionId: document.getElementById('admJdgComp').value,
          level: document.getElementById('admJdgLvl').value,
          photoUrl: state.editingJudgePhotoDraft || '',
        });
        state.editingJudgeId = null;
        state.editingJudgePhotoDraft = '';
        showToast(res.message); renderAll();
      } catch (err) { showToast(err.message, 'error'); }
    };
    if (document.getElementById('btnCancelJdgEdit')) document.getElementById('btnCancelJdgEdit').onclick = function () { state.editingJudgeId = null; state.editingJudgePhotoDraft = ''; renderAll(); };
    main.querySelectorAll('.adm-jdg-edit').forEach(function (b) {
      b.onclick = function () {
        const jId = b.getAttribute('data-id');
        const target = getJudge(jId);
        state.editingJudgeId = jId;
        state.editingJudgePhotoDraft = target ? (target.photoUrl || '') : '';
        renderAll();
      };
    });
    main.querySelectorAll('.adm-jdg-del').forEach(function (b) {
      b.onclick = function () {
        const jId = b.getAttribute('data-id');
        openConfirmModal('ยืนยันลบกรรมการ', 'ต้องการลบรายชื่อกรรมการตัดสินท่านนี้ใช่หรือไม่?', async function () {
          try { const res = await apiCall('delete_admin_judge', { id: jId }); showToast(res.message); renderAll(); }
          catch (err) { showToast(err.message, 'error'); }
        });
      };
    });

    document.getElementById('admMgrForm').onsubmit = async function (e) {
      e.preventDefault();
      try {
        const res = await apiCall('save_admin_manager', {
          id: state.editingManagerId,
          username: document.getElementById('admMgrUser').value,
          password: document.getElementById('admMgrPass').value,
          name: document.getElementById('admMgrName').value,
          phone: document.getElementById('admMgrPhone').value,
        });
        state.editingManagerId = null;
        showToast(res.message); renderAll();
      } catch (err) { showToast(err.message, 'error'); }
    };
    if (document.getElementById('btnCancelMgrEdit')) document.getElementById('btnCancelMgrEdit').onclick = function () { state.editingManagerId = null; renderAll(); };
    main.querySelectorAll('.adm-mgr-edit').forEach(function (b) {
      b.onclick = function () { state.editingManagerId = b.getAttribute('data-id'); renderAll(); };
    });
    main.querySelectorAll('.adm-mgr-del').forEach(function (b) {
      b.onclick = function () {
        const mId = b.getAttribute('data-id');
        openConfirmModal('ยืนยันลบผู้จัดการแข่งขัน', 'ต้องการลบบัญชีผู้จัดการแข่งขันท่านนี้ใช่หรือไม่?', async function () {
          try { const res = await apiCall('delete_admin_manager', { id: mId }); showToast(res.message); renderAll(); }
          catch (err) { showToast(err.message, 'error'); }
        });
      };
    });

    document.getElementById('admCredForm').onsubmit = async function (e) {
      e.preventDefault();
      try {
        const res = await apiCall('save_admin_settings', {
          adminCredentials: {
            currentPass: document.getElementById('admCurPass').value,
            newUsername: document.getElementById('admNewUser').value,
            newDisplayName: document.getElementById('admNewDisplay').value,
            newPass: document.getElementById('admNewPass').value,
          },
        });
        showToast(res.message); renderAll();
      } catch (err) { showToast(err.message, 'error'); }
    };
  }

  function renderJudgeScoring(main) {
    const jdg = getCurrentJudge();
    if (!jdg) { main.innerHTML = '<div class="card">สำหรับกรรมการตัดสินเท่านั้น</div>'; return; }
    const comp = getComp(jdg.competitionId);
    const crit = getCriteria(jdg.competitionId);
    const isTwoRound = isTwoRoundComp(jdg.competitionId);
    const activeRound = state.judgeScoringRound || 'qualifying';
    const activeRoundLabel = activeRound === 'final' ? 'รอบตัดสิน' : 'รอบคัดเลือก';
    const baseRegs = state.registrations.filter(function (r) { return r.competitionId === jdg.competitionId && r.level === jdg.level; });
    const rankedList = isTwoRound ? buildCompetitionRankedList(jdg.competitionId, jdg.level) : [];
    const qualRankMap = {};
    rankedList.forEach(function (e) {
      if (e.qualifyingRank !== null) qualRankMap[e.reg.id] = e.qualifyingRank;
    });
    const regs = (isTwoRound && activeRound === 'final')
      ? baseRegs.slice().sort(function (a, b) {
          const qa = qualRankMap[a.id] !== undefined ? qualRankMap[a.id] : 9999;
          const qb = qualRankMap[b.id] !== undefined ? qualRankMap[b.id] : 9999;
          const aTop = qa <= 10 ? 0 : 1;
          const bTop = qb <= 10 ? 0 : 1;
          if (aTop !== bTop) return aTop - bTop;
          return qa - qb;
        })
      : baseRegs;

    const cards = regs.map(function (reg, idx) {
      const sch = getSchool(reg.schoolId);
      const isAbsent = Boolean(state.absentRegs[reg.id]);
      const qRank = qualRankMap[reg.id] !== undefined ? qualRankMap[reg.id] : null;
      const isTop10Qual = qRank !== null && qRank <= 10;
      const hasRoundStore = Boolean(state.roundScores[reg.id] || state.roundScoreCriteriaDetails[reg.id]);
      const savedScore = isTwoRound
        ? ((state.roundScores[reg.id] && state.roundScores[reg.id][activeRound] ? state.roundScores[reg.id][activeRound][jdg.id] : undefined)
          !== undefined
            ? state.roundScores[reg.id][activeRound][jdg.id]
            : (activeRound === 'qualifying' && !hasRoundStore && state.scores[reg.id] ? state.scores[reg.id][jdg.id] : undefined))
        : (state.scores[reg.id] ? state.scores[reg.id][jdg.id] : undefined);
      const isLocked = savedScore !== undefined && !state.unlockedScoreCards[reg.id];
      const draft = state.draftCriteriaScores[reg.id] || {};
      const inputsHtml = crit.map(function (c) {
        const val = draft[c.key] !== undefined ? draft[c.key] : '';
        return '<div class="row-between" style="gap:10px;padding:6px 0;border-bottom:1px solid #f1f5f9;">' +
          '<span style="font-size:13px;">' + esc(c.label) + ' <strong style="color:#b45309;">(เต็ม ' + esc(c.max) + ')</strong></span>' +
          '<input type="number" min="0" max="' + esc(c.max) + '" step="0.5" class="input crit-inp" style="width:110px;text-align:right;" data-reg="' + esc(reg.id) + '" data-key="' + esc(c.key) + '" data-max="' + esc(c.max) + '" value="' + esc(val) + '"' + ((isAbsent || isLocked) ? ' disabled' : '') + ' />' +
        '</div>';
      }).join('');

      const sumVal = crit.reduce(function (acc, c) {
        const v = Number(draft[c.key]);
        return acc + (Number.isNaN(v) ? 0 : v);
      }, 0);

      const songMetaHtml = isTwoRound
        ? '<div style="font-size:12px;color:#b45309;margin-top:4px;">🎵 ' +
            esc(activeRound === 'final' ? ('เพลงรอบตัดสิน: ' + (reg.finalSong || '-')) : ('เพลงรอบคัดเลือก: ' + (reg.qualifyingSong || '-'))) +
          '</div>'
        : '';

      const qualRankBadge = isTwoRound && qRank !== null
        ? (isTop10Qual
            ? '<span class="badge badge-emerald">🏆 เข้ารอบตัดสิน (คัดเลือกอันดับที่ ' + qRank + ')</span> '
            : '<span class="badge badge-slate">คัดเลือกอันดับที่ ' + qRank + ' (ไม่เข้าเกณฑ์ 1–10)</span> ')
        : '';

      return '<div class="card stack-sm" style="' + (isAbsent ? 'opacity:0.65;background:#fff1f2;' : '') + '">' +
        '<div class="row-between">' +
          '<div><span class="badge badge-sky">ทีมที่ ' + (idx + 1) + '</span> ' +
          (isTwoRound ? '<span class="badge badge-amber">' + esc(activeRoundLabel) + '</span> ' : '') +
          qualRankBadge +
          '<h3 style="margin:6px 0 2px;">' + esc(sch ? sch.name : '-') + '</h3>' +
          '<div style="font-size:13px;color:#475569;">ผู้เข้าแข่งขัน: ' + esc((reg.students || []).map(function (s) { return s.name; }).join(', ')) + '</div>' +
          songMetaHtml + '</div>' +
          '<div class="row-wrap">' +
            (isAbsent ? '<span class="badge badge-rose">ไม่เข้าร่วมแข่งขัน</span>' : '<span class="badge badge-amber" style="font-size:14px;">รวม: <span id="sum_' + esc(reg.id) + '">' + sumVal.toFixed(2) + '</span> / 100</span>') +
            (!isAbsent && isLocked ? '<button type="button" class="btn btn-outline btn-xs jdg-unlock" data-reg="' + esc(reg.id) + '">✏ แก้ไขคะแนน</button>' : '') +
            (!isAbsent && !isLocked ? '<button type="button" class="btn btn-primary btn-xs jdg-save-one" data-reg="' + esc(reg.id) + '">💾 บันทึกทีมนี้</button>' : '') +
          '</div>' +
        '</div>' +
        inputsHtml +
      '</div>';
    }).join('');

    const roundSwitcherHtml = isTwoRound
      ? '<div class="card row-between" style="border-color:#fde68a;background:#fffbeb;">' +
          '<div><strong>🎵 เลือกรอบการลงคะแนน (2 รอบ)</strong><div style="font-size:12px;color:#92400e;">รอบตัดสินจะนำลำดับที่ 1–10 ของรอบคัดเลือกมาแข่งขัน และประกาศผลรวม 2 รอบ (รอบตัดสิน 1–10 ตามด้วยรอบคัดเลือกที่เหลือต่อท้าย)</div></div>' +
          '<div class="tabs">' +
            '<button type="button" class="tab-btn ' + (activeRound === 'qualifying' ? 'active-amber' : '') + '" id="btnRoundQual">1. รอบคัดเลือก</button>' +
            '<button type="button" class="tab-btn ' + (activeRound === 'final' ? 'active' : '') + '" id="btnRoundFinal">2. รอบตัดสิน (1–10)</button>' +
          '</div>' +
        '</div>'
      : '';

    main.innerHTML =
      '<div class="stack">' +
        '<div class="card row-between">' +
          '<div><h2 style="margin:0;">⚖ ลงคะแนนตัดสิน: ' + esc(comp ? comp.name : '-') + '</h2><p style="margin:4px 0 0;font-size:13px;color:#64748b;">ระดับ: ' + esc(jdg.level) + ' • กรรมการ: ' + esc(jdg.name) + (isTwoRound ? ' • ' + activeRoundLabel : '') + '</p></div>' +
          '<button type="button" class="btn btn-primary" id="btnSaveAllScores">💾 บันทึกคะแนนทั้งหมด</button>' +
        '</div>' +
        roundSwitcherHtml +
        (cards || '<div class="card" style="text-align:center;color:#94a3b8;">ยังไม่มีทีมสมัครแข่งขันในระดับนี้</div>') +
      '</div>';

    if (isTwoRound) {
      document.getElementById('btnRoundQual').onclick = function () {
        state.judgeScoringRound = 'qualifying';
        state.unlockedScoreCards = {};
        initJudgeDrafts('qualifying');
        renderAll();
      };
      document.getElementById('btnRoundFinal').onclick = function () {
        state.judgeScoringRound = 'final';
        state.unlockedScoreCards = {};
        initJudgeDrafts('final');
        renderAll();
      };
    }

    main.querySelectorAll('.crit-inp').forEach(function (inp) {
      inp.oninput = function () {
        const rId = inp.getAttribute('data-reg');
        const cKey = inp.getAttribute('data-key');
        const max = Number(inp.getAttribute('data-max'));
        let val = inp.value === '' ? '' : Number(inp.value);
        if (val !== '' && !Number.isNaN(val)) {
          if (val < 0) val = 0;
          if (val > max) val = max;
          inp.value = String(val);
        }
        if (!state.draftCriteriaScores[rId]) state.draftCriteriaScores[rId] = {};
        state.draftCriteriaScores[rId][cKey] = val;
        const total = crit.reduce(function (acc, c) {
          const n = Number(state.draftCriteriaScores[rId][c.key]);
          return acc + (Number.isNaN(n) ? 0 : n);
        }, 0);
        const sumEl = document.getElementById('sum_' + rId);
        if (sumEl) sumEl.textContent = total.toFixed(2);
      };
    });

    main.querySelectorAll('.jdg-unlock').forEach(function (btn) {
      btn.onclick = function () { state.unlockedScoreCards[btn.getAttribute('data-reg')] = true; renderAll(); };
    });

    main.querySelectorAll('.jdg-save-one').forEach(function (btn) {
      btn.onclick = async function () {
        const rId = btn.getAttribute('data-reg');
        try {
          const res = await apiCall('save_judge_scores', {
            entries: [{ registrationId: rId, criteria: state.draftCriteriaScores[rId] || {} }],
            round: isTwoRound ? activeRound : undefined,
          });
          delete state.unlockedScoreCards[rId];
          showToast(res.message); renderAll();
        } catch (err) { showToast(err.message, 'error'); }
      };
    });

    document.getElementById('btnSaveAllScores').onclick = async function () {
      const entries = regs
        .filter(function (r) { return !state.absentRegs[r.id]; })
        .map(function (r) { return { registrationId: r.id, criteria: state.draftCriteriaScores[r.id] || {} }; });
      try {
        const res = await apiCall('save_judge_scores', {
          entries: entries,
          round: isTwoRound ? activeRound : undefined,
        });
        state.unlockedScoreCards = {};
        showToast(res.message); renderAll();
      } catch (err) { showToast(err.message, 'error'); }
    };
  }

  function renderJudgeAbsent(main) {
    const jdg = getCurrentJudge();
    if (!jdg) { main.innerHTML = '<div class="card">สำหรับกรรมการตัดสินเท่านั้น</div>'; return; }
    const comp = getComp(jdg.competitionId);
    const allRegs = state.registrations.filter(function (r) { return r.competitionId === jdg.competitionId && r.level === jdg.level; });

    function getFilteredAbsentRows() {
      const filtered = allRegs.filter(function (r) {
        const sch = getSchool(r.schoolId);
        const isAb = Boolean(state.absentRegs[r.id]);
        if (state.judgeAbsentFilter === 'absent' && !isAb) return false;
        if (state.judgeAbsentFilter === 'present' && isAb) return false;
        if (state.judgeAbsentSearch) {
          const txt = ((sch ? sch.name : '') + ' ' + (r.students || []).map(function (s) { return s.name; }).join(' ')).toLowerCase();
          if (txt.indexOf(state.judgeAbsentSearch.toLowerCase()) === -1) return false;
        }
        return true;
      });
      return filtered.map(function (r, idx) {
        const sch = getSchool(r.schoolId);
        const isAb = Boolean(state.absentRegs[r.id]);
        return '<tr>' +
          '<td style="text-align:center;">' + (idx + 1) + '</td>' +
          '<td><strong>' + esc(sch ? sch.name : '-') + '</strong></td>' +
          '<td>' + esc((r.students || []).map(function (s) { return s.name; }).join(', ')) + '</td>' +
          '<td>' + (isAb ? '<span class="badge badge-rose">ไม่เข้าร่วมแข่งขัน</span>' : '<span class="badge badge-emerald">เข้าร่วมแข่งขัน</span>') + '</td>' +
          '<td><button type="button" class="btn ' + (isAb ? 'btn-primary' : 'btn-rose') + ' btn-xs toggle-ab" data-reg="' + esc(r.id) + '" data-next="' + (isAb ? '0' : '1') + '">' + (isAb ? '✓ ยกเลิกแจ้งไม่เข้าร่วม' : '🚫 แจ้งไม่เข้าร่วมแข่งขัน') + '</button></td>' +
        '</tr>';
      }).join('') || '<tr><td colspan="5" style="text-align:center;padding:24px;color:#94a3b8;">ไม่พบข้อมูล</td></tr>';
    }

    function bindAbsentButtons() {
      main.querySelectorAll('.toggle-ab').forEach(function (btn) {
        btn.onclick = async function () {
          try {
            const res = await apiCall('toggle_absent', { registrationId: btn.getAttribute('data-reg'), absent: btn.getAttribute('data-next') === '1' });
            showToast(res.message); renderAll();
          } catch (err) { showToast(err.message, 'error'); }
        };
      });
    }

    main.innerHTML =
      '<div class="stack">' +
        '<div class="card row-between">' +
          '<div><h2 style="margin:0;">🚫 แจ้งไม่เข้าร่วมแข่งขัน</h2><p style="margin:4px 0 0;font-size:13px;color:#64748b;">' + esc(comp ? comp.name : '-') + ' • ' + esc(jdg.level) + '</p></div>' +
          '<div class="row-wrap">' +
            '<input type="text" class="input" style="width:200px;" id="abSearch" value="' + esc(state.judgeAbsentSearch) + '" placeholder="ค้นหาโรงเรียน / นักเรียน" />' +
            '<select class="select" style="width:auto;" id="abFilter"><option value="all">ทั้งหมด</option><option value="present"' + (state.judgeAbsentFilter === 'present' ? ' selected' : '') + '>เข้าร่วมแข่งขัน</option><option value="absent"' + (state.judgeAbsentFilter === 'absent' ? ' selected' : '') + '>ไม่เข้าร่วมแข่งขัน</option></select>' +
          '</div>' +
        '</div>' +
        '<div class="table-wrap"><table class="data-table"><thead><tr><th style="text-align:center;">ที่</th><th>โรงเรียน</th><th>ผู้เข้าแข่งขัน</th><th>สถานะ</th><th>ดำเนินการ</th></tr></thead><tbody id="abTableBody">' +
          getFilteredAbsentRows() +
        '</tbody></table></div>' +
      '</div>';

    document.getElementById('abSearch').oninput = function (e) {
      state.judgeAbsentSearch = e.target.value;
      document.getElementById('abTableBody').innerHTML = getFilteredAbsentRows();
      bindAbsentButtons();
    };
    document.getElementById('abFilter').onchange = function (e) { state.judgeAbsentFilter = e.target.value; renderAll(); };
    bindAbsentButtons();
  }

  function renderLogin(main) {
    if (state.activeMenu === 'login') {
      main.innerHTML =
        '<div class="card" style="max-width:920px;margin:20px auto;">' +
          '<div style="text-align:center;">' +
            '<h2 style="margin:0;">🔑 เข้าสู่ระบบบริหารจัดการการแข่งขัน</h2>' +
            '<p style="margin:6px 0 0;font-size:13.5px;color:#64748b;">กรุณาเลือกประเภทระบบที่ต้องการเข้าสู่ระบบ</p>' +
          '</div>' +
          '<div class="role-choice-grid">' +
            '<button type="button" class="role-choice-card" id="btnChooseAdminLogin">' +
              '<div style="width:52px;height:52px;border-radius:16px;background:#fff7ed;color:#ea580c;display:flex;align-items:center;justify-content:center;font-size:24px;">🛡</div>' +
              '<strong style="font-size:16px;color:#1e293b;">ผู้ดูแลระบบ</strong>' +
              '<span style="font-size:12.5px;color:#64748b;">จัดการระบบ กรรมการ และอนุมัติผลการแข่งขัน</span>' +
            '</button>' +
            '<button type="button" class="role-choice-card" id="btnChooseManagerLogin">' +
              '<div style="width:52px;height:52px;border-radius:16px;background:#f5f3ff;color:#7c3aed;display:flex;align-items:center;justify-content:center;font-size:24px;">📄</div>' +
              '<strong style="font-size:16px;color:#1e293b;">ผู้จัดการแข่งขัน</strong>' +
              '<span style="font-size:12.5px;color:#64748b;">จัดการเอกสารและเกณฑ์การให้คะแนนแข่งขัน</span>' +
            '</button>' +
            '<button type="button" class="role-choice-card" id="btnChooseSchoolLogin">' +
              '<div style="width:52px;height:52px;border-radius:16px;background:#ecfdf5;color:#059669;display:flex;align-items:center;justify-content:center;font-size:24px;">🏫</div>' +
              '<strong style="font-size:16px;color:#1e293b;">ระบบโรงเรียน</strong>' +
              '<span style="font-size:12.5px;color:#64748b;">ลงทะเบียนแข่งขัน พิมพ์บัตร และเกียรติบัตร</span>' +
            '</button>' +
            '<button type="button" class="role-choice-card" id="btnChooseJudgeLogin">' +
              '<div style="width:52px;height:52px;border-radius:16px;background:#f0f9ff;color:#0284c7;display:flex;align-items:center;justify-content:center;font-size:24px;">⚖</div>' +
              '<strong style="font-size:16px;color:#1e293b;">ระบบกรรมการ</strong>' +
              '<span style="font-size:12.5px;color:#64748b;">บันทึกคะแนนตัดสินและพิมพ์บัตรกรรมการ</span>' +
            '</button>' +
          '</div>' +
        '</div>';
      document.getElementById('btnChooseAdminLogin').onclick = function () { selectMenu('login-admin'); };
      document.getElementById('btnChooseManagerLogin').onclick = function () { selectMenu('login-manager'); };
      document.getElementById('btnChooseSchoolLogin').onclick = function () { selectMenu('login-school'); };
      document.getElementById('btnChooseJudgeLogin').onclick = function () { selectMenu('login-judge'); };
      return;
    }

    const activeRoleTab = state.activeMenu === 'login-admin'
      ? 'admin'
      : state.activeMenu === 'login-manager'
      ? 'manager'
      : state.activeMenu === 'login-judge'
      ? 'judge'
      : 'school';
    state.loginTab = activeRoleTab;
    const roleMeta = activeRoleTab === 'admin'
      ? { icon: '🛡', title: 'เข้าสู่ระบบ: ผู้ดูแลระบบ', desc: 'สำหรับผู้ดูแลระบบในการบริหารจัดการข้อมูลและอนุมัติผล' }
      : activeRoleTab === 'manager'
      ? { icon: '📄', title: 'เข้าสู่ระบบ: ผู้จัดการแข่งขัน', desc: 'สำหรับผู้จัดการแข่งขันในการจัดการเอกสารและเกณฑ์การตัดสิน' }
      : activeRoleTab === 'judge'
      ? { icon: '⚖', title: 'เข้าสู่ระบบ: ระบบกรรมการ', desc: 'สำหรับคณะกรรมการตัดสินเพื่อบันทึกคะแนนและพิมพ์เอกสาร' }
      : { icon: '🏫', title: 'เข้าสู่ระบบ: ระบบโรงเรียน', desc: 'สำหรับสถานศึกษาในการสมัครแข่งขันและดาวน์โหลดเอกสาร' };

    main.innerHTML =
      '<div class="card" style="max-width:520px;margin:20px auto;">' +
        '<div style="margin-bottom:14px;">' +
          '<button type="button" class="btn btn-outline btn-xs" id="btnBackLoginHub">← กลับไปเลือกประเภทเข้าสู่ระบบ</button>' +
        '</div>' +
        '<div style="text-align:center;margin-bottom:18px;">' +
          '<h2 style="margin:0;">' + roleMeta.icon + ' ' + roleMeta.title + '</h2>' +
          '<p style="margin:4px 0 0;font-size:13px;color:#64748b;">' + roleMeta.desc + '</p>' +
        '</div>' +
        (activeRoleTab === 'school'
          ? '<div class="row-wrap" style="justify-content:center;margin-bottom:14px;">' +
              '<button type="button" class="btn btn-sm ' + (state.schoolAuthMode === 'login' ? 'btn-primary' : 'btn-outline') + '" id="btnSchModeLogin">เข้าสู่ระบบโรงเรียน</button>' +
              '<button type="button" class="btn btn-sm ' + (state.schoolAuthMode === 'register' ? 'btn-amber' : 'btn-outline') + '" id="btnSchModeReg">ลงทะเบียนบัญชีโรงเรียนใหม่</button>' +
            '</div>'
          : '') +
        (activeRoleTab === 'school' && state.schoolAuthMode === 'register'
          ? '<form id="signupForm" class="stack-sm">' +
              '<div><label class="field-label">รหัสสถานศึกษา (8 หลัก) *</label><input type="text" class="input" id="suCode" required /></div>' +
              '<div><label class="field-label">ชื่อโรงเรียน *</label><input type="text" class="input" id="suName" required /></div>' +
              '<div><label class="field-label">ชื่อผู้อำนวยการโรงเรียน *</label><input type="text" class="input" id="suDir" required /></div>' +
              '<div><label class="field-label">เบอร์โทรศัพท์ติดต่อ</label><input type="text" class="input" id="suPhone" /></div>' +
              '<div><label class="field-label">กำหนดรหัสผ่าน (อย่างน้อย 4 ตัว) *</label><input type="password" class="input" id="suPass" required /></div>' +
              '<button type="submit" class="btn btn-amber" style="width:100%;margin-top:8px;">สมัครสมาชิกและเข้าสู่ระบบ</button>' +
            '</form>'
          : '<form id="loginForm" class="stack-sm">' +
              '<div><label class="field-label">' + (activeRoleTab === 'school' ? 'รหัสสถานศึกษา' : 'ชื่อผู้ใช้ (Username)') + '</label><input type="text" class="input" id="loginUser" required placeholder="' + (activeRoleTab === 'school' ? 'เช่น 10112201' : activeRoleTab === 'judge' ? 'เช่น judge1' : activeRoleTab === 'manager' ? 'เช่น manager1' : 'admin') + '" /></div>' +
              '<div><label class="field-label">รหัสผ่าน (Password)</label><input type="password" class="input" id="loginPass" required /></div>' +
              '<button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px;">เข้าสู่ระบบ</button>' +
            '</form>') +
      '</div>';

    document.getElementById('btnBackLoginHub').onclick = function () { selectMenu('login'); };
    if (document.getElementById('btnSchModeLogin')) {
      document.getElementById('btnSchModeLogin').onclick = function () { state.schoolAuthMode = 'login'; renderAll(); };
      document.getElementById('btnSchModeReg').onclick = function () { state.schoolAuthMode = 'register'; renderAll(); };
    }

    if (document.getElementById('loginForm')) {
      document.getElementById('loginForm').onsubmit = async function (e) {
        e.preventDefault();
        try {
          const res = await apiCall('login', {
            loginTab: activeRoleTab,
            username: document.getElementById('loginUser').value,
            password: document.getElementById('loginPass').value,
          });
          showToast(res.message);
          const role = state.authSession.role;
          const fallback = role === 'admin' ? 'admin-manage' : role === 'manager' ? 'admin-competition-manage' : role === 'school' ? 'by-school' : 'judge-scoring';
          const resolvedPost = (role === 'manager' && state.postLoginRedirect && MANAGER_ALLOWED_MENUS.indexOf(state.postLoginRedirect) !== -1)
            ? state.postLoginRedirect
            : (role === 'manager' ? 'admin-competition-manage' : (state.postLoginRedirect || fallback));
          state.activeMenu = resolvedPost;
          state.postLoginRedirect = null;
          if (state.activeMenu === 'judge-scoring') initJudgeDrafts();
          renderAll();
        } catch (err) { showToast(err.message, 'error'); }
      };
    }

    if (document.getElementById('signupForm')) {
      document.getElementById('signupForm').onsubmit = async function (e) {
        e.preventDefault();
        try {
          const res = await apiCall('school_signup', {
            schoolCode: document.getElementById('suCode').value,
            name: document.getElementById('suName').value,
            director: document.getElementById('suDir').value,
            phone: document.getElementById('suPhone').value,
            password: document.getElementById('suPass').value,
          });
          showToast(res.message);
          state.activeMenu = 'register';
          renderAll();
        } catch (err) { showToast(err.message, 'error'); }
      };
    }
  }

  function renderMainContent() {
    const main = document.getElementById('appMain');
    if (!main) return;
    if (state.authSession.role === 'manager' && MANAGER_ALLOWED_MENUS.indexOf(state.activeMenu) === -1 && state.activeMenu.indexOf('login') !== 0) {
      return renderAdminCompManage(main);
    }
    switch (state.activeMenu) {
      case 'home': return renderHome(main);
      case 'register': return renderRegister(main);
      case 'competitions': return renderCompetitions(main);
      case 'schedule': return renderSchedule(main);
      case 'by-school': return renderBySchool(main);
      case 'by-activity': return renderByActivity(main);
      case 'student-card': return renderCardsPage(main, 'student');
      case 'coach-card': return renderCardsPage(main, 'coach');
      case 'judge-card': return renderCardsPage(main, 'judge');
      case 'judge-cert': return renderJudgeCert(main);
      case 'school-cert': return renderSchoolCert(main);
      case 'school-results': return renderSchoolResults(main);
      case 'results': return renderResults(main);
      case 'admin-competition-manage': return renderAdminCompManage(main);
      case 'admin-manage': return renderAdminManage(main);
      case 'judge-scoring': return renderJudgeScoring(main);
      case 'judge-absent': return renderJudgeAbsent(main);
      case 'login':
      case 'login-admin':
      case 'login-manager':
      case 'login-school':
      case 'login-judge':
        return renderLogin(main);
      default: return renderHome(main);
    }
  }

  function updateCountdown() {
    const target = new Date('2027-02-17T08:30:00+07:00').getTime();
    const diff = target - Date.now();
    const txtEl = document.getElementById('countdownText');
    const badgeEl = document.getElementById('countdownBadge');
    const daysEl = document.getElementById('countdownDays');
    if (diff <= 0) {
      if (txtEl) txtEl.textContent = 'ถึงวันจัดการแข่งขันวันมาฆบูชา ครั้งที่ 14 แล้ว!';
      if (badgeEl) badgeEl.classList.add('hidden');
    } else {
      if (txtEl) txtEl.textContent = 'นับถอยหลังสู่วันแข่งขัน (17 กุมภาพันธ์ 2570):';
      if (badgeEl) badgeEl.classList.remove('hidden');
      if (daysEl) daysEl.textContent = String(Math.floor(diff / (1000 * 60 * 60 * 24)));
    }
  }

  function renderAll() {
    renderLayoutChrome();
    renderMainContent();
  }

  // Bind global header/sidebar controls
  document.addEventListener('click', function () {
    if (state.topLoginMenuOpen) {
      state.topLoginMenuOpen = false;
      renderLayoutChrome();
    }
  });
  document.getElementById('btnMobileMenu').onclick = function () { state.mobileMenuOpen = !state.mobileMenuOpen; renderLayoutChrome(); };
  document.getElementById('mobileOverlay').onclick = function () { state.mobileMenuOpen = false; renderLayoutChrome(); };
  document.getElementById('btnDesktopSidebar').onclick = function () { state.desktopSidebarOpen = !state.desktopSidebarOpen; renderLayoutChrome(); };
  document.getElementById('btnHideSidebarInner').onclick = function () { state.desktopSidebarOpen = false; renderLayoutChrome(); };
  document.getElementById('brandLogoBtn').onclick = function () { selectMenu('home'); };

  updateCountdown();
  setInterval(updateCountdown, 60000);
  renderAll();
})();
