import React from "react";
import { cn } from "@/lib/ui";
import type { IntervalGaugeReading } from "@/lib/domain/intervalGauge";

const fmt = (v: number) => v.toLocaleString("cs-CZ", { maximumFractionDigits: 1 });

/**
 * Service-interval ruler: graphite usage up to the warning zone, steel inside it, rose past the limit,
 * a limit tick and a pointer at the current usage. Visual only; the text state lives in the chip next to it.
 */
export function IntervalGauge({ reading, className }: { reading: IntervalGaugeReading; className?: string }) {
  const { usedPct, limitPct, warnPct, used, interval, unit, urgency } = reading;
  const baseEnd = Math.min(usedPct, warnPct);
  const warnEnd = Math.min(usedPct, limitPct);
  const over = used - interval;

  return (
    <div className={cn("space-y-1", className)}>
      <div
        className="gauge-track"
        role="img"
        aria-label={`${fmt(used)} z ${fmt(interval)} ${unit}${over > 0 ? `, ${fmt(over)} ${unit} po termínu` : ""}`}
      >
        <div className="gauge-scale" />
        {/* The due-soon window is outlined even before usage reaches it */}
        <div
          className="gauge-bar bg-steel-50 outline outline-1 -outline-offset-1 outline-steel-300"
          style={{ left: `${warnPct}%`, width: `${Math.max(0, limitPct - warnPct)}%` }}
        />
        <div className="gauge-bar bg-slate-900" style={{ width: `${baseEnd}%` }} />
        {usedPct > warnPct && (
          <div className="gauge-bar bg-steel-600" style={{ left: `${warnPct}%`, width: `${warnEnd - warnPct}%` }} />
        )}
        {urgency === "OVERDUE" && usedPct > limitPct && (
          <div className="gauge-bar bg-rose-600" style={{ left: `${limitPct}%`, width: `${usedPct - limitPct}%` }} />
        )}
        <div className="gauge-limit" style={{ left: `${limitPct}%` }} />
        <div className="gauge-pointer" style={{ left: `${usedPct}%` }} />
      </div>
      <div className="flex justify-between font-mono text-xs text-slate-500">
        <span>0 {unit}</span>
        <span>
          <b className="font-semibold text-slate-900">{fmt(used)}</b> / {fmt(interval)} {unit}
          {over > 0 && <span className="text-rose-700"> · +{fmt(over)} {unit}</span>}
        </span>
      </div>
    </div>
  );
}

export default IntervalGauge;
