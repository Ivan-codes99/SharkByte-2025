import { useState, useEffect } from "react";
import { Timeline } from "../components/Timeline";
import { generatePathway, getCareers } from "../lib/api";
import { pathwayToMilestones } from "../lib/pathway-converter";
import type { GeneratedPathway } from "../types/pathway";
import type { Milestone } from "../types";
import { logger } from "../lib/logger";
import { Combobox } from "../components/ui/combobox";
import { Loader2, GraduationCap } from "lucide-react";
import { Badge } from "../components/ui/badge";
import { getInstitutionName } from "../lib/pathway-converter";

export function CareerPathway() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [pathway, setPathway] = useState<GeneratedPathway | null>(null);
  const [careers, setCareers] = useState<string[]>([]);
  const [selectedCareer, setSelectedCareer] = useState<string>("");
  const [selectedAlternative, setSelectedAlternative] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load available careers on mount
  useEffect(() => {
    getCareers()
      .then((careerList) => {
        setCareers(careerList);
        if (careerList.length > 0) {
          setSelectedCareer(careerList[0]);
        }
      })
      .catch((err) => {
        logger.error("Failed to load careers", err);
        setError("Failed to load available careers");
      });
  }, []);

  // Generate pathway when career is selected
  useEffect(() => {
    if (!selectedCareer) return;

    setLoading(true);
    setError(null);

    generatePathway({
      career: selectedCareer,
      includeGraduate: true,
      includeCertifications: true,
    })
      .then((generatedPathway) => {
        setPathway(generatedPathway);
        const convertedMilestones = pathwayToMilestones(generatedPathway, selectedAlternative);
        setMilestones(convertedMilestones);
        logger.info("Pathway generated", {
          career: selectedCareer,
          milestoneCount: convertedMilestones.length,
          levels: generatedPathway.primaryPathway.length,
        });
      })
      .catch((err) => {
        logger.error("Failed to generate pathway", err);
        setError(err instanceof Error ? err.message : "Failed to generate pathway");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedCareer, selectedAlternative]);

  useEffect(() => {
    logger.info("Career Pathway page mounted", { milestoneCount: milestones.length }, "CareerPathway");
  }, [milestones.length]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 to-primary-100 border-b">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <div className="max-w-3xl">
            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-black mb-4">
              PathFundAI
            </h1>
            <p className="text-lg sm:text-xl text-gray-700 font-semibold mb-6">
              Plan your future, prove progress, fund your journey.
            </p>

            {/* Career Selection */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
              <div className="flex-1 min-w-0">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Career
                </label>
                <Combobox
                  options={careers.map((career) => ({
                    value: career,
                    label: career,
                  }))}
                  value={selectedCareer}
                  onValueChange={(value) => {
                    setSelectedCareer(value);
                    setSelectedAlternative(undefined);
                  }}
                  placeholder="Search and select a career..."
                  searchPlaceholder="Search careers..."
                  emptyMessage="No careers found."
                  disabled={loading || careers.length === 0}
                />
              </div>

              {pathway && pathway.primaryPathway.length > 1 && (
                <div className="flex-1 min-w-0">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Transfer Institution
                  </label>
                  <Combobox
                    options={[
                      {
                        value: "primary",
                        label: `${getInstitutionName(pathway.primaryPathway[1]?.institution || "MDC")} (Primary)`,
                      },
                      ...pathway.alternativePathways.map((alt, index) => {
                        const transferInst = alt.levels.find((l) => l.level === "BS")?.institution || "Transfer";
                        return {
                          value: `alt-${index}`,
                          label: getInstitutionName(transferInst),
                        };
                      }),
                    ]}
                    value={selectedAlternative === undefined ? "primary" : `alt-${selectedAlternative}`}
                    onValueChange={(value) => {
                      if (value === "primary") {
                        setSelectedAlternative(undefined);
                      } else {
                        setSelectedAlternative(parseInt(value.replace("alt-", "")));
                      }
                    }}
                    placeholder="Select transfer institution..."
                    searchPlaceholder="Search institutions..."
                    emptyMessage="No institutions found."
                    disabled={loading}
                  />
                </div>
              )}
            </div>

            {/* Pathway Info */}
            {pathway && (
              <div className="mt-6 flex flex-wrap gap-2 items-center">
                <Badge variant="secondary" className="text-sm">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {pathway.totalDuration || "N/A"}
                </Badge>
                {pathway.metadata.aiEnhanced && (
                  <Badge variant="outline" className="text-sm">
                    AI Enhanced
                  </Badge>
                )}
                {pathway.metadata.cached && (
                  <Badge variant="outline" className="text-sm">
                    Cached
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-800 font-medium">Error: {error}</p>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
              <p className="text-gray-600">Generating your pathway...</p>
            </div>
          ) : milestones.length > 0 ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mb-8">
                Your Career Pathway
              </h2>
              <Timeline milestones={milestones} />
            </>
          ) : (
            <div className="text-center py-12">
              <p className="text-gray-600">Select a career to generate your pathway</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

