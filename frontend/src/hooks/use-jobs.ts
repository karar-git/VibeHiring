import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch, apiRequest } from "@/lib/api";
import type { Job, JobStats } from "@/types";

export function useJobs() {
  return useQuery<Job[]>({
    queryKey: ["/api/jobs"],
    queryFn: async () => {
      const res = await apiFetch("/api/jobs");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      return res.json();
    },
  });
}

export function useJob(id: number) {
  return useQuery<Job | null>({
    queryKey: ["/api/jobs", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/jobs/${id}`);
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch job");
      return res.json();
    },
  });
}

export function useJobStats() {
  return useQuery<JobStats>({
    queryKey: ["/api/jobs/stats"],
    queryFn: async () => {
      const res = await apiFetch("/api/jobs/stats");
      if (!res.ok) throw new Error("Failed to fetch job stats");
      return res.json();
    },
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: { title: string; description: string }) => {
      const res = await apiRequest("POST", "/api/jobs", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: { id: number; title?: string; description?: string; status?: string }) => {
      const res = await apiFetch(`/api/jobs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update job");
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", variables.id] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });
}
