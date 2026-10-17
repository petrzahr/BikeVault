"use client";

import React from "react";
import { Download, FileText, Info } from "lucide-react";
import { Modal, ModalFooter } from "@/components/common/Modal";
import { cn } from "@/lib/ui";
import type { RestorePreview } from "@/lib/storage/backupMerge";

export interface RestoreRequest {
  fileName: string;
  content: string;
  preview: RestorePreview;
}

interface RestoreConfirmationModalProps {
  request: RestoreRequest | null;
  onClose: () => void;
  onConfirm: (content: string) => void;
  onDownloadCurrent: () => void;
}

export function RestoreConfirmationModal({ request, onClose, onConfirm, onDownloadCurrent }: RestoreConfirmationModalProps) {
  const preview = request?.preview;
  const canRestore = !!preview && preview.totalAdded > 0;

  return (
    <Modal isOpen={!!request} onClose={onClose} title="Obnovit data ze zálohy?" maxWidth="max-w-lg">
      {request && preview && (
        <div className="space-y-4 text-sm text-slate-600">
          <div className="flex items-center gap-2 min-w-0 text-xs">
            <FileText className="w-4 h-4 text-slate-500 shrink-0" aria-hidden="true" />
            <span className="font-semibold text-slate-900 truncate" title={request.fileName}>
              {request.fileName}
            </span>
          </div>

          <div className="panel panel-info flex items-start gap-2.5">
            <Info className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <p>
              Záloha se sloučí s aktuálními daty. Přibudou jen záznamy, které v aplikaci ještě nejsou, včetně
              těch, které jste od pořízení zálohy smazali. Nic se nesmaže ani nepřepíše a nastavení zůstane beze změny.
              Obnovený záznam tachometru nepřepočítá aktuální nájezd kola.
            </p>
          </div>

          {preview.groups.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">Co se stane</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-slate-500 border-b border-slate-200">
                      <th scope="col" className="text-left font-semibold py-2 pr-3">Záznamy</th>
                      <th scope="col" className="text-right font-semibold py-2 px-3">Přibude</th>
                      <th scope="col" className="text-right font-semibold py-2 pl-3">Už existuje</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {preview.groups.map((g) => (
                      <tr key={g.label}>
                        <td className="py-2 pr-3 text-slate-900">{g.label}</td>
                        <td
                          className={cn(
                            "py-2 px-3 text-right font-bold tabular-nums",
                            g.added > 0 ? "text-slate-900" : "text-slate-500"
                          )}
                        >
                          {g.added}
                        </td>
                        <td className="py-2 pl-3 text-right text-slate-500 tabular-nums">{g.existing}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="text-xs">Soubor neobsahuje žádné záznamy.</p>
          )}

          {!canRestore && preview.groups.length > 0 && (
            <p className="text-xs">Všechny záznamy ze zálohy už v aplikaci jsou, obnovou se nic nezmění.</p>
          )}

          {canRestore && (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100 pt-4">
              <p className="text-xs text-slate-500">Pro jistotu si před obnovou stáhněte zálohu aktuálních dat.</p>
              <button type="button" onClick={onDownloadCurrent} className="btn-secondary btn-sm shrink-0 self-start">
                <Download className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Stáhnout aktuální zálohu</span>
              </button>
            </div>
          )}

          <ModalFooter>
            <button type="button" onClick={onClose} className="btn-secondary">
              Zrušit
            </button>
            <button
              type="button"
              disabled={!canRestore}
              onClick={() => onConfirm(request.content)}
              className="btn-primary"
            >
              Obnovit data
            </button>
          </ModalFooter>
        </div>
      )}
    </Modal>
  );
}

export default RestoreConfirmationModal;
