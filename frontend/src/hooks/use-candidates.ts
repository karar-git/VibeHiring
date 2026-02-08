import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Candidate } from "@/types";

const CANDIDATES_KEY = ["/api/candidates"];

export function useCandidates() {
  return useQuery<Candidate[]>({
    queryKey: CANDIDATES_KEY,
    queryFn: async () => {
      const res = await apiFetch("/api/candidates");
      if (!res.ok) throw new Error("Failed to fetch candidates");
      return res.json();
    },
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

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await apiFetch("/api/candidates", {
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CANDIDATES_KEY }),
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/candidates/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete candidate");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CANDIDATES_KEY }),
  });
}
