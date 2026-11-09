/**
 * Helpers for deriving dynamic semester labels and submitted subject lists
 * for the Student Completion Certificate PDF.
 */

const ROMAN_SEMESTERS = {
  I: 1,
  II: 2,
  III: 3,
  IV: 4,
  V: 5,
  VI: 6,
  VII: 7,
  VIII: 8,
  IX: 9,
  X: 10
};

/**
 * Parses a semester code/label into a positive integer semester number (1, 2, 3, 4...).
 * Supports Y-S codes ("1-1" -> 1, "1-2" -> 2, "2-1" -> 3, "2-2" -> 4),
 * plain numbers ("1", "2"), ordinals ("2nd", "3rd Semester"), and Roman numerals ("II", "Semester III").
 * Returns null if the input cannot be resolved to a semester number.
 */
export function getSemesterNumber(sem) {
  if (sem == null) return null;
  const raw = String(sem).trim().toUpperCase();
  if (!raw) return null;

  // Match Year-Semester notation such as "1-1", "1-2", "2-1", "2-2", "3-1", "3-2", "4-1", "4-2"
  const ysMatch = raw.match(/^(?:SEM(?:ESTER)?\s*)?([1-4])\s*-\s*([12])(?:\s*SEM(?:ESTER)?)?$/);
  if (ysMatch) {
    return (Number(ysMatch[1]) - 1) * 2 + Number(ysMatch[2]);
  }

  // Strip common wrappers like "Semester", "Sem", separators
  const cleaned = raw
    .replace(/\bSEMESTERS?\b/g, ' ')
    .replace(/\bSEM\b/g, ' ')
    .replace(/[:\-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return null;

  if (ROMAN_SEMESTERS[cleaned] != null) {
    return ROMAN_SEMESTERS[cleaned];
  }

  const numMatch = cleaned.match(/^(\d+)(?:ST|ND|RD|TH)?$/);
  if (numMatch) {
    const n = parseInt(numMatch[1], 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  return null;
}

/**
 * Formats a positive integer into its English ordinal ("1st", "2nd", "3rd", "4th", ...).
 */
export function toOrdinal(n) {
  const num = Number(n);
  if (!Number.isFinite(num) || num <= 0) return '';
  const mod100 = num % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${num}th`;
  switch (num % 10) {
    case 1: return `${num}st`;
    case 2: return `${num}nd`;
    case 3: return `${num}rd`;
    default: return `${num}th`;
  }
}

/**
 * Converts any stored semester identifier into ordinal form ("1st", "2nd", "3rd", "4th").
 */
export function formatOrdinalSemester(sem) {
  const num = getSemesterNumber(sem);
  if (num !== null) {
    return toOrdinal(num);
  }
  const cleaned = String(sem || '')
    .replace(/\bsemesters?\b/gi, '')
    .trim();
  return cleaned;
}

/**
 * Formats a Date or ISO timestamp as DD/MM/YYYY.
 */
export function formatDateDDMMYYYY(dateInput) {
  if (!dateInput) return '';
  const d = new Date(dateInput);
  if (Number.isNaN(d.getTime()) || d.getTime() <= 0) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/**
 * Builds a clear subject display title for both core and pedagogy/group subjects.
 */
export function formatCertificateSubjectName(assignment) {
  const groupName = String(assignment?.groupSubjectName || '').trim();
  const subName = String(assignment?.subjectId?.subName || '').trim();

  if (groupName && subName) {
    const gLower = groupName.toLowerCase();
    const sLower = subName.toLowerCase();
    if (gLower === sLower || gLower.includes(sLower)) return groupName;
    if (sLower.includes(gLower)) return subName;
    return `${groupName} (${subName})`;
  }

  return groupName || subName || 'Untitled Subject';
}

function collectOrderedUniqueSemesters(items, fallbackSem = '') {
  const seen = new Map();
  for (const item of items) {
    const raw = item?.subjectId?.semester || fallbackSem || '';
    const num = getSemesterNumber(raw);
    const ord = formatOrdinalSemester(raw);
    if (!ord) continue;
    const key = num !== null ? `N:${num}` : `S:${ord.toUpperCase()}`;
    if (!seen.has(key)) {
      seen.set(key, { num: num ?? Number.MAX_SAFE_INTEGER, label: ord });
    }
  }
  return Array.from(seen.values())
    .sort((a, b) => a.num - b.num || a.label.localeCompare(b.label))
    .map(entry => entry.label);
}

function joinLabelList(labels) {
  if (labels.length === 0) return '';
  if (labels.length === 1) return labels[0];
  if (labels.length === 2) return `${labels[0]} & ${labels[1]}`;
  return `${labels.slice(0, -1).join(', ')} & ${labels[labels.length - 1]}`;
}

/**
 * Derives all dynamic student, semester, completion date, and submitted subject
 * fields for CertificatePDF from user/profile data and submitted assignments.
 */
export function deriveCertificateData({ user = {}, assignments = [], completionDate = '' } = {}) {
  const list = Array.isArray(assignments) ? assignments.filter(Boolean) : [];
  const regularAssignments = list.filter(a => a.mode !== 'Supply');
  const supplyAssignments = list.filter(a => a.mode === 'Supply');

  const assignmentStudent = list.find(a => a?.studentId && typeof a.studentId === 'object')?.studentId || {};

  const collegeName =
    user?.collegeId?.collegeName ||
    user?.collegeName ||
    assignmentStudent?.collegeId?.collegeName ||
    'ADIKAVI NANNAYA UNIVERSITY AFFILIATED COLLEGE';

  const fullName = user?.fullName || assignmentStudent?.fullName || 'Student Name';
  const regdNo = user?.regdNo || assignmentStudent?.regdNo || 'Roll Number';
  const courseName =
    user?.courseId?.courseName ||
    user?.courseName ||
    assignmentStudent?.courseId?.courseName ||
    '';

  const rawCurrentSemester = user?.currentSemester || assignmentStudent?.currentSemester || '';

  const regularSems = collectOrderedUniqueSemesters(regularAssignments);
  const supplySems = collectOrderedUniqueSemesters(supplyAssignments);

  let semesterDisplay;
  let isSupplyOnly = false;

  if (regularSems.length > 0) {
    semesterDisplay = joinLabelList(regularSems);
  } else if (supplySems.length > 0 && regularAssignments.length === 0) {
    semesterDisplay = joinLabelList(supplySems);
    isSupplyOnly = true;
  } else {
    semesterDisplay = formatOrdinalSemester(rawCurrentSemester);
  }

  let effectiveCompletionDate = String(completionDate || '').trim();
  if (!effectiveCompletionDate && list.length > 0) {
    const timestamps = list
      .map(a => new Date(a.submittedAt || a.updatedAt || a.createdAt || 0).getTime())
      .filter(t => Number.isFinite(t) && t > 0);
    if (timestamps.length > 0) {
      effectiveCompletionDate = formatDateDDMMYYYY(Math.max(...timestamps));
    }
  }

  const orderedAssignments = [...regularAssignments, ...supplyAssignments];
  const subjects = orderedAssignments.map((assignment, index) => {
    const rowSem = assignment?.subjectId?.semester || rawCurrentSemester;
    const rowSemOrdinal = formatOrdinalSemester(rowSem);
    const submittedDate =
      formatDateDDMMYYYY(assignment?.submittedAt || assignment?.updatedAt || assignment?.createdAt) ||
      effectiveCompletionDate ||
      '—';

    return {
      id: assignment?._id || `sub-${index}`,
      sNo: index + 1,
      subCode: String(assignment?.subjectId?.subCode || '').trim() || '—',
      subName: formatCertificateSubjectName(assignment),
      semesterLabel: rowSemOrdinal ? `${rowSemOrdinal} Sem` : '—',
      mode: assignment?.mode === 'Supply' ? 'Supply' : 'Regular',
      submittedOn: submittedDate
    };
  });

  return {
    collegeName,
    fullName,
    regdNo,
    courseName,
    semesterDisplay,
    isSupplyOnly,
    completionDate: effectiveCompletionDate || formatDateDDMMYYYY(new Date()),
    subjects
  };
}
