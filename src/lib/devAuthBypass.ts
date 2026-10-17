// Dev-only login bypass for local UI work and screenshots (no Google sign-in, no Drive calls).
// Active only when ALL hold: development build, NEXT_PUBLIC_DEV_AUTH_BYPASS=true, demo storage mode
// (NEXT_PUBLIC_ENABLE_DEMO_DATA=true, so data lives under the demo cache key, never the production key)
// and the page is served from localhost. Never set these variables on Vercel.

export interface DevAuthBypassInput {
  nodeEnv: string | undefined;
  bypassFlag: string | undefined;
  demoFlag: string | undefined;
  hostname: string | undefined;
}

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function shouldBypassAuth({ nodeEnv, bypassFlag, demoFlag, hostname }: DevAuthBypassInput): boolean {
  return (
    nodeEnv === "development" &&
    bypassFlag === "true" &&
    demoFlag === "true" &&
    typeof hostname === "string" &&
    LOCAL_HOSTS.has(hostname)
  );
}

export function isDevAuthBypassEnabled(): boolean {
  // Literal process.env.* references so Next.js inlines them (and strips the branch in production builds)
  if (process.env.NODE_ENV !== "development") return false;
  return shouldBypassAuth({
    nodeEnv: process.env.NODE_ENV,
    bypassFlag: process.env.NEXT_PUBLIC_DEV_AUTH_BYPASS,
    demoFlag: process.env.NEXT_PUBLIC_ENABLE_DEMO_DATA,
    hostname: typeof window !== "undefined" ? window.location.hostname : undefined,
  });
}

export const DEV_BYPASS_USER = {
  displayName: "Demo (dev bypass)",
  emailAddress: "demo@localhost",
};
