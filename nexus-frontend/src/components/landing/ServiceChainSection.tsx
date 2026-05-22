"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Toilet, Truck, Factory, CheckCircle2, ArrowRight } from "lucide-react";

const chainSteps = [
  {
    icon: Toilet,
    label: "Toilet",
    sublabel: "Registered asset",
    description: "QR-tagged, vulnerability scored, fill-level monitored",
    color: "#1B4D3E",
  },
  {
    icon: Truck,
    label: "Gatherer",
    sublabel: "Collection & transport",
    description: "GPS-tracked pickup, photo-verified handover, volume recorded",
    color: "#C8922A",
  },
  {
    icon: Factory,
    label: "Facility",
    sublabel: "Treatment plant",
    description: "Delivery confirmed, treatment verified, chain_complete = true",
    color: "#A76A3A",
  },
  {
    icon: CheckCircle2,
    label: "Verified",
    sublabel: "Chain complete",
    description: "Full audit trail: toilet → gatherer → facility, immutable",
    color: "#1E8449",
  },
];

export function ServiceChainSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="chain" className="section-padding bg-[var(--color-primary)] overflow-hidden relative">
      {/* Fugu texture */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.8) 8px, rgba(255,255,255,0.8) 11px)`,
        }}
        aria-hidden
      />

      <div ref={ref} className="relative z-10 container-tight">
        <div className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}
            className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/20 text-white/70 text-[11px] font-body font-semibold uppercase tracking-widest mb-5"
          >
            The Full Chain
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-white text-balance mb-4"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
          >
            Every link in the sludge service chain — tracked
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-white/65 font-body text-lg max-w-xl mx-auto"
          >
            98.3% chain completion. The first time Northern Ghana has had an end-to-end view
            of where sludge goes after it leaves a toilet.
          </motion.p>
        </div>

        {/* Chain diagram */}
        <div className="flex flex-col md:flex-row items-stretch gap-3 md:gap-0">
          {chainSteps.map(({ icon: Icon, label, sublabel, description, color }, i) => (
            <div key={label} className="flex flex-col md:flex-row items-center flex-1">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={inView ? { opacity: 1, scale: 1 } : {}}
                transition={{ duration: 0.5, delay: 0.12 * i }}
                className="flex-1 w-full p-7 rounded-[var(--radius-xl)] bg-white/8 border border-white/15 hover:bg-white/12 transition-colors text-center"
              >
                <div
                  className="w-14 h-14 rounded-[var(--radius-lg)] flex items-center justify-center mx-auto mb-4"
                  style={{ background: `${color}40`, border: `1px solid ${color}60` }}
                >
                  <Icon className="w-7 h-7" style={{ color: i === 2 ? "#D4A853" : color === "#1E8449" ? "#52d48a" : "white" }} />
                </div>
                <div className="font-display font-bold text-white text-lg mb-0.5">{label}</div>
                <div className="text-white/50 text-xs font-body mb-3 uppercase tracking-wide">{sublabel}</div>
                <p className="text-white/65 text-sm font-body leading-relaxed">{description}</p>
              </motion.div>

              {/* Arrow connector */}
              {i < chainSteps.length - 1 && (
                <motion.div
                  initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ delay: 0.12 * i + 0.3 }}
                  className="flex-shrink-0 md:mx-3 my-2 md:my-0 text-white/30"
                >
                  <ArrowRight className="w-5 h-5 md:block hidden" />
                  <div className="md:hidden w-px h-4 bg-white/20 mx-auto" />
                </motion.div>
              )}
            </div>
          ))}
        </div>

        {/* Bottom metric */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6 pt-10 border-t border-white/15"
        >
          {[
            { value: "chain_complete = true",  label: "Database flag when all steps verified", mono: true },
            { value: "98.3%",                  label: "Completion rate in Tamale Metro", mono: false },
            { value: "< 2 hrs",                label: "Average pickup-to-delivery time", mono: false },
          ].map(({ value, label, mono }) => (
            <div key={label} className="text-center">
              <div className={`font-bold text-[var(--color-ochre)] text-xl mb-0.5 ${mono ? "font-mono text-sm" : "font-display"}`}>
                {value}
              </div>
              <div className="text-white/50 text-xs font-body">{label}</div>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
