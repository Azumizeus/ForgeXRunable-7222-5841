import { authed } from "../middleware/auth";
import { usage } from "../lib/billing";

export const billing = {
  usage: authed.handler(({ context }) => usage(context.user)),
};
