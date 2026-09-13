"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Bike as BikeIcon, 
  SlidersHorizontal, 
  Gauge, 
  ArrowLeft,
  Calendar,
  Tag,
  Hash
} from "lucide-react";
import { t, formatDateCs } from "@/lib/i18n";
import { QuickPressureModal } from "@/components/garage/QuickPressureModal";
import { UpdateOdometerModal } from "@/components/garage/UpdateOdometerModal";

interface BikeHeaderProps {
  bike: {
    id: string;
    name: string;
    manufacturer: string;
    model: string;
    modelYear?: number | null;
    category: string;
    discipline: string;
    suspensionType: string;
    serialNumber?: string | null;
    purchaseDate: string;
    currentKm: string | number;
    currentMinutes: number;
    status: string;
  };
}

export function BikeHeader({ bike }: BikeHeaderProps) {
  const pathname = usePathname();
  const [isPressureModalOpen, setIsPressureModalOpen] = useState(false);
  const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);

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
      <div className="space-y-4 border-b border-slate-200 pb-4 mb-6">
        {/* Top Back Link & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <Link
            href="/garage"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 transition-colors font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Zpět do Garáže</span>
          </Link>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsOdometerModalOpen(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-1.5 active:scale-95"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t("odometer.updateOdometer")}</span>
            </button>

            <button
              onClick={() => setIsPressureModalOpen(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition-all flex items-center gap-1.5"
            >
              <Gauge className="w-3.5 h-3.5 text-slate-500" />
              <span>Tlaky</span>
            </button>
          </div>
        </div>

        {/* Bike Title & Metadata */}
        <div>
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {bike.name}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold">
              {bike.category} • {bike.discipline}
            </span>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 text-xs font-medium">
              {bike.status === "ACTIVE" ? "Aktivní" : bike.status === "SOLD" ? "Prodáno" : "Archivováno"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>{bike.manufacturer} {bike.model} {bike.modelYear ? `(${bike.modelYear})` : ""}</span>
            </span>
            {bike.serialNumber && (
              <span className="flex items-center gap-1 font-mono">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                <span>SN: {bike.serialNumber}</span>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Nákup: {formatDateCs(bike.purchaseDate)}</span>
            </span>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pt-2 scrollbar-none">
          {tabs.map((tab) => {
            const active = isTabActive(tab.href);
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  active
                    ? "bg-white text-blue-700 border border-slate-200 shadow-sm"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <QuickPressureModal
        isOpen={isPressureModalOpen}
        onClose={() => setIsPressureModalOpen(false)}
        bikeId={bike.id}
        bikeName={bike.name}
      />

      <UpdateOdometerModal
        isOpen={isOdometerModalOpen}
        onClose={() => setIsOdometerModalOpen(false)}
        bikeId={bike.id}
        bikeName={bike.name}
        currentKm={Number(bike.currentKm)}
        currentMinutes={bike.currentMinutes}
      />
    </>
  );
}
