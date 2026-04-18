import type { LucideIcon } from "lucide-react";
import {
  Gamepad2,
  LayoutDashboard,
  Layers,
  MessageSquare,
  Orbit,
  Telescope,
} from "lucide-react";

/** Sidebar / command-deck tabs — single source for Dashboard + marketing discovery. */
export type DashboardNavId = "dashboard" | "collection" | "discover" | "nexus" | "toy" | "history";

/** @deprecated Use DashboardNavId — kept for gradual refactors */
export type NavId = DashboardNavId;

export const DASHBOARD_NAV_QUERY = "nav" as const;

export const DASHBOARD_NAV_ITEMS: { id: DashboardNavId; label: string; icon: LucideIcon }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "collection", label: "My Collection", icon: Layers },
  { id: "discover", label: "Discover", icon: Telescope },
  { id: "nexus", label: "The Nexus", icon: Orbit },
  { id: "toy", label: "Toy Control", icon: Gamepad2 },
  { id: "history", label: "Chat History", icon: MessageSquare },
];

const NAV_ID_SET = new Set<string>(DASHBOARD_NAV_ITEMS.map((x) => x.id));

export function dashboardPathWithNav(nav: DashboardNavId): string {
  const q = new URLSearchParams({ [DASHBOARD_NAV_QUERY]: nav });
  return `/dashboard?${q.toString()}`;
}

export function parseDashboardNavParam(value: string | null): DashboardNavId | null {
  if (!value || !NAV_ID_SET.has(value)) return null;
  return value as DashboardNavId;
}
