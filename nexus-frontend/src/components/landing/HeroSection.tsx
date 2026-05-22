"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Play, Droplets } from "lucide-react";

export function HeroSection() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "40%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.8], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex items-center overflow-hidden">
      {/* Parallax background */}
      <motion.div
        style={{ y: bgY }}
        className="absolute inset-0 scale-110"
      >
        {/* Real photo: woman carrying water, Northern Ghana savanna */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1541802645635-11f2286a7482?w=1920&q=85&auto=format&fit=crop')`,
          }}
          role="img"
          aria-label="Woman carrying water in a Northern Ghana savanna landscape"
        />
      </motion.div>

      {/* Layered gradient overlay — deep green rising from bottom */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a1f14] via-[#0f2419]/80 to-[#1B4D3E]/40" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1f14]/60 via-transparent to-transparent" />

      {/* Fugu stripe texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(255,255,255,0.8) 8px, rgba(255,255,255,0.8) 11px)`,
        }}
      />

      {/* Content */}
      <motion.div style={{ opacity }} className="relative z-10 container-tight w-full pt-24 pb-16">
        <div className="max-w-3xl">
          {/* Eyebrow */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="flex items-center gap-2.5 mb-8"
          >
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/20">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-ochre)] animate-pulse" />
              <span className="text-[11px] font-body font-semibold text-white/80 tracking-widest uppercase">
                Live System · 12 Districts
              </span>
            </div>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="font-display font-bold text-white leading-[1.0] tracking-tight mb-6"
            style={{ fontSize: "clamp(2.8rem, 7vw, 5rem)" }}
          >
            When the rains fail,
            <br />
            <span className="text-[var(--color-ochre)]">the system holds.</span>
          </motion.h1>

          {/* Sub-headline */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-white/75 text-lg md:text-xl font-body leading-relaxed mb-10 max-w-xl"
          >
            Real-time sanitation intelligence for Northern Ghana's climate crisis.
            Monitoring the full service chain — from toilet to treatment — across
            12 districts and 2.4 million people.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Link href="/dashboard">
              <Button size="lg" variant="secondary" className="group">
                <Droplets className="w-4 h-4" />
                Enter Live Dashboard
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button
                size="lg"
                className="bg-white/10 text-white border border-white/25 hover:bg-white/20 backdrop-blur-sm"
              >
                <Play className="w-4 h-4" />
                See How It Works
              </Button>
            </a>
          </motion.div>

          {/* Data pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-wrap gap-3 mt-12"
          >
            {[
              { label: "Districts Monitored", value: "12" },
              { label: "Assets Tracked",      value: "240+" },
              { label: "Chain Completion",    value: "98.3%" },
              { label: "Flood Assessments",   value: "Real-time" },
            ].map(({ label, value }) => (
              <div
                key={label}
                className="px-4 py-2 rounded-[var(--radius-md)] bg-white/8 backdrop-blur-sm border border-white/15"
              >
                <span className="font-display font-bold text-white text-sm mr-1.5">{value}</span>
                <span className="text-white/55 text-xs font-body">{label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </motion.div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        style={{ opacity }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
      >
        <span className="text-[10px] text-white/40 font-body tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="w-px h-8 bg-gradient-to-b from-white/40 to-transparent"
        />
      </motion.div>
    </section>
  );
}
