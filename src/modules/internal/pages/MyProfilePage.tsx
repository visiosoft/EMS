import { useQuery } from "@tanstack/react-query";
import { Loader2, ShieldAlert } from "lucide-react";
import { fetchMySelfProfile } from "@/api/selfProfileApi";
import { InternalPageHero } from "../components/InternalPageHero";
import { InternalPageFrame } from "../layout/InternalPageFrame";
import { EmployeeProfileView } from "../components/EmployeeProfileView";

export function MyProfilePage() {
  const profileQuery = useQuery({
    queryKey: ["self-profile"],
    queryFn: fetchMySelfProfile,
    retry: 1,
  });

  const data = profileQuery.data;
  const profile = data && data.linked ? data : null;
  const notLinked = data ? !data.linked : false;

  return (
    <InternalPageFrame>
      <InternalPageHero
        title="My Profile"
        subtitle="Your personal, contact, and employment details on file with iAE."
      />

      <main className="mx-auto w-full max-w-[1060px] px-5 pb-16 pt-14 sm:px-8 lg:px-0">
        {profileQuery.isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-neutral-400" aria-hidden />
            <span className="sr-only">Loading your profile</span>
          </div>
        ) : null}

        {profileQuery.isError ? (
          <div className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-600" aria-hidden />
            <h2 className="text-base font-semibold text-amber-900">Couldn't load your profile</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
              Something went wrong reaching the iAE directory. Please refresh the page, or try again
              in a moment.
            </p>
          </div>
        ) : null}

        {notLinked ? (
          <div className="mx-auto max-w-xl rounded-lg border border-amber-200 bg-amber-50 px-6 py-8 text-center">
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-600" aria-hidden />
            <h2 className="text-base font-semibold text-amber-900">No employee profile linked yet</h2>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
              Your sign-in isn't linked to an iAE employee record, so profile details can't be
              shown. Contact HR or your administrator to have your account connected.
            </p>
          </div>
        ) : null}

        {profile ? <EmployeeProfileView profile={profile} /> : null}
      </main>
    </InternalPageFrame>
  );
}
