"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import {
  LayoutDashboard, Map, Droplets, CloudRain, AlertTriangle,
  GraduationCap, FileBarChart, Radio, Users, Settings,
  ChevronLeft, ChevronRight, LogOut, Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navItems = [
  { href: "/dashboard",          icon: LayoutDashboard, label: "Overview",       exact: true },
  { href: "/map",                 icon: Map,             label: "Map Explorer" },
  { href: "/dashboard/sludge",   icon: Droplets,        label: "Sludge Chain" },
  { href: "/dashboard/floods",   icon: CloudRain,       label: "Flood Assessments" },
  { href: "/dashboard/alerts",   icon: AlertTriangle,   label: "Alerts" },
  { href: "/dashboard/schools",  icon: GraduationCap,   label: "Schools MHM" },
  { href: "/dashboard/reports",  icon: FileBarChart,    label: "Reports" },
  { href: "/community",          icon: Radio,           label: "Community Watch" },
];

const adminItems = [
  { href: "/admin",  icon: Shield, label: "Admin Panel" },
  { href: "/admin/users", icon: Users, label: "Users" },
];

export function DashboardSidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();
  const { user, logout } = useAuth();

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex-shrink-0 flex flex-col h-full bg-[var(--color-primary)] dark:bg-[var(--color-bg-dark)] border-r border-[var(--color-primary-hover)] dark:border-[var(--color-border-dark)] overflow-hidden"
    >
      {/* Fugu texture */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.8) 8px, rgba(255,255,255,0.8) 11px)`,
        }}
        aria-hidden
      />

      {/* Logo */}
      <div className="relative z-10 flex items-center gap-2.5 px-4 h-16 border-b border-white/15 flex-shrink-0">
        <div className="w-7 h-7 grid grid-cols-3 gap-0.5 p-0.5 flex-shrink-0">
          {[...Array(9)].map((_, i) => (
            <div key={i} className={`rounded-[1px] ${i === 4 ? "bg-[var(--color-ochre)]" : "bg-white/60"}`} />
          ))}
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
              className="flex flex-col leading-none overflow-hidden"
            >
              <span className="font-display font-bold text-base tracking-widest text-white">NEXUS</span>
              <span className="text-[9px] font-body tracking-[0.15em] uppercase text-white/50">N·E·X·U·S</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-3 flex flex-col gap-0.5 px-2">
        {navItems.map(({ href, icon: Icon, label, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-all duration-150 group",
                "min-w-0 overflow-hidden",
                active
                  ? "bg-white/15 text-white"
                  : "text-white/60 hover:text-white hover:bg-white/10"
              )}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" />
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="text-sm font-body font-medium truncate"
                  >
                    {label}
                  </motion.span>
                )}
              </AnimatePresence>
              {active && <span className="ml-auto w-1 h-1 rounded-full bg-[var(--color-ochre)] flex-shrink-0" />}
            </Link>
          );
        })}

        {user?.role === "admin" && (
          <>
            <div className="mt-3 mb-1 px-3">
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="text-[10px] font-body font-semibold uppercase tracking-widest text-white/30"
                  >
                    Admin
                  </motion.p>
                )}
              </AnimatePresence>
              {collapsed && <div className="h-px bg-white/15" />}
            </div>
            {adminItems.map(({ href, icon: Icon, label }) => (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-[var(--radius-md)] transition-all duration-150",
                  isActive(href) ? "bg-white/15 text-white" : "text-white/50 hover:text-white hover:bg-white/10"
                )}
              >
                <Icon className="w-4.5 h-4.5 flex-shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.1 }} className="text-sm font-body font-medium truncate">
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User + logout */}
      <div className="relative z-10 border-t border-white/15 p-3 flex-shrink-0">
        {!collapsed && user && (
          <div className="flex items-center gap-2.5 px-2 py-2 mb-1.5 rounded-[var(--radius-md)]">
            <div className="w-7 h-7 rounded-full bg-[var(--color-ochre)] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-display font-bold">
                {user.full_name?.[0]?.toUpperCase() ?? "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-body font-medium truncate">{user.full_name}</p>
              <p className="text-white/40 text-[10px] font-body truncate capitalize">{user.role?.replace("_", " ")}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          title="Logout"
          className="flex items-center gap-3 w-full px-3 py-2 rounded-[var(--radius-md)] text-white/50 hover:text-white hover:bg-white/10 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="text-sm font-body">Logout</motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 z-20 w-6 h-6 rounded-full bg-[var(--color-primary-hover)] border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-colors shadow-[var(--shadow-md)]"
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronLeft className="w-3 h-3" />}
      </button>
    </motion.aside>
  );
}
