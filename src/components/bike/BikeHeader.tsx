"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Bike as BikeIcon, 
  SlidersHorizontal, 
  ArrowLeft,
  Calendar,
  Tag,
  Hash,
  Pencil,
  Scale,
  Link2,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Trash2,
  X
} from "lucide-react";
import { t, formatDateCs } from "@/lib/i18n";
import { useVault } from "@/context/VaultContext";
import { UpdateOdometerModal } from "@/components/garage/UpdateOdometerModal";
import { BikeModal } from "@/components/garage/BikeModal";
import { DeleteBikeModal } from "@/components/garage/DeleteBikeModal";
import { getValidAccessToken } from "@/lib/google/googleAuth";
import { resolveBikeImage, formatWeightCs } from "@/lib/domain/bikeImage";
import { Bike } from "@/types/vault";

import { bikeKindLabel, resolveLists } from "@/lib/bikeLists";

interface BikeHeaderProps {
  bike: {
    id: string;
    name: string;
    manufacturer: string;
    model: string;
    modelYear?: number | null;
    frameSize?: string | null;
    category: string;
    discipline: string;
    suspensionType: string;
    driveType?: string;
    serialNumber?: string | null;
    purchaseDate: string;
    purchasePrice?: number;
    currentKm: string | number;
    currentMinutes: number;
    weightKg?: number | null;
    imageUrl?: string | null;
    uploadedImage?: string | null;
    uploadedImageData?: string | null;
    notes?: string | null;
    stravaGearId?: string | null;
    status: string;
  };
}

export function BikeHeader({ bike }: BikeHeaderProps) {
  const { data, syncBikeFromStrava, user } = useVault();
  const lists = resolveLists(data.settings);
  const currentUserId = user?.emailAddress || "default_user";
  const pathname = usePathname();
  const router = useRouter();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [isSyncingStrava, setIsSyncingStrava] = useState(false);
  const [stravaSyncNotice, setStravaSyncNotice] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);

  const resolvedImage = resolveBikeImage(bike);
  const weightFormatted = formatWeightCs(bike.weightKg);

  const handleSyncWithStrava = async () => {
    if (!bike.stravaGearId) return;
    setIsSyncingStrava(true);
    setStravaSyncNotice(null);

    try {
      const googleToken = getValidAccessToken();
      const res = await fetch("/api/strava/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-bikevault-user-id": currentUserId,
          ...(googleToken ? { Authorization: `Bearer ${googleToken}` } : {}),
        },
        body: JSON.stringify({ gearId: bike.stravaGearId, userId: currentUserId }),
      });

      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Chyba při komunikaci se Stravou.");
      }

      const syncData = await res.json();
      const gearResult = syncData.results?.[bike.stravaGearId];
      if (!gearResult) {
        throw new Error("Nepodařilo se získat data pro toto kolo ze Stravy.");
      }

      if (gearResult.error) {
        throw new Error(gearResult.error);
      }

      const domainResult = syncBikeFromStrava(bike.id, gearResult.distanceKm, gearResult.movingMinutes);
      const timeNote = gearResult.movingTimeError ? ` ${gearResult.movingTimeError}` : "";
      if (domainResult.type === "LOWER" || timeNote) {
        setStravaSyncNotice({ type: "warning", text: domainResult.message + timeNote });
      } else {
        setStravaSyncNotice({ type: "success", text: domainResult.message });
      }
    } catch (err) {
      setStravaSyncNotice({
        type: "error",
        text: err instanceof Error ? err.message : "Chyba při synchronizaci se Stravou.",
      });
    } finally {
      setIsSyncingStrava(false);
    }
  };

  const tabs = [
    { href: `/bikes/${bike.id}`, label: t("bikeNav.overview") },
    { href: `/bikes/${bike.id}/components`, label: t("bikeNav.components") },
    { href: `/bikes/${bike.id}/setup`, label: t("bikeNav.setup") },
    { href: `/bikes/${bike.id}/service`, label: t("bikeNav.service") },
    { href: `/bikes/${bike.id}/finances`, label: t("bikeNav.finances") },
    { href: `/bikes/${bike.id}/history`, label: t("bikeNav.history") },
  ];

  const isTabActive = (href: string) => {
    if (href === `/bikes/${bike.id}`) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <>
      <div className="card p-4 sm:p-5 space-y-4 mb-6">
        {/* Top Back Link & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/garage"
            className="btn-text text-slate-600 hover:text-slate-900 self-start"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Zpět do Garáže</span>
          </Link>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {bike.stravaGearId && (
              <button
                onClick={handleSyncWithStrava}
                disabled={isSyncingStrava}
                className="btn-secondary"
                title="Synchronizovat nájezd se Stravou"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncingStrava ? "animate-spin" : ""}`} />
                <span>Synchronizovat</span>
              </button>
            )}

            <button
              onClick={() => setIsEditModalOpen(true)}
              className="btn-secondary"
            >
              <Pencil className="w-3.5 h-3.5" />
              <span>Upravit kolo</span>
            </button>

            <button
              onClick={() => setIsOdometerModalOpen(true)}
              className="btn-secondary"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t("odometer.updateOdometer")}</span>
            </button>


            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="btn-secondary btn-secondary-danger"
              title="Smazat kolo"
              aria-label="Smazat kolo"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Smazat</span>
            </button>
          </div>
        </div>

        {/* Strava Notification Banner if any */}
        {stravaSyncNotice && (
          <div
            className={`panel flex items-start gap-2.5 animate-fade-in ${
              stravaSyncNotice.type === "success"
                ? "panel-success"
                : stravaSyncNotice.type === "warning"
                ? "panel-warning"
                : "panel-error"
            }`}
          >
            {stravaSyncNotice.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1">{stravaSyncNotice.text}</div>
            <button
              type="button"
              onClick={() => setStravaSyncNotice(null)}
              aria-label="Zavřít upozornění"
              className="btn-icon -my-1.5 -mr-1.5 text-current opacity-70 hover:opacity-100 hover:bg-black/5 hover:text-current"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Bike Title, Image & Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Bike Photo Thumbnail / Placeholder */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 shrink-0 flex items-center justify-center">
            {resolvedImage && !imageFailed ? (
              <img
                src={resolvedImage}
                alt={bike.name}
                loading="lazy"
                decoding="async"
                onError={() => setImageFailed(true)}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-50 text-slate-300">
                <BikeIcon className="w-8 h-8 text-slate-300" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h1 className="text-xl font-bold text-slate-900">
                {bike.name}
              </h1>
              {bike.stravaGearId && (
                <span className="chip chip-navy">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>Strava propojeno</span>
                </span>
              )}
              {bikeKindLabel(lists, bike) && (<span className="chip chip-neutral">{bikeKindLabel(lists, bike)}</span>)}
              <span className={`chip ${bike.status === "ACTIVE" ? "chip-emerald" : "chip-neutral"}`}>
                {bike.status === "ACTIVE" ? "Aktivní" : bike.status === "SOLD" ? "Prodáno" : "Archivováno"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>{bike.manufacturer} {bike.model} {bike.modelYear ? `(${bike.modelYear})` : ""}</span>
              </span>
              {bike.frameSize && (
                <span className="flex items-center gap-1">
                  <span className="text-slate-500 font-medium">Velikost:</span>
                  <span className="font-semibold text-slate-700">{bike.frameSize}</span>
                </span>
              )}
              {bike.serialNumber && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Hash className="w-3.5 h-3.5 text-slate-500" />
                  <span>SN: {bike.serialNumber}</span>
                </span>
              )}
              {weightFormatted && (
                <span className="flex items-center gap-1 tabular-nums font-semibold text-slate-700">
                  <Scale className="w-3.5 h-3.5 text-slate-500" />
                  <span>{weightFormatted}</span>
                </span>
              )}
              <span className="flex items-center gap-1 tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                <span>Nákup: {formatDateCs(bike.purchaseDate)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <nav aria-label="Sekce kola">
          <div className="segmented flex overflow-x-auto max-w-full sm:max-w-2xl">
            {tabs.map((tab) => {
              const active = isTabActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className="segment flex-1"
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
        </nav>
      </div>


      <UpdateOdometerModal
        isOpen={isOdometerModalOpen}
        onClose={() => setIsOdometerModalOpen(false)}
        bikeId={bike.id}
        bikeName={bike.name}
        currentKm={Number(bike.currentKm)}
        currentMinutes={bike.currentMinutes}
      />

      <BikeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        bikeToEdit={bike as unknown as Bike}
      />

      <DeleteBikeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        bikeId={bike.id}
        bikeName={bike.name}
        onDeleted={() => router.push("/garage")}
      />
    </>
  );
}

export default BikeHeader;
