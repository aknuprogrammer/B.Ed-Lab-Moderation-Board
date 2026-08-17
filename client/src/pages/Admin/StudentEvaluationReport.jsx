import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  ClipboardCheck, Download, Search, RefreshCw, Filter, CheckCircle, 
  X, AlertCircle, FileSpreadsheet, Archive, UserCheck, ShieldCheck, Clock, Trash2 
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';
import SearchableDropdown from '../../components/SearchableDropdown';
import ConfirmModal from '../../components/ConfirmModal';

const API = `${API_BASE_URL}/api/admin`;

export default function StudentEvaluationReport() {
  const token = localStorage.getItem('token');
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [downloadingZip, setDownloadingZip] = useState(false);
  const [purging, setPurging] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [confirmPurgeModal, setConfirmPurgeModal] = useState({ isOpen: false, onConfirm: null });

  // Dropdown lists
  const [colleges, setColleges] = useState([]);
  const [courses, setCourses] = useState([]);
  const [semesters, setSemesters] = useState([]);

  // Filters
  const [selectedCollege, setSelectedCollege] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedEvaluatorAssigned, setSelectedEvaluatorAssigned] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;

  const fetchDropdowns = async () => {
    try {
      const [colRes, curRes, semRes] = await Promise.all([
        axios.get(`${API}/colleges`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/courses`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/semesters`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setColleges((colRes.data || []).map(c => ({ value: c._id, label: `${c.collegeCode} - ${c.collegeName}` })));
      setCourses((curRes.data || []).map(c => ({ value: c._id, label: `${c.courseCode} - ${c.courseName}` })));
      setSemesters((semRes.data || []).map(s => ({ value: s, label: s })));
    } catch (err) {
      console.error('Error fetching dropdowns:', err);
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (selectedCollege) params.append('collegeId', selectedCollege);
      if (selectedCourse) params.append('courseId', selectedCourse);
      if (selectedSemester) params.append('semester', selectedSemester);
      if (selectedStatus) params.append('status', selectedStatus);
      if (selectedEvaluatorAssigned) params.append('evaluatorAssigned', selectedEvaluatorAssigned);
      if (searchTerm) params.append('search', searchTerm);

      const res = await axios.get(`${API}/evaluation-report?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReportData(res.data || []);
    } catch (err) {
      console.error('Error fetching evaluation report:', err);
      setError('Failed to load evaluation report data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDropdowns();
  }, [token]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReportData();
    }, 300);
    return () => clearTimeout(timer);
  }, [token, selectedCollege, selectedCourse, selectedSemester, selectedStatus, selectedEvaluatorAssigned, searchTerm]);

  // Filtered dataset
  const filteredReport = reportData;

  // Statistics
  const stats = useMemo(() => {
    const total = filteredReport.length;
    const evaluated = filteredReport.filter(r => r.status === 'Evaluated').length;
    const submitted = filteredReport.filter(r => r.status === 'Submitted').length;
    const pending = filteredReport.filter(r => r.status === 'Pending').length;
    const passed = filteredReport.filter(r => r.resultStatus === 'PASS').length;
    const failed = filteredReport.filter(r => r.resultStatus === 'FAIL').length;
    const assigned = filteredReport.filter(r => r.evaluatorName !== 'Unassigned').length;

    return { total, evaluated, submitted, pending, passed, failed, assigned };
  }, [filteredReport]);

  const totalPages = Math.ceil(filteredReport.length / PAGE_SIZE);
  const startIndex = (currentPage - 1) * PAGE_SIZE;
  const pagedReport = filteredReport.slice(startIndex, startIndex + PAGE_SIZE);

  // Download Bulk ZIP handler
  const handleDownloadZip = async () => {
    try {
      setDownloadingZip(true);
      setError('');
      const params = new URLSearchParams();
      if (selectedSemester) params.append('semester', selectedSemester);
      if (selectedCollege) params.append('collegeId', selectedCollege);

      const response = await axios.get(`${API}/download-bulk-zip?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Student_Records_Bulk_${Date.now()}.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading bulk zip:', err);
      setError('Failed to download bulk ZIP archive.');
    } finally {
      setDownloadingZip(false);
    }
  };

  // Purge & Delete Records handler
  const handlePurgeRecords = () => {
    setConfirmPurgeModal({
      isOpen: true,
      onConfirm: async () => {
        try {
          setPurging(true);
          setError('');
          setSuccessMessage('');
          const payload = {};
          if (selectedCollege) payload.collegeId = selectedCollege;
          if (selectedSemester) payload.semester = selectedSemester;
          if (selectedStatus) payload.status = selectedStatus;

          const res = await axios.post(`${API}/purge-records`, payload, {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (res.data.success) {
            setSuccessMessage(res.data.message || 'Records purged successfully.');
            fetchReportData();
            setTimeout(() => setSuccessMessage(''), 5000);
          }
        } catch (err) {
          console.error('Purge error:', err);
          setError(err.response?.data?.message || 'Failed to purge records.');
        } finally {
          setPurging(false);
          setConfirmPurgeModal(prev => ({ ...prev, isOpen: false }));
        }
      }
    });
  };

  // Export to Excel (.xlsx) handler
  const handleExportExcel = async () => {
    try {
      const XLSX = await import('xlsx');
      const headers = [
        'Registration Number',
        'Student Name',
        'College Code',
        'College Name',
        'Course',
        'Semester',
        'Subject Code',
        'Subject Name',
        'Assignment Mode',
        'Assigned Evaluator',
        'Evaluator Email',
        'Status',
        'Score',
        'Max Marks',
        'Pass Mark',
        'Result',
        'Submitted At'
      ];

      const rows = filteredReport.map(r => [
        r.regdNo,
        r.studentName,
        r.collegeCode,
        r.collegeName,
        r.courseCode,
        r.semester,
        r.subjectCode,
        r.subjectName,
        r.mode,
        r.evaluatorName,
        r.evaluatorEmail,
        r.status,
        r.score !== 'N/A' ? r.score : '',
        r.maxMarks,
        r.passMark,
        r.resultStatus,
        r.submittedAt ? new Date(r.submittedAt).toLocaleDateString() : ''
      ]);

      const data = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Evaluation Report');
      XLSX.writeFile(wb, `Student_Evaluation_Report_${Date.now()}.xlsx`);
    } catch (err) {
      console.error('Excel Export Error:', err);
      setError('Failed to export Excel report.');
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fadeIn">
      {/* Top Title & Quick Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-teal-100/60 text-teal-800 rounded-xl flex-shrink-0">
            <ClipboardCheck className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Student Records & Evaluation Report</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive report of assigned evaluators, submission statuses, scores, and Pass/Fail results for all students.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap xl:flex-nowrap justify-start xl:justify-end">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer flex-shrink-0"
            title="Refresh Data"
          >
            <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleExportExcel}
            disabled={filteredReport.length === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
          >
            <FileSpreadsheet className="h-4 w-4" />
            Excel (.xlsx)
          </button>
          <button
            onClick={handleDownloadZip}
            disabled={downloadingZip}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
          >
            {downloadingZip ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Archive className="h-4 w-4" />}
            {downloadingZip ? 'Generating ZIP...' : 'Bulk Records (ZIP)'}
          </button>
          <button
            onClick={handlePurgeRecords}
            disabled={purging || filteredReport.length === 0}
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs sm:text-sm font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-xs whitespace-nowrap"
            title="Permanently delete matching records and server disk PDF files to reclaim storage space"
          >
            {purging ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {purging ? 'Purging...' : 'Purge Records'}
          </button>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-sm flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle className="h-5 w-5 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Total Records</span>
          <span className="text-2xl font-bold text-slate-800 mt-1 block">{stats.total}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Assigned Evaluator</span>
          <span className="text-2xl font-bold text-teal-700 mt-1 block">{stats.assigned}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Evaluated</span>
          <span className="text-2xl font-bold text-emerald-700 mt-1 block">{stats.evaluated}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-slate-500 font-medium uppercase tracking-wider block">Submitted</span>
          <span className="text-2xl font-bold text-amber-600 mt-1 block">{stats.submitted}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-emerald-600 font-medium uppercase tracking-wider block">Passed</span>
          <span className="text-2xl font-bold text-emerald-600 mt-1 block">{stats.passed}</span>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs text-rose-600 font-medium uppercase tracking-wider block">Failed</span>
          <span className="text-2xl font-bold text-rose-600 mt-1 block">{stats.failed}</span>
        </div>
      </div>

      {/* Filter Panel & Search */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">College</label>
            <SearchableDropdown
              options={[{ value: '', label: 'All Colleges' }, ...colleges]}
              value={selectedCollege}
              onChange={(val) => { setSelectedCollege(val); setCurrentPage(1); }}
              placeholder="All Colleges"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Course</label>
            <SearchableDropdown
              options={[{ value: '', label: 'All Courses' }, ...courses]}
              value={selectedCourse}
              onChange={(val) => { setSelectedCourse(val); setCurrentPage(1); }}
              placeholder="All Courses"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Semester</label>
            <SearchableDropdown
              options={[{ value: '', label: 'All Semesters' }, ...semesters]}
              value={selectedSemester}
              onChange={(val) => { setSelectedSemester(val); setCurrentPage(1); }}
              placeholder="All Semesters"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Evaluation Status</label>
            <select
              value={selectedStatus}
              onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
              className="w-full h-[38px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md outline-none focus:border-teal-500 font-medium text-slate-700"
            >
              <option value="">All Statuses</option>
              <option value="Evaluated">Evaluated</option>
              <option value="Submitted">Submitted (Pending Eval)</option>
              <option value="Pending">Pending Student Submission</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Evaluator Assignment</label>
            <select
              value={selectedEvaluatorAssigned}
              onChange={(e) => { setSelectedEvaluatorAssigned(e.target.value); setCurrentPage(1); }}
              className="w-full h-[38px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-md outline-none focus:border-teal-500 font-medium text-slate-700"
            >
              <option value="">All Assignments</option>
              <option value="assigned">Evaluator Assigned</option>
              <option value="unassigned">Unassigned</option>
            </select>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative max-w-lg">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Reg. No, Student Name, Evaluator Name, or Subject..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg outline-none focus:border-teal-500 text-slate-800 font-medium"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3.5">Reg. No</th>
                <th className="px-4 py-3.5">Student Name</th>
                <th className="px-4 py-3.5">College</th>
                <th className="px-4 py-3.5">Sem & Subject</th>
                <th className="px-4 py-3.5">Assigned Evaluator</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-center">Score</th>
                <th className="px-4 py-3.5 text-center">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {pagedReport.map((r) => (
                <tr key={r._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.regdNo}</td>
                  <td className="px-4 py-3 font-medium text-slate-800">{r.studentName}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">
                    <span className="font-semibold block text-slate-700">{r.collegeCode}</span>
                    <span className="truncate max-w-[200px] block">{r.collegeName}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <span className="font-bold text-teal-800 block">Sem: {r.semester}</span>
                    <span className="text-slate-600 block">{r.subjectCode} - {r.subjectName}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {r.evaluatorName !== 'Unassigned' ? (
                      <div className="flex items-center gap-1.5 text-teal-800">
                        <UserCheck className="h-4 w-4 text-teal-600" />
                        <div>
                          <span className="font-semibold block">{r.evaluatorName}</span>
                          <span className="text-slate-400 text-[11px]">{r.evaluatorEmail}</span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.status === 'Evaluated' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        Evaluated
                      </span>
                    )}
                    {r.status === 'Submitted' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Submitted
                      </span>
                    )}
                    {r.status === 'Pending' && (
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-800">
                    {r.score !== 'N/A' ? `${r.score} / ${r.maxMarks}` : '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {r.resultStatus === 'PASS' && (
                      <span className="px-3 py-1 rounded-md text-xs font-extrabold bg-emerald-600 text-white shadow-xs">
                        PASS
                      </span>
                    )}
                    {r.resultStatus === 'FAIL' && (
                      <span className="px-3 py-1 rounded-md text-xs font-extrabold bg-rose-600 text-white shadow-xs">
                        FAIL
                      </span>
                    )}
                    {r.resultStatus !== 'PASS' && r.resultStatus !== 'FAIL' && (
                      <span className="text-slate-400 text-xs">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {filteredReport.length === 0 && !loading && (
          <div className="text-center py-12 text-slate-500 text-sm">
            No evaluation records found matching your filters.
          </div>
        )}

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-100 bg-slate-50">
            <span className="text-xs text-slate-500">
              Showing <span className="font-semibold text-slate-700">{startIndex + 1}–{Math.min(startIndex + PAGE_SIZE, filteredReport.length)}</span> of <span className="font-semibold text-slate-700">{filteredReport.length}</span> records
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded-md text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Prev
              </button>
              <span className="text-xs font-bold text-slate-700 px-3">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded-md text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Permanent Record & File Purge */}
      <ConfirmModal
        isOpen={confirmPurgeModal.isOpen}
        onClose={() => setConfirmPurgeModal(prev => ({ ...prev, isOpen: false }))}
        onConfirm={confirmPurgeModal.onConfirm}
        title="Permanently Purge & Delete Records?"
        message={`Are you sure you want to PERMANENTLY delete the matching records and remove their uploaded PDF files from server disk storage? This will reclaim server disk space but CANNOT BE UNDONE.`}
        variant="danger"
        confirmText="Yes, Delete & Reclaim Storage"
        cancelText="Cancel"
        loading={purging}
      />
    </div>
  );
}
