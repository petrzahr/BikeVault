"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useVault } from "@/context/VaultContext";
import { StravaIcon } from "@/components/common/StravaIcon";
import { getValidAccessToken } from "@/lib/google/googleAuth";
import { cn } from "@/lib/ui";

type StravaState = "loading" | "connected" | "disconnected";

export const StravaStatusBadge: React.FC = () => {
  const pathname = usePathname();
  const { user } = useVault();
  const [state, setState] = useState<StravaState>("loading");
  const [athleteName, setAthleteName] = useState<string | undefined>();

  const userId = user?.emailAddress || "default_user";

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const headers: Record<string, string> = { "x-bikevault-user-id": userId };
        const token = getValidAccessToken();
        if (token) headers["Authorization"] = `Bearer ${token}`;
        const res = await fetch("/api/strava/status", { headers });
        if (!res.ok) throw new Error("status");
        const json = await res.json();
        if (cancelled) return;
        setAthleteName(json.athleteName);
        setState(json.connected ? "connected" : "disconnected");
      } catch {
        if (!cancelled) setState("disconnected");
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [userId, pathname]);

  const connected = state === "connected";

  return (
    <Link
      href="/settings?tab=integrations"
      title={
        connected
          ? `Strava připojena${athleteName ? ` – ${athleteName}` : ""}`
          : "Strava není připojena – otevřít nastavení"
      }
      className={cn(
        "btn-header",
        // Connected = filled in the app's signal amber with graphite text (same pairing as btn-primary)
        connected && "bg-signal-500 hover:bg-signal-400 border-signal-600 text-slate-900"
      )}
    >
      <StravaIcon className={cn("w-3.5 h-3.5 shrink-0", !connected && "text-signal-400")} />
      <span className="hidden sm:inline">
        {state === "loading" ? "Strava" : connected ? "Strava připojena" : "Připojit Stravu"}
      </span>
      <span className="sm:hidden">Strava</span>
    </Link>
  );
};

export default StravaStatusBadge;
