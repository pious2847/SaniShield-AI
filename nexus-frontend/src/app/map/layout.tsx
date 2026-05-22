"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function MapLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem("nexus_token")) {
      router.replace("/login");
    }
  }, [router]);

  return <div className="h-screen flex flex-col overflow-hidden">{children}</div>;
}
