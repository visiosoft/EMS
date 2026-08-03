import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Layers,
  LayoutGrid,
  Loader2,
  Building2,
  Landmark,
  Phone,
  Rows3,
  Smartphone,
  Mail,
} from "lucide-react";
import { UrgentUpcomingSection } from "../components/UrgentUpcomingSection";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import { fetchDepartmentEmployees, type IaeEmployee } from "@/api/iaeEmployeesApi";
import { fetchMyProfile } from "@/api/myProfileApi";
import { apiFetch } from "@/api/config";
import { HubGraphAvatar } from "@/components/ems/GraphAvatar";
import { getActiveAccount, acquireGraphAccessToken } from "@/auth/entra";
import { formatE164ForDisplay } from "@/lib/contactPhoneField";

type DepartmentLookup = { departmentId: number; departmentName: string };

type QuickLinkIconProps = { className?: string };

type TeamViewMode = "tiles" | "table";

function Segmented({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-flex h-10 items-center gap-0.5 rounded-lg border border-neutral-200 bg-neutral-100/80 p-1">
      {children}
    </div>
  );
}

function SegBtn({ active, onClick, children, ariaLabel }: { active: boolean; onClick: () => void; children: React.ReactNode; ariaLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-all ${
        active
          ? "bg-white text-neutral-900 shadow-sm ring-1 ring-black/[0.06]"
          : "text-neutral-500 hover:text-neutral-900"
      }`}
    >
      {children}
    </button>
  );
}

function BookingQuickIcon({ className }: QuickLinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="6" width="16" height="12" rx="1" />
      <circle cx="8" cy="10" r="1.2" />
      <circle cx="12" cy="10" r="1.2" />
      <circle cx="16" cy="10" r="1.2" />
      <path d="M7 14h10" />
    </svg>
  );
}

function DesignResourcesIcon({ className }: QuickLinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 5.5h11.5v11.5H5z" />
      <path d="M7.2 15.1 10 11.9l2.2 2.3 1.6-1.8 2.7 3.1" />
      <path d="m14.4 4.2 5.4 5.4" />
      <path d="m17.1 6.9-9.2 9.2" />
    </svg>
  );
}

function StudentGalleryIcon({ className }: QuickLinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4.2 16.6c.3-6.8 5.7-12.1 12.6-12.4" />
      <path d="M16.8 4.2v12.4H4.2" />
    </svg>
  );
}

function CoursesIcon({ className }: QuickLinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m12 3.8 8 4.7v7L12 20.2l-8-4.7v-7l8-4.7Z" />
      <path d="m4 8.5 8 4.7 8-4.7" />
      <path d="M12 13.2v7" />
      <path d="M8.1 6.1 16 17.8" />
      <path d="m15.9 6.1-7.8 11.7" />
    </svg>
  );
}

function FacultyStaffIcon({ className }: QuickLinkIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8.3 16.8c-1.9 0-3.1-1.5-2.6-3.3l1.5-5.1" />
      <path d="M12.2 7.1 9.7 16c-.6 2.1.7 3.8 2.8 3.8 1.7 0 3.4-1.2 3.9-2.9l2.2-7.8c.4-1.5-.5-2.8-2.1-2.8-1.3 0-2.5.9-2.9 2.1l-1.7 6.2" />
    </svg>
  );
}

type QuickLink = { label: string; icon: React.ComponentType<QuickLinkIconProps>; href: string };

const DEFAULT_QUICK_LINKS: QuickLink[] = [
  { label: "Booking", icon: BookingQuickIcon, href: "https://abcd.com/" },
  { label: "Marketing", icon: Landmark, href: "https://abcd.com/" },
  { label: "Accounting", icon: BookingQuickIcon, href: "https://abcd.com/" },
  { label: "Production", icon: Landmark, href: "https://abcd.com/" },
];

const ART_QUICK_LINKS: QuickLink[] = [
  { label: "Design Resources", icon: DesignResourcesIcon, href: "https://abcd.com/" },
  { label: "Student Gallery", icon: StudentGalleryIcon, href: "https://abcd.com/" },
  { label: "Courses & Curriculum", icon: CoursesIcon, href: "https://abcd.com/" },
  { label: "Faculty & Staff", icon: FacultyStaffIcon, href: "https://abcd.com/" },
];

/** Returns department-specific quick links based on the department name from the API. */
function getQuickLinks(deptName: string): QuickLink[] {
  if (deptName === "Art & Graphic Design") return ART_QUICK_LINKS;
  return DEFAULT_QUICK_LINKS;
}

export function DepartmentDetailPage() {
  const { navigate, viewData } = useInternalNavigation();
  const departmentId = viewData?.departmentId || null;

  const [departmentName, setDepartmentName] = useState<string>("");
  const [teamMembers, setTeamMembers] = useState<IaeEmployee[]>([]);
  const [currentContactId, setCurrentContactId] = useState<number | null>(null);
  const [graphToken, setGraphToken] = useState<string | null>(null);
  const [isLoadingDept, setIsLoadingDept] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);
  const [teamView, setTeamView] = useState<TeamViewMode>("tiles");

  // Fetch department name
  useEffect(() => {
    if (!departmentId) {
      setIsLoadingDept(false);
      return;
    }
    apiFetch<DepartmentLookup[]>("/lookups/departments")
      .then((depts) => {
        const match = depts.find((d) => d.departmentId === departmentId);
        if (match) setDepartmentName(match.departmentName);
      })
      .catch(console.error)
      .finally(() => setIsLoadingDept(false));
  }, [departmentId]);

  // Fetch team members
  useEffect(() => {
    if (!departmentId) {
      setIsLoadingTeam(false);
      return;
    }
    setIsLoadingTeam(true);
    fetchDepartmentEmployees(departmentId)
      .then(setTeamMembers)
      .catch(console.error)
      .finally(() => setIsLoadingTeam(false));
  }, [departmentId]);

  // Fetch current user
  useEffect(() => {
    fetchMyProfile()
      .then((profile) => setCurrentContactId(profile.contactId))
      .catch(console.error);
  }, []);

  // Acquire Graph token for profile photos
  useEffect(() => {
    let mounted = true;
    (async () => {
      const account = getActiveAccount();
      if (!account) return;
      try {
        const token = await acquireGraphAccessToken(account);
        if (mounted && token) setGraphToken(token);
      } catch { /* falls back to initials */ }
    })();
    return () => { mounted = false; };
  }, []);

  if (!departmentId) {
    return (
      <InternalPageFrame footer={<UrgentUpcomingSection pinned />}>
        <div className="flex flex-col items-center justify-center py-32 text-neutral-500">
          <Building2 className="mb-4 h-12 w-12" />
          <p className="text-lg font-semibold">No department selected</p>
          <button
            onClick={() => navigate("departments")}
            className="mt-4 text-sm font-bold text-black underline hover:no-underline"
          >
            Go to Departments
          </button>
        </div>
      </InternalPageFrame>
    );
  }

  return (
    <InternalPageFrame footer={<UrgentUpcomingSection pinned />}>
      {/* Hero Section */}
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
            onClick={() => navigate("departments")}
            className="flex items-center text-sm font-semibold text-neutral-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Departments
          </button>
        </div>
        <div className="mx-auto grid min-h-[300px] max-w-[1120px] items-center gap-8 md:grid-cols-[1fr_0.75fr]">
          <div>
            {isLoadingDept ? (
              <div className="h-16 w-64 animate-pulse rounded bg-white/10" />
            ) : (
              <h1 className="max-w-[560px] text-[clamp(2.25rem,11vw,4.75rem)] font-bold leading-[1.08] tracking-[-0.025em] text-white">
                {departmentName}
              </h1>
            )}
            <p className="mt-6 text-base font-bold text-white sm:mt-10 sm:text-lg">
              Department Overview
            </p>
            <div className="mt-4 h-px max-w-[650px] bg-white/45" />
            <p className="mt-6 max-w-[620px] text-base font-bold leading-snug text-white sm:text-lg">
              A central hub for managing records, resources, and team collaboration within the{" "}
              {departmentName || "department"}.
            </p>
          </div>
          <div className="hidden justify-center md:flex">
            <Building2
              className="h-[185px] w-[185px] text-white"
              strokeWidth={1.6}
              aria-hidden
            />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto grid max-w-[1120px] gap-10 px-4 py-6 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:px-0">
        {/* Team Members */}
        <section>
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-semibold">Team Members</h2>
            {teamMembers.length > 0 && (
              <Segmented>
                <SegBtn active={teamView === "tiles"} onClick={() => setTeamView("tiles")} ariaLabel="Tile view">
                  <LayoutGrid className="h-4 w-4" /> Tiles
                </SegBtn>
                <SegBtn active={teamView === "table"} onClick={() => setTeamView("table")} ariaLabel="Table view">
                  <Rows3 className="h-4 w-4" /> Table
                </SegBtn>
              </Segmented>
            )}
          </div>
          <div className="mt-7 border-t border-neutral-600 pt-5">
              {isLoadingTeam ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-neutral-400">
                  No team members found
                </div>
              ) : teamView === "table" ? (
                <div className="overflow-x-auto rounded-lg border border-neutral-200">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b border-neutral-200 bg-neutral-50">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Name</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Title</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Desk Phone</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Mobile</th>
                        <th className="px-4 py-3 font-semibold text-neutral-700">Email</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100">
                      {teamMembers.map((member) => {
                        const name = `${member.firstName} ${member.lastName}`.trim() || "\u2014";
                        const title = member.jobTitle?.trim() || member.roleName?.trim() || "";
                        const cellPhone = formatE164ForDisplay(member.cellPhone) || "";
                        const deskBase = (() => {
                          const digits = (member.workPhone ?? "").replace(/\D/g, "");
                          if (digits.length >= 3 && digits.length <= 5) return "";
                          return formatE164ForDisplay(member.workPhone) || "";
                        })();
                        const ext = member.extension?.trim() || (() => {
                          const digits = (member.workPhone ?? "").replace(/\D/g, "");
                          return digits.length >= 3 && digits.length <= 5 ? digits : "";
                        })();
                        const desk = deskBase && ext ? `${deskBase} x${ext}` : deskBase || (ext ? `x${ext}` : "");
                        return (
                          <tr
                            key={member.contactId}
                            onClick={() => navigate("employee-profile", { contactId: member.contactId, fromView: "departments" })}
                            className="cursor-pointer transition-colors hover:bg-neutral-50"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <HubGraphAvatar name={name} email={member.email} graphToken={graphToken} size="sm" />
                                <span className="font-medium text-neutral-900">
                                  {name}
                                  {member.contactId === currentContactId && (
                                    <span className="ml-2 text-xs font-bold text-blue-600">(You)</span>
                                  )}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-neutral-600">{title}</td>
                            <td className="px-4 py-3 font-mono text-xs text-neutral-500">{desk}</td>
                            <td className="px-4 py-3 font-mono text-xs text-neutral-500">{cellPhone}</td>
                            <td className="px-4 py-3 text-neutral-500">{member.email}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-4 lg:grid-cols-3">
                  {teamMembers.map((member) => {
                    const name = `${member.firstName} ${member.lastName}`.trim() || "\u2014";
                    const title = member.jobTitle?.trim() || member.roleName?.trim();
                    const department = member.departmentName?.trim();
                    const cellPhone = formatE164ForDisplay(member.cellPhone);
                    const deskBase = (() => {
                      const digits = (member.workPhone ?? "").replace(/\D/g, "");
                      if (digits.length >= 3 && digits.length <= 5) return "";
                      return formatE164ForDisplay(member.workPhone) || "";
                    })();
                    const deskExtension = member.extension?.trim() || (() => {
                      const digits = (member.workPhone ?? "").replace(/\D/g, "");
                      return digits.length >= 3 && digits.length <= 5 ? digits : "";
                    })();
                    const hasDeskPhone = Boolean(deskBase || deskExtension);
                    const hasContact = Boolean(hasDeskPhone || cellPhone || member.email);
                    return (
                      <button
                        key={member.contactId}
                        type="button"
                        onClick={() => navigate("employee-profile", { contactId: member.contactId, fromView: "departments" })}
                        className={`group relative flex h-full min-h-[290px] flex-col items-center rounded-lg border-2 border-neutral-900 bg-white px-4 pb-4 pt-5 text-center transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900 ${
                          member.contactId === currentContactId ? "ring-2 ring-blue-500" : ""
                        }`}
                      >
                        <img src="/iae_logo.png" alt="" className="absolute top-3 right-3 h-5 w-auto invert" aria-hidden />
                        <HubGraphAvatar name={name} email={member.email} graphToken={graphToken} size="xl" ringClass="ring-transparent" className="!w-24 !h-24 !text-2xl" />
                        <p className="mt-4 w-full text-[15px] font-bold text-neutral-950 break-words leading-tight">
                          {name}
                          {member.contactId === currentContactId && (
                            <span className="ml-2 text-xs font-bold text-blue-600">(You)</span>
                          )}
                        </p>
                        {department ? (
                          <span className="mt-2 max-w-full rounded border border-neutral-300 px-2 py-[3px] text-[10px] font-semibold uppercase tracking-[0.1em] text-neutral-700 break-words text-center leading-tight">
                            {department}
                          </span>
                        ) : null}
                        {title ? (
                          <p className="mt-2 w-full text-[13px] font-bold leading-snug text-neutral-600">{title}</p>
                        ) : null}
                        <div className="min-h-[16px] flex-1" aria-hidden />
                        {hasContact ? (
                          <div className="w-full min-w-0 border-t border-neutral-200 pt-4">
                            <div className="flex flex-col gap-1.5 text-[12px] text-neutral-600">
                              {hasDeskPhone ? (
                                <span className="flex min-w-0 items-center justify-center gap-1.5">
                                  <Phone className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                                  {deskBase ? <span className="truncate font-mono tracking-tight">{deskBase}</span> : null}
                                  {deskExtension ? (
                                    <span className="shrink-0 rounded bg-neutral-900 px-1.5 py-[1px] text-[10px] font-bold text-white">
                                      x{deskExtension}
                                    </span>
                                  ) : null}
                                </span>
                              ) : null}
                              {cellPhone ? (
                                <span className="flex min-w-0 items-center justify-center gap-1.5">
                                  <Smartphone className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                                  <span className="truncate font-mono tracking-tight">{cellPhone}</span>
                                </span>
                              ) : null}
                              {member.email ? (
                                <span className="flex min-w-0 items-center justify-center gap-1.5">
                                  <Mail className="h-3.5 w-3.5 shrink-0 text-neutral-400" aria-hidden />
                                  <span className="truncate">{member.email}</span>
                                </span>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              )}
          </div>
        </section>

        {/* Quick Links + Learning Portal + Fun Corner */}
        <section>
          <h2 className="text-2xl font-semibold">Quick Links</h2>
          <div className="mt-7 border-t border-neutral-600 pt-5">
            <div className="grid gap-5 sm:grid-cols-2">
              {getQuickLinks(departmentName).map(({ label, icon: Icon, href }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-[58px] items-center gap-3 border border-neutral-700 px-4 text-sm font-semibold text-neutral-900 transition-colors hover:bg-black hover:text-white"
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  {label}
                </a>
              ))}
              <a
                href={`/internal/learning-portal?fromView=department&fromTitle=${encodeURIComponent(departmentName)}&departmentId=${departmentId}`}
                target="_blank"
                rel="noreferrer"
                className="col-span-1 flex h-[58px] w-full items-center justify-between gap-3 bg-black px-4 text-sm font-semibold text-white transition-colors hover:bg-neutral-800 sm:col-span-2"
              >
                <div className="flex items-center gap-3">
                  <Layers className="h-5 w-5 shrink-0" />
                  Learning & Certifications Portal
                </div>
                <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-black">
                  NEW
                </span>
              </a>
            </div>
          </div>

          <h2 className="mt-6 border-b border-neutral-600 pb-7 text-2xl font-semibold">
            Fun Corner
          </h2>
          <div className="mt-10 w-full max-w-[520px] overflow-hidden bg-black shadow-sm">
            <iframe
              className="aspect-video w-full"
              src="https://www.youtube.com/embed/v0BrTJHoYC0?rel=0"
              title="Department Fun Corner"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </section>
      </main>
    </InternalPageFrame>
  );
}
