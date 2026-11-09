import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import aknuLogo from '../assets/aknu_logo.png';
import nannayaLogo from '../assets/nannaya_logo.png';
import { deriveCertificateData } from '../utils/certificateHelpers';

// Register Telugu Font for any potential Telugu characters in college names
Font.register({
  family: 'TeluguMandali',
  src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/mandali/Mandali-Regular.ttf'
});

const BORDER_COLOR = '#1f2937';
const PAGE_INSET = 18;
const FRAME_BORDER = 2;

const styles = StyleSheet.create({
  pageCanvas: {
    flexDirection: 'column',
    padding: PAGE_INSET,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 12,
    color: '#111827',
  },
  borderFrame: {
    flexGrow: 1,
    flexDirection: 'column',
    borderWidth: FRAME_BORDER,
    borderStyle: 'solid',
    borderColor: BORDER_COLOR,
    backgroundColor: '#ffffff',
    paddingHorizontal: 30,
    paddingTop: 16,
    paddingBottom: 16,
  },
  univHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: '#fcc203',
    paddingBottom: 10,
  },
  univTextContainer: {
    flexGrow: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  aknuTitle: {
    fontSize: 17,
    fontFamily: 'Helvetica-Bold',
    color: '#115e59',
    textAlign: 'center',
    marginBottom: 3,
    textTransform: 'uppercase',
  },
  aknuTelugu: {
    fontSize: 14,
    fontFamily: 'TeluguMandali',
    color: '#115e59', // Optional dark red or black
    textAlign: 'center',
    marginBottom: 2,
  },
  aknuLocation: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#1f2937',
    textAlign: 'center',
    marginBottom: 2,
  },
  aknuAccreditation: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 2,
  },
  aknuTagline: {
    fontSize: 8.5,
    color: '#111827',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  logoImg: {
    width: 54,
    height: 54,
    objectFit: 'contain',
  },
  logoImgRight: {
    width: 52,
    height: 52,
    objectFit: 'contain',
  },
  certificateTitle: {
    fontSize: 20,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 12,
    textDecoration: 'underline',
  },
  bodyText: {
    fontSize: 12,
    lineHeight: 1.65,
    textAlign: 'justify',
    marginBottom: 12,
  },
  fillBlank: {
    fontFamily: 'Helvetica-Bold',
    textDecoration: 'none',
  },
  blankUnderline: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
  },
  subjectsSection: {
    marginTop: 2,
    marginBottom: 8,
  },
  subjectsHeading: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#115e59',
    textTransform: 'uppercase',
    marginBottom: 5,
    letterSpacing: 0.4,
  },
  tableContainer: {
    borderWidth: 0.75,
    borderColor: '#cbd5e1',
    borderStyle: 'solid',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#115e59',
    color: '#ffffff',
    fontFamily: 'Helvetica-Bold',
    fontSize: 8.5,
    paddingVertical: 5,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 0.5,
    borderTopColor: '#e2e8f0',
    borderTopStyle: 'solid',
    fontSize: 8.5,
    color: '#1f2937',
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignItems: 'center',
  },
  tableRowAlt: {
    backgroundColor: '#f8fafc',
  },
  colSno: {
    width: '6%',
    textAlign: 'center',
  },
  colCode: {
    width: '14%',
    paddingHorizontal: 4,
  },
  colSubject: {
    width: '44%',
    paddingHorizontal: 4,
  },
  colSemester: {
    width: '12%',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  colMode: {
    width: '10%',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  colDate: {
    width: '14%',
    textAlign: 'center',
    paddingHorizontal: 2,
  },
  footer: {
    marginTop: 'auto',
    flexDirection: 'row',
    justifyContent: 'flex-end',
    width: '100%',
    paddingTop: 14,
  },
  controllerSign: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  controllerSignText: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    marginTop: 28,
  }
});

const CertificatePDF = ({ user, assignments = [], completionDate }) => {
  const {
    collegeName,
    fullName,
    regdNo,
    semesterDisplay,
    isSupplyOnly,
    completionDate: effectiveDate,
    subjects
  } = deriveCertificateData({ user, assignments, completionDate });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.pageCanvas}>
        <View style={styles.borderFrame}>
          {/* Header */}
          <View style={styles.univHeader}>
            <Image src={aknuLogo} style={styles.logoImg} />
            <View style={styles.univTextContainer}>
              <Text style={styles.aknuTitle}>ADIKAVI NANNAYA UNIVERSITY</Text>
              <Text style={styles.aknuTelugu}>ఆదికవి నన్నయ విశ్వవిద్యాలయం</Text>
              <Text style={styles.aknuLocation}>RAJAMAHENDRAVARAM, ANDHRA PRADESH INDIA - 533296.</Text>
              <Text style={styles.aknuAccreditation}>Accredited by NAAC with 'B+' Grade ISO 9001:2025 Certified 5 Star Rated</Text>
              <Text style={styles.aknuTagline}>Largest State University in Andhra Pradesh in terms of Affiliation</Text>
            </View>
            <Image src={nannayaLogo} style={styles.logoImgRight} />
          </View>
          
          {/* Title */}
          <Text style={styles.certificateTitle}>CERTIFICATE</Text>
          
          {/* Body */}
          <Text style={styles.bodyText}>
            {'This is to certify that Mr/Mrs '}
            <Text style={styles.fillBlank}>{fullName}</Text>
            {', a student of '}
            <Text style={styles.fillBlank}>{collegeName}</Text>
            {' bearing Regd.No '}
            <Text style={styles.fillBlank}>{regdNo}</Text>
            {' has successfully submitted his/her '}
            {semesterDisplay ? (
              <>
                <Text style={styles.fillBlank}>{semesterDisplay}</Text>
                {' '}
              </>
            ) : null}
            {`semester ${isSupplyOnly ? 'supplementary ' : ''}projects/records${subjects.length > 0 ? ` for the following ${subjects.length === 1 ? 'subject' : 'subjects'}` : ''} through online portal on `}
            <Text style={styles.fillBlank}>{effectiveDate}</Text>
            {'.'}
          </Text>

          {/* Dynamic Submitted Subjects Table */}
          {subjects.length > 0 && (
            <View style={styles.subjectsSection}>
              <Text style={styles.subjectsHeading}>Submitted Practical Records / Subjects ({subjects.length})</Text>
              <View style={styles.tableContainer}>
                <View style={styles.tableHeader} fixed>
                  <Text style={styles.colSno}>S.No</Text>
                  <Text style={styles.colCode}>Subject Code</Text>
                  <Text style={styles.colSubject}>Subject Name</Text>
                  <Text style={styles.colSemester}>Semester</Text>
                  <Text style={styles.colMode}>Mode</Text>
                  <Text style={styles.colDate}>Submitted On</Text>
                </View>
                {subjects.map((sub, idx) => (
                  <View
                    key={sub.id}
                    wrap={false}
                    style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : null]}
                  >
                    <Text style={styles.colSno}>{sub.sNo}</Text>
                    <Text style={styles.colCode}>{sub.subCode}</Text>
                    <Text style={styles.colSubject}>{sub.subName}</Text>
                    <Text style={styles.colSemester}>{sub.semesterLabel}</Text>
                    <Text style={styles.colMode}>{sub.mode}</Text>
                    <Text style={styles.colDate}>{sub.submittedOn}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Footer Signature */}
          <View style={styles.footer} wrap={false}>
            <View style={styles.controllerSign}>
              <Text style={styles.controllerSignText}>CONTROLLER OF EXAMINATIONS</Text>
            </View>
          </View>
        </View>
      </Page>
    </Document>
  );
};

export default CertificatePDF;
