import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import type { UserSubscription } from "@/types";

const SUBSCRIPTION_KEY = ["/api/subscription"];

export function useSubscription() {
  return useQuery<UserSubscription | null>({
    queryKey: SUBSCRIPTION_KEY,
    queryFn: async () => {
      const res = await apiFetch("/api/subscription");
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return res.json();
    },
    retry: false,
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: "free" | "pro" | "enterprise") => {
      const res = await apiFetch("/api/subscription/upgrade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) throw new Error("Failed to update subscription");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_KEY }),
  });
}
