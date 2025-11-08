import { useState, useEffect } from "react";
import { Timeline } from "../components/Timeline";
import { samplePathway } from "../data/pathway.sample";
import { logger } from "../lib/logger";

export function CareerPathway() {
  const [milestones] = useState(samplePathway);

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
            <p className="text-lg sm:text-xl text-gray-700 font-semibold">
              Plan your future, prove progress, fund your journey.
            </p>
          </div>
        </div>
      </div>

      {/* Timeline Section */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-black mb-8">
            Your Career Pathway
          </h2>
          <Timeline milestones={milestones} />
        </div>
      </div>
    </div>
  );
}

