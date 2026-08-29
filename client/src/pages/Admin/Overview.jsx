import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Users,
  School,
  FileText,
  CheckCircle,
  Clock,
  Search,
  ChevronDown,
  Check,
  RefreshCw,
  AlertCircle,
  ShieldCheck,
  UserCheck,
  Eye,
  X
} from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

const Overview = () => {
  const [colleges, setColleges] = useState([]);
  const [selectedCollege, setSelectedCollege] = useState({ _id: 'all', collegeName: 'All Colleges', collegeCode: '' });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Missing Marks Modal State
  const [isMissingMarksModalOpen, setIsMissingMarksModalOpen] = useState(false);
  const [selectedMissingCollege, setSelectedMissingCollege] = useState(null);
  const [missingMarksDetails, setMissingMarksDetails] = useState([]);
  const [loadingMissingMarks, setLoadingMissingMarks] = useState(false);

  // Pending Reuploads Modal State
  const [isPendingReuploadsModalOpen, setIsPendingReuploadsModalOpen] = useState(false);
  const [selectedPendingCollege, setSelectedPendingCollege] = useState(null);
  const [pendingReuploadsDetails, setPendingReuploadsDetails] = useState([]);
  const [loadingPendingReuploads, setLoadingPendingReuploads] = useState(false);

  // Dropdown UI states
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchColleges = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/colleges`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setColleges(res.data || []);
    } catch (err) {
      console.error('Error fetching colleges:', err);
    }
  };

  const fetchStats = async (collegeId) => {
    setLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const url = `${API_BASE_URL}/api/admin/dashboard-stats?collegeId=${collegeId}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError(err.response?.data?.message || 'Failed to load statistics.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewMissingMarks = async (college) => {
    setSelectedMissingCollege(college);
    setIsMissingMarksModalOpen(true);
    setLoadingMissingMarks(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/missing-suggested-marks/${college._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMissingMarksDetails(res.data || []);
    } catch (err) {
      console.error('Error fetching missing marks details:', err);
    } finally {
      setLoadingMissingMarks(false);
    }
  };

  const handleViewPendingReuploads = async (college) => {
    setSelectedPendingCollege(college);
    setIsPendingReuploadsModalOpen(true);
    setLoadingPendingReuploads(true);
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${API_BASE_URL}/api/admin/pending-reuploads/${college._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPendingReuploadsDetails(res.data || []);
    } catch (err) {
      console.error('Error fetching pending reuploads details:', err);
    } finally {
      setLoadingPendingReuploads(false);
    }
  };

  useEffect(() => {
    fetchColleges();
    fetchStats('all');
  }, []);

  const handleCollegeSelect = (college) => {
    setSelectedCollege(college);
    setIsDropdownOpen(false);
    setSearchQuery('');
    fetchStats(college._id);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = () => {
      setIsDropdownOpen(false);
    };
    window.addEventListener('click', handleOutsideClick);
    return () => window.removeEventListener('click', handleOutsideClick);
  }, []);

  const filteredColleges = colleges.filter(c =>
    c.collegeName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.collegeCode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Normalize stats fallback values if not loaded yet
  const totalPrincipals = stats?.totalPrincipals ?? 0;
  const totalPrincipalsRegistered = stats?.totalPrincipalsRegistered ?? 0;
  const totalStudents = stats?.totalStudents ?? 0;
  const totalStudentsRegistered = stats?.totalStudentsRegistered ?? 0;
  const totalRecords = stats?.totalRecords ?? 0;
  const totalRecordsSubmitted = stats?.totalRecordsSubmitted ?? 0;
  const totalRecordsPending = stats?.totalRecordsPending ?? 0;

  // Calculate percentages
  const principalRegPct = totalPrincipals > 0 ? Math.round((totalPrincipalsRegistered / totalPrincipals) * 100) : 0;
  const studentRegPct = totalStudents > 0 ? Math.round((totalStudentsRegistered / totalStudents) * 100) : 0;

  const recordsSubmittedPct = totalRecords > 0 ? Math.round((totalRecordsSubmitted / totalRecords) * 100) : 0;
  const recordsPendingPct = totalRecords > 0 ? Math.round((totalRecordsPending / totalRecords) * 100) : 0;
  
  const missingSuggestedMarksByCollege = stats?.missingSuggestedMarksByCollege || [];
  const pendingReuploadsByCollege = stats?.pendingReuploadsByCollege || [];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-teal-800 to-slate-900 rounded-lg p-6 text-white shadow-md relative overflow-hidden border border-slate-700/30">
        <div className="absolute top-[-20%] right-[-10%] w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-100 to-teal-100 bg-clip-text text-transparent">
              System Dashboard
            </h1>
            <p className="text-teal-200/80 text-sm font-medium mt-1">
              Real-time summary statistics for registrations, students, and lab records.
            </p>
          </div>
          <button
            onClick={() => fetchStats(selectedCollege._id)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/15 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh Stats
          </button>
        </div>
      </div>

      {/* College Dropdown Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-200 p-4 rounded-lg shadow-sm">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-700">Select College Scope:</span>
        </div>
        <div className="relative w-full sm:w-96" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full flex items-center justify-between px-3 py-2 border border-slate-300 rounded-md text-sm bg-white text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 cursor-pointer shadow-sm"
          >
            <span className="truncate font-medium">
              {selectedCollege._id === 'all'
                ? 'All Colleges'
                : `${selectedCollege.collegeCode} - ${selectedCollege.collegeName}`}
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />
          </button>

          {isDropdownOpen && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-auto">
              <div className="sticky top-0 bg-white p-2 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-md text-xs bg-white text-slate-700 outline-none focus:ring-1 focus:ring-teal-500"
                    placeholder="Search by college name or code..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <div className="py-1">
                {/* All Colleges Option */}
                <div
                  onClick={() => handleCollegeSelect({ _id: 'all', collegeName: 'All Colleges', collegeCode: '' })}
                  className="px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50 cursor-pointer flex items-center justify-between border-b border-slate-100"
                >
                  <span>All Colleges</span>
                  {selectedCollege._id === 'all' && <Check className="h-4 w-4 text-teal-600" />}
                </div>

                {filteredColleges.map((c) => (
                  <div
                    key={c._id}
                    onClick={() => handleCollegeSelect(c)}
                    className="px-3 py-2 text-xs text-slate-700 hover:bg-teal-50 cursor-pointer flex items-center justify-between"
                  >
                    <span className="truncate">{c.collegeCode} - {c.collegeName}</span>
                    {selectedCollege._id === c._id && <Check className="h-4 w-4 text-teal-600" />}
                  </div>
                ))}

                {filteredColleges.length === 0 && searchQuery && (
                  <div className="px-3 py-4 text-xs text-center text-slate-500">
                    No colleges match your search.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg flex items-center gap-3 shadow-sm">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
      )}

      {/* User Stats Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          User & Enrollment Stats
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Principals */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3.5 bg-teal-50 text-teal-600 rounded-lg">
              <School className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Principals</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalPrincipals}</p>
            </div>
          </div>

          {/* Registered Principals */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Principals Registered</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalPrincipalsRegistered}</p>
            </div>
          </div>

          {/* Total Students */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3.5 bg-blue-50 text-blue-600 rounded-lg">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Students</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalStudents}</p>
            </div>
          </div>

          {/* Registered Students */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
            <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <UserCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Students Registered</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalStudentsRegistered}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Record Stats Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Lab Record Stats
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Total Records */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
            <div className="p-4 bg-purple-50 text-purple-600 rounded-lg">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Records Assigned</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalRecords}</p>
            </div>
          </div>

          {/* Records Submitted */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
            <div className="p-4 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Re-uploaded / Submitted</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalRecordsSubmitted}</p>
            </div>
          </div>

          {/* Records Pending */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex items-center gap-5 hover:shadow-md transition-all">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Records</p>
              <p className="text-2xl font-bold text-slate-900 mt-1">{loading ? '-' : totalRecordsPending}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Graphical Insights Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Visual Analytics & Charts
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Progress Bars */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[360px]">
            <div>
              <h2 className="text-base font-bold text-slate-800">Registration Completion</h2>
              <p className="text-xs text-slate-500 mt-0.5">Registration rates out of total master database records.</p>
            </div>

            <div className="flex justify-around items-center my-auto py-4"> 
              {/* Student Progress */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-28 h-28">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    {!loading && studentRegPct > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#3b82f6"
                        strokeWidth="3.5"
                        strokeDasharray={`${studentRegPct} ${100 - studentRegPct}`}
                        strokeDashoffset="25"
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-extrabold text-slate-800">
                      {loading ? '-' : `${studentRegPct}%`}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 mt-1">Student Enrollment</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {loading ? '-' : `${totalStudentsRegistered} / ${totalStudents}`}
                </span>
              </div>

              {/* Principal Progress */}
              <div className="flex flex-col items-center gap-2">
                <div className="relative flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-28 h-28">
                    <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                    {!loading && principalRegPct > 0 && (
                      <circle
                        cx="18"
                        cy="18"
                        r="15.915"
                        fill="none"
                        stroke="#10b981"
                        strokeWidth="3.5"
                        strokeDasharray={`${principalRegPct} ${100 - principalRegPct}`}
                        strokeDashoffset="25"
                        strokeLinecap="round"
                        className="transition-all duration-500"
                      />
                    )}
                  </svg>
                  <div className="absolute flex flex-col items-center justify-center text-center">
                    <span className="text-xl font-extrabold text-slate-800">
                      {loading ? '-' : `${principalRegPct}%`}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-600 mt-1">Principal Enrollment</span>
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {loading ? '-' : `${totalPrincipalsRegistered} / ${totalPrincipals}`}
                </span>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-3 mt-3">
              * Users must register to submit and evaluate digitized records.
            </div>
          </div>

          {/* Doughnut Chart */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between min-h-[360px]">
            <div>
              <h2 className="text-base font-bold text-slate-800">Lab Record Submissions</h2>
              <p className="text-xs text-slate-500 mt-0.5">Completion status of generated student record files.</p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 my-auto py-2">
              {/* SVG Doughnut */}
              <div className="relative flex items-center justify-center shrink-0">
                <svg viewBox="0 0 36 36" className="w-36 h-36">
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="3.5" />

                  {!loading && recordsSubmittedPct > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="3.8"
                      strokeDasharray={`${recordsSubmittedPct} ${100 - recordsSubmittedPct}`}
                      strokeDashoffset="25"
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  )}

                  {!loading && recordsPendingPct > 0 && (
                    <circle
                      cx="18"
                      cy="18"
                      r="15.915"
                      fill="none"
                      stroke="#f59e0b"
                      strokeWidth="3.8"
                      strokeDasharray={`${recordsPendingPct} ${100 - recordsPendingPct}`}
                      strokeDashoffset={25 - recordsSubmittedPct}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  )}
                </svg>
                <div className="absolute flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-extrabold text-slate-800">
                    {loading ? '-' : totalRecords}
                  </span>
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                    Total Assigned
                  </span>
                </div>
              </div>

              {/* Breakdown Details */}
              <div className="w-full sm:w-48 space-y-3">
                <div className="divide-y divide-slate-100 text-xs">
                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <span className="font-semibold text-slate-600">Re-uploaded / Submitted</span>
                    </div>
                    <div className="font-bold text-slate-900 text-right">
                      {loading ? '-' : `${totalRecordsSubmitted} (${recordsSubmittedPct}%)`}
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
                      <span className="font-semibold text-slate-600">Pending Records</span>
                    </div>
                    <div className="font-bold text-slate-900 text-right">
                      {loading ? '-' : `${totalRecordsPending} (${recordsPendingPct}%)`}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-3 mt-3 text-center sm:text-left">
              * Progress updates automatically on student upload action.
            </div>
          </div>
        </div>
      </div>

      {/* Missing Suggested Marks Section */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Missing Suggested Marks (Action Required by Principals)
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            <p className="text-sm font-medium text-slate-700">
              The following colleges have submitted records but have not yet provided "Suggested Marks". These records cannot be evaluated until the Principal saves the suggested marks.
            </p>
          </div>
          
          <div className="overflow-x-auto max-h-80 elegant-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">College Code</th>
                  <th className="px-6 py-3">College Name</th>
                  <th className="px-6 py-3 text-center">Records Missing Suggested Marks</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-400">Loading data...</td>
                  </tr>
                ) : missingSuggestedMarksByCollege.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center font-medium text-emerald-600 flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5" /> All submitted records have suggested marks!
                    </td>
                  </tr>
                ) : (
                  missingSuggestedMarksByCollege.map((college, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-semibold text-slate-900">{college.collegeCode}</td>
                      <td className="px-6 py-3 font-medium">{college.collegeName}</td>
                      <td className="px-6 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200 min-w-[3rem]">
                          {college.missingCount}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleViewMissingMarks(college)}
                          className="p-1.5 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Reuploads Section */}
      <div className="space-y-4 mt-8">
        <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500">
          Pending Re-uploads (Action Required by Principals)
        </h2>
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-3">
            <Clock className="h-5 w-5 text-indigo-500" />
            <p className="text-sm font-medium text-slate-700">
              The following colleges have students who have not yet re-uploaded their required records (or have missing records).
            </p>
          </div>
          
          <div className="overflow-x-auto max-h-80 elegant-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600 font-semibold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3">College Code</th>
                  <th className="px-6 py-3">College Name</th>
                  <th className="px-6 py-3 text-center">Pending Re-uploads</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center text-slate-400">Loading data...</td>
                  </tr>
                ) : pendingReuploadsByCollege.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="px-6 py-8 text-center font-medium text-emerald-600 flex items-center justify-center gap-2">
                      <CheckCircle className="h-5 w-5" /> All students have re-uploaded their records!
                    </td>
                  </tr>
                ) : (
                  pendingReuploadsByCollege.map((college, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50">
                      <td className="px-6 py-3 font-semibold text-slate-900">{college.collegeCode}</td>
                      <td className="px-6 py-3 font-medium">{college.collegeName}</td>
                      <td className="px-6 py-3 text-center">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-100 text-indigo-800 border border-indigo-200 min-w-[3rem]">
                          {college.pendingCount}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button
                          onClick={() => handleViewPendingReuploads(college)}
                          className="p-1.5 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-md transition-colors"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Missing Suggested Marks Modal */}
      {isMissingMarksModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-500" />
                  Missing Suggested Marks - {selectedMissingCollege?.collegeName}
                </h3>
                <p className="text-xs text-slate-500 mt-1">College Code: {selectedMissingCollege?.collegeCode}</p>
              </div>
              <button 
                onClick={() => setIsMissingMarksModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              {loadingMissingMarks ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mb-4" />
                  <p className="text-slate-500 font-medium text-sm">Loading details...</p>
                </div>
              ) : missingMarksDetails.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-medium">
                  No records missing suggested marks for this college.
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Student Name</th>
                        <th className="px-4 py-3">Regd No</th>
                        <th className="px-4 py-3">Subject Name</th>
                        <th className="px-4 py-3">Subject Code</th>
                        <th className="px-4 py-3 text-center">Max Marks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {missingMarksDetails.map((detail, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 font-semibold text-slate-900">{detail.studentName}</td>
                          <td className="px-4 py-3 text-slate-600">{detail.studentRegdNo}</td>
                          <td className="px-4 py-3">{detail.subjectName}</td>
                          <td className="px-4 py-3 text-slate-500">{detail.subjectCode}</td>
                          <td className="px-4 py-3 text-center font-medium">{detail.maxMarks}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
              <button 
                onClick={() => setIsMissingMarksModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Reuploads Modal */}
      {isPendingReuploadsModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-indigo-500" />
                  Pending Re-uploads - {selectedPendingCollege?.collegeName}
                </h3>
                <p className="text-xs text-slate-500 mt-1">College Code: {selectedPendingCollege?.collegeCode}</p>
              </div>
              <button 
                onClick={() => setIsPendingReuploadsModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-md transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 bg-slate-50">
              {loadingPendingReuploads ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <RefreshCw className="h-8 w-8 text-teal-600 animate-spin mb-4" />
                  <p className="text-slate-500 font-medium text-sm">Loading details...</p>
                </div>
              ) : pendingReuploadsDetails.length === 0 ? (
                <div className="text-center py-12 text-slate-500 font-medium">
                  No pending re-uploads found for this college.
                </div>
              ) : (
                <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 w-16 text-center">S.No</th>
                        <th className="px-4 py-3">Student Reg No</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">Subject</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {pendingReuploadsDetails.map((detail, idx) => (
                        <tr key={idx} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-center text-slate-500 font-medium">{detail.sNo}</td>
                          <td className="px-4 py-3 text-slate-600">{detail.regdNo}</td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{detail.name}</td>
                          <td className="px-4 py-3">{detail.subject}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold ${
                              detail.status === 'Pending' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                            }`}>
                              {detail.status === 'Pending' ? 'Missing' : 'Not Re-uploaded'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
              <button 
                onClick={() => setIsPendingReuploadsModalOpen(false)}
                className="px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold rounded-md transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Overview;
