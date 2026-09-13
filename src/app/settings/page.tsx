"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { 
  Settings, 
  Globe, 
  DollarSign, 
  Gauge, 
  Shield, 
  Database, 
  Layers, 
  RefreshCw, 
  ExternalLink, 
  Unlink, 
  Check, 
  AlertTriangle, 
  Loader2, 
  Bike as BikeIcon, 
  CheckCircle2,
  SlidersHorizontal
} from "lucide-react";
import { t, formatDateCs } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { StravaManageBikesModal } from "@/components/settings/StravaManageBikesModal";
import { BikeModal } from "@/components/garage/BikeModal";
import { StravaBikeSummary } from "@/lib/strava/stravaApi";
import { PublicStravaStatus } from "@/lib/strava/stravaTokenStore";
import { getValidAccessToken } from "@/lib/google/googleAuth";
import { Bike } from "@/types/vault";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "integrations" ? "integrations" : "preferences";
  const [activeTab, setActiveTab] = useState<"preferences" | "integrations">(initialTab);

  const { data, user, syncBikeFromStrava } = useVault();
  const currentUserId = user?.emailAddress || "default_user";

  // Strava status
  const [stravaStatus, setStravaStatus] = useState<PublicStravaStatus & { isConfigured?: boolean }>({
    connected: false,
  });
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [syncingAll, setSyncingAll] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Modals
  const [isManageBikesOpen, setIsManageBikesOpen] = useState(false);
  const [isImportBikeModalOpen, setIsImportBikeModalOpen] = useState(false);
  const [bikeToImportData, setBikeToImportData] = useState<(Partial<Bike> & { initialKm?: number; stravaGearId?: string }) | null>(null);
  const [isDisconnectConfirmOpen, setIsDisconnectConfirmOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  // Check URL params for callback notifications
  useEffect(() => {
    const errorParam = searchParams.get("strava_error");
    const connectedParam = searchParams.get("strava_connected");

    if (errorParam) {
      setStatusMessage({
        type: "error",
        text: `Autorizace se Stravou se nezdařila: ${decodeURIComponent(errorParam)}`,
      });
      setActiveTab("integrations");
    } else if (connectedParam) {
      setStatusMessage({
        type: "success",
        text: "Účet Strava byl úspěšně propojen.",
      });
      setActiveTab("integrations");
    }
  }, [searchParams]);

  const getStravaHeaders = useCallback((contentTypeJson = false): Record<string, string> => {
    const headers: Record<string, string> = {
      "x-bikevault-user-id": currentUserId,
    };
    if (contentTypeJson) {
      headers["Content-Type"] = "application/json";
    }
    const token = getValidAccessToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }, [currentUserId]);

  const loadStatus = useCallback(async () => {
    setLoadingStatus(true);
    try {
      const res = await fetch("/api/strava/status", {
        headers: getStravaHeaders(),
      });
      if (res.ok) {
        const json = await res.json();
        setStravaStatus(json);
      }
    } catch (err) {
      console.error("Failed to load Strava status:", err);
    } finally {
      setLoadingStatus(false);
    }
  }, [getStravaHeaders]);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Connect flow: redirect to /api/strava/auth
  const handleConnectStrava = async () => {
    try {
      const res = await fetch("/api/strava/auth", {
        headers: getStravaHeaders(),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Chyba při přípravě autorizace Strava.");
      }
      if (json.url) {
        window.location.href = json.url;
      }
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Chyba při propojování se Stravou.",
      });
    }
  };

  // Disconnect flow
  const handleConfirmDisconnect = async () => {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/strava/disconnect", {
        method: "POST",
        headers: getStravaHeaders(true),
        body: JSON.stringify({ userId: currentUserId }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Chyba při odpojování účtu Strava.");
      }
      setStravaStatus({ connected: false });
      setIsDisconnectConfirmOpen(false);
      setStatusMessage({
        type: "success",
        text: "Účet Strava byl úspěšně odpojen. Všechna dosavadní data a historie v BikeVault zůstávají zachována.",
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Chyba při odpojování Stravy.",
      });
    } finally {
      setDisconnecting(false);
    }
  };

  // Sync all linked bikes
  const handleSyncAllBikes = async () => {
    const linkedBikes = data.bikes.filter((b) => b.stravaGearId);
    if (linkedBikes.length === 0) {
      setStatusMessage({
        type: "error",
        text: "Nemáte žádná kola propojená se Stravou. Použijte akci 'Spravovat kola' pro propojení.",
      });
      return;
    }

    setSyncingAll(true);
    setStatusMessage(null);

    try {
      const gearIds = linkedBikes.map((b) => b.stravaGearId as string);
      const res = await fetch("/api/strava/sync", {
        method: "POST",
        headers: getStravaHeaders(true),
        body: JSON.stringify({ gearIds, userId: currentUserId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Chyba při synchronizaci se Stravou.");
      }

      const syncData = await res.json();
      const results = syncData.results || {};

      let updatedCount = 0;
      let upToDateCount = 0;
      let warningsCount = 0;

      for (const bike of linkedBikes) {
        const gearResult = results[bike.stravaGearId as string];
        if (gearResult && !gearResult.error) {
          const syncRes = syncBikeFromStrava(bike.id, gearResult.distanceKm);
          if (syncRes.type === "HIGHER") updatedCount++;
          else if (syncRes.type === "EQUAL") upToDateCount++;
          else if (syncRes.type === "LOWER") warningsCount++;
        }
      }

      await loadStatus();

      let msg = `Synchronizace dokončena: ${updatedCount} kol aktualizováno, ${upToDateCount} kol je aktuálních.`;
      if (warningsCount > 0) {
        msg += ` U ${warningsCount} kola/kol je stav na Stravě nižší než v BikeVault (nájezd nebyl snížen).`;
      }

      setStatusMessage({
        type: "success",
        text: msg,
      });
    } catch (err) {
      setStatusMessage({
        type: "error",
        text: err instanceof Error ? err.message : "Chyba při hromadné synchronizaci.",
      });
    } finally {
      setSyncingAll(false);
    }
  };

  // Trigger import from Strava
  const handleStartImportBike = (stravaBike: StravaBikeSummary) => {
    setBikeToImportData({
      name: stravaBike.name,
      manufacturer: stravaBike.brandName || "",
      model: stravaBike.modelName || "",
      initialKm: stravaBike.distanceKm,
      stravaGearId: stravaBike.id,
    });
    setIsImportBikeModalOpen(true);
  };

  const linkedBikesCount = data.bikes.filter((b) => b.stravaGearId).length;

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      {/* Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t("nav.settings")}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Uživatelské předvolby, propojení externích služeb a systémové informace
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100/80 rounded-xl border border-slate-200/60 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab("preferences")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "preferences"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Předvolby
          </button>
          <button
            onClick={() => setActiveTab("integrations")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === "integrations"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>Integrace</span>
            {stravaStatus.connected && (
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            )}
          </button>
        </div>
      </div>

      {/* Status Notifications */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-start gap-3 border shadow-xs animate-fade-in ${
            statusMessage.type === "success"
              ? "bg-emerald-50/80 border-emerald-200/80 text-emerald-800"
              : "bg-rose-50/80 border-rose-200/80 text-rose-800"
          }`}
        >
          {statusMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">{statusMessage.text}</div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs font-semibold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: INTEGRATIONS */}
      {activeTab === "integrations" && (
        <div className="space-y-6">
          {/* Strava Integration Card */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black tracking-wider text-sm shadow-xs">
                  ST
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Strava
                  </h3>
                  <p className="text-xs text-slate-500">
                    Synchronizace celkového nájezdu kol z vašeho účtu Strava
                  </p>
                </div>
              </div>

              {/* Connection Status Badge */}
              {loadingStatus ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Zjišťuji stav...</span>
                </div>
              ) : stravaStatus.connected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Připojeno</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Nepřipojeno</span>
                </span>
              )}
            </div>

            {/* Content based on state */}
            {loadingStatus ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-sky-600" />
                <span>Ověřuji stav spojení se Stravou...</span>
              </div>
            ) : !stravaStatus.connected ? (
              /* Disconnected State */
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/60 text-xs text-slate-600 space-y-2">
                  <p className="font-semibold text-slate-900">
                    Jak funguje integrace se Stravou v BikeVault:
                  </p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-600">
                    <li>
                      <strong>Bezpečný import a párování:</strong> Načte vaše kola a umožní je propojit s koly v BikeVault nebo je založit jako nová.
                    </li>
                    <li>
                      <strong>BikeVault je autoritativní:</strong> Strava je pouze externím zdrojem pro tachometr. Žádná vaše servisní historie, komponenty, nastavení ani fotky se nepřepisují.
                    </li>
                    <li>
                      <strong>Ochrana historie nájezdu:</strong> Nižší stav tachometru ze Stravy nikdy automaticky nesníží stav v BikeVaultu.
                    </li>
                    <li>
                      <strong>Bezpečnost:</strong> Tokeny jsou bezpečně spravovány na serveru s minimálními oprávněními (pouze čtení).
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <button
                    onClick={handleConnectStrava}
                    className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                  >
                    <span>Připojit Stravu</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </button>
                </div>
              </div>
            ) : (
              /* Connected State */
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 block">Propojený sportovec</span>
                    <span className="text-sm font-bold text-slate-900 block truncate">
                      {stravaStatus.athleteName || "Uživatel Strava"}
                    </span>
                    <span className="text-[10px] text-slate-400 block tabular-nums">
                      ID: {stravaStatus.athleteId}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 block">Poslední synchronizace</span>
                    <span className="text-sm font-bold text-slate-900 block">
                      {stravaStatus.lastSyncAt ? formatDateCs(stravaStatus.lastSyncAt) : "Zatím neproběhla"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      {stravaStatus.lastSyncAt ? new Date(stravaStatus.lastSyncAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>

                  <div className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 block">Stav propojení kol</span>
                    <span className="text-sm font-bold text-slate-900 block tabular-nums">
                      {linkedBikesCount} {linkedBikesCount === 1 ? "kolo" : linkedBikesCount >= 2 && linkedBikesCount <= 4 ? "kola" : "kol"}
                    </span>
                    <span className="text-[10px] text-slate-400 block">
                      z {data.bikes.length} kol v garáži
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-slate-100">
                  <button
                    onClick={handleSyncAllBikes}
                    disabled={syncingAll}
                    className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? "animate-spin text-sky-400" : ""}`} />
                    <span>{syncingAll ? "Synchronizuji..." : "Synchronizovat"}</span>
                  </button>

                  <button
                    onClick={() => setIsManageBikesOpen(true)}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
                    <span>Spravovat kola</span>
                  </button>

                  <button
                    onClick={() => setIsDisconnectConfirmOpen(true)}
                    className="px-3 py-2 text-rose-600 hover:text-rose-700 hover:bg-rose-50 text-xs font-semibold rounded-xl border border-rose-200/60 transition-colors ml-auto flex items-center gap-1.5 cursor-pointer"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Odpojit Stravu</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: PREFERENCES (Existing Settings) */}
      {activeTab === "preferences" && (
        <div className="space-y-6">
          {/* Preferences Section */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Měrné jednotky a lokalizace
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-sky-600" />
                  <span>Jazyk rozhraní</span>
                </span>
                <span className="text-base font-bold text-slate-900 block">
                  Čeština (cs-CZ)
                </span>
                <p className="text-[11px] text-slate-500">
                  100% lokalizované rozhraní pro české cyklisty.
                </p>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1.5">
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

              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1.5">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                  <Gauge className="w-4 h-4 text-sky-600" />
                  <span>Jednotka tlaku v pláštích</span>
                </span>
                <span className="text-base font-bold text-slate-900 block">
                  bar (metrické)
                </span>
                <p className="text-[11px] text-slate-500">
                  Ukládáno v bar s přesností na 2 desetinná místa (např. 1,55 bar).
                </p>
              </div>

              <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200/60 space-y-1.5">
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
          <div className="bg-white border border-slate-200/80 rounded-2xl p-5 sm:p-6 space-y-4 shadow-sm">
            <div className="flex items-center gap-2 text-slate-900">
              <Database className="w-4 h-4 text-sky-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider">
                Systémové informace BikeVault
              </h3>
            </div>

            <div className="space-y-2.5 text-xs text-slate-600 divide-y divide-slate-100">
              <div className="flex justify-between py-2">
                <span>Architektura</span>
                <span className="font-semibold text-sky-700">Next.js App Router (Hybrid Cloud)</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Cloudové úložiště</span>
                <span className="font-semibold text-slate-900 tabular-nums">Google Drive (bikevault_data.json)</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Lokální vyrovnávací paměť</span>
                <span className="font-semibold text-slate-900 tabular-nums">Web Storage (localStorage)</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Autentizace</span>
                <span className="font-semibold text-slate-900">Google Identity Services (OAuth 2.0)</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Integrace Strava</span>
                <span className="font-semibold text-slate-900">
                  {stravaStatus.connected ? "Aktivní (OAuth 2.0 Server-Side)" : "Neaktivní"}
                </span>
              </div>
              <div className="flex justify-between py-2">
                <span>Integritní pravidla</span>
                <span className="font-semibold text-emerald-700">Aktivní (zákaz souběžné montáže, ochrana historie)</span>
              </div>
              <div className="flex justify-between py-2">
                <span>Verze aplikace</span>
                <span className="font-semibold text-slate-700 tabular-nums">1.1.0 (Strava Integration)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Strava Bikes Modal */}
      <StravaManageBikesModal
        isOpen={isManageBikesOpen}
        onClose={() => setIsManageBikesOpen(false)}
        onImportBike={handleStartImportBike}
        userId={currentUserId}
      />

      {/* Import Bike into BikeVault Modal */}
      <BikeModal
        isOpen={isImportBikeModalOpen}
        onClose={() => {
          setIsImportBikeModalOpen(false);
          setBikeToImportData(null);
        }}
        onSuccess={() => {
          setIsImportBikeModalOpen(false);
          setBikeToImportData(null);
          setStatusMessage({
            type: "success",
            text: "Kolo ze Stravy bylo úspěšně importováno do BikeVaultu.",
          });
        }}
        initialData={bikeToImportData}
      />

      {/* Disconnect Confirmation Dialog */}
      {isDisconnectConfirmOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-slate-200/80 space-y-4 animate-scale-in">
            <h3 className="text-base font-bold text-slate-900">
              Odpojit účet Strava?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Opravdu si přejete odpojit propojení se Stravou? Všechna vaše kola, záznamy tachometru, historie i komponenty v BikeVaultu zůstanou beze změny zachovány. Pouze bude ukončena budoucí synchronizace nájezdu.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setIsDisconnectConfirmOpen(false)}
                disabled={disconnecting}
                className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl"
              >
                Zrušit
              </button>
              <button
                onClick={handleConfirmDisconnect}
                disabled={disconnecting}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                <span>{disconnecting ? "Odpojuji..." : "Potvrdit odpojení"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
