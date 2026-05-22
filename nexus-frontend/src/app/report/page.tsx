"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { CheckCircle2, Droplets, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const schema = z.object({
  condition:  z.enum(["clean", "dirty", "damaged", "blocked", "no_water"], { errorMap: () => ({ message: "Select a condition" }) }),
  rating:     z.number().min(1).max(5),
  comment:    z.string().max(500).optional(),
  reporter:   z.string().max(100).optional(),
});
type ReportForm = z.infer<typeof schema>;

const conditions: Array<{ value: ReportForm["condition"]; label: string; emoji: string; color: string }> = [
  { value: "clean",    label: "Clean & Functional", emoji: "✅", color: "border-[var(--color-ok)] bg-green-50 dark:bg-green-950" },
  { value: "dirty",    label: "Dirty / Unhygienic",  emoji: "🟡", color: "border-[var(--color-warning)] bg-amber-50 dark:bg-amber-950" },
  { value: "damaged",  label: "Physically Damaged",  emoji: "🔴", color: "border-[var(--color-critical)] bg-red-50 dark:bg-red-950" },
  { value: "blocked",  label: "Blocked / Full",      emoji: "🟠", color: "border-orange-500 bg-orange-50 dark:bg-orange-950" },
  { value: "no_water", label: "No Water Available",  emoji: "💧", color: "border-blue-500 bg-blue-50 dark:bg-blue-950" },
];

export default function ReportPage() {
  const searchParams  = useSearchParams();
  const toiletId      = searchParams.get("toilet_id") ?? "";
  const [submitted, setSubmitted]   = useState(false);
  const [hoverStar, setHoverStar]   = useState(0);

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } =
    useForm<ReportForm>({
      resolver: zodResolver(schema),
      defaultValues: { rating: 0 },
    });

  const selectedCondition = watch("condition");
  const rating            = watch("rating");

  const onSubmit = async (values: ReportForm) => {
    await api.post("/community-reports", {
      toilet_id:  toiletId || undefined,
      condition:  values.condition,
      rating:     values.rating,
      comment:    values.comment,
      reporter:   values.reporter,
    });
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-12 h-12 grid grid-cols-3 gap-0.5 p-1">
            {[...Array(9)].map((_, i) => (
              <div key={i} className={`rounded-[1px] ${i === 4 ? "bg-[var(--color-ochre)]" : "bg-[var(--color-primary)]"}`} />
            ))}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
              className="text-center"
            >
              <div className="flex justify-center mb-5">
                <div className="w-16 h-16 rounded-full bg-[var(--color-ok)]/10 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[var(--color-ok)]" />
                </div>
              </div>
              <h1 className="font-display font-bold text-2xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] mb-2">
                Thank You!
              </h1>
              <p className="text-sm font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] leading-relaxed mb-6">
                Your report has been submitted. A sanitation officer will review it and take action within 48 hours.
              </p>
              <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                Powered by N.E.X.U.S. · Northern Ghana Sanitation Intelligence
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="text-center mb-6">
                <h1 className="font-display font-bold text-xl text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] mb-1">
                  Report Toilet Condition
                </h1>
                <p className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)]">
                  Help your community by sharing what you found
                </p>
                {toiletId && (
                  <p className="text-[10px] font-mono text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-1">
                    Toilet #{toiletId.slice(0, 8)}
                  </p>
                )}
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                <div>
                  <p className="text-xs font-body font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-2.5 uppercase tracking-wide">
                    What did you find?
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {conditions.map(({ value, label, emoji, color }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setValue("condition", value, { shouldValidate: true })}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-[var(--radius-md)] border-2 text-left transition-all duration-150",
                          selectedCondition === value
                            ? color
                            : "border-[var(--color-border)] dark:border-[var(--color-border-dark)] hover:border-[var(--color-primary)]/50"
                        )}
                      >
                        <span className="text-xl leading-none">{emoji}</span>
                        <span className={cn(
                          "text-sm font-body font-medium",
                          selectedCondition === value
                            ? "text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)]"
                            : "text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)]"
                        )}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>
                  {errors.condition && (
                    <p className="mt-1.5 text-xs text-[var(--color-critical)]">{errors.condition.message}</p>
                  )}
                </div>

                <div>
                  <p className="text-xs font-body font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-2.5 uppercase tracking-wide">
                    Overall rating
                  </p>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setHoverStar(star)}
                        onMouseLeave={() => setHoverStar(0)}
                        onClick={() => setValue("rating", star, { shouldValidate: true })}
                        className="transition-transform hover:scale-110"
                      >
                        <Star
                          className={cn(
                            "w-8 h-8 transition-colors",
                            star <= (hoverStar || rating)
                              ? "fill-[var(--color-ochre)] text-[var(--color-ochre)]"
                              : "text-[var(--color-border)] dark:text-[var(--color-border-dark)]"
                          )}
                        />
                      </button>
                    ))}
                    {rating > 0 && (
                      <span className="text-xs font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] ml-1">
                        {["", "Very Poor", "Poor", "Fair", "Good", "Excellent"][rating]}
                      </span>
                    )}
                  </div>
                  {errors.rating && <p className="mt-1 text-xs text-[var(--color-critical)]">Please select a rating</p>}
                </div>

                <div>
                  <label className="block text-xs font-body font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5 uppercase tracking-wide">
                    Additional notes <span className="font-normal normal-case text-[var(--color-text-3)]">(optional)</span>
                  </label>
                  <textarea
                    {...register("comment")}
                    rows={3}
                    placeholder="Any other details about the condition…"
                    className="w-full px-3 py-2.5 rounded-[var(--radius-md)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-sm font-body text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] placeholder:text-[var(--color-text-3)] resize-none focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-body font-semibold text-[var(--color-text-2)] dark:text-[var(--color-text-2-dark)] mb-1.5 uppercase tracking-wide">
                    Your name <span className="font-normal normal-case text-[var(--color-text-3)]">(optional)</span>
                  </label>
                  <input
                    {...register("reporter")}
                    type="text"
                    placeholder="Anonymous"
                    className="w-full h-10 px-3 rounded-[var(--radius-md)] border border-[var(--color-border)] dark:border-[var(--color-border-dark)] bg-[var(--color-surface)] dark:bg-[var(--color-surface-dark)] text-sm font-body text-[var(--color-text-1)] dark:text-[var(--color-text-1-dark)] placeholder:text-[var(--color-text-3)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/40 focus:border-[var(--color-primary)]"
                  />
                </div>

                <Button type="submit" variant="primary" size="md" className="w-full" loading={isSubmitting}>
                  <Droplets className="w-4 h-4" />
                  Submit Report
                </Button>
              </form>

              <p className="text-center text-[10px] font-body text-[var(--color-text-3)] dark:text-[var(--color-text-3-dark)] mt-4">
                N.E.X.U.S. · Northern Ghana Sanitation Intelligence System
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
