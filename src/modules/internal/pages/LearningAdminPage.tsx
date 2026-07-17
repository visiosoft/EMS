import { useState, useEffect, useRef, useCallback } from "react";
import { 
  LayoutGrid, PenSquare, Eye, Users, FileBadge, LogOut, 
  Check, X, Sparkles, Plus, AlertCircle, FolderOpen, 
  ChevronDown, Loader2
} from "lucide-react";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import {
  fetchLearningCertifications,
  fetchLearningSubmissions,
  fetchLearningEmployeeScores,
  fetchLearningOverview,
  fetchLearningPlatforms,
  fetchLearningDepartments,
  createLearningCertification,
  toggleLearningCertificationStatus,
  reviewLearningSubmission,
  type LearningCertification,
  type LearningSubmission,
  type LearningEmployeeScore,
  type LearningOverview,
  type LearningPlatform,
  type LearningDepartment,
} from "@/api/learningApi";

export function LearningAdminPage() {
  const { viewData, navigate } = useInternalNavigation();
  
  const [activeTab, setActiveTab] = useState<"overview" | "publish" | "monitor" | "scores" | "manage">(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("iae_admin_active_tab");
      if (saved === "overview" || saved === "publish" || saved === "monitor" || saved === "scores" || saved === "manage") return saved;
    }
    return "overview";
  });

  const [activeDept, setActiveDept] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("iae_admin_active_dept");
      if (saved) return saved;
    }
    return viewData?.fromTitle || "";
  });

  // Data state
  const [overview, setOverview] = useState<LearningOverview | null>(null);
  const [submissions, setSubmissions] = useState<LearningSubmission[]>([]);
  const [certifications, setCertifications] = useState<LearningCertification[]>([]);
  const [employees, setEmployees] = useState<LearningEmployeeScore[]>([]);
  const [platforms, setPlatforms] = useState<LearningPlatform[]>([]);
  const [departments, setDepartments] = useState<{ id: number; name: string }[]>([]);

  const activeDeptId = departments.find((d) => d.name === activeDept)?.id || departments[0]?.id || 0;

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("iae_admin_active_tab", activeTab);
      localStorage.setItem("iae_admin_active_dept", activeDept);
    }
  }, [activeTab, activeDept]);

  // Loading states
  const [isLoadingOverview, setIsLoadingOverview] = useState(false);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState(false);
  const [isLoadingCerts, setIsLoadingCerts] = useState(false);
  const [isLoadingScores, setIsLoadingScores] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t); } }, [toast]);
  const showToast = (message: string, type: "success" | "info" | "error" = "success") => setToast({ message, type });

  // Monitor filters
  const [monitorSearch, setMonitorSearch] = useState("");
  const [monitorStatus, setMonitorStatus] = useState("");

  // Review modal
  const [reviewingSubmission, setReviewingSubmission] = useState<LearningSubmission | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // Publish form
  const [formName, setFormName] = useState("");
  const [formPlatform, setFormPlatform] = useState("");
  const [formPoints, setFormPoints] = useState("");
  const [formLevel, setFormLevel] = useState("Beginner");
  const [formDuration, setFormDuration] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formTags, setFormTags] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDepartment, setFormDepartment] = useState(String(activeDeptId));
  const [isPublishing, setIsPublishing] = useState(false);

  // Load platforms & departments once
  useEffect(() => {
    fetchLearningPlatforms().then(setPlatforms).catch(console.error);
    fetchLearningDepartments()
      .then((depts) => {
        const mapped = depts.map((d) => ({ id: d.departmentId, name: d.departmentName }));
        setDepartments(mapped);
        // Set activeDept to first department if not already set
        if (!activeDept && mapped.length > 0) {
          setActiveDept(mapped[0].name);
        }
        // Set default formDepartment to the active department or first available
        const match = mapped.find((d) => d.name === activeDept);
        if (match) setFormDepartment(String(match.id));
        else if (mapped.length > 0) setFormDepartment(String(mapped[0].id));
      })
      .catch(console.error);
  }, []);

  // Load data per tab
  const loadOverview = useCallback(async () => {
    setIsLoadingOverview(true);
    try {
      const [ov, subs] = await Promise.all([
        fetchLearningOverview(activeDeptId),
        fetchLearningSubmissions({ departmentId: activeDeptId }),
      ]);
      setOverview(ov);
      setSubmissions(subs);
    } catch (e) { console.error(e); }
    finally { setIsLoadingOverview(false); }
  }, [activeDeptId]);

  const loadSubmissions = useCallback(async () => {
    setIsLoadingSubmissions(true);
    try {
      const subs = await fetchLearningSubmissions({
        departmentId: activeDeptId,
        status: monitorStatus || undefined,
        search: monitorSearch || undefined,
      });
      setSubmissions(subs);
    } catch (e) { console.error(e); }
    finally { setIsLoadingSubmissions(false); }
  }, [activeDeptId, monitorStatus, monitorSearch]);

  const loadCertifications = useCallback(async () => {
    setIsLoadingCerts(true);
    try {
      const certs = await fetchLearningCertifications({ departmentId: activeDeptId });
      setCertifications(certs);
    } catch (e) { console.error(e); }
    finally { setIsLoadingCerts(false); }
  }, [activeDeptId]);

  const loadEmployeeScores = useCallback(async () => {
    setIsLoadingScores(true);
    try {
      const emps = await fetchLearningEmployeeScores(activeDeptId);
      setEmployees(emps);
    } catch (e) { console.error(e); }
    finally { setIsLoadingScores(false); }
  }, [activeDeptId]);

  useEffect(() => {
    if (activeTab === "overview") loadOverview();
    else if (activeTab === "monitor") loadSubmissions();
    else if (activeTab === "manage") loadCertifications();
    else if (activeTab === "scores") loadEmployeeScores();
  }, [activeTab, activeDeptId, loadOverview, loadSubmissions, loadCertifications, loadEmployeeScores]);

  // Reload monitor when filters change
  useEffect(() => {
    if (activeTab === "monitor") loadSubmissions();
  }, [monitorSearch, monitorStatus]);

  const pendingCount = submissions.filter((s) => s.status === "PENDING").length;

  // ─── Actions ────────────────────────────────────────────────────────────
  const handleApprove = async (sub: LearningSubmission) => {
    setIsReviewing(true);
    try {
      await reviewLearningSubmission(sub.submissionId, { action: "VERIFIED", adminNotes: reviewNotes || undefined });
      showToast(`Approved certification for ${sub.employeeName}. +${sub.pointsAwarded || "?"} pts awarded!`);
      setReviewingSubmission(null);
      setReviewNotes("");
      loadSubmissions();
      if (activeTab === "overview") loadOverview();
    } catch (e) { showToast("Failed to approve", "error"); }
    finally { setIsReviewing(false); }
  };

  const handleReject = async (sub: LearningSubmission) => {
    setIsReviewing(true);
    try {
      await reviewLearningSubmission(sub.submissionId, { action: "REJECTED", adminNotes: reviewNotes || undefined });
      showToast(`Rejected submission from ${sub.employeeName}.`, "error");
      setReviewingSubmission(null);
      setReviewNotes("");
      loadSubmissions();
    } catch (e) { showToast("Failed to reject", "error"); }
    finally { setIsReviewing(false); }
  };

  const handlePublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) { showToast("Certification Title is required", "error"); return; }
    if (!formPlatform) { showToast("Platform / Issuer is required", "error"); return; }
    if (!formUrl.trim()) { showToast("External Course URL is required", "error"); return; }
    if (!formDepartment || Number(formDepartment) === 0) { showToast("Department is required", "error"); return; }

    setIsPublishing(true);
    try {
      const payload = {
        title: formName.trim(),
        platformId: Number(formPlatform),
        departmentId: Number(formDepartment),
        difficultyLevel: formLevel,
        pointsAwarded: parseInt(formPoints) || 0,
        estimatedDuration: formDuration.trim() || undefined,
        externalCourseUrl: formUrl.trim(),
        description: formDescription.trim() || undefined,
        tags: formTags.trim() || undefined,
      };
      console.log('[DEBUG] Publishing certification payload:', JSON.stringify(payload));
      await createLearningCertification(payload);
      showToast("Successfully published certification!");
      setFormName(""); setFormPlatform(""); setFormPoints(""); setFormLevel("Beginner");
      setFormDuration(""); setFormUrl(""); setFormTags(""); setFormDescription(""); setFormDepartment(String(activeDeptId));
      setActiveTab("manage");
    } catch (e) { showToast("Failed to publish certification", "error"); }
    finally { setIsPublishing(false); }
  };

  const handleToggleStatus = async (certId: number) => {
    try {
      const result = await toggleLearningCertificationStatus(certId);
      showToast(`Certification is now ${result.status.toLowerCase()}.`, "info");
      loadCertifications();
    } catch (e) { showToast("Failed to update status", "error"); }
  };

  const handleExitAdmin = () => {
    if (window.opener || window.history.length === 1) window.close();
    else window.location.href = "/internal";
  };

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-[100dvh] bg-neutral-50 font-sans text-neutral-900 select-none">
      
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[999] flex items-center gap-3 rounded-lg px-4 py-3 shadow-xl animate-in fade-in slide-in-from-top-4 duration-300 bg-white border border-neutral-200">
          <div className={`h-2.5 w-2.5 rounded-full ${toast.type === "success" ? "bg-emerald-500" : toast.type === "error" ? "bg-red-500" : "bg-blue-500"}`} />
          <span className="text-xs font-bold text-neutral-800">{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <header className="flex h-14 w-full shrink-0 items-center justify-between bg-black px-6 text-white border-b border-white/10 z-50">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-[0.15em] text-white/70">
            IAE <span className="mx-1 text-white/40">•</span> ADMIN PANEL
          </span>
        </div>
        <div className="flex items-center gap-8">
          <button onClick={() => { window.location.href = "/internal?view=departments"; }} className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">
            Back to Departments
          </button>
          <button onClick={() => { window.location.href = `/internal?view=learning-portal&fromTitle=${encodeURIComponent(activeDept)}`; }} className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 hover:text-white transition-colors">
            User Portal Preview
          </button>
        </div>
        <div>
          <button onClick={handleExitAdmin} className="flex items-center gap-1.5 rounded-full border border-white/20 hover:border-white/40 bg-white/5 hover:bg-white/10 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors">
            <LogOut className="h-3.5 w-3.5 text-white/80" />
            <span>Exit Admin</span>
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Sidebar */}
        <aside className="w-[260px] bg-[#0b0b0b] text-white flex flex-col shrink-0">
          <div className="flex flex-1 flex-col overflow-y-auto px-4 pb-6 pt-6">
            <div className="mb-3 px-2 text-[10px] font-bold uppercase tracking-wider text-white/40">Learning Admin</div>
            <nav className="space-y-1">
              {([
                { key: "overview" as const, icon: LayoutGrid, label: "Overview" },
                { key: "publish" as const, icon: PenSquare, label: "Publish Certification" },
                { key: "monitor" as const, icon: Eye, label: "Monitor Submissions" },
                { key: "scores" as const, icon: Users, label: "Employee Scores" },
                { key: "manage" as const, icon: FileBadge, label: "Manage Certifications" },
              ]).map((item) => (
                <button
                  key={item.key}
                  onClick={() => setActiveTab(item.key)}
                  className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                    activeTab === item.key ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  <div className="relative">
                    <item.icon className="h-4 w-4" />
                    {item.key === "monitor" && pendingCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-2 w-2 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <span>{item.label}</span>
                  {item.key === "monitor" && pendingCount > 0 && (
                    <span className="ml-auto rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-500">{pendingCount}</span>
                  )}
                </button>
              ))}
            </nav>

            <div className="mt-8 mb-3 px-2 text-[10px] font-bold uppercase tracking-wider text-white/40">Department</div>
            <nav className="space-y-1">
              {departments.map((dept) => (
                <button
                  key={dept.id}
                  onClick={() => { setActiveDept(dept.name); showToast(`Switched to ${dept.name}.`, "info"); }}
                  className={`flex w-full items-center px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                    activeDept === dept.name ? "text-[#cfa86e] bg-[#cfa86e]/10" : "text-white/60 hover:bg-white/5 hover:text-white"
                  }`}
                >
                  {dept.name}
                </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-neutral-50">
          <div className="w-full p-8 lg:p-12">
            
            {/* Header */}
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
                <button onClick={() => setActiveTab("publish")} className="flex items-center gap-2 rounded-full bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-black shadow-sm ring-1 ring-inset ring-neutral-200 hover:bg-neutral-50">
                  <Plus className="h-3.5 w-3.5 text-neutral-500" /><span>Publish Certification</span>
                </button>
              )}
              {activeTab === "manage" && (
                <button onClick={() => setActiveTab("publish")} className="flex items-center gap-1.5 rounded-full bg-black px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-white hover:bg-neutral-800">
                  <Plus className="h-3.5 w-3.5" /><span>ADD NEW</span>
                </button>
              )}
              {activeTab === "monitor" && (
                <div className="w-[160px]">
                  <CustomDropdown
                    value={monitorStatus}
                    onChange={setMonitorStatus}
                    options={[
                      { label: "All Statuses", value: "" },
                      { label: "PENDING", value: "PENDING" },
                      { label: "VERIFIED", value: "VERIFIED" },
                      { label: "REJECTED", value: "REJECTED" }
                    ]}
                  />
                </div>
              )}
            </div>

            {/* ═══ OVERVIEW ═══ */}
            {activeTab === "overview" && (
              <div className="space-y-8 animate-in fade-in duration-200">
                {isLoadingOverview ? (
                  <div className="flex min-h-[120px] items-center justify-center rounded-xl border border-neutral-200 bg-white shadow-sm">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
                  <>
                    <div className="grid gap-6 md:grid-cols-3">
                      <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Employees</span>
                        <span className="mt-1 text-3xl font-black text-black">{overview?.totalEmployees ?? 0}</span>
                        <span className="mt-1 text-xs font-medium text-neutral-400">in this department</span>
                      </div>
                      <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Active Certifications</span>
                        <span className="mt-1 text-3xl font-black text-black">{overview?.activeCertifications ?? 0}</span>
                        <span className="mt-1 text-xs font-medium text-neutral-400">published & live</span>
                      </div>
                      <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Submissions</span>
                        <span className="mt-1 text-3xl font-black text-black">{overview?.totalSubmissions ?? 0}</span>
                        <span className="mt-1 text-xs font-medium text-neutral-400">
                          {(overview?.pendingSubmissions ?? 0) > 0 ? `${overview!.pendingSubmissions} pending review` : "all caught up"}
                        </span>
                      </div>
                    </div>

                    <div className="rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
                      <div className="p-6 border-b border-neutral-100">
                        <h2 className="text-base font-bold text-black">Recent Activity</h2>
                        <p className="mt-1 text-xs text-neutral-500">Latest submissions and status changes</p>
                      </div>
                      <div className="overflow-x-auto">
                        {submissions.length === 0 ? (
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
                              {submissions.slice(0, 10).map((sub) => (
                                <tr key={sub.submissionId} className="hover:bg-neutral-50/50 transition-colors">
                                  <td className="whitespace-nowrap px-6 py-4 font-bold text-black">
                                    <button type="button" onClick={() => navigate('employee-profile', { contactId: sub.contactId })} className="hover:text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm transition-colors">
                                      {sub.employeeName}
                                    </button>
                                  </td>
                                  <td className="px-6 py-4 font-semibold text-neutral-900">{sub.certificationName}</td>
                                  <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-900">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                  <td className="whitespace-nowrap px-6 py-4"><StatusBadge status={sub.status} /></td>
                                  <td className="whitespace-nowrap px-6 py-4 font-bold text-neutral-900">
                                    {sub.status === "REJECTED" ? "—" : `+${sub.pointsAwarded}`}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* ═══ PUBLISH ═══ */}
            {activeTab === "publish" && (
              <div className="w-full bg-white rounded-xl border border-neutral-200 p-8 shadow-sm animate-in fade-in duration-200">
                <div className="mb-1">
                  <h2 className="text-sm font-bold text-neutral-900">Certification Details</h2>
                  <p className="text-[11px] text-neutral-500 mt-0.5">This certification will appear in the department's Learning Portal.</p>
                </div>
                <div className="border-b border-neutral-100 my-6" />
                
                <form onSubmit={handlePublish} className="space-y-6">
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Certification Title *</label>
                    <input type="text" required value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="e.g. Adobe Certified Professional – Visual Design" className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" />
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Platform / Issuer *</label>
                      <CustomDropdown
                        placeholder="Select platform..."
                        value={formPlatform}
                        onChange={setFormPlatform}
                        options={platforms.map((p) => ({ label: p.platformName, value: String(p.platformId) }))}
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Points Awarded *</label>
                      <input type="number" required value={formPoints} onChange={(e) => setFormPoints(e.target.value)} placeholder="e.g. 120" className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" />
                    </div>
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Difficulty Level</label>
                      <CustomDropdown value={formLevel} onChange={setFormLevel} options={[
                        { label: "Beginner", value: "Beginner" },
                        { label: "Intermediate", value: "Intermediate" },
                        { label: "Advanced", value: "Advanced" },
                      ]} />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Estimated Duration</label>
                      <input type="text" value={formDuration} onChange={(e) => setFormDuration(e.target.value)} placeholder="e.g. 40 hrs / 6 months" className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">External Course URL *</label>
                    <input type="url" required value={formUrl} onChange={(e) => setFormUrl(e.target.value)} placeholder="https://..." className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" />
                  </div>
                  <div>
                    <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Short Description</label>
                    <textarea value={formDescription} onChange={(e) => setFormDescription(e.target.value)} placeholder="A brief description..." className="h-20 w-full rounded-md border border-neutral-300 p-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" />
                  </div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Tags (comma-separated)</label>
                      <input type="text" value={formTags} onChange={(e) => setFormTags(e.target.value)} placeholder="e.g. Design Tools, Branding, UX" className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-300" />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-wider text-neutral-700">Assign to Department</label>
                      <CustomDropdown value={formDepartment} onChange={setFormDepartment} options={departments.map((d) => ({ label: d.name, value: String(d.id) }))} />
                    </div>
                  </div>
                  <div className="pt-4 flex items-center gap-3">
                    <button type="submit" disabled={isPublishing} className="flex h-9 items-center justify-center gap-2 rounded-full bg-black px-5 text-[10px] font-bold tracking-widest text-white hover:bg-neutral-800 disabled:opacity-50">
                      {isPublishing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      PUBLISH CERTIFICATION
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* ═══ MONITOR ═══ */}
            {activeTab === "monitor" && (
              <div className="animate-in fade-in duration-200">
                <div className="mb-6 flex items-center gap-3">
                  <div className="w-[260px]">
                    <input type="text" placeholder="Search employee or certification" value={monitorSearch} onChange={(e) => setMonitorSearch(e.target.value)} className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400 bg-white" />
                  </div>
                </div>

                {isLoadingSubmissions ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-white">
                    <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                  </div>
                ) : (
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
                          {submissions.length === 0 ? (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-neutral-400 text-xs font-semibold">No submissions match your filters.</td></tr>
                          ) : (
                            submissions.map((sub) => (
                              <tr key={sub.submissionId} className="hover:bg-neutral-50/55 transition-colors">
                                <td className="px-6 py-4">
                                  <button type="button" onClick={() => navigate('employee-profile', { contactId: sub.contactId })} className="font-bold text-black hover:text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm transition-colors">
                                    {sub.employeeName}
                                  </button>
                                  <div className="text-[11px] font-semibold text-neutral-500 mt-0.5">{sub.employeeRole || "Employee"}</div>
                                </td>
                                <td className="px-6 py-4 font-semibold text-neutral-900">{sub.certificationName}</td>
                                <td className="px-6 py-4 font-semibold text-neutral-700">{sub.platformName || "—"}</td>
                                <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-900">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                                <td className="whitespace-nowrap px-6 py-4"><StatusBadge status={sub.status} /></td>
                                <td className="whitespace-nowrap px-6 py-4 font-bold text-black">
                                  {sub.status === "REJECTED" ? "—" : `+${sub.pointsAwarded}`}
                                </td>
                                <td className="whitespace-nowrap px-6 py-4">
                                  {sub.status === "PENDING" ? (
                                    <div className="flex gap-2">
                                      <button onClick={() => handleApprove(sub)} className="flex h-7 items-center justify-center rounded-full bg-black px-3 text-[10px] font-bold tracking-widest text-white hover:bg-neutral-800">
                                        APPROVE
                                      </button>
                                      <button onClick={() => { setReviewingSubmission(sub); setReviewNotes(""); }} className="flex h-7 items-center justify-center rounded-full border border-neutral-200 bg-white px-3 text-[10px] font-bold tracking-widest text-neutral-500 hover:bg-neutral-50 hover:text-black">
                                        Review
                                      </button>
                                    </div>
                                  ) : (
                                    <button onClick={() => setReviewingSubmission(sub)} className="flex h-7 items-center justify-center rounded-full border border-neutral-200 bg-white px-3 text-[10px] font-bold tracking-widest text-neutral-500 hover:bg-neutral-50 hover:text-black">
                                      View
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ EMPLOYEE SCORES ═══ */}
            {activeTab === "scores" && (
              <div className="animate-in fade-in duration-200">
                {isLoadingScores ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-white"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>
                ) : (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
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
                          {employees.map((emp) => (
                            <tr key={emp.contactId} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="whitespace-nowrap px-6 py-4 font-bold text-black">
                                <button type="button" onClick={() => navigate('employee-profile', { contactId: emp.contactId })} className="hover:text-blue-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 rounded-sm transition-colors">
                                  {emp.employeeName}
                                </button>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-900">{emp.employeeRole || "—"}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-900">{emp.certsSubmitted}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-900">{emp.certsApproved}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-black text-black">{emp.totalPoints}</td>
                              <td className="whitespace-nowrap px-6 py-4"><TierBadge tier={emp.currentTier} points={emp.totalPoints} /></td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-700">{emp.lastActivityAt ? new Date(emp.lastActivityAt).toLocaleDateString() : "—"}</td>
                            </tr>
                          ))}
                          {employees.length === 0 && (
                            <tr><td colSpan={7} className="px-6 py-12 text-center text-neutral-400 text-xs font-semibold">No employee scores found for this department.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══ MANAGE CERTIFICATIONS ═══ */}
            {activeTab === "manage" && (
              <div className="animate-in fade-in duration-200">
                {isLoadingCerts ? (
                  <div className="flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-white"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>
                ) : (
                  <div className="bg-white rounded-xl border border-neutral-200 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-neutral-200 bg-neutral-50/50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                            <th className="px-6 py-4">Certification</th>
                            <th className="px-6 py-4">Platform</th>
                            <th className="px-6 py-4">Points</th>
                            <th className="px-6 py-4">Level</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                          {certifications.map((cert) => (
                            <tr key={cert.certificationId} className="hover:bg-neutral-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-black">{cert.title}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-700">{cert.platformName}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-black text-black">+{cert.pointsAwarded}</td>
                              <td className="whitespace-nowrap px-6 py-4 font-semibold text-neutral-700">{cert.difficultyLevel}</td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold tracking-widest ${
                                  cert.status === "Active" ? "bg-neutral-100 text-black" : "bg-red-50 text-red-600"
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${cert.status === "Active" ? "bg-emerald-500" : "bg-red-400"}`} />
                                  {cert.status === "Active" ? "LIVE" : "ARCHIVED"}
                                </span>
                              </td>
                              <td className="whitespace-nowrap px-6 py-4">
                                <button
                                  onClick={() => handleToggleStatus(cert.certificationId)}
                                  className={`flex h-7 items-center justify-center rounded-full border px-3 text-[10px] font-bold tracking-widest transition-colors ${
                                    cert.status === "Active"
                                      ? "border-neutral-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-200"
                                      : "border-neutral-200 bg-white text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200"
                                  }`}
                                >
                                  {cert.status === "Active" ? "Unpublish" : "Republish"}
                                </button>
                              </td>
                            </tr>
                          ))}
                          {certifications.length === 0 && (
                            <tr><td colSpan={6} className="px-6 py-12 text-center text-neutral-400 text-xs font-semibold">No certifications published yet.</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>

      {/* Review Modal */}
      {reviewingSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[500px] rounded-xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-200 relative">
            <button onClick={() => setReviewingSubmission(null)} className="absolute right-4 top-4 text-neutral-400 hover:text-black transition-colors">
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-lg font-bold text-black">Review Submission</h3>
            <p className="mt-1 text-[11px] font-semibold text-neutral-500">{reviewingSubmission.employeeName} — {reviewingSubmission.certificationName}</p>

            <div className="mt-5 grid grid-cols-2 gap-4 rounded-lg bg-neutral-50 p-4 text-xs">
              <div>
                <span className="block text-[10px] font-medium text-neutral-500 mb-0.5">Submitted:</span>
                <span className="font-bold text-black">{new Date(reviewingSubmission.submittedAt).toLocaleDateString()}</span>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-neutral-500 mb-0.5">Platform:</span>
                <span className="font-bold text-black">{reviewingSubmission.platformName || "—"}</span>
              </div>
              <div>
                <span className="block text-[10px] font-medium text-neutral-500 mb-0.5">Credential URL:</span>
                {reviewingSubmission.credentialUrl ? (
                  <a href={reviewingSubmission.credentialUrl} target="_blank" rel="noreferrer" className="font-bold text-black underline hover:text-blue-600">View Document ↗</a>
                ) : <span className="font-bold text-black">—</span>}
              </div>
              <div>
                <span className="block text-[10px] font-medium text-neutral-500 mb-0.5">Points on Approval:</span>
                <span className="font-bold text-black">+{reviewingSubmission.pointsAwarded} pts</span>
              </div>
            </div>

            <div className="mt-5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-700 mb-2">ADMIN NOTES (OPTIONAL)</label>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                className="w-full rounded-md border border-neutral-300 p-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black placeholder:text-neutral-400 min-h-[80px]"
                placeholder="Leave a note for the employee..."
              />
            </div>

            {reviewingSubmission.status === "PENDING" && (
              <div className="mt-6 flex gap-3">
                <button disabled={isReviewing} onClick={() => handleApprove(reviewingSubmission)} className="flex-1 items-center justify-center gap-2 rounded-full bg-black py-2.5 text-[10px] font-bold tracking-widest text-white hover:bg-neutral-800 disabled:opacity-50 flex">
                  {isReviewing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  APPROVE & AWARD POINTS
                </button>
                <button disabled={isReviewing} onClick={() => handleReject(reviewingSubmission)} className="flex-1 items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white py-2.5 text-[10px] font-bold tracking-widest text-black hover:bg-neutral-50 disabled:opacity-50 flex">
                  {isReviewing && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  REJECT
                </button>
              </div>
            )}
            {reviewingSubmission.status !== "PENDING" && (
              <div className="mt-6 flex justify-end">
                <button onClick={() => setReviewingSubmission(null)} className="rounded-full bg-black px-6 py-2.5 text-[10px] font-bold tracking-widest text-white hover:bg-neutral-800">CLOSE</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function StatusBadge({ status }: { status: string }) {
  if (status === "PENDING") return <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-inset ring-amber-600/20">⏳ PENDING</span>;
  if (status === "VERIFIED") return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">✓ VERIFIED</span>;
  return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 ring-1 ring-inset ring-red-600/10">❌ REJECTED</span>;
}

function TierBadge({ tier, points }: { tier: string; points: number }) {
  if (tier === "Platinum" || points >= 600) return <span className="inline-flex items-center gap-1 rounded-full bg-black px-2.5 py-1 text-[10px] font-bold tracking-widest text-white">💎 PLATINUM</span>;
  if (tier === "Gold" || points >= 400) return <span className="inline-flex items-center gap-1 rounded-full bg-[#fdf8e6] px-2.5 py-1 text-[10px] font-bold tracking-widest text-[#a88210]">🏆 GOLD</span>;
  if (tier === "Silver" || points >= 200) return <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold tracking-widest text-slate-700">🥈 SILVER</span>;
  if (tier === "Bronze" || points >= 100) return <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold tracking-widest text-orange-800">🥉 BRONZE</span>;
  return <span className="text-xs font-semibold text-neutral-400">— Unranked</span>;
}

function CustomDropdown({
  options, value, onChange, placeholder = "Select...", className
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
    const onDocClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setIsOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedOption = options.find((o) => o.value === value);

  return (
    <div ref={ref} className={`relative ${className || ""}`}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className={`flex h-10 w-full items-center justify-between rounded-md border ${isOpen ? 'border-black ring-1 ring-black' : 'border-neutral-300'} bg-white pl-3 pr-2.5 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black ${selectedOption ? 'text-black' : 'text-neutral-500'}`}>
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>
      {isOpen && (
        <ul className="absolute left-0 right-0 z-50 mt-1 max-h-72 overflow-y-auto rounded-md border border-neutral-300 bg-white py-1 shadow-lg">
          {options.map((opt) => (
            <li key={opt.value}>
              <button type="button" onClick={() => { onChange(opt.value); setIsOpen(false); }} className={`flex w-full items-center px-3 py-2 text-left text-sm transition-colors focus-visible:outline-none ${opt.value === value ? "bg-neutral-100 font-bold text-black" : "font-semibold text-neutral-700 hover:bg-neutral-50 hover:text-black"}`}>
                {opt.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
