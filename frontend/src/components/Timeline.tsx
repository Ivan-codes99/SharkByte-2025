import { useState, useRef, useEffect } from "react";
import { Book, Award, Briefcase, Users, ChevronDown, ChevronUp } from "lucide-react";
import type { Milestone } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { groupMilestonesByTime } from "../lib/semester";
import { logger } from "../lib/logger";

interface TimelineProps {
  milestones: Milestone[];
}

// Component to detect if text is truncated
function TruncatedText({
  text,
  isExpanded,
  onToggle,
}: {
  text: string;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const textRef = useRef<HTMLParagraphElement>(null);
  const [isTruncated, setIsTruncated] = useState(false);

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current && !isExpanded) {
        // Check if text is actually truncated by comparing scrollHeight to clientHeight
        const isTextTruncated = textRef.current.scrollHeight > textRef.current.clientHeight;
        setIsTruncated(isTextTruncated);
      } else {
        setIsTruncated(false);
      }
    };

    // Check immediately
    checkTruncation();

    // Also check after a brief delay to account for layout
    const timeoutId = setTimeout(checkTruncation, 100);

    // Use ResizeObserver to check when container size changes
    const resizeObserver = new ResizeObserver(checkTruncation);
    if (textRef.current) {
      resizeObserver.observe(textRef.current);
    }

    return () => {
      clearTimeout(timeoutId);
      resizeObserver.disconnect();
    };
  }, [text, isExpanded]);

  return (
    <div className="mb-3 flex-1">
      <p
        ref={textRef}
        className={`text-sm text-gray-700 ${isExpanded ? "" : "line-clamp-2"}`}
      >
        {text}
      </p>
      {isTruncated && (
        <button
          onClick={onToggle}
          className="mt-2 text-xs text-primary hover:text-primary-700 font-semibold flex items-center gap-1 transition-colors"
          type="button"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Read less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Read more
            </>
          )}
        </button>
      )}
    </div>
  );
}

const iconMap = {
  COURSE: Book,
  CERT: Award,
  INTERNSHIP: Briefcase,
  EXTRACURRICULAR: Users,
};

// Check if a milestone is a level header
function isLevelHeader(milestone: Milestone): boolean {
  return milestone.id.startsWith("level-header-");
}

const statusConfig = {
  PLANNED: { label: "Planned", variant: "outline" as const },
  IN_PROGRESS: { label: "In Progress", variant: "warning" as const },
  DONE: { label: "Done", variant: "success" as const },
};

export function Timeline({ milestones }: TimelineProps) {
  // Track which milestone cards are expanded
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  // Group milestones by time period (semester or month)
  const timeGroups = groupMilestonesByTime(milestones);

  const toggleCard = (milestoneId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId);
        logger.debug("Milestone card collapsed", { milestoneId }, "Timeline");
      } else {
        newSet.add(milestoneId);
        logger.debug("Milestone card expanded", { milestoneId }, "Timeline");
      }
      return newSet;
    });
  };

  logger.debug("Timeline rendered", {
    totalMilestones: milestones.length,
    timeGroups: timeGroups.length,
  }, "Timeline");

  return (
    <div className="relative">
      {/* Vertical line - spans all time periods */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-12">
        {timeGroups.map((group, groupIndex) => {
          const isSemester = group.type === "semester";
          const isNestedMonth = group.parentSemester !== undefined;
          const indentClass = isNestedMonth ? "ml-16" : "";
          const prevGroup = groupIndex > 0 ? timeGroups[groupIndex - 1] : null;
          const isFirstNestedMonth = isNestedMonth && prevGroup?.type === "semester" && prevGroup.key === group.parentSemester;

          return (
            <div key={group.key} className={`relative ${indentClass}`}>
              {/* Connecting line from parent semester to nested month */}
              {isFirstNestedMonth && (
                <div className="absolute -left-10 top-0 h-6 w-0.5 bg-gray-300" />
              )}
              
              {/* Time Period Header */}
              <div className="relative flex items-center gap-4 mb-6">
                <div
                  className={`relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white shadow-lg ${
                    isSemester ? "bg-primary" : "bg-gray-600"
                  }`}
                >
                  {isSemester ? (
                    <span className="text-white font-bold text-lg">
                      {group.displayName.includes("Fall")
                        ? "F"
                        : group.displayName.includes("Spring")
                        ? "S"
                        : "U"}
                    </span>
                  ) : (
                    <span className="text-white font-bold text-xs">
                      {new Date(group.date).toLocaleDateString("en-US", {
                        month: "short",
                      })}
                    </span>
                  )}
                </div>
                <div>
                  <h3 className={`font-bold text-black tracking-tight ${isNestedMonth ? "text-xl" : "text-2xl"}`}>
                    {group.displayName}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {group.milestones.length} milestone{group.milestones.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              {/* Milestones in this time period - displayed horizontally */}
              <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8 ${isNestedMonth ? "ml-20" : "ml-20"}`}>
                {group.milestones.map((milestone: Milestone) => {
                  const Icon = iconMap[milestone.kind];
                  const statusInfo = statusConfig[milestone.status];
                  const isExpanded = expandedCards.has(milestone.id);
                  const hasDescription = milestone.description && milestone.description.trim().length > 0;

                  return (
                    <div
                      key={milestone.id}
                      className="relative rounded-xl border bg-white p-4 shadow-md hover:shadow-lg transition-shadow flex flex-col"
                    >
                      {/* Icon */}
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg border-2 flex-shrink-0 ${
                          isLevelHeader(milestone)
                            ? "bg-primary-500 border-primary-600"
                            : "bg-primary-100 border-primary-200"
                        }`}>
                          {isLevelHeader(milestone) ? (
                            <span className="text-white font-bold text-xs">
                              {milestone.title.split(" @ ")[0]}
                            </span>
                          ) : (
                            <Icon className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className={`font-semibold text-black ${
                            isLevelHeader(milestone) ? "text-lg" : "text-base"
                          }`}>
                            {milestone.title}
                          </h4>
                          {isLevelHeader(milestone) && (
                            <p className="text-xs text-gray-600 mt-1">
                              {milestone.title.split(" @ ")[1]}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {hasDescription && (
                        <TruncatedText
                          text={milestone.description!}
                          isExpanded={isExpanded}
                          onToggle={() => toggleCard(milestone.id)}
                        />
                      )}

                      {/* Badges */}
                      {!isLevelHeader(milestone) && (
                        <div className="flex items-center gap-2 flex-wrap mb-3">
                          <Badge variant="secondary" className="text-xs">
                            {milestone.kind.replace("_", " ")}
                          </Badge>
                          <Badge variant={statusInfo.variant} className="text-xs">
                            {statusInfo.label}
                          </Badge>
                        </div>
                      )}

                      {/* Mint NFT button (disabled in MVP) */}
                      {!isLevelHeader(milestone) && milestone.status === "DONE" && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled
                          className="w-full text-xs"
                        >
                          Mint NFT (Coming Soon)
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Connector line to next time period (except last) */}
              {groupIndex < timeGroups.length - 1 && (
                <div className="ml-6 h-8 w-0.5 bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
