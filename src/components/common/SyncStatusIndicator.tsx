import React from "react";
import { AlertCircle, CheckCircle2, CloudOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/ui";
import { SYNC_LABELS, getSyncTone, type SyncDisplayState, type SyncTone } from "@/lib/syncStatus";

const ICON_COLOR: Record<SyncTone, string> = {
  busy: "text-navy-600",
  problem: "text-rose-600",
  pending: "text-amber-600",
  ok: "text-emerald-600",
};

// Lighter shades for the dark header
const ICON_COLOR_ON_DARK: Record<SyncTone, string> = {
  busy: "text-sky-300",
  problem: "text-rose-400",
  pending: "text-amber-400",
  ok: "text-emerald-400",
};

const TEXT_COLOR: Record<SyncTone, string> = {
  busy: "text-navy-700",
  problem: "text-rose-700",
  pending: "text-amber-700",
  ok: "text-emerald-700",
};

export const SyncStatusIcon: React.FC<{ state: SyncDisplayState; className?: string; onDark?: boolean }> = ({
  state,
  className = "w-3.5 h-3.5",
  onDark = false,
}) => {
  const tone = getSyncTone(state);
  const cls = cn(className, "shrink-0", (onDark ? ICON_COLOR_ON_DARK : ICON_COLOR)[tone]);
  if (tone === "busy") return <RefreshCw className={cn(cls, "animate-spin motion-reduce:animate-none")} aria-hidden="true" />;
  if (tone === "problem") return <AlertCircle className={cls} aria-hidden="true" />;
  if (tone === "ok") return <CheckCircle2 className={cls} aria-hidden="true" />;
  return <CloudOff className={cls} aria-hidden="true" />;
};

export const SyncStatusLabel: React.FC<{ state: SyncDisplayState; iconClassName?: string }> = ({ state, iconClassName }) => (
  <span className="inline-flex items-center gap-1.5 font-semibold">
    <SyncStatusIcon state={state} className={iconClassName} />
    <span className={TEXT_COLOR[getSyncTone(state)]}>{SYNC_LABELS[state]}</span>
  </span>
);
