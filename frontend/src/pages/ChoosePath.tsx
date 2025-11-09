import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logger } from "../lib/logger";
import { ExternalLink, Loader2, CheckCircle2, Trash2, Search, GraduationCap, BookOpen, X, ChevronDown, XCircle, Calendar } from "lucide-react";
import { 
  analyzeProgramById, 
  searchPrograms, 
  getFields,
  getProgramsByField
} from "../lib/api";
import type { ProgramAnalysisResponse, RequirementGroup } from "../types";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Combobox } from "../components/ui/combobox";
import { saveProgramAnalysis, getProgramAnalysis, clearProgramAnalysis, hasProgramAnalysis, savePendingAnalysis, getPendingAnalysis, clearPendingAnalysis } from "../lib/storage";
import "../styles/pages.css";

interface MDCProgram {
  id: string;
  name: string;
  degreeType: "AA" | "AS" | "BS" | "BA" | "CERT";
  programUrl: string;
  pdfLinks: {
    courseList?: string;
    sequenceGuide?: string;
  };
  careerProspects: string[];
  school?: string;
  concentration?: string;
  field?: string;
}

export function ChoosePath() {
  const navigate = useNavigate();
  const [searchMode, setSearchMode] = useState<"career" | "field">("career");
  const [careerSearch, setCareerSearch] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [programs, setPrograms] = useState<MDCProgram[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<MDCProgram | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<ProgramAnalysisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasSavedData, setHasSavedData] = useState(false);
  const [fields, setFields] = useState<string[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [searching, setSearching] = useState(false);
  const [showAllPrograms, setShowAllPrograms] = useState(true);
  const [loadingMessageIndex, setLoadingMessageIndex] = useState(0);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [hasAnalysis, setHasAnalysis] = useState(false);

  // Load saved analysis on component mount
  useEffect(() => {
    const saved = getProgramAnalysis();
    if (saved) {
      setAnalysisResult(saved);
      setHasSavedData(true);
      setHasAnalysis(true);
      // If we have a result, clear any pending state (analysis completed)
      const pending = getPendingAnalysis();
      if (pending) {
        clearPendingAnalysis();
      }
      logger.info("Loaded saved program analysis from localStorage", {
        programName: saved.programName,
        degreeType: saved.degreeType,
      }, "ChoosePath");
    } else {
      setHasSavedData(hasProgramAnalysis());
      setHasAnalysis(hasProgramAnalysis());
    }
  }, []);

  // Update hasAnalysis whenever analysisResult changes
  useEffect(() => {
    setHasAnalysis(hasProgramAnalysis());
  }, [analysisResult]);

  // Check for pending analysis when programs are loaded or on mount
  useEffect(() => {
    const saved = getProgramAnalysis();
    const pending = getPendingAnalysis();
    
    // Check if pending analysis is stale (older than 10 minutes)
    const PENDING_TIMEOUT = 10 * 60 * 1000; // 10 minutes
    if (pending && Date.now() - pending.startTime > PENDING_TIMEOUT) {
      logger.warn("Pending analysis is stale, clearing it", {
        programId: pending.programId,
        age: Date.now() - pending.startTime,
      }, "ChoosePath");
      clearPendingAnalysis();
      return;
    }
    
    // Only restore pending state if we don't have a result
    if (!saved && pending) {
      // Try to find the program in the current list
      const pendingProgram = programs.find(p => p.id === pending.programId);
      
      if (pendingProgram) {
        // Found the program, restore full state
        setSelectedProgram(pendingProgram);
        setAnalyzing(true);
        setShowAllPrograms(false);
        logger.info("Restored pending analysis state", {
          programId: pending.programId,
          programName: pending.programName,
          startTime: pending.startTime,
        }, "ChoosePath");
      } else if (programs.length === 0) {
        // Programs not loaded yet, but we have pending analysis
        // Create a minimal program object from pending state to show loading
        const minimalProgram: MDCProgram = {
          id: pending.programId,
          name: pending.programName,
          degreeType: "AA", // Default, will be updated when programs load
          programUrl: "", // Will be updated when programs load
          pdfLinks: {},
          careerProspects: [],
        };
        setSelectedProgram(minimalProgram);
        setAnalyzing(true);
        logger.info("Restored pending analysis state (programs not loaded yet)", {
          programId: pending.programId,
          programName: pending.programName,
          startTime: pending.startTime,
        }, "ChoosePath");
      } else {
        // Programs loaded but program not found - create minimal program for display
        const minimalProgram: MDCProgram = {
          id: pending.programId,
          name: pending.programName,
          degreeType: "AA", // Default
          programUrl: "", // Unknown URL
          pdfLinks: {},
          careerProspects: [],
        };
        setSelectedProgram(minimalProgram);
        setAnalyzing(true);
        logger.warn("Pending analysis found but program not in current list - using minimal program object", {
          programId: pending.programId,
          programName: pending.programName,
        }, "ChoosePath");
      }
    }
  }, [programs]);

  // Load fields on mount
  useEffect(() => {
    loadFields();
  }, []);

  // Cleanup on unmount - clear pending state if component is unmounting while analyzing
  useEffect(() => {
    return () => {
      // On unmount, if we're still analyzing, the pending state will persist
      // This is intentional so it can be restored when user navigates back
      // But we don't need to do anything special here
    };
  }, []);

  // Check for completed analysis when page becomes visible (user navigates back)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && analyzing) {
        // Check if result has arrived while we were away
        const saved = getProgramAnalysis();
        if (saved) {
          // Result is available, clear pending and update state
          clearPendingAnalysis();
          setAnalysisResult(saved);
          setHasSavedData(true);
          setAnalyzing(false);
          logger.info("Found completed analysis result on visibility change", {
            programName: saved.programName,
          }, "ChoosePath");
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [analyzing]);

  // Periodically check if analysis has completed (in case it finished while user was away)
  useEffect(() => {
    if (!analyzing) return;

    const checkInterval = setInterval(() => {
      const saved = getProgramAnalysis();
      const pending = getPendingAnalysis();
      
      // If we have a result and pending state, clear pending and show result
      if (saved && pending) {
        clearPendingAnalysis();
        setAnalysisResult(saved);
        setHasSavedData(true);
        setAnalyzing(false);
        logger.info("Found completed analysis result during periodic check", {
          programName: saved.programName,
        }, "ChoosePath");
      }
      // Also check if we have a result but no pending (already completed)
      else if (saved && !pending && analyzing) {
        setAnalysisResult(saved);
        setHasSavedData(true);
        setAnalyzing(false);
        logger.info("Found completed analysis result (no pending state) during periodic check", {
          programName: saved.programName,
        }, "ChoosePath");
      }
    }, 2000); // Check every 2 seconds

    return () => clearInterval(checkInterval);
  }, [analyzing]);

  // Cycle through loading messages when analyzing
  useEffect(() => {
    if (!analyzing) {
      setLoadingMessageIndex(0);
      return;
    }

    const messages = [
      "Generating your career map...",
      "This could take a minute...",
      "or two..."
    ];

    const interval = setInterval(() => {
      setLoadingMessageIndex((prev) => (prev + 1) % messages.length);
    }, 8000); // Change message every 3.5 seconds

    return () => clearInterval(interval);
  }, [analyzing]);

  const loadFields = async () => {
    try {
      setLoadingFields(true);
      const fieldsData = await getFields();
      setFields(fieldsData);
    } catch (err) {
      logger.error("Failed to load fields", err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoadingFields(false);
    }
  };

  const handleCareerSearch = async () => {
    if (!careerSearch.trim()) {
      setError("Please enter a career prospect to search");
      return;
    }

    setSearching(true);
    setError(null);
    setPrograms([]);
    setSelectedProgram(null);
    setShowAllPrograms(true);

    try {
      logger.action("search_programs", { searchTerm: careerSearch }, "ChoosePath");
      const result = await searchPrograms(careerSearch.trim());
      setPrograms(result.programs);
      
      if (result.programs.length === 0) {
        setError(`No programs found for "${careerSearch}". Try a different search term.`);
      } else {
        logger.info(`Found ${result.programs.length} programs for search: ${careerSearch}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to search programs";
      setError(errorMessage);
      logger.error("Failed to search programs", err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSearching(false);
    }
  };

  const handleFieldSelect = async (field: string) => {
    if (!field) {
      setPrograms([]);
      setSelectedProgram(null);
      return;
    }

    setSelectedField(field);
    setError(null);
    setPrograms([]);
    setSelectedProgram(null);
    setShowAllPrograms(true);
    setSearching(true);

    try {
      logger.action("get_programs_by_field", { field }, "ChoosePath");
      const result = await getProgramsByField(field);
      
      // Flatten all programs from all career mappings, preserving field info
      const allPrograms: MDCProgram[] = [];
      result.mappings.forEach(mapping => {
        mapping.programs.forEach((program: MDCProgram) => {
          const existingIndex = allPrograms.findIndex(p => p.id === program.id);
          if (existingIndex === -1) {
            allPrograms.push({ ...program, field: mapping.field });
          } else {
            // If program already exists but doesn't have field, add it
            if (!allPrograms[existingIndex].field && mapping.field) {
              allPrograms[existingIndex].field = mapping.field;
            }
          }
        });
      });
      
      setPrograms(allPrograms);
      
      if (allPrograms.length === 0) {
        setError(`No programs found for field "${field}"`);
      } else {
        logger.info(`Found ${allPrograms.length} programs for field: ${field}`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to get programs";
      setError(errorMessage);
      logger.error("Failed to get programs by field", err instanceof Error ? err : new Error(String(err)));
    } finally {
      setSearching(false);
    }
  };

  const handleProgramSelect = (program: MDCProgram) => {
    // Toggle selection: if clicking the same program, unselect it
    if (selectedProgram?.id === program.id) {
      setSelectedProgram(null);
      setShowAllPrograms(true);
      logger.action("unselect_program", { programId: program.id, programName: program.name }, "ChoosePath");
    } else {
      setSelectedProgram(program);
      setShowAllPrograms(false); // Collapse to show only selected program
      setError(null);
      logger.action("select_program", { programId: program.id, programName: program.name }, "ChoosePath");
    }
  };

  const handleShowAllPrograms = () => {
    setShowAllPrograms(true);
    // Optionally scroll to programs section
    setTimeout(() => {
      const programsSection = document.getElementById("programs-section");
      if (programsSection) {
        programsSection.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 100);
  };

  const handleCancelAnalysis = () => {
    // Abort the current request if it exists
    if (abortController) {
      abortController.abort();
      setAbortController(null);
    }
    
    // Clear pending state
    clearPendingAnalysis();
    setAnalyzing(false);
    setError(null);
    
    logger.action("cancel_analysis", {
      programId: selectedProgram?.id,
      programName: selectedProgram?.name,
    }, "ChoosePath");
  };

  const handleAnalyzeProgram = async () => {
    if (!selectedProgram) {
      setError("Please select a program first");
      return;
    }

    // Create abort controller for this request
    const controller = new AbortController();
    setAbortController(controller);

    setAnalyzing(true);
    setError(null);
    setAnalysisResult(null);
    
    // Save pending analysis state so it persists across navigation
    savePendingAnalysis(selectedProgram.id, selectedProgram.name);

    try {
      logger.action("analyze_program_auto", {
        programId: selectedProgram.id,
        programName: selectedProgram.name,
      }, "ChoosePath");

      const result = await analyzeProgramById(selectedProgram.id, controller.signal);
      
      // Check if request was aborted
      if (controller.signal.aborted) {
        return;
      }
      
      setAnalysisResult(result);
      
      // Save to localStorage
      saveProgramAnalysis(result);
      setHasSavedData(true);
      setHasAnalysis(true);
      
      // Clear pending analysis since we have the result
      clearPendingAnalysis();
      setAnalyzing(false); // Explicitly stop loading
      setAbortController(null);
      
      // Helper function to recursively count courses in nested groups
      const countCoursesInGroup = (group: RequirementGroup): number => {
        let count = group.courses?.length || 0;
        if (group.groups) {
          count += group.groups.reduce((sum, subGroup) => sum + countCoursesInGroup(subGroup), 0);
        }
        return count;
      };
      
      // Calculate total course count from all groups (including nested)
      const totalCourses = result.requirements.groups.reduce(
        (sum, group) => sum + countCoursesInGroup(group),
        0
      );
      
      logger.info("Program analyzed successfully and saved to localStorage", {
        programName: result.programName,
        degreeType: result.degreeType,
        topLevelGroups: result.requirements.groups.length,
        totalCourses,
      }, "ChoosePath");
    } catch (err) {
      // Don't show error if request was aborted
      if (err instanceof Error && err.name === 'AbortError') {
        logger.info("Analysis request was cancelled", undefined, "ChoosePath");
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Failed to analyze program";
      setError(errorMessage);
      logger.error("Failed to analyze program", err instanceof Error ? err : new Error(String(err)));
      // Clear pending analysis on error
      clearPendingAnalysis();
    } finally {
      if (!controller.signal.aborted) {
        setAnalyzing(false);
      }
      setAbortController(null);
    }
  };

  const handleClearAnalysis = () => {
    if (!hasSavedData) {
      return;
    }
    
    if (window.confirm("Are you sure you want to clear the saved program analysis? This action cannot be undone.")) {
      clearProgramAnalysis();
      clearPendingAnalysis();
      setAnalysisResult(null);
      setHasSavedData(false);
      setHasAnalysis(false);
      setSelectedProgram(null);
      setPrograms([]);
      setCareerSearch("");
      setSelectedField("");
      setShowAllPrograms(true);
      setError(null);
      setAnalyzing(false);
      
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
              Choose Your Path
            </h1>
            <p className="page-subtitle">
              Search for your desired career or browse by field to find MDC programs that match your goals.
            </p>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="page-content">
        <div className="max-w-4xl mx-auto">
          {/* Clear Saved Data Button */}
          {hasSavedData && (
            <div className="mb-6 flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearAnalysis}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Clear Saved Data
              </Button>
            </div>
          )}

          {/* Search Mode Selection */}
          <div className="page-card mb-6">
            <h2 className="page-section-title mb-4">Find Your Program</h2>
            <div className="flex gap-4 mb-6">
              <Button
                variant={searchMode === "career" ? "default" : "outline"}
                onClick={() => {
                  setSearchMode("career");
                  setPrograms([]);
                  setSelectedProgram(null);
                  setSelectedField("");
                  setShowAllPrograms(true);
                }}
              >
                <Search className="h-4 w-4 mr-2" />
                Search by Career
              </Button>
              <Button
                variant={searchMode === "field" ? "default" : "outline"}
                onClick={() => {
                  setSearchMode("field");
                  setPrograms([]);
                  setSelectedProgram(null);
                  setCareerSearch("");
                  setShowAllPrograms(true);
                }}
              >
                <GraduationCap className="h-4 w-4 mr-2" />
                Browse by Field
              </Button>
            </div>

            {/* Career Search Mode */}
            {searchMode === "career" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Enter career prospect (e.g., Software Developer, Teacher, Nurse)"
                    value={careerSearch}
                    onChange={(e) => setCareerSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleCareerSearch();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleCareerSearch}
                    disabled={searching || !careerSearch.trim()}
                  >
                    {searching ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Searching...
                      </>
                    ) : (
                      <>
                        <Search className="h-4 w-4 mr-2" />
                        Search
                      </>
                    )}
                  </Button>
                </div>
                <p className="text-sm text-muted">
                  Examples: Software Developer, Computer Systems Analyst, Secondary School Teacher, 
                  Airport Security, Information Security Analyst, Civil Engineer, Coach, Athletic Trainer
                </p>
              </div>
            )}

            {/* Field Browse Mode */}
            {searchMode === "field" && (
              <div className="space-y-4">
                <Combobox
                  options={fields.map(field => ({ value: field, label: field }))}
                  value={selectedField}
                  onValueChange={handleFieldSelect}
                  placeholder={loadingFields ? "Loading fields..." : "Select a field (e.g., Technology, Medicine, Education)"}
                  searchPlaceholder="Search fields..."
                  emptyMessage="No fields found."
                  disabled={loadingFields}
                />
              </div>
            )}
          </div>

          {/* Programs List */}
          {programs.length > 0 && (() => {
            // Group programs by degree type
            const groupedByDegree = programs.reduce((acc, program) => {
              const degreeType = program.degreeType;
              if (!acc[degreeType]) {
                acc[degreeType] = [];
              }
              acc[degreeType].push(program);
              return acc;
            }, {} as Record<string, MDCProgram[]>);

            // Define degree type labels and order
            const degreeOrder = ["BS", "BA", "AS", "AA", "CERT"];
            const degreeLabels: Record<string, string> = {
              BS: "Bachelor of Science",
              BA: "Bachelor of Arts",
              AS: "Associate in Science",
              AA: "Associate in Arts",
              CERT: "Certificates",
            };

            // Define field colors
            const getFieldColor = (field?: string): { border: string; bg: string; badge: string } => {
              const fieldColors: Record<string, { border: string; bg: string; badge: string }> = {
                Technology: {
                  border: "border-blue-300",
                  bg: "bg-blue-50",
                  badge: "bg-blue-100 text-blue-800",
                },
                Medicine: {
                  border: "border-red-300",
                  bg: "bg-red-50",
                  badge: "bg-red-100 text-red-800",
                },
                Education: {
                  border: "border-green-300",
                  bg: "bg-green-50",
                  badge: "bg-green-100 text-green-800",
                },
                Business: {
                  border: "border-purple-300",
                  bg: "bg-purple-50",
                  badge: "bg-purple-100 text-purple-800",
                },
                Other: {
                  border: "border-gray-300",
                  bg: "bg-gray-50",
                  badge: "bg-gray-100 text-gray-800",
                },
              };

              if (!field) {
                return {
                  border: "border-gray-200",
                  bg: "bg-gray-50",
                  badge: "bg-gray-100 text-gray-800",
                };
              }

              return fieldColors[field] || fieldColors.Other;
            };

            // If a program is selected and we're in collapsed mode, show only that program
            const programsToShow = selectedProgram && !showAllPrograms 
              ? [selectedProgram] 
              : programs;

            // Re-group programs to show
            const groupedToShow = programsToShow.reduce((acc, program) => {
              const degreeType = program.degreeType;
              if (!acc[degreeType]) {
                acc[degreeType] = [];
              }
              acc[degreeType].push(program);
              return acc;
            }, {} as Record<string, MDCProgram[]>);

            return (
              <div id="programs-section" className="page-card mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="page-section-title">
                    {selectedProgram && !showAllPrograms 
                      ? "Selected Program" 
                      : `Found ${programs.length} Program${programs.length !== 1 ? "s" : ""}`}
                  </h2>
                  {selectedProgram && !showAllPrograms && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShowAllPrograms}
                      className="flex items-center gap-2"
                    >
                      <ChevronDown className="h-4 w-4" />
                      Show All Programs
                    </Button>
                  )}
                </div>
                <div className="space-y-6">
                  {degreeOrder.map((degreeType) => {
                    const degreePrograms = groupedToShow[degreeType] || [];
                    if (degreePrograms.length === 0) return null;

                    return (
                      <div key={degreeType} className="space-y-3">
                        {showAllPrograms && (
                          <h3 className="text-lg font-semibold text-primary-dark border-b pb-2">
                            {degreeLabels[degreeType]} ({groupedByDegree[degreeType]?.length || 0})
                          </h3>
                        )}
                        <div className="space-y-3">
                          {degreePrograms.map((program) => {
                            const colors = getFieldColor(program.field);
                            const isSelected = selectedProgram?.id === program.id;
                            
                            return (
                              <div
                                key={program.id}
                                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                                  isSelected
                                    ? "border-[#d45a2a] bg-[#f6f3eb]"
                                    : `${colors.border} ${colors.bg} hover:border-[#d45a2a] hover:bg-gray-50`
                                }`}
                                onClick={() => handleProgramSelect(program)}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="font-semibold text-primary-dark">
                                        {program.name}
                                      </h3>
                                      {program.field && (
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${colors.badge}`}>
                                          {program.field}
                                        </span>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-2 text-sm text-muted mb-2">
                                      <span className="px-2 py-1 bg-gray-100 rounded">
                                        {program.degreeType}
                                      </span>
                                      {program.school && (
                                        <span className="px-2 py-1 bg-gray-100 rounded">
                                          {program.school}
                                        </span>
                                      )}
                                      {program.concentration && (
                                        <span className="px-2 py-1 bg-gray-100 rounded">
                                          {program.concentration}
                                        </span>
                                      )}
                                    </div>
                                    {program.careerProspects.length > 0 && (
                                      <p className="text-sm text-muted">
                                        <strong>Career Prospects:</strong> {program.careerProspects.slice(0, 3).join(", ")}
                                        {program.careerProspects.length > 3 && ` +${program.careerProspects.length - 3} more`}
                                      </p>
                                    )}
                                    <div className="mt-2 flex gap-2 text-xs text-muted">
                                      {program.pdfLinks.courseList && (
                                        <span className="flex items-center gap-1">
                                          <BookOpen className="h-3 w-3" />
                                          Course List
                                        </span>
                                      )}
                                      {program.pdfLinks.sequenceGuide && (
                                        <span className="flex items-center gap-1">
                                          <BookOpen className="h-3 w-3" />
                                          Sequence Guide
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                                    {isSelected && (
                                      <>
                                        <CheckCircle2 className="h-5 w-5 text-[#d45a2a]" />
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleProgramSelect(program);
                                          }}
                                          className="h-6 w-6 p-0 text-muted hover:text-red-600"
                                          title="Unselect program"
                                        >
                                          <X className="h-4 w-4" />
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Selected Program Actions */}
          <div className="page-card mb-6">
            <h2 className="page-section-title mb-4">Selected Program</h2>
            {selectedProgram || analyzing ? (
              <div className="space-y-4">
                {selectedProgram && (
                  <>
                    <div>
                      <h3 className="font-semibold text-primary-dark mb-2">{selectedProgram.name}</h3>
                      {selectedProgram.programUrl && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          <a
                            href={selectedProgram.programUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 text-sm text-[#d45a2a] hover:underline"
                          >
                            View Program Page
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                )}
                <div className="flex gap-3 flex-wrap">
                  <Button
                    onClick={handleAnalyzeProgram}
                    disabled={analyzing || !selectedProgram}
                    className="flex-1 sm:flex-none"
                    size="lg"
                  >
                    {analyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {(() => {
                          const messages = [
                            "Generating your career map...",
                            "This could take a minute...",
                            "or two..."
                          ];
                          return messages[loadingMessageIndex];
                        })()}
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4 mr-2" />
                        Generate your career map!
                      </>
                    )}
                  </Button>
                  {analyzing && (
                    <Button
                      onClick={handleCancelAnalysis}
                      variant="outline"
                      size="lg"
                      className="flex-1 sm:flex-none"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Cancel
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-muted text-center">
                  No program selected. Please select a program from the list above to analyze it.
                </p>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="page-card mb-6">
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 font-medium">Error: {error}</p>
              </div>
            </div>
          )}

          {/* Analysis Result */}
          {analysisResult && (
            <div className="page-card">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <h3 className="font-semibold text-primary-dark">Analysis Complete!</h3>
                </div>
                <div className="space-y-2 text-sm text-muted">
                  <p><strong>Program:</strong> {analysisResult.programName}</p>
                  <p><strong>Degree Type:</strong> {analysisResult.degreeType}</p>
                  <p><strong>Institution:</strong> {analysisResult.institution}</p>
                  {analysisResult.metadata?.totalCredits && (
                    <p><strong>Total Credits:</strong> {analysisResult.metadata.totalCredits}</p>
                  )}
                  <p><strong>Top-Level Groups:</strong> {analysisResult.requirements.groups.length}</p>
                  <p><strong>Total Course Options:</strong> {
                    (() => {
                      const countCoursesInGroup = (group: RequirementGroup): number => {
                        let count = group.courses?.length || 0;
                        if (group.groups) {
                          count += group.groups.reduce((sum, subGroup) => sum + countCoursesInGroup(subGroup), 0);
                        }
                        return count;
                      };
                      return analysisResult.requirements.groups.reduce(
                        (sum, group) => sum + countCoursesInGroup(group),
                        0
                      );
                    })()
                  }</p>
                </div>
                {hasAnalysis && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <Button
                      onClick={() => {
                        logger.action("Navigate to timeline", { hasAnalysis }, "ChoosePath");
                        navigate("/career-pathway");
                      }}
                      className="w-full sm:w-auto"
                      size="lg"
                    >
                      <Calendar className="h-4 w-4 mr-2" />
                      View Timeline
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
