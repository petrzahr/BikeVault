"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import {
  Activity,
  Cloud,
  Download,
  Ruler,
  RefreshCw,
  ExternalLink,
  Unlink,
  LogOut,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  SlidersHorizontal,
  Trash2,
  Upload,
  X,
  type LucideIcon,
} from "lucide-react";
import { formatDateCs } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { StravaManageBikesModal } from "@/components/settings/StravaManageBikesModal";
import { BikeModal } from "@/components/garage/BikeModal";
import { ClearAllDataModal } from "@/components/settings/ClearAllDataModal";
import { RestoreConfirmationModal, type RestoreRequest } from "@/components/settings/RestoreConfirmationModal";
import { buildRestorePreview, parseBackupForRestore } from "@/lib/storage/backupMerge";
import { useFeedback } from "@/components/common/Feedback";
import { StravaBikeSummary } from "@/lib/strava/stravaApi";
import { PublicStravaStatus } from "@/lib/strava/stravaTokenStore";
import { getValidAccessToken, loginToGoogle } from "@/lib/google/googleAuth";
import { Bike } from "@/types/vault";
import { Modal, ModalFooter } from "@/components/common/Modal";
import { GoogleIcon } from "@/components/common/GoogleIcon";
import { SyncStatusLabel } from "@/components/common/SyncStatusIndicator";
import { useDisconnectDrive } from "@/components/common/useDisconnectDrive";
import { getSyncDisplayState } from "@/lib/syncStatus";
import { cn } from "@/lib/ui";


export const dynamic = "force-dynamic";

// Outline entries match the section headings
const SETTINGS_SECTIONS = [
  { id: "nastaveni-strava", label: "Propojení se Stravou" },
  { id: "nastaveni-disk", label: "Synchronizace s Google Diskem" },
  { id: "nastaveni-zaloha", label: "Záloha do souboru" },
  { id: "nastaveni-jednotky", label: "Jednotky a formáty" },
  { id: "nastaveni-data", label: "Mazání dat" },
] as const;

type SettingsSectionId = (typeof SETTINGS_SECTIONS)[number]["id"];

const UNIT_ROWS = [
  { label: "Jazyk rozhraní", value: "Čeština" },
  { label: "Měna", value: "CZK (Kč), celé koruny" },
  { label: "Tlak v pláštích", value: "bar" },
  { label: "Tlak odpružení", value: "psi" },
  { label: "Verze aplikace", value: "1.1.0" },
];

interface SettingsSectionProps {
  id: SettingsSectionId;
  icon: LucideIcon;
  title: string;
  description: string;
  /** Only data deletion carries meaning; every other section icon stays neutral */
  danger?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

const SettingsSection: React.FC<SettingsSectionProps> = ({ id, icon: Icon, title, description, danger, actions, children }) => (
  <section id={id} tabIndex={-1} aria-labelledby={`${id}-title`} className="card p-4 sm:p-5 space-y-4 scroll-mt-6 focus:outline-none">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
      <div className="flex items-center gap-3 min-w-0">
        <div className={cn("p-2 rounded-xl shrink-0", danger ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500")}>
          <Icon className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <h2 id={`${id}-title`} className="text-base font-bold text-slate-900">{title}</h2>
          <p className="text-xs text-slate-500">{description}</p>
        </div>
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap shrink-0">{actions}</div>}
    </div>
    {children}
  </section>
);

// Nearest scrolling ancestor: the app content scrolls, not the window
function getScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") return node;
    node = node.parentElement;
  }
  return null;
}

const scrollToSection = (id: SettingsSectionId) => {
  const el = document.getElementById(id);
  if (!el) return;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  el.focus({ preventScroll: true });
};

const SettingsOutline: React.FC<{ contentRef: React.RefObject<HTMLDivElement | null> }> = ({ contentRef }) => {
  const [activeId, setActiveId] = useState<SettingsSectionId>(SETTINGS_SECTIONS[0].id);
  // After a click, keep the chosen item until smooth scrolling settles (bottom sections never reach the top)
  const clickedUntilRef = useRef(0);

  useEffect(() => {
    const scroller = getScrollParent(contentRef.current);
    if (!scroller) return;
    const update = () => {
      if (Date.now() < clickedUntilRef.current) {
        clickedUntilRef.current = Date.now() + 150;
        return;
      }
      const top = scroller.getBoundingClientRect().top + 96;
      const atBottom = scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 4;
      let current: SettingsSectionId = SETTINGS_SECTIONS[0].id;
      for (const { id } of SETTINGS_SECTIONS) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= top) current = id;
      }
      setActiveId(atBottom ? SETTINGS_SECTIONS[SETTINGS_SECTIONS.length - 1].id : current);
    };
    update();
    scroller.addEventListener("scroll", update, { passive: true });
    return () => scroller.removeEventListener("scroll", update);
  }, [contentRef]);

  const goTo = (id: SettingsSectionId) => {
    scrollToSection(id);
    clickedUntilRef.current = Date.now() + 150;
    setActiveId(id);
  };

  return (
    <nav aria-label="Obsah nastavení" className="hidden xl:block sticky top-6 space-y-2">
      <p className="px-3 section-label">Na této stránce</p>
      <ul className="space-y-0.5">
        {SETTINGS_SECTIONS.map(({ id, label }) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => goTo(id)}
              aria-current={activeId === id ? "location" : undefined}
              className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold leading-snug transition-colors text-slate-500 hover:bg-slate-100 hover:text-slate-900 aria-[current=location]:bg-navy-50 aria-[current=location]:text-navy-700"
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};

export default function SettingsPage() {
  const searchParams = useSearchParams();
  const contentRef = useRef<HTMLDivElement>(null);

  const {
    data,
    user,
    appState,
    syncStatus,
    syncError,
    lastSyncedAt,
    isAuthenticated,
    login,
    reauthorizeGoogleDrive,
    syncNow,
    exportBackup,
    restoreBackup,
    syncBikeFromStrava,
    clearAllData,
  } = useVault();
  const disconnectDrive = useDisconnectDrive();
  const syncState = getSyncDisplayState(syncStatus, appState);
  const [isClearAllOpen, setIsClearAllOpen] = useState(false);
  const { toast } = useFeedback();
  const restoreInputRef = useRef<HTMLInputElement>(null);
  const [restoreRequest, setRestoreRequest] = useState<RestoreRequest | null>(null);
  const canRestore = appState === "ready";

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Reset so picking the same file again still fires onChange
    e.target.value = "";
    if (!file) return;
    try {
      const content = await file.text();
      const backup = parseBackupForRestore(content);
      setRestoreRequest({ fileName: file.name, content, preview: buildRestorePreview(backup, data) });
    } catch (err) {
      toast("Soubor nelze použít jako zálohu: " + (err instanceof Error ? err.message : String(err)), "error");
    }
  };

  const handleRestoreConfirm = (content: string) => {
    setRestoreRequest(null);
    if (restoreBackup(content)) {
      toast("Data ze zálohy byla obnovena.", "success");
    }
  };

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
  const [bikeToImportData, setBikeToImportData] = useState<(Partial<Bike> & { initialKm?: number; initialHours?: number; stravaGearId?: string }) | null>(null);
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
    } else if (connectedParam) {
      setStatusMessage({
        type: "success",
        text: "Účet Strava byl úspěšně propojen.",
      });
    }

    // Older links (header badge, Strava callback) point to the former "integrations" tab
    if (searchParams.get("tab") === "integrations") {
      requestAnimationFrame(() => scrollToSection("nastaveni-strava"));
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
      let token = getValidAccessToken();
      if (!token) {
        // Token might have expired during the session; prompt re-auth
        try {
          token = await loginToGoogle();
        } catch {
          throw new Error("Pro propojení se Stravou je vyžadováno platné přihlášení k účtu Google.");
        }
      }

      const headers = getStravaHeaders();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/strava/auth", {
        headers,
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
      let movingTimeError: string | undefined;

      for (const bike of linkedBikes) {
        const gearResult = results[bike.stravaGearId as string];
        if (gearResult && !gearResult.error) {
          movingTimeError = movingTimeError || gearResult.movingTimeError;
          const syncRes = syncBikeFromStrava(bike.id, gearResult.distanceKm, gearResult.movingMinutes);
          if (syncRes.type === "HIGHER") updatedCount++;
          else if (syncRes.type === "EQUAL") upToDateCount++;
          else if (syncRes.type === "LOWER") warningsCount++;
        }
      }

      await loadStatus();

      let msg = `Synchronizace dokončena: ${updatedCount} kol aktualizováno, ${upToDateCount} kol je aktuálních.`;
      if (warningsCount > 0) {
        msg += ` U ${warningsCount} kola/kol je stav na Stravě nižší než v BikeVault (nájezd ani hodiny nebyly sníženy).`;
      }
      if (movingTimeError) {
        msg += ` Hodiny nebyly synchronizovány: ${movingTimeError}`;
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
      initialHours:
        stravaBike.movingMinutes != null ? Math.round((stravaBike.movingMinutes / 60) * 100) / 100 : undefined,
      stravaGearId: stravaBike.id,
    });
    setIsImportBikeModalOpen(true);
  };

  const linkedBikesCount = data.bikes.filter((b) => b.stravaGearId).length;

  return (
    <div className="animate-fade-in">
      {/* The shell header shows the screen name; the page keeps one h1 for assistive tech */}
      <h1 className="sr-only">Nastavení</h1>

      <div className="xl:grid xl:grid-cols-[minmax(0,56rem)_13rem] xl:gap-8 xl:items-start">
        <div ref={contentRef} className="space-y-6 max-w-4xl min-w-0">
          {/* Status Notifications */}
          {statusMessage && (
            <div
              className={`panel flex items-center gap-3 animate-fade-in ${
                statusMessage.type === "success" ? "panel-success" : "panel-error"
              }`}
            >
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <div className="flex-1 font-medium">{statusMessage.text}</div>
              <button
                type="button"
                onClick={() => setStatusMessage(null)}
                aria-label="Zavřít upozornění"
                className="btn-icon -my-1.5 -mr-1.5 text-current opacity-70 hover:opacity-100 hover:bg-black/5 hover:text-current"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* 1. Strava */}
          <SettingsSection
            id="nastaveni-strava"
            icon={Activity}
            title="Propojení se Stravou"
            description="Nájezd a čas jízdy propojených kol se načítají ze Stravy"
            actions={
              loadingStatus ? (
                <span className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Zjišťuji stav…</span>
                </span>
              ) : stravaStatus.connected ? (
                <span className="chip chip-emerald">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Připojeno</span>
                </span>
              ) : (
                <span className="chip chip-neutral">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  <span>Nepřipojeno</span>
                </span>
              )
            }
          >
            {loadingStatus ? (
              <div className="py-8 text-center text-slate-500 text-xs">
                <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2 text-navy-600" />
                <span>Ověřuji stav spojení se Stravou…</span>
              </div>
            ) : !stravaStatus.connected ? (
              <div className="space-y-4">
                <div className="panel panel-neutral space-y-2">
                  <p className="font-semibold text-slate-900">
                    Jak funguje integrace se Stravou v BikeVault:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>Bezpečný import a párování:</strong> Načte vaše kola a umožní je propojit s koly v BikeVault nebo je založit jako nová.
                    </li>
                    <li>
                      <strong>BikeVault je autoritativní:</strong> Strava slouží jako externí zdroj ujetých kilometrů a času. Vaše servisní historie, komponenty, nastavení ani fotografie se nikdy nepřepisují.
                    </li>
                    <li>
                      <strong>Ochrana historie nájezdu:</strong> Nižší stav nájezdu ze Stravy nikdy automaticky nesníží stav v BikeVaultu.
                    </li>
                    <li>
                      <strong>Bezpečnost:</strong> Tokeny jsou bezpečně spravovány na serveru s minimálními oprávněními (pouze čtení).
                    </li>
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={handleConnectStrava}
                  className="btn-primary"
                >
                  <span>Připojit Stravu</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="panel panel-neutral space-y-1">
                    <span className="font-semibold text-slate-500 block">Propojený sportovec</span>
                    <span className="text-sm font-bold text-slate-900 block truncate">
                      {stravaStatus.athleteName || "Uživatel Strava"}
                    </span>
                    <span className="text-slate-500 block tabular-nums">
                      ID: {stravaStatus.athleteId}
                    </span>
                  </div>

                  <div className="panel panel-neutral space-y-1">
                    <span className="font-semibold text-slate-500 block">Poslední synchronizace</span>
                    <span className="text-sm font-bold text-slate-900 block">
                      {stravaStatus.lastSyncAt ? formatDateCs(stravaStatus.lastSyncAt) : "Zatím neproběhla"}
                    </span>
                    <span className="text-slate-500 block">
                      {stravaStatus.lastSyncAt ? new Date(stravaStatus.lastSyncAt).toLocaleTimeString("cs-CZ", { hour: "2-digit", minute: "2-digit" }) : "—"}
                    </span>
                  </div>

                  <div className="panel panel-neutral space-y-1">
                    <span className="font-semibold text-slate-500 block">Stav propojení kol</span>
                    <span className="text-sm font-bold text-slate-900 block tabular-nums">
                      {linkedBikesCount} {linkedBikesCount === 1 ? "kolo" : linkedBikesCount >= 2 && linkedBikesCount <= 4 ? "kola" : "kol"}
                    </span>
                    <span className="text-slate-500 block">
                      z {data.bikes.length} kol v garáži
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleSyncAllBikes}
                    disabled={syncingAll}
                    className="btn-primary"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingAll ? "animate-spin" : ""}`} />
                    <span>{syncingAll ? "Synchronizuji…" : "Synchronizovat nájezd"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsManageBikesOpen(true)}
                    className="btn-secondary"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                    <span>Spravovat kola ze Stravy</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsDisconnectConfirmOpen(true)}
                    className="btn-secondary btn-secondary-danger sm:ml-auto"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                    <span>Odpojit Stravu</span>
                  </button>
                </div>
              </div>
            )}
          </SettingsSection>

          {/* 2. Google Drive */}
          <SettingsSection
            id="nastaveni-disk"
            icon={Cloud}
            title="Synchronizace s Google Diskem"
            description="Data se průběžně ukládají do souboru aplikace na vašem Google Disku"
            actions={
              !isAuthenticated ? (
                <button
                  type="button"
                  onClick={login}
                  disabled={syncStatus === "saving"}
                  className="btn-secondary"
                >
                  <GoogleIcon className="w-4 h-4 shrink-0" />
                  <span>{syncStatus === "saving" ? "Připojuji…" : "Připojit Google Disk"}</span>
                </button>
              ) : (
                <>
                  {appState === "scopeInsufficient" ? (
                    <button
                      type="button"
                      onClick={reauthorizeGoogleDrive}
                      disabled={syncStatus === "saving"}
                      className="btn-primary"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "saving" ? "animate-spin" : ""}`} />
                      <span>Obnovit oprávnění Google</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={syncNow}
                      disabled={syncStatus === "saving"}
                      className="btn-secondary"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncStatus === "saving" ? "animate-spin" : ""}`} />
                      <span>Synchronizovat nyní</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void disconnectDrive()}
                    className="btn-secondary btn-secondary-danger"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Odpojit Google Disk</span>
                  </button>
                </>
              )
            }
          >
            {!isAuthenticated ? (
              <div className="panel panel-neutral space-y-2">
                <p className="font-semibold text-slate-900">Proč připojit Google Disk?</p>
                <ul className="list-disc pl-4 space-y-1">
                  <li><strong>Soukromé úložiště:</strong> data leží v souboru, ke kterému má přístup jen BikeVault.</li>
                  <li><strong>Průběžné ukládání:</strong> každá změna se na pozadí uloží na váš Disk.</li>
                  <li><strong>Více zařízení:</strong> po přihlášení na jiném zařízení se garáž načte z Disku.</li>
                </ul>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="panel panel-neutral flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {user?.photoLink ? (
                      <img
                        src={user.photoLink}
                        alt=""
                        className="w-10 h-10 rounded-full border border-slate-200 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-navy-100 text-navy-700 flex items-center justify-center font-bold text-sm shrink-0">
                        {user?.displayName ? user.displayName[0].toUpperCase() : "G"}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{user?.displayName || "Účet Google"}</p>
                      <p className="text-slate-500 truncate">{user?.emailAddress || "Připojeno ke Google Disku"}</p>
                    </div>
                  </div>

                  <div className="sm:text-right">
                    <SyncStatusLabel state={syncState} />
                    <p className="text-slate-500 mt-0.5 tabular-nums">
                      Poslední uložení:{" "}
                      {lastSyncedAt
                        ? lastSyncedAt.toLocaleString("cs-CZ", { day: "numeric", month: "numeric", hour: "2-digit", minute: "2-digit" })
                        : "při této relaci"}
                    </p>
                  </div>
                </div>

                {syncError && (
                  <div role="alert" className="panel panel-error flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-px" />
                    <span>{syncError}</span>
                  </div>
                )}
              </div>
            )}
          </SettingsSection>

          {/* 3. Backup file */}
          <SettingsSection
            id="nastaveni-zaloha"
            icon={Download}
            title="Záloha do souboru"
            description="Stáhněte si kopii všech dat do vlastního počítače nebo z ní data obnovte"
          >
            <div className="divide-y divide-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Stáhnout zálohu (JSON)</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kola, komponenty, servisní historie, finance i nastavení v jednom souboru.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={exportBackup}
                  className="btn-secondary shrink-0 self-start sm:self-center"
                >
                  <Download className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Stáhnout zálohu</span>
                </button>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Obnovit ze zálohy</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {canRestore
                      ? "Doplní záznamy ze souboru, které v aplikaci chybí. Nic nesmaže ani nepřepíše."
                      : "Obnova bude dostupná po načtení dat z Google Disku."}
                  </p>
                </div>
                <input
                  ref={restoreInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={handleRestoreFile}
                />
                <button
                  type="button"
                  onClick={() => restoreInputRef.current?.click()}
                  disabled={!canRestore}
                  className="btn-secondary shrink-0 self-start sm:self-center"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Vybrat soubor</span>
                </button>
              </div>
            </div>
          </SettingsSection>

          {/* 4. Units */}
          <SettingsSection
            id="nastaveni-jednotky"
            icon={Ruler}
            title="Jednotky a formáty"
            description="Pevně dané jednotky, ve kterých BikeVault ukládá a zobrazuje hodnoty"
          >
            <dl className="divide-y divide-slate-100 text-xs">
              {UNIT_ROWS.map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-semibold text-slate-900 text-right tabular-nums">{value}</dd>
                </div>
              ))}
            </dl>
          </SettingsSection>

          {/* 5. Data deletion */}
          <SettingsSection
            id="nastaveni-data"
            icon={Trash2}
            danger
            title="Mazání dat"
            description="Nevratné smazání garáže. Před smazáním si stáhněte zálohu."
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Smazat všechna data</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Smaže všechna kola, komponenty a související data. Kategorie a předvolby zůstanou zachovány.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClearAllOpen(true)}
                className="btn-danger shrink-0 self-start sm:self-center"
              >
                Smazat všechna data
              </button>
            </div>
          </SettingsSection>
        </div>

        <SettingsOutline contentRef={contentRef} />
      </div>

      <ClearAllDataModal
        isOpen={isClearAllOpen}
        onClose={() => setIsClearAllOpen(false)}
        onConfirm={clearAllData}
        bikesCount={data.bikes.length}
        componentsCount={data.components.length}
      />

      <RestoreConfirmationModal
        request={restoreRequest}
        onClose={() => setRestoreRequest(null)}
        onConfirm={handleRestoreConfirm}
        onDownloadCurrent={exportBackup}
      />

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
      <Modal
        isOpen={isDisconnectConfirmOpen}
        onClose={() => {
          if (!disconnecting) setIsDisconnectConfirmOpen(false);
        }}
        title="Odpojit účet Strava?"
        maxWidth="max-w-md"
      >
            <p className="text-sm text-slate-700 leading-relaxed">
              Opravdu si přejete odpojit propojení se Stravou? Všechna vaše kola, záznamy tachometru, historie i komponenty v BikeVaultu zůstanou beze změny zachovány. Pouze bude ukončena budoucí synchronizace nájezdu.
            </p>
            <ModalFooter>
              <button
                type="button"
                onClick={() => setIsDisconnectConfirmOpen(false)}
                disabled={disconnecting}
                className="btn-secondary"
              >
                Zrušit
              </button>
              <button
                onClick={handleConfirmDisconnect}
                disabled={disconnecting}
                className="btn-danger"
              >
                {disconnecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                <span>{disconnecting ? "Odpojuji..." : "Potvrdit odpojení"}</span>
              </button>
            </ModalFooter>
      </Modal>
    </div>
  );
}
