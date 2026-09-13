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
  Hash,
  Pencil,
  Scale
} from "lucide-react";
import { t, formatDateCs } from "@/lib/i18n";
import { QuickPressureModal } from "@/components/garage/QuickPressureModal";
import { UpdateOdometerModal } from "@/components/garage/UpdateOdometerModal";
import { BikeModal } from "@/components/garage/BikeModal";
import { resolveBikeImage, formatWeightCs } from "@/lib/domain/bikeImage";
import { Bike } from "@/types/vault";

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
    status: string;
  };
}

export function BikeHeader({ bike }: BikeHeaderProps) {
  const pathname = usePathname();
  const [isPressureModalOpen, setIsPressureModalOpen] = useState(false);
  const [isOdometerModalOpen, setIsOdometerModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const resolvedImage = resolveBikeImage(bike);
  const weightFormatted = formatWeightCs(bike.weightKg);

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
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-sm space-y-4 mb-6">
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
              onClick={() => setIsEditModalOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <Pencil className="w-3.5 h-3.5 text-slate-500" />
              <span>Upravit kolo</span>
            </button>

            <button
              onClick={() => setIsOdometerModalOpen(true)}
              className="px-3.5 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl shadow-sm shadow-sky-200 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{t("odometer.updateOdometer")}</span>
            </button>

            <button
              onClick={() => setIsPressureModalOpen(true)}
              className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200/80 shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Gauge className="w-3.5 h-3.5 text-slate-500" />
              <span>Tlaky</span>
            </button>
          </div>
        </div>

        {/* Bike Title, Image & Metadata */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Bike Photo Thumbnail / Placeholder */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/80 shadow-xs shrink-0 flex items-center justify-center">
            {resolvedImage && !imageFailed ? (
              <img
                src={resolvedImage}
                alt={bike.name}
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
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                {bike.name}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200/80 text-xs font-semibold">
                {bike.category} • {bike.discipline}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 text-xs font-medium">
                {bike.status === "ACTIVE" ? "Aktivní" : bike.status === "SOLD" ? "Prodáno" : "Archivováno"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>{bike.manufacturer} {bike.model} {bike.modelYear ? `(${bike.modelYear})` : ""}</span>
              </span>
              {bike.frameSize && (
                <span className="flex items-center gap-1">
                  <span className="text-slate-400 font-medium">Velikost:</span>
                  <span className="font-semibold text-slate-700">{bike.frameSize}</span>
                </span>
              )}
              {bike.serialNumber && (
                <span className="flex items-center gap-1 tabular-nums">
                  <Hash className="w-3.5 h-3.5 text-slate-400" />
                  <span>SN: {bike.serialNumber}</span>
                </span>
              )}
              {weightFormatted && (
                <span className="flex items-center gap-1 tabular-nums font-semibold text-slate-700">
                  <Scale className="w-3.5 h-3.5 text-slate-400" />
                  <span>{weightFormatted}</span>
                </span>
              )}
              <span className="flex items-center gap-1 tabular-nums">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>Nákup: {formatDateCs(bike.purchaseDate)}</span>
              </span>
            </div>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="pt-2">
          <div className="inline-flex p-1 bg-slate-200/60 rounded-xl overflow-x-auto max-w-full">
            {tabs.map((tab) => {
              const active = isTabActive(tab.href);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                    active
                      ? "bg-white text-sky-700 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </div>
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

      <BikeModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        bikeToEdit={bike as unknown as Bike}
      />
    </>
  );
}

export default BikeHeader;
