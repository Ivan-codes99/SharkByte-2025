import { useEffect } from "react";
import { logger } from "../lib/logger";
import { ExternalLink } from "lucide-react";
import "../styles/pages.css";

export function ChoosePath() {
  useEffect(() => {
    logger.info("Choose Path page mounted", undefined, "ChoosePath");
  }, []);

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
          <div className="page-card">
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
              <li>Return here to view your personalized timeline</li>
            </ol>
            
            <div className="mt-8 p-4 bg-[#f6f3eb] rounded-lg border border-[#d45a2a]/20">
              <p className="text-sm text-muted mb-2">
                <strong className="text-primary-dark">Note:</strong> These PDFs contain important information about your program's course requirements and recommended sequence. Having them downloaded will help you track your progress and plan your educational journey.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
