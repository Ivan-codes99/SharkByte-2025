import { useState } from "react";
import { TimelineTree } from "../components/TimelineTree";
import type { Milestone } from "../types";
import { logger } from "../lib/logger";
import { semesterToDate } from "../lib/semester";
import "../styles/pages.css";

// Hardcoded milestones for Software Engineer at Florida International University
const hardcodedMilestones: Milestone[] = [
  // Fall 2024 - MDC (Associate Degree)
  {
    id: "1",
    title: "Programming I (COP2271)",
    kind: "COURSE",
    semester: "FALL",
    year: 2024,
    targetDate: semesterToDate("FALL", 2024),
    status: "DONE",
    description: "Introduction to programming fundamentals",
    category: "CORE",
  },
  {
    id: "2",
    title: "Calculus I (MAC2311)",
    kind: "COURSE",
    semester: "FALL",
    year: 2024,
    targetDate: semesterToDate("FALL", 2024),
    status: "DONE",
    description: "Differential and integral calculus",
    category: "CORE",
  },
  {
    id: "3",
    title: "General Physics I (PHY2048)",
    kind: "COURSE",
    semester: "FALL",
    year: 2024,
    targetDate: semesterToDate("FALL", 2024),
    status: "DONE",
    description: "Mechanics and thermodynamics",
    category: "CORE",
  },
  
  // Spring 2025 - MDC
  {
    id: "4",
    title: "Object-Oriented Programming (COP2274)",
    kind: "COURSE",
    semester: "SPRING",
    year: 2025,
    targetDate: semesterToDate("SPRING", 2025),
    status: "DONE",
    description: "Java programming and OOP principles",
    category: "CORE",
  },
  {
    id: "5",
    title: "Data Structures (COP3530)",
    kind: "COURSE",
    semester: "SPRING",
    year: 2025,
    targetDate: semesterToDate("SPRING", 2025),
    status: "DONE",
    description: "Arrays, linked lists, stacks, queues, trees",
    category: "CORE",
  },
  {
    id: "6",
    title: "Calculus II (MAC2312)",
    kind: "COURSE",
    semester: "SPRING",
    year: 2025,
    targetDate: semesterToDate("SPRING", 2025),
    status: "DONE",
    description: "Advanced integration techniques",
    category: "CORE",
  },
  
  // Fall 2025 - Transfer to FIU
  {
    id: "7",
    title: "Programming I (COP2210) - FIU",
    kind: "COURSE",
    semester: "FALL",
    year: 2025,
    targetDate: semesterToDate("FALL", 2025),
    status: "DONE",
    description: "Transferred from MDC COP2271",
    category: "CORE",
  },
  {
    id: "8",
    title: "Object-Oriented Programming (COP3337) - FIU",
    kind: "COURSE",
    semester: "FALL",
    year: 2025,
    targetDate: semesterToDate("FALL", 2025),
    status: "DONE",
    description: "Transferred from MDC COP2274",
    category: "CORE",
  },
  {
    id: "9",
    title: "Data Structures (COP3530) - FIU",
    kind: "COURSE",
    semester: "FALL",
    year: 2025,
    targetDate: semesterToDate("FALL", 2025),
    status: "DONE",
    description: "Transferred from MDC COP3530",
    category: "CORE",
  },
  {
    id: "10",
    title: "Computer Organization (CDA3101) - FIU",
    kind: "COURSE",
    semester: "FALL",
    year: 2025,
    targetDate: semesterToDate("FALL", 2025),
    status: "IN_PROGRESS",
    description: "Computer architecture and assembly language",
    category: "CORE",
  },
  {
    id: "11",
    title: "Discrete Structures (COT3100) - FIU",
    kind: "COURSE",
    semester: "FALL",
    year: 2025,
    targetDate: semesterToDate("FALL", 2025),
    status: "IN_PROGRESS",
    description: "Logic, sets, graphs, and algorithms",
    category: "CORE",
  },
  
  // Spring 2026 - FIU
  {
    id: "12",
    title: "Algorithms (COP3531) - FIU",
    kind: "COURSE",
    semester: "SPRING",
    year: 2026,
    targetDate: semesterToDate("SPRING", 2026),
    status: "IN_PROGRESS",
    description: "Algorithm design and analysis",
    category: "CORE",
  },
  {
    id: "13",
    title: "Software Engineering (CEN4010) - FIU",
    kind: "COURSE",
    semester: "SPRING",
    year: 2026,
    targetDate: semesterToDate("SPRING", 2026),
    status: "IN_PROGRESS",
    description: "Software development lifecycle and methodologies",
    category: "CORE",
  },
  {
    id: "14",
    title: "Database Systems (COP4703) - FIU",
    kind: "COURSE",
    semester: "SPRING",
    year: 2026,
    targetDate: semesterToDate("SPRING", 2026),
    status: "IN_PROGRESS",
    description: "Database design and SQL",
    category: "CORE",
  },
  {
    id: "15",
    title: "Operating Systems (COP4610) - FIU",
    kind: "COURSE",
    semester: "SPRING",
    year: 2026,
    targetDate: semesterToDate("SPRING", 2026),
    status: "IN_PROGRESS",
    description: "Process management and system programming",
    category: "CORE",
  },
  
  // Summer 2026
  {
    id: "16",
    title: "Software Engineering Internship",
    kind: "INTERNSHIP",
    semester: "SUMMER",
    year: 2026,
    targetDate: semesterToDate("SUMMER", 2026),
    status: "PLANNED",
    description: "Summer internship at tech company, working on full-stack applications",
  },
  {
    id: "17",
    title: "AWS Cloud Practitioner Certification",
    kind: "CERT",
    targetDate: "2026-07-15",
    status: "PLANNED",
    description: "Cloud computing fundamentals and AWS services",
  },
  
  // Fall 2026 - FIU
  {
    id: "18",
    title: "Computer Networks (CNT4713) - FIU",
    kind: "COURSE",
    semester: "FALL",
    year: 2026,
    targetDate: semesterToDate("FALL", 2026),
    status: "PLANNED",
    description: "Network protocols and architecture",
    category: "CORE",
  },
  {
    id: "19",
    title: "Web Development (CEN4721) - FIU",
    kind: "COURSE",
    semester: "FALL",
    year: 2026,
    targetDate: semesterToDate("FALL", 2026),
    status: "PLANNED",
    description: "Full-stack web development",
    category: "ELECTIVE",
  },
  {
    id: "20",
    title: "Mobile Application Development - FIU",
    kind: "COURSE",
    semester: "FALL",
    year: 2026,
    targetDate: semesterToDate("FALL", 2026),
    status: "PLANNED",
    description: "iOS and Android development",
    category: "ELECTIVE",
    isElective: true,
  },
  
  // Spring 2027 - FIU
  {
    id: "21",
    title: "Senior Design Project - FIU",
    kind: "COURSE",
    semester: "SPRING",
    year: 2027,
    targetDate: semesterToDate("SPRING", 2027),
    status: "PLANNED",
    description: "Capstone project: develop a complete software system",
    category: "DEGREE",
  },
  {
    id: "22",
    title: "Cybersecurity (CIS4361) - FIU",
    kind: "COURSE",
    semester: "SPRING",
    year: 2027,
    targetDate: semesterToDate("SPRING", 2027),
    status: "PLANNED",
    description: "Security principles and practices",
    category: "ELECTIVE",
    isElective: true,
  },
  {
    id: "23",
    title: "Bachelor's Degree in Computer Science - FIU",
    kind: "COURSE",
    semester: "SPRING",
    year: 2027,
    targetDate: semesterToDate("SPRING", 2027),
    status: "PLANNED",
    description: "Graduation from Florida International University",
    category: "DEGREE",
  },
];

export function CareerPathway() {
  const [milestones, setMilestones] = useState<Milestone[]>(hardcodedMilestones);

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
              Software Engineer pathway at Florida International University
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
        </div>
      </div>
    </div>
  );
}
