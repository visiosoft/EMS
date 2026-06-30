import { useState, useEffect } from "react";
import { fetchDepartmentEmployees, type IaeEmployee } from "@/api/iaeEmployeesApi";
import { fetchMyProfile } from "@/api/myProfileApi";
import { useInternalNavigation } from "../routing/InternalNavigationContext";

/**
 * Fetches employees for a department.
 * Uses the departmentId from navigation viewData, or falls back to the provided default.
 * Also resolves the current logged-in user's contactId.
 */
export function useDepartmentTeam(fallbackDepartmentId: number) {
  const { viewData } = useInternalNavigation();
  const departmentId = viewData?.departmentId || fallbackDepartmentId;

  const [teamMembers, setTeamMembers] = useState<IaeEmployee[]>([]);
  const [currentContactId, setCurrentContactId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    fetchDepartmentEmployees(departmentId)
      .then(setTeamMembers)
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [departmentId]);

  useEffect(() => {
    fetchMyProfile()
      .then((profile) => setCurrentContactId(profile.contactId))
      .catch(console.error);
  }, []);

  return { teamMembers, currentContactId, isLoading, departmentId };
}
