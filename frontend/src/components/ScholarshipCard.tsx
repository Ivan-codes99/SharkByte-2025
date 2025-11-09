import { Calendar, DollarSign, ExternalLink, FileText } from "lucide-react";
import type { Scholarship } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { format } from "date-fns";
import { logger } from "../lib/logger";

interface ScholarshipCardProps {
  scholarship: Scholarship;
  onGenerateProposal?: (scholarship: Scholarship) => void;
}

export function ScholarshipCard({
  scholarship,
  onGenerateProposal,
}: ScholarshipCardProps) {
  const deadline = new Date(scholarship.deadlineISO);
  const isUpcoming = deadline > new Date();

  return (
    <div className="group rounded-2xl border bg-white p-6 shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
      <div className="flex items-start justify-between gap-4 mb-4">
        {scholarship.url ? (
          <a
            href={scholarship.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              logger.action("scholarship_card_title_link_clicked", {
                scholarshipId: scholarship.id,
                scholarshipTitle: scholarship.title,
                url: scholarship.url,
              }, "ScholarshipCard");
            }}
            className="text-lg font-semibold text-black flex-1 hover:text-primary transition-colors cursor-pointer"
          >
            {scholarship.title}
          </a>
        ) : (
          <h3 className="text-lg font-semibold text-black flex-1">
            {scholarship.title}
          </h3>
        )}
        <div className="flex items-center gap-1 text-primary font-bold">
          <DollarSign className="h-4 w-4" />
          <span className="text-xl">
            {scholarship.awardUSD.toLocaleString()}
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-700 mb-4 line-clamp-3">
        {scholarship.blurb}
      </p>

      <div className="flex flex-wrap gap-2 mb-4">
        {scholarship.programTags.map((tag) => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 pt-4 border-t">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Calendar className="h-4 w-4" />
          <span>
            {isUpcoming ? "Due: " : "Deadline: "}
            {format(deadline, "MMM d, yyyy")}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onGenerateProposal && (
            <Button
              variant="default"
              size="sm"
              onClick={() => {
                logger.action("scholarship_card_generate_proposal_clicked", {
                  scholarshipId: scholarship.id,
                  scholarshipTitle: scholarship.title,
                }, "ScholarshipCard");
                onGenerateProposal(scholarship);
              }}
              className="flex items-center gap-1"
            >
              <FileText className="h-3 w-3" />
              Generate Proposal
            </Button>
          )}
          {scholarship.url && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                logger.action("scholarship_card_link_clicked", {
                  scholarshipId: scholarship.id,
                  scholarshipTitle: scholarship.title,
                  url: scholarship.url,
                }, "ScholarshipCard");
                window.open(scholarship.url, "_blank", "noopener,noreferrer");
              }}
              className="flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              Apply
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

