"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, Droplets } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

const schema = z.object({
  email:    z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [showPw, setShowPw] = useState(false);
  const [apiError, setApiError] = useState("");

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormData) => {
    setApiError("");
    try {
      const user = await login(values.email, values.password);
      if (user.role === "sanitation_worker") router.push("/field");
      else if (user.role === "admin") router.push("/admin");
      else router.push("/dashboard");
    } catch {
      setApiError("Invalid email or password.");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm"
    >
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] mb-1">
          Sign in to N.E.X.U.S.
        </h1>
        <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          Northern Region Sanitation Intelligence System
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
            Email address
          </label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="officer@nrcc.gov.gh"
            className={cn(
              "w-full h-10 px-3 rounded-[var(--radius-md)] border bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-sm font-body",
              "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]",
              "placeholder:text-[var(--color-text-3)] dark:placeholder:text-[var(--color-text-3-dark)]",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40",
              errors.email
                ? "border-[var(--color-critical)]"
                : "border-[var(--color-border)] dark:border-[var(--color-border-dark)] focus:border-[var(--color-primary)]"
            )}
          />
          {errors.email && <p className="mt-1 text-xs text-[var(--color-critical)]">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••"
              className={cn(
                "w-full h-10 px-3 pr-10 rounded-[var(--radius-md)] border bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-sm font-body",
                "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]",
                "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40",
                errors.password
                  ? "border-[var(--color-critical)]"
                  : "border-[var(--color-border)] dark:border-[var(--color-border-dark)] focus:border-[var(--color-primary)]"
              )}
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-3)] hover:text-[var(--color-text-2)] transition-colors"
              tabIndex={-1}
            >
              {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && <p className="mt-1 text-xs text-[var(--color-critical)]">{errors.password.message}</p>}
        </div>

        {apiError && (
          <div className="px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-critical-bg)] dark:bg-[var(--color-critical-bg-dark)] border border-[var(--color-critical)]/25 text-sm text-[var(--color-critical)]">
            {apiError}
          </div>
        )}

        <Button type="submit" className="w-full" size="md" loading={isSubmitting}>
          <Droplets className="w-4 h-4" />
          Sign in
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
        <p className="text-center text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] font-medium hover:underline">
            Request access
          </Link>
        </p>
        <p className="text-center text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-3">
          Demo: <span className="font-mono">admin@nexus.gh</span> / <span className="font-mono">nexus@2024</span>
        </p>
      </div>
    </motion.div>
  );
}
