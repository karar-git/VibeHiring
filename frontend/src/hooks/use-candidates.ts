import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Candidate, RecommendedCandidate } from "@/types";

export function useCandidatesByJob(jobId: number) {
  return useQuery<Candidate[]>({
    queryKey: ["/api/jobs", jobId, "candidates"],
    queryFn: async () => {
      const res = await apiFetch(`/api/jobs/${jobId}/candidates`);
      if (!res.ok) throw new Error("Failed to fetch candidates");
      return res.json();
    },
    enabled: jobId > 0,
  });
}

export function useCandidate(id: number) {
  return useQuery<Candidate | null>({
    queryKey: ["/api/candidates", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/candidates/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch candidate");
      return res.json();
    },
  });
}

export function useCreateCandidate(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiFetch(`/api/jobs/${jobId}/candidates`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403) throw new Error(errorData.message || "Plan limit reached. Please upgrade.");
        if (res.status === 400) throw new Error(errorData.message || "Validation failed");
        throw new Error("Failed to create candidate");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
    },
  });
}

export function useDeleteCandidate(jobId?: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete candidate");
    },
    onSuccess: () => {
      if (jobId) {
        queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "candidates"] });
      }
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
    },
  });
}

export interface CsvImportResult {
  imported: number;
  failed: number;
  errors: string[];
}

export function useRecommendations(jobId: number) {
  return useQuery<RecommendedCandidate[]>({
    queryKey: ["/api/jobs", jobId, "recommendations"],
    queryFn: async () => {
      const res = await apiFetch(`/api/jobs/${jobId}/recommendations`);
      if (!res.ok) throw new Error("Failed to fetch recommendations");
      return res.json();
    },
    enabled: jobId > 0,
    staleTime: 5 * 60 * 1000, // cache for 5 min since embedding calls are expensive
  });
}

export function useImportCsv(jobId: number) {
  const queryClient = useQueryClient();
  return useMutation<CsvImportResult, Error, File>({
    mutationFn: async (csvFile: File) => {
      const formData = new FormData();
      formData.append("csvFile", csvFile);

      const res = await apiFetch(`/api/jobs/${jobId}/candidates/import-csv`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403) throw new Error(errorData.message || "Plan limit reached. Please upgrade.");
        if (res.status === 400) throw new Error(errorData.message || "Invalid CSV file");
        throw new Error(errorData.message || "Failed to import CSV");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId, "candidates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs/stats"] });
    },
  });
}
