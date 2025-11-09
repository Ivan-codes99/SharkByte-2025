import { useState, useRef, useEffect } from "react";
import { logger } from "../lib/logger";
import { ExternalLink, Upload, FileText, Loader2, CheckCircle2, Trash2 } from "lucide-react";
import { analyzeProgramPDFs } from "../lib/api";
import type { ProgramAnalysisResponse } from "../types";
import { Button } from "../components/ui/button";
import { saveProgramAnalysis, getProgramAnalysis, clearProgramAnalysis } from "../lib/storage";
import "../styles/pages.css";

export function ChoosePath() {
  const [courseListFile, setCourseListFile] = useState<File | null>(null);
  const [sequenceGuideFile, setSequenceGuideFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ProgramAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const courseListInputRef = useRef<HTMLInputElement>(null);
  const sequenceGuideInputRef = useRef<HTMLInputElement>(null);

  // Load saved analysis on component mount
  useEffect(() => {
    const saved = getProgramAnalysis();
    if (saved) {
      setAnalysisResult(saved);
      logger.info("Loaded saved program analysis from localStorage", {
        programName: saved.programName,
        degreeType: saved.degreeType,
      }, "ChoosePath");
    }
  }, []);

  const handleCourseListChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setCourseListFile(file);
      setError(null);
    } else if (file) {
      setError("Course list must be a PDF file");
    }
  };

  const handleSequenceGuideChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setSequenceGuideFile(file);
      setError(null);
    } else if (file) {
      setError("Sequence guide must be a PDF file");
    }
  };

  const handleUpload = async () => {
    if (!courseListFile || !sequenceGuideFile) {
      setError("Please upload both PDF files");
      return;
    }

    setUploading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      logger.action("upload_pdfs", {
        courseListName: courseListFile.name,
        sequenceGuideName: sequenceGuideFile.name,
      }, "ChoosePath");

      const result = await analyzeProgramPDFs(courseListFile, sequenceGuideFile);
      setAnalysisResult(result);
      
      // Save to localStorage
      saveProgramAnalysis(result);
      
      logger.info("PDFs analyzed successfully and saved to localStorage", {
        programName: result.programName,
        degreeType: result.degreeType,
        courseCount: result.courses?.length || 0,
      }, "ChoosePath");
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze PDFs";
      setError(errorMessage);
      logger.error("Failed to analyze PDFs", err instanceof Error ? err : new Error(String(err)));
    } finally {
      setUploading(false);
    }
  };

  const handleClearAnalysis = () => {
    if (window.confirm("Are you sure you want to clear the saved program analysis? This action cannot be undone.")) {
      clearProgramAnalysis();
      setAnalysisResult(null);
      setCourseListFile(null);
      setSequenceGuideFile(null);
      setError(null);
      
      // Reset file inputs
      if (courseListInputRef.current) {
        courseListInputRef.current.value = "";
      }
      if (sequenceGuideInputRef.current) {
        sequenceGuideInputRef.current.value = "";
      }
      
      logger.action("clear_program_analysis", undefined, "ChoosePath");
    }
  };

  return (
    <div className="page-container">
      {/* Hero Section */}
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="max-w-3xl">
            <h1 className="page-title">
              Choose Path
            </h1>
            <p className="page-subtitle">
              Navigate to the Miami Dade College programs page and search for your desired program.
            </p>
            <div className="mt-8">
              <a
                href="https://www.mdc.edu/academics/programs/default.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-[#d45a2a] text-white rounded-full font-semibold hover:bg-[#b44620] transition-colors"
                style={{
                  boxShadow: "0 18px 60px rgba(212,90,42,0.10)",
                }}
              >
                Visit MDC Programs Page
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="page-content">
        <div className="max-w-4xl mx-auto">
          <div className="page-card mb-6">
            <h2 className="page-section-title mb-4">How to Choose Your Program</h2>
            <ol className="list-decimal list-inside space-y-4 text-muted">
              <li>
                Visit the{" "}
                <a
                  href="https://www.mdc.edu/academics/programs/default.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#d45a2a] hover:underline font-semibold"
                >
                  MDC Programs page
                </a>{" "}
                (link above) and search for your desired program
              </li>
              <li>
                On the program page, download both PDFs:{" "}
                <strong className="text-primary-dark">"See a complete course list"</strong> and{" "}
                <strong className="text-primary-dark">"See a course sequence guide"</strong>
              </li>
              <li>Save both PDFs to your device for reference</li>
              <li>Return here to upload the PDFs and view your personalized timeline</li>
            </ol>
          </div>

          {/* File Upload Section */}
          <div className="page-card">
            <h2 className="page-section-title mb-4">Upload Program PDFs</h2>
            
            <div className="space-y-6">
              {/* Course List Upload */}
              <div>
                <label className="page-label mb-2">
                  Complete Course List PDF
                </label>
                <div className="flex items-center gap-4">
                  <input
                    ref={courseListInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleCourseListChange}
                    className="hidden"
                    id="courseList"
                  />
                  <label
                    htmlFor="courseList"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-[#d45a2a] rounded-lg cursor-pointer hover:bg-[#f6f3eb] transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    {courseListFile ? courseListFile.name : "Choose PDF"}
                  </label>
                  {courseListFile && (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>{courseListFile.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Sequence Guide Upload */}
              <div>
                <label className="page-label mb-2">
                  Course Sequence Guide PDF
                </label>
                <div className="flex items-center gap-4">
                  <input
                    ref={sequenceGuideInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleSequenceGuideChange}
                    className="hidden"
                    id="sequenceGuide"
                  />
                  <label
                    htmlFor="sequenceGuide"
                    className="inline-flex items-center gap-2 px-4 py-2 border border-[#d45a2a] rounded-lg cursor-pointer hover:bg-[#f6f3eb] transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    {sequenceGuideFile ? sequenceGuideFile.name : "Choose PDF"}
                  </label>
                  {sequenceGuideFile && (
                    <div className="flex items-center gap-2 text-sm text-muted">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <span>{sequenceGuideFile.name}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Button */}
              <div>
                <Button
                  onClick={handleUpload}
                  disabled={!courseListFile || !sequenceGuideFile || uploading}
                  className="w-full sm:w-auto"
                  size="lg"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Analyzing PDFs...
                    </>
                  ) : (
                    <>
                      <FileText className="h-4 w-4 mr-2" />
                      Analyze Program
                    </>
                  )}
                </Button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-800 font-medium">Error: {error}</p>
                </div>
              )}

              {/* Analysis Result */}
              {analysisResult && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <h3 className="font-semibold text-primary-dark">Analysis Complete!</h3>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleClearAnalysis}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear Data
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm text-muted">
                    <p><strong>Program:</strong> {analysisResult.programName}</p>
                    <p><strong>Degree Type:</strong> {analysisResult.degreeType}</p>
                    <p><strong>Institution:</strong> {analysisResult.institution}</p>
                    {analysisResult.metadata?.totalCredits && (
                      <p><strong>Total Credits:</strong> {analysisResult.metadata.totalCredits}</p>
                    )}
                    {analysisResult.courses && (
                      <p><strong>Courses Found:</strong> {analysisResult.courses.length}</p>
                    )}
                  </div>
                  <div className="mt-4">
                    <pre className="bg-white p-4 rounded border text-xs overflow-auto max-h-96">
                      {JSON.stringify(analysisResult, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
