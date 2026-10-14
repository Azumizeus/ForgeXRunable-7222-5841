import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AutumnProvider } from "autumn-js/react";
import { Toaster } from "sonner";
import { useEffect } from "react";
import { authClient, currentToken } from "../lib/auth";
import { useLang } from "../lib/i18n";

const queryClient = new QueryClient({
  defaultOptions: { queries: { refetchOnWindowFocus: false, retry: 1 } },
});

function Billing({ children }: { children: React.ReactNode }) {
  const { data } = authClient.useSession();
  const token = data ? currentToken() : "";
  return (
    <AutumnProvider key={token || "anon"} useBetterAuth headers={token ? { Authorization: `Bearer ${token}` } : undefined}>
      {children}
    </AutumnProvider>
  );
}

/** Server strings (warnings, errors) are localized: refetch on language change. */
function LangSync() {
  const lang = useLang();
  useEffect(() => {
    void queryClient.invalidateQueries();
  }, [lang]);
  return null;
}

export function Provider({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <LangSync />
      <Billing>{children}</Billing>
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{ style: { background: "#1c1814", border: "1px solid #2a241e", color: "#f3ede4", fontFamily: "Instrument Sans" } }}
      />
    </QueryClientProvider>
  );
}
