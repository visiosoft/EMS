import type { LucideIcon } from "lucide-react";
import { CreditCard, FileText, Headphones, Newspaper, Plane, Ship, Wallet } from "lucide-react";

export type QuickLinkItem = {
  label: string;
  href: string;
  icon: LucideIcon;
};

export const QUICK_LINKS: QuickLinkItem[] = [
  { label: "Company News", href: "#company-news", icon: Newspaper },
  { label: "Tech Support", href: "#tech-support", icon: Headphones },
  { label: "ADP Payroll Schedule", href: "#adp-payroll", icon: Wallet },
  { label: "PTO Requests", href: "#pto-requests", icon: Plane },
  { label: "Payment Requests", href: "#payment-requests", icon: CreditCard },
  { label: "Shipping Requests", href: "#shipping-requests", icon: Ship },
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
