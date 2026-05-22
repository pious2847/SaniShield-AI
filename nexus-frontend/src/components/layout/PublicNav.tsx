"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "About",    href: "#about" },
  { label: "Features", href: "#features" },
  { label: "The Chain",href: "#chain" },
  { label: "Data",     href: "#data" },
];

export function PublicNav() {
  const [scrolled, setScrolled]   = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 transition-all duration-300",
        scrolled
          ? "bg-[var(--color-bg)]/95 dark:bg-[var(--color-bg-dark)]/95 backdrop-blur-md border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)] shadow-[var(--shadow-sm)]"
          : "bg-transparent"
      )}
    >
      <nav className="container-tight flex items-center justify-between h-16 md:h-18">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="relative">
            <div className="w-8 h-8 grid grid-cols-3 gap-0.5 p-0.5">
              {[...Array(9)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-[1px] transition-colors duration-300",
                    i === 4
                      ? "bg-[var(--color-ochre)]"
                      : scrolled
                        ? "bg-[var(--color-primary)] dark:bg-[var(--color-primary-dark)]"
                        : "bg-white/90"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col leading-none">
            <span className={cn(
              "font-display font-bold text-lg tracking-widest transition-colors",
              scrolled ? "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]" : "text-white"
            )}>
              NEXUS
            </span>
            <span className={cn(
              "text-[9px] font-body tracking-[0.15em] uppercase transition-colors",
              scrolled ? "text-[var(--color-text-3)]" : "text-white/60"
            )}>
              N·E·X·U·S
            </span>
          </div>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={cn(
                "px-4 py-2 rounded-[var(--radius-md)] text-sm font-body font-medium transition-colors",
                scrolled
                  ? "text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] hover:text-[var(--color-primary)] dark:hover:text-[var(--color-primary-dark)] hover:bg-[var(--color-primary-muted)] dark:hover:bg-[var(--color-primary)]/10"
                  : "text-white/80 hover:text-white hover:bg-white/10"
              )}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                !scrolled && "text-white/90 hover:text-white hover:bg-white/15"
              )}
            >
              Login
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="sm" variant={scrolled ? "primary" : "secondary"}>
              <Droplets className="w-3.5 h-3.5" />
              Enter Dashboard
            </Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className={cn(
            "md:hidden p-2 rounded-[var(--radius-md)]",
            scrolled ? "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]" : "text-white"
          )}
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="md:hidden overflow-hidden bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] border-b border-[var(--color-border)] dark:border-[var(--color-border-dark)]"
          >
            <div className="container-tight py-4 flex flex-col gap-1">
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setMobileOpen(false)}
                  className="px-4 py-3 rounded-[var(--radius-md)] font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] hover:bg-[var(--color-primary-muted)] hover:text-[var(--color-primary)] transition-colors"
                >
                  {l.label}
                </a>
              ))}
              <div className="flex gap-2 mt-3 pt-3 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
                <Link href="/login" className="flex-1">
                  <Button variant="outline" className="w-full">Login</Button>
                </Link>
                <Link href="/dashboard" className="flex-1">
                  <Button className="w-full">Enter Dashboard</Button>
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
