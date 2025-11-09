import { useEffect } from "react";
import { logger } from "../lib/logger";
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
          </div>
        </div>
      </div>

    </div>
  );
}
