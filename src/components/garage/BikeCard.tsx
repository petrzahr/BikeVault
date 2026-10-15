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

const iconButtonClass =
  "p-2 min-w-[44px] min-h-[44px] bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 transition-colors flex items-center justify-center cursor-pointer";

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
        bg: "bg-slate-100 text-slate-700 border-slate-200/80",
        dot: "text-slate-500",
        icon: CheckCircle2,
      };
    }
    switch (serviceSummary.urgency) {
      case "OVERDUE":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200/80",
          dot: "text-rose-600",
          icon: AlertTriangle,
        };
      case "DUE_SOON":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200/80",
          dot: "text-amber-600",
          icon: Clock,
        };
      case "OK":
      default:
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200/80",
          dot: "text-emerald-600",
          icon: CheckCircle2,
        };
    }
  };

  const badgeStyle = getServiceBadgeStyle();
  const BadgeIcon = badgeStyle.icon;

  return (
    <>
      <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
        {/* Reorder Toolbar (when reorder mode is active) */}
        {isReordering && (
          <div className="bg-slate-900 text-white px-3 py-2 flex items-center justify-between border-b border-slate-800">
            <button
              type="button"
              onClick={onMoveEarlier}
              disabled={!canMoveEarlier}
              title="Posunout dopředu"
              aria-label="Posunout kolo dopředu v pořadí"
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center min-w-[36px] min-h-[36px] transition-colors cursor-pointer"
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
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-white flex items-center justify-center min-w-[36px] min-h-[36px] transition-colors cursor-pointer"
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
            {kindLabel ? (<span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-xl text-[11px] font-semibold tracking-wide text-slate-700 border border-slate-200/80 shadow-sm">{kindLabel}</span>) : <span />}

            {bike.modelYear && (
              <span className="px-2.5 py-1 bg-white/95 backdrop-blur-sm rounded-xl text-[11px] tabular-nums font-semibold text-slate-700 border border-slate-200/80 shadow-sm">
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
              <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug group-hover/title:text-navy-600 transition-colors">
                {bike.name}
              </h3>
            </Link>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {bike.manufacturer} {bike.model}
            </p>
          </div>

          {/* Key Metrics: Mileage & Hours */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">
                {t("bike.metrics.currentMileage")}
              </span>
              <span className="text-base font-bold text-slate-900 tabular-nums">
                {formatKm(bike.currentKm)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-500 block uppercase tracking-wider">
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
                className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer hover:opacity-90 hover:shadow-xs active:scale-95 transition-all ${badgeStyle.bg}`}
              >
                <BadgeIcon className={`w-3 h-3 ${badgeStyle.dot}`} />
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
                className={iconButtonClass}
              >
                <Gauge className="w-4 h-4 text-slate-700" />
              </button>

              <button
                type="button"
                onClick={() => setIsServiceModalOpen(true)}
                title="Zapsat servis kola"
                aria-label="Zapsat servis kola"
                className={iconButtonClass}
              >
                <Wrench className="w-4 h-4 text-slate-700" />
              </button>

              <Link
                href={`/bikes/${bike.id}/setup`}
                title="Nastavení kola"
                aria-label="Nastavení kola"
                className={iconButtonClass}
              >
                <Settings className="w-4 h-4" />
              </Link>
            </div>

            <Link
              href={`/bikes/${bike.id}`}
              title={t("garage.card.details")}
              className="px-3.5 py-2 min-h-[44px] bg-navy-600 hover:bg-navy-700 text-white text-xs font-semibold rounded-xl border border-navy-600 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
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
