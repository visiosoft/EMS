import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { fetchEmployeeProfile } from "@/api/selfProfileApi";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { EmployeeProfileView } from "../components/EmployeeProfileView";
import { useInternalNavigation } from "../routing/InternalNavigationContext";

export function EmployeeProfilePage() {
  const { viewData, navigate } = useInternalNavigation();
  const contactId = viewData.contactId ?? 0;

  const profileQuery = useQuery({
    queryKey: ["employee-profile", contactId],
    queryFn: () => fetchEmployeeProfile(contactId),
    enabled: contactId > 0,
    retry: 1,
  });

  const data = profileQuery.data;
  const profile = data && data.linked ? data : null;
  const notLinked = data ? !data.linked : false;

  const fullName = profile
    ? [profile.basics.firstName, profile.basics.lastName]
        .map((part) => part.trim())
        .filter(Boolean)
        .join(" ")
    : "";

  const backToDirectory = () => navigate("employee-directory");

  return (
    <InternalPageFrame>
      <InternalPageHero
        title={fullName || "Employee Profile"}
        subtitle={
          profile
            ? [profile.employment.title || profile.basics.role, profile.basics.department]
                .filter(Boolean)
                .join(" · ") || "iAE employee profile."
            : "iAE employee profile."
        }
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 pt-14 sm:px-8 lg:px-0">
        <button
          type="button"
          onClick={backToDirectory}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 transition-colors hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to directory
        </button>

        {contactId <= 0 ? (
          <div className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-600" aria-hidden />
            <h2 className="text-base font-semibold text-amber-900">No employee selected</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
              Choose someone from the employee directory to view their profile.
            </p>
          </div>
        ) : profileQuery.isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" aria-hidden />
            <span className="sr-only">Loading profile</span>
          </div>
        ) : profileQuery.isError ? (
          <div className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-600" aria-hidden />
            <h2 className="text-base font-semibold text-amber-900">Couldn't load this profile</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
              Something went wrong reaching the iAE directory. Please try again in a moment.
            </p>
          </div>
        ) : notLinked ? (
          <div className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-600" aria-hidden />
            <h2 className="text-base font-semibold text-amber-900">Profile not found</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
              This employee record isn't available in the directory.
            </p>
          </div>
        ) : profile ? (
          <EmployeeProfileView profile={profile} />
        ) : null}
      </main>
    </InternalPageFrame>
  );
}
