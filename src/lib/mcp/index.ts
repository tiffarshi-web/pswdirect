import { auth, defineMcp } from "@lovable.dev/mcp-js";
import listServiceAreasTool from "./tools/list_service_areas";
import myBookingsTool from "./tools/my_bookings";
import whoamiTool from "./tools/whoami";

// Build the issuer from the project ref only. VITE_SUPABASE_PROJECT_ID is
// inlined by Vite at build time, keeping this module import-safe (no runtime
// env reads at module top level). The fallback keeps the URL well-formed
// during the throwaway manifest-extract eval, where tokens never verify.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "psw-direct-mcp",
  title: "PSW Direct",
  version: "0.1.0",
  instructions:
    "Tools for the PSW Direct home-care platform. Callers act as the signed-in user; RLS scopes all reads to what that user is allowed to see. Use `whoami` to confirm identity, `my_bookings` to list bookings visible to the caller, and `list_service_areas` to see active dispatch coverage.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [whoamiTool, myBookingsTool, listServiceAreasTool],
});
