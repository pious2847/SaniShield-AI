"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { CheckCircle2 } from "lucide-react";

const alignments = [
  {
    standard: "JMP Sanitation Ladder",
    indicator: "Safely managed sanitation services",
    how: "Tracks toilet condition, sludge treatment confirmation, and MHM facilities per the JMP definition of 'safely managed'",
  },
  {
    standard: "SDG 6.2",
    indicator: "Universal sanitation & hygiene by 2030",
    how: "District-level sanitation coverage metrics, school MHM compliance rates, and open defecation event tracking",
  },
  {
    standard: "UNICEF WASH Standards",
    indicator: "Climate-resilient WASH infrastructure",
    how: "Flood vulnerability scoring, post-flood asset inspection checklists, and recovery tracking for climate-damaged assets",
  },
  {
    standard: "Ghana WASH Policy 2023",
    indicator: "Fecal sludge management frameworks",
    how: "Full sludge service chain tracking from collection to treatment, with chain_complete verification matching FSM policy requirements",
  },
  {
    standard: "SPHERE Standards",
    indicator: "Humanitarian response benchmarks",
    how: "Emergency alert thresholds, asset-per-population ratios, and flood response checklists aligned with Sphere minimum standards",
  },
  {
    standard: "WHO / UNICEF JMP",
    indicator: "School WASH indicators",
    how: "Gender-separated facilities, functional MHM rooms, water availability, and disposal access tracked per school per district",
  },
];

export function UniCEFAlignmentSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="section-padding bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]">
      <div ref={ref} className="container-tight">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Left: heading + context */}
          <div>
            <motion.span
              initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}
              className="inline-block px-3 py-1 rounded-full bg-[var(--color-primary-muted)] dark:bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] text-[11px] font-body font-semibold uppercase tracking-widest mb-6"
            >
              UNICEF & SDG Alignment
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display font-bold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] mb-5 text-balance"
              style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
            >
              Built on international standards,<br />
              <span className="text-[var(--color-primary)] dark:text-[var(--color-primary-dark)]">not invented ones</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.2 }}
              className="text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] font-body text-lg leading-relaxed mb-6"
            >
              Every metric, every indicator, every threshold in N.E.X.U.S. maps to a recognised
              international standard. Data collected here is directly usable in UNICEF WASH
              programme reporting without reformatting.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-3 gap-4 pt-6 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)]"
            >
              {["SDG 6", "JMP", "SPHERE"].map((badge) => (
                <div key={badge} className="text-center p-4 rounded-[var(--radius-lg)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                  <div className="font-display font-bold text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] text-lg">{badge}</div>
                  <div className="text-[10px] text-[var(--color-text-3)] font-body uppercase tracking-wide mt-0.5">Aligned</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* Right: standards list */}
          <div className="space-y-3">
            {alignments.map(({ standard, indicator, how }, i) => (
              <motion.div
                key={standard}
                initial={{ opacity: 0, x: 24 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.08 * i }}
                className="flex gap-4 p-5 rounded-[var(--radius-lg)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/30 transition-colors"
              >
                <CheckCircle2 className="w-5 h-5 text-[var(--color-ok)] flex-shrink-0 mt-0.5" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display font-semibold text-sm text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]">{standard}</span>
                    <span className="text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] italic">— {indicator}</span>
                  </div>
                  <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] leading-relaxed">{how}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
