"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, LockOpen, Search, Users as UsersIcon } from "lucide-react";
import { api } from "@/lib/api";
import { PageSpinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  district: string | null;
  is_active: boolean;
  created_at: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  district_officer: "District Officer",
  sanitation_worker: "Sanitation Worker",
  school_admin: "School Admin",
  ngo_staff: "NGO Staff",
};

const ROLE_CLASSES: Record<string, string> = {
  admin:
    "text-[var(--color-ochre)] bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900",
  district_officer:
    "text-[var(--color-primary)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900",
  sanitation_worker:
    "text-blue-600 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900",
  school_admin:
    "text-purple-600 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-900",
  ngo_staff:
    "text-[var(--color-warning)] bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900",
};

const AVATAR_COLORS = [
  "bg-[var(--color-primary)]",
  "bg-[var(--color-ochre)]",
  "bg-blue-600",
  "bg-purple-600",
];

const STATUS_FILTERS = ["All", "Active", "Inactive"] as const;
const ROLE_FILTERS = [
  "All Roles",
  "admin",
  "district_officer",
  "sanitation_worker",
  "school_admin",
  "ngo_staff",
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function avatarColor(name: string) {
  return AVATAR_COLORS[name.charCodeAt(0) % 4];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border font-[var(--font-mono)]",
        ROLE_CLASSES[role] ?? "text-[var(--color-text-2)] bg-[var(--color-surface)] border-[var(--color-border)]"
      )}
    >
      {ROLE_LABELS[role] ?? role}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border",
        active
          ? "text-[var(--color-ok)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900"
          : "text-[var(--color-critical)] bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900"
      )}
    >
      <span
        className={cn(
          "inline-block w-1.5 h-1.5 rounded-full",
          active ? "bg-[var(--color-ok)]" : "bg-[var(--color-critical)]"
        )}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]>("All");
  const [roleFilter, setRoleFilter] = useState<string>("All Roles");

  // ── Data ──────────────────────────────────────────────────────────────────

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => (await api.get("/auth/users?limit=100")).data.data ?? [],
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.put(`/auth/users/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
  });

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return users.filter((u) => {
      const matchSearch =
        !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "All" ||
        (statusFilter === "Active" && u.is_active) ||
        (statusFilter === "Inactive" && !u.is_active);
      const matchRole = roleFilter === "All Roles" || u.role === roleFilter;
      return matchSearch && matchStatus && matchRole;
    });
  }, [users, search, statusFilter, roleFilter]);

  // ── Render ────────────────────────────────────────────────────────────────

  if (isLoading) return <PageSpinner />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1
            className="text-2xl font-bold tracking-tight text-[var(--color-text-1)]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            User Management
          </h1>
          <p className="mt-0.5 text-sm text-[var(--color-text-2)]">
            Manage platform accounts and access control
          </p>
        </div>
        <span
          className={cn(
            cardClass,
            "inline-flex items-center gap-2 px-3 py-1.5 text-sm text-[var(--color-text-2)] self-start sm:self-auto"
          )}
        >
          <UsersIcon className="w-4 h-4" />
          <span className="font-medium text-[var(--color-text-1)]">{users.length}</span>
          total users
        </span>
      </div>

      {/* Filter bar */}
      <div className={cn(cardClass, "p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:flex-wrap")}>
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-3)]" />
          <input
            type="text"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(
              "w-full pl-9 pr-3 py-1.5 text-sm rounded-[var(--radius-md)]",
              "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]",
              "border border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
              "text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)]",
              "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1",
              "transition-shadow duration-150"
            )}
          />
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-full border transition-colors duration-150",
                statusFilter === f
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "bg-transparent text-[var(--color-text-2)] border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              )}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Role filter select */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-[var(--radius-md)] cursor-pointer",
            "bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]",
            "border border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
            "text-[var(--color-text-1)]",
            "focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:ring-offset-1",
            "transition-shadow duration-150"
          )}
        >
          {ROLE_FILTERS.map((r) => (
            <option key={r} value={r}>
              {r === "All Roles" ? "All Roles" : (ROLE_LABELS[r] ?? r)}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className={cn(cardClass, "overflow-hidden")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                {["User", "Email", "Role", "District", "Status", "Created", "Actions"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-[var(--color-text-3)]"
                    style={{ fontFamily: "var(--font-mono)" }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence initial={false}>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-16 text-center">
                      <div className="flex flex-col items-center gap-3 text-[var(--color-text-3)]">
                        <UsersIcon className="w-10 h-10 opacity-40" />
                        <p className="text-sm">No users match your filters.</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSearch(""); setStatusFilter("All"); setRoleFilter("All Roles"); }}
                        >
                          Clear filters
                        </Button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2, delay: i * 0.03 }}
                      className={cn(
                        "border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] last:border-0",
                        "hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors duration-100"
                      )}
                    >
                      {/* Avatar + Name */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            className={cn(
                              "inline-flex items-center justify-center w-8 h-8 rounded-full text-white text-xs font-bold shrink-0",
                              avatarColor(user.name)
                            )}
                            aria-hidden="true"
                          >
                            {user.name.charAt(0).toUpperCase()}
                          </span>
                          <span className="font-medium text-[var(--color-text-1)] whitespace-nowrap">
                            {user.name}
                          </span>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-3 text-[var(--color-text-2)] whitespace-nowrap">
                        {user.email}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <RoleBadge role={user.role} />
                      </td>

                      {/* District */}
                      <td className="px-4 py-3 text-[var(--color-text-2)]">
                        {user.district ?? <span className="text-[var(--color-text-3)]">—</span>}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <StatusBadge active={user.is_active} />
                      </td>

                      {/* Created */}
                      <td className="px-4 py-3 text-[var(--color-text-2)] whitespace-nowrap font-[var(--font-mono)] text-xs">
                        {formatDate(user.created_at)}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => toggleMutation.mutate(user.id)}
                          disabled={toggleMutation.isPending && toggleMutation.variables === user.id}
                          className={cn(
                            "gap-1.5 transition-colors duration-150",
                            user.is_active
                              ? "text-[var(--color-critical)] border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950"
                              : "text-[var(--color-ok)] border-green-200 dark:border-green-900 hover:bg-green-50 dark:hover:bg-green-950"
                          )}
                          aria-label={user.is_active ? `Deactivate ${user.name}` : `Activate ${user.name}`}
                        >
                          {user.is_active ? (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              Deactivate
                            </>
                          ) : (
                            <>
                              <LockOpen className="w-3.5 h-3.5" />
                              Activate
                            </>
                          )}
                        </Button>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-4 py-2.5 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-xs text-[var(--color-text-3)]">
            Showing {filtered.length} of {users.length} users
          </div>
        )}
      </div>
    </motion.div>
  );
}
