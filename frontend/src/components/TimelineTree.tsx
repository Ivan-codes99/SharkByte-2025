import { useState, useRef, useEffect } from "react";
import { 
  Book, Award, Briefcase, Users, ChevronDown, ChevronUp, 
  CheckCircle2, Circle, Clock, GraduationCap, ChevronRight
} from "lucide-react";
import type { Milestone, MilestoneStatus, MilestoneCategory } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { groupMilestonesByTime } from "../lib/semester";
import { logger } from "../lib/logger";
import { cn } from "../lib/utils";

interface TimelineTreeProps {
  milestones: Milestone[];
  onMilestoneStatusChange?: (milestoneId: string, status: MilestoneStatus) => void;
  onElectiveSelectionChange?: (milestoneId: string, selected: boolean) => void;
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
        const isTextTruncated = textRef.current.scrollHeight > textRef.current.clientHeight;
        setIsTruncated(isTextTruncated);
      } else {
        setIsTruncated(false);
      }
    };

    checkTruncation();
    const timeoutId = setTimeout(checkTruncation, 100);
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

// Check if a milestone is a level header (degree)
function isLevelHeader(milestone: Milestone): boolean {
  return milestone.id.startsWith("level-header-") || milestone.category === "DEGREE";
}

// Get status icon
function getStatusIcon(status: MilestoneStatus, size: "sm" | "md" = "md") {
  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";
  switch (status) {
    case "DONE":
      return <CheckCircle2 className={cn(iconSize, "text-green-600")} />;
    case "IN_PROGRESS":
      return <Clock className={cn(iconSize, "text-yellow-600")} />;
    default:
      return <Circle className={cn(iconSize, "text-gray-400")} />;
  }
}

// Get category badge variant
function getCategoryBadge(category?: MilestoneCategory) {
  if (!category) return null;
  
  const config = {
    CORE: { label: "Core", variant: "default" as const, className: "bg-primary text-white" },
    ELECTIVE: { label: "Elective", variant: "outline" as const, className: "border-blue-300 text-blue-700" },
    DEGREE: { label: "Degree", variant: "default" as const, className: "bg-primary-600 text-white font-bold" },
  };
  
  const configItem = config[category];
  return (
    <Badge variant={configItem.variant} className={cn("text-xs", configItem.className)}>
      {configItem.label}
    </Badge>
  );
}

const statusConfig = {
  PLANNED: { label: "Planned", variant: "outline" as const },
  IN_PROGRESS: { label: "In Progress", variant: "warning" as const },
  DONE: { label: "Done", variant: "success" as const },
};

// Milestone Card Component
function MilestoneCard({
  milestone,
  isExpanded,
  onToggleExpand,
  onStatusChange,
  onElectiveToggle,
  isElectiveGroup = false,
  selectedCount = 0,
  requiredCount = 0,
}: {
  milestone: Milestone;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onStatusChange?: (status: MilestoneStatus) => void;
  onElectiveToggle?: (selected: boolean) => void;
  isElectiveGroup?: boolean;
  selectedCount?: number;
  requiredCount?: number;
}) {
  const Icon = iconMap[milestone.kind];
  const statusInfo = statusConfig[milestone.status];
  const hasDescription = milestone.description && milestone.description.trim().length > 0;
  const isDegree = milestone.category === "DEGREE" || isLevelHeader(milestone);
  const isElective = milestone.isElective || milestone.category === "ELECTIVE";

  // Status change handler
  const handleStatusClick = () => {
    if (!onStatusChange) return;
    
    const nextStatus: MilestoneStatus = 
      milestone.status === "PLANNED" ? "IN_PROGRESS" :
      milestone.status === "IN_PROGRESS" ? "DONE" :
      "PLANNED";
    
    onStatusChange(nextStatus);
  };

  return (
    <div
      className={cn(
        "relative rounded-xl border bg-white p-4 shadow-md hover:shadow-lg transition-all flex flex-col",
        isDegree && "border-2 border-primary-500 shadow-lg bg-gradient-to-br from-primary-50 to-white",
        isElective && "border-blue-300 bg-blue-50/30",
        milestone.status === "DONE" && "opacity-90 bg-green-50/30"
      )}
    >
      {/* Header with Icon and Title */}
      <div className="flex items-start gap-3 mb-3">
        <div className={cn(
          "flex items-center justify-center rounded-lg border-2 flex-shrink-0",
          isDegree 
            ? "h-12 w-12 bg-primary-500 border-primary-600" 
            : "h-10 w-10 bg-primary-100 border-primary-200"
        )}>
          {isDegree ? (
            <GraduationCap className="h-6 w-6 text-white" />
          ) : (
            <Icon className="h-5 w-5 text-primary" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className={cn(
              "font-semibold text-black",
              isDegree ? "text-lg" : "text-base"
            )}>
              {milestone.title}
            </h4>
            {milestone.credits !== undefined && milestone.credits > 0 && (
              <Badge variant="outline" className="text-xs font-medium">
                {milestone.credits} credit{milestone.credits !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>
          {isLevelHeader(milestone) && (
            <p className="text-xs text-gray-600 mt-1">
              {milestone.title.split(" @ ")[1]}
            </p>
          )}
        </div>
        
        {/* Status Toggle Button */}
        {!isElectiveGroup && !isDegree && (
          <button
            onClick={handleStatusClick}
            className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
            title={`Mark as ${milestone.status === "PLANNED" ? "In Progress" : milestone.status === "IN_PROGRESS" ? "Done" : "Planned"}`}
          >
            {getStatusIcon(milestone.status, "sm")}
          </button>
        )}
      </div>

      {/* Description */}
      {hasDescription && (
        <TruncatedText
          text={milestone.description!}
          isExpanded={isExpanded}
          onToggle={onToggleExpand}
        />
      )}

      {/* Elective Group Info */}
      {isElectiveGroup && (
        <div className="mb-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs font-medium text-blue-800">
            Choose {requiredCount} of {milestone.totalOptions || milestone.children?.length || 0} courses
          </p>
          {selectedCount > 0 && (
            <p className="text-xs text-blue-600 mt-1">
              {selectedCount} selected
            </p>
          )}
        </div>
      )}

      {/* Badges */}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {getCategoryBadge(milestone.category)}
        {!isDegree && (
          <>
            <Badge variant="secondary" className="text-xs">
              {milestone.kind.replace("_", " ")}
            </Badge>
            <Badge variant={statusInfo.variant} className="text-xs">
              {statusInfo.label}
            </Badge>
          </>
        )}
      </div>

      {/* Elective Checkbox */}
      {isElective && !isElectiveGroup && (
        <div className="flex items-center gap-2 mb-3">
          <Checkbox
            checked={milestone.selected || false}
            onCheckedChange={(checked) => onElectiveToggle?.(checked === true)}
          />
          <label className="text-sm text-gray-700 cursor-pointer">
            Select this course
          </label>
        </div>
      )}

      {/* Mint NFT button (disabled in MVP) */}
      {!isDegree && milestone.status === "DONE" && (
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
}

export function TimelineTree({ 
  milestones, 
  onMilestoneStatusChange,
  onElectiveSelectionChange 
}: TimelineTreeProps) {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [milestoneStates, setMilestoneStates] = useState<Map<string, Milestone>>(
    new Map(milestones.map(m => [m.id, m]))
  );

  // Update milestone states when milestones prop changes
  useEffect(() => {
    setMilestoneStates(new Map(milestones.map(m => [m.id, m])));
  }, [milestones]);

  // Group milestones by time period (semester or month)
  const timeGroups = groupMilestonesByTime(milestones);

  // Calculate cumulative credits up to a specific group index
  // For semesters, includes all nested months that belong to that semester
  const calculateCumulativeCredits = (upToIndex: number): number => {
    let cumulative = 0;
    const currentGroup = timeGroups[upToIndex];
    
    if (!currentGroup) return 0;
    
    // If this is a semester, we need to include all its nested months
    if (currentGroup.type === "semester") {
      // Find the last nested month that belongs to this semester
      let lastNestedMonthIndex = upToIndex;
      for (let i = upToIndex + 1; i < timeGroups.length; i++) {
        const nextGroup = timeGroups[i];
        if (nextGroup?.parentSemester === currentGroup.key) {
          lastNestedMonthIndex = i;
        } else {
          break; // No more nested months for this semester
        }
      }
      
      // Count all groups up to and including the last nested month
      for (let i = 0; i <= lastNestedMonthIndex; i++) {
        const group = timeGroups[i];
        if (!group) continue;
        
        // Only count credits that count toward required credits
        const groupCredits = group.milestones.reduce((sum, m) => {
          if (m.kind === "COURSE" && m.credits && (m.countsTowardRequired !== false)) {
            return sum + m.credits;
          }
          return sum;
        }, 0);
        cumulative += groupCredits;
      }
    } else {
      // For nested months or standalone months, count all previous groups plus current
      for (let i = 0; i <= upToIndex; i++) {
        const group = timeGroups[i];
        if (!group) continue;
        
        // Only count credits that count toward required credits
        const groupCredits = group.milestones.reduce((sum, m) => {
          if (m.kind === "COURSE" && m.credits && (m.countsTowardRequired !== false)) {
            return sum + m.credits;
          }
          return sum;
        }, 0);
        cumulative += groupCredits;
      }
    }
    
    return cumulative;
  };

  const toggleCard = (milestoneId: string) => {
    setExpandedCards((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId);
      } else {
        newSet.add(milestoneId);
      }
      return newSet;
    });
  };

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(groupId)) {
        newSet.delete(groupId);
      } else {
        newSet.add(groupId);
      }
      return newSet;
    });
  };

  const handleStatusChange = (milestoneId: string, status: MilestoneStatus) => {
    setMilestoneStates((prev) => {
      const newMap = new Map(prev);
      const milestone = newMap.get(milestoneId);
      if (milestone) {
        newMap.set(milestoneId, { ...milestone, status });
      }
      return newMap;
    });
    onMilestoneStatusChange?.(milestoneId, status);
    logger.action("Milestone status changed", { milestoneId, status }, "TimelineTree");
  };

  const handleElectiveToggle = (milestoneId: string, selected: boolean) => {
    setMilestoneStates((prev) => {
      const newMap = new Map(prev);
      const milestone = newMap.get(milestoneId);
      if (milestone) {
        newMap.set(milestoneId, { ...milestone, selected });
      }
      return newMap;
    });
    onElectiveSelectionChange?.(milestoneId, selected);
    logger.action("Elective selection changed", { milestoneId, selected }, "TimelineTree");
  };

  // Group milestones by elective groups
  const organizeMilestones = (milestones: Milestone[]): (Milestone | { type: "elective-group"; groupId: string; milestones: Milestone[] })[] => {
    const result: (Milestone | { type: "elective-group"; groupId: string; milestones: Milestone[] })[] = [];
    const electiveGroups = new Map<string, Milestone[]>();
    const regularMilestones: Milestone[] = [];

    milestones.forEach((milestone) => {
      if (milestone.electiveGroupId) {
        if (!electiveGroups.has(milestone.electiveGroupId)) {
          electiveGroups.set(milestone.electiveGroupId, []);
        }
        electiveGroups.get(milestone.electiveGroupId)!.push(milestone);
      } else {
        regularMilestones.push(milestone);
      }
    });

    // Add regular milestones first
    result.push(...regularMilestones);

    // Add elective groups
    electiveGroups.forEach((groupMilestones, groupId) => {
      result.push({
        type: "elective-group",
        groupId,
        milestones: groupMilestones,
      });
    });

    return result;
  };

  logger.debug("TimelineTree rendered", {
    totalMilestones: milestones.length,
    timeGroups: timeGroups.length,
  }, "TimelineTree");

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

          // Organize milestones in this group
          const organizedMilestones = organizeMilestones(group.milestones);

          return (
            <div key={group.key} className={`relative ${indentClass}`}>
              {/* Connecting line from parent semester to nested month */}
              {isFirstNestedMonth && (
                <div className="absolute -left-10 top-0 h-6 w-0.5 bg-gray-300" />
              )}
              
              {/* Time Period Header */}
              <div className="relative flex items-center gap-4 mb-6">
                <div
                  className={cn(
                    "relative z-10 flex h-16 w-16 items-center justify-center rounded-full border-4 border-white shadow-lg",
                    isSemester ? "bg-primary" : "bg-gray-600"
                  )}
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
                  <h3 className={cn(
                    "font-bold text-black tracking-tight",
                    isNestedMonth ? "text-xl" : "text-2xl"
                  )}>
                    {group.displayName}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <p className="text-sm text-gray-600">
                      {group.milestones.length} milestone{group.milestones.length !== 1 ? "s" : ""}
                    </p>
                    {(() => {
                      if (isSemester) {
                        // For semesters, calculate credits including nested months
                        // Only count credits that count toward required credits
                        let semesterCredits = group.milestones.reduce((sum, m) => {
                          if (m.kind === "COURSE" && m.credits && (m.countsTowardRequired !== false)) {
                            return sum + m.credits;
                          }
                          return sum;
                        }, 0);
                        
                        // Add credits from nested months
                        for (let i = groupIndex + 1; i < timeGroups.length; i++) {
                          const nextGroup = timeGroups[i];
                          if (nextGroup?.parentSemester === group.key) {
                            const nestedCredits = nextGroup.milestones.reduce((sum, m) => {
                              if (m.kind === "COURSE" && m.credits && (m.countsTowardRequired !== false)) {
                                return sum + m.credits;
                              }
                              return sum;
                            }, 0);
                            semesterCredits += nestedCredits;
                          } else {
                            break; // No more nested months for this semester
                          }
                        }
                        
                        if (semesterCredits > 0) {
                          // Calculate cumulative credits up to this semester (including nested months)
                          const cumulativeCredits = calculateCumulativeCredits(groupIndex);
                          
                          return (
                            <>
                              <p className="text-sm font-semibold text-primary">
                                {semesterCredits} credit{semesterCredits !== 1 ? "s" : ""} this semester
                              </p>
                              <p className="text-sm font-semibold text-gray-700">
                                {cumulativeCredits} total credit{cumulativeCredits !== 1 ? "s" : ""} completed
                              </p>
                            </>
                          );
                        }
                      } else {
                        // For non-semester groups (months), just show current credits
                        const totalCredits = group.milestones.reduce((sum, m) => {
                          if (m.kind === "COURSE" && m.credits) {
                            return sum + m.credits;
                          }
                          return sum;
                        }, 0);
                        
                        if (totalCredits > 0) {
                          return (
                            <p className="text-sm font-semibold text-primary">
                              {totalCredits} credit{totalCredits !== 1 ? "s" : ""}
                            </p>
                          );
                        }
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              {/* Milestones in this time period - tree structure */}
              <div className={cn("mb-8", isNestedMonth ? "ml-20" : "ml-20")}>
                <div className="space-y-4">
                  {organizedMilestones.map((item) => {
                    if ('type' in item && item.type === "elective-group") {
                      // Render elective group as a special expandable section
                      const groupId = item.groupId;
                      const isExpanded = expandedGroups.has(groupId);
                      const selectedCount = item.milestones.filter(m => {
                        const state = milestoneStates.get(m.id);
                        return (state || m).selected;
                      }).length;
                      const firstMilestone = item.milestones[0];
                      const requiredCount = firstMilestone.requiredCount || 1;

                      // Extract a cleaner group name from the electiveGroupId
                      const groupName = firstMilestone.electiveGroupId 
                        ? firstMilestone.electiveGroupId.replace(/^elective-/, "").split(" > ").pop() || "Electives"
                        : "Electives";
                      
                      // Calculate total credits for this elective group
                      const groupTotalCredits = item.milestones.reduce((sum, m) => sum + (m.credits || 0), 0);

                      return (
                        <div key={groupId} className="border-l-4 border-blue-400 bg-blue-50 rounded-lg p-4 shadow-sm">
                          <button
                            onClick={() => toggleGroup(groupId)}
                            className="w-full flex items-center gap-2 mb-3"
                          >
                            <ChevronRight className={cn(
                              "h-5 w-5 text-blue-600 transition-transform flex-shrink-0",
                              isExpanded && "rotate-90"
                            )} />
                            <div className="flex-1 text-left">
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-blue-900 text-lg">
                                  {groupName}
                                </p>
                                <Badge variant="outline" className="text-xs bg-blue-100 border-blue-300 text-blue-800">
                                  Elective Group
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-sm text-blue-700">
                                  Choose {requiredCount} of {item.milestones.length} courses
                                  {selectedCount > 0 && ` • ${selectedCount} selected`}
                                </p>
                                {groupTotalCredits > 0 && (
                                  <p className="text-sm font-medium text-blue-800">
                                    {groupTotalCredits} total credits
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                          
                          {isExpanded && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                              {item.milestones.map((milestone) => {
                                const currentMilestone = milestoneStates.get(milestone.id) || milestone;
                                return (
                                  <MilestoneCard
                                    key={milestone.id}
                                    milestone={currentMilestone}
                                    isExpanded={expandedCards.has(milestone.id)}
                                    onToggleExpand={() => toggleCard(milestone.id)}
                                    onStatusChange={(status) => handleStatusChange(milestone.id, status)}
                                    onElectiveToggle={(selected) => handleElectiveToggle(milestone.id, selected)}
                                    isElectiveGroup={false}
                                    selectedCount={selectedCount}
                                    requiredCount={requiredCount}
                                  />
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    } else {
                      // Render regular milestone
                      const milestone = item as Milestone;
                      const currentMilestone = milestoneStates.get(milestone.id) || milestone;
                      
                      return (
                        <MilestoneCard
                          key={milestone.id}
                          milestone={currentMilestone}
                          isExpanded={expandedCards.has(milestone.id)}
                          onToggleExpand={() => toggleCard(milestone.id)}
                          onStatusChange={(status) => handleStatusChange(milestone.id, status)}
                          onElectiveToggle={(selected) => handleElectiveToggle(milestone.id, selected)}
                          isElectiveGroup={false}
                        />
                      );
                    }
                  })}
                </div>
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

