"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("nexus_token")) {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-[var(--color-bg)] dark:bg-[var(--color-bg-dark)] flex flex-col max-w-lg mx-auto">
      {children}
    </div>
  );
}
