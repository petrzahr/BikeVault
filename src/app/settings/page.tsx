import React from "react";
import { Settings, Globe, DollarSign, Gauge, Shield, Database } from "lucide-react";
import { t } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {t("nav.settings")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Uživatelské předvolby měny, měrných jednotek a technické informace o aplikaci
        </p>
      </div>

      {/* Preferences Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6 shadow-sm">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
          Měrné jednotky a lokalizace
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Globe className="w-4 h-4 text-blue-600" />
              <span>Jazyk rozhraní</span>
            </span>
            <span className="text-base font-bold text-slate-900 block">
              Čeština (cs-CZ)
            </span>
            <p className="text-[11px] text-slate-500">
              100% lokalizované rozhraní pro české cyklisty.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Výchozí měna</span>
            </span>
            <span className="text-base font-bold text-slate-900 block">
              CZK (Česká koruna — Kč)
            </span>
            <p className="text-[11px] text-slate-500">
              Autoritativní finanční výpočty v celých Kč.
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-blue-600" />
              <span>Jednotka tlaku v pláštích</span>
            </span>
            <span className="text-base font-bold text-slate-900 block">
              bar (metrické)
            </span>
            <p className="text-[11px] text-slate-500">
              Ukládáno v bar s přesností na 2 desetinná místa (např. 1,55 bar).
            </p>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
              <Gauge className="w-4 h-4 text-indigo-600" />
              <span>Jednotka tlaku odpružení</span>
            </span>
            <span className="text-base font-bold text-slate-900 block">
              psi (pounds per square inch)
            </span>
            <p className="text-[11px] text-slate-500">
              Standardní jednotka pro vidlice a tlumiče (např. 76 psi, 195 psi).
            </p>
          </div>
        </div>
      </div>

      {/* Technical & Database Info */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-slate-900">
          <Database className="w-5 h-5 text-blue-600" />
          <h3 className="text-sm font-bold uppercase tracking-wider">
            Systémové informace BikeVault
          </h3>
        </div>

        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span>Uživatelský režim</span>
            <span className="font-semibold text-slate-900">Single-User (Bez autentizace — přímý vstup)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span>Databázový engine</span>
            <span className="font-semibold text-blue-700 font-mono">PostgreSQL 16 (PGlite persistent engine)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span>Perzistentní úložiště dat</span>
            <span className="font-semibold text-slate-900 font-mono">.data/pgdata</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-100">
            <span>Integritní pravidla</span>
            <span className="font-semibold text-emerald-700">Aktivní (zákaz souběžné montáže, ochrana historie)</span>
          </div>
          <div className="flex justify-between py-2">
            <span>Verze aplikace</span>
            <span className="font-semibold text-slate-700 font-mono">0.1.0 MVP</span>
          </div>
        </div>
      </div>
    </div>
  );
}
