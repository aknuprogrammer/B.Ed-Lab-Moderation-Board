import { useState, useEffect } from 'react';
import { ClipboardCheck, Search, Download, BookOpen, RefreshCw, Activity, Calendar, FileText } from 'lucide-react';
import axios from 'axios';
import { API_BASE_URL } from '../../utils/config';
import ReallocateModal from '../../components/ReallocateModal';
import ActivityFeed from '../../components/ActivityFeed';

/* ── Pagination component ── */
const Pagination = ({ total, page, onPage, pageSize = 10 }) => {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50 flex-wrap gap-3">
      <span className="text-xs text-slate-500">
        Showing <span className="font-semibold text-slate-700">{start}–{end}</span> of <span className="font-semibold text-slate-700">{total}</span> records
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(1)}
          disabled={page === 1}
          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          «
        </button>
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
        >
          Prev
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1)
          .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
          .reduce((acc, p, idx, arr) => {
            if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
            acc.push(p);
            return acc;
          }, [])
          .map((p, i) =>
            p === '…' ? (
              <span key={`ellipsis-${i}`} className="px-1 text-slate-400 text-xs">…</span>
            ) : (
              <button
                key={p}
                onClick={() => onPage(p)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${p === page
                  ? 'bg-teal-700 text-white border border-teal-700'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
              >
                {p}
              </button>
            )
          )
        }

        <button
          onClick={() => onPage(page + 1)}
          disabled={page === totalPages}
          className="px-2.5 py-1 rounded-md text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
        >
          Next
        </button>
        <button
          onClick={() => onPage(totalPages)}
          disabled={page === totalPages}
          className="px-2 py-1 rounded-md text-xs font-medium text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
        >
          »
        </button>
      </div>
    </div>
  );
};

const isNoMarks = (score) => score === 0 || score === null || score === undefined || score === '';

const EvaluatedRecords = () => {
  const [records, setRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [resultStatusFilter, setResultStatusFilter] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [activeTab, setActiveTab] = useState('submissions');
  const [papers, setPapers] = useState([]);
  const [paperApprovals, setPaperApprovals] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [supplyPage, setSupplyPage] = useState(1);
  const [paperPage, setPaperPage] = useState(1);
  const [supplyPaperPage, setSupplyPaperPage] = useState(1);
  const [reallocateTarget, setReallocateTarget] = useState(null);
  const [toastMessage, setToastMessage] = useState('');
  const [selectedRecordIds, setSelectedRecordIds] = useState([]);
  const [resetModalData, setResetModalData] = useState({ open: false, type: '', payload: null });
  const [resetDeadline, setResetDeadline] = useState('');

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(''), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const [showActivity, setShowActivity] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const PAGE_SIZE = 10;

  const fetchAssignments = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/assignments`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const sorted = (res.data || []).sort((a, b) => new Date(b.submittedAt || b.updatedAt || b.createdAt || 0) - new Date(a.submittedAt || a.updatedAt || a.createdAt || 0));
      setRecords(sorted);
    } catch (err) {
      console.error('Failed to load assignments');
    }
  };

  const fetchPaperApprovals = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/admin/paper-approvals`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setPaperApprovals(res.data);
    } catch (err) {
      console.error('Failed to load paper approvals', err);
    }
  };

  const handleReallocateSuccess = (msg) => {
    setToastMessage(msg);
    setReallocateTarget(null);
    fetchAssignments();
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleResetEvaluation = (assignmentId) => {
    setResetModalData({ open: true, type: 'single', payload: assignmentId });
    setResetDeadline('');
  };

  const handleBulkResetEvaluation = () => {
    if (selectedRecordIds.length === 0) return;
    setResetModalData({ open: true, type: 'bulk', payload: selectedRecordIds });
    setResetDeadline('');
  };

  const submitResetEvaluation = async () => {
    if (!resetDeadline) {
      alert('Please select a new submission deadline.');
      return;
    }
    
    try {
      if (resetModalData.type === 'single') {
        const res = await axios.post(`${API_BASE_URL}/api/admin/reset-evaluation`, 
          { assignmentId: resetModalData.payload, submissionDeadline: resetDeadline }, 
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setToastMessage(res.data.message || 'Evaluation reset successfully.');
      } else if (resetModalData.type === 'bulk') {
        const res = await axios.post(`${API_BASE_URL}/api/admin/bulk-reset-evaluation`, 
          { assignmentIds: resetModalData.payload, submissionDeadline: resetDeadline }, 
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        );
        setToastMessage(res.data.message || 'Bulk evaluation reset successfully.');
        setSelectedRecordIds([]);
      }
      setResetModalData({ open: false, type: '', payload: null });
      fetchAssignments();
    } catch (err) {
      console.error('Failed to reset evaluation:', err);
      alert(err.response?.data?.message || 'Failed to reset evaluation.');
    }
  };

  const handleSelectRecord = (id) => {
    setSelectedRecordIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAll = (recordsList) => {
    const zeroMarkIds = recordsList.filter(r => r.status === 'Evaluated' && isNoMarks(r.score)).map(r => r._id);
    const allSelected = zeroMarkIds.length > 0 && zeroMarkIds.every(id => selectedRecordIds.includes(id));
    
    if (allSelected) {
      setSelectedRecordIds(prev => prev.filter(id => !zeroMarkIds.includes(id)));
    } else {
      setSelectedRecordIds(prev => [...new Set([...prev, ...zeroMarkIds])]);
    }
  };

  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const res = await axios.get(`${API_BASE_URL}/api/admin/papers`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        setPapers(res.data);
      } catch (err) {
        console.error('Failed to load papers', err);
      }
    };
    fetchAssignments();
    fetchPapers();
    fetchPaperApprovals();
  }, []);

  const uniqueSemesters = [...new Set(records.map(r => r.subjectId?.semester || r.studentId?.currentSemester).filter(Boolean))].sort();

  const filteredRecords = records.filter(record => {
    const isActive = record.status !== 'Pending' || record.isAbsent;
    if (!isActive && !selectedStatus) return false;

    const nameMatch = (record.studentId?.fullName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const regdNoMatch = (record.studentId?.regdNo || '').toLowerCase().includes(searchTerm.toLowerCase());
    const subjectMatch = (record.groupSubjectName || record.subjectId?.subName || '').toLowerCase().includes(searchTerm.toLowerCase());
    const queryMatch = nameMatch || regdNoMatch || subjectMatch;

    const statusMatch = !selectedStatus 
      || (selectedStatus === 'ZeroMarks' ? isNoMarks(record.score) : record.status === selectedStatus);
    const semMatch = !selectedSemester || (record.subjectId?.semester === selectedSemester || record.studentId?.currentSemester === selectedSemester);

    const resultMatch = !resultStatusFilter || (
      resultStatusFilter === 'ABSENT' ? record.isAbsent :
      resultStatusFilter === 'FAIL' ? (record.status === 'Evaluated' && !record.isAbsent && record.score < (record.subjectId?.subPassMarks != null ? record.subjectId.subPassMarks : ((record.maxMarks || record.subjectId?.maxMarks || 100) * 0.4))) :
      resultStatusFilter === 'PASS' ? (record.status === 'Evaluated' && !record.isAbsent && record.score >= (record.subjectId?.subPassMarks != null ? record.subjectId.subPassMarks : ((record.maxMarks || record.subjectId?.maxMarks || 100) * 0.4))) :
      true
    );

    return queryMatch && statusMatch && semMatch && resultMatch;
  });

  const regularRecords = filteredRecords.filter(r => !r.mode || r.mode === 'Regular');
  const supplyRecords = filteredRecords.filter(r => r.mode === 'Supply');

  // Group ALL records by Student for Paper-Level computation
  const allStudentsMap = {};
  records.forEach(r => {
    const regdNo = r.studentId?.regdNo;
    if (!regdNo) return;
    if (!allStudentsMap[regdNo]) {
      allStudentsMap[regdNo] = {
        _id: r.studentId?._id || r.studentId?.toString(),
        fullName: r.studentId?.fullName || "Student",
        regdNo: regdNo,
        collegeName: r.studentId?.collegeId?.collegeName || "ADIKAVI NANNAYA UNIVERSITY",
        degree: r.studentId?.courseId?.courseName || "Programme",
        courseCode: r.studentId?.courseId?.courseCode || "",
        semester: r.studentId?.currentSemester || r.subjectId?.semester || "",
        assignments: []
      };
    }
    allStudentsMap[regdNo].assignments.push(r);
  });

  const regularPaperRows = [];
  const supplyPaperRows = [];

  Object.values(allStudentsMap).forEach(student => {
    const studentAssignments = student.assignments;

    // Group assignments by mode
    const regularAssignments = studentAssignments.filter(a => !a.mode || a.mode === 'Regular');
    const supplyAssignments = studentAssignments.filter(a => a.mode === 'Supply');

    const regularMap = new Map(regularAssignments.map(a => [a.subjectId?._id?.toString() || a.subjectId?.toString() || '', a]));
    const supplyMap = new Map(supplyAssignments.map(a => [a.subjectId?._id?.toString() || a.subjectId?.toString() || '', a]));

    const buildPaperScore = (paper, assignmentMap, mode, fallbackMap = null) => {
      let obtainedScore = 0;
      let paperMaxMarks = 0;
      let evaluatedCount = 0;
      const totalSubjectsCount = paper.subjectIds?.length || 0;
      let hasFailedSubject = false;
      let absentOrMissingCount = 0;

      (paper.subjectIds || []).forEach(sub => {
        const subId = sub._id || sub;
        let assignment = assignmentMap.get(subId.toString());

        if (!assignment && fallbackMap) {
          const fallbackAssignment = fallbackMap.get(subId.toString());
          if (fallbackAssignment) {
            assignment = fallbackAssignment;
          }
        }

        paperMaxMarks += sub.maxMarks || 0;

        if (assignment && assignment.status === 'Evaluated' && !assignment.isAbsent && assignment.score != null) {
          evaluatedCount++;
          obtainedScore += assignment.score || 0;
          const passMark = sub.subPassMarks != null ? sub.subPassMarks : (sub.maxMarks ? sub.maxMarks * 0.4 : 0);
          if (assignment.score < passMark) {
            hasFailedSubject = true;
          }
        } else {
          absentOrMissingCount++;
        }
      });

      let resultStatus = 'PENDING';
      if (absentOrMissingCount === totalSubjectsCount) {
        resultStatus = 'ABSENT';
      } else if (hasFailedSubject || absentOrMissingCount > 0 || obtainedScore < (paper.passMarks || 0)) {
        resultStatus = 'FAIL';
      } else {
        resultStatus = 'PASS';
      }
      const isPassed = resultStatus === 'PASS';

      return {
        studentId: student._id,
        paperId: paper._id,
        fullName: student.fullName,
        regdNo: student.regdNo,
        semester: paper.semester || student.semester,
        collegeName: student.collegeName,
        courseCode: student.courseCode || '',
        courseName: student.degree || 'Programme',
        degree: student.degree,
        paperName: paper.paperName || paper.paperCode || "Paper",
        paperCode: paper.paperCode,
        obtainedScore: (absentOrMissingCount === totalSubjectsCount) ? 'ABS' : obtainedScore,
        maxMarks: paperMaxMarks,
        passMarks: paper.passMarks || 0,
        status: (absentOrMissingCount === 0) ? 'Evaluated' : 'Pending',
        isPassed,
        resultStatus,
        mode: mode
      };
    };

    papers.forEach(paper => {
      const hasRegular = paper.subjectIds?.some(sub => regularMap.has(sub._id ? sub._id.toString() : sub.toString()));
      if (hasRegular) regularPaperRows.push(buildPaperScore(paper, regularMap, 'Regular'));

      const hasSupply = paper.subjectIds?.some(sub => supplyMap.has(sub._id ? sub._id.toString() : sub.toString()));
      if (hasSupply) supplyPaperRows.push(buildPaperScore(paper, supplyMap, 'Supply', regularMap));
    });
  });

  const isPaperApproved = (row) => paperApprovals.some(app => 
    (app.studentId?.toString() === row.studentId?.toString() || app.studentId === row.studentId) && 
    (app.paperId?.toString() === row.paperId?.toString() || app.paperId === row.paperId) && 
    app.mode === row.mode
  );

  const matchesPaperFilter = (row) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = !term ||
      (row.fullName || '').toLowerCase().includes(term) ||
      (row.regdNo || '').toLowerCase().includes(term) ||
      (row.paperName || '').toLowerCase().includes(term) ||
      (row.collegeName || '').toLowerCase().includes(term);
    const matchesStatus = !resultStatusFilter || row.resultStatus === resultStatusFilter;
    const matchesSem = !selectedSemester || row.semester === selectedSemester;
    return matchesSearch && matchesStatus && matchesSem;
  };

  const filteredRegularPapers = regularPaperRows.filter(matchesPaperFilter);
  const filteredSupplyPapers = supplyPaperRows.filter(matchesPaperFilter);

  const handleExportEvaluated = async () => {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      const formatExportData = (rows) => rows.map(r => {
        const isAbsent = r.isAbsent === true;
        const marks = isAbsent ? '' : (r.score != null ? r.score : '');
        const attendance = (!isAbsent && marks !== '') ? 'PRESENT' : 'ABSENT';

        return {
          'Course_Code': r.studentId?.courseId?.courseCode || '95',
          'Course_name': r.studentId?.courseId?.courseName || 'B.Ed.',
          'Entry_Type': 'First Entry',
          'Marks_type': 'PRACTICALS AWARD SHEET',
          'Sub_code': r.subjectId?.subCode || '',
          'Sub_name': r.groupSubjectName || r.subjectId?.subName || '',
          'Regd_no': r.studentId?.regdNo || '',
          'Marks_secured': marks,
          'Attendance': attendance
        };
      });

      const isZeroMarks = selectedStatus === 'ZeroMarks';
      const approvedRegular = isZeroMarks ? regularRecords.filter(r => isNoMarks(r.score)) : regularRecords.filter(r => r.isApprovedByBOS === true);
      const approvedSupply = isZeroMarks ? supplyRecords.filter(r => isNoMarks(r.score)) : supplyRecords.filter(r => r.isApprovedByBOS === true);

      if (approvedRegular.length > 0) {
        const regularSheet = XLSX.utils.json_to_sheet(formatExportData(approvedRegular));
        XLSX.utils.book_append_sheet(workbook, regularSheet, "Regular Subjects");
      }
      if (approvedSupply.length > 0) {
        const supplySheet = XLSX.utils.json_to_sheet(formatExportData(approvedSupply));
        XLSX.utils.book_append_sheet(workbook, supplySheet, "Backlog Subjects");
      }

      if (approvedRegular.length === 0 && approvedSupply.length === 0) {
        const emptySheet = XLSX.utils.json_to_sheet([{ Message: "No data available" }]);
        XLSX.utils.book_append_sheet(workbook, emptySheet, "Evaluations");
      }

      XLSX.writeFile(workbook, `Subject_Evaluations_${new Date().toISOString().split('T')[0]}.xlsx`);

      await axios.post(`${API_BASE_URL}/api/activities`, {
        actionType: 'EXPORT_EXCEL',
        entityType: 'Assignment',
        details: { description: 'Exported Evaluated Records to Excel' }
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export to Excel.');
    }
    setRefreshTrigger(prev => prev + 1);
  };

  const handleExportPaperGrades = async () => {
    try {
      const XLSX = await import('xlsx');
      const workbook = XLSX.utils.book_new();

      const formatExportData = (rows) => rows.map(row => {
        const isAbsent = row.resultStatus === 'ABSENT' || row.obtainedScore === 'ABS';
        const marks = isAbsent ? '' : (row.obtainedScore != null ? row.obtainedScore : '');
        const attendance = (!isAbsent && marks !== '') ? 'PRESENT' : 'ABSENT';

        return {
          'Course_Code': row.courseCode || '95',
          'Course_name': row.courseName || row.degree || 'B.Ed.',
          'Entry_Type': 'First Entry',
          'Marks_type': 'PRACTICALS AWARD SHEET',
          'Sub_code': row.paperCode || '',
          'Sub_name': row.paperName || '',
          'Regd_no': row.regdNo || '',
          'Marks_secured': marks,
          'Attendance': attendance
        };
      });

      const approvedRegularPapers = filteredRegularPapers.filter(isPaperApproved);
      const approvedSupplyPapers = filteredSupplyPapers.filter(isPaperApproved);

      if (approvedRegularPapers.length > 0) {
        const regularSheet = XLSX.utils.json_to_sheet(formatExportData(approvedRegularPapers));
        XLSX.utils.book_append_sheet(workbook, regularSheet, "Regular Papers");
      }
      if (approvedSupplyPapers.length > 0) {
        const supplySheet = XLSX.utils.json_to_sheet(formatExportData(approvedSupplyPapers));
        XLSX.utils.book_append_sheet(workbook, supplySheet, "Backlog Papers");
      }

      if (approvedRegularPapers.length === 0 && approvedSupplyPapers.length === 0) {
        const emptySheet = XLSX.utils.json_to_sheet([{ Message: "No data available" }]);
        XLSX.utils.book_append_sheet(workbook, emptySheet, "Grades");
      }

      XLSX.writeFile(workbook, `Paper_Grades_Report_${new Date().toISOString().split('T')[0]}.xlsx`);

      await axios.post(`${API_BASE_URL}/api/activities`, {
        actionType: 'EXPORT_EXCEL',
        entityType: 'Assignment',
        details: { description: 'Exported Paper Grades Report to Excel' }
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
    } catch (err) {
      console.error('Export failed:', err);
      alert('Failed to export to Excel.');
    }
    setRefreshTrigger(prev => prev + 1);
  };

  const pagedRegularRecords = regularRecords.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const pagedSupplyRecords = supplyRecords.slice((supplyPage - 1) * PAGE_SIZE, supplyPage * PAGE_SIZE);

  const pagedRegularPapers = filteredRegularPapers.slice((paperPage - 1) * PAGE_SIZE, paperPage * PAGE_SIZE);
  const pagedSupplyPapers = filteredSupplyPapers.slice((supplyPaperPage - 1) * PAGE_SIZE, supplyPaperPage * PAGE_SIZE);

  const evaluatedInFiltered = filteredRecords.filter(r => r.status === 'Evaluated' || r.isAbsent);
  const isZeroMarksFilter = selectedStatus === 'ZeroMarks';
  const isSubmissionsApproved = evaluatedInFiltered.length > 0 && (isZeroMarksFilter || evaluatedInFiltered.every(r => r.isApprovedByBOS === true));

  const totalPapersCount = filteredRegularPapers.length + filteredSupplyPapers.length;
  const isPapersApproved = totalPapersCount > 0 && [...filteredRegularPapers, ...filteredSupplyPapers].every(isPaperApproved);

  return (
    <div className="p-4 sm:p-4 bg-slate-50 w-full animate-fade-in">
      {showActivity && <ActivityFeed actionTypes={['EXPORT_EXCEL', 'REALLOCATE_EVALUATOR', 'EXTEND_DEADLINE']} onClose={() => setShowActivity(false)} refreshTrigger={refreshTrigger} />}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Evaluated Records</h1>
          <p className="text-slate-500 text-sm mt-0.5">Review all lab records that have been graded by evaluators.</p>
        </div>
        <button
          onClick={() => setShowActivity(true)}
          className="flex items-center cursor-pointer gap-2 px-4 py-2 mt-1 bg-white border border-slate-200 shadow-sm rounded-md text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium sm:mr-[130px]"
        >
          <Activity className="h-4 w-4 text-teal-600" />
          Activity History
        </button>
      </div>

      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab('submissions'); setCurrentPage(1); setSupplyPage(1); }}
          className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 cursor-pointer rounded-t-md ${activeTab === 'submissions'
            ? 'border-teal-600 text-teal-700 font-semibold'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          Submissions List
        </button>
        <button
          onClick={() => { setActiveTab('papers'); setPaperPage(1); setSupplyPaperPage(1); }}
          className={`px-5 py-2.5 font-medium text-sm transition-colors border-b-2 cursor-pointer rounded-t-md ${activeTab === 'papers'
            ? 'border-teal-600 text-teal-700 font-semibold'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          Paper Wise Final Marks Report
        </button>
      </div>

      <div className="bg-white rounded-md rounded-tr-2xl border border-t-0 border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-800 flex items-center">
            <ClipboardCheck className="h-5 w-5 mr-2 text-teal-600" />
            {activeTab === 'submissions' ? `Evaluated Submissions (${filteredRecords.length})` : `Aggregated Paper Grades (${filteredRegularPapers.length + filteredSupplyPapers.length})`}
          </h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <select
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setCurrentPage(1);
                setSupplyPage(1);
                setPaperPage(1);
                setSupplyPaperPage(1);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white cursor-pointer"
            >
              <option value="">-- All Semesters --</option>
              {uniqueSemesters.map(sem => (
                <option key={sem} value={sem}>Semester {sem}</option>
              ))}
            </select>

            <select
              value={resultStatusFilter}
              onChange={(e) => {
                setResultStatusFilter(e.target.value);
                setCurrentPage(1);
                setSupplyPage(1);
                setPaperPage(1);
                setSupplyPaperPage(1);
              }}
              className="px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white cursor-pointer"
            >
              <option value="">-- All Results --</option>
              <option value="PASS">Pass</option>
              <option value="FAIL">Fail</option>
              <option value="ABSENT">Absent</option>
            </select>

            {activeTab === 'submissions' && (
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                  setSupplyPage(1);
                }}
                className="px-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white cursor-pointer"
              >
                <option value="">-- All Statuses --</option>
                <option value="Submitted">Pending Evaluation</option>
                <option value="Evaluated">Evaluation Completed</option>
                <option value="ZeroMarks">No Marks / Zero (0)</option>
              </select>
            )}

            <div className="relative w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-3.5 w-3.5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Search student or subject..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                  setSupplyPage(1);
                  setPaperPage(1);
                  setSupplyPaperPage(1);
                }}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-md focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-slate-800 bg-white"
              />
            </div>

            {(filteredRecords.length > 0 || regularPaperRows.length > 0 || supplyPaperRows.length > 0) && (
              <div className="flex gap-2">
                {selectedRecordIds.length > 0 && activeTab === 'submissions' && (
                  <button
                    onClick={handleBulkResetEvaluation}
                    className="flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all whitespace-nowrap bg-rose-600 hover:bg-rose-700 text-white cursor-pointer"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Reset Selected ({selectedRecordIds.length})
                  </button>
                )}
                <button
                  disabled={activeTab === 'submissions' ? !isSubmissionsApproved : !isPapersApproved}
                  onClick={activeTab === 'submissions' ? handleExportEvaluated : handleExportPaperGrades}
                  title={!(activeTab === 'submissions' ? isSubmissionsApproved : isPapersApproved) ? (isZeroMarksFilter ? "" : "Waiting for BOS approval") : ""}
                  className={`flex items-center justify-center px-3 py-1.5 rounded-md text-xs font-semibold shadow-sm transition-all whitespace-nowrap ${
                    (activeTab === 'submissions' ? isSubmissionsApproved : isPapersApproved)
                    ? 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export Excel
              </button>
              </div>
            )}
          </div>
        </div>

        {activeTab === 'submissions' ? (
          <>
            {/* Regular Submissions */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <span className="p-1 bg-white rounded shadow-sm border border-slate-200">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Regular Subject Evaluations ({regularRecords.length})</h3>
            </div>
            <div className="w-full relative overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr className="bg-teal-700 text-white text-sm font-semibold">
                    <th className="px-4 py-3 text-left whitespace-nowrap w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        checked={regularRecords.filter(r => r.status === 'Evaluated' && isNoMarks(r.score)).length > 0 && 
                                 regularRecords.filter(r => r.status === 'Evaluated' && isNoMarks(r.score)).every(r => selectedRecordIds.includes(r._id))}
                        onChange={() => handleSelectAll(regularRecords)}
                        disabled={regularRecords.filter(r => r.status === 'Evaluated' && isNoMarks(r.score)).length === 0}
                      />
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap min-w-[12rem]">Document / Subject</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Max Marks</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Pass Marks</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Final Marks</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRegularRecords.map((record) => (
                    <tr key={record._id} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                      <td className="px-4 py-2.5 text-center">
                        {record.status === 'Evaluated' && isNoMarks(record.score) ? (
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            checked={selectedRecordIds.includes(record._id)}
                            onChange={() => handleSelectRecord(record._id)}
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap text-sm">{record.studentId?.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{record.studentId?.regdNo}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <p className="font-medium text-slate-900">{record.groupSubjectName || record.subjectId?.subName}</p>
                        <p className="text-xs text-slate-500">{record.subjectId?.subCode}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold text-slate-800">
                        {record.maxMarks ?? record.subjectId?.maxMarks ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold text-slate-800">
                        {record.subjectId?.subPassMarks ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.isAbsent ? 'bg-amber-100 text-amber-800' :
                            record.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {record.isAbsent ? 'Absent' : record.status === 'Evaluated' ? 'Evaluated' : 'Pending Evaluation'}
                          </span>
                          {record.status === 'Evaluated' && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${record.isApprovedByBOS ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
                              {record.isApprovedByBOS ? 'BOS Approved' : 'Pending BOS'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-right">
                        <span className={`font-bold text-base ${record.isAbsent ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {record.isAbsent ? 'ABS' : (record.score !== null ? record.score : '-')}
                        </span>
                        {!record.isAbsent && <span className="text-slate-400 text-xs ml-1">/ {record.maxMarks}</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {record.filePath && (
                            <a
                              href={`${API_BASE_URL}${record.filePath}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-2 py-1 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 hover:border-teal-600 rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                              title="View Record PDF"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              View
                            </a>
                          )}
                          {record.status !== 'Evaluated' && (
                            <button
                              onClick={() => setReallocateTarget(record)}
                              className="inline-flex items-center px-2 py-1 bg-white border border-teal-200 hover:bg-teal-50 text-teal-700 rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Re-allocate
                            </button>
                          )}
                          {record.status === 'Evaluated' && isNoMarks(record.score) && (
                            <button
                              onClick={() => handleResetEvaluation(record._id)}
                              className="inline-flex items-center px-2 py-1 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Reset Eval
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {regularRecords.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-slate-500">No regular subject evaluations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            <Pagination total={regularRecords.length} page={currentPage} onPage={setCurrentPage} />

            {/* Backlog Submissions */}
            <div className="p-4 bg-slate-50 border-y border-slate-200 flex items-center gap-2 mt-4">
              <span className="p-1 bg-white rounded shadow-sm border border-slate-200">
                <BookOpen className="h-4 w-4 text-purple-600" />
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Supply (Backlog) Subject Evaluations ({supplyRecords.length})</h3>
            </div>
            <div className="overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-700 text-white text-sm font-semibold">
                    <th className="px-4 py-3 text-left whitespace-nowrap w-12">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                        checked={supplyRecords.filter(r => r.status === 'Evaluated' && isNoMarks(r.score)).length > 0 && 
                                 supplyRecords.filter(r => r.status === 'Evaluated' && isNoMarks(r.score)).every(r => selectedRecordIds.includes(r._id))}
                        onChange={() => handleSelectAll(supplyRecords)}
                        disabled={supplyRecords.filter(r => r.status === 'Evaluated' && isNoMarks(r.score)).length === 0}
                      />
                    </th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap min-w-[12rem]">Document / Subject</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Max Marks</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">Pass Marks</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Status</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Final Marks</th>
                    <th className="px-4 py-3 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSupplyRecords.map((record) => (
                    <tr key={record._id} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                      <td className="px-4 py-2.5 text-center">
                        {record.status === 'Evaluated' && isNoMarks(record.score) ? (
                          <input 
                            type="checkbox" 
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                            checked={selectedRecordIds.includes(record._id)}
                            onChange={() => handleSelectRecord(record._id)}
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-slate-900 whitespace-nowrap text-sm">{record.studentId?.fullName}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{record.studentId?.regdNo}</td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <p className="font-medium text-slate-900">{record.groupSubjectName || record.subjectId?.subName}</p>
                        <p className="text-xs text-slate-500">{record.subjectId?.subCode}</p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold text-slate-800">
                        {record.maxMarks ?? record.subjectId?.maxMarks ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center font-semibold text-slate-800">
                        {record.subjectId?.subPassMarks ?? '—'}
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            record.isAbsent ? 'bg-amber-100 text-amber-800' :
                            record.status === 'Evaluated' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {record.isAbsent ? 'Absent' : record.status === 'Evaluated' ? 'Evaluated' : 'Pending Evaluation'}
                          </span>
                          {record.status === 'Evaluated' && (
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${record.isApprovedByBOS ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
                              {record.isApprovedByBOS ? 'BOS Approved' : 'Pending BOS'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-right">
                        <span className={`font-bold text-base ${record.isAbsent ? 'text-amber-600' : 'text-emerald-600'}`}>
                          {record.isAbsent ? 'ABS' : (record.score !== null ? record.score : '-')}
                        </span>
                        {!record.isAbsent && <span className="text-slate-400 text-xs ml-1">/ {record.maxMarks}</span>}
                      </td>
                      <td className="px-4 py-2.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          {record.filePath && (
                            <a
                              href={`${API_BASE_URL}${record.filePath}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center px-2 py-1 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 hover:border-teal-600 rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                              title="View Record PDF"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              View
                            </a>
                          )}
                          {record.status !== 'Evaluated' && (
                            <button
                              onClick={() => setReallocateTarget(record)}
                              className="inline-flex items-center px-2 py-1 bg-white border border-teal-200 hover:bg-teal-50 text-teal-700 rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Re-allocate
                            </button>
                          )}
                          {record.status === 'Evaluated' && isNoMarks(record.score) && (
                            <button
                              onClick={() => handleResetEvaluation(record._id)}
                              className="inline-flex items-center px-2 py-1 bg-white border border-rose-200 hover:bg-rose-50 text-rose-700 rounded text-xs font-semibold cursor-pointer shadow-sm transition-colors"
                            >
                              <RefreshCw className="w-3 h-3 mr-1" />
                              Reset Eval
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {supplyRecords.length === 0 && (
                    <tr>
                      <td colSpan="8" className="px-6 py-8 text-center text-slate-500">No supply subject evaluations found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination total={supplyRecords.length} page={supplyPage} onPage={setSupplyPage} />
          </>
        ) : (
          <>
            {/* Regular Papers Table */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
              <span className="p-1 bg-white rounded shadow-sm border border-slate-200">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Regular Paper Grades ({regularPaperRows.length})</h3>
            </div>
            <div className="w-full relative overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead className="sticky top-0 z-10 shadow-sm">
                  <tr className="bg-teal-700 text-white text-sm font-semibold">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Semester</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Paper Name</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap min-w-[8rem]">Final Marks</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">BOS Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedRegularPapers.map((row, idx) => {
                    const isApproved = isPaperApproved(row);
                    return (
                      <tr key={`reg-${row.regdNo}-${row.paperCode || idx}`} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-medium text-slate-900">{row.fullName}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-mono text-xs">{row.regdNo}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{row.semester}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                          <p className="font-semibold text-slate-800">{row.paperName}</p>
                          <p className="text-xs text-slate-400">{row.paperCode}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center">
                          {row.obtainedScore !== null ? (
                            <span className={`inline-flex flex-col items-center px-3 py-1.5 rounded-md text-xs font-bold ${
                              row.resultStatus === 'PASS' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : row.resultStatus === 'FAIL' 
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              <span className="text-sm">{row.obtainedScore === 'ABS' ? 'ABS' : `${row.obtainedScore} / ${row.maxMarks}`}</span>
                              <span className="text-[9px] opacity-75 font-semibold mt-0.5">{row.resultStatus || (row.isPassed ? 'PASS' : 'FAIL')}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isApproved ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
                            {isApproved ? 'BOS Approved' : 'Pending BOS'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredRegularPapers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500 text-sm">No regular paper grades found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination total={filteredRegularPapers.length} page={paperPage} onPage={setPaperPage} />

            {/* Backlog Papers Table */}
            <div className="p-4 bg-slate-50 border-y border-slate-200 flex items-center gap-2 mt-4">
              <span className="p-1 bg-white rounded shadow-sm border border-slate-200">
                <BookOpen className="h-4 w-4 text-purple-600" />
              </span>
              <h3 className="font-bold text-slate-800 text-sm">Supply (Backlog) Paper Grades ({filteredSupplyPapers.length})</h3>
              <span className="text-xs text-slate-500 font-medium ml-2 bg-white px-2 py-0.5 rounded border border-slate-200">Consolidated with Regular marks</span>
            </div>
            <div className="overflow-x-auto sleek-scrollbar">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-teal-700 text-white text-sm font-semibold">
                    <th className="px-4 py-3 text-left whitespace-nowrap">Student Name</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Roll No.</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Semester</th>
                    <th className="px-4 py-3 text-left whitespace-nowrap">Paper Name</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap min-w-[8rem]">Consolidated Score</th>
                    <th className="px-4 py-3 text-center whitespace-nowrap">BOS Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pagedSupplyPapers.map((row, idx) => {
                    const isApproved = isPaperApproved(row);
                    return (
                      <tr key={`sup-${row.regdNo}-${row.paperCode || idx}`} className="border-b border-slate-100 hover:bg-teal-50 transition-colors">
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-medium text-slate-900">{row.fullName}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm font-mono text-xs">{row.regdNo}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">{row.semester}</td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm">
                          <p className="font-semibold text-slate-800">{row.paperName}</p>
                          <p className="text-xs text-slate-400">{row.paperCode}</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center">
                          {row.obtainedScore !== null ? (
                            <span className={`inline-flex flex-col items-center px-3 py-1.5 rounded-md text-xs font-bold ${
                              row.resultStatus === 'PASS' 
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                : row.resultStatus === 'FAIL' 
                                ? 'bg-red-50 text-red-700 border border-red-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              <span className="text-sm">{row.obtainedScore === 'ABS' ? 'ABS' : `${row.obtainedScore} / ${row.maxMarks}`}</span>
                              <span className="text-[9px] opacity-75 font-semibold mt-0.5">{row.resultStatus || (row.isPassed ? 'PASS' : 'FAIL')}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-xs">Pending</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap text-sm text-center">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${isApproved ? 'bg-teal-100 text-teal-800' : 'bg-amber-100 text-amber-800'}`}>
                            {isApproved ? 'BOS Approved' : 'Pending BOS'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredSupplyPapers.length === 0 && (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-slate-500 text-sm">No supply (backlog) paper grades found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Pagination total={filteredSupplyPapers.length} page={supplyPaperPage} onPage={setSupplyPaperPage} />
          </>
        )}
        
      </div>

      {resetModalData.open && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-slide-in">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-4 flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-lg">Reset Evaluation</h3>
              <button onClick={() => setResetModalData({ open: false, type: '', payload: null })} className="text-slate-400 hover:text-slate-600 transition-colors">
                &times;
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-slate-600 mb-4">
                Are you sure you want to reset {resetModalData.type === 'bulk' ? `these ${resetModalData.payload.length} evaluations` : 'this evaluation'}?
                <br /><br />
                Please select a new submission deadline for the student(s) to re-upload their records.
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1">New Submission Deadline <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  required
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  value={resetDeadline}
                  onChange={(e) => setResetDeadline(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setResetModalData({ open: false, type: '', payload: null })}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={submitResetEvaluation}
                  disabled={!resetDeadline}
                  className="px-4 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
                >
                  Confirm Reset
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {reallocateTarget && (
        <ReallocateModal
          assignment={reallocateTarget}
          onClose={() => setReallocateTarget(null)}
          onSuccess={handleReallocateSuccess}
        />
      )}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-teal-800 text-white px-4 py-3 rounded-md shadow-lg flex items-center gap-2 border border-teal-600 animate-slide-in">
          <span className="font-semibold text-sm">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default EvaluatedRecords;
