import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';
import aknuLogo from '../assets/aknu_logo.png';
import nannayaLogo from '../assets/nannaya_logo.png';

// Register Telugu Font from Google Fonts raw repository to properly render Telugu characters in PDF
Font.register({
  family: 'TeluguMandali',
  src: 'https://raw.githubusercontent.com/google/fonts/main/ofl/mandali/Mandali-Regular.ttf'
});

const BORDER_COLOR = '#1f2937';
const PAGE_INSET = 14;
const FRAME_BORDER = 1.5;

const styles = StyleSheet.create({
  pageCanvas: {
    flexDirection: 'column',
    padding: PAGE_INSET,
    backgroundColor: '#ffffff',
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#111827',
  },
  borderFrame: {
    flexGrow: 1,
    flexDirection: 'column',
    borderWidth: FRAME_BORDER,
    borderStyle: 'solid',
    borderColor: BORDER_COLOR,
    backgroundColor: '#ffffff',
    paddingHorizontal: 28,
    paddingTop: 10,
    paddingBottom: 10,
  },
  headerTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  titleLine: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    textAlign: 'left',
  },
  headerRegdNo: {
    fontSize: 9.5,
    fontFamily: 'Helvetica',
    color: '#111827',
    textAlign: 'right',
  },
  univHeader: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#fcc203',
    paddingBottom: 5,
  },
  univTextContainer: {
    flexGrow: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  logoLeft: {
    width: 46,
    height: 46,
    objectFit: 'contain',
  },
  logoRight: {
    width: 46,
    height: 46,
    objectFit: 'contain',
  },
  univTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#115e59',
    textAlign: 'center',
  },
  univSubtitle: {
    fontSize: 10.5,
    fontFamily: 'TeluguMandali',
    color: '#115e59',
    marginTop: 2,
    textAlign: 'center',
  },
  univLocation: {
    fontSize: 8,
    color: '#4b5563',
    marginTop: 3,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  univAccreditation: {
    fontSize: 7,
    color: '#374151',
    marginTop: 3,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  univAffiliation: {
    fontSize: 7,
    color: '#374151',
    marginTop: 2,
    textAlign: 'center',
    fontFamily: 'Helvetica-Bold',
  },
  certTitle: {
    fontSize: 20,
    fontFamily: 'Times-Italic',
    textAlign: 'center',
    color: '#111827',
    marginTop: 10,
    marginBottom: 10,
  },
  middle: {
    flexGrow: 1,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    paddingTop: 6,
    paddingBottom: 10,
  },
  bodyColumn: {
    width: '92%',
    maxWidth: 450,
    alignSelf: 'center',
  },
  bodyLine: {
    fontSize: 11.5,
    lineHeight: 1.7,
    textAlign: 'left',
    marginBottom: 8,
  },
  bodyValueBold: {
    fontFamily: 'Helvetica-Bold',
  },
  undertakingTitle: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 4,
    color: '#111827',
  },
  undertakingText: {
    fontSize: 9.5,
    lineHeight: 1.45,
    textAlign: 'justify',
    color: '#111827',
    marginBottom: 15,
    width: '92%',
    alignSelf: 'center',
  },
  studentSigRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginBottom: 25,
  },
  signaturesBlock: {
    marginTop: 6,
    marginBottom: 6,
  },
  sigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sigCol: {
    width: '45%',
    borderTopWidth: 0.5,
    borderTopColor: '#111827',
    paddingTop: 5,
  },
  sigText: {
    fontSize: 8,
    textAlign: 'center',
    color: '#374151',
  },
  footer: {
    marginTop: 'auto',
    paddingTop: 6,
    paddingBottom: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    borderTopWidth: 0.5,
    borderTopColor: '#e5e7eb',
    width: '100%',
  },
  footerDate: {
    fontSize: 8.5,
    color: '#4b5563',
  },
  footerRight: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  pageNumRight: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Bold',
    color: '#6b7280',
    marginBottom: 3,
    textAlign: 'right',
  },
  barcodeImg: {
    width: 120,
    height: 32,
    objectFit: 'contain',
    alignSelf: 'flex-end',
  },
  footerRegdNo: {
    fontSize: 8.5,
    fontFamily: 'Helvetica',
    color: '#111827',
    marginTop: 2,
    textAlign: 'center',
  },
  blankFill: {
    flexGrow: 1,
    backgroundColor: '#ffffff',
  }
});

// Styles for Teaching Observation Report Pages
const reportStyles = StyleSheet.create({
  reportTitle: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 12,
    letterSpacing: 0.5,
    color: '#111827',
  },
  metaGrid: {
    flexDirection: 'column',
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metaCol: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '48%',
  },
  metaColFull: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  metaLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  metaLine: {
    flexGrow: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#9ca3af',
    borderStyle: 'dotted',
    marginLeft: 6,
    height: 12,
  },
  dividerDashed: {
    borderBottomWidth: 1,
    borderBottomColor: '#374151',
    borderStyle: 'dashed',
    marginVertical: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginTop: 14,
    marginBottom: 8,
  },
  itemGroup: {
    marginLeft: 6,
    marginBottom: 12,
  },
  itemLabel: {
    fontSize: 10.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
    marginTop: 12,
    marginBottom: 8,
  },
  subItemRow: {
    marginLeft: 12,
    marginBottom: 15,
    marginTop: 3,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  subItemLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica',
    color: '#111827',
  },
  subItemDots: {
    flexGrow: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: '#6b7280',
    borderStyle: 'dotted',
    marginLeft: 6,
    height: 14,
  },
  subNoteText: {
    fontSize: 8.5,
    fontFamily: 'Helvetica-Oblique',
    color: '#4b5563',
    marginLeft: 12,
    marginTop: 0,
    marginBottom: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    borderWidth: 0.5,
    borderColor: '#374151',
    backgroundColor: '#f9fafb',
    marginTop: 10,
  },
  tableHeaderColLeft: {
    width: '45%',
    padding: 6,
    borderRightWidth: 0.5,
    borderRightColor: '#374151',
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  tableHeaderColRight: {
    width: '55%',
    padding: 6,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderLeftWidth: 0.5,
    borderRightWidth: 0.5,
    borderColor: '#374151',
    minHeight: 34,
  },
  tableColNum: {
    width: '45%',
    padding: 6,
    borderRightWidth: 0.5,
    borderRightColor: '#374151',
    fontSize: 9.5,
    fontFamily: 'Helvetica',
  },
  tableColAct: {
    width: '55%',
    padding: 6,
    fontSize: 9.5,
  },
  sigBlock: {
    marginTop: 'auto',
    marginBottom: 12,
    paddingTop: 24,
  },
  sigRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  sigCol: {
    width: '42%',
  },
  sigLine: {
    borderTopWidth: 0.5,
    borderTopColor: '#111827',
    paddingTop: 6,
    textAlign: 'center',
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    color: '#111827',
  },
  dateLine: {
    fontSize: 9.5,
    fontFamily: 'Helvetica-Bold',
    marginTop: 10,
    textAlign: 'center',
    color: '#111827',
  }
});

function formatFooterDate() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function formatSemester(sem) {
  const s = String(sem || '').trim();
  if (s === '1' || s.toUpperCase() === 'I' || s.toUpperCase() === 'SEMESTER I') return 'Semester I';
  if (s === '2' || s.toUpperCase() === 'II' || s.toUpperCase() === 'SEMESTER II') return 'Semester II';
  if (s === '3' || s.toUpperCase() === 'III' || s.toUpperCase() === 'SEMESTER III') return 'Semester III';
  if (s === '4' || s.toUpperCase() === 'IV' || s.toUpperCase() === 'SEMESTER IV') return 'Semester IV';
  return s ? `Semester ${s}` : 'Semester II';
}

const BarcodePDF = ({ assignment, barcodeDataUrl, user }) => {
  const student = assignment.studentId || {};
  const collegeName = student.collegeId?.collegeName || user?.collegeName || "ADIKAVI NANNAYA UNIVERSITY AFFILIATED COLLEGE";
  const courseName = student.courseId?.courseName || user?.courseName || "B.Ed. Programme";
  
  const rawSem = student.currentSemester || assignment.subjectId?.semester || "2";
  const formattedSemester = formatSemester(rawSem);
  
  const fullName = student.fullName || user?.fullName || "Student Name";
  const regdNo = student.regdNo || user?.regdNo || "Roll Number";
  const subjectName = assignment.groupSubjectName || assignment.subjectId?.subName || "Subject Name";
  const subjectCode = assignment.subjectId?.subCode || "Subject Code";

  // We rely entirely on barcodeDataUrl passed from the parent component
  let effectiveBarcodeUrl = barcodeDataUrl;

  // Check if Pedagogy Subject in 2nd or 3rd Semester
  const semStr = String(rawSem).trim().toUpperCase();
  const is2ndOr3rdSem = semStr === '2' || semStr === '3' || semStr.includes('II') || semStr.includes('III') || semStr.includes('SEMESTER II') || semStr.includes('SEMESTER III');
  
  const subNameLower = subjectName.toLowerCase();
  const isPedagogySubject = !!assignment.groupSubjectName || 
                            assignment.subjectId?.studentChoice === 'C' || 
                            assignment.subjectId?.studentChoice === 'c' ||
                            subNameLower.includes('pedagogy');

  const isPedagogy2ndOr3rdSem = is2ndOr3rdSem && isPedagogySubject;

  const pagesCount = Math.max(1, Math.min(99, Math.floor(assignment.pagesRequired || 10)));
  const totalPages = isPedagogy2ndOr3rdSem ? 26 : (pagesCount + 1);
  const footerDate = formatFooterDate();

  const renderReportPage1 = (repIdx, pageNum) => (
    <Page key={`rep-${repIdx}-p1`} size="A4" style={styles.pageCanvas}>
      <View style={styles.borderFrame}>
        <View style={styles.headerTopLeft}>
          <Text style={styles.titleLine}>{subjectCode} — {subjectName}</Text>
        </View>

        <Text style={reportStyles.reportTitle}>TEACHING OBSERVATION REPORT</Text>

        <View style={reportStyles.metaGrid}>
          <View style={reportStyles.metaRow}>
            <View style={reportStyles.metaCol}>
              <Text style={reportStyles.metaLabel}>Name of the School Teacher :</Text>
              <View style={reportStyles.metaLine} />
            </View>
            <View style={reportStyles.metaCol}>
              <Text style={reportStyles.metaLabel}>Subject :</Text>
              <View style={reportStyles.metaLine} />
            </View>
          </View>
          <View style={reportStyles.metaRow}>
            <View style={reportStyles.metaCol}>
              <Text style={reportStyles.metaLabel}>Name of the School :</Text>
              <View style={reportStyles.metaLine} />
            </View>
            <View style={reportStyles.metaCol}>
              <Text style={reportStyles.metaLabel}>Name of the Unit :</Text>
              <View style={reportStyles.metaLine} />
            </View>
          </View>
          <View style={reportStyles.metaRow}>
            <View style={reportStyles.metaCol}>
              <Text style={reportStyles.metaLabel}>Class :</Text>
              <View style={reportStyles.metaLine} />
            </View>
            <View style={reportStyles.metaCol}>
              <Text style={reportStyles.metaLabel}>Date :</Text>
              <View style={reportStyles.metaLine} />
            </View>
          </View>
          <View style={reportStyles.metaRow}>
            <View style={reportStyles.metaColFull}>
              <Text style={reportStyles.metaLabel}>Name of the lesson :</Text>
              <View style={reportStyles.metaLine} />
            </View>
          </View>
        </View>

        <View style={reportStyles.dividerDashed} />

        <Text style={reportStyles.sectionTitle}>I  Introduction:</Text>
        <View style={reportStyles.itemGroup}>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(1) Greetings:</Text>
          </View>

          <Text style={reportStyles.itemLabel}>(2) Testing / Re-teaching Previous Knowledge of the student by :</Text>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>Brain Storming:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>Mind Mapping:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>Concept mapping:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>Asking Questions:</Text>
          </View>

          <Text style={reportStyles.itemLabel}>(3) Motivation :</Text>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>By Analogy:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>By Story Telling:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>By Creating a Problem:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>By any other means (Specify):</Text>
          </View>
          <Text style={reportStyles.subNoteText}>(Role-play, Experiments, lecture, explanation, etc...)</Text>

          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(4) Announcement of the topic:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(5) Importance of the Topic:</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerDate}>{footerDate}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.pageNumRight}>{pageNum} / {totalPages}</Text>
            {effectiveBarcodeUrl && <Image src={effectiveBarcodeUrl} style={styles.barcodeImg} />}
          </View>
        </View>
      </View>
    </Page>
  );

  const renderReportPage2 = (repIdx, pageNum) => (
    <Page key={`rep-${repIdx}-p2`} size="A4" style={styles.pageCanvas}>
      <View style={styles.borderFrame}>
        <View style={styles.headerTopLeft}>
          <Text style={styles.titleLine}>{subjectCode} — {subjectName}</Text>
        </View>

        <Text style={reportStyles.sectionTitle}>II  Presentation:</Text>
        <View style={reportStyles.itemGroup}>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(1) Reading the Text:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(2) Identification of key Terms & key Concepts:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(3) Discussion on key Terms & key Concepts:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(4) Writing Key Terms &key Concepts on Black board:</Text>
          </View>

          <Text style={reportStyles.itemLabel}>(5) Activities for the attainment of academic standards:</Text>
          
          <View style={reportStyles.tableHeader}>
            <Text style={reportStyles.tableHeaderColLeft}>Academic standard</Text>
            <Text style={reportStyles.tableHeaderColRight}>Activity</Text>
          </View>
          {[1, 2, 3, 4, 5, 6].map(num => (
            <View key={`act-${num}`} style={reportStyles.tableRow}>
              <Text style={reportStyles.tableColNum}>{num}.</Text>
              <Text style={reportStyles.tableColAct}></Text>
            </View>
          ))}

          <View style={{ marginTop: 8 }}>
            <View style={reportStyles.subItemRow}>
              <Text style={reportStyles.subItemLabel}>(6) Summing up by the Teacher:</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerDate}>{footerDate}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.pageNumRight}>{pageNum} / {totalPages}</Text>
            {effectiveBarcodeUrl && <Image src={effectiveBarcodeUrl} style={styles.barcodeImg} />}
          </View>
        </View>
      </View>
    </Page>
  );

  const renderReportPage3 = (repIdx, pageNum) => (
    <Page key={`rep-${repIdx}-p3`} size="A4" style={styles.pageCanvas}>
      <View style={styles.borderFrame}>
        <View style={styles.headerTopLeft}>
          <Text style={styles.titleLine}>{subjectCode} — {subjectName}</Text>
        </View>

        <View style={reportStyles.subItemRow}>
          <Text style={reportStyles.subItemLabel}>(7) Writing the definitions of Concepts:</Text>
        </View>

        <Text style={reportStyles.sectionTitle}>III  Activity Management:</Text>
        <View style={reportStyles.itemGroup}>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(1) Collected the Required TLM:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(2) Display of TLM at Proper time:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(3) Participation of Pupils in Activities/Problem –Solving: Group/Sub-Group/Individual</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>(4) Discussing on mistakes done by the Students & Doubts Clarification.</Text>
          </View>
        </View>

        <Text style={reportStyles.sectionTitle}>IV  Recapitulation & Evaluation:</Text>
        <View style={reportStyles.itemGroup}>
          <View style={reportStyles.subItemRow}>
          </View>
        </View>

        <Text style={reportStyles.sectionTitle}>V  Assignment:</Text>
        <View style={reportStyles.itemGroup}>
          <View style={reportStyles.subItemRow}>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerDate}>{footerDate}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.pageNumRight}>{pageNum} / {totalPages}</Text>
            {effectiveBarcodeUrl && <Image src={effectiveBarcodeUrl} style={styles.barcodeImg} />}
          </View>
        </View>
      </View>
    </Page>
  );

  const renderReportPage4 = (repIdx, pageNum) => (
    <Page key={`rep-${repIdx}-p4`} size="A4" style={styles.pageCanvas}>
      <View style={styles.borderFrame}>
        <View style={styles.headerTopLeft}>
          <Text style={styles.titleLine}>{subjectCode} — {subjectName}</Text>
        </View>

        <Text style={reportStyles.sectionTitle}>VI  Personal Characteristics of Teacher:</Text>
        <View style={reportStyles.itemGroup}>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>1. Dress and Cleanliness:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>2. Mannerisms:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>3. Voice/Language/Clarity:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>4. Temperament:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>5. Class room Management:</Text>
          </View>
        </View>

        <Text style={reportStyles.sectionTitle}>VII  Response of the Students:</Text>
        <View style={reportStyles.itemGroup}>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>1. Active:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>2. Passive:</Text>
          </View>
          <View style={reportStyles.subItemRow}>
            <Text style={reportStyles.subItemLabel}>What Achieved:</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerDate}>{footerDate}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.pageNumRight}>{pageNum} / {totalPages}</Text>
            {effectiveBarcodeUrl && <Image src={effectiveBarcodeUrl} style={styles.barcodeImg} />}
          </View>
        </View>
      </View>
    </Page>
  );

  const renderReportPage5 = (repIdx, pageNum) => (
    <Page key={`rep-${repIdx}-p5`} size="A4" style={styles.pageCanvas}>
      <View style={styles.borderFrame}>
        <View style={styles.headerTopLeft}>
          <Text style={styles.titleLine}>{subjectCode} — {subjectName}</Text>
        </View>

        <Text style={reportStyles.sectionTitle}>VIII  Overall Observations:</Text>
        <View style={styles.blankFill} />

        <View style={reportStyles.sigBlock}>
          <View style={reportStyles.sigRow}>
            <View style={reportStyles.sigCol}>
              <Text style={reportStyles.sigLine}>Signature of the Student Teacher</Text>
            </View>
            <View style={reportStyles.sigCol}>
              <Text style={reportStyles.sigLine}>Signature of the Supervisor</Text>
              <Text style={reportStyles.dateLine}>Date:</Text>
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerDate}>{footerDate}</Text>
          <View style={styles.footerRight}>
            <Text style={styles.pageNumRight}>{pageNum} / {totalPages}</Text>
            {effectiveBarcodeUrl && <Image src={effectiveBarcodeUrl} style={styles.barcodeImg} />}
          </View>
        </View>
      </View>
    </Page>
  );

  let continuationPages = [];

  if (isPedagogy2ndOr3rdSem) {
    // Render 5 Teaching Observation Reports (5 pages each = 25 pages)
    for (let rep = 0; rep < 5; rep++) {
      const basePage = 1 + rep * 5;
      continuationPages.push(renderReportPage1(rep, basePage + 1));
      continuationPages.push(renderReportPage2(rep, basePage + 2));
      continuationPages.push(renderReportPage3(rep, basePage + 3));
      continuationPages.push(renderReportPage4(rep, basePage + 4));
      continuationPages.push(renderReportPage5(rep, basePage + 5));
    }
  } else {
    // Old format (Blank continuation pages)
    continuationPages = Array.from({ length: pagesCount }, (_, i) => (
      <Page key={`blank-${i}`} size="A4" style={styles.pageCanvas}>
        <View style={styles.borderFrame}>
          <View style={styles.headerTopLeft}>
            <Text style={styles.titleLine}>{subjectCode} — {subjectName}</Text>
          </View>
          
          <View style={styles.blankFill} />
          
          <View style={styles.footer}>
            <Text style={styles.footerDate}>{footerDate}</Text>
            <View style={styles.footerRight}>
              <Text style={styles.pageNumRight}>{i + 2} / {totalPages}</Text>
              {effectiveBarcodeUrl && <Image src={effectiveBarcodeUrl} style={styles.barcodeImg} />}
            </View>
          </View>
        </View>
      </Page>
    ));
  }

  return (
    <Document>
      {/* Page 1: Common Certificate Cover Page */}
      <Page size="A4" style={styles.pageCanvas}>
        <View style={styles.borderFrame}>
          {/* Top Header */}
          <View style={styles.headerTopLeft}>
            <Text style={styles.titleLine}>{subjectCode} — {subjectName}</Text>
          </View>
          
          {/* University Title & Logos */}
          <View style={styles.univHeader}>
            <Image src={aknuLogo} style={styles.logoLeft} />
            <View style={styles.univTextContainer}>
              <Text style={styles.univTitle}>ADIKAVI NANNAYA UNIVERSITY</Text>
              <Text style={styles.univSubtitle}>ఆదికవి నన్నయ విశ్వవిద్యాలయం</Text>
              <Text style={styles.univLocation}>RAJAMAHENDRAVARAM, ANDHRA PRADESH INDIA - 533296.</Text>
              <Text style={styles.univAccreditation}>Accredited by NAAC with 'B+' Grade ISO 9001:2025 Certified 5 Star Rated</Text>
              <Text style={styles.univAffiliation}>Largest State University in Andhra Pradesh in terms of Affiliation</Text>
            </View>
            <Image src={nannayaLogo} style={styles.logoRight} />
          </View>

          {/* Certificate Title */}
          <Text style={styles.certTitle}>Certificate</Text>

          {/* Core certificate details */}
          <View style={styles.middle}>
            <View style={styles.bodyColumn}>
              <Text style={styles.bodyLine}>
                This is to Certify that Candidate with particulars:
              </Text>
              <Text style={styles.bodyLine}>
                Name : Sri/Smt./Kum. <Text style={styles.bodyValueBold}>{fullName}</Text>
              </Text>
              <Text style={styles.bodyLine}>
                Registration Number : <Text style={styles.bodyValueBold}>{regdNo}</Text>
              </Text>
              <Text style={styles.bodyLine}>
                College : <Text style={styles.bodyValueBold}>{collegeName}</Text>
              </Text>
              <Text style={styles.bodyLine}>
                Semester : <Text style={styles.bodyValueBold}>{formattedSemester}</Text>
              </Text>
              <Text style={styles.bodyLine}>
                Record/Assignment of Subject : <Text style={styles.bodyValueBold}>{subjectName}</Text>
              </Text>
              <Text style={styles.bodyLine}>
                has submitted for his/her accomplishment of <Text style={styles.bodyValueBold}>{courseName}.</Text>
              </Text>
            </View>

            {/* Undertaking Section */}
            <Text style={styles.undertakingTitle}>UNDERTAKING BY THE PRINCIPAL AND CONCERN FACULTY</Text>
            <Text style={styles.undertakingText}>
              I endorsed that the handwriting in the Record or Project work is by concerned student only. I agree if it is found that, it is fake and it is not written by the student I know that me and concerned faculty can be held responsible and accept for any action/punishment for this malpractice as per the University norms.
            </Text>
          </View>

          {/* Student Signature Line */}
          <View style={styles.studentSigRow}>
            <View style={styles.sigCol}>
              <Text style={styles.sigText}>Signature of the Student</Text>
            </View>
          </View>

          {/* Examiner and principal signature lines */}
          <View style={styles.signaturesBlock}>
            <View style={styles.sigRow}>
              <View style={styles.sigCol}>
                <Text style={styles.sigText}>Signature of the Lecturer</Text>
              </View>
              <View style={styles.sigCol}>
                <Text style={styles.sigText}>Signature of the Principal with Seal</Text>
              </View>
            </View>
          </View>

          {/* Cover Footer */}
          <View style={styles.footer}>
            <Text style={styles.footerDate}>{footerDate}</Text>
            <View style={styles.footerRight}>
              <Text style={styles.pageNumRight}>1 / {totalPages}</Text>
              {effectiveBarcodeUrl && <Image src={effectiveBarcodeUrl} style={styles.barcodeImg} />}
            </View>
          </View>
        </View>
      </Page>
      {continuationPages}
    </Document>
  );
};

export default BarcodePDF;
