import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(n: number, decimals = 0): string {
  return new Intl.NumberFormat("en-GH", { maximumFractionDigits: decimals }).format(n);
}

export function formatPercent(n: number): string {
  return `${Math.round(n)}%`;
}

export function getRiskColor(band: "critical" | "high" | "moderate" | "low" | string): string {
  const map: Record<string, string> = {
    critical: "text-[var(--color-critical)]",
    high:     "text-[var(--color-warning)]",
    moderate: "text-[var(--color-ochre)]",
    low:      "text-[var(--color-ok)]",
  };
  return map[band] ?? "text-[var(--color-text-3)]";
}

export function getRiskBg(band: string): string {
  const map: Record<string, string> = {
    critical: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-900",
    high:     "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950 dark:text-orange-300 dark:border-orange-900",
    moderate: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-900",
    low:      "bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-900",
  };
  return map[band] ?? "bg-gray-50 text-gray-600 border-gray-200";
}

export function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1)  return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24)   return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export const DISTRICTS = [
  "Tamale Metro","Sagnarigu","Tolon","Kumbungu",
  "Nanton","Savelugu","Karaga","Gushegu","Yendi","Northern",
] as const;

export type District = (typeof DISTRICTS)[number];
