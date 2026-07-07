import type { LucideIcon } from "lucide-react";
import {
  BadgeDollarSign,
  CalendarDays,
  CreditCard,
  FileText,
  Mail,
  Newspaper,
  UsersRound,
} from "lucide-react";
import type { InternalView } from "../routing/internalSessionRoute";

export type QuickLinkItem = {
  label: string;
  icon: LucideIcon;
  external?: boolean;
  href?: string;
  view?: InternalView;
};

export const GENUITY_HELP_CENTER_URL = "https://innovationarts.gogenuity.com/help_center";
export const SHIPPING_REQUESTS_URL =
  "https://innovationae.formstack.com/forms/iae_internal_shipping_requests";

export const QUICK_LINKS: QuickLinkItem[] = [
  { label: "Company News", view: "company-news", icon: Newspaper },
  { label: "Tech Support", href: GENUITY_HELP_CENTER_URL, icon: UsersRound, external: true },
  { label: "Payroll Schedule", view: "payroll-schedule", icon: BadgeDollarSign },
  { label: "PTO Requests", href: "https://signin.adp.com/", icon: CalendarDays, external: true },
  { label: "Payment Requests", href: "https://ramp.com/", icon: CreditCard, external: true },
  { label: "Shipping Requests", href: SHIPPING_REQUESTS_URL, icon: Mail, external: true },
];

export const HUB_ACTION_CARDS = [
  { key: "my-engagements", label: "My Engagements" },
  { key: "employee-services", label: "Employee Services" },
  { key: "employee-directory", label: "Employee Directory" },
  { key: "upcoming-engagements", label: "Upcoming Engagements" },
] as const;

export const DOCUMENT_ITEMS = [
  { name: "Document Library", type: "folder", colorClass: "text-blue-600", view: "document-library" as const },
  { name: "Employee-Handbook", type: "folder", colorClass: "text-teal-600" },
  { name: "Handbook Images", type: "folder", colorClass: "text-yellow-500" },
  { name: "spx-iae-custom-css.sppkg", type: "file", colorClass: "text-neutral-500" },
] as const;

export const SAMPLE_ENGAGEMENTS = [
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
  { month: "Month", day: "01", title: "Title of event", time: "Tuesday 12:00 AM - 1:00 PM" },
] as const;

export const HOME_NEWS_ITEMS = [
  {
    title: "Company News",
    summary: "Company News Stay updated with the latest announcements, achievements, and company-wide updates.",
    createdBy: "Haider Khalil",
  },
  {
    title: "Highlights and plans",
    summary: "Highlights and plans from the AI Team January 1, 2025...",
    createdBy: "Haider Khalil",
  },
  {
    title: "New Employee Benefit",
    summary: "New employee benefits at Lamna Healthcare Company...",
    createdBy: "zulfiqar khan",
  },
  {
    title: "iAE new Version is ready for launch",
    summary: "Highlights and plans from the AI Team January 1, 2025...",
    createdBy: "zulfiqar khan",
  },
] as const;

export const FOOTER_LINK_GROUPS = [
  {
    title: "Company Hub",
    links: ["Company News", "Employee Services", "Leadership", "Departments"],
  },
  {
    title: "Requests",
    links: ["PTO Requests", "Payment Requests", "Shipping Requests", "Tech Support"],
  },
  {
    title: "Resources",
    links: ["Employee Handbook", "Markets", "Venues", "Attractions"],
  },
] as const;
