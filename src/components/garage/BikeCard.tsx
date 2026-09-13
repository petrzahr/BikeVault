"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Bike as BikeIcon, 
  Wrench, 
  Coins, 
  ArrowUpRight, 
  SlidersHorizontal, 
  Gauge, 
  AlertTriangle, 
  CheckCircle2, 
  Clock 
} from "lucide-react";
import { formatKm, formatMinutes, formatCzk, t } from "@/lib/i18n";
import { UpdateOdometerModal } from "./UpdateOdometerModal";
import { QuickPressureModal } from "./QuickPressureModal";

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
    imageUrl?: string | null;
    status: string;
  };
  serviceSummary?: {
    urgency: "OVERDUE" | "DUE_SOON" | "OK";
    text: string;
  };
  netCost?: number;
}

export function BikeCard({ bike, serviceSummary, netCost }: BikeCardProps) {
  const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);
  const [isPressureModalOpen, setIsPressureModalOpen] = useState(false);

  const getServiceBadgeStyle = () => {
    if (!serviceSummary) {
      return {
        bg: "bg-slate-100 text-slate-600 border-slate-200",
        icon: CheckCircle2,
      };
    }
    switch (serviceSummary.urgency) {
      case "OVERDUE":
        return {
          bg: "bg-rose-50 text-rose-700 border-rose-200",
          icon: AlertTriangle,
        };
      case "DUE_SOON":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          icon: Clock,
        };
      case "OK":
      default:
        return {
          bg: "bg-emerald-50 text-emerald-700 border-emerald-200",
          icon: CheckCircle2,
        };
    }
  };

  const badgeStyle = getServiceBadgeStyle();
  const BadgeIcon = badgeStyle.icon;

  return (
    <>
      <div className="bg-white border border-slate-200/80 hover:border-slate-300 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col group">
        {/* Photo or Header visual */}
        <div className="relative h-44 bg-slate-100 overflow-hidden border-b border-slate-100">
          {bike.imageUrl ? (
            <img
              src={bike.imageUrl}
              alt={bike.name}
              className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-slate-50">
              <BikeIcon className="w-14 h-14 text-slate-300" />
            </div>
          )}

          {/* Top badges */}
          <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none">
            <span className="px-2.5 py-1 bg-white/95 backdrop-blur-xs rounded-xl text-[11px] font-semibold tracking-wide text-slate-700 border border-slate-200/80 shadow-xs">
              {bike.category} • {bike.discipline}
            </span>

            {bike.modelYear && (
              <span className="px-2.5 py-1 bg-white/95 backdrop-blur-xs rounded-xl text-[11px] tabular-nums font-semibold text-slate-700 border border-slate-200/80 shadow-xs">
                {bike.modelYear}
              </span>
            )}
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          {/* Header titles */}
          <div>
            <h3 className="text-lg font-bold text-slate-900 tracking-tight leading-snug group-hover:text-sky-600 transition-colors">
              {bike.name}
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              {bike.manufacturer} {bike.model}
            </p>
          </div>

          {/* Key Metrics: Mileage & Hours */}
          <div className="grid grid-cols-2 gap-3 bg-slate-50/80 p-3 rounded-xl border border-slate-200/60">
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
                {t("bike.metrics.currentMileage")}
              </span>
              <span className="text-base font-bold text-slate-900 tabular-nums">
                {formatKm(bike.currentKm)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-semibold text-slate-400 block uppercase tracking-wider">
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
                <Wrench className="w-3.5 h-3.5 text-slate-400" />
                <span>{t("garage.card.nextService")}:</span>
              </span>
              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 ${badgeStyle.bg}`}>
                <BadgeIcon className="w-3 h-3" />
                <span>{serviceSummary?.text || t("garage.card.noServiceDue")}</span>
              </span>
            </div>

            {/* Net Ownership Cost */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1.5 font-medium">
                <Coins className="w-3.5 h-3.5 text-slate-400" />
                <span>{t("garage.card.netCost")}:</span>
              </span>
              <span className="font-bold text-slate-900 tabular-nums text-sm">
                {formatCzk(netCost ?? Number(bike.purchasePrice))}
              </span>
            </div>
          </div>

          {/* Quick Actions & Detail Link */}
          <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
            <button
              onClick={() => setIsOdometerModalOpen(true)}
              title={t("garage.card.quickUpdate")}
              className="flex-1 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold rounded-xl border border-slate-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-slate-500" />
              <span>{t("garage.card.quickUpdate")}</span>
            </button>

            <button
              onClick={() => setIsPressureModalOpen(true)}
              title="Upravit tlak"
              className="p-2 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-xl border border-slate-200 transition-colors flex items-center justify-center cursor-pointer"
            >
              <Gauge className="w-4 h-4" />
            </button>

            <Link
              href={`/bikes/${bike.id}`}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl shadow-sm shadow-sky-200 transition-colors flex items-center justify-center gap-1 text-xs font-semibold"
            >
              <span>{t("garage.card.details")}</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
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

      <QuickPressureModal
        isOpen={isPressureModalOpen}
        onClose={() => setIsPressureModalOpen(false)}
        bikeId={bike.id}
        bikeName={bike.name}
      />
    </>
  );
}

export default BikeCard;
