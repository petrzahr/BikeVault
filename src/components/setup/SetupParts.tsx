"use client";

import React, { useId } from "react";
import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/ui";
import { stepClicks } from "@/lib/domain/setup";

/** Setup plate: header with the part (h3), the mounted component and an optional spec chip, then the body. */
export function SetupSheet({
  title,
  subtitle,
  badge,
  children,
  className,
}: {
  title: string;
  subtitle: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      <div className="flex items-start justify-between gap-3 px-4 sm:px-5 py-3 border-b border-slate-200">
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        </div>
        {badge}
      </div>
      {children}
    </section>
  );
}

/** Two big values side by side (pressure + SAG, front + rear tyre), divided by a hairline. */
export function ReadoutRow({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200">{children}</div>;
}

/** Big editable measured value: stamped caption, mono input with its unit, optional secondary reading below. */
export function ReadoutField({
  label,
  unit,
  value,
  onChange,
  step,
  secondary,
}: {
  label: string;
  unit: string;
  value: string;
  onChange: (value: string) => void;
  step?: string;
  secondary?: string | null;
}) {
  const id = useId();
  return (
    <div className="px-4 sm:px-5 py-3 space-y-1 min-w-0">
      <label htmlFor={id} className="section-label block">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="field field-readout pr-12"
        />
        <span className="readout-unit absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">{unit}</span>
      </div>
      <p className="font-mono text-xs text-slate-500 min-h-4">{secondary ?? ""}</p>
    </div>
  );
}

/** SAG drawn on the travel ruler (same recipes as the service interval gauge). */
export function SagRuler({ sagPercent, travelMm }: { sagPercent: string; travelMm: number | null }) {
  const sag = Number(sagPercent);
  if (!travelMm || sagPercent === "" || !Number.isFinite(sag) || sag < 0 || sag > 100) return null;
  return (
    <div className="px-4 sm:px-5 py-3 border-b border-slate-200 space-y-1">
      <div className="gauge-track" role="img" aria-label={`SAG ${sag} % ze zdvihu ${travelMm} mm`}>
        <div className="gauge-scale" />
        <div className="gauge-bar bg-slate-900" style={{ width: `${sag}%` }} />
        <div className="gauge-pointer" style={{ left: `${sag}%` }} />
      </div>
      <div className="flex justify-between font-mono text-xs text-slate-500">
        <span>0</span>
        <span>zdvih {travelMm} mm</span>
      </div>
    </div>
  );
}

/** Damping clicks counted from closed: − / value / + joined into one control; the value stays editable. */
export function ClickStepper({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-2 border-b border-slate-100 last:border-b-0">
      <label htmlFor={id} className="min-w-0">
        <span className="section-label block">{label}</span>
        <span className="text-xs text-slate-500">od zavřeno</span>
      </label>
      <div className="stepper">
        <button type="button" onClick={() => onChange(stepClicks(value, -1))} aria-label={`${label}: o klik méně`}>
          <Minus className="w-4 h-4" />
        </button>
        <input
          id={id}
          type="number"
          inputMode="numeric"
          min="0"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button type="button" onClick={() => onChange(stepClicks(value, 1))} aria-label={`${label}: o klik více`}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
