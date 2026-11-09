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
 */
function getSemesterNumber(sem) {
  if (sem == null) return null;
  const raw = String(sem).trim().toUpperCase();
  if (!raw) return null;

  const ysMatch = raw.match(/^(?:SEM(?:ESTER)?\s*)?([1-4])\s*-\s*([12])(?:\s*SEM(?:ESTER)?)?$/);
  if (ysMatch) {
    return (Number(ysMatch[1]) - 1) * 2 + Number(ysMatch[2]);
  }

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
 * Returns true if two semester values represent the same semester
 * (e.g., "1-2" and "2" and "Semester II" all match).
 */
function isSameSemester(semA, semB) {
  const a = String(semA || '').trim();
  const b = String(semB || '').trim();
  if (!a || !b) return a === b;

  const numA = getSemesterNumber(a);
  const numB = getSemesterNumber(b);
  if (numA !== null && numB !== null) {
    return numA === numB;
  }

  return a.toUpperCase() === b.toUpperCase();
}

module.exports = {
  getSemesterNumber,
  isSameSemester
};

