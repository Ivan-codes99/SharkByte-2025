import { useState, useEffect } from "react";
import { TimelineTree } from "../components/TimelineTree";
import type { Milestone } from "../types";
import { logger } from "../lib/logger";
import { getProgramAnalysis } from "../lib/storage";
import { programAnalysisToMilestones } from "../lib/program-analysis-to-milestones";
import "../styles/pages.css";

export function CareerPathway() {
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [programName, setProgramName] = useState<string>("Your Program");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const analysis = getProgramAnalysis();
    
    if (analysis) {
      logger.info("Loading program analysis for timeline", {
        programName: analysis.programName,
        degreeType: analysis.degreeType,
        institution: analysis.institution,
      }, "CareerPathway");

      setProgramName(`${analysis.programName} @ ${analysis.institution}`);
      
      // Convert program analysis to milestones
      const convertedMilestones = programAnalysisToMilestones(analysis);
      setMilestones(convertedMilestones);
    } else {
      logger.warn("No program analysis found in localStorage", undefined, "CareerPathway");
      setProgramName("Your Program");
      setMilestones([]);
    }
    
    setIsLoading(false);
  }, []);

  return (
    <div className="page-container">
      {/* Hero Section */}
      <div className="page-hero">
        <div className="page-hero-inner">
          <div className="max-w-3xl">
            <h1 className="page-title">
              Your Timeline
            </h1>
            <p className="page-subtitle">
              {programName}
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="page-content">
        <div className="max-w-4xl mx-auto">
          <h2 className="page-section-title">
            Your Timeline
          </h2>
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-600">Loading your timeline...</p>
            </div>
          ) : milestones.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 mb-4">
                No program analysis found. Please select a program to generate your timeline.
              </p>
            </div>
          ) : (
            <TimelineTree 
              milestones={milestones}
              onMilestoneStatusChange={(milestoneId, status) => {
                logger.action("Milestone status updated", { milestoneId, status }, "CareerPathway");
                // Update local state
                setMilestones(prev => 
                  prev.map(m => m.id === milestoneId ? { ...m, status } : m)
                );
              }}
              onElectiveSelectionChange={(milestoneId, selected) => {
                logger.action("Elective selection updated", { milestoneId, selected }, "CareerPathway");
                // Update local state
                setMilestones(prev => 
                  prev.map(m => m.id === milestoneId ? { ...m, selected } : m)
                );
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
