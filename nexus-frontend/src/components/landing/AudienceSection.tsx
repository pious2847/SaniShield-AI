"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { BarChart3, Truck, Users, Building } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const audiences = [
  {
    icon: Building,
    role: "District Officers",
    tagline: "Situational awareness across your entire district",
    tools: [
      "Real-time asset health scores",
      "Flood assessment management",
      "School MHM compliance tracking",
      "One-click PDF district reports",
      "Vulnerability risk maps",
    ],
    cta: "Enter Dashboard",
    href: "/dashboard",
    img: "https://images.unsplash.com/photo-1573497019236-17f8177b81e8?w=600&q=80&auto=format&fit=crop",
  },
  {
    icon: Truck,
    role: "Field Workers & Gatherers",
    tagline: "Your work, tracked from pickup to treatment",
    tools: [
      "Assigned sludge jobs with GPS",
      "Photo-verified pickup logging",
      "Delivery confirmation workflow",
      "QR toilet inspection scanner",
      "Mobile-first interface",
    ],
    cta: "Field View",
    href: "/field",
    img: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80&auto=format&fit=crop",
  },
  {
    icon: Users,
    role: "Community Members",
    tagline: "Your reports make the system smarter",
    tools: [
      "WhatsApp dump site reporting",
      "QR toilet condition reports",
      "Community alert broadcasts",
      "Nearest toilet locator",
      "No app download required",
    ],
    cta: "Community Watch",
    href: "/community",
    img: "https://images.unsplash.com/photo-1508847154043-be5407fcaa5a?w=600&q=80&auto=format&fit=crop",
  },
];

export function AudienceSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section className="section-padding bg-[var(--color-surface-2)] dark:bg-[var(--color-surface-2-dark)] border-y border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
      <div ref={ref} className="container-tight">
        <div className="text-center mb-14">
          <motion.span
            initial={{ opacity: 0 }} animate={inView ? { opacity: 1 } : {}} transition={{ duration: 0.5 }}
            className="inline-block px-3 py-1 rounded-full bg-[var(--color-primary-muted)] dark:bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/25 text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] text-[11px] font-body font-semibold uppercase tracking-widest mb-5"
          >
            Who It Serves
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : {}} transition={{ duration: 0.6, delay: 0.1 }}
            className="font-display font-bold text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] text-balance"
            style={{ fontSize: "clamp(1.6rem, 3.5vw, 2.4rem)" }}
          >
            One system, three interfaces
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {audiences.map(({ icon: Icon, role, tagline, tools, cta, href, img }, i) => (
            <motion.div
              key={role}
              initial={{ opacity: 0, y: 28 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.12 * i }}
              className="group flex flex-col rounded-[var(--radius-xl)] overflow-hidden bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:shadow-[var(--shadow-lg)] transition-all duration-300"
            >
              {/* Image */}
              <div className="relative h-48 overflow-hidden">
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                  style={{ backgroundImage: `url('${img}')` }}
                  aria-hidden
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f14]/80 via-[#0a1f14]/30 to-transparent" />
                <div className="absolute bottom-4 left-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-ochre)] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <span className="font-display font-semibold text-white text-sm">{role}</span>
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 p-6 flex flex-col">
                <p className="text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] font-body text-sm mb-5">{tagline}</p>
                <ul className="space-y-2 mb-6 flex-1">
                  {tools.map((t) => (
                    <li key={t} className="flex items-center gap-2 text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ochre)] flex-shrink-0" />
                      {t}
                    </li>
                  ))}
                </ul>
                <Link href={href}>
                  <Button variant="outline" size="sm" className="w-full">{cta}</Button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
