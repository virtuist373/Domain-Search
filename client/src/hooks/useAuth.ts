import { useQuery } from "@tanstack/react-query";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
    // Don't throw on 401 errors - just treat as anonymous user
    throwOnError: (error: any) => {
      return !error.message?.includes("401");
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user && !error,
    isAnonymous: !user && !isLoading,
  };
}