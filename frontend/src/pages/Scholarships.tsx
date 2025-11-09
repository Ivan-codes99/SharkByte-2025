import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, Filter } from "lucide-react";
import type { Scholarship } from "../types";
import { ScholarshipCard } from "../components/ScholarshipCard";
import { ProposalModal } from "../components/ProposalModal";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { logger } from "../lib/logger";
import "../styles/pages.css";

// Hardcoded scholarship data
const hardcodedScholarships: Scholarship[] = [
  {
    id: "1",
    title: "Tech Innovation Scholarship",
    awardUSD: 10000,
    deadlineISO: "2025-03-15T23:59:59Z",
    programTags: ["Software Engineering", "Computer Science"],
    essayWords: 500,
    url: "https://example.com/tech-innovation",
    blurb: "Awarded to students pursuing careers in technology and innovation. Open to undergraduate and graduate students.",
  },
  {
    id: "2",
    title: "Data Science Excellence Award",
    awardUSD: 7500,
    deadlineISO: "2025-04-01T23:59:59Z",
    programTags: ["Data Science", "Machine Learning"],
    essayWords: 750,
    url: "https://example.com/data-science",
    blurb: "Supporting students in data science, machine learning, and analytics programs. Requires demonstrated project work.",
  },
  {
    id: "3",
    title: "Cybersecurity Leadership Grant",
    awardUSD: 12000,
    deadlineISO: "2025-02-28T23:59:59Z",
    programTags: ["Cybersecurity", "Information Security"],
    essayWords: 600,
    url: "https://example.com/cybersecurity",
    blurb: "For students committed to cybersecurity careers. Includes mentorship opportunities with industry leaders.",
  },
  {
    id: "4",
    title: "Women in Tech Scholarship",
    awardUSD: 8500,
    deadlineISO: "2025-05-10T23:59:59Z",
    programTags: ["Software Engineering", "Computer Science", "Data Science"],
    essayWords: 500,
    url: "https://example.com/women-in-tech",
    blurb: "Empowering women pursuing technology degrees. Open to all tech-related programs.",
  },
  {
    id: "5",
    title: "Cloud Computing Excellence",
    awardUSD: 6000,
    deadlineISO: "2025-03-30T23:59:59Z",
    programTags: ["Software Engineering", "Cloud Computing"],
    essayWords: 400,
    url: "https://example.com/cloud-computing",
    blurb: "Supporting students with cloud certifications (AWS, Azure, GCP) and cloud-focused projects.",
  },
  {
    id: "6",
    title: "AI & Machine Learning Grant",
    awardUSD: 15000,
    deadlineISO: "2025-04-15T23:59:59Z",
    programTags: ["Machine Learning", "Artificial Intelligence", "Data Science"],
    essayWords: 1000,
    url: "https://example.com/ai-ml",
    blurb: "High-value scholarship for students working on AI/ML research or projects. Requires portfolio submission.",
  },
  {
    id: "7",
    title: "First-Generation Tech Student Fund",
    awardUSD: 5000,
    deadlineISO: "2025-06-01T23:59:59Z",
    programTags: ["Software Engineering", "Computer Science", "Data Science", "Cybersecurity"],
    essayWords: 500,
    url: "https://example.com/first-gen",
    blurb: "Supporting first-generation college students in technology programs. Need-based consideration.",
  },
  {
    id: "8",
    title: "Full Stack Developer Scholarship",
    awardUSD: 8000,
    deadlineISO: "2025-05-20T23:59:59Z",
    programTags: ["Software Engineering", "Web Development"],
    essayWords: 600,
    url: "https://example.com/fullstack",
    blurb: "For students building full-stack applications. Showcase your projects and coding skills.",
  },
  {
    id: "9",
    title: "Blockchain & Web3 Innovation",
    awardUSD: 9000,
    deadlineISO: "2025-04-30T23:59:59Z",
    programTags: ["Software Engineering", "Blockchain"],
    essayWords: 700,
    url: "https://example.com/blockchain",
    blurb: "Supporting students exploring blockchain technology, smart contracts, and decentralized applications.",
  },
  {
    id: "10",
    title: "STEM Diversity Scholarship",
    awardUSD: 11000,
    deadlineISO: "2025-05-05T23:59:59Z",
    programTags: ["Software Engineering", "Computer Science", "Data Science", "Cybersecurity"],
    essayWords: 800,
    url: "https://example.com/stem-diversity",
    blurb: "Promoting diversity in STEM fields. Open to underrepresented groups in technology programs.",
  },
  {
    id: "11",
    title: "Mobile App Development Grant",
    awardUSD: 7000,
    deadlineISO: "2025-03-25T23:59:59Z",
    programTags: ["Software Engineering", "Mobile Development"],
    essayWords: 500,
    url: "https://example.com/mobile-dev",
    blurb: "For students developing iOS or Android applications. Portfolio of mobile apps required.",
  },
  {
    id: "12",
    title: "Open Source Contributor Award",
    awardUSD: 5500,
    deadlineISO: "2025-06-15T23:59:59Z",
    programTags: ["Software Engineering", "Computer Science"],
    essayWords: 400,
    url: "https://example.com/opensource",
    blurb: "Recognizing students who contribute to open source projects. GitHub activity considered.",
  },
];

export function Scholarships() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedScholarship, setSelectedScholarship] = useState<Scholarship | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    logger.info("Scholarships page mounted", { totalScholarships: hardcodedScholarships.length }, "Scholarships");
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
    hardcodedScholarships.forEach((s) => {
      s.programTags.forEach((tag) => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, []);

  // Filter scholarships
  const filteredScholarships = useMemo(() => {
    const startTime = performance.now();
    const result = hardcodedScholarships.filter((scholarship) => {
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
      total: hardcodedScholarships.length,
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
    <div className="page-container">
      <div className="page-content">
        <div className="mb-8">
          <h1 className="page-title">
            Scholarships & Proposal Generator
          </h1>
          <p className="page-subtitle">
            Find scholarships and generate AI-powered proposals
          </p>
        </div>

        {/* Filter Bar */}
        <div className="page-filter-card">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-muted" />
            <h2 className="text-lg font-semibold text-primary-dark">Filters</h2>
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
          <p className="text-sm text-muted">
            Showing {filteredScholarships.length} of {hardcodedScholarships.length} scholarships
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
            <p className="text-muted mb-4">No scholarships match your filters.</p>
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

