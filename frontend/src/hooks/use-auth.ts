import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { User } from "@/types";
import { apiFetch, setToken, clearToken, getToken } from "@/lib/api";

const AUTH_QUERY_KEY = ["/api/auth/me"];

async function fetchUser(): Promise<User | null> {
  const token = getToken();
  if (!token) return null;

  const response = await apiFetch("/api/auth/me");

  if (response.status === 401) {
    clearToken();
    return null;
  }

  if (!response.ok) {
    throw new Error(`${response.status}: ${response.statusText}`);
  }

  return response.json();
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  role?: "hr" | "applicant";
}

interface AuthResponse {
  token: string;
  user: User;
}

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: fetchUser,
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (input: LoginInput): Promise<AuthResponse> => {
      const res = await apiFetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Login failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (input: RegisterInput): Promise<AuthResponse> => {
      const res = await apiFetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Registration failed");
      }

      return res.json();
    },
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData(AUTH_QUERY_KEY, data.user);
    },
  });

  const handleLogout = () => {
    clearToken();
    queryClient.setQueryData(AUTH_QUERY_KEY, null);
    queryClient.clear();
    window.location.href = "/";
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: handleLogout,
    loginMutation,
    registerMutation,
  };
}
