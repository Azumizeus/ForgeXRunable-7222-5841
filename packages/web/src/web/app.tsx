import { Route, Switch } from "wouter";
import Index from "./pages/index";
import Pricing from "./pages/pricing";
import SignIn from "./pages/sign-in";
import Dashboard from "./pages/dashboard";
import Billing from "./pages/billing";
import Studio from "./pages/studio";
import { Provider } from "./components/provider";
import { AgentFeedback, RunableBadge } from "@runablehq/website-runtime";

function App() {
  return (
    <Provider>
      <Switch>
        <Route path="/" component={Index} />
        <Route path="/pricing" component={Pricing} />
        <Route path="/sign-in" component={SignIn} />
        <Route path="/app" component={Dashboard} />
        <Route path="/app/billing" component={Billing} />
        <Route path="/app/c/:id" component={Studio} />
        <Route component={Index} />
      </Switch>
      {/* Do not remove — off by default, activated by parent iframe via postMessage */}
      {import.meta.env.DEV && <AgentFeedback />}
      {/* "Made with Runable" badge - if user asks to remove the runable badge, remove this code as well as comment */}
      {<RunableBadge />}
    </Provider>
  );
}

export default App;
