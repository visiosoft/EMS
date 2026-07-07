import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  CalendarCheck2,
  CalendarDays,
  ClipboardList,
  FileBadge2,
  HeartPulse,
  Megaphone,
  Palette,
  ReceiptText,
  Settings2,
  Ticket,
  Umbrella,
} from "lucide-react";
import type { InternalView } from "../routing/internalSessionRoute";

export type EmployeeServiceItem = {
  title: string;
  icon: LucideIcon;
  /** Renders the IAE logo instead of the Lucide icon. */
  companyMark?: boolean;
  /** Opens the employee handbook index. */
  handbookIndex?: boolean;
  /** Opens this handbook section/subsection (e.g. COBRA under Work Performance). */
  handbookHash?: string;
  /** Jumps to a specific subsection number within the handbook section (e.g. "4.11", "5.5"). */
  handbookSubsection?: string;
  /** Opens an external resource in a new browser tab. */
  externalUrl?: string;
  /** Navigates to another internal hub view (e.g. Leadership, Payroll Schedule). */
  internalView?: InternalView;
};

export const EMPLOYEE_SERVICE_ITEMS: EmployeeServiceItem[] = [
  { title: "Employee Handbook", icon: FileBadge2, handbookIndex: true },
  { title: "Health Insurance", icon: HeartPulse, internalView: "health-insurance" },
  { title: "Payroll Schedule", icon: ReceiptText, internalView: "payroll-schedule" },
  { title: "PTO Request", icon: ClipboardList, externalUrl: "https://signin.adp.com" },
  { title: "Official Work Holiday", icon: Umbrella, handbookHash: "handbook-compensation-benefits", handbookSubsection: "4.11" },
  { title: "Company", icon: FileBadge2, companyMark: true, internalView: "leadership" },
];

export type LeadershipContact = {
  name: string;
  title: string;
  extension: string;
  mobile: string;
  email: string;
  companyMark?: boolean;
};

export const LEADERSHIP_CONTACTS: LeadershipContact[] = [
  { name: "Adam Epstein", title: "CEO", extension: "226", mobile: "(773) 580-8930", email: "adam@innovationae.com" },
  { name: "Andy Friedlander", title: "Ticketing Manager", extension: "265", mobile: "(561) 905-7262", email: "andy@innovationae.com" },
  { name: "Andrew Turbiville", title: "Event Business Manager", extension: "245", mobile: "(320) 349-0717", email: "aturbiville@innovationae.com" },
  { name: "Ben Viette", title: "Art Director", extension: "231", mobile: "(815) 501-1862", email: "bviette@innovationae.com" },
  { name: "George Wood", title: "Director of Operations", extension: "250", mobile: "(312) 731-5008", email: "george@innovationae.com" },
  { name: "Joe Kosin", title: "VP of Programming", extension: "221", mobile: "(773) 680-2081", email: "joe@innovationae.com" },
  { name: "Kim Grose", title: "Director of Production", extension: "23", mobile: "(305) 586-3156", email: "kgrose@innovationae.com" },
  { name: "Nichole Beeler", title: "Director of Marketing", extension: "224", mobile: "(847) 322-9091", email: "nichole@innovationae.com" },
  { name: "Rebecca Pepe", title: "Director of Marketing", extension: "232", mobile: "(847) 714-3244", email: "rebecca@innovationae.com" },
  { name: "IAE", title: "Company", extension: "(312) 274-1800", mobile: "—", email: "info@innovationae.com", companyMark: true },
];

export type DepartmentCard = {
  title: string;
  icon: LucideIcon;
};

export const DEPARTMENT_CARDS: DepartmentCard[] = [
  { title: "Art", icon: Palette },
  { title: "Events", icon: CalendarDays },
  { title: "Booking", icon: CalendarCheck2 },
  { title: "Marketing", icon: Megaphone },
  { title: "Ticketing & Sales", icon: Ticket },
  { title: "Production", icon: Settings2 },
];