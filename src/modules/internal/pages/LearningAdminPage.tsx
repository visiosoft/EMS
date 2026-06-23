import { useState, useEffect, useRef } from "react";
import { 
  LayoutGrid, 
  PenSquare, 
  Eye, 
  Users, 
  FileBadge, 
  LogOut, 
  Check, 
  X, 
  Sparkles, 
  Plus, 
  AlertCircle,
  FolderOpen,
  ChevronDown,
  Loader2
} from "lucide-react";
import { useInternalNavigation } from "../routing/InternalNavigationContext";

interface Submission {
  id: string;
  employee: string;
  certification: string;
  submitted: string;
  status: "PENDING" | "VERIFIED" | "REJECTED";
  points: number;
  department: string;
  proofUrl?: string;
}

interface Certification {
  id: string;
  title: string;
  platform: string;
  level: string;
  points: number;
  tags: string[];
  status: "Active" | "Archived";
  department: string;
  description?: string;
  duration?: string;
  externalUrl?: string;
}

interface Employee {
  id: string;
  name: string;
  role: string;
  certsCount: number;
  points: number;
  department: string;
}

// Initial mock data
const INITIAL_SUBMISSIONS: Submission[] = [
  // Adobe Certified Professional – Visual Design (8 submissions)
  { id: "s1_1", employee: "Sarah Mitchell", certification: "Adobe Certified Professional – Visual Design", submitted: "May 28, 2025", status: "VERIFIED", points: 120, department: "Art & Graphic Design" },
  { id: "s1_2", employee: "Marcus Wren", certification: "Adobe Certified Professional – Visual Design", submitted: "May 22, 2025", status: "VERIFIED", points: 120, department: "Art & Graphic Design" },
  { id: "s1_3", employee: "Alex Abalo", certification: "Adobe Certified Professional – Visual Design", submitted: "Jun 1, 2025", status: "VERIFIED", points: 120, department: "Art & Graphic Design" },
  { id: "s1_4", employee: "Priya Kapoor", certification: "Adobe Certified Professional – Visual Design", submitted: "May 15, 2025", status: "VERIFIED", points: 120, department: "Art & Graphic Design" },
  { id: "s1_5", employee: "Chauncey Hopewell", certification: "Adobe Certified Professional – Visual Design", submitted: "Apr 30, 2025", status: "VERIFIED", points: 120, department: "Art & Graphic Design" },
  { id: "s1_6", employee: "Ben Viette", certification: "Adobe Certified Professional – Visual Design", submitted: "Apr 10, 2025", status: "VERIFIED", points: 120, department: "Art & Graphic Design" },
  { id: "s1_7", employee: "Sarah Mitchell", certification: "Adobe Certified Professional – Visual Design", submitted: "May 29, 2025", status: "PENDING", points: 120, department: "Art & Graphic Design" },
  { id: "s1_8", employee: "Marcus Wren", certification: "Adobe Certified Professional – Visual Design", submitted: "May 23, 2025", status: "PENDING", points: 120, department: "Art & Graphic Design" },

  // Google UX Design Certificate (6 submissions)
  { id: "s2_1", employee: "Marcus Wren", certification: "Google UX Design Certificate", submitted: "May 22, 2025", status: "VERIFIED", points: 80, department: "Art & Graphic Design" },
  { id: "s2_2", employee: "Alex Abalo", certification: "Google UX Design Certificate", submitted: "May 23, 2025", status: "VERIFIED", points: 80, department: "Art & Graphic Design" },
  { id: "s2_3", employee: "Sarah Mitchell", certification: "Google UX Design Certificate", submitted: "May 24, 2025", status: "VERIFIED", points: 80, department: "Art & Graphic Design" },
  { id: "s2_4", employee: "Priya Kapoor", certification: "Google UX Design Certificate", submitted: "May 25, 2025", status: "VERIFIED", points: 80, department: "Art & Graphic Design" },
  { id: "s2_5", employee: "Chauncey Hopewell", certification: "Google UX Design Certificate", submitted: "May 26, 2025", status: "PENDING", points: 80, department: "Art & Graphic Design" },
  { id: "s2_6", employee: "Ben Viette", certification: "Google UX Design Certificate", submitted: "May 27, 2025", status: "PENDING", points: 80, department: "Art & Graphic Design" },

  // Brand Identity & Typography Essentials (4 submissions)
  { id: "s3_1", employee: "Alex Abalo", certification: "Brand Identity & Typography Essentials", submitted: "May 10, 2025", status: "VERIFIED", points: 60, department: "Art & Graphic Design" },
  { id: "s3_2", employee: "Marcus Wren", certification: "Brand Identity & Typography Essentials", submitted: "May 11, 2025", status: "VERIFIED", points: 60, department: "Art & Graphic Design" },
  { id: "s3_3", employee: "Priya Kapoor", certification: "Brand Identity & Typography Essentials", submitted: "May 12, 2025", status: "VERIFIED", points: 60, department: "Art & Graphic Design" },
  { id: "s3_4", employee: "Sarah Mitchell", certification: "Brand Identity & Typography Essentials", submitted: "May 13, 2025", status: "VERIFIED", points: 60, department: "Art & Graphic Design" },

  // Motion Design & After Effects (3 submissions)
  { id: "s1", employee: "Alex Abalo", certification: "Motion Design & After Effects", submitted: "Jun 1, 2025", status: "PENDING", points: 50, department: "Art & Graphic Design" },
  { id: "s4_2", employee: "Marcus Wren", certification: "Motion Design & After Effects", submitted: "Jun 2, 2025", status: "VERIFIED", points: 50, department: "Art & Graphic Design" },
  { id: "s4_3", employee: "Sarah Mitchell", certification: "Motion Design & After Effects", submitted: "Jun 3, 2025", status: "VERIFIED", points: 50, department: "Art & Graphic Design" },

  // Canva Certified Creator (5 submissions)
  { id: "s4", employee: "Priya Kapoor", certification: "Canva Certified Creator", submitted: "May 15, 2025", status: "REJECTED", points: 0, department: "Art & Graphic Design" },
  { id: "s5_2", employee: "Sarah Mitchell", certification: "Canva Certified Creator", submitted: "May 16, 2025", status: "VERIFIED", points: 40, department: "Art & Graphic Design" },
  { id: "s5_3", employee: "Marcus Wren", certification: "Canva Certified Creator", submitted: "May 17, 2025", status: "VERIFIED", points: 40, department: "Art & Graphic Design" },
  { id: "s5_4", employee: "Chauncey Hopewell", certification: "Canva Certified Creator", submitted: "May 18, 2025", status: "VERIFIED", points: 40, department: "Art & Graphic Design" },
  { id: "s5_5", employee: "Ben Viette", certification: "Canva Certified Creator", submitted: "May 19, 2025", status: "VERIFIED", points: 40, department: "Art & Graphic Design" },

  // Advanced Web Design & Interaction (2 submissions)
  { id: "s2", employee: "Sarah Mitchell", certification: "Advanced Web Design & Interaction", submitted: "May 28, 2025", status: "VERIFIED", points: 100, department: "Art & Graphic Design" },
  { id: "s6_2", employee: "Marcus Wren", certification: "Advanced Web Design & Interaction", submitted: "May 29, 2025", status: "VERIFIED", points: 100, department: "Art & Graphic Design" },

  // Others
  { id: "s5", employee: "John Doe", certification: "SEO Foundations", submitted: "Jun 4, 2025", status: "PENDING", points: 40, department: "Marketing" },
  { id: "s6", employee: "Jane Smith", certification: "Social Media Marketing Professional", submitted: "May 30, 2025", status: "VERIFIED", points: 60, department: "Marketing" },
  { id: "s7", employee: "Bob Johnson", certification: "Financial Modeling & Valuation Analyst", submitted: "Jun 2, 2025", status: "PENDING", points: 120, department: "Finance" }
];

const INITIAL_CERTIFICATIONS: Certification[] = [
  { id: "c1", title: "Adobe Certified Professional – Visual Design", platform: "Adobe", level: "Intermediate", points: 120, tags: ["Design Tools", "Adobe"], status: "Active", department: "Art & Graphic Design", description: "Master Adobe XD, Illustrator and Photoshop workflows to earn this globally recognized credential." },
  { id: "c2", title: "Google UX Design Certificate", platform: "Coursera", level: "Beginner", points: 80, tags: ["UX / UI", "Coursera"], status: "Active", department: "Art & Graphic Design", description: "A foundational certification covering the full UX design process from research to high-fidelity prototypes." },
  { id: "c3", title: "Brand Identity & Typography Essentials", platform: "LinkedIn Learning", level: "Beginner", points: 60, tags: ["Branding", "Typography"], status: "Active", department: "Art & Graphic Design", description: "Build strong typographic systems and develop a cohesive brand identity from scratch." },
  { id: "c4", title: "Motion Design & After Effects", platform: "Skillshare", level: "Intermediate", points: 50, tags: ["Motion", "After Effects"], status: "Active", department: "Art & Graphic Design", description: "Learn to create animated graphics, transitions, and visual effects using Adobe After Effects." },
  { id: "c5", title: "Canva Certified Creator", platform: "Canva", level: "Beginner", points: 40, tags: ["Digital Media"], status: "Active", department: "Art & Graphic Design", description: "Demonstrate your ability to produce compelling visual content using Canva's full professional design suite." },
  { id: "c6", title: "Advanced Web Design & Interaction", platform: "Awwwards", level: "Advanced", points: 100, tags: ["Web Design", "Interaction"], status: "Active", department: "Art & Graphic Design", description: "Explore advanced interaction patterns, scroll animations, and award-worthy layout techniques." },
  
  { id: "c7", title: "SEO Foundations", platform: "Coursera", level: "Beginner", points: 40, tags: ["SEO", "Marketing"], status: "Active", department: "Marketing", description: "Understand search engine optimization essentials and tools." },
  { id: "c8", title: "Social Media Marketing Professional", platform: "Meta", level: "Intermediate", points: 60, tags: ["Social", "Marketing"], status: "Active", department: "Marketing", description: "Learn strategy and ad campaigns on Facebook, Instagram, and other major networks." },
  
  { id: "c9", title: "Financial Modeling & Valuation Analyst", platform: "CFI", level: "Advanced", points: 120, tags: ["Finance", "Valuation"], status: "Active", department: "Finance", description: "Elite practical corporate finance training for analysts and leaders." }
];

interface Employee {
  id: string;
  name: string;
  role: string;
  certsCount: number;
  certsSubmitted: number;
  lastActivity: string;
  points: number;
  department: string;
}

const INITIAL_EMPLOYEES: Employee[] = [
  { id: "e1", name: "Sarah Mitchell", role: "Senior Designer", certsCount: 6, certsSubmitted: 6, lastActivity: "May 28, 2025", points: 620, department: "Art & Graphic Design" },
  { id: "e2", name: "Marcus Wren", role: "Graphic Designer", certsCount: 5, certsSubmitted: 5, lastActivity: "May 22, 2025", points: 460, department: "Art & Graphic Design" },
  { id: "e3", name: "Alex Abalo", role: "Graphic Designer", certsCount: 3, certsSubmitted: 4, lastActivity: "Jun 1, 2025", points: 340, department: "Art & Graphic Design" },
  { id: "e4", name: "Priya Kapoor", role: "Art Director", certsCount: 2, certsSubmitted: 3, lastActivity: "May 15, 2025", points: 280, department: "Art & Graphic Design" },
  { id: "e5", name: "Chauncey Hopewell", role: "Graphic Designer", certsCount: 2, certsSubmitted: 2, lastActivity: "Apr 30, 2025", points: 220, department: "Art & Graphic Design" },
  { id: "e6", name: "Ben Viette", role: "Art Director", certsCount: 2, certsSubmitted: 2, lastActivity: "Apr 10, 2025", points: 180, department: "Art & Graphic Design" },
  { id: "e10", name: "Jordan Lee", role: "Junior Designer", certsCount: 0, certsSubmitted: 1, lastActivity: "May 30, 2025", points: 0, department: "Art & Graphic Design" },
  
  { id: "e7", name: "John Doe", role: "Marketing Manager", certsCount: 2, certsSubmitted: 2, lastActivity: "Jun 4, 2025", points: 150, department: "Marketing" },
  { id: "e8", name: "Jane Smith", role: "Social Media Specialist", certsCount: 4, certsSubmitted: 4, lastActivity: "May 30, 2025", points: 280, department: "Marketing" },
  
  { id: "e9", name: "Bob Johnson", role: "Financial Analyst", certsCount: 1, certsSubmitted: 1, lastActivity: "Jun 2, 2025", points: 100, department: "Finance" }
];

export function LearningAdminPage() {
  const { viewData } = useInternalNavigation();
  
  // Navigation & filtering states
  const [activeTab, setActiveTab] = useState<"overview" | "publish" | "monitor" | "scores" | "manage">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("iae_admin_active_tab");
      if (saved === "overview" || saved === "publish" || saved === "monitor" || saved === "scores" || saved === "manage") {
        return saved;
      }
    }
    return "overview";
  });
  const [activeDept, setActiveDept] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("iae_admin_active_dept");
      if (saved) return saved;
    }
    return viewData?.fromTitle || "Art & Graphic Design";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("iae_admin_active_tab", activeTab);
      localStorage.setItem("iae_admin_active_dept", activeDept);
    }
  }, [activeTab, activeDept]);
  
  // Stateful database
  const [submissions, setSubmissions] = useState<Submission[]>(INITIAL_SUBMISSIONS);
  const [certifications, setCertifications] = useState<Certification[]>(INITIAL_CERTIFICATIONS);
  const [employees, setEmployees] = useState<Employee[]>(INITIAL_EMPLOYEES);
  
  // Notification state
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);

  // Review modal state
  const [reviewingSubmissionId, setReviewingSubmissionId] = useState<string | null>(null);

  // New Certification form state
  const [formName, setFormName] = useState("");
  const [formPlatform, setFormPlatform] = useState("");
  const [formPoints, setFormPoints] = useState("");
  const [formLevel, setFormLevel] = useState("Beginner");
  const [formDuration, setFormDuration] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formAssignDept, setFormAssignDept] = useState(activeDept);

  // Monitor tab filters
  const [monitorSearch, setMonitorSearch] = useState("");
  const [monitorDept, setMonitorDept] = useState("All Departments");
  const [monitorTime, setMonitorTime] = useState("All Time");
  const [monitorStatus, setMonitorStatus] = useState("All Statuses");

  // Loaders for Overview tab
  const [isLoadingKPIs, setIsLoadingKPIs] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(true);

  useEffect(() => {
    if (activeTab === "overview") {
      setIsLoadingKPIs(true);
      setIsLoadingTable(true);
      
      const timerKPI = setTimeout(() => setIsLoadingKPIs(false), 600);
      const timerTable = setTimeout(() => setIsLoadingTable(false), 900);
      
      return () => {
        clearTimeout(timerKPI);
        clearTimeout(timerTable);
      };
    }
  }, [activeTab, activeDept]);

  useEffect(() => {
    setFormAssignDept(activeDept);
  }, [activeDept, activeTab]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Derived counts for KPIs
  const deptEmployees = employees.filter(e => e.department === activeDept);
  const deptCerts = certifications.filter(c => c.department === activeDept && c.status === "Active");
  const deptSubmissions = submissions.filter(s => s.department === activeDept);
  const pendingCount = deptSubmissions.filter(s => s.status === "PENDING").length;

  // Monitor tab derived list
  const filteredMonitorSubmissions = submissions.filter(sub => {
    if (monitorSearch && !sub.employee.toLowerCase().includes(monitorSearch.toLowerCase()) && !sub.certification.toLowerCase().includes(monitorSearch.toLowerCase())) {
      return false;
    }
    if (monitorDept !== "All Departments" && sub.department !== monitorDept) return false;
    if (monitorStatus !== "All Statuses" && sub.status !== monitorStatus) return false;
    return true;
  });

  const handleExitAdmin = () => {
    if (window.opener || window.history.length === 1) {
      window.close();
    } else {
      window.location.href = "/internal";
    }
  };

  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    setToast({ message, type });
  };

  // Actions
  const handleApproveSubmission = (subId: string) => {
    const sub = submissions.find(s => s.id === subId);
    if (!sub) return;

    // Update submission status
    setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: "VERIFIED" } : s));

    // Add points to the employee
    setEmployees(prev => prev.map(emp => {
      if (emp.name === sub.employee && emp.department === sub.department) {
        return {
          ...emp,
          certsCount: emp.certsCount + 1,
          points: emp.points + sub.points
        };
      }
      return emp;
    }));

    showToast(`Approved certification for ${sub.employee}. +${sub.points} pts awarded!`, "success");
  };

  const handleRejectSubmission = (subId: string) => {
    const sub = submissions.find(s => s.id === subId);
    if (!sub) return;

    setSubmissions(prev => prev.map(s => s.id === subId ? { ...s, status: "REJECTED" } : s));
    showToast(`Rejected submission from ${sub.employee}.`, "error");
  };

  const handlePublishCertification = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast("Certification Name is required", "error");
      return;
    }
    if (!formPlatform) {
      showToast("Platform / Issuer is required", "error");
      return;
    }
    if (!formUrl.trim()) {
      showToast("External Course URL is required", "error");
      return;
    }

    const newCert: Certification = {
      id: `c_${Date.now()}`,
      title: formName.trim(),
      platform: formPlatform,
      level: formLevel,
      points: parseInt(formPoints) || 0,
      tags: formTags.split(",").map(t => t.trim()).filter(Boolean),
      status: "Active",
      department: formAssignDept,
      description: formDescription.trim(),
      duration: formDuration.trim(),
      externalUrl: formUrl.trim()
    };

    setCertifications(prev => [newCert, ...prev]);
    showToast("Successfully published certification!", "success");

    // Reset Form
    setFormName("");
    setFormPlatform("");
    setFormPoints("");
    setFormLevel("Beginner");
    setFormDuration("");
    setFormUrl("");
    setFormTags("");
    setFormDescription("");
    
    // Switch active department if it was changed during assignment
    setActiveDept(formAssignDept);
    // Redirect to manage certifications tab
    setActiveTab("manage");
  };

  const handleToggleCertStatus = (certId: string) => {
    setCertifications(prev => prev.map(c => {
      if (c.id === certId) {
        const nextStatus = c.status === "Active" ? "Archived" : "Active";
        showToast(`Certification is now ${nextStatus.toLowerCase()}.`, "info");
        return { ...c, status: nextStatus };
      }
      return c;
    }));
  };

  return (
    <div className="flex flex-col min-h-[100dvh] bg-neutral-50 font-sans text-neutral-900 select-none">
      
      {/* Dynamic Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-[999] flex items-center gap-3 rounded-lg px-4 py-3 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 bg-white border border-neutral-200">
          <div className={`h-2.5 w-2.5 rounded-full ${toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-red-500" : "bg-blue-500"}`} />
          <span className="text-xs font-bold text-neutral-800">{toast.message}</span>
        </div>
      )}

      {/* Top Header Bar */}
      <header className="flex h-14 w-full shrink-0 items-center justify-between bg-black px-6 text-white border-b border-white/10 z-50">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-[0.15em] text-white/70">
            IAE <span className="mx-1 text-white/40">•</span> ADMIN PANEL
          </span>
        </div>
        <div className="flex items-center gap-8">
          <button
            onClick={() => { window.location.href = "/internal?view=departments"; }}
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            Back to Departments
          </button>
          <button
            onClick={() => { window.location.href = `/internal?view=learning-portal&fromTitle=${encodeURIComponent(activeDept)}`; }}
            className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors"
          >
            User Portal Preview
          </button>
        </div>
        <div>
          <button
            onClick={handleExitAdmin}
            className="flex items-center gap-1.5 rounded-full border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors"
          >
            <LogOut className="h-3.5 w-3.5 text-white/80" />
            <span>Exit Admin</span>
          </button>
        </div>
      </header>

      {/* Main Workspace */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-[260px] bg-[#0b0b0b] text-white flex flex-col shrink-0">
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6 pt-6">
            
            <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
              Learning Admin
            </div>
            
            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("overview")}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "overview" 
                    ? "bg-white/10 text-white" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <LayoutGrid className="h-4 w-4" /> Overview
              </button>

              <button
                onClick={() => setActiveTab("publish")}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "publish" 
                    ? "bg-white/10 text-white" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <PenSquare className="h-4 w-4" /> Publish Certification
              </button>

              <button
                onClick={() => setActiveTab("monitor")}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "monitor" 
                    ? "bg-white/10 text-white animate-pulse-subtle" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <div className="relative">
                  <Eye className="h-4 w-4" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-amber-500" />
                  )}
                </div>
                <span>Monitor Submissions</span>
                {pendingCount > 0 && (
                  <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab("scores")}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "scores" 
                    ? "bg-white/10 text-white" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <Users className="h-4 w-4" /> Employee Scores
              </button>

              <button
                onClick={() => setActiveTab("manage")}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "manage" 
                    ? "bg-white/10 text-white" 
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                }`}
              >
                <FileBadge className="h-4 w-4" /> Manage Certifications
              </button>
            </nav>

            <div className="mt-8 mb-3 px-2 text-[10px] font-bold uppercase tracking-wider text-white/40">
              Department
            </div>
            
            <nav className="space-y-1">
              {["Art & Graphic Design", "Marketing", "Finance"].map((dept) => (
                <button
                  key={dept}
                  onClick={() => {
                    setActiveDept(dept);
                    showToast(`Switched active view to ${dept}.`, "info");
                  }}
                  className={`flex w-full items-center px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                    activeDept === dept 
                      ? "text-[#cfa86e] bg-[#cfa86e]/10" 
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="w-full p-8 lg:p-12">
            
            {/* Header section */}
            <div className="mb-10 flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-black flex items-center gap-2.5">
                  {activeTab === "overview" && "Overview"}
                  {activeTab === "publish" && "Publish a New Certification"}
                  {activeTab === "monitor" && "Monitor Submissions"}
                  {activeTab === "scores" && "Employee Scores"}
                  {activeTab === "manage" && "Manage Published Certifications"}
                  {activeTab !== "monitor" && activeTab !== "manage" && (
                    <span className="text-sm font-medium text-neutral-400">— {activeDept}</span>
                  )}
                </h1>
              </div>
              
              {activeTab === "overview" && (
                <button
                  onClick={() => setActiveTab("publish")}
                  className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-black shadow-sm ring-1 ring-inset ring-neutral-200 transition-colors hover:bg-neutral-50"
                >
                  <Plus className="h-3.5 w-3.5 text-neutral-500" />
                  <span>Publish Certification</span>
                </button>
              )}



              {activeTab === "manage" && (
                <button
                  onClick={() => setActiveTab("publish")}
                  className="flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-neutral-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>ADD NEW</span>
                </button>
              )}

              {activeTab === "monitor" && (
                <div className="w-[160px]">
                  <CustomDropdown
                    value={monitorStatus}
                    onChange={setMonitorStatus}
                    options={[
                      { label: "All Statuses", value: "All Statuses" },
                      { label: "PENDING", value: "PENDING" },
                      { label: "VERIFIED", value: "VERIFIED" },
                      { label: "REJECTED", value: "REJECTED" }
                    ]}
                  />
                </div>
              )}
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === "overview" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {/* KPI Cards */}
                {isLoadingKPIs ? (
                  <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <div className="grid gap-6 md:grid-cols-3">
                    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Employees</span>
                      <span className="mt-1 text-3xl font-black text-black">{deptEmployees.length}</span>
                      <span className="mt-1 text-xs font-medium text-neutral-400">in this department</span>
                    </div>
                    
                    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Active Certifications</span>
                      <span className="mt-1 text-3xl font-black text-black">{deptCerts.length}</span>
                      <span className="mt-1 text-xs font-medium text-neutral-400">published & live</span>
                    </div>
                    
                    <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Submissions</span>
                      <span className="mt-1 text-3xl font-black text-black">{deptSubmissions.length}</span>
                      <span className="mt-1 text-xs font-medium text-neutral-400">
                        {pendingCount > 0 ? `${pendingCount} pending review` : "all caught up"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Recent Activity Table */}
                <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-neutral-100">
                    <h2 className="text-base font-bold text-black">Recent Activity</h2>
                    <p className="mt-1 text-xs text-neutral-500">Latest submissions and status changes</p>
                  </div>
                  
                  {isLoadingTable ? (
                    <div className="flex min-h-[250px] items-center justify-center bg-neutral-50/50">
                      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      {deptSubmissions.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                          <FolderOpen className="h-8 w-8 stroke-1 mb-2" />
                          <span className="text-xs font-semibold">No recent submissions found</span>
                        </div>
                      ) : (
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                              <th className="px-6 py-4">Employee</th>
                              <th className="px-6 py-4">Certification</th>
                              <th className="px-6 py-4">Submitted</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Points</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-neutral-100">
                            {deptSubmissions.map((sub) => (
                              <tr key={sub.id} className="hover:bg-neutral-50/50 transition-colors">
                                <td className="whitespace-nowrap px-6 py-4 font-bold text-black">{sub.employee}</td>
                                <td className="px-6 py-4 font-semibold text-neutral-900">{sub.certification}</td>
                                <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-900">{sub.submitted}</td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  {sub.status === "PENDING" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                      ⏳ PENDING
                                    </span>
                                  )}
                                  {sub.status === "VERIFIED" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                      ✓ VERIFIED
                                    </span>
                                  )}
                                  {sub.status === "REJECTED" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-600/10">
                                      ❌ REJECTED
                                    </span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 font-bold text-neutral-900">
                                  {sub.status === "REJECTED" ? "—" : `+${sub.points}`}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: PUBLISH CERTIFICATION */}
            {activeTab === "publish" && (
              <div className="w-full bg-white rounded-xl border border-neutral-200 p-8 shadow-sm animate-in fade-in duration-200">
                <div className="mb-1">
                  <h2 className="text-sm font-bold text-neutral-900">Certification Details</h2>
                  <p className="text-[11px] text-neutral-500 mt-0.5">This certification will appear in the department's Learning Portal for all employees to access.</p>
                </div>
                <div className="border-b border-neutral-100 my-6" />
                
                <form onSubmit={handlePublishCertification} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Certification Title *</label>
                    <input 
                      type="text" 
                      required
                      value={formName}
                      onChange={e => setFormName(e.target.value)}
                      placeholder="e.g. Adobe Certified Professional – Visual Design" 
                      className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" 
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Platform / Issuer *</label>
                      <CustomDropdown 
                        placeholder="Select platform..."
                        value={formPlatform}
                        onChange={setFormPlatform}
                        options={[
                          { label: "Adobe", value: "Adobe" },
                          { label: "Coursera", value: "Coursera" },
                          { label: "LinkedIn Learning", value: "LinkedIn Learning" },
                          { label: "Skillshare", value: "Skillshare" },
                          { label: "Meta", value: "Meta" },
                          { label: "Canva", value: "Canva" },
                          { label: "Awwwards", value: "Awwwards" }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Points Awarded *</label>
                      <input 
                        type="number" 
                        required
                        value={formPoints}
                        onChange={e => setFormPoints(e.target.value)}
                        placeholder="e.g. 120" 
                        className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" 
                      />
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Difficulty Level</label>
                      <CustomDropdown 
                        value={formLevel}
                        onChange={setFormLevel}
                        options={[
                          { label: "Beginner", value: "Beginner" },
                          { label: "Intermediate", value: "Intermediate" },
                          { label: "Advanced", value: "Advanced" }
                        ]}
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Estimated Duration</label>
                      <input 
                        type="text" 
                        value={formDuration}
                        onChange={e => setFormDuration(e.target.value)}
                        placeholder="e.g. 40 hrs / 6 months" 
                        className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" 
                      />
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">External Course URL *</label>
                    <input 
                      type="url" 
                      required
                      value={formUrl}
                      onChange={e => setFormUrl(e.target.value)}
                      placeholder="https://..." 
                      className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" 
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Short Description</label>
                    <textarea 
                      value={formDescription}
                      onChange={e => setFormDescription(e.target.value)}
                      placeholder="A brief description of what employees will learn and why this certification is valuable..." 
                      className="h-20 w-full rounded-md border border-neutral-300 p-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black bg-white placeholder:text-neutral-300"
                    />
                  </div>

                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Tags (comma-separated)</label>
                      <input 
                        type="text" 
                        value={formTags}
                        onChange={e => setFormTags(e.target.value)}
                        placeholder="e.g. Design Tools, Branding, UX" 
                        className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" 
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Assign to Department</label>
                      <CustomDropdown 
                        value={formAssignDept}
                        onChange={setFormAssignDept}
                        options={[
                          { label: "Art & Graphic Design", value: "Art & Graphic Design" },
                          { label: "Marketing", value: "Marketing" },
                          { label: "Finance", value: "Finance" }
                        ]}
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex items-center gap-3">
                    <button 
                      type="submit"
                      className="flex h-9 items-center justify-center rounded-full bg-black px-5 text-[10px] font-bold tracking-widest text-white transition-colors hover:bg-neutral-800"
                    >
                      PUBLISH CERTIFICATION
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT: MONITOR SUBMISSIONS */}
            {activeTab === "monitor" && (
              <div className="animate-in fade-in duration-200">
                <div className="mb-6 flex items-center gap-3">
                  <div className="w-[260px]">
                    <input 
                      type="text" 
                      placeholder="Search employee or certificat" 
                      value={monitorSearch}
                      onChange={(e) => setMonitorSearch(e.target.value)}
                      className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400 bg-white"
                    />
                  </div>
                  <div className="w-[180px]">
                    <CustomDropdown 
                      value={monitorDept}
                      onChange={setMonitorDept}
                      options={[
                        { label: "All Departments", value: "All Departments" },
                        { label: "Art & Graphic Design", value: "Art & Graphic Design" },
                        { label: "Marketing", value: "Marketing" },
                        { label: "Finance", value: "Finance" }
                      ]}
                    />
                  </div>
                  <div className="w-[140px]">
                    <CustomDropdown 
                      value={monitorTime}
                      onChange={setMonitorTime}
                      options={[
                        { label: "All Time", value: "All Time" },
                        { label: "This Month", value: "This Month" },
                        { label: "This Week", value: "This Week" }
                      ]}
                    />
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          <th className="px-6 py-4">Employee</th>
                          <th className="px-6 py-4">Certification</th>
                          <th className="px-6 py-4">Platform</th>
                          <th className="px-6 py-4">Submitted</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Points</th>
                          <th className="px-6 py-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100">
                        {filteredMonitorSubmissions.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-neutral-400">
                              <span className="text-xs font-semibold">No submissions match your filters.</span>
                            </td>
                          </tr>
                        ) : (
                          filteredMonitorSubmissions.map((sub) => {
                            const emp = employees.find(e => e.name === sub.employee);
                            const cert = certifications.find(c => c.title === sub.certification);
                            
                            return (
                              <tr key={sub.id} className="hover:bg-neutral-50/55 transition-colors">
                                <td className="px-6 py-4">
                                  <div className="font-bold text-black">{sub.employee}</div>
                                  <div className="text-[11px] font-semibold text-neutral-500 mt-0.5">{emp?.role || "Employee"}</div>
                                </td>
                                <td className="px-6 py-4 font-semibold text-neutral-900">{sub.certification}</td>
                                <td className="px-6 py-4 font-semibold text-neutral-700">{cert?.platform || "—"}</td>
                                <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-900">{sub.submitted}</td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  {sub.status === "PENDING" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                                      ⏳ PENDING
                                    </span>
                                  )}
                                  {sub.status === "VERIFIED" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                                      ✓ VERIFIED
                                    </span>
                                  )}
                                  {sub.status === "REJECTED" && (
                                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-600/10">
                                      ❌ REJECTED
                                    </span>
                                  )}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4 font-bold text-black">
                                  {sub.status === "REJECTED" ? "—" : `+${sub.points}`}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  {sub.status === "PENDING" ? (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={() => handleApproveSubmission(sub.id)}
                                        className="flex h-7 items-center justify-center rounded-full bg-black px-3 text-[10px] font-bold tracking-widest text-white transition-colors hover:bg-neutral-800"
                                      >
                                        APPROVE
                                      </button>
                                      <button
                                        onClick={() => setReviewingSubmissionId(sub.id)}
                                        className="flex h-7 items-center justify-center rounded-full border border-neutral-200 bg-white px-3 text-[10px] font-bold tracking-widest text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-black"
                                      >
                                        Review
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={() => setReviewingSubmissionId(sub.id)}
                                      className="flex h-7 items-center justify-center rounded-full border border-neutral-200 bg-white px-3 text-[10px] font-bold tracking-widest text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-black"
                                    >
                                      View
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: EMPLOYEE SCORES */}
            {activeTab === "scores" && (
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        <th className="px-6 py-4">Employee</th>
                        <th className="px-6 py-4">Title</th>
                        <th className="px-6 py-4">Certs Submitted</th>
                        <th className="px-6 py-4">Certs Approved</th>
                        <th className="px-6 py-4">Total Points</th>
                        <th className="px-6 py-4">Tier</th>
                        <th className="px-6 py-4">Last Activity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {deptEmployees
                        .sort((a, b) => b.points - a.points)
                        .map((emp) => {
                          const getTier = (pts: number) => {
                            if (pts >= 600) return <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-1 text-[10px] font-bold tracking-widest text-white">💎 PLATINUM</span>;
                            if (pts >= 400) return <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf8e6] px-2.5 py-1 text-[10px] font-bold tracking-widest text-[#a88210]">🏆 GOLD</span>;
                            if (pts >= 200) return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold tracking-widest text-slate-700">🥈 SILVER</span>;
                            if (pts >= 100) return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold tracking-widest text-orange-800">🥉 BRONZE</span>;
                            return <span className="text-xs font-semibold text-neutral-400">— Unranked</span>;
                          };
                          
                          return (
                            <tr key={emp.id} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="whitespace-nowrap px-6 py-4 font-bold text-black">{emp.name}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-900">{emp.role}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-900">{emp.certsSubmitted}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-900">{emp.certsCount}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-black text-black">{emp.points}</td>
                              <td className="whitespace-nowrap px-6 py-4">{getTier(emp.points)}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-700">{emp.lastActivity}</td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB CONTENT: MANAGE CERTIFICATIONS */}
            {activeTab === "manage" && (
              <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden animate-in fade-in duration-200">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                        <th className="px-6 py-4">Certification</th>
                        <th className="px-6 py-4">Platform</th>
                        <th className="px-6 py-4">Points</th>
                        <th className="px-6 py-4">Level</th>
                        <th className="px-6 py-4">Submissions</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {certifications
                        .filter(c => c.department === activeDept)
                        .map((cert) => {
                          const subCount = submissions.filter(s => s.certification === cert.title).length;
                          return (
                            <tr key={cert.id} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-black">{cert.title}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-700">{cert.platform}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-black text-black">+{cert.points}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-700">{cert.level}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-700">{subCount}</td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-1 text-[10px] font-bold tracking-widest text-black">
                                  <span className="h-1.5 w-1.5 rounded-full bg-neutral-400"></span>
                                  LIVE
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <div className="flex gap-2">
                                  <button className="flex h-7 items-center justify-center rounded-full border border-neutral-200 bg-white px-3 text-[10px] font-bold tracking-widest text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-black">
                                    Edit
                                  </button>
                                  <button 
                                    onClick={() => handleToggleCertStatus(cert.id)}
                                    className="flex h-7 items-center justify-center rounded-full border border-neutral-200 bg-white px-3 text-[10px] font-bold tracking-widest text-red-500 transition-colors hover:bg-red-50 hover:border-red-200"
                                  >
                                    Unpublish
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </main>

      </div>

      {/* Review Modal */}
      {reviewingSubmissionId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          {(() => {
            const sub = submissions.find(s => s.id === reviewingSubmissionId);
            if (!sub) return null;
            const emp = employees.find(e => e.name === sub.employee);
            const cert = certifications.find(c => c.title === sub.certification);
            
            return (
              <div className="w-[500px] rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
                <button 
                  onClick={() => setReviewingSubmissionId(null)}
                  className="absolute right-4 top-4 text-neutral-400 hover:text-black transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <h3 className="text-lg font-bold text-black">Review Submission</h3>
                <p className="mt-1 text-[11px] font-semibold text-neutral-500">
                  {sub.employee} — {sub.certification}
                </p>

                <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-neutral-50 p-4 text-xs">
                  <div>
                    <span className="block text-[10px] font-medium text-neutral-500 mb-0.5">Submitted:</span>
                    <span className="font-bold text-black">{sub.submitted}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-neutral-500 mb-0.5">Platform:</span>
                    <span className="font-bold text-black">{cert?.platform || "—"}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-neutral-500 mb-0.5">Credential URL:</span>
                    <a href="#" className="font-bold text-black underline flex items-center gap-1 hover:text-blue-600">
                      View Document ↗
                    </a>
                  </div>
                  <div>
                    <span className="block text-[10px] font-medium text-neutral-500 mb-0.5">Points on Approval:</span>
                    <span className="font-bold text-black">+{sub.points} pts</span>
                  </div>
                </div>

                <div className="mt-5">
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700 mb-2">
                    ADMIN NOTES (OPTIONAL)
                  </label>
                  <textarea 
                    className="w-full rounded-md border border-neutral-300 p-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400 min-h-[80px]"
                    placeholder="Leave a note for the employee..."
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <button 
                    onClick={() => {
                      handleApproveSubmission(sub.id);
                      setReviewingSubmissionId(null);
                      showToast("Submission approved successfully.", "success");
                    }}
                    className="flex-1 rounded-full bg-black py-2.5 text-[10px] font-bold tracking-widest text-white transition-colors hover:bg-neutral-800"
                  >
                    APPROVE & AWARD POINTS
                  </button>
                  <button 
                    onClick={() => {
                      handleRejectSubmission(sub.id);
                      setReviewingSubmissionId(null);
                      showToast("Submission rejected.", "error");
                    }}
                    className="flex-1 rounded-full border border-neutral-300 bg-white py-2.5 text-[10px] font-bold tracking-widest text-black transition-colors hover:bg-neutral-50"
                  >
                    REJECT
                  </button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

function CustomDropdown({
  options,
  value,
  onChange,
  placeholder = "Select...",
  className
}: {
  options: { label: string; value: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex h-10 w-full items-center justify-between rounded-md border ${isOpen ? 'border-black ring-1 ring-black' : 'border-neutral-300'} bg-white pl-3 pr-2.5 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${selectedOption ? 'text-black' : 'text-neutral-500'}`}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-neutral-300 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <li key={opt.value}>
              <button
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none ${opt.value === value ? "bg-neutral-100 font-bold text-black" : "font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-black"}`}
              >
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
