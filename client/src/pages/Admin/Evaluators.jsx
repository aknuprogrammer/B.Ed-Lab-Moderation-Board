import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import { Users, BookOpen, CheckCircle, Search, ChevronDown, Check, AlertCircle, Filter, Edit, Clock, X, Square, CheckSquare, Activity, Eye } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';
import SearchableDropdown from '../../components/SearchableDropdown';
import ActivityFeed from '../../components/ActivityFeed';

const API = `${API_BASE_URL}/api/admin`;

export default function Evaluators() {
  const token = localStorage.getItem('token');
  const [subjects, setSubjects] = useState([]);
  const [groups, setGroups] = useState([]);
  const [evaluators, setEvaluators] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [submittedSubjects, setSubmittedSubjects] = useState({ subjectIds: [], groupSubjectNames: [], fullyAllocatedSubjectIds: [], fullyAllocatedGroupNames: [] });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showActivity, setShowActivity] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [resettingAllocations, setResettingAllocations] = useState(false);

  // Selection state
  const [allocationMode, setAllocationMode] = useState('Regular');
  const [selectedSubjects, setSelectedSubjects] = useState([]); // Array of { id, name, type, groupCode }
  const [selectedGroupCode, setSelectedGroupCode] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('');
  const [subjectSearch, setSubjectSearch] = useState('');

  // Stats state
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(false);

  // Allocation form state
  const [allocationEvaluatorId, setAllocationEvaluatorId] = useState('');
  const [splitMethod, setSplitMethod] = useState('ALL');
  const [allocationCount, setAllocationCount] = useState('');
  const [allocationColleges, setAllocationColleges] = useState([]);
  const [rollStart, setRollStart] = useState('');
  const [rollEnd, setRollEnd] = useState('');
  const [valuationDeadline, setValuationDeadline] = useState('');
  const [allocating, setAllocating] = useState(false);
  const [selectedEvaluatorsForExtension, setSelectedEvaluatorsForExtension] = useState([]);
  const [extensionDeadline, setExtensionDeadline] = useState('');
  const [extending, setExtending] = useState(false);

  // Tabs and assigned subjects state
  const [activeTab, setActiveTab] = useState('allocate');
  const [assignedSubjectsData, setAssignedSubjectsData] = useState([]);
  const [assignedLoading, setAssignedLoading] = useState(false);
  const [assignedSearch, setAssignedSearch] = useState('');
  const [viewStudentsModal, setViewStudentsModal] = useState({ isOpen: false, evaluatorName: '', subjectName: '', students: [] });

  const fetchAssignedSubjects = useCallback(async () => {
    try {
      setAssignedLoading(true);
      const res = await axios.get(`${API}/evaluator-assignments-grouped`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAssignedSubjectsData(res.data || []);
    } catch (err) {
      console.error('Failed to load assigned subjects', err);
      setError('Failed to load assigned subjects.');
    } finally {
      setAssignedLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (activeTab === 'assigned') {
      fetchAssignedSubjects();
    }
  }, [activeTab, fetchAssignedSubjects, refreshTrigger]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [subRes, groupRes, evRes, colRes] = await Promise.all([
          axios.get(`${API}/subjects`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/groups`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/evaluators`, { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/colleges`, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        setSubjects(subRes.data || []);
        setGroups(groupRes.data || []);
        setEvaluators(evRes.data || []);
        setColleges(colRes.data || []);
      } catch (err) {
        setError('Failed to load basic data.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const fetchSubmitted = useCallback(async () => {
    try {
      const submRes = await axios.get(`${API}/subjects-with-submissions?mode=${allocationMode}`, { headers: { Authorization: `Bearer ${token}` } });
      setSubmittedSubjects(submRes.data || { subjectIds: [], groupSubjectNames: [], fullyAllocatedSubjectIds: [], fullyAllocatedGroupNames: [] });
    } catch (err) {
      console.error('Failed to load submitted subjects', err);
    }
  }, [allocationMode, token]);

  useEffect(() => {
    fetchSubmitted();
    setSelectedSubjects([]);
    setStats(null);
  }, [allocationMode, token]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const uniqueSemesters = useMemo(() => [...new Set(subjects.map(s => s.semester).filter(Boolean))].sort(), [subjects]);
  const regularSubjects = useMemo(() => {
    if (!selectedSemester) return [];

    return subjects.filter(s =>
      s.studentChoice !== 'C' &&
      s.studentChoice !== 'c' &&
      s.semester === selectedSemester
    );
  }, [subjects, selectedSemester]);
  const activeGroup = useMemo(() => groups.find(g => g.groupCode === selectedGroupCode), [groups, selectedGroupCode]);
  const activeGroupSubjects = activeGroup?.subjects || [];

  const combinedSubjectList = useMemo(() => {
    let list = regularSubjects.map(s => ({
      id: s._id,
      name: `${s.subCode ? s.subCode + ' - ' : ''}${s.subName}`,
      type: 'CORE',
      isFullyAllocated: submittedSubjects.fullyAllocatedSubjectIds?.includes(s._id)
    }));

    if (activeGroupSubjects.length > 0) {
      const groupSubjList = activeGroupSubjects.map(name => ({
        id: name,
        name: name,
        type: 'GROUP',
        groupCode: activeGroup.groupCode,
        isFullyAllocated: submittedSubjects.fullyAllocatedGroupNames?.includes(name)
      }));
      list = [...list, ...groupSubjList];
    }

    if (subjectSearch) {
      list = list.filter(s => s.name.toLowerCase().includes(subjectSearch.toLowerCase()));
    }

    // Filter out subjects that have no submitted records
    list = list.filter(s => {
      if (s.type === 'CORE') return submittedSubjects.subjectIds.includes(s.id);
      return submittedSubjects.groupSubjectNames.includes(s.name);
    });

    return list;
  }, [regularSubjects, activeGroupSubjects, subjectSearch, activeGroup, submittedSubjects]);

  const isSubjectSelected = (sub) => {
    return selectedSubjects.some(s => s.id === sub.id && s.type === sub.type);
  };

  const toggleSubject = (sub) => {
    if (sub.isFullyAllocated) return;
    setSelectedSubjects(prev => {
      if (isSubjectSelected(sub)) return prev.filter(s => !(s.id === sub.id && s.type === sub.type));
      return [...prev, sub];
    });
  };

  const fetchStats = async (clearSuccess = true) => {
    if (selectedSubjects.length === 0) {
      setStats(null);
      return;
    }

    setStatsLoading(true);
    setError('');
    if (clearSuccess) {
      setSuccess('');
    }
    try {
      const parsedSubjects = selectedSubjects.map(s => s.type === 'CORE' ? { subjectId: s.id } : { groupSubjectName: s.name });
      const res = await axios.get(`${API}/subject-allocation-stats`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { subjects: JSON.stringify(parsedSubjects), mode: allocationMode }
      });
      setStats(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    setSelectedEvaluatorsForExtension([]);
    setExtensionDeadline('');
  }, [selectedSubjects]);

  const handleAllocate = async (e) => {
    e.preventDefault();
    if (selectedSubjects.length === 0) return setError('Please select a subject.');
    if (!allocationEvaluatorId) return setError('Please select an evaluator.');
    if (!valuationDeadline) return setError('Please select a valuation date.');
    if (splitMethod === 'COUNT' && (!allocationCount || allocationCount <= 0)) return setError('Please enter a valid count.');
    if (splitMethod === 'COLLEGE' && allocationColleges.length === 0) return setError('Please select at least one college.');

    setAllocating(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        subjectId: selectedSubjects[0].type === 'CORE' ? selectedSubjects[0].id : undefined,
        groupSubjectName: selectedSubjects[0].type === 'GROUP' ? selectedSubjects[0].name : undefined,
        splitMethod,
        count: splitMethod === 'COUNT' ? Number(allocationCount) : undefined,
        collegeAllocations: splitMethod === 'COLLEGE' ? allocationColleges : undefined,
        rollStart: splitMethod === 'RANGE' ? rollStart : undefined,
        rollEnd: splitMethod === 'RANGE' ? rollEnd : undefined,
        valuationDeadline: valuationDeadline || undefined,
        evaluatorId: allocationEvaluatorId,
        mode: allocationMode
      };

      const res = await axios.post(`${API}/allocate-subject-bulk`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const allocatedSubjectName = selectedSubjects[0].name;
      const evaluator = evaluators.find(ev => ev._id === allocationEvaluatorId);
      const evaluatorName = evaluator ? evaluator.fullName : 'Evaluator';
      setSuccess(`"${allocatedSubjectName}" assigned to ${evaluatorName}`);

      // Reset form fields and selection
      setSplitMethod('ALL');
      setAllocationCount('');
      setAllocationColleges([]);
      setRollStart('');
      setRollEnd('');
      setSelectedSubjects([]);

      setRefreshTrigger(prev => prev + 1);

      // Refresh submitted records
      fetchSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to allocate assignments.');
    } finally {
      setAllocating(false);
    }
  };
  const handleExtendDeadline = async (e) => {
    e.preventDefault();
    if (selectedEvaluatorsForExtension.length === 0) return setError('Please select at least one evaluator.');
    if (!extensionDeadline) return setError('Please select an extension date.');
    if (selectedSubjects.length === 0) return setError('No subject selected.');

    setExtending(true);
    setError('');
    setSuccess('');

    try {
      const parsedSubjects = selectedSubjects.map(s => s.type === 'CORE' ? { subjectId: s.id } : { groupSubjectName: s.name });

      const payload = {
        evaluatorIds: selectedEvaluatorsForExtension,
        subjects: parsedSubjects,
        valuationDeadline: extensionDeadline,
        mode: allocationMode
      };

      const res = await axios.post(`${API}/extend-evaluator-deadline`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess(`Deadline extended successfully for ${selectedEvaluatorsForExtension.length} evaluator(s).`);
      setSelectedEvaluatorsForExtension([]);
      setExtensionDeadline('');
      setRefreshTrigger(prev => prev + 1);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to extend deadline.');
    } finally {
      setExtending(false);
    }
  };
  const toggleCollege = (id) => {
    setAllocationColleges(prev =>
      prev.some(c => c.id === id) ? prev.filter(c => c.id !== id) : [...prev, { id, count: '' }]
    );
  };

  const updateCollegeCount = (id, count) => {
    setAllocationColleges(prev => prev.map(c => c.id === id ? { ...c, count } : c));
  };

  const handleResetAllocations = async () => {
    try {
      setResettingAllocations(true);
      setError('');
      const res = await axios.post(`${API}/reset-all-allocations`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess(res.data.message || 'All allocations reset successfully.');
      setShowResetConfirmModal(false);
      setRefreshTrigger(prev => prev + 1);
      fetchStats(); // refresh stats on allocate tab
      if (activeTab === 'assigned') {
        fetchAssignedSubjects();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to reset allocations.');
    } finally {
      setResettingAllocations(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading data...</div>;

  const filteredAssignedData = assignedSubjectsData.filter(item => {
    if (!assignedSearch) return true;
    const s = assignedSearch.toLowerCase();
    const evName = item.evaluatorName?.toLowerCase() || '';
    const subName = item.subjectName?.toLowerCase() || '';
    const gSubName = item._id?.groupSubjectName?.toLowerCase() || '';
    return evName.includes(s) || subName.includes(s) || gSubName.includes(s);
  });

  return (
    <div className="px-4 py-4 w-full space-y-4">
      {/* View Students Modal */}
      {viewStudentsModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-slide-up flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-teal-50/50">
              <div>
                <h3 className="font-bold text-slate-800 text-lg">Assigned Students</h3>
                <p className="text-sm text-slate-500">{viewStudentsModal.subjectName} • {viewStudentsModal.evaluatorName}</p>
              </div>
              <button onClick={() => setViewStudentsModal({ ...viewStudentsModal, isOpen: false })} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider w-16">S.No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Reg No</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">Student Name</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {viewStudentsModal.students.length > 0 ? (
                      viewStudentsModal.students.map((student, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-500">{idx + 1}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-slate-700">{student.regdNo}</td>
                          <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-600">{student.fullName}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="3" className="px-4 py-8 text-center text-sm text-slate-500">No students found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setViewStudentsModal({ ...viewStudentsModal, isOpen: false })}
                className="px-5 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Confirmation Modal */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fadeIn p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-2">Reset All Allocations?</h3>
              <p className="text-sm text-slate-600 mb-6">
                This action will remove all evaluator assignments across all subjects. The Evaluator accounts will remain, but they will have no subjects assigned.
                <br /><br />
                <strong>This action cannot be undone.</strong> Are you sure you want to proceed?
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowResetConfirmModal(false)}
                  disabled={resettingAllocations}
                  className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleResetAllocations}
                  disabled={resettingAllocations}
                  className="px-4 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-md transition-colors flex items-center gap-2"
                >
                  {resettingAllocations ? (
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  ) : 'Yes, Reset Allocations'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showActivity && (
        <ActivityFeed
          actionTypes={['CREATE_EVALUATOR', 'ALLOCATE_EVALUATOR']}
          onClose={() => setShowActivity(false)}
          refreshTrigger={refreshTrigger}
        />
      )}
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Evaluators</h1>
          <p className="text-slate-500 text-sm mt-0.5 max-w-2xl">
            Manage subject allocation to evaluators and view assigned records.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowResetConfirmModal(true)}
            className="flex items-center cursor-pointer gap-2 px-4 py-2 mt-1 bg-white border border-red-200 shadow-sm rounded-md text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors text-sm font-medium"
          >
            <AlertCircle className="h-4 w-4 text-red-500" />
            Reset Allocations
          </button>
          <button
            onClick={() => setShowActivity(true)}
            className="flex items-center cursor-pointer gap-2 px-4 py-2 mt-1 bg-white border border-slate-200 shadow-sm rounded-md text-slate-700 hover:bg-slate-50 transition-colors text-sm font-medium sm:mr-[130px]"
          >
            <Activity className="h-4 w-4 text-teal-600" />
            Activity History
          </button>
        </div>
      </div>

      <div className="flex border-b border-slate-200 mb-6">
        <button
          onClick={() => setActiveTab('allocate')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 cursor-pointer ${activeTab === 'allocate'
            ? 'border-teal-600 text-teal-700 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          Allocate Subjects
        </button>
        <button
          onClick={() => setActiveTab('assigned')}
          className={`px-6 py-3 font-medium text-sm transition-colors border-b-2 cursor-pointer ${activeTab === 'assigned'
            ? 'border-teal-600 text-teal-700 font-bold'
            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
        >
          Assigned Subjects
        </button>
      </div>

      {error && (
        <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
          <div className="bg-rose-500 text-white px-6 py-2 rounded-lg shadow-2xl flex items-center gap-3">
            <AlertCircle className="h-6 w-6 text-rose-100" />
            <span className="font-semibold text-sm">{error}</span>
          </div>
        </div>
      )}

      {success && (
        <div className="fixed bottom-6 right-6 z-[100] animate-slide-up">
          <div className="bg-teal-500 text-white px-6 py-2 rounded-lg shadow-2xl flex items-center gap-3">
            <CheckCircle className="h-6 w-6 text-teal-100" />
            <span className="font-semibold text-sm">{success}</span>
          </div>
        </div>
      )}

      {activeTab === 'allocate' ? (
        <>
          {/* Main Content Area */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 z-[80]">
            <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Filter className="h-5 w-5 text-teal-600" />
              1. Select Subject(s) to Allocate
            </h2>

            <div className="flex flex-col md:flex-row gap-6 items-start mb-6">
              <div className="w-full md:w-1/4">
                <label className="block text-sm font-medium text-slate-700 mb-1">Allocation Mode</label>
                <select
                  className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
                  value={allocationMode}
                  onChange={(e) => setAllocationMode(e.target.value)}
                >
                  <option value="Regular">Regular Subjects</option>
                  <option value="Supply">Backlog / Supply</option>
                </select>
              </div>
              <div className="w-full md:w-1/4 z-50">
                <SearchableDropdown
                  label="Filter by Semester"
                  placeholder="-- All Semesters --"
                  value={selectedSemester}
                  onChange={(val) => setSelectedSemester(val || '')}
                  options={uniqueSemesters.map(sem => ({
                    value: sem,
                    label: `Semester ${sem}`
                  }))}
                />
              </div>
              <div className="w-full md:w-1/4 z-50">
                <SearchableDropdown
                  label="Filter by Group"
                  placeholder="-- Search Group --"
                  value={selectedGroupCode}
                  onChange={(val) => setSelectedGroupCode(val || '')}
                  options={groups.map(g => ({
                    value: g.groupCode,
                    label: `${g.groupCode} - ${g.groupName}`
                  }))}
                />
              </div>
              <div className="w-full md:w-1/4 relative">
                <label className="block text-sm font-medium text-slate-700 mb-1">Search Subject</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="e.g. DATA STRUCTURES"
                    value={subjectSearch}
                    onChange={e => setSubjectSearch(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                <span className="text-sm font-semibold text-slate-700">{combinedSubjectList.length} Subjects Found</span>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-teal-600 font-medium">{selectedSubjects.length} Selected</span>
                  {selectedSubjects.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedSubjects([])}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md transition-colors cursor-pointer"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
              <div className="max-h-64 overflow-y-auto p-2 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {combinedSubjectList.length === 0 ? (
                  <div className="col-span-full p-4 text-center text-slate-500 text-sm">No subjects match your search.</div>
                ) : (
                  combinedSubjectList.map(sub => (
                    <div
                      key={sub.type + '-' + sub.id}
                      onClick={() => toggleSubject(sub)}
                      className={`flex items-center gap-3 p-3 rounded-md border transition-colors ${sub.isFullyAllocated
                        ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
                        : isSubjectSelected(sub)
                          ? 'bg-teal-50 border-teal-200 cursor-pointer'
                          : 'bg-white border-slate-200 hover:border-teal-300 cursor-pointer'
                        }`}
                    >
                      <div className={`flex-shrink-0 ${sub.isFullyAllocated || isSubjectSelected(sub) ? 'text-teal-600' : 'text-slate-300'}`}>
                        {(sub.isFullyAllocated || isSubjectSelected(sub)) ? <CheckSquare className="h-5 w-5" /> : <Square className="h-5 w-5" />}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800 line-clamp-1">{sub.name}</p>
                        <div className="flex items-center justify-between mt-0.5">
                          <p className="text-xs text-slate-500">{sub.type === 'CORE' ? 'Core Theory' : `Pedagogy (${sub.groupCode})`}</p>
                          {sub.isFullyAllocated && <span className="text-[10px] uppercase font-bold text-teal-600 tracking-wider">Completed</span>}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Stats and Allocation Split View */}
          {stats && (
            <div className="relative">
              {statsLoading && (
                <div className="absolute inset-0 z-50 bg-white/50 backdrop-blur-[1px] flex items-center justify-center rounded-xl">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                </div>
              )}
              <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fadeIn ${statsLoading ? 'pointer-events-none' : ''}`}>

                {/* Left Column: Stats & Current Evaluators */}
                <div className="lg:col-span-1 space-y-6">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-100 px-5 py-4">
                      <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-teal-600" />
                        Subject Status
                      </h3>
                    </div>
                    <div className="p-5 flex flex-col gap-4">
                      <div className="bg-slate-50 rounded-lg p-4 flex items-center justify-between border border-slate-100">
                        <div className="text-sm font-medium text-slate-600">Total Records</div>
                        <div className="text-xl font-bold text-slate-800">{stats.total}</div>
                      </div>

                      <div className="bg-teal-50 rounded-lg p-4 flex items-center justify-between border border-teal-100">
                        <div className="text-sm font-medium text-teal-700">Allocated</div>
                        <div className="text-xl font-bold text-teal-800">{stats.allocated}</div>
                      </div>

                      <div className="bg-orange-50 rounded-lg p-4 flex items-center justify-between border border-orange-100">
                        <div className="text-sm font-medium text-orange-700 flex items-center gap-1.5">
                          <Clock className="h-4 w-4" /> Unallocated (Pending)
                        </div>
                        <div className="text-xl font-bold text-orange-800">{stats.unallocated}</div>
                      </div>
                    </div>
                  </div>


                </div>

                {/* Right Column: Allocation Form */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="bg-teal-50/50 border-b border-slate-100 px-6 py-4 flex items-center gap-2">
                      <Edit className="h-5 w-5 text-teal-600" />
                      <h3 className="font-semibold text-slate-800 text-lg">Allocate Pending Records</h3>
                    </div>

                    {stats.unallocated === 0 ? (
                      <div className="p-12 text-center">
                        <CheckCircle className="h-12 w-12 text-teal-500 mx-auto mb-3" />
                        <h4 className="text-lg font-semibold text-slate-800">All Done!</h4>
                        <p className="text-slate-500 mt-1">Every assignment for this subject has been allocated to an evaluator.</p>
                      </div>
                    ) : (
                      <form onSubmit={handleAllocate} className="p-6 space-y-6">
                        <div className="flex flex-col md:flex-row gap-6 items-end">
                          <div className="flex-1 z-40">
                            <SearchableDropdown
                              label={
                                <span>
                                  Select Evaluator <span className="text-red-500">*</span>
                                </span>
                              }
                              placeholder="-- Choose an Evaluator --"
                              value={allocationEvaluatorId}
                              onChange={val => setAllocationEvaluatorId(val || '')}
                              options={evaluators.map(ev => ({
                                value: ev._id,
                                label: `${ev.fullName} (${ev.regdNo})`
                              }))}
                            />
                          </div>
                          <div className="w-full md:w-1/3">
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Evaluation Deadline <span className="text-red-500">*</span></label>
                            <input
                              type="date"
                              required
                              className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                              value={valuationDeadline}
                              onChange={e => setValuationDeadline(e.target.value)}
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-3">Allocation Strategy <span className="text-red-500">*</span></label>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {['ALL', 'COUNT', 'COLLEGE', 'RANGE'].map(method => (
                              <label
                                key={method}
                                className={`
                            border rounded-lg p-3 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all text-center
                            ${splitMethod === method ? 'border-teal-500 bg-teal-50 text-teal-800 shadow-sm ring-1 ring-teal-500' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600'}
                          `}
                              >
                                <input
                                  type="radio"
                                  name="splitMethod"
                                  value={method}
                                  checked={splitMethod === method}
                                  onChange={(e) => setSplitMethod(e.target.value)}
                                  className="sr-only"
                                />
                                <span className="text-sm font-bold">{method === 'ALL' ? 'All Remaining' : method === 'COUNT' ? 'By Count' : method === 'COLLEGE' ? 'By College' : 'By Roll Range'}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        {/* Dynamic Fields based on Split Method */}
                        <div className="bg-slate-50 rounded-lg p-5 border border-slate-100">
                          {splitMethod === 'ALL' && (
                            <p className="text-sm text-slate-600 text-center">
                              This will allocate all <strong className="text-slate-800">{stats.unallocated}</strong> remaining assignments to the selected evaluator.
                            </p>
                          )}

                          {splitMethod === 'COUNT' && (
                            <div>
                              <label className="block text-sm font-medium text-slate-700 mb-2">Number of Records to Assign</label>
                              <input
                                type="number"
                                className="w-full max-w-xs bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                value={allocationCount}
                                onChange={e => setAllocationCount(e.target.value)}
                                placeholder={`Max: ${stats.unallocated}`}
                                max={stats.unallocated}
                                min="1"
                              />
                              <p className="text-xs text-slate-500 mt-2">
                                The system will randomly select exactly {allocationCount || 'X'} unassigned records.
                              </p>
                            </div>
                          )}

                          {splitMethod === 'COLLEGE' && (
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-medium text-slate-700">Select Colleges</label>
                                {allocationColleges.length > 0 && (
                                  <span className="text-sm font-semibold text-teal-700 bg-teal-50 px-3 py-1 rounded-full border border-teal-100 shadow-sm">
                                    Total Selected Records: {
                                      allocationColleges.reduce((acc, ac) => {
                                        if (ac.count && Number(ac.count) > 0) {
                                          return acc + Number(ac.count);
                                        }
                                        const pendingCount = stats?.collegeStats?.[ac.id]?.pending || 0;
                                        return acc + pendingCount;
                                      }, 0)
                                    }
                                  </span>
                                )}
                              </div>
                              <div className="max-h-64 overflow-y-auto bg-white border border-slate-200 rounded-lg p-3 space-y-2">
                                {colleges.map(c => {
                                  const cStats = stats?.collegeStats?.[c._id] || { total: 0, allocated: 0, pending: 0 };
                                  const isSelected = allocationColleges.some(ac => ac.id === c._id);

                                  return (
                                    <label key={c._id} className={`flex flex-col gap-2 p-3 rounded cursor-pointer transition-colors border ${isSelected ? 'bg-teal-50/30 border-teal-200' : 'hover:bg-slate-50 border-transparent hover:border-slate-200'}`}>
                                      <div className="flex items-center gap-3">
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          onChange={() => toggleCollege(c._id)}
                                          className="h-4 w-4 text-teal-600 rounded border-slate-300 focus:ring-teal-500"
                                        />
                                        <span className="text-sm text-slate-700 font-medium">
                                          {c.collegeCode} - {c.collegeName}
                                        </span>
                                      </div>
                                      <div className="pl-7 text-xs text-slate-500 flex gap-4">
                                        <span>Total: {cStats.total}</span>
                                        <span>Allocated: {cStats.allocated}</span>
                                        <span className="font-bold text-orange-600">Pending: {cStats.pending}</span>
                                      </div>
                                      {isSelected && (
                                        <div className="pl-7 mt-1 flex items-center gap-2">
                                          <input
                                            type="number"
                                            placeholder={`Max: ${cStats.pending}`}
                                            max={cStats.pending}
                                            min="1"
                                            className="w-32 text-xs border border-slate-300 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                            value={allocationColleges.find(ac => ac.id === c._id)?.count || ''}
                                            onChange={(e) => updateCollegeCount(c._id, e.target.value)}
                                          />
                                          <span className="text-[11px] text-slate-400 font-medium">(Optional: Leave empty for all)</span>
                                        </div>
                                      )}
                                    </label>
                                  )
                                })}
                              </div>
                            </div>
                          )}

                          {splitMethod === 'RANGE' && (
                            <div className="flex gap-4">
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-2">From Roll No</label>
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                  value={rollStart}
                                  onChange={e => setRollStart(e.target.value)}
                                  placeholder="e.g. 255001"
                                />
                              </div>
                              <div className="flex-1">
                                <label className="block text-sm font-medium text-slate-700 mb-2">To Roll No</label>
                                <input
                                  type="text"
                                  className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                                  value={rollEnd}
                                  onChange={e => setRollEnd(e.target.value)}
                                  placeholder="e.g. 255099"
                                />
                              </div>
                            </div>
                          )}
                        </div>

                        <div className="pt-4 border-t border-slate-100 flex justify-end">
                          <button
                            type="submit"
                            disabled={allocating || !allocationEvaluatorId}
                            className="bg-teal-600 cursor-pointer hover:bg-teal-700 text-white px-6 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-all disabled:opacity-50 flex items-center gap-2"
                          >
                            {allocating ? 'Allocating...' : 'Allocate Records'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-teal-600" />
              Assigned Subjects Overview
            </h2>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search evaluator or subject..."
                value={assignedSearch}
                onChange={e => setAssignedSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-md pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>
          <div className="p-0 overflow-x-auto">
            {assignedLoading ? (
              <div className="p-12 flex flex-col items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mb-4"></div>
                <p className="text-slate-500 font-medium">Loading assigned subjects...</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse min-w-[800px]">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider w-16">S.No</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Mode</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Subject</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider">Evaluator</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Students Count</th>
                    <th className="px-6 py-4 text-xs font-bold text-slate-600 uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredAssignedData.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-12 text-center text-slate-500">
                        No assigned subjects found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredAssignedData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${item._id.mode === 'Supply' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                            }`}>
                            {item._id.mode || 'Regular'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-semibold text-slate-800 max-w-[250px] truncate" title={item.subjectName || item._id.groupSubjectName}>
                            {item.subjectName || item._id.groupSubjectName || 'Unknown Subject'}
                          </p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <p className="text-sm font-medium text-slate-800">{item.evaluatorName}</p>
                          <p className="text-xs text-slate-500">{item.evaluatorRegdNo}</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex items-center justify-center bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full text-sm">
                            {item.students?.length || 0}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <button
                            title="View all students"
                            onClick={() => setViewStudentsModal({
                              isOpen: true,
                              evaluatorName: item.evaluatorName,
                              subjectName: item.subjectName || item._id.groupSubjectName || 'Unknown Subject',
                              students: [...(item.students || [])].sort((a, b) => (a.regdNo || '').localeCompare(b.regdNo || ''))
                            })}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-md font-medium text-sm transition-colors cursor-pointer"
                          >
                            <Eye className="h-4 w-4" />

                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
