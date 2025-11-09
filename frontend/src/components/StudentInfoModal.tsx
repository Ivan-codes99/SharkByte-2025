import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import type { StudentInfo, ClassStanding, RaceEthnicity } from "../types";
import { saveStudentInfo, getStudentInfo } from "../lib/storage";
import { logger } from "../lib/logger";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Checkbox } from "./ui/checkbox";

interface StudentInfoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (studentInfo: StudentInfo) => void;
}

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
  resumeLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
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

export function StudentInfoModal({ open, onOpenChange, onSave }: StudentInfoModalProps) {
  const [transcriptFile, setTranscriptFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [existingTranscript, setExistingTranscript] = useState<StudentInfo["transcriptFile"] | null>(null);

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

  // Load existing student info when modal opens
  useEffect(() => {
    if (open) {
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
          resumeLink: existing.resumeLink || "",
        });
        setExistingTranscript(existing.transcriptFile || null);
      } else {
        reset({
          name: "",
          email: "",
          phone: "",
          classStanding: "",
          program: "",
          gpa: "",
          institution: "",
          raceEthnicity: "",
          isFirstGeneration: false,
          isVeteran: false,
          isInternationalStudent: false,
          achievements: "",
          workExperience: "",
          extracurricularActivities: "",
          careerGoals: "",
          financialNeed: "",
          resumeLink: "",
        });
        setExistingTranscript(null);
      }
      setTranscriptFile(null);
    }
  }, [open, reset]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== "application/pdf") {
        logger.warn("Invalid file type selected", { fileName: file.name, fileType: file.type }, "StudentInfoModal");
        alert("Please select a PDF file");
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        logger.warn("File too large", { fileName: file.name, fileSize: file.size }, "StudentInfoModal");
        alert("File size must be less than 10MB");
        return;
      }
      setTranscriptFile(file);
      logger.info("Transcript file selected", { fileName: file.name, fileSize: file.size }, "StudentInfoModal");
    }
  };

  const handleRemoveTranscript = () => {
    setTranscriptFile(null);
    setExistingTranscript(null);
    logger.info("Transcript removed", undefined, "StudentInfoModal");
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:application/pdf;base64, prefix
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const onSubmit = async (data: StudentInfoFormValues) => {
    logger.action("student_info_save_started", { name: data.name }, "StudentInfoModal");
    setIsUploading(true);

    try {
      let transcriptFileData: StudentInfo["transcriptFile"] | undefined;

      if (transcriptFile) {
        logger.info("Converting transcript to base64", { fileName: transcriptFile.name }, "StudentInfoModal");
        const base64Data = await convertFileToBase64(transcriptFile);
        transcriptFileData = {
          name: transcriptFile.name,
          data: base64Data,
          uploadedAt: new Date().toISOString(),
        };
      } else if (existingTranscript) {
        transcriptFileData = existingTranscript;
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
        resumeLink: data.resumeLink || undefined,
        lastUpdated: new Date().toISOString(),
      };

      saveStudentInfo(studentInfo);
      logger.info("Student information saved successfully", { name: studentInfo.name }, "StudentInfoModal");

      if (onSave) {
        onSave(studentInfo);
      }

      onOpenChange(false);
    } catch (error) {
      logger.error("Failed to save student information", error, "StudentInfoModal");
      alert("Failed to save student information. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      logger.debug("Student info modal closed", undefined, "StudentInfoModal");
      reset();
      setTranscriptFile(null);
    }
    onOpenChange(open);
  };

  const isFirstGeneration = watch("isFirstGeneration");
  const isVeteran = watch("isVeteran");
  const isInternationalStudent = watch("isInternationalStudent");

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Information</DialogTitle>
          <DialogDescription>
            Please provide your information to help us generate personalized scholarship proposals and grant applications.
            All information is stored locally in your browser.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

          {/* Documents */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary-dark">Documents</h3>
            
            <div>
              <Label htmlFor="transcript">Transcript (PDF)</Label>
              <div className="mt-2">
                {(transcriptFile || existingTranscript) && (
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg mb-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="flex-1 text-sm">
                      {transcriptFile?.name || existingTranscript?.name}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveTranscript}
                      className="h-8 w-8 p-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <label
                  htmlFor="transcript"
                  className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-2 text-gray-400" />
                    <p className="mb-2 text-sm text-gray-500">
                      <span className="font-semibold">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">PDF (MAX. 10MB)</p>
                  </div>
                  <input
                    id="transcript"
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            <div>
              <Label htmlFor="resumeLink">Resume Link (Optional)</Label>
              <Input
                id="resumeLink"
                type="url"
                {...register("resumeLink")}
                placeholder="https://example.com/resume.pdf"
                className={errors.resumeLink ? "border-red-500" : ""}
              />
              {errors.resumeLink && (
                <p className="text-sm text-red-500 mt-1">{errors.resumeLink.message}</p>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Information"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

