"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import {
  Map, Droplets, CloudRain, ShieldAlert, FileBarChart,
  MessageSquare, QrCode, GraduationCap,
} from "lucide-react";

const features = [
  {
    icon: ShieldAlert,
    title: "Vulnerability Scoring",
    description:
      "Every asset scored 0–100 based on flood zone risk, elevation, condition, and fill level. Updated weekly. Colour-coded risk bands on the live map so district officers see exactly what's at risk before the rains arrive.",
    tag: "Climate Resilience",
  },
  {
    icon: CloudRain,
    title: "Flood Assessment Engine",
    description:
      "When 24-hour rainfall exceeds 25mm, the system automatically triggers a flood assessment — flagging high-risk assets, creating inspection checklists, and broadcasting alerts. Field workers receive GPS-linked inspection tasks.",
    tag: "Early Warning",
  },
  {
    icon: Droplets,
    title: "Sludge Chain Tracker",
    description:
      "End-to-end tracking of fecal sludge from toilet to treatment. Gatherers log pickups with GPS and photos. Facilities confirm treatment. chain_complete = true marks a fully verified, auditable sludge journey.",
    tag: "Service Chain",
  },
  {
    icon: Map,
    title: "Multi-Layer GeoJSON Map",
    description:
      "A single map shows everything: toilets, sanitation units, gatherer locations, dump sites, flood alerts, vulnerability heatmaps, and live weather data. Filter by district, risk band, or asset type.",
    tag: "Spatial Intelligence",
  },
  {
    icon: FileBarChart,
    title: "AI District Reports",
    description:
      "Gemini AI synthesises sensor data, weather history, school MHM compliance, and sludge chain metrics into a district health narrative. One-click PDF export for UNICEF submissions and district officer briefings.",
    tag: "AI-Powered",
  },
  {
    icon: QrCode,
    title: "QR Toilet Tags",
    description:
      "Every registered toilet gets a unique QR code that opens a public report form. Citizens scan and submit condition, cleanliness, and safety reports — no app required. Reports feed directly into the vulnerability scoring system.",
    tag: "Community",
  },
  {
    icon: MessageSquare,
    title: "WhatsApp Bot Integration",
    description:
      "Community members report dump sites, query flood risk, and check sanitation scores — all from WhatsApp. 'FLOOD Tamale' returns the latest rainfall data. 'REPORT DUMP' creates a geo-tagged illegal dump site record instantly.",
    tag: "Accessibility",
  },
  {
    icon: GraduationCap,
    title: "School MHM Compliance",
    description:
      "Menstrual hygiene management compliance tracked per school — separate facilities, water access, disposal options, and functionality. Aggregated into district MHM compliance rates for UNICEF WASH reporting.",
    tag: "UNICEF Standards",
  },
];

export function FeaturesSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="features" className="section-padding bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)]">
      <div ref={ref} className="container-tight">
        <div className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}
            className="inline-block px-3 py-1 rounded-full bg-[var(--color-primary-muted)] dark:bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] text-[11px] font-body font-semibold uppercase tracking-widest mb-5"
          >
            8 Features
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] text-balance mb-4"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
          >
            Built for the full complexity of climate-resilient sanitation
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] font-body text-lg max-w-xl mx-auto"
          >
            Not a dashboard. A system. Each feature maps directly to a UNICEF WASH indicator or a
            climate resilience requirement.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map(({ icon: Icon, title, description, tag }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.06 * i }}
              className="group flex flex-col p-6 rounded-[var(--radius-xl)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/40 hover:shadow-[var(--shadow-md)] transition-all duration-[var(--transition-base)] hover:-translate-y-1"
            >
              <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-primary-muted)] dark:bg-[var(--color-primary)]/15 flex items-center justify-center mb-4 group-hover:bg-[var(--color-primary)] transition-colors">
                <Icon className="w-5 h-5 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] group-hover:text-white transition-colors" />
              </div>
              <span className="text-[10px] font-body font-semibold uppercase tracking-widest text-[var(--color-ochre)] mb-2">
                {tag}
              </span>
              <h3 className="font-display font-semibold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] text-base mb-3 leading-tight">
                {title}
              </h3>
              <p className="text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] text-sm font-body leading-relaxed flex-1">
                {description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
