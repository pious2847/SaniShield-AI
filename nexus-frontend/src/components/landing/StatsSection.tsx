"use client";

import { motion, useInView, useMotionValue, useSpring, useTransform } from "framer-motion";
import { useEffect, useRef } from "react";
import { Activity, AlertTriangle, CheckCircle, Users } from "lucide-react";

const stats = [
  { value: 240,   suffix: "+",  label: "Assets Monitored",       icon: Activity,      detail: "Toilets, sanitation units, and waste facilities tracked in real-time" },
  { value: 12,    suffix: "",   label: "Districts Covered",       icon: Users,         detail: "Full Northern Region coverage from Tamale Metro to Gushegu" },
  { value: 98,    suffix: "%",  label: "Chain Completion Rate",   icon: CheckCircle,   detail: "Fecal sludge successfully tracked from collection to treatment" },
  { value: 25,    suffix: "mm", label: "Flood Trigger Threshold", icon: AlertTriangle, detail: "Automatic flood assessment activates when 24h rainfall exceeds this" },
];

function Counter({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });
  const motionValue = useMotionValue(0);
  const springValue = useSpring(motionValue, { duration: 1400, bounce: 0 });
  const display = useTransform(springValue, (v) => `${Math.round(v)}${suffix}`);

  useEffect(() => { if (inView) motionValue.set(value); }, [inView, motionValue, value]);

  return <motion.span ref={ref}>{display}</motion.span>;
}

export function StatsSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] section-padding border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
      <div ref={ref} className="container-tight">
        <div className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}
            className="inline-block px-3 py-1 rounded-full bg-[var(--color-primary-muted)] dark:bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] text-[11px] font-body font-semibold uppercase tracking-widest mb-5"
          >
            By The Numbers
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] text-balance"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
          >
            A living system — not a static report
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map(({ value, suffix, label, icon: Icon, detail }, i) => (
            <motion.div
              key={label}
              initial={{ opacity: 0, y: 24 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 * i }}
              className="group p-6 rounded-[var(--radius-xl)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-md)] transition-all duration-[var(--transition-base)] hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] dark:bg-[var(--color-primary)]/15 flex items-center justify-center mb-5 group-hover:bg-[var(--color-primary)] transition-colors duration-[var(--transition-base)]">
                <Icon className="w-5 h-5 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] group-hover:text-white transition-colors" />
              </div>
              <div className="font-display font-bold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] tabular-nums mb-1"
                style={{ fontSize: "clamp(2rem, 4vw, 2.8rem)", lineHeight: 1 }}>
                <Counter value={value} suffix={suffix} />
              </div>
              <div className="font-display font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] text-sm mb-2">{label}</div>
              <p className="text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] text-xs font-body leading-relaxed">{detail}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
