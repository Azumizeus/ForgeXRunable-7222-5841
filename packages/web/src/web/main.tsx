// Entry referenced by index.html — composition only: finish a returning managed
// sign-in (top-level redirect leg), then the template-managed mount renders.
import { authClient } from "./lib/auth";
import "./__main";

void authClient.managedAuth.handleRedirect().catch(() => undefined);
