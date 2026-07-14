import { ChevronRight, Medal, ArrowLeft, ChevronDown, Loader2, Paperclip, Plus, Star, User, AlertTriangle, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { UrgentUpcomingSection } from "../components/UrgentUpcomingSection";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import { apiFetch } from "@/api/config";
import {
  fetchLearningCertifications,
  fetchLearningPlatforms,
  fetchLearningSubmissions,
  fetchMyLearningScore,
  fetchLearningProgress,
  fetchLearningEmployeeScores,
  fetchLearningPointTiers,
  createLearningSubmission,
  type LearningCertification,
  type LearningPlatform,
  type LearningSubmission,
  type LearningMyScore,
  type LearningProgressResponse,
  type LearningEmployeeScore,
  type LearningPointTier,
} from "@/api/learningApi";
import { fetchMyProfile } from "@/api/myProfileApi";

export function LearningPortalPage() {
  const { navigate, viewData } = useInternalNavigation();
  const departmentName = viewData?.fromTitle || "";
  const departmentView = viewData?.fromView || "departments";
  const [departmentId, setDepartmentId] = useState<number | null>(viewData?.departmentId || null);

  // Resolve departmentId by name if not provided in viewData
  useEffect(() => {
    if (viewData?.departmentId) {
      setDepartmentId(viewData.departmentId);
      return;
    }
    if (departmentName) {
      apiFetch<{ departmentId: number; departmentName: string }[]>('/lookups/departments')
        .then((depts) => {
          const match = depts.find((d) => d.departmentName === departmentName);
          if (match) setDepartmentId(match.departmentId);
        })
        .catch(console.error);
    }
  }, [departmentName, viewData?.departmentId]);

  const [currentContactId, setCurrentContactId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("BROWSE");
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  // Shared data from API
  const [myScore, setMyScore] = useState<LearningMyScore | null>(null);
  const [progress, setProgress] = useState<LearningProgressResponse | null>(null);

  useEffect(() => {
    if (!departmentId) return;
    const load = async () => {
      try {
        const profile = await fetchMyProfile();
        setCurrentContactId(profile.contactId);
        const [score, prog] = await Promise.all([
          fetchMyLearningScore(profile.contactId, departmentId),
          fetchLearningProgress(profile.contactId, departmentId),
        ]);
        setMyScore(score);
        setProgress(prog);
      } catch (e) {
        console.error("Failed to load learning portal data:", e);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [departmentId]);

  const handleTabChange = (newTab: string) => {
    if (activeTab === "SUBMIT" && isDirty && newTab !== "SUBMIT") {
      setPendingTab(newTab);
      setShowDiscardAlert(true);
      return;
    }
    setActiveTab(newTab);
  };

  const refreshMyData = useCallback(async () => {
    if (!currentContactId || !departmentId) return;
    const [score, prog] = await Promise.all([
      fetchMyLearningScore(currentContactId, departmentId),
      fetchLearningProgress(currentContactId, departmentId),
    ]);
    setMyScore(score);
    setProgress(prog);
  }, [currentContactId, departmentId]);

  return (
    <InternalPageFrame footer={<UrgentUpcomingSection pinned />}>
      {/* Header Section */}
      <section
        className="relative isolate overflow-hidden bg-[#0b080c] px-4 py-8 text-white sm:px-8 sm:py-10 lg:px-10"
        style={{
          backgroundImage: "url('/internal-hub-bg.svg')",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
        }}
      >
        <div className="mx-auto mb-6 max-w-[1120px]">
          <button
            onClick={() => navigate(departmentView, departmentId ? { departmentId } : undefined)}
            className="flex items-center text-sm font-semibold text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to {departmentName}
          </button>
        </div>
        <div className="mx-auto flex max-w-[1120px] flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <h1 className="mt-4 text-[clamp(2rem,6vw,3.5rem)] font-bold leading-tight tracking-[-0.025em] text-white">
              Learning &<br />
              Certifications
            </h1>
            <p className="mt-4 text-sm font-semibold text-neutral-300 sm:text-base">
              {departmentName} Department — Earn points by completing certified courses
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-center justify-center rounded-lg bg-white px-8 py-5 text-black">
            <div className="text-4xl font-black leading-none">{myScore?.totalPoints ?? 0}</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-neutral-500">
              Your Points
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
              <Medal className="h-4 w-4 text-amber-500" />
              Rank #{myScore?.rank ?? "—"} in Dept
            </div>
          </div>
        </div>
      </section>

      {/* Progress Section */}
      <section className="border-b border-neutral-200 bg-white px-4 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1120px]">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
            <span>Certification Progress — {progress?.summary.completed ?? 0} of {progress?.summary.total ?? 0} completed</span>
            <span className="font-bold text-neutral-900">{progress?.summary.percent ?? 0}%</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-black" style={{ width: `${progress?.summary.percent ?? 0}%` }} />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto max-w-[1120px] px-4 py-8 sm:px-8 lg:px-0">
        {/* Tabs */}
        <div className="flex space-x-8 overflow-x-auto border-b border-neutral-200 text-sm font-bold [scrollbar-width:none]">
          <button
            onClick={() => handleTabChange("BROWSE")}
            className={`pb-4 transition-colors ${activeTab === "BROWSE" ? "border-b-2 border-black text-black" : "text-neutral-400 hover:text-black"}`}
          >
            BROWSE CERTIFICATIONS
          </button>
          <button
            onClick={() => handleTabChange("SUBMIT")}
            className={`pb-4 transition-colors ${activeTab === "SUBMIT" ? "border-b-2 border-black text-black" : "text-neutral-400 hover:text-black"}`}
          >
            SUBMIT CERTIFICATE
          </button>
          <button
            onClick={() => handleTabChange("MY")}
            className={`pb-4 transition-colors ${activeTab === "MY" ? "border-b-2 border-black text-black" : "text-neutral-400 hover:text-black"}`}
          >
            MY CERTIFICATES
          </button>
          <button
            onClick={() => handleTabChange("LEADERBOARD")}
            className={`pb-4 transition-colors ${activeTab === "LEADERBOARD" ? "border-b-2 border-black text-black" : "text-neutral-400 hover:text-black"}`}
          >
            LEADERBOARD
          </button>
        </div>

        {activeTab === "BROWSE" && departmentId && (
          <BrowseCertifications departmentId={departmentId} />
        )}
        
        {activeTab === "SUBMIT" && currentContactId && departmentId && (
          <SubmitCertificate
            departmentId={departmentId}
            contactId={currentContactId}
            setIsDirty={setIsDirty}
            onSubmitted={refreshMyData}
          />
        )}
        
        {activeTab === "MY" && currentContactId && departmentId && (
          <MyCertificates
            departmentId={departmentId}
            contactId={currentContactId}
            myScore={myScore}
            progress={progress}
            onNavigateToSubmit={() => handleTabChange("SUBMIT")}
          />
        )}
        
        {activeTab === "LEADERBOARD" && departmentId && (
          <Leaderboard departmentId={departmentId} departmentName={departmentName} myScore={myScore} currentContactId={currentContactId} />
        )}
      </main>

      {showDiscardAlert && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-bold text-black">Discard changes?</h3>
            <p className="mt-2 text-sm font-medium text-neutral-500">
              You have unsaved information in your certificate submission. If you leave this tab, your progress will be lost.
            </p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setShowDiscardAlert(false);
                  setPendingTab(null);
                }}
                className="rounded-md border border-neutral-200 px-4 py-2 text-sm font-bold text-neutral-600 transition-colors hover:bg-neutral-50 hover:text-black"
              >
                Stay
              </button>
              <button
                onClick={() => {
                  setIsDirty(false);
                  setShowDiscardAlert(false);
                  if (pendingTab) setActiveTab(pendingTab);
                }}
                className="rounded-md bg-black px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-neutral-800"
              >
                Discard
              </button>
            </div>
          </div>
        </div>
      )}
    </InternalPageFrame>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM DROPDOWN
// ═══════════════════════════════════════════════════════════════════════════
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
      if (!ref.current?.contains(e.target as Node)) setIsOpen(false);
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
                onClick={() => { onChange(opt.value); setIsOpen(false); }}
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

// ═══════════════════════════════════════════════════════════════════════════
// BROWSE CERTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════
function BrowseCertifications({ departmentId }: { departmentId: number }) {
  const [level, setLevel] = useState("all");
  const [platform, setPlatform] = useState("all");
  const [certifications, setCertifications] = useState<LearningCertification[]>([]);
  const [platforms, setPlatforms] = useState<LearningPlatform[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchLearningPlatforms().then(setPlatforms).catch(console.error);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    fetchLearningCertifications({
      departmentId,
      status: "Active",
      level: level !== "all" ? level : undefined,
      platformId: platform !== "all" ? Number(platform) : undefined,
    })
      .then(setCertifications)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [departmentId, level, platform]);

  return (
    <>
      <div className="mt-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-xl font-bold text-black">Available Certifications</h2>
          <p className="mt-1 text-sm font-medium text-neutral-500">
            Published by your department admin — click any card to access the external course
          </p>
        </div>
        <div className="flex gap-3">
          <CustomDropdown 
            className="min-w-[120px]"
            value={level}
            onChange={setLevel}
            options={[
              { label: "All Levels", value: "all" },
              { label: "Beginner", value: "Beginner" },
              { label: "Intermediate", value: "Intermediate" },
              { label: "Advanced", value: "Advanced" }
            ]}
          />
          <CustomDropdown 
            className="min-w-[140px]"
            value={platform}
            onChange={setPlatform}
            options={[
              { label: "All Platforms", value: "all" },
              ...platforms.map((p) => ({ label: p.platformName, value: String(p.platformId) }))
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
        </div>
      ) : certifications.length === 0 ? (
        <div className="mt-10 flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50 text-neutral-400">
          <span className="text-sm font-semibold">No certifications found</span>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {certifications.map((cert) => (
            <div
              key={cert.certificationId}
              className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_36px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center justify-between bg-black px-4 py-3 text-xs font-bold text-white">
                <span className="uppercase tracking-wider">{cert.platformName}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-black">
                  +{cert.pointsAwarded} pts
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-bold leading-tight text-black">{cert.title}</h3>
                <p className="mt-2 text-sm text-neutral-500">{cert.description}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
                    {cert.difficultyLevel}
                  </span>
                  {cert.estimatedDuration && (
                    <span className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
                      {cert.estimatedDuration}
                    </span>
                  )}
                  {cert.tags.map((tag) => (
                    <span key={tag} className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-auto pt-6 flex items-center gap-3">
                  <a
                    href={cert.externalCourseUrl || "#"}
                    target="_blank"
                    rel="noreferrer"
                    className="flex h-10 items-center justify-center rounded-md bg-black px-4 text-xs font-bold tracking-wider text-white transition-colors hover:bg-neutral-800"
                  >
                    ACCESS COURSE
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SUBMIT CERTIFICATE
// ═══════════════════════════════════════════════════════════════════════════
function SubmitCertificate({
  departmentId,
  contactId,
  setIsDirty,
  onSubmitted,
}: {
  departmentId: number;
  contactId: number;
  setIsDirty: (dirty: boolean) => void;
  onSubmitted: () => void;
}) {
  const [platform, setPlatform] = useState("");
  const [certName, setCertName] = useState("");
  const [dateCompleted, setDateCompleted] = useState(new Date().toISOString().split("T")[0]);
  const [credentialUrl, setCredentialUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [certOptions, setCertOptions] = useState<{ label: string; value: string }[]>([]);
  const [certList, setCertList] = useState<LearningCertification[]>([]);

  useEffect(() => {
    fetchLearningCertifications({ departmentId, status: "Active" })
      .then((certs) => {
        setCertList(certs);
        setCertOptions(certs.map((c) => ({ label: c.title, value: c.title })));
      })
      .catch(console.error);
  }, [departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certName.trim()) return;
    setIsSubmitting(true);
    try {
      await createLearningSubmission({
        departmentId,
        contactId,
        certificationName: certName,
        issuingOrganization: platform || undefined,
        dateCompleted,
        credentialUrl: credentialUrl || undefined,
        additionalNotes: notes || undefined,
        certificateFile: file || undefined,
      });
      setIsDirty(false);
      setSubmitSuccess(true);
      onSubmitted();
      // Reset form
      setCertName("");
      setPlatform("");
      setCredentialUrl("");
      setNotes("");
      setFile(null);
    } catch (err) {
      console.error("Submit failed:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-12 text-center">
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Star className="h-8 w-8 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-black">Submission Received!</h3>
        <p className="mt-2 text-sm font-medium text-neutral-500">
          Your certificate has been submitted for admin review. Points will be awarded upon approval.
        </p>
        <button
          onClick={() => setSubmitSuccess(false)}
          className="mt-6 rounded-md bg-black px-6 py-2.5 text-xs font-bold tracking-wider text-white hover:bg-neutral-800"
        >
          SUBMIT ANOTHER
        </button>
      </div>
    );
  }

  return (
    <div className="mt-8 max-w-[800px] animate-slide-up">
      <h2 className="text-xl font-bold text-black">Submit a Completed Certificate</h2>
      <p className="mt-2 text-sm font-medium text-neutral-500">
        Completed a certification? Submit your proof below. Your submission will be reviewed by the department admin. Once approved, the points will be added to your score automatically.
      </p>

      <form className="mt-8 flex flex-col gap-6" onSubmit={handleSubmit} onChange={() => setIsDirty(true)}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Certification Name *</label>
            <CustomDropdown
              placeholder="Select certification..."
              value={certName}
              onChange={(val) => {
                setCertName(val);
                setIsDirty(true);
                const matched = certList.find((c) => c.title === val);
                if (matched?.platformName) setPlatform(matched.platformName);
              }}
              options={certOptions}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Issuing Organization</label>
            <input
              type="text"
              readOnly
              value={platform}
              placeholder="Auto-filled from certification"
              className="h-10 w-full rounded-md border border-neutral-300 bg-neutral-50 px-3 text-sm font-semibold text-neutral-700 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Date Completed *</label>
            <input
              type="date"
              required
              value={dateCompleted}
              onChange={(e) => setDateCompleted(e.target.value)}
              className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Certificate ID / Credential URL</label>
            <input
              type="text"
              value={credentialUrl}
              onChange={(e) => setCredentialUrl(e.target.value)}
              placeholder="https://credential.net/..."
              className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Upload Certificate Document *</label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.jpg,.jpeg,.png"
            className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) setFile(e.target.files[0]); }}
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50/50 transition-colors hover:bg-neutral-50"
          >
            {file ? (
              <div className="flex items-center gap-2 text-sm font-semibold text-black">
                <Paperclip className="h-5 w-5" />
                {file.name} ({(file.size / 1024 / 1024).toFixed(1)} MB)
              </div>
            ) : (
              <>
                <Paperclip className="mb-3 h-6 w-6 -rotate-45 text-neutral-400" />
                <p className="text-sm font-semibold text-neutral-500">Drag & drop your certificate here, or <span className="text-black">browse files</span></p>
                <p className="mt-1 text-xs text-neutral-400">Accepted: PDF, JPG, PNG — Max 10 MB</p>
              </>
            )}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Additional Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any extra context for the admin reviewing this submission..."
            className="h-24 w-full rounded-md border border-neutral-300 p-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="submit"
            disabled={isSubmitting}
            className="flex h-10 items-center justify-center gap-2 rounded-md bg-black px-6 text-xs font-bold tracking-wider text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            SUBMIT FOR REVIEW
          </button>
        </div>
      </form>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MY CERTIFICATES
// ═══════════════════════════════════════════════════════════════════════════
function MyCertificates({
  departmentId,
  contactId,
  myScore,
  progress,
  onNavigateToSubmit,
}: {
  departmentId: number;
  contactId: number;
  myScore: LearningMyScore | null;
  progress: LearningProgressResponse | null;
  onNavigateToSubmit: () => void;
}) {
  const [submissions, setSubmissions] = useState<LearningSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<LearningSubmission | null>(null);

  useEffect(() => {
    setIsLoading(true);
    fetchLearningSubmissions({ departmentId, contactId })
      .then(setSubmissions)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [departmentId, contactId]);

  if (isLoading) {
    return (
      <div className="mt-10 flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
      </div>
    );
  }

  const approved = submissions.filter((s) => s.status === "VERIFIED").length;
  const pending = submissions.filter((s) => s.status === "PENDING").length;

  return (
    <div className="mt-8 animate-slide-up">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black">My Submitted Certificates</h2>
          <p className="mt-1 text-sm font-medium text-neutral-500">
            {approved} approved • {pending} pending review • {myScore?.totalPoints ?? 0} total points earned
          </p>
        </div>
        <button 
          onClick={onNavigateToSubmit}
          className="flex h-10 items-center justify-center gap-2 rounded-md bg-black px-4 text-xs font-bold tracking-wider text-white transition-colors hover:bg-neutral-800"
        >
          <Plus className="h-4 w-4" />
          SUBMIT NEW
        </button>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Total Points</span>
          <span className="mt-1 text-3xl font-black text-black">{myScore?.totalPoints ?? 0}</span>
        </div>
        <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Certs Approved</span>
          <span className="mt-1 text-3xl font-black text-black">{myScore?.certsApproved ?? 0}</span>
          <span className="mt-1 text-xs font-medium text-neutral-400">of {myScore?.certsSubmitted ?? 0} submitted</span>
        </div>
        <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Dept Rank</span>
          <span className="mt-1 text-3xl font-black text-black">#{myScore?.rank ?? "—"}</span>
        </div>
        <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Current Tier</span>
          <span className="mt-1 text-3xl font-black text-black">{myScore?.currentTier ?? ""}</span>
        </div>
      </div>

      <div className="mt-8 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                <th className="px-6 py-4">Certification</th>
                <th className="px-6 py-4">Platform</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-center">Points</th>
                <th className="px-6 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {submissions.map((sub) => (
                <tr key={sub.submissionId}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-neutral-900">{sub.certificationName}</div>
                    <div className="text-xs text-neutral-400">{sub.credentialId || sub.credentialUrl || "—"}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-neutral-700">{sub.platformName || sub.issuingOrganization || "—"}</td>
                  <td className="px-6 py-4 font-semibold text-neutral-700">{new Date(sub.submittedAt).toLocaleDateString()}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                      sub.status === "VERIFIED" ? "text-neutral-700" : sub.status === "PENDING" ? "text-amber-600" : "text-red-600"
                    }`}>
                      {sub.status === "VERIFIED" && "✓ VERIFIED"}
                      {sub.status === "PENDING" && "⏳ PENDING"}
                      {sub.status === "REJECTED" && "❌ REJECTED"}
                    </span>
                  </td>
                  <td className={`px-6 py-4 text-center font-bold ${sub.status === "REJECTED" ? "text-neutral-400" : "text-black"}`}>
                    {sub.status === "REJECTED" ? "—" : `+${sub.pointsAwarded}`}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => setSelectedSub(sub)}
                      className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-black"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {submissions.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-sm text-neutral-400">No submissions yet. Submit your first certificate!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedSub && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <Star className="h-6 w-6 text-black" />
              </div>
              <button onClick={() => setSelectedSub(null)} className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-black">
                <X className="h-5 w-5" />
              </button>
            </div>
            <h3 className="text-xl font-black text-black">{selectedSub.certificationName}</h3>
            <p className="mt-1 text-sm font-medium text-neutral-500">{selectedSub.credentialId || selectedSub.credentialUrl || "—"}</p>
            <div className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Platform</div>
                  <div className="mt-1 font-semibold text-black">{selectedSub.platformName || "—"}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Submitted</div>
                  <div className="mt-1 font-semibold text-black">{new Date(selectedSub.submittedAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Status</div>
                  <div className="mt-1 font-bold">{selectedSub.status}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Points</div>
                  <div className="mt-1 font-black text-lg text-black">+{selectedSub.pointsAwarded}</div>
                </div>
              </div>
            </div>
            {selectedSub.adminNotes && (
              <div className="mt-4 rounded-lg bg-amber-50 p-3 text-xs font-medium text-amber-800">
                <strong>Admin Note:</strong> {selectedSub.adminNotes}
              </div>
            )}
            <div className="mt-6 flex justify-end">
              <button onClick={() => setSelectedSub(null)} className="rounded-md bg-black px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white hover:bg-neutral-800">
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// LEADERBOARD
// ═══════════════════════════════════════════════════════════════════════════
function Leaderboard({
  departmentId,
  departmentName,
  myScore,
  currentContactId,
}: {
  departmentId: number;
  departmentName: string;
  myScore: LearningMyScore | null;
  currentContactId: number | null;
}) {
  const [scores, setScores] = useState<LearningEmployeeScore[]>([]);
  const [tiers, setTiers] = useState<LearningPointTier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchLearningEmployeeScores(departmentId),
      fetchLearningPointTiers(),
    ])
      .then(([s, t]) => { setScores(s); setTiers(t); })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [departmentId]);

  if (isLoading) {
    return (
      <div className="mt-10 flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
      </div>
    );
  }

  const maxPoints = scores.length > 0 ? scores[0].totalPoints : 1;

  return (
    <div className="mt-8 grid items-start gap-8 lg:grid-cols-[1fr_300px] animate-slide-up">
      <div>
        <h2 className="text-xl font-bold text-black">Department Leaderboard</h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-black px-5 py-4 text-sm font-bold text-white">
            <Star className="h-4 w-4 fill-amber-500 text-amber-500" />
            {departmentName} — All Time Rankings
          </div>
          <div className="divide-y divide-neutral-100">
            {scores.map((user) => (
              <div key={user.contactId} className={`flex items-center px-5 py-4 ${user.contactId === currentContactId ? "bg-neutral-50" : ""}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                  {user.rank}
                </div>
                <div className="ml-4 flex-1">
                  <div className="font-bold text-neutral-900">
                    {user.contactId === currentContactId ? `You (${user.employeeName})` : user.employeeName}
                  </div>
                  <div className="text-xs text-neutral-500">{user.employeeRole || "Employee"} · {user.certsApproved} certs</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100 sm:w-32">
                    <div className="h-full bg-black" style={{ width: `${Math.min((user.totalPoints / maxPoints) * 100, 100)}%` }} />
                  </div>
                  <div className="w-16 text-right text-sm font-bold text-black">{user.totalPoints} pts</div>
                </div>
              </div>
            ))}
            {scores.length === 0 && (
              <div className="px-5 py-8 text-center text-sm text-neutral-400">No scores yet for this department</div>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-black">Point Milestones</h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="bg-black px-5 py-4 text-sm font-bold text-white">Reward Tiers</div>
          <div className="divide-y divide-neutral-100 p-5">
            {tiers.map((tier) => {
              const userPts = myScore?.totalPoints ?? 0;
              const achieved = userPts >= tier.minPoints;
              const progress = tier.maxPoints
                ? Math.min(((userPts - tier.minPoints) / (tier.maxPoints - tier.minPoints)) * 100, 100)
                : 100;
              return (
                <div key={tier.tierId} className="py-3">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="flex items-center gap-2">
                      {tier.displayIcon} {tier.tierName}
                      <span className="text-xs font-medium text-neutral-400">
                        {tier.minPoints}-{tier.maxPoints ?? "∞"} pts
                      </span>
                    </span>
                    <span className={`text-xs font-semibold ${achieved ? "text-emerald-600" : "text-neutral-400"}`}>
                      {achieved ? "✓ Achieved" : `${userPts}/${tier.minPoints}`}
                    </span>
                  </div>
                  {achieved && (
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
                      <div className="h-full w-full bg-black" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
