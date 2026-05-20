import type { InternalView } from "../routing/internalSessionRoute";

export type InternalNavItem = {
  label: string;
  key: string;
  view?: InternalView;
};

export const INTERNAL_NAV_ITEMS: InternalNavItem[] = [
  { key: "employee-services", label: "Employee Services", view: "employee-services" },
  { key: "leadership", label: "Leadership", view: "leadership" },
  { key: "departments", label: "Departments", view: "departments" },
  { key: "markets", label: "Markets" },
  { key: "venues", label: "Venues" },
  { key: "attractions", label: "Attractions" },
];
