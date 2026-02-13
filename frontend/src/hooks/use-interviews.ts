import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { Interview } from "@/types";

interface MyInterview {
  interview: Interview;
  jobTitle: string;
  applicationId: number;
}

export function useMyInterviews() {
  return useQuery<MyInterview[]>({
    queryKey: ["/api/my-interviews"],
    queryFn: async () => {
      const res = await apiFetch("/api/my-interviews");
      if (!res.ok) throw new Error("Failed to fetch interviews");
      return res.json();
    },
  });
}

export function useInterviews() {
  return useQuery<Interview[]>({
    queryKey: ["/api/interviews"],
    queryFn: async () => {
      const res = await apiFetch("/api/interviews");
      if (!res.ok) throw new Error("Failed to fetch interviews");
      return res.json();
    },
  });
}

export function useInterviewsByJob(jobId: number | undefined) {
  return useQuery<Interview[]>({
    queryKey: ["/api/jobs", jobId, "interviews"],
    queryFn: async () => {
      if (!jobId) return [];
      const res = await apiFetch(`/api/jobs/${jobId}/interviews`);
      if (!res.ok) throw new Error("Failed to fetch interviews");
      return res.json();
    },
    enabled: !!jobId,
  });
}

export function useInterview(id: number | undefined) {
  return useQuery<Interview>({
    queryKey: ["/api/interviews", id],
    queryFn: async () => {
      const res = await apiFetch(`/api/interviews/${id}`);
      if (!res.ok) throw new Error("Failed to fetch interview");
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      jobId: number;
      candidateId?: number;
      applicationId?: number;
      voice?: string;
      scheduledAt?: string;
    }) => {
      const res = await apiFetch(`/api/jobs/${data.jobId}/interviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create interview");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });
}

export function useInterviewRespond() {
  return useMutation({
    mutationFn: async (data: {
      interviewId: number;
      audio_url: string;
      candidate_text?: string;
    }) => {
      const res = await apiFetch(`/api/interviews/${data.interviewId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          audio_url: data.audio_url,
          candidate_text: data.candidate_text,
        }),
      });
      if (!res.ok) throw new Error("Failed to process interview response");
      return res.json();
    },
  });
}

export function useEvaluateInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (interviewId: number) => {
      const res = await apiFetch(`/api/interviews/${interviewId}/evaluate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) throw new Error("Failed to evaluate interview");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
    },
  });
}

export function useDeleteInterview() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const res = await apiFetch(`/api/interviews/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete interview");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/interviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
    },
  });
}
