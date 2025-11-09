import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Copy, Download, Loader2 } from "lucide-react";
import type { Scholarship } from "../types";
import { draftProposal, type ProposalFormData } from "../lib/ai";
import { logger } from "../lib/logger";
import { getStudentInfo } from "../lib/storage";
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
import { cn } from "../lib/utils";

interface ProposalModalProps {
  scholarship: Scholarship | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const proposalSchema = z.object({
  studentName: z.string().min(2, "Name must be at least 2 characters"),
  program: z.string().min(2, "Program name is required"),
  resumeLink: z.string().url("Must be a valid URL").optional().or(z.literal("")),
  additionalNotes: z.string().optional(),
});

type ProposalFormValues = z.infer<typeof proposalSchema>;

export function ProposalModal({
  scholarship,
  open,
  onOpenChange,
}: ProposalModalProps) {
  const [activeTab, setActiveTab] = useState<"form" | "preview">("form");
  const [proposalMarkdown, setProposalMarkdown] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalSchema),
  });

  // Load student info when modal opens
  useEffect(() => {
    if (open && scholarship) {
      const studentInfo = getStudentInfo();
      if (studentInfo) {
        reset({
          studentName: studentInfo.name,
          program: studentInfo.program || "",
          resumeLink: studentInfo.resumeLink || "",
          additionalNotes: "",
        });
      }
    }
  }, [open, scholarship, reset]);

  useEffect(() => {
    if (open && scholarship) {
      logger.info("Proposal modal opened", { scholarshipId: scholarship.id, scholarshipTitle: scholarship.title }, "ProposalModal");
    }
  }, [open, scholarship]);

  const onSubmit = async (data: ProposalFormValues) => {
    if (!scholarship) return;

    logger.action("proposal_generation_started", {
      scholarshipId: scholarship.id,
      studentName: data.studentName,
      program: data.program,
    }, "ProposalModal");

    setIsGenerating(true);
    const startTime = performance.now();
    try {
      // Get student info to include additional context
      const studentInfo = getStudentInfo();
      
      // Build additional notes from student info
      let additionalContext = data.additionalNotes || "";
      if (studentInfo) {
        const contextParts: string[] = [];
        
        if (studentInfo.classStanding) {
          contextParts.push(`Class Standing: ${studentInfo.classStanding}`);
        }
        if (studentInfo.gpa) {
          contextParts.push(`GPA: ${studentInfo.gpa}`);
        }
        if (studentInfo.achievements) {
          contextParts.push(`Achievements: ${studentInfo.achievements}`);
        }
        if (studentInfo.workExperience) {
          contextParts.push(`Work Experience: ${studentInfo.workExperience}`);
        }
        if (studentInfo.extracurricularActivities) {
          contextParts.push(`Extracurricular Activities: ${studentInfo.extracurricularActivities}`);
        }
        if (studentInfo.careerGoals) {
          contextParts.push(`Career Goals: ${studentInfo.careerGoals}`);
        }
        if (studentInfo.financialNeed) {
          contextParts.push(`Financial Need: ${studentInfo.financialNeed}`);
        }
        if (studentInfo.isFirstGeneration) {
          contextParts.push("First-generation college student");
        }
        if (studentInfo.isVeteran) {
          contextParts.push("Veteran");
        }
        if (studentInfo.isInternationalStudent) {
          contextParts.push("International student");
        }
        if (studentInfo.raceEthnicity) {
          contextParts.push(`Race/Ethnicity: ${studentInfo.raceEthnicity}`);
        }
        
        if (contextParts.length > 0) {
          additionalContext = contextParts.join("\n") + (additionalContext ? `\n\nAdditional Notes:\n${additionalContext}` : "");
        }
      }

      const formData: ProposalFormData = {
        studentName: data.studentName,
        program: data.program,
        resumeLink: data.resumeLink || studentInfo?.resumeLink || undefined,
        additionalNotes: additionalContext || undefined,
      };

      const markdown = await draftProposal(scholarship, formData);
      const duration = performance.now() - startTime;
      logger.performance("proposal_generation", duration, {
        scholarshipId: scholarship.id,
        markdownLength: markdown.length,
      });
      logger.info("Proposal generated successfully", {
        scholarshipId: scholarship.id,
        markdownLength: markdown.length,
      }, "ProposalModal");
      setProposalMarkdown(markdown);
      setActiveTab("preview");
    } catch (error) {
      logger.error("Failed to generate proposal", error, "ProposalModal");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyMarkdown = async () => {
    logger.action("proposal_copy", { scholarshipId: scholarship?.id }, "ProposalModal");
    try {
      await navigator.clipboard.writeText(proposalMarkdown);
      logger.info("Proposal copied to clipboard", undefined, "ProposalModal");
    } catch (error) {
      logger.error("Failed to copy proposal", error, "ProposalModal");
    }
  };

  const handleDownloadMarkdown = () => {
    logger.action("proposal_download", { scholarshipId: scholarship?.id }, "ProposalModal");
    const blob = new Blob([proposalMarkdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `proposal-${scholarship?.title.replace(/\s+/g, "-").toLowerCase() || "scholarship"}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logger.info("Proposal downloaded", { filename: a.download }, "ProposalModal");
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      logger.debug("Proposal modal closed", undefined, "ProposalModal");
      reset();
      setActiveTab("form");
      setProposalMarkdown("");
    }
    onOpenChange(open);
  };

  if (!scholarship) return null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Proposal: {scholarship.title}</DialogTitle>
          <DialogDescription>
            Fill out the form below to generate an AI-powered scholarship proposal.
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            onClick={() => {
              logger.debug("Switched to form tab", undefined, "ProposalModal");
              setActiveTab("form");
            }}
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b-2 transition-colors",
              activeTab === "form"
                ? "border-primary text-primary"
                : "border-transparent text-gray-600 hover:text-primary"
            )}
          >
            Form
          </button>
          <button
            onClick={() => {
              logger.debug("Switched to preview tab", undefined, "ProposalModal");
              setActiveTab("preview");
            }}
            disabled={!proposalMarkdown}
            className={cn(
              "px-4 py-2 text-sm font-semibold border-b-2 transition-colors",
              activeTab === "preview"
                ? "border-primary text-primary"
                : "border-transparent text-gray-600 hover:text-primary",
              !proposalMarkdown && "opacity-50 cursor-not-allowed"
            )}
          >
            Preview
          </button>
        </div>

        {activeTab === "form" ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="studentName">Student Name *</Label>
              <Input
                id="studentName"
                {...register("studentName")}
                placeholder="John Doe"
                className={errors.studentName ? "border-red-500" : ""}
              />
              {errors.studentName && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.studentName.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="program">Program *</Label>
              <Input
                id="program"
                {...register("program")}
                placeholder="Software Engineering"
                className={errors.program ? "border-red-500" : ""}
              />
              {errors.program && (
                <p className="text-sm text-red-500 mt-1">
                  {errors.program.message}
                </p>
              )}
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
                <p className="text-sm text-red-500 mt-1">
                  {errors.resumeLink.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="essayLength">Essay Length Constraint</Label>
              <Input
                id="essayLength"
                value={`${scholarship.essayWords || "N/A"} words`}
                disabled
                className="bg-gray-50"
              />
            </div>

            <div>
              <Label htmlFor="additionalNotes">Additional Notes (Optional)</Label>
              <textarea
                id="additionalNotes"
                {...register("additionalNotes")}
                placeholder="Any additional information or specific points to include..."
                className="flex min-h-[80px] w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                rows={4}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleClose(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isGenerating}>
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Draft Proposal (AI)"
                )}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyMarkdown}
              >
                <Copy className="mr-2 h-4 w-4" />
                Copy Markdown
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadMarkdown}
              >
                <Download className="mr-2 h-4 w-4" />
                Download .md
              </Button>
            </div>

            <div className="rounded-xl border bg-gray-50 p-6">
              <pre className="whitespace-pre-wrap text-sm font-mono text-gray-800 overflow-x-auto">
                {proposalMarkdown}
              </pre>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setActiveTab("form")}
              >
                Edit Form
              </Button>
              <Button onClick={() => handleClose(false)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

