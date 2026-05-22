"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Shield, Zap, CloudRain, Radio, Users, CheckCircle2,
  AlertTriangle, Activity, ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, DISTRICTS, timeAgo } from "@/lib/utils";

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)] p-5";

interface SimEvent {
  step: string;
  result: unknown;
  timestamp: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  district?: string;
  is_active: boolean;
  created_at: string;
}

const roleColor: Record<string, string> = {
  admin:             "text-[var(--color-ochre)] bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900",
  district_officer:  "text-[var(--color-primary)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900",
  sanitation_worker: "text-blue-600 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900",
  school_admin:      "text-purple-600 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-900",
  ngo_staff:         "text-[var(--color-warning)] bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-900",
};

export default function AdminPage() {
  const [selectedDistrict, setSelectedDistrict] = useState("Tamale Metro");
  const [demoLog, setDemoLog]                   = useState<SimEvent[]>([]);
  const [demoRunning, setDemoRunning]           = useState(false);
  const queryClient                             = useQueryClient();

  const { data: users = [], isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data } = await api.get("/users?limit=30");
      return data.data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const { data: allStats } = useQuery({
    queryKey: ["sludge-chain-stats"],
    queryFn: async () => {
      const { data } = await api.get("/sludge-jobs/stats/chain");
      return (data.data ?? []) as Array<{ district: string; total: number; completed: number; completion_rate: number }>;
    },
    staleTime: 60 * 1000,
  });

  const spikeMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/simulator/sensor-spike", {});
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });

  const floodMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.post("/simulator/flood-event", { district: selectedDistrict });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["flood-assessments"] }),
  });

  const runFullDemo = async () => {
    setDemoRunning(true);
    setDemoLog([]);
    try {
      const { data } = await api.post("/simulator/full-demo", { district: selectedDistrict });
      const events: SimEvent[] = data.events ?? [];
      for (let i = 0; i < events.length; i++) {
        await new Promise((r) => setTimeout(r, 600));
        setDemoLog((prev) => [...prev, events[i]]);
      }
      queryClient.invalidateQueries();
    } finally {
      setDemoRunning(false);
    }
  };

  const totalUsers   = users.length;
  const activeUsers  = users.filter((u) => u.is_active).length;
  const adminCount   = users.filter((u) => u.role === "admin").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
            Admin Panel
          </h1>
          <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
            System oversight, demo controls, and user management
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-900">
          <Shield className="w-3.5 h-3.5 text-[var(--color-ochre)]" />
          <span className="text-xs font-body font-semibold text-[var(--color-ochre)]">Admin Access</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Users",  value: totalUsers },
          { label: "Active",       value: activeUsers },
          { label: "Admins",       value: adminCount },
        ].map(({ label, value }) => (
          <div key={label} className={`${cardClass} text-center py-4`}>
            <p className="font-display font-bold text-3xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] tabular-nums">{value}</p>
            <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      <div className={cardClass}>
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-1">
              Demo Simulator
            </p>
            <p className="text-sm font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
              Trigger simulated events for live hackathon demonstrations.
            </p>
          </div>
          <select
            value={selectedDistrict}
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="h-8 px-2 rounded-[var(--radius-md)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] focus:outline-none flex-shrink-0"
          >
            {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <button
            onClick={() => spikeMutation.mutate()}
            disabled={spikeMutation.isPending}
            className={cn(
              "flex flex-col items-start gap-2 p-4 rounded-[var(--radius-md)] border-2 transition-all duration-150 text-left",
              "border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
              "hover:border-[var(--color-warning)] hover:bg-orange-50 dark:hover:bg-orange-950/30",
              spikeMutation.isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <Activity className="w-5 h-5 text-[var(--color-warning)]" />
            <div>
              <p className="font-display font-semibold text-sm text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">Sensor Spike</p>
              <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">Critical overflow + alert</p>
            </div>
            {spikeMutation.isPending ? (
              <span className="text-xs font-mono text-[var(--color-warning)]">Running…</span>
            ) : spikeMutation.isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--color-ok)]" />
            ) : null}
          </button>

          <button
            onClick={() => floodMutation.mutate()}
            disabled={floodMutation.isPending}
            className={cn(
              "flex flex-col items-start gap-2 p-4 rounded-[var(--radius-md)] border-2 transition-all duration-150 text-left",
              "border-[var(--color-border)] dark:border-[var(--color-border-dark)]",
              "hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30",
              floodMutation.isPending ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <CloudRain className="w-5 h-5 text-blue-500" />
            <div>
              <p className="font-display font-semibold text-sm text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">Flood Event</p>
              <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">Flood assessment + checks</p>
            </div>
            {floodMutation.isPending ? (
              <span className="text-xs font-mono text-blue-500">Running…</span>
            ) : floodMutation.isSuccess ? (
              <CheckCircle2 className="w-4 h-4 text-[var(--color-ok)]" />
            ) : null}
          </button>

          <button
            onClick={runFullDemo}
            disabled={demoRunning}
            className={cn(
              "flex flex-col items-start gap-2 p-4 rounded-[var(--radius-md)] border-2 transition-all duration-150 text-left",
              "border-[var(--color-primary)] bg-[var(--color-primary)]/5",
              "hover:bg-[var(--color-primary)]/10",
              demoRunning ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
            )}
          >
            <Zap className="w-5 h-5 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]" />
            <div>
              <p className="font-display font-semibold text-sm text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]">Full Demo</p>
              <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">3-step orchestrated scenario</p>
            </div>
            {demoRunning && (
              <span className="text-xs font-mono text-[var(--color-primary)]">Running…</span>
            )}
          </button>
        </div>

        {demoLog.length > 0 && (
          <div className="rounded-[var(--radius-md)] bg-[var(--color-bg-dark)] p-4 space-y-2">
            <p className="text-xs font-mono text-white/50 uppercase tracking-widest mb-3">Demo Event Log</p>
            {demoLog.map((e, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-[var(--color-ok)] flex-shrink-0 mt-0.5" />
                <div>
                  <span className="text-xs font-mono text-white/80 font-semibold">{e.step}</span>
                  <span className="text-xs font-mono text-white/40 ml-2">{timeAgo(e.timestamp)}</span>
                </div>
              </motion.div>
            ))}
            {demoRunning && (
              <div className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 rounded-full border-2 border-[var(--color-ok)] border-t-transparent animate-spin flex-shrink-0" />
                <span className="text-xs font-mono text-white/40">Running next step…</span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={cardClass}>
        <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-4">
          Sludge Chain by District
        </p>
        {allStats ? (
          <div className="space-y-2.5">
            {allStats.map((s) => (
              <div key={s.district} className="flex items-center gap-3">
                <span className="text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] w-28 truncate shrink-0">
                  {s.district}
                </span>
                <div className="flex-1 h-2 bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      s.completion_rate >= 70 ? "bg-[var(--color-ok)]"
                        : s.completion_rate >= 40 ? "bg-[var(--color-primary)]"
                        : "bg-[var(--color-warning)]"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${s.completion_rate}%` }}
                    transition={{ duration: 0.7, delay: 0.1 }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] w-10 text-right shrink-0">
                  {Math.round(s.completion_rate)}%
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex justify-center py-4"><PageSpinner /></div>
        )}
      </div>

      <div className={`${cardClass} overflow-hidden p-0`}>
        <div className="p-5 pb-0 flex items-center justify-between">
          <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider">
            System Users
          </p>
          <span className="text-xs font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">{totalUsers} total</span>
        </div>

        {usersLoading ? (
          <div className="flex justify-center py-8"><PageSpinner /></div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                  {["Name", "Email", "Role", "District", "Status", "Joined"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, idx) => (
                  <motion.tr
                    key={u.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.02 }}
                    className="border-b border-[var(--color-border)]/50 dark:border-[var(--color-border-dark)]/50 hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors"
                  >
                    <td className="px-5 py-3 font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] whitespace-nowrap">
                      {u.full_name}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
                      {u.email}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-body font-semibold border capitalize whitespace-nowrap", roleColor[u.role] ?? "text-gray-600 bg-gray-50 border-gray-200")}>
                        {u.role.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
                      {u.district ?? "—"}
                    </td>
                    <td className="px-5 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded-full text-xs font-body font-semibold border",
                        u.is_active
                          ? "text-[var(--color-ok)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900"
                          : "text-[var(--color-text-3)] bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800"
                      )}>
                        {u.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                      {timeAgo(u.created_at)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </motion.div>
  );
}
