"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { Wifi, AlertTriangle, BarChart3, ArrowRight } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Wifi,
    title: "Monitor",
    headline: "Sensors & field data flow in real-time",
    description:
      "IoT sensors on sanitation units report fill levels, water depth, temperature, and gas readings continuously. Field workers log pickups, deliveries, and inspections. Community members report dump sites via WhatsApp or QR codes.",
    callouts: ["Fill level alerts at 85%+", "Weather-triggered flood checks", "WhatsApp community reporting"],
    color: "var(--color-primary)",
  },
  {
    number: "02",
    icon: AlertTriangle,
    title: "Respond",
    headline: "Automated alerts dispatch the right resources",
    description:
      "When thresholds are breached, the system automatically creates alerts, assigns gatherers to sludge jobs, triggers flood assessments for high-risk assets, and notifies district officers via SMS and the dashboard.",
    callouts: ["Auto-assign nearest gatherer", "Flood zone asset flagging", "SMS alerts via Arkesel API"],
    color: "var(--color-ochre)",
  },
  {
    number: "03",
    icon: BarChart3,
    title: "Report",
    headline: "District intelligence, not just raw data",
    description:
      "Gemini AI synthesises sensor data, weather history, and field reports into district health scores and actionable recommendations. PDF reports, CSV exports, and GeoJSON map layers give every stakeholder the view they need.",
    callouts: ["AI-generated health narratives", "UNICEF WASH compliance scoring", "PDF & CSV district exports"],
    color: "var(--color-earth)",
  },
];

export function HowItWorksSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="how-it-works" className="section-padding bg-[var(--color-surface-2)] dark:bg-[var(--color-surface-2-dark)] border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
      <div ref={ref} className="container-tight">
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}
            className="inline-block px-3 py-1 rounded-full bg-[var(--color-primary-muted)] dark:bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] text-[11px] font-body font-semibold uppercase tracking-widest mb-5"
          >
            How It Works
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] text-balance mb-4"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
          >
            Monitor. Respond. Report.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 16 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] font-body text-lg max-w-xl mx-auto"
          >
            Three loops that keep Northern Ghana's sanitation chain intact through climate shocks.
          </motion.p>
        </div>

        <div className="space-y-6">
          {steps.map(({ number, icon: Icon, title, headline, description, callouts, color }, i) => (
            <motion.div
              key={number}
              initial={{ opacity: 0, x: i % 2 === 0 ? -32 : 32 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 * i }}
              className={`flex flex-col ${i % 2 === 1 ? "md:flex-row-reverse" : "md:flex-row"} gap-0 overflow-hidden rounded-[var(--radius-xl)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] shadow-[var(--shadow-sm)]`}
            >
              {/* Colour band */}
              <div
                className="md:w-2 w-full h-2 md:h-auto flex-shrink-0"
                style={{ background: color }}
              />
              {/* Content */}
              <div className="flex-1 p-8 md:p-10">
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0 flex flex-col items-center gap-3">
                    <div className="w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center" style={{ background: `color-mix(in srgb, ${color} 12%, transparent)` }}>
                      <Icon className="w-6 h-6" style={{ color }} />
                    </div>
                    <span className="font-display font-bold text-3xl" style={{ color: `color-mix(in srgb, ${color} 30%, var(--color-border))` }}>
                      {number}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display font-semibold text-xs uppercase tracking-widest mb-2" style={{ color }}>
                      {title}
                    </div>
                    <h3 className="font-display font-bold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] text-xl md:text-2xl mb-3">
                      {headline}
                    </h3>
                    <p className="text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] font-body leading-relaxed mb-5">
                      {description}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {callouts.map((c) => (
                        <span key={c} className="flex items-center gap-1.5 text-xs font-body font-medium text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] px-3 py-1.5 rounded-full bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                          <ArrowRight className="w-3 h-3" />
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
