import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Application } from "@/types";

export function useApplicationsByJob(jobId: number | undefined) {
  return useQuery<Application[]>({
    queryKey: ["/api/jobs", jobId, "applications"],
    queryFn: async () => {
      if (!jobId) return [];
      const res = await apiFetch(`/api/jobs/${jobId}/applications`);
      if (!res.ok) throw new Error("Failed to fetch applications");
      return res.json();
    },
    enabled: !!jobId,
  });
}

export function useApplicationCount(jobId: number | undefined) {
  return useQuery<{ count: number }>({
    queryKey: ["/api/jobs", jobId, "applications", "count"],
    queryFn: async () => {
      if (!jobId) return { count: 0 };
      const res = await apiFetch(`/api/jobs/${jobId}/applications/count`);
      if (!res.ok) throw new Error("Failed to fetch application count");
      return res.json();
    },
    enabled: !!jobId,
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const res = await apiFetch(`/api/applications/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update application status");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });
}

export function useDeleteApplication() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/applications/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete application");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });
}
