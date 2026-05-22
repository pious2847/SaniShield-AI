"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  MapPin, Camera, CheckCircle2, AlertTriangle, Trash2,
  Radio, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, DISTRICTS, timeAgo } from "@/lib/utils";

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)] p-5";

const inputClass = (err: boolean) =>
  cn(
    "w-full h-10 px-3 rounded-[var(--radius-md)] border bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-sm font-body",
    "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]",
    "placeholder:text-[var(--color-text-3)] dark:placeholder:text-[var(--color-text-3-dark)]",
    "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40",
    err
      ? "border-[var(--color-critical)]"
      : "border-[var(--color-border)] dark:border-[var(--color-border-dark)] focus:border-[var(--color-primary)]"
  );

const dumpSchema = z.object({
  district:    z.string().min(1, "Select a district"),
  community:   z.string().min(2, "Enter the community name"),
  description: z.string().min(10, "Please describe the dump site (min 10 characters)"),
  latitude:    z.string().optional(),
  longitude:   z.string().optional(),
});

type DumpForm = z.infer<typeof dumpSchema>;

const severityDot: Record<string, string> = {
  critical: "bg-[var(--color-critical)]",
  high:     "bg-orange-500",
  moderate: "bg-[var(--color-warning)]",
  low:      "bg-[var(--color-info)]",
};

interface DumpSite {
  id: string;
  community: string;
  district: string;
  description: string;
  status: string;
  reported_by_name?: string;
  created_at: string;
}

export default function CommunityPage() {
  const [submitted, setSubmitted] = useState(false);
  const [locating,  setLocating]  = useState(false);
  const queryClient = useQueryClient();

  const { data: dumps = [], isLoading: dumpsLoading } = useQuery<DumpSite[]>({
    queryKey: ["community-dumps"],
    queryFn: async () => {
      const { data } = await api.get("/dumps?limit=20");
      return data.data ?? [];
    },
    staleTime: 60 * 1000,
  });

  const { data: alerts = [], isLoading: alertsLoading } = useQuery({
    queryKey: ["community-alerts"],
    queryFn: async () => {
      const { data } = await api.get("/alerts?limit=10&status=active");
      return data.data ?? [];
    },
    refetchInterval: 30 * 1000,
  });

  const { register, handleSubmit, setValue, reset, formState: { errors, isSubmitting } } =
    useForm<DumpForm>({ resolver: zodResolver(dumpSchema) });

  const reportMutation = useMutation({
    mutationFn: async (values: DumpForm) => {
      await api.post("/dumps", {
        district:    values.district,
        community:   values.community,
        description: values.description,
        latitude:    values.latitude ? parseFloat(values.latitude) : undefined,
        longitude:   values.longitude ? parseFloat(values.longitude) : undefined,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["community-dumps"] });
      setTimeout(() => { setSubmitted(false); reset(); }, 4000);
    },
  });

  const getLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setValue("latitude",  pos.coords.latitude.toString());
        setValue("longitude", pos.coords.longitude.toString());
        setLocating(false);
      },
      () => setLocating(false)
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
          Community Watch
        </h1>
        <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
          Report illegal dump sites and stay informed about sanitation alerts in your community
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className={cardClass}>
          <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-4">
            Report Illegal Dump Site
          </p>

          <AnimatePresence mode="wait">
            {submitted ? (
              <motion.div
                key="success"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center py-6 text-center"
              >
                <CheckCircle2 className="w-12 h-12 text-[var(--color-ok)] mb-3" />
                <p className="font-display font-semibold text-[var(--color-ok)] mb-1">Report Submitted</p>
                <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                  A sanitation officer will investigate within 48 hours.
                </p>
              </motion.div>
            ) : (
              <motion.form
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onSubmit={handleSubmit((v) => reportMutation.mutate(v))}
                className="space-y-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
                      District
                    </label>
                    <select {...register("district")} className={cn(inputClass(!!errors.district), "cursor-pointer")}>
                      <option value="">Select…</option>
                      {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
                    </select>
                    {errors.district && <p className="mt-1 text-[10px] text-[var(--color-critical)]">{errors.district.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
                      Community
                    </label>
                    <input
                      {...register("community")}
                      type="text"
                      placeholder="e.g. Choggu"
                      className={inputClass(!!errors.community)}
                    />
                    {errors.community && <p className="mt-1 text-[10px] text-[var(--color-critical)]">{errors.community.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
                    Description
                  </label>
                  <textarea
                    {...register("description")}
                    rows={3}
                    placeholder="Describe the location and state of the dump site…"
                    className={cn(
                      inputClass(!!errors.description),
                      "h-auto py-2.5 resize-none leading-relaxed"
                    )}
                  />
                  {errors.description && <p className="mt-1 text-[10px] text-[var(--color-critical)]">{errors.description.message}</p>}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={getLocation}
                    disabled={locating}
                    className={cn(
                      "flex items-center gap-1.5 text-xs font-body text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]",
                      "hover:underline transition-colors disabled:opacity-50"
                    )}
                  >
                    <MapPin className="w-3.5 h-3.5" />
                    {locating ? "Getting location…" : "Add GPS location"}
                  </button>
                  <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">(optional)</span>
                </div>

                {reportMutation.isError && (
                  <div className="px-3 py-2 rounded-[var(--radius-md)] bg-[var(--color-critical-bg)] dark:bg-[var(--color-critical-bg-dark)] text-xs font-body text-[var(--color-critical)]">
                    Failed to submit report. Please try again.
                  </div>
                )}

                <Button type="submit" variant="primary" size="sm" className="w-full" loading={isSubmitting || reportMutation.isPending}>
                  <Trash2 className="w-4 h-4" />
                  Submit Report
                </Button>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        <div className={cardClass}>
          <div className="flex items-center justify-between mb-4">
            <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider">
              Live Community Alerts
            </p>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ok)] animate-pulse" />
              <span className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">Live</span>
            </div>
          </div>

          {alertsLoading ? (
            <div className="flex justify-center py-6"><PageSpinner /></div>
          ) : alerts.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center">
              <Radio className="w-8 h-8 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-2 opacity-30" />
              <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">No active alerts</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.slice(0, 8).map((alert: { id: string; severity: string; message: string; status: string; created_at: string; district?: string }) => (
                <div
                  key={alert.id}
                  className="flex items-start gap-2.5 p-3 rounded-[var(--radius-md)] bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]"
                >
                  <span className={cn("w-2 h-2 rounded-full flex-shrink-0 mt-1.5", severityDot[alert.severity] ?? "bg-gray-400")} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] leading-snug">
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      {alert.district && (
                        <span className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">{alert.district}</span>
                      )}
                      <Clock className="w-2.5 h-2.5 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]" />
                      <span className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                        {timeAgo(alert.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className={`${cardClass} overflow-hidden p-0`}>
        <div className="p-5 pb-0">
          <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider">
            Recent Dump Site Reports
          </p>
        </div>

        {dumpsLoading ? (
          <div className="flex justify-center py-8"><PageSpinner /></div>
        ) : dumps.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <CheckCircle2 className="w-8 h-8 text-[var(--color-ok)] mb-2 opacity-40" />
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">No dump sites reported</p>
          </div>
        ) : (
          <motion.div
            initial="initial"
            animate="animate"
            variants={{ animate: { transition: { staggerChildren: 0.04 } } }}
            className="divide-y divide-[var(--color-border)] dark:divide-[var(--color-border-dark)] mt-4"
          >
            {dumps.map((d) => (
              <motion.div
                key={d.id}
                variants={{ initial: { opacity: 0, x: -8 }, animate: { opacity: 1, x: 0 } }}
                className="flex items-start gap-3 px-5 py-3.5 hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors"
              >
                <AlertTriangle className="w-4 h-4 text-[var(--color-warning)] flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] truncate">
                      {d.community}
                    </p>
                    <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                      · {d.district}
                    </span>
                  </div>
                  <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] truncate">{d.description}</p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-body font-semibold border capitalize",
                    d.status === "resolved"
                      ? "text-[var(--color-ok)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900"
                      : d.status === "investigating"
                      ? "text-blue-600 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-900"
                      : "text-[var(--color-warning)] bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-900"
                  )}>
                    {d.status}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                    {timeAgo(d.created_at)}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
