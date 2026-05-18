export type InternalNavItem = {
  label: string;
  key: string;
  href: string;
};

export const INTERNAL_NAV_ITEMS: InternalNavItem[] = [
  { key: "employee-services", label: "Employee Services", href: "#employee-services" },
  { key: "leadership", label: "Leadership", href: "#leadership" },
  { key: "departments", label: "Departments", href: "#departments" },
  { key: "markets", label: "Markets", href: "#markets" },
  { key: "venues", label: "Venues", href: "#venues" },
  { key: "attractions", label: "Attractions", href: "#attractions" },
];
