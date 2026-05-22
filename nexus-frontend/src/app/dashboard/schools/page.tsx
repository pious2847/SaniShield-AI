"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap, Check, X } from "lucide-react";
import { PageSpinner } from "@/components/ui/spinner";
import { api } from "@/lib/api";
import { cn, DISTRICTS } from "@/lib/utils";

interface MhmCompliance {
  district: string;
  total_schools: number;
  compliant_schools: number;
  mhm_compliance_rate_pct: number;
}

interface School {
  id: string;
  school_name: string;
  district: string;
  mhm_room_count: number;
  mhm_has_water: boolean;
  mhm_has_disposal: boolean;
  mhm_is_functional: boolean;
}

const cardClass =
  "bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] rounded-[var(--radius-lg)]";

function BoolBadge({ val }: { val: boolean }) {
  return (
    <span className={cn(
      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body font-semibold border",
      val
        ? "text-[var(--color-ok)] bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-900"
        : "text-[var(--color-critical)] bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-900"
    )}>
      {val ? <Check className="w-2.5 h-2.5" /> : <X className="w-2.5 h-2.5" />}
      {val ? "Yes" : "No"}
    </span>
  );
}

export default function SchoolsPage() {
  const [district, setDistrict] = useState("Tamale Metro");
  const [funcOnly, setFuncOnly] = useState(false);

  const { data: compliance = [], isLoading: compLoading } = useQuery<MhmCompliance[]>({
    queryKey: ["mhm-compliance"],
    queryFn: async () => {
      const { data } = await api.get("/unicef/mhm-compliance");
      return data.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: schools = [], isLoading: schoolsLoading } = useQuery<School[]>({
    queryKey: ["schools", district],
    queryFn: async () => {
      const { data } = await api.get(`/unicef/schools?district=${encodeURIComponent(district)}&limit=100`);
      return data.data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });

  const districtCompliance = compliance.find((c) => c.district === district);
  const filtered = funcOnly ? schools.filter((s) => !s.mhm_is_functional) : schools;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-6"
    >
      <div>
        <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
          Schools MHM
        </h1>
        <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-0.5">
          Menstrual hygiene management facilities across schools
        </p>
      </div>

      {compLoading ? (
        <div className="flex justify-center py-6"><PageSpinner /></div>
      ) : (
        <div className={`${cardClass} p-5`}>
          <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider mb-4">
            District MHM Compliance Overview
          </p>
          <div className="space-y-3">
            {compliance.map((c) => (
              <div key={c.district} className={cn("flex items-center gap-3", c.district === district ? "opacity-100" : "opacity-70")}>
                <button
                  onClick={() => setDistrict(c.district)}
                  className={cn(
                    "text-xs font-body font-medium w-32 text-left truncate shrink-0 transition-colors",
                    c.district === district
                      ? "text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]"
                      : "text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] hover:text-[var(--color-primary)]"
                  )}
                >
                  {c.district}
                </button>
                <div className="flex-1 h-2 bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] rounded-full overflow-hidden">
                  <motion.div
                    className={cn(
                      "h-full rounded-full",
                      c.mhm_compliance_rate_pct >= 80 ? "bg-[var(--color-ok)]"
                        : c.mhm_compliance_rate_pct >= 50 ? "bg-[var(--color-primary)]"
                        : "bg-[var(--color-warning)]"
                    )}
                    initial={{ width: 0 }}
                    animate={{ width: `${c.mhm_compliance_rate_pct}%` }}
                    transition={{ duration: 0.8, delay: 0.1 }}
                  />
                </div>
                <span className="text-xs font-mono font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] w-10 text-right shrink-0">
                  {Math.round(c.mhm_compliance_rate_pct)}%
                </span>
                <span className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] w-20 text-right shrink-0 hidden sm:block">
                  {c.compliant_schools}/{c.total_schools} schools
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {districtCompliance && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Schools",    value: districtCompliance.total_schools },
            { label: "Compliant",        value: districtCompliance.compliant_schools },
            { label: "Compliance Rate",  value: `${Math.round(districtCompliance.mhm_compliance_rate_pct)}%` },
          ].map(({ label, value }) => (
            <div key={label} className={`${cardClass} p-4 text-center`}>
              <p className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] tabular-nums">{value}</p>
              <p className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wide mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      <div className={`${cardClass} overflow-hidden`}>
        <div className="p-5 pb-0 flex items-center justify-between">
          <div>
            <p className="font-display font-semibold text-xs text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] uppercase tracking-wider">
              School List — {district}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="h-8 px-2 rounded-[var(--radius-md)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
            >
              {DISTRICTS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-xs font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] cursor-pointer">
              <input
                type="checkbox"
                checked={funcOnly}
                onChange={(e) => setFuncOnly(e.target.checked)}
                className="accent-[var(--color-primary)] w-3.5 h-3.5"
              />
              Non-functional only
            </label>
          </div>
        </div>

        {schoolsLoading ? (
          <div className="flex justify-center py-10"><PageSpinner /></div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center px-5">
            <GraduationCap className="w-8 h-8 text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-2 opacity-30" />
            <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">No schools found</p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-4">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                  {["School", "District", "MHM Rooms", "Has Water", "Has Disposal", "Functional"].map((h) => (
                    <th key={h} className="px-5 py-3 text-left text-xs font-body font-semibold uppercase tracking-wider text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, idx) => (
                  <motion.tr
                    key={s.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: idx * 0.025 }}
                    className="border-b border-[var(--color-border)]/50 dark:border-[var(--color-border-dark)]/50 hover:bg-[var(--color-bg)] dark:hover:bg-[var(--color-bg-dark)] transition-colors"
                  >
                    <td className="px-5 py-3 font-body font-medium text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">
                      {s.school_name}
                    </td>
                    <td className="px-5 py-3 font-body text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] text-xs">
                      {s.district}
                    </td>
                    <td className="px-5 py-3 font-mono text-center text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]">
                      {s.mhm_room_count}
                    </td>
                    <td className="px-5 py-3"><BoolBadge val={s.mhm_has_water} /></td>
                    <td className="px-5 py-3"><BoolBadge val={s.mhm_has_disposal} /></td>
                    <td className="px-5 py-3"><BoolBadge val={s.mhm_is_functional} /></td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="p-3 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)] text-right">
          <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
            {filtered.length} schools
          </span>
        </div>
      </div>
    </motion.div>
  );
}
