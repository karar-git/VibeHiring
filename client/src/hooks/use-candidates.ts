import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type CandidateInput } from "@shared/routes";
import { type InsertCandidate } from "@shared/schema";

export function useCandidates() {
  return useQuery({
    queryKey: [api.candidates.list.path],
    queryFn: async () => {
      const res = await fetch(api.candidates.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch candidates");
      return api.candidates.list.responses[200].parse(await res.json());
    },
  });
}

export function useCandidate(id: number) {
  return useQuery({
    queryKey: [api.candidates.get.path, id],
    queryFn: async () => {
      const url = buildUrl(api.candidates.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch candidate");
      return api.candidates.get.responses[200].parse(await res.json());
    },
  });
}

export function useCreateCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (formData: FormData) => {
      // Note: We're sending FormData directly, not JSON
      const res = await fetch(api.candidates.create.path, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        if (res.status === 403) throw new Error(errorData.message || "Plan limit reached. Please upgrade.");
        if (res.status === 400) throw new Error(errorData.message || "Validation failed");
        throw new Error("Failed to create candidate");
      }
      
      return api.candidates.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.candidates.list.path] }),
  });
}

export function useDeleteCandidate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.candidates.delete.path, { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete candidate");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.candidates.list.path] }),
  });
}
