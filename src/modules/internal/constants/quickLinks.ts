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

export type QuickLinkItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  external?: boolean;
};

export const QUICK_LINKS: QuickLinkItem[] = [
  { label: "Company News", href: "/internal/company-news", icon: Newspaper },
  { label: "Tech Support", href: "/internal/tech-support", icon: UsersRound },
  {
    label: "ADP Payroll Schedule",
    href: "https://innovationae.sharepoint.com/sites/IAECloudServer/Shared%20Documents/Forms/AllItems.aspx?id=%2Fsites%2FIAECloudServer%2FShared%20Documents%2FMarketing%2FTO%20REVIEW%2FMandy%2FzMANDY%20PRINT%20REQUESTS%2FADAM%20REVIEW%2F2026%20Payroll%20Schedule%20%28Revised%29%20%281%29%2Epdf&parent=%2Fsites%2FIAECloudServer%2FShared%20Documents%2FMarketing%2FTO%20REVIEW%2FMandy%2FzMANDY%20PRINT%20REQUESTS%2FADAM%20REVIEW&p=true&ga=1",
    icon: BadgeDollarSign,
    external: true,
  },
  { label: "PTO Requests", href: "https://signin.adp.com/", icon: CalendarDays, external: true },
  { label: "Payment Requests", href: "https://ramp.com/", icon: CreditCard, external: true },
  { label: "Shipping Requests", href: "/internal/shipping-requests", icon: Mail },
];

export const HUB_ACTION_CARDS = [
  { key: "sales-update", label: "Sales Update" },
  { key: "employee-services", label: "Employee Services" },
  { key: "past-engagements", label: "Past Engagements" },
  { key: "upcoming-engagements", label: "Upcoming Engagements" },
] as const;

export const TIME_ZONE_LOCATIONS = [
  { city: "Chicago, IL", timeZone: "America/Chicago", offsetLabel: null },
  { city: "New York, NY", timeZone: "America/New_York", offsetLabel: "+1h" },
  { city: "Denver, CO", timeZone: "America/Denver", offsetLabel: "-1h" },
  { city: "Los Angeles, CA", timeZone: "America/Los_Angeles", offsetLabel: "-2h" },
] as const;

export const DOCUMENT_ITEMS = [
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
    title: "Highlights and plans",
    summary: "Highlights and plans from the AI Team January 1, 2025...",
    author: "Haider Khalil",
    date: "February 18",
    views: "6 views",
    accent: "slate",
  },
  {
    title: "New Employee Benefit",
    summary: "New employee benefits at Lamna Healthcare Company...",
    author: "zulfiqar khan",
    date: "February 3",
    views: "8 views",
    accent: "orange",
  },
  {
    title: "iAE new Version is ready for launch",
    summary: "Highlights and plans from the AI Team January 1, 2025...",
    author: "zulfiqar khan",
    date: "February 3",
    views: "7 views",
    accent: "charcoal",
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
