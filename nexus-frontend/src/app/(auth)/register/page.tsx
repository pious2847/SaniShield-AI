"use client";

import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Eye, EyeOff, UserPlus, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn, DISTRICTS } from "@/lib/utils";

const schema = z.object({
  full_name:        z.string().min(2, "Full name must be at least 2 characters"),
  email:            z.string().email("Enter a valid email"),
  district:         z.string().min(1, "Select a district"),
  role:             z.enum(["district_officer", "sanitation_worker", "school_admin", "ngo_staff"], {
    errorMap: () => ({ message: "Select a role" }),
  }),
  password:         z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword:  z.string().min(1, "Please confirm your password"),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

type FormData = z.infer<typeof schema>;

const roleLabels: Record<string, string> = {
  district_officer:   "District Officer",
  sanitation_worker:  "Sanitation Worker",
  school_admin:       "School Administrator",
  ngo_staff:          "NGO / Field Staff",
};

const inputClass = (hasError: boolean) =>
  cn(
    "w-full h-10 px-3 rounded-[var(--radius-md)] border bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-sm font-body",
    "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]",
    "placeholder:text-[var(--color-text-3)] dark:placeholder:text-[var(--color-text-3-dark)]",
    "transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40",
    hasError
      ? "border-[var(--color-critical)]"
      : "border-[var(--color-border)] dark:border-[var(--color-border-dark)] focus:border-[var(--color-primary)]"
  );

export default function RegisterPage() {
  const [showPw, setShowPw]     = useState(false);
  const [showCp, setShowCp]     = useState(false);
  const [apiError, setApiError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (values: FormData) => {
    setApiError("");
    try {
      await api.post("/auth/register", {
        name:     values.full_name,
        email:    values.email,
        district: values.district,
        role:     values.role,
        password: values.password,
      });
      setSubmitted(true);
    } catch {
      setApiError("Registration failed. The email may already be in use.");
    }
  };

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-sm text-center"
      >
        <div className="flex justify-center mb-5">
          <div className="w-16 h-16 rounded-full bg-[var(--color-ok)]/10 flex items-center justify-center">
            <CheckCircle2 className="w-8 h-8 text-[var(--color-ok)]" />
          </div>
        </div>
        <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] mb-2">
          Request Submitted
        </h1>
        <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mb-6 leading-relaxed">
          Your access request has been received. An administrator will review and activate your account within 1–2 business days.
        </p>
        <Link
          href="/login"
          className="inline-block text-sm font-body font-medium text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] hover:underline"
        >
          ← Back to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="w-full max-w-sm"
    >
      <div className="mb-8">
        <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] mb-1">
          Request Access
        </h1>
        <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          Submit your details — an admin will activate your account.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
            Full name
          </label>
          <input
            {...register("full_name")}
            type="text"
            autoComplete="name"
            placeholder="Amina Owusu"
            className={inputClass(!!errors.full_name)}
          />
          {errors.full_name && <p className="mt-1 text-xs text-[var(--color-critical)]">{errors.full_name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
            Email address
          </label>
          <input
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="officer@nrcc.gov.gh"
            className={inputClass(!!errors.email)}
          />
          {errors.email && <p className="mt-1 text-xs text-[var(--color-critical)]">{errors.email.message}</p>}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
              District
            </label>
            <select
              {...register("district")}
              className={cn(inputClass(!!errors.district), "cursor-pointer")}
            >
              <option value="">Select…</option>
              {DISTRICTS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            {errors.district && <p className="mt-1 text-xs text-[var(--color-critical)]">{errors.district.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
              Role
            </label>
            <select
              {...register("role")}
              className={cn(inputClass(!!errors.role), "cursor-pointer")}
            >
              <option value="">Select…</option>
              {Object.entries(roleLabels).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            {errors.role && <p className="mt-1 text-xs text-[var(--color-critical)]">{errors.role.message}</p>}
          </div>
        </div>

        <div>
          <label className="block text-sm font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              {...register("password")}
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Min 8 characters"
              className={cn(inputClass(!!errors.password), "pr-10")}
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

        <div>
          <label className="block text-sm font-body font-medium text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5">
            Confirm password
          </label>
          <div className="relative">
            <input
              {...register("confirmPassword")}
              type={showCp ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Repeat password"
              className={cn(inputClass(!!errors.confirmPassword), "pr-10")}
            />
            <button
              type="button"
              onClick={() => setShowCp(!showCp)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-3)] hover:text-[var(--color-text-2)] transition-colors"
              tabIndex={-1}
            >
              {showCp ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.confirmPassword && <p className="mt-1 text-xs text-[var(--color-critical)]">{errors.confirmPassword.message}</p>}
        </div>

        {apiError && (
          <div className="px-3 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-critical-bg)] dark:bg-[var(--color-critical-bg-dark)] border border-[var(--color-critical)]/25 text-sm text-[var(--color-critical)]">
            {apiError}
          </div>
        )}

        <Button type="submit" className="w-full" size="md" loading={isSubmitting}>
          <UserPlus className="w-4 h-4" />
          Request Access
        </Button>
      </form>

      <div className="mt-6 pt-6 border-t border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
        <p className="text-center text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
          Already have an account?{" "}
          <Link href="/login" className="text-[var(--color-primary)] dark:text-[var(--color-primary-dark)] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </motion.div>
  );
}
