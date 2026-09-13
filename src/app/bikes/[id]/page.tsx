import React from "react";
import { notFound } from "next/navigation";
import { getBikeById, getBikeOdometerEntries } from "@/app/actions/bikes";
import { getBikeSetup } from "@/app/actions/setup";
import { getBikeInstalledComponents } from "@/app/actions/components";
import { getBikeServiceSchedules } from "@/app/actions/maintenance";
import { BikeHeader } from "@/components/bike/BikeHeader";
import { db, schema } from "@/db";
import { eq } from "drizzle-orm";
import { calculateTco } from "@/lib/domain/finance";
import { evaluateServiceSchedule } from "@/lib/domain/maintenance";
import { formatClicksFromClosed } from "@/lib/domain/setup";
import { 
  formatKm, 
  formatMinutes, 
  formatCzk, 
  formatBar, 
  formatPsi, 
  formatDateCs, 
  t 
} from "@/lib/i18n";
import { 
  SlidersHorizontal, 
  Gauge, 
  Coins, 
  Wrench, 
  Calendar, 
  Layers, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  ChevronRight 
} from "lucide-react";
import Link from "next/link";

interface BikeOverviewPageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function BikeOverviewPage({ params }: BikeOverviewPageProps) {
  const { id } = await params;
  const bike = await getBikeById(id);
  if (!bike) notFound();

  // Load transactions for this bike
  const txs = await db
    .select()
    .from(schema.financialTransactions)
    .where(eq(schema.financialTransactions.bikeId, id));

  // Compute TCO
  const tco = calculateTco({
    transactions: txs.map((t) => ({ type: t.type as any, amount: Number(t.amount) })),
    currentKm: Number(bike.currentKm),
    currentMinutes: bike.currentMinutes,
    purchaseDate: bike.purchaseDate,
    soldDate: bike.soldDate,
  });

  // Load setup, installed components, schedules, and odometer entries
  const setup = await getBikeSetup(id);
  const installedComponents = await getBikeInstalledComponents(id);
  const schedules = await getBikeServiceSchedules(id);
  const odometerEntries = await getBikeOdometerEntries(id);

  // Evaluate maintenance
  const evaluatedSchedules = schedules.map((s) => {
    return {
      schedule: s,
      status: evaluateServiceSchedule(
        {
          intervalKm: s.intervalKm ? Number(s.intervalKm) : null,
          intervalHours: s.intervalHours ? Number(s.intervalHours) : null,
          intervalMonths: s.intervalMonths,
          lastServiceDate: s.lastServiceDate,
          lastServiceBikeKm: s.lastServiceBikeKm ? Number(s.lastServiceBikeKm) : null,
          lastServiceBikeHours: s.lastServiceBikeHours ? Number(s.lastServiceBikeHours) : null,
        },
        Number(bike.currentKm),
        bike.currentMinutes
      ),
    };
  });

  const overdueSchedules = evaluatedSchedules.filter((s) => s.status.urgency === "OVERDUE");
  const dueSoonSchedules = evaluatedSchedules.filter((s) => s.status.urgency === "DUE_SOON");

  // Installed components lookup
  const forkComp = installedComponents.find((c) => c.installation.slot === "FORK")?.component;
  const shockComp = installedComponents.find((c) => c.installation.slot === "REAR_SHOCK")?.component;
  const frontTireComp = installedComponents.find((c) => c.installation.slot === "FRONT_TIRE")?.component;
  const rearTireComp = installedComponents.find((c) => c.installation.slot === "REAR_TIRE")?.component;

  return (
    <div className="space-y-8 animate-fade-in">
      <BikeHeader bike={bike} />

      {/* Service Alerts (if any overdue or due soon) */}
      {(overdueSchedules.length > 0 || dueSoonSchedules.length > 0) && (
        <div className="space-y-3">
          {overdueSchedules.map((item) => (
            <div
              key={item.schedule.id}
              className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center justify-between gap-3 text-red-800"
            >
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-red-900">
                    Servis po termínu: {item.schedule.name}
                  </h4>
                  <p className="text-xs text-red-700">
                    {item.status.summaryTextCs}
                  </p>
                </div>
              </div>
              <Link
                href={`/bikes/${bike.id}/service`}
                className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-800 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-2xs"
              >
                Zapsat servis
              </Link>
            </div>
          ))}

          {dueSoonSchedules.map((item) => (
            <div
              key={item.schedule.id}
              className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 text-amber-900"
            >
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-amber-600 shrink-0" />
                <div>
                  <h4 className="font-bold text-sm text-amber-900">
                    Blíží se termín servisu: {item.schedule.name}
                  </h4>
                  <p className="text-xs text-amber-800">
                    Zbývá {item.status.summaryTextCs}
                  </p>
                </div>
              </div>
              <Link
                href={`/bikes/${bike.id}/service`}
                className="px-3 py-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shadow-2xs"
              >
                Detail
              </Link>
            </div>
          ))}
        </div>
      )}

      {/* METRICS & TCO GRID */}
      <div>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
          Přehled provozu a nákladů (TCO)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {/* Nájezd */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.currentMileage")}
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {formatKm(bike.currentKm)}
            </span>
          </div>

          {/* Hodiny */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.ridingHours")}
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {formatMinutes(bike.currentMinutes)}
            </span>
          </div>

          {/* Doba vlastnictví */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.ownershipDuration")}
            </span>
            <span className="text-xl font-bold text-slate-900 font-mono">
              {tco.ownershipMonths} {tco.ownershipMonths === 1 ? "měsíc" : tco.ownershipMonths >= 2 && tco.ownershipMonths <= 4 ? "měsíce" : "měsíců"}
            </span>
          </div>

          {/* Čisté náklady */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm col-span-2 sm:col-span-1">
            <span className="text-xs text-blue-600 font-semibold block mb-1">
              {t("bike.metrics.netCost")}
            </span>
            <span className="text-xl font-bold text-blue-700 font-mono">
              {formatCzk(tco.netOwnershipCost)}
            </span>
          </div>

          {/* Cena za km */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.costPerKm")}
            </span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {tco.costPerKm !== null ? `${tco.costPerKm.toFixed(2)} Kč/km` : "-"}
            </span>
          </div>

          {/* Cena za hodinu */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.costPerHour")}
            </span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {tco.costPerHour !== null ? `${formatCzk(tco.costPerHour)}/h` : "-"}
            </span>
          </div>

          {/* Cena za měsíc */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.costPerMonth")}
            </span>
            <span className="text-xl font-bold text-slate-800 font-mono">
              {formatCzk(tco.costPerMonth)}/měsíc
            </span>
          </div>

          {/* Kupní cena */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.purchasePrice")}
            </span>
            <span className="text-lg font-bold text-slate-700 font-mono">
              {formatCzk(bike.purchasePrice)}
            </span>
          </div>

          {/* Celkové výdaje */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.totalExpenses")}
            </span>
            <span className="text-lg font-bold text-slate-700 font-mono">
              {formatCzk(tco.totalExpenses)}
            </span>
          </div>

          {/* Celkové příjmy */}
          <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
            <span className="text-xs text-slate-500 block mb-1 font-medium">
              {t("bike.metrics.totalIncomes")}
            </span>
            <span className="text-lg font-bold text-emerald-600 font-mono">
              {formatCzk(tco.totalIncomes)}
            </span>
          </div>
        </div>
      </div>

      {/* COMPACT BIKE SETUP SUMMARY & RECENT LOGS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Compact Setup Summary Card */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Gauge className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  {t("setup.title")}
                </h3>
              </div>
              <Link
                href={`/bikes/${bike.id}/setup`}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
              >
                <span>{t("setup.edit")}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Vidlice */}
              {bike.suspensionType !== "RIGID" && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Vidlice
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900">
                      {setup?.forkPressurePsi ? formatPsi(setup.forkPressurePsi) : "- psi"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    {forkComp ? `${forkComp.manufacturer} ${forkComp.model}` : "Neosazeno"}
                  </p>
                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
                    <div>Odskok: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup?.forkReboundClicks)}</span></div>
                    {setup?.forkLscClicks !== null && setup?.forkLscClicks !== undefined && (
                      <div>LSC: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.forkLscClicks)}</span></div>
                    )}
                    {setup?.forkHscClicks !== null && setup?.forkHscClicks !== undefined && (
                      <div>HSC: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup.forkHscClicks)}</span></div>
                    )}
                  </div>
                </div>
              )}

              {/* Tlumič */}
              {bike.suspensionType === "FULL_SUSPENSION" && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                      Tlumič
                    </span>
                    <span className="text-base font-mono font-bold text-slate-900">
                      {setup?.shockPressurePsi ? formatPsi(setup.shockPressurePsi) : "- psi"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium truncate">
                    {shockComp ? `${shockComp.manufacturer} ${shockComp.model}` : "Neosazeno"}
                  </p>
                  <div className="text-[11px] text-slate-500 space-y-0.5 pt-1 border-t border-slate-200">
                    <div>SAG: <span className="text-slate-800 font-medium font-mono">{setup?.shockSagPercent ?? "-"} %</span></div>
                    <div>Odskok: <span className="text-slate-800 font-medium">{formatClicksFromClosed(setup?.shockReboundClicks)}</span></div>
                  </div>
                </div>
              )}

              {/* Přední plášť */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Přední plášť
                  </span>
                  <span className="text-base font-mono font-bold text-slate-900">
                    {formatBar(setup?.frontTirePressureBar)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium truncate">
                  {frontTireComp ? `${frontTireComp.manufacturer} ${frontTireComp.model}` : "Neosazeno"}
                </p>
                {setup?.frontTireNotes && (
                  <p className="text-[11px] text-slate-500 italic">
                    "{setup.frontTireNotes}"
                  </p>
                )}
              </div>

              {/* Zadní plášť */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    Zadní plášť
                  </span>
                  <span className="text-base font-mono font-bold text-slate-900">
                    {formatBar(setup?.rearTirePressureBar)}
                  </span>
                </div>
                <p className="text-xs text-slate-600 font-medium truncate">
                  {rearTireComp ? `${rearTireComp.manufacturer} ${rearTireComp.model}` : "Neosazeno"}
                </p>
                {setup?.rearTireNotes && (
                  <p className="text-[11px] text-slate-500 italic">
                    "{setup.rearTireNotes}"
                  </p>
                )}
              </div>
            </div>

            {setup?.generalNotes && (
              <div className="mt-4 p-3 bg-slate-50 rounded-xl text-xs text-slate-600 border border-slate-200">
                <span className="font-semibold text-slate-800 block mb-0.5">Poznámka k setupu:</span>
                "{setup.generalNotes}"
              </div>
            )}
          </div>
        </div>

        {/* Recent Odometer Activity */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-slate-600" />
                <h3 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                  Poslední odečty počítadla
                </h3>
              </div>
            </div>

            {odometerEntries.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-6 text-center">
                Zatím nebyly zaznamenány žádné odečty počítadla.
              </p>
            ) : (
              <div className="space-y-3">
                {odometerEntries.slice(0, 5).map((entry) => {
                  const deltaKmNum = Number(entry.deltaKm);
                  const isDeltaPositive = deltaKmNum >= 0;
                  return (
                    <div
                      key={entry.id}
                      className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-slate-900 font-mono">
                            {formatKm(entry.resultingKm)}
                          </span>
                          <span className={`text-[11px] font-mono font-semibold ${
                            isDeltaPositive ? "text-emerald-700" : "text-amber-800"
                          }`}>
                            ({isDeltaPositive ? `+${formatKm(entry.deltaKm)}` : formatKm(entry.deltaKm)})
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                          {entry.note || (entry.entryType === "INITIAL" ? "Výchozí stav" : entry.entryType === "CORRECTION" ? "Korekce počítadla" : "Odečet stavu počítadla")}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 block font-mono">
                          {formatDateCs(entry.entryDate)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatMinutes(entry.resultingMinutes)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <Link
            href={`/bikes/${bike.id}/history`}
            className="mt-4 pt-3 border-t border-slate-100 text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center justify-between"
          >
            <span>Zobrazit celou historii</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
