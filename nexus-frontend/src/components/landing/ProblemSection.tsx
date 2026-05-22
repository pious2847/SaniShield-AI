"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const problems = [
  {
    stat: "40%",
    label: "of sanitation capacity",
    detail: "lost every flood season in Northern Ghana due to infrastructure damage and inaccessibility",
  },
  {
    stat: "2.4M",
    label: "people affected",
    detail: "across 10 districts relying on sanitation systems with no real-time monitoring or early warning",
  },
  {
    stat: "0",
    label: "real-time systems",
    detail: "existed before N.E.X.U.S. to track the fecal sludge chain from toilet to treatment facility",
  },
];

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.25, 0.1, 0.25, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function ProblemSection() {
  return (
    <section id="about" className="relative overflow-hidden">
      {/* Dark image bg */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1547471080-7cc2caa01a7e?w=1920&q=80&auto=format&fit=crop')`,
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[#0a1f14]/92" />
      </div>

      <div className="relative z-10 container-tight section-padding">
        <div className="max-w-2xl mx-auto text-center mb-16">
          <FadeUp>
            <span className="inline-block px-3 py-1 rounded-full bg-[var(--color-ochre)]/15 border border-[var(--color-ochre)]/30 text-[var(--color-ochre)] text-[11px] font-body font-semibold uppercase tracking-widest mb-5">
              The Crisis
            </span>
          </FadeUp>
          <FadeUp delay={0.1}>
            <h2 className="font-display font-bold text-white mb-5 text-balance"
              style={{ fontSize: "clamp(1.8rem, 4vw, 2.8rem)" }}>
              Northern Ghana loses 40% of sanitation capacity every flood season
            </h2>
          </FadeUp>
          <FadeUp delay={0.2}>
            <p className="text-white/65 font-body text-lg leading-relaxed">
              Climate change is intensifying rainfall variability across the Sahel. When the rains come —
              and they come harder every year — Northern Ghana's sanitation infrastructure fails silently,
              with no system to detect it, track it, or respond to it.
            </p>
          </FadeUp>
        </div>

        {/* Problem stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {problems.map(({ stat, label, detail }, i) => (
            <FadeUp key={stat} delay={0.1 * (i + 1)}>
              <div className="p-8 rounded-[var(--radius-xl)] bg-white/5 border border-white/10 hover:bg-white/8 transition-colors">
                <div className="font-display font-bold text-[var(--color-ochre)] mb-2"
                  style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)" }}>
                  {stat}
                </div>
                <div className="font-display font-semibold text-white text-lg mb-3">{label}</div>
                <p className="text-white/55 font-body text-sm leading-relaxed">{detail}</p>
              </div>
            </FadeUp>
          ))}
        </div>

        {/* Pull quote */}
        <FadeUp delay={0.4}>
          <blockquote className="max-w-2xl mx-auto text-center">
            <p className="font-display font-medium text-white/80 text-xl md:text-2xl leading-relaxed italic">
              "Without real-time data, districts respond to sanitation crises days after they start —
              not hours. N.E.X.U.S. changes that."
            </p>
            <footer className="mt-4 text-[var(--color-ochre)] text-sm font-body font-medium">
              — Northern Region WASH Coordination Meeting, 2025
            </footer>
          </blockquote>
        </FadeUp>
      </div>
    </section>
  );
}
