"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, ChevronDown, Search, Moon, Sun, X, AlertTriangle, LayoutDashboard, Map, Droplets, CloudRain, GraduationCap, FileBarChart, Toilet, Truck, Trash2, BookOpen, Megaphone, CloudSun, Newspaper, Radio, Shield, Users, ArrowRight, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { cn, timeAgo, DISTRICTS, type District } from "@/lib/utils";
import { useAlerts } from "@/hooks/useDashboard";
import { useDistrict } from "@/context/DistrictContext";

// ─── nav index (mirrored from sidebar) ────────────────────────────────────────

const NAV_INDEX = [
  { href: "/dashboard",             label: "Overview",         icon: LayoutDashboard, group: "Dashboard" },
  { href: "/map",                   label: "Map Explorer",     icon: Map,             group: "Dashboard" },
  { href: "/dashboard/sludge",      label: "Sludge Chain",     icon: Droplets,        group: "Dashboard" },
  { href: "/dashboard/floods",      label: "Flood Assessments",icon: CloudRain,       group: "Dashboard" },
  { href: "/dashboard/alerts",      label: "Alerts",           icon: AlertTriangle,   group: "Dashboard" },
  { href: "/dashboard/toilets",     label: "Toilet Registry",  icon: Toilet,          group: "Dashboard" },
  { href: "/dashboard/gatherers",   label: "Gatherers",        icon: Truck,           group: "Dashboard" },
  { href: "/dashboard/dumps",       label: "Dump Sites",       icon: Trash2,          group: "Dashboard" },
  { href: "/dashboard/schools",     label: "Schools MHM",      icon: GraduationCap,   group: "Dashboard" },
  { href: "/dashboard/educator",    label: "AI Educator",      icon: BookOpen,        group: "Dashboard" },
  { href: "/dashboard/broadcasts",  label: "Broadcasts",       icon: Megaphone,       group: "Dashboard" },
  { href: "/dashboard/weather",     label: "Weather",          icon: CloudSun,        group: "Dashboard" },
  { href: "/dashboard/news",        label: "News Intelligence",icon: Newspaper,       group: "Dashboard" },
  { href: "/dashboard/reports",     label: "Reports",          icon: FileBarChart,    group: "Dashboard" },
  { href: "/community",             label: "Community Watch",  icon: Radio,           group: "Community" },
  { href: "/admin",                 label: "Admin Panel",      icon: Shield,          group: "Admin" },
  { href: "/admin/users",           label: "User Management",  icon: Users,           group: "Admin" },
];

// ─── severity config ──────────────────────────────────────────────────────────

const SEV_DOT: Record<string, string> = {
  critical: "bg-[var(--color-critical)] animate-pulse",
  high:     "bg-orange-500",
  moderate: "bg-[var(--color-warning)]",
  low:      "bg-[var(--color-ok)]",
};

const SEV_TEXT: Record<string, string> = {
  critical: "text-[var(--color-critical)]",
  high:     "text-orange-500",
  moderate: "text-[var(--color-warning)]",
  low:      "text-[var(--color-ok)]",
};

// ─── notification panel ───────────────────────────────────────────────────────

interface Alert {
  id: string;
  alert_type: string;
  severity: string;
  message: string;
  district: string;
  status: string;
  created_at: string;
}

function NotificationsPanel({
  alerts,
  onClose,
}: {
  alerts: Alert[];
  onClose: () => void;
}) {
  const router = useRouter();
  const active = alerts.filter((a) => a.status === "active");

  return (
    <motion.div
      initial={{ opacity: 0, y: -8, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
      className="absolute top-full right-0 mt-2 w-80 z-50 rounded-[var(--radius-lg)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] shadow-[var(--shadow-lg)] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
        <div className="flex items-center gap-2">
          <Bell className="w-3.5 h-3.5 text-[var(--color-text-3)]" />
          <span className="text-xs font-display font-semibold uppercase tracking-wider text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
            Notifications
          </span>
          {active.length > 0 && (
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-[var(--color-critical)] text-white">
              {active.length}
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full text-[var(--color-text-3)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {/* List */}
      <div className="max-h-80 overflow-y-auto">
        {active.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center px-4">
            <Bell className="w-8 h-8 text-[var(--color-text-3)] opacity-30 mb-2" />
            <p className="text-sm font-body text-[var(--color-text-3)]">No active alerts</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--color-border)] dark:divide-[var(--color-border-dark)]">
            {active.slice(0, 10).map((alert) => (
              <button
                key={alert.id}
                onClick={() => { router.push("/dashboard/alerts"); onClose(); }}
                className="w-full text-left px-4 py-3 hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors group"
              >
                <div className="flex items-start gap-2.5">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full flex-shrink-0 mt-1",
                      SEV_DOT[alert.severity] ?? "bg-[var(--color-text-3)]"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] line-clamp-2 leading-snug">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={cn("text-[10px] font-body font-semibold capitalize", SEV_TEXT[alert.severity] ?? "text-[var(--color-text-3)]")}>
                        {alert.severity}
                      </span>
                      <span className="text-[var(--color-text-3)]">·</span>
                      <span className="text-[10px] font-mono text-[var(--color-text-3)]">
                        {alert.district}
                      </span>
                      <span className="text-[var(--color-text-3)]">·</span>
                      <span className="text-[10px] font-mono text-[var(--color-text-3)]">
                        {timeAgo(alert.created_at)}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-3 h-3 text-[var(--color-text-3)] opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <button
        onClick={() => { router.push("/dashboard/alerts"); onClose(); }}
        className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-xs font-body font-medium text-[var(--color-primary)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors"
      >
        View all alerts
        <ArrowRight className="w-3 h-3" />
      </button>
    </motion.div>
  );
}

// ─── command palette ──────────────────────────────────────────────────────────

function CommandPalette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { setDistrict } = useDistrict();
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const q = query.toLowerCase().trim();

  // Build results
  const pageResults = NAV_INDEX.filter(
    (n) => !q || n.label.toLowerCase().includes(q) || n.group.toLowerCase().includes(q)
  ).map((n) => ({ ...n, kind: "page" as const }));

  const districtResults = DISTRICTS.filter(
    (d) => !q || d.toLowerCase().includes(q)
  ).map((d) => ({ href: "", label: d, icon: Zap, group: "Districts", kind: "district" as const, district: d }));

  const results = q
    ? [...pageResults, ...districtResults]
    : [...pageResults.slice(0, 6), ...districtResults.slice(0, 4)];

  const totalResults = results.length;

  const handleSelect = useCallback(
    (item: (typeof results)[number]) => {
      if (item.kind === "district") {
        setDistrict(item.district as District);
      } else {
        router.push(item.href);
      }
      onClose();
    },
    [router, setDistrict, onClose]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setCursor((c) => Math.min(c + 1, totalResults - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setCursor((c) => Math.max(c - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (results[cursor]) handleSelect(results[cursor]);
    } else if (e.key === "Escape") {
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${cursor}"]`) as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  // Group results for display
  const groups: Record<string, typeof results> = {};
  results.forEach((r) => {
    groups[r.group] = groups[r.group] ?? [];
    groups[r.group].push(r);
  });

  let flatIdx = 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Panel */}
      <motion.div
        initial={{ opacity: 0, y: -12, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -12, scale: 0.97 }}
        transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
        className="relative w-full max-w-lg rounded-[var(--radius-lg)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
          <Search className="w-4 h-4 text-[var(--color-text-3)] flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setCursor(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, districts…"
            className="flex-1 bg-transparent text-sm font-body text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] placeholder:text-[var(--color-text-3)] focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[var(--color-text-3)] hover:text-[var(--color-text-2)] transition-colors">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-[10px] font-mono text-[var(--color-text-3)]">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-1.5">
          {totalResults === 0 ? (
            <p className="px-4 py-8 text-center text-sm font-body text-[var(--color-text-3)]">
              No results for &ldquo;{query}&rdquo;
            </p>
          ) : (
            Object.entries(groups).map(([group, items]) => (
              <div key={group} className="mb-1">
                <p className="px-4 py-1 text-[10px] font-display font-semibold uppercase tracking-widest text-[var(--color-text-3)]">
                  {group}
                </p>
                {items.map((item) => {
                  const idx = flatIdx++;
                  const Icon = item.icon;
                  const isActive = cursor === idx;
                  return (
                    <button
                      key={item.kind === "district" ? `d-${item.label}` : item.href}
                      data-idx={idx}
                      onMouseEnter={() => setCursor(idx)}
                      onClick={() => handleSelect(item)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-2 text-sm font-body transition-colors",
                        isActive
                          ? "bg-[var(--color-primary)] text-white"
                          : "text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)]"
                      )}
                    >
                      <Icon className={cn("w-4 h-4 flex-shrink-0", isActive ? "text-white" : "text-[var(--color-text-3)]")} />
                      <span className="flex-1 text-left">{item.label}</span>
                      {item.kind === "district" && (
                        <span className={cn("text-[10px] font-mono", isActive ? "text-white/70" : "text-[var(--color-text-3)]")}>
                          Switch district
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer hints */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
          {[
            { keys: ["↑", "↓"], label: "navigate" },
            { keys: ["↵"], label: "select" },
            { keys: ["esc"], label: "close" },
          ].map(({ keys, label }) => (
            <div key={label} className="flex items-center gap-1">
              {keys.map((k) => (
                <kbd key={k} className="px-1 py-0.5 rounded border border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-[10px] font-mono text-[var(--color-text-3)]">
                  {k}
                </kbd>
              ))}
              <span className="text-[10px] font-body text-[var(--color-text-3)] ml-0.5">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── topbar ───────────────────────────────────────────────────────────────────

export function DashboardTopbar() {
  const { district, setDistrict } = useDistrict();
  const { theme, setTheme } = useTheme();
  const [mounted,      setMounted]        = useState(false);
  const [districtOpen, setDistrictOpen]   = useState(false);
  const [searchOpen, setSearchOpen]       = useState(false);
  const [notifOpen, setNotifOpen]         = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const { data: alerts = [] } = useAlerts(district);
  const activeAlerts  = (alerts as Alert[]).filter((a) => a.status === "active");
  const criticalCount = activeAlerts.filter((a) => a.severity === "critical").length;

  const now = new Date().toLocaleString("en-GH", {
    weekday: "short", day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });

  useEffect(() => { setMounted(true); }, []);

  // Cmd/Ctrl+K opens search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen((v) => !v);
        setNotifOpen(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Close notifications on outside click
  useEffect(() => {
    if (!notifOpen) return;
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [notifOpen]);

  return (
    <>
      <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] gap-4">
        {/* District selector */}
        <div className="relative">
          <button
            onClick={() => setDistrictOpen(!districtOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] hover:border-[var(--color-primary)]/40 transition-colors"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--color-ok)]" />
            <span className="font-display font-semibold text-sm text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
              {district}
            </span>
            <ChevronDown className={cn("w-3.5 h-3.5 text-[var(--color-text-3)] transition-transform", districtOpen && "rotate-180")} />
          </button>

          <AnimatePresence>
            {districtOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -6, scale: 0.97 }}
                transition={{ duration: 0.12 }}
                className="absolute top-full left-0 mt-1 z-50 w-52 rounded-[var(--radius-lg)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] shadow-[var(--shadow-lg)] overflow-hidden"
              >
                {DISTRICTS.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setDistrict(d as District); setDistrictOpen(false); }}
                    className={cn(
                      "w-full text-left px-4 py-2.5 text-sm font-body transition-colors flex items-center gap-2",
                      d === district
                        ? "bg-[var(--color-primary)]/8 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] font-medium"
                        : "text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)]"
                    )}
                  >
                    {d === district && <div className="w-1 h-1 rounded-full bg-[var(--color-primary)] flex-shrink-0" />}
                    {d}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-1 ml-auto">
          <span className="hidden md:block text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mr-2">
            {now}
          </span>

          {/* Search */}
          <button
            onClick={() => { setSearchOpen(true); setNotifOpen(false); }}
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-3)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] hover:text-[var(--color-text-1)] dark:hover:text-[var(--color-text-1-dark)] transition-colors"
            title="Search (Ctrl+K)"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notifications */}
          <div ref={notifRef} className="relative">
            <button
              onClick={() => { setNotifOpen((v) => !v); setDistrictOpen(false); }}
              className={cn(
                "relative w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] transition-colors",
                notifOpen
                  ? "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]"
                  : "text-[var(--color-text-3)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] hover:text-[var(--color-text-1)] dark:hover:text-[var(--color-text-1-dark)]"
              )}
            >
              <Bell className="w-4 h-4" />
              {activeAlerts.length > 0 && (
                <span className={cn(
                  "absolute top-1.5 right-1.5 min-w-[14px] h-3.5 rounded-full text-[9px] font-display font-bold text-white flex items-center justify-center px-0.5",
                  criticalCount > 0 ? "bg-[var(--color-critical)] animate-pulse" : "bg-[var(--color-warning)]"
                )}>
                  {activeAlerts.length > 9 ? "9+" : activeAlerts.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <NotificationsPanel
                  alerts={alerts as Alert[]}
                  onClose={() => setNotifOpen(false)}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Theme toggle — mounted gate prevents server/client icon mismatch */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="w-9 h-9 flex items-center justify-center rounded-[var(--radius-md)] text-[var(--color-text-3)] hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] hover:text-[var(--color-text-1)] dark:hover:text-[var(--color-text-1-dark)] transition-colors"
            aria-label="Toggle theme"
          >
            {!mounted ? (
              <span className="block w-4 h-4" aria-hidden />
            ) : theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </div>
      </header>

      {/* Command palette — rendered at root level */}
      <AnimatePresence>
        {searchOpen && (
          <CommandPalette onClose={() => setSearchOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}
