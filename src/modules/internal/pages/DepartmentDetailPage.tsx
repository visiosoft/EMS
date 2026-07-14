import { useState, useEffect } from "react";
import {
  ArrowLeft,
  Layers,
  Loader2,
  Building2,
  Landmark,
} from "lucide-react";
import { TeamMemberAvatar } from "../components/TeamMemberAvatar";
import { UrgentUpcomingSection } from "../components/UrgentUpcomingSection";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { useInternalNavigation } from "../routing/InternalNavigationContext";
import { fetchDepartmentEmployees, type IaeEmployee } from "@/api/iaeEmployeesApi";
import { fetchMyProfile } from "@/api/myProfileApi";
import { apiFetch } from "@/api/config";

type DepartmentLookup = { departmentId: number; departmentName: string };

type QuickLinkIconProps = { className?: string };

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
  const [isLoadingDept, setIsLoadingDept] = useState(true);
  const [isLoadingTeam, setIsLoadingTeam] = useState(true);

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
          <h2 className="text-2xl font-semibold">Team Members</h2>
          <div className="mt-7 border-t border-neutral-600">
            <div className="mt-5 max-h-[248px] overflow-y-auto pr-2 [scrollbar-color:#9ca3af_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-400 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar]:w-1.5">
              {isLoadingTeam ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
                </div>
              ) : teamMembers.length === 0 ? (
                <div className="flex items-center justify-center py-10 text-sm text-neutral-400">
                  No team members found
                </div>
              ) : (
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 z-10 bg-white">
                    <tr className="border-b border-neutral-200 text-xs font-semibold text-neutral-900">
                      <th className="w-[150px] px-4 py-3">Picture</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100">
                    {teamMembers.map((member) => (
                      <tr
                        key={member.contactId}
                        className={`relative ${member.contactId === currentContactId ? "bg-blue-50" : ""}`}
                      >
                        <td className="relative px-4 py-4 before:absolute before:left-0 before:top-1/2 before:h-10 before:w-1 before:-translate-y-1/2 before:rounded-full before:bg-neutral-300">
                          <TeamMemberAvatar />
                        </td>
                        <td className="px-4 py-4 text-sm text-neutral-700">
                          {member.firstName} {member.lastName}
                          {member.contactId === currentContactId && (
                            <span className="ml-2 text-xs font-bold text-blue-600">(You)</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm font-semibold text-neutral-900">
                          {member.roleName || "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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
