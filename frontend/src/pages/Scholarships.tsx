import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter } from "lucide-react";
import { sampleScholarships } from "../data/scholarships.sample";
import type { Scholarship } from "../types";
import { ScholarshipCard } from "../components/ScholarshipCard";
import { ProposalModal } from "../components/ProposalModal";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { logger } from "../lib/logger";

export function Scholarships() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    logger.info("Scholarships page mounted", { totalScholarships: sampleScholarships.length }, "Scholarships");
  }, []);

  // Filter state from URL params
  const programFilterParam = searchParams.get("program") || "";
  const programFilter = programFilterParam === "__all__" ? "" : programFilterParam;
  const minAward = searchParams.get("minAward") || "";
  const maxAward = searchParams.get("maxAward") || "";
  const searchQuery = searchParams.get("search") || "";

  // Get unique program tags
  const allProgramTags = useMemo(() => {
    const tags = new Set<string>();
    sampleScholarships.forEach((s) => {
      s.programTags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, []);

  // Filter scholarships
  const filteredScholarships = useMemo(() => {
    const startTime = performance.now();
    const result = sampleScholarships.filter((scholarship) => {
      // Program filter
      if (programFilter && !scholarship.programTags.includes(programFilter)) {
        return false;
      }

      // Award range filter
      if (minAward && scholarship.awardUSD < parseInt(minAward)) {
        return false;
      }
      if (maxAward && scholarship.awardUSD > parseInt(maxAward)) {
        return false;
      }

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesTitle = scholarship.title.toLowerCase().includes(query);
        const matchesBlurb = scholarship.blurb.toLowerCase().includes(query);
        const matchesTags = scholarship.programTags.some((tag) =>
          tag.toLowerCase().includes(query)
        );
        if (!matchesTitle && !matchesBlurb && !matchesTags) {
          return false;
        }
      }

      return true;
    });
    const duration = performance.now() - startTime;
    logger.performance("scholarship_filter", duration, {
      total: sampleScholarships.length,
      filtered: result.length,
      filters: { programFilter, minAward, maxAward, searchQuery },
    });
    return result;
  }, [programFilter, minAward, maxAward, searchQuery]);

  const handleFilterChange = (key: string, value: string) => {
    logger.action("filter_changed", { key, value }, "Scholarships");
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams);
  };

  const handleGenerateProposal = (scholarship: Scholarship) => {
    logger.action("generate_proposal_clicked", { scholarshipId: scholarship.id, scholarshipTitle: scholarship.title }, "Scholarships");
    setSelectedScholarship(scholarship);
    setIsModalOpen(true);
  };

  const clearFilters = () => {
    logger.action("filters_cleared", undefined, "Scholarships");
    setSearchParams({});
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-black mb-2">
            Scholarships & Proposal Generator
          </h1>
          <p className="text-gray-700">
            Find scholarships and generate AI-powered proposals
          </p>
        </div>

        {/* Filter Bar */}
        <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 mb-8 border">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-black">Filters</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="sm:col-span-2 lg:col-span-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search scholarships..."
                  value={searchQuery}
                  onChange={(e) => handleFilterChange("search", e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Program Select */}
            <div>
              <Select
                value={programFilter || "__all__"}
                onValueChange={(value) => handleFilterChange("program", value === "__all__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Programs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All Programs</SelectItem>
                  {allProgramTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Min Award */}
            <div>
              <Input
                type="number"
                placeholder="Min Award ($)"
                value={minAward}
                onChange={(e) => handleFilterChange("minAward", e.target.value)}
              />
            </div>

            {/* Max Award */}
            <div>
              <Input
                type="number"
                placeholder="Max Award ($)"
                value={maxAward}
                onChange={(e) => handleFilterChange("maxAward", e.target.value)}
              />
            </div>
          </div>

          {(programFilterParam !== "__all__" && programFilterParam) || minAward || maxAward || searchQuery ? (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            </div>
          ) : null}
        </div>

        {/* Results Count */}
        <div className="mb-6">
          <p className="text-sm text-gray-600">
            Showing {filteredScholarships.length} of {sampleScholarships.length} scholarships
          </p>
        </div>

        {/* Scholarships Grid */}
        {filteredScholarships.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredScholarships.map((scholarship) => (
              <ScholarshipCard
                key={scholarship.id}
                scholarship={scholarship}
                onGenerateProposal={handleGenerateProposal}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No scholarships match your filters.</p>
            <Button variant="outline" onClick={clearFilters}>
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* Proposal Modal */}
      <ProposalModal
        scholarship={selectedScholarship}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </div>
  );
}

