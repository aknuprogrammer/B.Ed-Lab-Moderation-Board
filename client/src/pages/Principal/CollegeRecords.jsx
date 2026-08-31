import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FileText, Search, Save, CheckCircle, Eye, X, ShieldAlert, Lock } from 'lucide-react';
import { API_BASE_URL } from '../../utils/config';

const CollegeRecords = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [savingId, setSavingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedRecordForView, setSelectedRecordForView] = useState(null);

  const [suggestedMarks, setSuggestedMarks] = useState({});

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/principal/records`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecords(res.data);
      
      const marksMap = {};
      res.data.forEach(r => {
        if (r.suggestedMarks !== undefined) {
          marksMap[r._id] = r.suggestedMarks;
        }
      });
      setSuggestedMarks(marksMap);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestMarksChange = (id, val) => {
    setSuggestedMarks(prev => ({
      ...prev,
      [id]: val
    }));
  };

  const handleSaveMarks = async (id) => {
    const val = suggestedMarks[id];
    if (val === undefined || val === '') return;

    try {
      setSavingId(id);
      setSuccessMsg('');
      setError('');
      await axios.put(`${API_BASE_URL}/api/principal/records/${id}/suggest-marks`, {
        suggestedMarks: Number(val)
      }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setRecords(prev => prev.map(r => r._id === id ? { ...r, suggestedMarks: Number(val) } : r));
      setSuccessMsg('Suggested marks saved successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save marks');
    } finally {
      setSavingId(null);
    }
  };

  const filteredRecords = React.useMemo(() => {
    const list = records.filter(r => {
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        (r.studentId?.fullName || '').toLowerCase().includes(term) ||
        (r.studentId?.regdNo || '').toLowerCase().includes(term) ||
        (r.subjectId?.subName || '').toLowerCase().includes(term) ||
        (r.subjectId?.subCode || '').toLowerCase().includes(term) ||
        (r.groupSubjectName || '').toLowerCase().includes(term)
      );
    });

    return list.sort((a, b) => {
      const regA = String(a.studentId?.regdNo || '');
      const regB = String(b.studentId?.regdNo || '');
      return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [records, searchTerm]);

  return (
    <div className="p-4 sm:p-6 bg-slate-50 w-full animate-fade-in">
      <div className="bg-white p-6 rounded-md border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="h-6 w-6 text-teal-600" />
            Submitted Student Records
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Review submitted lab records from your college students and provide suggested marks for the external evaluators.
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-md mb-4 text-sm font-medium border border-red-200">
          {error}
        </div>
      )}
      
      {successMsg && (
        <div className="bg-emerald-50 text-emerald-700 p-3 rounded-md mb-4 flex items-center gap-2 text-sm font-medium border border-emerald-200">
          <CheckCircle className="h-4 w-4" />
          {successMsg}
        </div>
      )}

      <div className="bg-white rounded-md border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
          <div className="relative w-80">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by student, roll no, or subject (e.g. English, Maths)..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        </div>

        <div className="w-full relative overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="sticky top-0 z-10 bg-teal-700 text-white font-semibold">
              <tr>
                <th className="px-4 py-3 whitespace-nowrap">Student Name</th>
                <th className="px-4 py-3 whitespace-nowrap">Regd No.</th>
                <th className="px-4 py-3 whitespace-nowrap">Subject</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Status</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Record PDF</th>
                <th className="px-4 py-3 text-center whitespace-nowrap">Suggested Marks Deadline</th>
                <th className="px-4 py-3 text-center w-48 whitespace-nowrap">Suggested Marks</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">Loading records...</td>
                </tr>
              ) : filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-slate-500">No submitted records found.</td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record._id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-800">{record.studentId?.fullName}</td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">{record.studentId?.regdNo}</td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 font-medium">{record.groupSubjectName || record.subjectId?.subName}</p>
                      <p className="text-xs text-slate-500">Max Marks: {record.subjectId?.maxMarks || record.maxMarks || 100}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.isAbsent ? (
                        <span className="inline-flex px-2 py-1 rounded text-xs font-semibold bg-rose-100 text-rose-700">
                          Absent
                        </span>
                      ) : (
                        <span className={`inline-flex px-2 py-1 rounded text-xs font-semibold bg-blue-100 text-blue-700`}>
                          {record.status === 'Evaluated' ? 'Submitted' : record.status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {record.filePath ? (
                        <button
                          type="button"
                          onClick={() => setSelectedRecordForView(record)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-teal-50 hover:bg-teal-600 text-teal-700 hover:text-white border border-teal-200 hover:border-teal-600 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-sm"
                          title="View Document (Download Disabled)"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      ) : (
                        <span className="text-slate-400 italic text-xs">No File</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        if (record.suggestedMarksDeadline) {
                          const deadlineDate = new Date(record.suggestedMarksDeadline);
                          deadlineDate.setHours(23, 59, 59, 999);
                          const isDeadlinePassed = new Date() > deadlineDate;
                          const deadlineFormatted = new Date(record.suggestedMarksDeadline).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          });
                          return (
                            <span className="font-semibold text-teal-600">
                              {deadlineFormatted}
                            </span>
                          );
                        }
                        return <span className="text-slate-400 italic">No Deadline</span>;
                      })()}
                    </td>
                    <td className="px-4 py-3">
                      {(() => {
                        const maxMarks = record.subjectId?.maxMarks || record.maxMarks || 100;
                        const val = suggestedMarks[record._id] !== undefined ? suggestedMarks[record._id] : '';
                        const hasError = val !== '' && Number(val) > maxMarks;
                        
                        let isDeadlinePassed = false;
                        if (record.suggestedMarksDeadline) {
                          const deadlineDate = new Date(record.suggestedMarksDeadline);
                          deadlineDate.setHours(23, 59, 59, 999);
                          isDeadlinePassed = new Date() > deadlineDate;
                        }
                        
                        const isSaved = record.suggestedMarks !== undefined && 
                                        record.suggestedMarks !== null && 
                                        Number(record.suggestedMarks) === Number(val) &&
                                        val !== '';
                        
                        return (
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center justify-center gap-2">
                              <input 
                                type="number" 
                                min="0"
                                value={val}
                                onChange={(e) => handleSuggestMarksChange(record._id, e.target.value)}
                                placeholder="e.g. 18"
                                className={`w-20 px-2 py-1.5 border rounded text-center text-sm focus:outline-none focus:ring-1 ${
                                  hasError 
                                    ? 'border-red-300 focus:ring-red-500 bg-red-50 text-red-700' 
                                    : 'border-slate-300 focus:ring-teal-500'
                                }`}
                                disabled={record.status === 'Evaluated' || isDeadlinePassed}
                              />
                              <button
                                onClick={() => handleSaveMarks(record._id)}
                                disabled={savingId === record._id || record.status === 'Evaluated' || hasError || isDeadlinePassed}
                                className={`p-1.5 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer ${
                                  isSaved ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'
                                }`}
                                title={isSaved ? "Marks saved" : "Marks not saved"}
                              >
                                {savingId === record._id ? (
                                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                ) : (
                                  <Save className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                            {isSaved && (
                              <span className="text-[10px] text-green-600 font-semibold leading-none">Marks saved</span>
                            )}
                            {hasError && (
                              <span className="text-[10px] text-red-500 font-medium whitespace-nowrap">
                                Max marks: {maxMarks}
                              </span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- SECURE RECORD VIEW MODAL (NO DOWNLOAD) --- */}
      {selectedRecordForView && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-fadeIn"
          onClick={() => setSelectedRecordForView(null)}
          onContextMenu={(e) => e.preventDefault()}
        >
          <div 
            className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden border border-slate-200"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
          >
            {/* Modal Header */}
            <div className="px-5 py-3.5 bg-slate-800 text-white flex items-center justify-between border-b border-slate-700 select-none">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-teal-600/30 text-teal-300 rounded-lg">
                  <FileText className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-base text-slate-100 flex items-center gap-2">
                    {selectedRecordForView.studentId?.fullName}
                    <span className="text-xs font-normal text-slate-300 font-mono">
                      ({selectedRecordForView.studentId?.regdNo})
                    </span>
                  </h3>
                  <p className="text-xs text-teal-400 font-medium">
                    {selectedRecordForView.groupSubjectName || selectedRecordForView.subjectId?.subName}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/60 px-3 py-1 rounded-full border border-amber-500/30">
                  <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                  <span>View Only • Download Disabled</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedRecordForView(null)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Close Viewer"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Secure PDF View Frame */}
            <div className="flex-1 bg-slate-900 relative w-full h-full select-none" onContextMenu={(e) => e.preventDefault()}>
              <iframe
                src={`${API_BASE_URL}${selectedRecordForView.filePath}#toolbar=0&navpanes=0&scrollbar=1`}
                title="Student Record Document"
                className="w-full h-full border-0"
                onContextMenu={(e) => e.preventDefault()}
              />
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 select-none">
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-teal-600" /> Protected View — Official Record for Evaluation Review
              </span>
              <button
                type="button"
                onClick={() => setSelectedRecordForView(null)}
                className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white font-medium rounded-md transition-colors cursor-pointer"
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

export default CollegeRecords;
