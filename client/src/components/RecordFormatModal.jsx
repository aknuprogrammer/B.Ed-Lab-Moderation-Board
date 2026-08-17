import React, { useState, useEffect } from 'react';
import { X, FileText, Download, RefreshCw, Eye } from 'lucide-react';
import { pdf } from '@react-pdf/renderer';
import JsBarcode from 'jsbarcode';
import BarcodePDF from './BarcodePDF';

const RecordFormatModal = ({ isOpen, onClose }) => {
  const [semester, setSemester] = useState('2');
  const [subjectType, setSubjectType] = useState('PEDAGOGY');
  const [subjectName, setSubjectName] = useState('PEDAGOGY OF ENGLISH');
  const [pdfUrl, setPdfUrl] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Synchronize default subject name when subject type or semester changes
  useEffect(() => {
    if (subjectType === 'PEDAGOGY') {
      if (!subjectName.startsWith('PEDAGOGY OF')) {
        setSubjectName('PEDAGOGY OF ENGLISH');
      }
    } else {
      if (subjectName.startsWith('PEDAGOGY OF')) {
        setSubjectName('PERSPECTIVES IN EDUCATION');
      }
    }
  }, [subjectType]);

  useEffect(() => {
    if (!isOpen) {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }
      return;
    }

    generatePreview();
  }, [isOpen, semester, subjectType, subjectName]);

  const generatePreview = async () => {
    setGenerating(true);
    try {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
        setPdfUrl(null);
      }

      const mockAssignment = {
        _id: 'preview_123',
        groupSubjectName: subjectType === 'PEDAGOGY' ? subjectName : null,
        pagesRequired: 10,
        subjectId: {
          subCode: subjectType === 'PEDAGOGY' ? 'BED201' : 'BED101',
          subName: subjectType === 'PEDAGOGY' ? subjectName : 'PERSPECTIVES IN EDUCATION',
          semester: semester,
          studentChoice: subjectType === 'PEDAGOGY' ? 'C' : 'R'
        },
        studentId: {
          fullName: 'SAMPLE STUDENT NAME',
          regdNo: '240011223344',
          currentSemester: semester,
          collegeId: { collegeName: 'ADIKAVI NANNAYA UNIVERSITY COLLEGE OF EDUCATION' },
          courseId: { courseName: 'B.Ed. Programme' }
        }
      };

      const mockUser = {
        fullName: 'SAMPLE STUDENT NAME',
        regdNo: '240011223344',
        collegeName: 'ADIKAVI NANNAYA UNIVERSITY COLLEGE OF EDUCATION',
        courseName: 'B.Ed. Programme'
      };

      // Generate barcode image data URL for preview
      const canvas = document.createElement('canvas');
      JsBarcode(canvas, '240011223344', {
        format: 'CODE128',
        displayValue: true,
        fontSize: 16,
        margin: 10,
        width: 2,
        height: 60
      });
      const barcodeDataUrl = canvas.toDataURL('image/png');

      const doc = <BarcodePDF assignment={mockAssignment} barcodeDataUrl={barcodeDataUrl} user={mockUser} />;
      const asPdf = pdf([]);
      asPdf.updateContainer(doc);
      const blob = await asPdf.toBlob();
      const url = URL.createObjectURL(blob);
      setPdfUrl(url);
    } catch (err) {
      console.error('Error generating format preview PDF:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-teal-800 text-white flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-teal-700/60 rounded-lg">
              <FileText className="h-5 w-5 text-teal-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Lab Record Format Preview</h2>
              <p className="text-xs text-teal-200">View official student record formats for all semesters and subjects.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-teal-200 hover:text-white hover:bg-teal-700/50 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-6 py-3 bg-slate-50 border-b border-slate-200 flex-shrink-0">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="1">Semester I</option>
                <option value="2">Semester II</option>
                <option value="3">Semester III</option>
                <option value="4">Semester IV</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Subject Type</label>
              <select
                value={subjectType}
                onChange={(e) => setSubjectType(e.target.value)}
                className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
              >
                <option value="PEDAGOGY">Pedagogy Subject (26 Pages - Teaching Observation Report)</option>
                <option value="REGULAR">Regular / Core Subject (Standard Blank Format)</option>
              </select>
            </div>

            {subjectType === 'PEDAGOGY' && (
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Pedagogy Subject Title</label>
                <select
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  className="px-3 py-1.5 border border-slate-300 rounded-md bg-white text-slate-800 font-medium focus:ring-2 focus:ring-teal-500 focus:outline-none"
                >
                  <option value="PEDAGOGY OF ENGLISH">PEDAGOGY OF ENGLISH</option>
                  <option value="PEDAGOGY OF MATHEMATICS">PEDAGOGY OF MATHEMATICS</option>
                  <option value="PEDAGOGY OF PHYSICAL SCIENCE">PEDAGOGY OF PHYSICAL SCIENCE</option>
                  <option value="PEDAGOGY OF BIOLOGICAL SCIENCE">PEDAGOGY OF BIOLOGICAL SCIENCE</option>
                  <option value="PEDAGOGY OF SOCIAL STUDIES">PEDAGOGY OF SOCIAL STUDIES</option>
                  <option value="PEDAGOGY OF TELUGU">PEDAGOGY OF TELUGU</option>
                </select>
              </div>
            )}
          </div>

          {pdfUrl && (
            <a
              href={pdfUrl}
              download={`Record_Format_${subjectType}_Sem${semester}.pdf`}
              className="inline-flex items-center space-x-1.5 px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-semibold shadow-sm transition-all cursor-pointer"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download Format PDF</span>
            </a>
          )}
        </div>

        {/* PDF Viewer Body */}
        <div className="flex-1 bg-slate-200 relative overflow-hidden flex items-center justify-center">
          {generating ? (
            <div className="flex flex-col items-center justify-center p-8 text-slate-600 bg-white/80 rounded-xl shadow-lg border border-slate-200">
              <RefreshCw className="h-8 w-8 animate-spin text-teal-600 mb-3" />
              <p className="text-sm font-semibold">Generating Record Format PDF...</p>
              <p className="text-xs text-slate-400 mt-1">Please wait while the page layout is prepared.</p>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={`${pdfUrl}#toolbar=0&navpanes=0`}
              title="Record Format PDF Preview"
              className="w-full h-full border-none"
              onContextMenu={(e) => e.preventDefault()}
            />
          ) : (
            <div className="text-slate-400 text-sm font-medium">Failed to load preview.</div>
          )}
        </div>

        {/* Modal Footer Info */}
        <div className="px-6 py-2.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500 flex-shrink-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold text-slate-700">Format Details:</span>
            <span>
              {subjectType === 'PEDAGOGY' && (semester === '2' || semester === '3')
                ? '26 Pages (1 Cover Page + 25 Teaching Observation Report Pages)'
                : '11 Pages (1 Cover Page + 10 Blank Continuation Pages)'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};

export default RecordFormatModal;
