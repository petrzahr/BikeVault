"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Bike as BikeIcon, 
  RefreshCw, 
  Link2, 
  Unlink, 
  Plus, 
  AlertTriangle, 
  Check, 
  ArrowRight,
  Loader2,
  Info
} from "lucide-react";
import { Modal } from "@/components/common/Modal";
import { useVault } from "@/context/VaultContext";
import { Bike } from "@/types/vault";
import { compareMileage } from "@/lib/domain/stravaSync";
import { formatKm } from "@/lib/i18n";
import { StravaBikeSummary } from "@/lib/strava/stravaApi";
import { getValidAccessToken } from "@/lib/google/googleAuth";
import { buttonClass, labelClass } from "@/lib/ui";

interface StravaManageBikesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportBike: (stravaBike: StravaBikeSummary) => void;
  userId?: string;
}

export function StravaManageBikesModal({
  isOpen,
  onClose,
  onImportBike,
  userId,
}: StravaManageBikesModalProps) {
  const { data, linkBikeToStrava, unlinkBikeFromStrava, syncBikeFromStrava } = useVault();

  const [stravaBikes, setStravaBikes] = useState<StravaBikeSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Link dialog state
  const [linkingStravaBike, setLinkingStravaBike] = useState<StravaBikeSummary | null>(null);
  const [selectedVaultBikeId, setSelectedVaultBikeId] = useState<string>("");
  const [syncMileageOnLink, setSyncMileageOnLink] = useState(true);

  // Unlink confirmation state
  const [unlinkingBike, setUnlinkingBike] = useState<{ bikeId: string; name: string } | null>(null);

  // Per-bike syncing state
  const [syncingGearId, setSyncingGearId] = useState<string | null>(null);

  const loadStravaBikes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const googleToken = getValidAccessToken();
      const res = await fetch("/api/strava/bikes", {
        headers: {
          ...(userId ? { "x-bikevault-user-id": userId } : {}),
          ...(googleToken ? { Authorization: `Bearer ${googleToken}` } : {}),
        },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Chyba při načítání kol (${res.status})`);
      }
      const json = await res.json();
      setStravaBikes(json.bikes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při komunikaci se Stravou.");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (isOpen) {
      loadStravaBikes();
      setSuccessMsg(null);
      setError(null);
    }
  }, [isOpen, loadStravaBikes]);

  if (!isOpen) return null;

  // Find linked BikeVault bike for a Strava bike
  const getLinkedVaultBike = (gearId: string): Bike | undefined => {
    return data.bikes.find((b) => b.stravaGearId === gearId);
  };

  // Available unlinked BikeVault bikes for linking
  const availableVaultBikes = data.bikes.filter((b) => !b.stravaGearId);

  // Handle explicit sync for a linked bike
  const handleSyncBike = async (stravaBike: StravaBikeSummary) => {
    const linkedVaultBike = getLinkedVaultBike(stravaBike.id);
    if (!linkedVaultBike) return;

    setSyncingGearId(stravaBike.id);
    setError(null);
    setSuccessMsg(null);

    try {
      // First fetch fresh mileage from Strava API
      const googleToken = getValidAccessToken();
      const res = await fetch("/api/strava/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(userId ? { "x-bikevault-user-id": userId } : {}),
          ...(googleToken ? { Authorization: `Bearer ${googleToken}` } : {}),
        },
        body: JSON.stringify({ gearId: stravaBike.id, userId }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Chyba při synchronizaci se Stravou.");
      }

      const syncResult = await res.json();
      const freshDistanceKm = syncResult.results?.[stravaBike.id]?.distanceKm ?? stravaBike.distanceKm;

      // Now apply BikeVault sync domain rules
      const domainResult = syncBikeFromStrava(linkedVaultBike.id, freshDistanceKm);

      if (domainResult.type === "EQUAL") {
        setSuccessMsg(`Kolo "${linkedVaultBike.name}": ${domainResult.message}`);
      } else if (domainResult.type === "LOWER") {
        setError(domainResult.message);
      } else {
        setSuccessMsg(domainResult.message);
        // Refresh local list distance
        setStravaBikes((prev) =>
          prev.map((b) => (b.id === stravaBike.id ? { ...b, distanceKm: freshDistanceKm } : b))
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chyba při synchronizaci.");
    } finally {
      setSyncingGearId(null);
    }
  };

  // Handle Confirm Link
  const handleConfirmLink = () => {
    if (!linkingStravaBike || !selectedVaultBikeId) return;

    const vaultBike = data.bikes.find((b) => b.id === selectedVaultBikeId);
    if (!vaultBike) return;

    const comparison = compareMileage(vaultBike.currentKm, linkingStravaBike.distanceKm);
    const shouldUpdateMileage = syncMileageOnLink && comparison.type === "HIGHER";

    const res = linkBikeToStrava(
      selectedVaultBikeId,
      linkingStravaBike.id,
      shouldUpdateMileage ? { stravaKm: linkingStravaBike.distanceKm } : undefined
    );

    if (!res.success) {
      setError(res.error || "Chyba při propojování kola.");
      return;
    }

    setSuccessMsg(
      `Kolo "${linkingStravaBike.name}" bylo úspěšně propojeno s "${vaultBike.name}".`
    );
    setLinkingStravaBike(null);
    setSelectedVaultBikeId("");
  };

  // Handle Confirm Unlink
  const handleConfirmUnlink = () => {
    if (!unlinkingBike) return;

    unlinkBikeFromStrava(unlinkingBike.bikeId);
    setSuccessMsg(`Kolo "${unlinkingBike.name}" bylo odpojeno od Stravy. Historie zůstala zachována.`);
    setUnlinkingBike(null);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Spravovat kola ze Stravy"
      subtitle="Propojte kola ze Stravy s existujícími koly v BikeVault nebo je importujte jako nová kola"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-5">
        {/* Messages */}
        {error && (
          <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-700 flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {successMsg && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs text-emerald-700 flex items-start gap-2.5">
            <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="flex-1">{successMsg}</div>
          </div>
        )}

        {/* Action Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">
            Nalezena kola na Stravě: {stravaBikes.length}
          </span>
          <button
            onClick={loadStravaBikes}
            disabled={loading}
            className={buttonClass("secondary", "sm")}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-navy-600" : "text-slate-500"}`} />
            <span>Obnovit ze Stravy</span>
          </button>
        </div>

        {/* Loading state */}
        {loading && stravaBikes.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-navy-600" />
            <p className="text-xs">Načítám kola z vašeho profilu Strava...</p>
          </div>
        ) : stravaBikes.length === 0 ? (
          <div className="py-10 text-center text-slate-500 bg-slate-50/60 rounded-xl border border-dashed border-slate-200 p-6">
            <BikeIcon className="w-8 h-8 mx-auto text-slate-400 mb-2" />
            <p className="text-xs font-semibold text-slate-700">Na vašem účtu Strava nebyla nalezena žádná kola.</p>
            <p className="text-[11px] text-slate-400 mt-1">Přidejte kolo do nastavení výbavy na Stravě a poté klikněte na Obnovit.</p>
          </div>
        ) : (
          /* Strava Bikes List */
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {stravaBikes.map((sb) => {
              const linkedBike = getLinkedVaultBike(sb.id);
              const isLinked = Boolean(linkedBike);
              const isSyncing = syncingGearId === sb.id;

              return (
                <div
                  key={sb.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isLinked
                      ? "bg-navy-50/30 border-navy-200/80"
                      : "bg-white border-slate-200/80 hover:border-slate-300 shadow-sm"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Left: Info */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-slate-900">{sb.name}</span>
                        {sb.isPrimary && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600 rounded-full border border-slate-200">
                            Výchozí na Stravě
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                        {(sb.brandName || sb.modelName) && (
                          <span>{[sb.brandName, sb.modelName].filter(Boolean).join(" / ")}</span>
                        )}
                        {(sb.brandName || sb.modelName) && <span>•</span>}
                        <span className="font-semibold text-slate-700 tabular-nums">
                          {formatKm(sb.distanceKm)}
                        </span>
                      </div>

                      {/* Linked Status */}
                      {isLinked && linkedBike ? (
                        <div className="pt-1 flex items-center gap-1.5 text-xs text-navy-800 font-medium">
                          <Link2 className="w-3.5 h-3.5 text-navy-600 shrink-0" />
                          <span>Propojeno s: </span>
                          <span className="font-bold text-slate-900">{linkedBike.name}</span>
                          <span className="text-slate-400 text-[11px] tabular-nums">
                            (aktuálně {formatKm(linkedBike.currentKm)})
                          </span>
                        </div>
                      ) : (
                        <div className="pt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="inline-block w-2 h-2 rounded-full bg-slate-300" />
                          <span>Nenapojeno na BikeVault</span>
                        </div>
                      )}
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 flex-wrap shrink-0">
                      {isLinked && linkedBike ? (
                        <>
                          <button
                            onClick={() => handleSyncBike(sb)}
                            disabled={isSyncing}
                            className={buttonClass("secondary", "sm")}
                          >
                            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin text-navy-600" : "text-slate-500"}`} />
                            <span>Synchronizovat</span>
                          </button>

                          <button
                            onClick={() => setUnlinkingBike({ bikeId: linkedBike.id, name: linkedBike.name })}
                            className={buttonClass("secondary", "sm", "hover:bg-rose-50 hover:text-rose-600")}
                            title="Odpojit od Stravy"
                          >
                            <Unlink className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Odpojit</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => {
                              setLinkingStravaBike(sb);
                              setSelectedVaultBikeId(availableVaultBikes[0]?.id || "");
                              setSyncMileageOnLink(true);
                              setError(null);
                            }}
                            className={buttonClass("secondary", "sm")}
                          >
                            <Link2 className="w-3.5 h-3.5 text-slate-500" />
                            <span>Propojit s existujícím</span>
                          </button>

                          <button
                            onClick={() => {
                              onImportBike(sb);
                              onClose();
                            }}
                            className={buttonClass("dark", "sm")}
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Importovat</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Modal: Link to Existing Bike */}
        {linkingStravaBike && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3 mt-4 animate-fade-in">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Propojit Strava kolo: {linkingStravaBike.name}
            </h4>

            {availableVaultBikes.length === 0 ? (
              <div className="p-3 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg text-xs space-y-2">
                <p>Všechna existující kola v BikeVault jsou již propojena s jinými koly ze Stravy.</p>
                <p>Můžete toto kolo importovat jako zcela nové kolo do BikeVaultu.</p>
                <button
                  onClick={() => {
                    setLinkingStravaBike(null);
                    onImportBike(linkingStravaBike);
                    onClose();
                  }}
                  className={buttonClass("warning", "md")}
                >
                  Importovat jako nové kolo
                </button>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div>
                  <label className={labelClass}>
                    Vyberte kolo z BikeVault:
                  </label>
                  <select
                    value={selectedVaultBikeId}
                    onChange={(e) => setSelectedVaultBikeId(e.target.value)}
                    className="w-full px-3 py-2 bg-white rounded-lg border border-slate-200/80 text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-navy-500"
                  >
                    {availableVaultBikes.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.manufacturer} {b.model}) — {formatKm(b.currentKm)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Comparison preview */}
                {selectedVaultBikeId && (() => {
                  const targetBike = data.bikes.find((b) => b.id === selectedVaultBikeId);
                  if (!targetBike) return null;
                  const comparison = compareMileage(targetBike.currentKm, linkingStravaBike.distanceKm);

                  return (
                    <div className="p-3 rounded-lg bg-white border border-slate-200/80 space-y-2">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">BikeVault ({targetBike.name}):</span>
                        <span className="font-bold text-slate-800 tabular-nums">{formatKm(targetBike.currentKm)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500">Strava ({linkingStravaBike.name}):</span>
                        <span className="font-bold text-slate-800 tabular-nums">{formatKm(linkingStravaBike.distanceKm)}</span>
                      </div>

                      {comparison.type === "HIGHER" && (
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                          <span className="text-emerald-700 font-semibold text-xs">
                            Rozdíl: +{formatKm(comparison.deltaKm)}
                          </span>
                          <label className="flex items-center gap-1.5 cursor-pointer text-slate-700 font-medium text-xs">
                            <input
                              type="checkbox"
                              checked={syncMileageOnLink}
                              onChange={(e) => setSyncMileageOnLink(e.target.checked)}
                              className="rounded text-navy-600 focus:ring-navy-500"
                            />
                            <span>Aktualizovat na {formatKm(linkingStravaBike.distanceKm)}</span>
                          </label>
                        </div>
                      )}

                      {comparison.type === "LOWER" && (
                        <div className="pt-2 border-t border-slate-100 text-[11px] text-amber-700 flex items-start gap-1.5">
                          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                          <span>Strava uvádí nižší nájezd. Nájezd v BikeVault zůstane zachován.</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setLinkingStravaBike(null)}
                    className={buttonClass("ghost", "sm")}
                  >
                    Zrušit
                  </button>
                  <button
                    onClick={handleConfirmLink}
                    className={buttonClass("primary", "md")}
                  >
                    Potvrdit propojení
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Modal: Unlink Confirmation */}
        {unlinkingBike && (
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3 mt-4 animate-fade-in">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Odpojit kolo od Stravy?
            </h4>
            <p className="text-xs text-slate-600">
              Opravdu chcete odpojit kolo <strong className="text-slate-900">{unlinkingBike.name}</strong> od Stravy?
              Všechna data v BikeVault, včetně dosavadních záznamů tachometru a komponentů, zůstanou beze změny zachována.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setUnlinkingBike(null)}
                className={buttonClass("ghost", "sm")}
              >
                Zrušit
              </button>
              <button
                onClick={handleConfirmUnlink}
                className={buttonClass("danger", "sm")}
              >
                Potvrdit odpojení
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
