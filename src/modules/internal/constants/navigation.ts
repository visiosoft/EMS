export type InternalNavItem = {
  label: string;
  key: string;
  href: string;
};

export const INTERNAL_NAV_ITEMS: InternalNavItem[] = [
  { key: "employee-services", label: "Employee Services", href: "/internal/employee-services" },
  { key: "leadership", label: "Leadership", href: "/internal/leadership" },
  { key: "departments", label: "Departments", href: "/internal/departments" },
  { key: "markets", label: "Markets", href: "#markets" },
  { key: "venues", label: "Venues", href: "#venues" },
  { key: "attractions", label: "Attractions", href: "#attractions" },
];
