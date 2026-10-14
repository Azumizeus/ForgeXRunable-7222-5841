import { useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { authClient } from "../lib/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { data, isPending } = authClient.useSession();
  const [loc, navigate] = useLocation();
  useEffect(() => {
    if (!isPending && !data) navigate(`/sign-in?next=${encodeURIComponent(loc)}`, { replace: true });
  }, [isPending, data, loc, navigate]);
  if (isPending || !data)
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  return <>{children}</>;
}
