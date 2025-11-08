import { Book, Award, Briefcase } from "lucide-react";
import type { Milestone } from "../types";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

interface TimelineProps {
  milestones: Milestone[];
}

const iconMap = {
  COURSE: Book,
  CERT: Award,
  INTERNSHIP: Briefcase,
};

const statusConfig = {
  PLANNED: { label: "Planned", variant: "outline" as const },
  IN_PROGRESS: { label: "In Progress", variant: "warning" as const },
  DONE: { label: "Done", variant: "success" as const },
};

export function Timeline({ milestones }: TimelineProps) {
  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gray-200" />

      <div className="space-y-8">
        {milestones.map((milestone) => {
          const Icon = iconMap[milestone.kind];
          const statusInfo = statusConfig[milestone.status];

          return (
            <div key={milestone.id} className="relative flex items-start gap-4">
              {/* Icon circle */}
              <div className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full bg-primary-100 border-2 border-white shadow-md">
                <Icon className="h-6 w-6 text-primary" />
              </div>

              {/* Content */}
              <div className="flex-1 pb-8">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-black">
                      {milestone.title}
                    </h3>
                    <p className="text-sm text-gray-700 mt-1">
                      {milestone.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {milestone.kind.replace("_", " ")}
                    </Badge>
                    <Badge variant={statusInfo.variant} className="text-xs">
                      {statusInfo.label}
                    </Badge>
                  </div>
                </div>

                {milestone.targetDate && (
                  <p className="text-xs text-gray-600 mt-2">
                    Target: {new Date(milestone.targetDate).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                )}

                {/* Mint NFT button (disabled in MVP) */}
                {milestone.status === "DONE" && (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled
                    className="mt-3 text-xs"
                  >
                    Mint NFT (Coming Soon)
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

