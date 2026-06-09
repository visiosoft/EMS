import { ChevronRight, Medal, ArrowLeft, ChevronDown, Loader2, Paperclip, Plus, Star, User, AlertTriangle, X } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { UrgentUpcomingSection } from "../components/UrgentUpcomingSection";

import { useInternalNavigation } from "../routing/InternalNavigationContext";

export function LearningPortalPage() {
  const { navigate, viewData } = useInternalNavigation();
  const departmentName = viewData?.fromTitle || "Art & Graphic Design";
  const departmentView = viewData?.fromView || "department-art-graphic-design";

  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("BROWSE");
  const [isDirty, setIsDirty] = useState(false);
  const [showDiscardAlert, setShowDiscardAlert] = useState(false);
  const [pendingTab, setPendingTab] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const handleTabChange = (newTab: string) => {
    if (activeTab === "SUBMIT" && isDirty && newTab !== "SUBMIT") {
      setPendingTab(newTab);
      setShowDiscardAlert(true);
      return;
    }
    setActiveTab(newTab);
  };

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
            onClick={() => navigate(departmentView)}
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
            <div className="text-4xl font-black leading-none">340</div>
            <div className="mt-1 text-xs font-bold uppercase tracking-wider text-neutral-500">
              Your Points
            </div>
            <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
              <Medal className="h-4 w-4 text-amber-500" />
              Rank #3 in Dept
            </div>
          </div>
        </div>
      </section>

      {/* Progress Section */}
      <section className="border-b border-neutral-200 bg-white px-4 py-6 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-[1120px]">
          <div className="flex items-center justify-between text-xs font-semibold text-neutral-500">
            <span>Certification Progress — 3 of 8 completed</span>
            <span className="font-bold text-neutral-900">37%</span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-black" style={{ width: "37%" }} />
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

        {activeTab === "BROWSE" && (
          <BrowseCertifications isLoading={isLoading} />
        )}
        
        {activeTab === "SUBMIT" && (
          <SubmitCertificate setIsDirty={setIsDirty} />
        )}
        
        {activeTab === "MY" && (
          <MyCertificates onNavigateToSubmit={() => handleTabChange("SUBMIT")} />
        )}
        
        {activeTab === "LEADERBOARD" && (
          <Leaderboard departmentName={departmentName} />
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

function BrowseCertifications({ isLoading }: { isLoading: boolean }) {
  const [level, setLevel] = useState("all");
  const [platform, setPlatform] = useState("all");

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
              { label: "Beginner", value: "beginner" },
              { label: "Intermediate", value: "intermediate" },
              { label: "Advanced", value: "advanced" }
            ]}
          />
          <CustomDropdown 
            className="min-w-[140px]"
            value={platform}
            onChange={setPlatform}
            options={[
              { label: "All Platforms", value: "all" },
              { label: "Adobe", value: "adobe" },
              { label: "Coursera", value: "coursera" },
              { label: "LinkedIn Learning", value: "linkedin" }
            ]}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="mt-10 flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
          <span className="sr-only">Loading courses</span>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((course, idx) => (
            <div
              key={idx}
              className="group flex flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-neutral-300 hover:shadow-[0_14px_36px_rgba(0,0,0,0.1)]"
            >
              <div className="flex items-center justify-between bg-black px-4 py-3 text-xs font-bold text-white">
                <span className="uppercase tracking-wider">{course.platform}</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] text-black">
                  +{course.points} pts
                </span>
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="text-base font-bold leading-tight text-black">
                  {course.title}
                </h3>
                <p className="mt-2 text-sm text-neutral-500">{course.description}</p>
                
                <div className="mt-4 flex flex-wrap gap-2">
                  {course.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded bg-neutral-100 px-2 py-1 text-xs font-semibold text-neutral-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="mt-auto pt-6 flex items-center gap-3">
                  <a
                    href="https://google.com"
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

function SubmitCertificate({ setIsDirty }: { setIsDirty: (dirty: boolean) => void }) {
  const [platform, setPlatform] = useState("");

  return (
    <div className="mt-8 max-w-[800px] animate-slide-up">
      <h2 className="text-xl font-bold text-black">Submit a Completed Certificate</h2>
      <p className="mt-2 text-sm font-medium text-neutral-500">
        Completed a certification? Submit your proof below. Your submission will be reviewed by the department admin. Once approved, the points will be added to your score automatically.
      </p>

      <form className="mt-8 flex flex-col gap-6" onChange={() => setIsDirty(true)}>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Certification Name *</label>
            <input type="text" placeholder="e.g. Adobe Certified Professional" className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Issuing Organization *</label>
            <CustomDropdown 
              placeholder="Select platform..."
              value={platform}
              onChange={(val) => {
                setPlatform(val);
                setIsDirty(true);
              }}
              options={[
                { label: "Adobe", value: "adobe" },
                { label: "Coursera", value: "coursera" }
              ]}
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Date Completed *</label>
            <input type="date" defaultValue={new Date().toISOString().split('T')[0]} className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold text-neutral-500 focus:border-black focus:outline-none focus:ring-1 focus:ring-black" />
          </div>
          <div>
            <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Certificate ID / Credential URL</label>
            <input type="text" placeholder="https://credential.net/..." className="h-10 w-full rounded-md border border-neutral-300 px-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Upload Certificate Document *</label>
          <div className="flex h-32 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50/50 transition-colors hover:bg-neutral-50">
            <Paperclip className="mb-3 h-6 w-6 -rotate-45 text-neutral-400" />
            <p className="text-sm font-semibold text-neutral-500">Drag & drop your certificate here, or <span className="text-black">browse files</span></p>
            <p className="mt-1 text-xs text-neutral-400">Accepted: PDF, JPG, PNG — Max 10 MB</p>
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-neutral-700">Additional Notes</label>
          <textarea placeholder="Any extra context for the admin reviewing this submission..." className="h-24 w-full rounded-md border border-neutral-300 p-3 text-sm font-semibold focus:border-black focus:outline-none focus:ring-1 focus:ring-black"></textarea>
        </div>

        <div className="flex items-center gap-3">
          <button 
            type="button" 
            onClick={() => {
              setIsDirty(false);
            }}
            className="flex h-10 items-center justify-center rounded-md bg-black px-6 text-xs font-bold tracking-wider text-white transition-colors hover:bg-neutral-800"
          >
            SUBMIT FOR REVIEW
          </button>
        </div>
      </form>
    </div>
  );
}

const MY_CERTIFICATES_DATA = [
  {
    name: "Adobe Certified Professional – Visual Design",
    credential: "Credential #ADC-2024-8821",
    platform: "Adobe",
    submitted: "Mar 12, 2025",
    status: "✓ VERIFIED",
    statusColor: "text-neutral-700",
    points: "+120",
    pointsColor: "text-black",
  },
  {
    name: "Google UX Design Certificate",
    credential: "Credential #GUX-2024-4412",
    platform: "Coursera",
    submitted: "Jan 5, 2025",
    status: "✓ VERIFIED",
    statusColor: "text-neutral-700",
    points: "+80",
    pointsColor: "text-black",
  },
  {
    name: "Brand Identity & Typography Essentials",
    credential: "Credential #LI-2024-8901",
    platform: "LinkedIn Learning",
    submitted: "Dec 20, 2024",
    status: "✓ VERIFIED",
    statusColor: "text-neutral-700",
    points: "+60",
    pointsColor: "text-black",
  },
  {
    name: "Motion Design & After Effects Fundamentals",
    credential: "Awaiting admin review",
    platform: "Skillshare",
    submitted: "Jun 1, 2025",
    status: "⏳ PENDING",
    statusColor: "text-amber-600",
    points: "+50?",
    pointsColor: "text-neutral-400",
  }
];

function MyCertificates({ onNavigateToSubmit }: { onNavigateToSubmit: () => void }) {
  const [selectedCert, setSelectedCert] = useState<typeof MY_CERTIFICATES_DATA[0] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="mt-10 flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
        <span className="sr-only">Loading certificates</span>
      </div>
    );
  }

  return (
    <div className="mt-8 animate-slide-up">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-black">My Submitted Certificates</h2>
          <p className="mt-1 text-sm font-medium text-neutral-500">
            3 approved • 1 pending review • 340 total points earned
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
          <span className="mt-1 text-3xl font-black text-black">340</span>
          <span className="mt-1 text-xs font-medium text-neutral-400">+120 this month</span>
        </div>
        <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Certs Approved</span>
          <span className="mt-1 text-3xl font-black text-black">3</span>
          <span className="mt-1 text-xs font-medium text-neutral-400">of 4 submitted</span>
        </div>
        <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Dept Rank</span>
          <span className="mt-1 text-3xl font-black text-black">#3</span>
          <span className="mt-1 text-xs font-medium text-neutral-400">out of 12 members</span>
        </div>
        <div className="flex flex-col rounded-xl border border-neutral-200 bg-white p-5 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Next Milestone</span>
          <span className="mt-1 text-3xl font-black text-black">160 pts</span>
          <span className="mt-1 text-xs font-medium text-neutral-400">to reach Gold level</span>
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
              {MY_CERTIFICATES_DATA.map((cert, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4">
                    <div className="font-bold text-neutral-900">{cert.name}</div>
                    <div className="text-xs text-neutral-400">{cert.credential}</div>
                  </td>
                  <td className="px-6 py-4 font-semibold text-neutral-700">{cert.platform}</td>
                  <td className="px-6 py-4 font-semibold text-neutral-700">{cert.submitted}</td>
                  <td className="px-6 py-4"><span className={`inline-flex items-center gap-1.5 text-xs font-bold ${cert.statusColor}`}>{cert.status}</span></td>
                  <td className={`px-6 py-4 text-center font-bold ${cert.pointsColor}`}>{cert.points}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => setSelectedCert(cert)}
                      className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-black"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedCert && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
                <Star className="h-6 w-6 text-black" />
              </div>
              <button 
                onClick={() => setSelectedCert(null)}
                className="rounded-full p-2 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-black"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <h3 className="text-xl font-black text-black">{selectedCert.name}</h3>
            <p className="mt-1 text-sm font-medium text-neutral-500">{selectedCert.credential}</p>
            
            <div className="mt-6 rounded-xl border border-neutral-100 bg-neutral-50 p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Platform</div>
                  <div className="mt-1 font-semibold text-black">{selectedCert.platform}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Submitted</div>
                  <div className="mt-1 font-semibold text-black">{selectedCert.submitted}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Status</div>
                  <div className={`mt-1 font-bold ${selectedCert.statusColor}`}>{selectedCert.status}</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">Points</div>
                  <div className={`mt-1 font-black ${selectedCert.pointsColor} text-lg`}>{selectedCert.points}</div>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={() => setSelectedCert(null)}
                className="rounded-md bg-black px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-neutral-800"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Leaderboard({ departmentName }: { departmentName: string }) {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="mt-10 flex min-h-[200px] items-center justify-center rounded-xl border border-neutral-200 bg-neutral-50">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-500" aria-hidden />
        <span className="sr-only">Loading leaderboard</span>
      </div>
    );
  }

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
            {[
              { rank: 1, name: "Sarah Mitchell", title: "Senior Designer · 6 certs", points: 620 },
              { rank: 2, name: "Marcus Wren", title: "Graphic Designer · 5 certs", points: 460 },
              { rank: 3, name: "You (Alex Abalo)", title: "Graphic Designer · 3 certs", points: 340, highlight: true },
              { rank: 4, name: "Priya Kapoor", title: "Art Director · 3 certs", points: 280 },
              { rank: 5, name: "Chauncey Hopewell", title: "Graphic Designer · 2 certs", points: 220 },
              { rank: 6, name: "Ben Viette", title: "Art Director · 2 certs", points: 180 },
            ].map((user) => (
              <div key={user.rank} className={`flex items-center px-5 py-4 ${user.highlight ? "bg-neutral-50" : ""}`}>
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-xs font-bold text-white">
                  {user.rank}
                </div>
                <div className="ml-4 flex-1">
                  <div className="font-bold text-neutral-900">{user.name}</div>
                  <div className="text-xs text-neutral-500">{user.title}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-neutral-100 sm:w-32">
                     <div className="h-full bg-black" style={{ width: `${Math.min((user.points / 620) * 100, 100)}%` }} />
                  </div>
                  <div className="w-16 text-right text-sm font-bold text-black">{user.points} pts</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-xl font-bold text-black">Point Milestones</h2>
        <div className="mt-6 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="bg-black px-5 py-4 text-sm font-bold text-white">
            Reward Tiers
          </div>
          <div className="divide-y divide-neutral-100 p-5">
            <div className="pb-3">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="flex items-center gap-2">🥉 Bronze <span className="text-xs font-medium text-neutral-400">0-200 pts</span></span>
                <span className="text-xs font-semibold text-emerald-600">✓ Achieved</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"><div className="h-full w-full bg-black" /></div>
            </div>
            <div className="py-3">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="flex items-center gap-2">🥈 Silver <span className="text-xs font-medium text-neutral-400">201-400 pts</span></span>
                <span className="text-xs font-semibold text-emerald-600">✓ Achieved</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"><div className="h-full w-full bg-black" /></div>
            </div>
            <div className="py-3">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="flex items-center gap-2">🥇 Gold <span className="text-xs font-medium text-neutral-400">401-600 pts</span></span>
                <span className="text-xs font-semibold text-neutral-400">340/600</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-neutral-100"><div className="h-full bg-black" style={{width: '85%'}} /></div>
            </div>
            <div className="pt-3">
              <div className="flex items-center justify-between text-sm font-bold">
                <span className="flex items-center gap-2 text-neutral-400">💎 Platinum <span className="text-xs font-medium text-neutral-400">601+ pts</span></span>
                <span className="text-xs font-semibold text-neutral-400">Locked</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const COURSES = [
  {
    platform: "Adobe",
    points: 120,
    title: "Adobe Certified Professional – Visual Design",
    description:
      "Master Adobe XD, Illustrator and Photoshop workflows to earn this globally recognized credential.",
    tags: ["Intermediate", "40 hrs", "Design Tools"],
  },
  {
    platform: "Coursera",
    points: 80,
    title: "Google UX Design Certificate",
    description:
      "A foundational certification covering the full UX design process from research to high-fidelity prototypes.",
    tags: ["Beginner", "6 months", "UX / UI"],
  },
  {
    platform: "LinkedIn Learning",
    points: 60,
    title: "Brand Identity & Typography Essentials",
    description:
      "Build strong typographic systems and develop a cohesive brand identity from scratch with industry best practices.",
    tags: ["Beginner", "8 hrs", "Branding"],
  },
  {
    platform: "Skillshare",
    points: 50,
    title: "Motion Design & After Effects Fundamentals",
    description:
      "Learn to create animated graphics, transitions, and visual effects using Adobe After Effects for broadcast and digital media.",
    tags: ["Intermediate", "12 hrs", "Motion"],
  },
  {
    platform: "Canva",
    points: 40,
    title: "Canva Certified Creator Program",
    description:
      "Demonstrate your ability to produce compelling visual content using Canva's full professional design suite.",
    tags: ["Beginner", "4 hrs", "Digital Media"],
  },
  {
    platform: "Awwwards",
    points: 100,
    title: "Advanced Web Design & Interaction",
    description:
      "Explore advanced interaction patterns, scroll animations, and award-worthy layout techniques as judged by Awwwards.",
    tags: ["Advanced", "20 hrs", "Web Design"],
  },
];
