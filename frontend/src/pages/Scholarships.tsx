import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Filter, Upload, FileText, X, Loader2 } from "lucide-react";
import type { Scholarship, StudentInfo, ClassStanding, RaceEthnicity } from "../types";
import { ScholarshipCard } from "../components/ScholarshipCard";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import { logger } from "../lib/logger";
import { hasStudentInfo, getStudentInfo, saveStudentInfo } from "../lib/storage";
import { processTranscriptPDF, processResumePDF, fetchRelevantScholarships } from "../lib/api";
import "../styles/pages.css";

const studentInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  classStanding: z.string().optional(),
  program: z.string().optional(),
  gpa: z.string().optional(),
  institution: z.string().optional(),
  raceEthnicity: z.string().optional(),
  isFirstGeneration: z.boolean().optional(),
  isVeteran: z.boolean().optional(),
  isInternationalStudent: z.boolean().optional(),
  achievements: z.string().optional(),
  workExperience: z.string().optional(),
  extracurricularActivities: z.string().optional(),
  careerGoals: z.string().optional(),
  financialNeed: z.string().optional(),
});

type StudentInfoFormValues = z.infer<typeof studentInfoSchema>;

const CLASS_STANDING_OPTIONS: { value: ClassStanding; label: string }[] = [
  { value: "FRESHMAN", label: "Freshman" },
  { value: "SOPHOMORE", label: "Sophomore" },
  { value: "JUNIOR", label: "Junior" },
  { value: "SENIOR", label: "Senior" },
  { value: "GRADUATE", label: "Graduate" },
  { value: "OTHER", label: "Other" },
];

const RACE_ETHNICITY_OPTIONS: { value: RaceEthnicity; label: string }[] = [
  { value: "AMERICAN_INDIAN_OR_ALASKA_NATIVE", label: "American Indian or Alaska Native" },
  { value: "ASIAN", label: "Asian" },
  { value: "BLACK_OR_AFRICAN_AMERICAN", label: "Black or African American" },
  { value: "HISPANIC_OR_LATINO", label: "Hispanic or Latino" },
  { value: "NATIVE_HAWAIIAN_OR_PACIFIC_ISLANDER", label: "Native Hawaiian or Pacific Islander" },
  { value: "WHITE", label: "White" },
  { value: "TWO_OR_MORE_RACES", label: "Two or More Races" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
  { value: "OTHER", label: "Other" },
];

export function Scholarships() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [scholarships, setScholarships] = useState<Scholarship[]>([]);
  const [showStudentInfoForm, setShowStudentInfoForm] = useState(false);
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessingPDF, setIsProcessingPDF] = useState(false);
  const [isLoadingScholarships, setIsLoadingScholarships] = useState(false);
  const [existingTranscript, setExistingTranscript] = useState<StudentInfo["transcriptFile"] | null>(null);
  const [existingResume, setExistingResume] = useState<StudentInfo["resumeFile"] | null>(null);
  const [hasScholarshipsFromPDFs, setHasScholarshipsFromPDFs] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<StudentInfoFormValues>({
    resolver: zodResolver(studentInfoSchema),
  });

  // Load existing student info on mount and fetch scholarships
  useEffect(() => {
    logger.info("Scholarships page mounted", undefined, "Scholarships");
    
    const existing = getStudentInfo();
    if (existing) {
      reset({
        name: existing.name,
        email: existing.email || "",
        phone: existing.phone || "",
        classStanding: existing.classStanding || "",
        program: existing.program || "",
        gpa: existing.gpa?.toString() || "",
        institution: existing.institution || "",
        raceEthnicity: existing.raceEthnicity || "",
        isFirstGeneration: existing.isFirstGeneration || false,
        isVeteran: existing.isVeteran || false,
        isInternationalStudent: existing.isInternationalStudent || false,
        achievements: existing.achievements || "",
        workExperience: existing.workExperience || "",
        extracurricularActivities: existing.extracurricularActivities || "",
        careerGoals: existing.careerGoals || "",
        financialNeed: existing.financialNeed || "",
      });
      setExistingTranscript(existing.transcriptFile || null);
      setExistingResume(existing.resumeFile || null);
      setShowStudentInfoForm(false);
      
      // Fetch relevant scholarships if student info exists
      const fetchScholarships = async () => {
        setIsLoadingScholarships(true);
        try {
          const relevantScholarships = await fetchRelevantScholarships({
            program: existing.program,
            gpa: existing.gpa,
            raceEthnicity: existing.raceEthnicity,
            isFirstGeneration: existing.isFirstGeneration,
            isVeteran: existing.isVeteran,
            isInternationalStudent: existing.isInternationalStudent,
            classStanding: existing.classStanding,
          });
          
          if (relevantScholarships.scholarships.length > 0) {
            setScholarships(relevantScholarships.scholarships);
            logger.info("Relevant scholarships fetched on mount", { count: relevantScholarships.scholarships.length }, "Scholarships");
          }
        } catch (error) {
          logger.error("Failed to fetch relevant scholarships on mount", error, "Scholarships");
        } finally {
          setIsLoadingScholarships(false);
        }
      };
      
      fetchScholarships();
    } else {
      setShowStudentInfoForm(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Filter state from URL params
  const programFilterParam = searchParams.get("program") || "";
  const programFilter = programFilterParam === "__all__" ? "" : programFilterParam;
  const minAward = searchParams.get("minAward") || "";
  const maxAward = searchParams.get("maxAward") || "";
  const searchQuery = searchParams.get("search") || "";

  // Get unique program tags
  const allProgramTags = useMemo(() => {
    const tags = new Set<string>();
    scholarships.forEach((s) => {
      s.programTags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [scholarships]);

  // Filter scholarships
  const filteredScholarships = useMemo(() => {
    const startTime = performance.now();
    const result = scholarships.filter((scholarship) => {
      // Program filter
      if (programFilter && !scholarship.programTags.includes(programFilter)) {
        return false;
      }

      // Award range filter
      if (minAward && scholarship.awardUSD < parseInt(minAward)) {
        return false;
      }
      if (maxAward && scholarship.awardUSD > parseInt(maxAward)) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = scholarship.title.toLowerCase().includes(query);
        const matchesBlurb = scholarship.blurb.toLowerCase().includes(query);
        const matchesTags = scholarship.programTags.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesBlurb && !matchesTags) {
          return false;
        }
      }

      return true;
    });
    const duration = performance.now() - startTime;
    logger.performance("scholarship_filter", duration, {
      total: scholarships.length,
      filtered: result.length,
      filters: { programFilter, minAward, maxAward, searchQuery },
    });
    return result;
  }, [scholarships, programFilter, minAward, maxAward, searchQuery]);

  const handleFilterChange = (key: string, value: string) => {
    logger.action("filter_changed", { key, value }, "Scholarships");
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        logger.warn("Invalid file type selected", { fileName: file.name, fileType: file.type }, "Scholarships");
        alert("Please select a PDF file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        logger.warn("File too large", { fileName: file.name, fileSize: file.size }, "Scholarships");
        alert("File size must be less than 10MB");
        return;
      }
      setTranscriptFile(file);
      logger.info("Transcript file selected", { fileName: file.name, fileSize: file.size }, "Scholarships");
    }
  };

  const handleRemoveTranscript = () => {
    setTranscriptFile(null);
    setExistingTranscript(null);
    logger.info("Transcript removed", undefined, "Scholarships");
  };

  const handleResumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        logger.warn("Invalid file type selected", { fileName: file.name, fileType: file.type }, "Scholarships");
        alert("Please select a PDF file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        logger.warn("File too large", { fileName: file.name, fileSize: file.size }, "Scholarships");
        alert("File size must be less than 10MB");
        return;
      }
      setResumeFile(file);
      logger.info("Resume file selected", { fileName: file.name, fileSize: file.size }, "Scholarships");
    }
  };

  const handleProcessPDFs = async () => {
    if (!transcriptFile && !resumeFile) {
      return;
    }

    setIsProcessingPDF(true);
    logger.action("process_pdfs_clicked", { hasTranscript: !!transcriptFile, hasResume: !!resumeFile }, "Scholarships");

    try {
      let scholarshipsFromPDFs: Scholarship[] = [];

      // Process transcript if available
      if (transcriptFile) {
        try {
          const analysis = await processTranscriptPDF(transcriptFile);
          logger.info("Transcript processed successfully", { hasGPA: !!analysis.gpa, hasName: !!analysis.name }, "Scholarships");
          
          // Auto-fill form fields with extracted data (only if empty)
          if (analysis.name && !watch("name")) {
            setValue("name", analysis.name);
          }
          if (analysis.institution && !watch("institution")) {
            setValue("institution", analysis.institution);
          }
          if (analysis.gpa && !watch("gpa")) {
            setValue("gpa", analysis.gpa.toString());
          }
          if (analysis.program && !watch("program")) {
            setValue("program", analysis.program);
          }
          if (analysis.classStanding && !watch("classStanding")) {
            setValue("classStanding", analysis.classStanding);
          }
          
          // Add scholarships from transcript if available
          if (analysis.scholarships && analysis.scholarships.length > 0) {
            scholarshipsFromPDFs = [...scholarshipsFromPDFs, ...analysis.scholarships];
            logger.info("Scholarships found from transcript", { count: analysis.scholarships.length }, "Scholarships");
          }
        } catch (error) {
          logger.error("Failed to process transcript", error, "Scholarships");
          alert("Failed to process transcript. Please try again or fill the form manually.");
        }
      }

      // Process resume if available
      if (resumeFile) {
        try {
          const analysis = await processResumePDF(resumeFile);
          logger.info("Resume processed successfully", { hasWorkExperience: !!analysis.workExperience, hasAchievements: !!analysis.achievements }, "Scholarships");
          
          // Auto-fill form fields with extracted data (only if empty)
          if (analysis.name && !watch("name")) {
            setValue("name", analysis.name);
          }
          if (analysis.email && !watch("email")) {
            setValue("email", analysis.email);
          }
          if (analysis.phone && !watch("phone")) {
            setValue("phone", analysis.phone);
          }
          if (analysis.workExperience && !watch("workExperience")) {
            setValue("workExperience", analysis.workExperience);
          }
          if (analysis.achievements && !watch("achievements")) {
            setValue("achievements", analysis.achievements);
          }
          if (analysis.extracurricularActivities && !watch("extracurricularActivities")) {
            setValue("extracurricularActivities", analysis.extracurricularActivities);
          }
          
          // Add scholarships from resume if available
          if (analysis.scholarships && analysis.scholarships.length > 0) {
            scholarshipsFromPDFs = [...scholarshipsFromPDFs, ...analysis.scholarships];
            logger.info("Scholarships found from resume", { count: analysis.scholarships.length }, "Scholarships");
          }
        } catch (error) {
          logger.error("Failed to process resume", error, "Scholarships");
          alert("Failed to process resume. Please try again or fill the form manually.");
        }
      }
      
      // Set scholarships if any were found from PDFs
      if (scholarshipsFromPDFs.length > 0) {
        // Remove duplicates based on id
        const uniqueScholarships = scholarshipsFromPDFs.reduce((acc, scholarship) => {
          if (!acc.find(s => s.id === scholarship.id)) {
            acc.push(scholarship);
          }
          return acc;
        }, [] as Scholarship[]);
        setScholarships(uniqueScholarships);
        setHasScholarshipsFromPDFs(true); // Mark that scholarships were set from PDFs
        logger.info("Scholarships set from PDF processing", { count: uniqueScholarships.length }, "Scholarships");
      }

      logger.info("PDF processing completed", { hasTranscript: !!transcriptFile, hasResume: !!resumeFile }, "Scholarships");
    } finally {
      setIsProcessingPDF(false);
    }
  };

  const handleRemoveResume = () => {
    setResumeFile(null);
    setExistingResume(null);
    logger.info("Resume removed", undefined, "Scholarships");
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onStudentInfoSubmit = async (data: StudentInfoFormValues) => {
    logger.action("student_info_save_started", { name: data.name }, "Scholarships");
    setIsUploading(true);

    try {
      let transcriptFileData: StudentInfo["transcriptFile"] | undefined;
      let resumeFileData: StudentInfo["resumeFile"] | undefined;

      if (transcriptFile) {
        logger.info("Converting transcript to base64", { fileName: transcriptFile.name }, "Scholarships");
        const base64Data = await convertFileToBase64(transcriptFile);
        transcriptFileData = {
          name: transcriptFile.name,
          data: base64Data,
          uploadedAt: new Date().toISOString(),
        };
      } else if (existingTranscript) {
        transcriptFileData = existingTranscript;
      }

      if (resumeFile) {
        logger.info("Converting resume to base64", { fileName: resumeFile.name }, "Scholarships");
        const base64Data = await convertFileToBase64(resumeFile);
        resumeFileData = {
          name: resumeFile.name,
          data: base64Data,
          uploadedAt: new Date().toISOString(),
        };
      } else if (existingResume) {
        resumeFileData = existingResume;
      }

      const studentInfo: StudentInfo = {
        name: data.name,
        email: data.email || undefined,
        phone: data.phone || undefined,
        classStanding: data.classStanding as ClassStanding | undefined,
        program: data.program || undefined,
        gpa: data.gpa ? parseFloat(data.gpa) : undefined,
        institution: data.institution || undefined,
        raceEthnicity: data.raceEthnicity as RaceEthnicity | undefined,
        isFirstGeneration: data.isFirstGeneration || false,
        isVeteran: data.isVeteran || false,
        isInternationalStudent: data.isInternationalStudent || false,
        achievements: data.achievements || undefined,
        workExperience: data.workExperience || undefined,
        extracurricularActivities: data.extracurricularActivities || undefined,
        careerGoals: data.careerGoals || undefined,
        financialNeed: data.financialNeed || undefined,
        transcriptFile: transcriptFileData,
        resumeFile: resumeFileData,
        lastUpdated: new Date().toISOString(),
      };

      saveStudentInfo(studentInfo);
      logger.info("Student information saved successfully", { name: studentInfo.name }, "Scholarships");
      setShowStudentInfoForm(false);
      setExistingTranscript(transcriptFileData || null);
      setExistingResume(resumeFileData || null);
      setTranscriptFile(null);
      setResumeFile(null);

      // Only fetch relevant scholarships if they weren't already set from PDF processing
      if (!hasScholarshipsFromPDFs) {
        setIsLoadingScholarships(true);
        try {
          const relevantScholarships = await fetchRelevantScholarships({
            program: studentInfo.program,
            gpa: studentInfo.gpa,
            raceEthnicity: studentInfo.raceEthnicity,
            isFirstGeneration: studentInfo.isFirstGeneration,
            isVeteran: studentInfo.isVeteran,
            isInternationalStudent: studentInfo.isInternationalStudent,
            classStanding: studentInfo.classStanding,
          });
          
          if (relevantScholarships.scholarships.length > 0) {
            setScholarships(relevantScholarships.scholarships);
            logger.info("Relevant scholarships fetched", { count: relevantScholarships.scholarships.length }, "Scholarships");
          }
        } catch (error) {
          logger.error("Failed to fetch relevant scholarships", error, "Scholarships");
          // Don't show error - scholarships can be added manually later
        } finally {
          setIsLoadingScholarships(false);
        }
      } else {
        logger.info("Skipping scholarship fetch - already set from PDF processing", undefined, "Scholarships");
      }
    } catch (error) {
      logger.error("Failed to save student information", error, "Scholarships");
      alert("Failed to save student information. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };


  const handleEditStudentInfo = () => {
    logger.action("edit_student_info_clicked", undefined, "Scholarships");
    setShowStudentInfoForm(true);
  };

  const handleFetchScholarships = async () => {
    const existing = getStudentInfo();
    if (!existing) {
      alert("Please save your student information first.");
      setShowStudentInfoForm(true);
      return;
    }

    setIsLoadingScholarships(true);
    logger.action("fetch_scholarships_clicked", undefined, "Scholarships");

    try {
      const relevantScholarships = await fetchRelevantScholarships({
        program: existing.program,
        gpa: existing.gpa,
        raceEthnicity: existing.raceEthnicity,
        isFirstGeneration: existing.isFirstGeneration,
        isVeteran: existing.isVeteran,
        isInternationalStudent: existing.isInternationalStudent,
        classStanding: existing.classStanding,
        institution: existing.institution,
        achievements: existing.achievements,
        workExperience: existing.workExperience,
        extracurricularActivities: existing.extracurricularActivities,
        careerGoals: existing.careerGoals,
        financialNeed: existing.financialNeed,
      });

      if (relevantScholarships.scholarships.length > 0) {
        setScholarships(relevantScholarships.scholarships);
        setHasScholarshipsFromPDFs(false); // Reset flag since we're manually fetching
        logger.info("Scholarships fetched manually", { count: relevantScholarships.scholarships.length }, "Scholarships");
      } else {
        logger.info("No scholarships found", undefined, "Scholarships");
        alert("No matching scholarships found. Try updating your student information for better matches.");
      }
    } catch (error) {
      logger.error("Failed to fetch scholarships", error, "Scholarships");
      alert("Failed to fetch scholarships. Please try again.");
    } finally {
      setIsLoadingScholarships(false);
    }
  };

  const clearFilters = () => {
    logger.action("filters_cleared", undefined, "Scholarships");
    setSearchParams({});
  };

  const isFirstGeneration = watch("isFirstGeneration");
  const isVeteran = watch("isVeteran");
  const isInternationalStudent = watch("isInternationalStudent");
  const hasInfo = hasStudentInfo();

  return (
    <div className="page-container">
      <div className="page-content">
        <div className="mb-8">
          <h1 className="page-title">
            Scholarships & Proposal Generator
          </h1>
          <p className="page-subtitle">
            Find scholarships and generate AI-powered proposals
          </p>
        </div>

        {/* Student Information Form */}
        {showStudentInfoForm && (
          <div className="mb-8 page-filter-card">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-primary-dark mb-2">
                {hasInfo ? "Update Student Information" : "Student Information"}
              </h2>
              <p className="text-sm text-muted mb-3">
                Please provide your information to help us generate personalized scholarship proposals and grant applications.
                All information is stored locally in your browser.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-base text-blue-900 font-medium">
                  🚀 Let's get your information fast! Start by uploading your documents below.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onStudentInfoSubmit)} className="space-y-6">
              {/* Documents - Moved to Top */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary-dark">Documents</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="transcript">Transcript (PDF)</Label>
                    <div className="mt-2">
                      {(transcriptFile || existingTranscript) && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="flex-1 text-xs truncate">
                            {transcriptFile?.name || existingTranscript?.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveTranscript}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                      <label
                        htmlFor="transcript"
                        className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                      >
                        <div className="flex flex-col items-center justify-center">
                          <Upload className="w-5 h-5 mb-1 text-gray-400" />
                          <p className="text-xs text-gray-500">Upload PDF</p>
                        </div>
                        <input
                          id="transcript"
                          type="file"
                          accept="application/pdf"
                          className="hidden"
                          onChange={handleFileChange}
                          disabled={isProcessingPDF}
                        />
                      </label>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="resume">Resume (PDF)</Label>
                    <div className="mt-2">
                      {(resumeFile || existingResume) && (
                        <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg mb-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <span className="flex-1 text-xs truncate">
                            {resumeFile?.name || existingResume?.name}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleRemoveResume}
                            className="h-6 w-6 p-0"
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    <label
                      htmlFor="resume"
                      className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex flex-col items-center justify-center">
                        <Upload className="w-5 h-5 mb-1 text-gray-400" />
                        <p className="text-xs text-gray-500">Upload PDF</p>
                      </div>
                      <input
                        id="resume"
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={handleResumeChange}
                        disabled={isProcessingPDF}
                      />
                    </label>
                    </div>
                  </div>
                </div>
                
                {/* Process PDFs Button */}
                {(transcriptFile || resumeFile) && (
                  <div className="flex justify-center pt-2">
                    <Button
                      type="button"
                      onClick={handleProcessPDFs}
                      disabled={isProcessingPDF}
                      className="flex items-center gap-2"
                    >
                      {isProcessingPDF ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing PDFs...
                        </>
                      ) : (
                        <>
                          <FileText className="h-4 w-4" />
                          Process PDFs to Auto-Fill Form
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary-dark">Basic Information</h3>
                
                <div>
                  <Label htmlFor="name">Full Name *</Label>
                  <Input
                    id="name"
                    {...register("name")}
                    placeholder="John Doe"
                    className={errors.name ? "border-red-500" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      {...register("email")}
                      placeholder="john.doe@example.com"
                      className={errors.email ? "border-red-500" : ""}
                    />
                    {errors.email && (
                      <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      {...register("phone")}
                      placeholder="(555) 123-4567"
                    />
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary-dark">Academic Information</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="classStanding">Class Standing</Label>
                    <Select
                      value={watch("classStanding") || ""}
                      onValueChange={(value) => setValue("classStanding", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select class standing" />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_STANDING_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="program">Program/Major</Label>
                    <Input
                      id="program"
                      {...register("program")}
                      placeholder="Software Engineering"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="gpa">GPA</Label>
                    <Input
                      id="gpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="4.0"
                      {...register("gpa")}
                      placeholder="3.75"
                    />
                  </div>

                  <div>
                    <Label htmlFor="institution">Institution</Label>
                    <Input
                      id="institution"
                      {...register("institution")}
                      placeholder="Florida International University"
                    />
                  </div>
                </div>
              </div>

              {/* Demographic Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary-dark">Demographic Information (Optional)</h3>
                <p className="text-sm text-muted">This information helps identify scholarship opportunities you may be eligible for.</p>
                
                <div>
                  <Label htmlFor="raceEthnicity">Race/Ethnicity</Label>
                  <Select
                    value={watch("raceEthnicity") || ""}
                    onValueChange={(value) => setValue("raceEthnicity", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select race/ethnicity" />
                    </SelectTrigger>
                    <SelectContent>
                      {RACE_ETHNICITY_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isFirstGeneration"
                      checked={isFirstGeneration}
                      onCheckedChange={(checked) => setValue("isFirstGeneration", checked === true)}
                    />
                    <Label htmlFor="isFirstGeneration" className="cursor-pointer">
                      First-generation college student
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isVeteran"
                      checked={isVeteran}
                      onCheckedChange={(checked) => setValue("isVeteran", checked === true)}
                    />
                    <Label htmlFor="isVeteran" className="cursor-pointer">
                      Veteran
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isInternationalStudent"
                      checked={isInternationalStudent}
                      onCheckedChange={(checked) => setValue("isInternationalStudent", checked === true)}
                    />
                    <Label htmlFor="isInternationalStudent" className="cursor-pointer">
                      International student
                    </Label>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary-dark">Additional Information</h3>
                
                <div>
                  <Label htmlFor="achievements">Achievements & Awards</Label>
                  <textarea
                    id="achievements"
                    {...register("achievements")}
                    placeholder="List any academic achievements, awards, honors, or recognitions..."
                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="workExperience">Work Experience</Label>
                  <textarea
                    id="workExperience"
                    {...register("workExperience")}
                    placeholder="Describe your work experience, internships, or relevant employment..."
                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="extracurricularActivities">Extracurricular Activities</Label>
                  <textarea
                    id="extracurricularActivities"
                    {...register("extracurricularActivities")}
                    placeholder="List clubs, organizations, volunteer work, or other activities..."
                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="careerGoals">Career Goals</Label>
                  <textarea
                    id="careerGoals"
                    {...register("careerGoals")}
                    placeholder="Describe your career aspirations and goals..."
                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="financialNeed">Financial Need Statement</Label>
                  <textarea
                    id="financialNeed"
                    {...register("financialNeed")}
                    placeholder="Describe your financial situation and need for scholarship support..."
                    className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    rows={3}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t">
                {hasInfo && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowStudentInfoForm(false)}
                    disabled={isUploading}
                  >
                    Cancel
                  </Button>
                )}
                <Button type="submit" disabled={isUploading}>
                  {isUploading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    hasInfo ? "Update Information" : "Save Information"
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Edit Button and Fetch Scholarships Button - Show when info exists and form is hidden */}
        {hasInfo && !showStudentInfoForm && (
          <div className="mb-6 flex gap-3">
            <Button
              variant="outline"
              onClick={handleEditStudentInfo}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Edit Student Information
            </Button>
            <Button
              onClick={handleFetchScholarships}
              disabled={isLoadingScholarships}
              className="flex items-center gap-2"
            >
              {isLoadingScholarships ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finding Scholarships...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Find Matching Scholarships
                </>
              )}
            </Button>
          </div>
        )}

        {/* Filter Bar */}
        <div className="page-filter-card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-muted" />
            <h2 className="text-lg font-semibold text-primary-dark">Filters</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search scholarships..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Program Select */}
            <div>
              <Select
                value={programFilter || "__all__"}
                onValueChange={(value) => handleFilterChange("program", value === "__all__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Programs</SelectItem>
                  {allProgramTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Award */}
            <div>
              <Input
                type="number"
                placeholder="Min Award ($)"
                value={minAward}
                onChange={(e) => handleFilterChange("minAward", e.target.value)}
              />
            </div>

            {/* Max Award */}
            <div>
              <Input
                type="number"
                placeholder="Max Award ($)"
                value={maxAward}
                onChange={(e) => handleFilterChange("maxAward", e.target.value)}
              />
            </div>
          </div>

          {(programFilterParam !== "__all__" && programFilterParam) || minAward || maxAward || searchQuery ? (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : null}
        </div>

        {/* Results Count */}
        {scholarships.length > 0 && !isLoadingScholarships && (
          <div className="mb-6">
            <p className="text-sm text-muted">
              Showing {filteredScholarships.length} of {scholarships.length} scholarships
            </p>
          </div>
        )}

        {/* Loading State */}
        {isLoadingScholarships && (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted mb-2">Loading scholarships...</p>
            <p className="text-sm text-muted">Finding the best opportunities for you</p>
          </div>
        )}

        {/* Scholarships Grid */}
        {!isLoadingScholarships && (
          <>
            {scholarships.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted mb-4">No scholarships available at this time.</p>
                <p className="text-sm text-muted">Scholarships will be displayed here when available.</p>
              </div>
            ) : filteredScholarships.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScholarships.map((scholarship) => (
              <ScholarshipCard
                key={scholarship.id}
                scholarship={scholarship}
              />
            ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-muted mb-4">No scholarships match your filters.</p>
                <Button variant="outline" onClick={clearFilters}>
                  Clear Filters
                </Button>
              </div>
            )}
          </>
        )}
      </div>

    </div>
  );
}

