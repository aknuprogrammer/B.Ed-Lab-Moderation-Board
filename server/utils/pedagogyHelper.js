/**
 * Pedagogy Resolution Helper
 * 
 * Accurately maps B.Ed elective/choice practical subjects (studentChoice === 'C')
 * to student pedagogy methods (Pedagogy-I vs Pedagogy-II) regardless of semester,
 * numbering, or number of elective subjects in the curriculum.
 */

/**
 * Resolves whether a choice subject corresponds to Pedagogy-I (index 0) or Pedagogy-II (index 1),
 * or index N if there are more pedagogies.
 *
 * Rules (in priority order):
 * 1. Explicit `mappedPedagogy` on the Subject document (e.g. 'pedagogy1Name', '1', '2', 'I', 'II').
 * 2. Explicit Pedagogy-II indicators in subCode, aliasName, or subName (P2, II, B, etc.).
 * 3. Explicit Pedagogy-I indicators in subCode, aliasName, or subName (P1, I, A, etc.).
 * 4. Fallback: sequential index modulo number of pedagogies (fallbackIndex % numPedagogies).
 */
function resolvePedagogyIndex(subject, fallbackIndex = 0, numPedagogies = 2) {
  if (!subject) return 0;

  const numPed = Math.max(1, typeof numPedagogies === 'number' && !isNaN(numPedagogies) ? numPedagogies : 2);

  // 1. Explicit mappedPedagogy attribute
  const mapped = (subject.mappedPedagogy || '').toString().trim().toLowerCase();
  if (mapped) {
    if (mapped.includes('1') || mapped === 'i' || mapped.endsWith('-i') || mapped.includes('pedagogy1')) return 0 % numPed;
    if (mapped.includes('2') || mapped === 'ii' || mapped.endsWith('-ii') || mapped.includes('pedagogy2')) return 1 % numPed;
  }

  const code = (subject.subCode || '').toString().trim().toUpperCase();
  const name = (subject.subName || '').toString().trim();
  const alias = (subject.aliasName || '').toString().trim().toUpperCase();

  // 2. Explicit check for Pedagogy-II first (since roman numeral 'II' contains 'I')
  const isPedagogy2 =
    /Pedagogy\s*[-–—]?\s*II(?![I-Za-z0-9])/i.test(name) ||
    /Pedagogy\s*[-–—]?\s*2(?![0-9])/i.test(name) ||
    /(?:^|[-_])P2(?:AC)?\b/i.test(alias) ||
    alias.endsWith('-II') || alias.endsWith('_II') || alias.endsWith('II') ||
    code.endsWith('B') ||
    (code.endsWith('2') && !code.includes('2-'));

  if (isPedagogy2) {
    return 1 % numPed;
  }

  // 3. Explicit check for Pedagogy-I
  const isPedagogy1 =
    /Pedagogy\s*[-–—]?\s*I(?![I-Za-z0-9])/i.test(name) ||
    /Pedagogy\s*[-–—]?\s*1(?![0-9])/i.test(name) ||
    /(?:^|[-_])P1(?:AC)?\b/i.test(alias) ||
    alias.endsWith('-I') || alias.endsWith('_I') || (alias.endsWith('I') && !alias.endsWith('II')) ||
    code.endsWith('A') ||
    (code.endsWith('1') && !code.includes('1-'));

  if (isPedagogy1) {
    return 0 % numPed;
  }

  // 4. Safe modulo fallback
  const safeFallback = typeof fallbackIndex === 'number' && !isNaN(fallbackIndex) ? fallbackIndex : 0;
  return safeFallback % numPed;
}

/**
 * Given a student (with populated groupId) and a subject, resolves the appropriate
 * pedagogy name string (e.g., 'MATHEMATICS', 'PHYSICAL SCIENCES') from the student's group.
 */
function getStudentPedagogyName(student, subject, fallbackIndex = 0) {
  const groupSubs = (student?.groupId && Array.isArray(student.groupId.subjects))
    ? student.groupId.subjects.filter(s => s && String(s).trim() !== '')
    : [];

  if (groupSubs.length === 0) {
    return '';
  }

  const pedIndex = resolvePedagogyIndex(subject, fallbackIndex, groupSubs.length);
  const selected = (pedIndex < groupSubs.length && groupSubs[pedIndex]) ? groupSubs[pedIndex] : groupSubs[0];
  return selected ? String(selected).trim() : '';
}

module.exports = {
  resolvePedagogyIndex,
  getStudentPedagogyName
};
