/**
 * Validates the scanned QR Code payload against the logged-in student's roll number
 * and the target assignment's subject code / group subject name.
 * 
 * Payload standard format: `${rollNumber}-${subjectCode}-${semester}`
 * Examples:
 *   - '256059202052-P-ED-10-1-1'
 *   - '256059202052-MATHEMATICS-1-1'
 *   - '240011223344-BED201-2'
 */
function normalize(str) {
  return (str || '').toString().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

exports.validateQrPayload = (qrData, { userRegdNo, subCode, groupSubjectName, subName }) => {
  if (!qrData || typeof qrData !== 'string') {
    return {
      valid: false,
      message: 'Document Verification Failed: QR Code data was not detected on the submitted record.'
    };
  }

  const clean = normalize(qrData);
  const normRoll = normalize(userRegdNo);
  const normSubCode = normalize(subCode);
  const normGroup = normalize(groupSubjectName);

  // 1. Student Roll Number verification
  if (normRoll && !clean.includes(normRoll)) {
    return {
      valid: false,
      message: `Student Mismatch: The QR code in the uploaded document does not match your Roll Number (${userRegdNo}). You can only upload your own practical record.`
    };
  }

  // 2. Subject Code verification
  let subMatches = false;
  if (normSubCode && clean.includes(normSubCode)) subMatches = true;
  if (normGroup && clean.includes(normGroup)) subMatches = true;

  if (!subMatches) {
    const expectedTarget = groupSubjectName || subCode || subName || 'this subject';
    return {
      valid: false,
      message: `Subject Mismatch: The QR code in the uploaded document is not for '${expectedTarget}'. Please select and upload the correct record file for this subject.`
    };
  }

  return { valid: true };
};
