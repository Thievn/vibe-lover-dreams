import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Telescope, Orbit, Wand2, UserRound } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { dashboardPathWithNav } from "@/lib/dashboardNav";

function navParam(search: string) {
  return new URLSearchParams(search).get("nav");
}

const items: {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  match: (pathname: string, search: string) => boolean;
}[] = [
  {
    to: "/dashboard",
    label: "Deck",
    icon: LayoutDashboard,
    match: (p, s) => {
      if (p !== "/dashboard") return false;
      const n = navParam(s);
      return n !== "discover" && n !== "nexus";
    },
  },
  {
    to: "/create-companion",
    label: "Forge",
    icon: Wand2,
    match: (p) => p === "/create-companion",
  },
  {
    to: dashboardPathWithNav("discover"),
    label: "Discover",
    icon: Telescope,
    match: (p, s) => p === "/dashboard" && navParam(s) === "discover",
  },
  {
    to: dashboardPathWithNav("nexus"),
    label: "Nexus",
    icon: Orbit,
    match: (p, s) => p === "/dashboard" && navParam(s) === "nexus",
  },
  {
    to: "/account",
    label: "You",
    icon: UserRound,
    match: (p) => p === "/account" || p === "/settings",
  },
];

export function MobileBottomNav() {
  const { pathname, search } = useLocation();

  return (
    <motion.nav
      initial={false}
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-[60]",
        "border-t border-white/[0.08] bg-[#050508]/95 backdrop-blur-xl shadow-[0_-8px_32px_rgba(0,0,0,0.45)]",
      )}
      aria-label="Main navigation"
    >
      <div
        className="mx-auto flex max-w-lg items-stretch justify-around gap-0 px-1 pt-1"
        style={{ paddingBottom: "max(0.35rem, env(safe-area-inset-bottom))" }}
      >
        {items.map(({ to, label, icon: Icon, match }) => {
          const active = match(pathname, search);
          return (
            <NavLink
              key={label}
              to={to}
              className={cn(
                "flex min-h-[48px] min-w-[48px] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl px-1 py-1.5 transition-colors touch-manipulation",
                active ? "text-primary" : "text-muted-foreground active:text-foreground",
              )}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className={cn(
                  "h-5 w-5 shrink-0 transition-transform",
                  active && "text-[#FF2D7B] drop-shadow-[0_0_10px_rgba(255,45,123,0.35)]",
                )}
                strokeWidth={active ? 2.25 : 2}
              />
              <span className="max-w-[4.5rem] truncate text-[10px] font-semibold uppercase tracking-wider">
                {label}
              </span>
              {active ? (
                <span className="mt-0.5 h-0.5 w-6 rounded-full bg-primary shadow-[0_0_8px_rgba(255,45,123,0.6)]" />
              ) : (
                <span className="mt-0.5 h-0.5 w-6 rounded-full bg-transparent" aria-hidden />
              )}
            </NavLink>
          );
        })}
      </div>
    </motion.nav>
  );
}
