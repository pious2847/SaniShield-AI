"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Alert, HealthScore, SludgeJob, FloodAssessment, DistrictStats } from "@/types";

export function useHealthScore(district: string) {
  return useQuery<HealthScore | null>({
    queryKey: ["health-score", district],
    queryFn: async () => {
      try {
        const { data } = await api.get(`/health-scores/${encodeURIComponent(district)}`);
        return data.data ?? null;
      } catch (err: unknown) {
        // 404 means no score computed yet — not a fatal error
        const status = (err as { response?: { status?: number } })?.response?.status;
        if (status === 404) return null;
        throw err;
      }
    },
    enabled: !!district,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

export function useAlerts(district?: string) {
  return useQuery<Alert[]>({
    queryKey: ["alerts", district],
    queryFn: async () => {
      const params = district ? `?district=${encodeURIComponent(district)}` : "";
      const { data } = await api.get(`/alerts${params}`);
      return data.data ?? [];
    },
    refetchInterval: 30 * 1000,
  });
}

export function useSludgeStats(district?: string) {
  return useQuery({
    queryKey: ["sludge-stats", district],
    queryFn: async () => {
      const { data } = await api.get("/sludge-jobs/stats/chain");
      const rows: Array<{ district: string; total: number; completed: number; completion_rate: number }> = data.data ?? [];
      if (district) return rows.find((r) => r.district === district) ?? null;
      return rows;
    },
    staleTime: 60 * 1000,
  });
}

export function useFloodAssessments(district?: string) {
  return useQuery<FloodAssessment[]>({
    queryKey: ["flood-assessments", district],
    queryFn: async () => {
      const params = district ? `?district=${encodeURIComponent(district)}&limit=5` : "?limit=10";
      const { data } = await api.get(`/flood-assessments${params}`);
      return data.data ?? [];
    },
    staleTime: 60 * 1000,
  });
}

export function useToilets(district?: string) {
  return useQuery({
    queryKey: ["toilets", district],
    queryFn: async () => {
      const params = district ? `?district=${encodeURIComponent(district)}&limit=50` : "?limit=50";
      const { data } = await api.get(`/toilets${params}`);
      return data.data ?? [];
    },
    staleTime: 2 * 60 * 1000,
  });
}

export function useAcknowledgeAlert(district?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => api.patch(`/alerts/${alertId}/acknowledge`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", district] }),
  });
}

export function useResolveAlert(district?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (alertId: string) => api.patch(`/alerts/${alertId}/resolve`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts", district] }),
  });
}

export function useDistrictExport(district: string) {
  const downloadPdf = async () => {
    const res = await api.get(`/export/district/${encodeURIComponent(district)}/pdf`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${district}-nexus-report.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadCsv = async (type: "toilets" | "dumps" | "schools" | "gatherers") => {
    const res = await api.get(`/export/district/${encodeURIComponent(district)}/csv?type=${type}`, { responseType: "blob" });
    const url = URL.createObjectURL(new Blob([res.data], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${district}-${type}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return { downloadPdf, downloadCsv };
}
