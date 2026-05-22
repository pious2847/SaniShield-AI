"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Droplets } from "lucide-react";

export function FinalCtaSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="relative min-h-[60vh] flex items-center overflow-hidden">
      {/* Background: community photo */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1594708767771-a5e9d3012f3e?w=1920&q=80&auto=format&fit=crop')`,
          }}
          aria-label="Northern Ghana community"
          role="img"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#0a1f14]/95 via-[#0f2419]/85 to-[#1B4D3E]/75" />
      </div>

      {/* Fugu stripe texture */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.8) 8px, rgba(255,255,255,0.8) 11px)`,
        }}
        aria-hidden
      />

      <div className="relative z-10 container-tight w-full section-padding text-center">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
          className="max-w-2xl mx-auto"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ok)] animate-pulse" />
            <span className="text-[11px] font-body font-semibold text-white/70 tracking-widest uppercase">
              The data is live. The system is running.
            </span>
          </div>

          <h2
            className="font-display font-bold text-white mb-6 text-balance"
            style={{ fontSize: "clamp(2rem, 5vw, 3.5rem)", lineHeight: 1.05 }}
          >
            The North deserves{" "}
            <span className="text-[var(--color-ochre)]">real-time sanitation intelligence.</span>
          </h2>

          <p className="text-white/70 font-body text-lg leading-relaxed mb-10">
            2.4 million people. 12 districts. One system that tracks every toilet, every sludge journey,
            every flood risk — in real time. Not a plan. Not a pilot. Running now.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/dashboard">
              <Button size="lg" variant="secondary" className="group">
                <Droplets className="w-4 h-4" />
                Enter Live Dashboard
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <Link href="/map">
              <Button
                size="lg"
                className="bg-white/12 text-white border border-white/25 hover:bg-white/20 backdrop-blur-sm"
              >
                Explore the Map
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
