"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Bike as BikeIcon, 
  Wrench, 
  Coins, 
  ArrowUpRight, 
  Gauge, 
  Settings, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  ArrowLeft,
  ArrowRight,
  GripVertical
} from "lucide-react";
import { formatKm, formatMinutes, formatCzk, t } from "@/lib/i18n";
import { UpdateOdometerModal } from "./UpdateOdometerModal";
import { RecordServiceEventModal } from "@/components/maintenance/RecordServiceEventModal";
import { resolveBikeImage } from "@/lib/domain/bikeImage";
import { useVault } from "@/context/VaultContext";
import { bikeKindLabel, resolveLists } from "@/lib/bikeLists";

interface BikeCardProps {
  bike: {
    id: string;
    name: string;
    manufacturer: string;
    model: string;
    modelYear?: number | null;
    category: string;
    discipline: string;
    suspensionType: string;
    currentKm: string | number;
    currentMinutes: number;
    purchasePrice: string | number;
    weightKg?: number | null;
    imageUrl?: string | null;
    uploadedImage?: string | null;
    uploadedImageData?: string | null;
    status: string;
  };
  serviceSummary?: {
    urgency: "OVERDUE" | "DUE_SOON" | "OK";
    text: string;
  };
  netCost?: number;
  isReordering?: boolean;
  onMoveEarlier?: () => void;
  onMoveLater?: () => void;
  canMoveEarlier?: boolean;
  canMoveLater?: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
}

export function BikeCard({
  bike,
  serviceSummary,
  netCost,
  isReordering = false,
  onMoveEarlier,
  onMoveLater,
  canMoveEarlier = false,
  canMoveLater = false,
  dragHandleProps,
}: BikeCardProps) {
  const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const { data } = useVault();
  const lists = resolveLists(data.settings);
  const kindLabel = bikeKindLabel(lists, bike);

  const resolvedImage = resolveBikeImage(bike);

  const getServiceBadgeStyle = () => {
    if (!serviceSummary) {
      return {
        bg: "chip-neutral",
        dot: "text-slate-500",
        icon: CheckCircle2,
      };
    }
    switch (serviceSummary.urgency) {
      case "OVERDUE":
        return {
          bg: "chip-rose",
          dot: "text-rose-600",
          icon: AlertTriangle,
        };
      case "DUE_SOON":
        return {
          bg: "chip-amber",
          dot: "text-amber-600",
          icon: Clock,
        };
      case "OK":
      default:
        return {
          bg: "chip-emerald",
          dot: "text-emerald-600",
          icon: CheckCircle2,
        };
    }
  };

  const badgeStyle = getServiceBadgeStyle();
  const BadgeIcon = badgeStyle.icon;

  return (
    <>
      <div className="card overflow-hidden hover:border-slate-300 hover:shadow-md transition-all flex flex-col group">
        {/* Reorder Toolbar (when reorder mode is active) */}
        {isReordering && (
          <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between border-b border-slate-800">
            <button
              type="button"
              onClick={onMoveEarlier}
              disabled={!canMoveEarlier}
              title="Posunout dopředu"
              aria-label="Posunout kolo dopředu v pořadí"
              className="btn-shell btn-sm px-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>

            <div
              {...dragHandleProps}
              role="button"
              tabIndex={0}
              title="Přetažením myší změníte pořadí"
              aria-label="Přetažením myší změníte pořadí kola"
              className="flex items-center gap-1.5 text-xs text-slate-200 font-medium px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700/80 cursor-grab active:cursor-grabbing select-none"
            >
              <GripVertical className="w-4 h-4 text-slate-300" />
              <span>Přetáhnout</span>
            </div>

            <button
              type="button"
              onClick={onMoveLater}
              disabled={!canMoveLater}
              title="Posunout dozadu"
              aria-label="Posunout kolo dozadu v pořadí"
              className="btn-shell btn-sm px-2"
            >
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Photo or Header visual */}
        <div className="relative h-44 bg-slate-100 overflow-hidden border-b border-slate-100">
          {resolvedImage && !imageFailed ? (
            <img
              src={resolvedImage}
              alt={bike.name}
              loading="lazy"
              decoding="async"
              onError={() => setImageFailed(true)}
              className="w-full h-full object-contain object-center group-hover:scale-[1.02] transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <BikeIcon className="w-14 h-14 text-slate-300" />
            </div>
          )}

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            {kindLabel ? (<span className="chip bg-white/95 text-slate-700 shadow-sm">{kindLabel}</span>) : <span />}

            {bike.modelYear && (
              <span className="chip bg-white/95 text-slate-700 shadow-sm">
                {bike.modelYear}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          {/* Header titles */}
          <div>
            <Link href={`/bikes/${bike.id}`} className="block group/title">
              <h3 className="text-base font-bold text-slate-900 leading-snug group-hover/title:text-navy-600 transition-colors">
                {bike.name}
              </h3>
            </Link>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {bike.manufacturer} {bike.model}
            </p>
          </div>

          {/* Key Metrics: Mileage & Hours */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl">
            <div>
              <span className="section-label block">
                {t("bike.metrics.currentMileage")}
              </span>
              <span className="text-base font-bold text-slate-900 tabular-nums">
                {formatKm(bike.currentKm)}
              </span>
            </div>
            <div>
              <span className="section-label block">
                {t("bike.metrics.ridingHours")}
              </span>
              <span className="text-base font-bold text-slate-900 tabular-nums">
                {formatMinutes(bike.currentMinutes)}
              </span>
            </div>
          </div>

          {/* Service status & Net cost */}
          <div className="space-y-2 pt-0.5">
            {/* Service alert */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <Wrench className="w-3.5 h-3.5 text-slate-500" />
                <span>{t("garage.card.nextService")}:</span>
              </span>
              <button
                type="button"
                onClick={() => setIsServiceModalOpen(true)}
                title="Zapsat servis pro toto kolo"
                aria-label={`Zapsat servis: ${serviceSummary?.text || t("garage.card.noServiceDue")}`}
                className={`chip ${badgeStyle.bg} cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-navy-500/40`}
              >
                <BadgeIcon className={`w-3.5 h-3.5 ${badgeStyle.dot}`} />
                <span>{serviceSummary?.text || t("garage.card.noServiceDue")}</span>
              </button>
            </div>

            {/* Net Ownership Cost */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <Coins className="w-3.5 h-3.5 text-slate-500" />
                <span>{t("garage.card.netCost")}:</span>
              </span>
              <span className="font-bold text-slate-900 tabular-nums text-sm">
                {formatCzk(netCost ?? Number(bike.purchasePrice))}
              </span>
            </div>
          </div>

          {/* Quick Actions & Detail Link */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setIsOdometerModalOpen(true)}
                title="Zapsat stav tachometru"
                aria-label="Zapsat stav tachometru"
                className="btn-icon"
              >
                <Gauge className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => setIsServiceModalOpen(true)}
                title="Zapsat servis kola"
                aria-label="Zapsat servis kola"
                className="btn-icon"
              >
                <Wrench className="w-4 h-4" />
              </button>

              <Link
                href={`/bikes/${bike.id}/setup`}
                title="Nastavení kola"
                aria-label="Nastavení kola"
                className="btn-icon"
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>

            <Link
              href={`/bikes/${bike.id}`}
              title={t("garage.card.details")}
              className="btn-primary"
            >
              <span>{t("garage.card.details")}</span>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <UpdateOdometerModal
        isOpen={isOdometerModalOpen}
        onClose={() => setIsOdometerModalOpen(false)}
        bikeId={bike.id}
        bikeName={bike.name}
        currentKm={Number(bike.currentKm)}
        currentMinutes={bike.currentMinutes}
      />

      <RecordServiceEventModal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        fixedBikeId={bike.id}
      />

    </>
  );
}

export default BikeCard;
