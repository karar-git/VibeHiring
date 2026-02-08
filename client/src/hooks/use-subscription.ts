import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";

export function useSubscription() {
  return useQuery({
    queryKey: [api.subscription.get.path],
    queryFn: async () => {
      const res = await fetch(api.subscription.get.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch subscription");
      return api.subscription.get.responses[200].parse(await res.json());
    },
    retry: false,
  });
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: 'free' | 'pro' | 'enterprise') => {
      const res = await fetch(api.subscription.update.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update subscription");
      return api.subscription.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.subscription.get.path] }),
  });
}
