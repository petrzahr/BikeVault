"use client";

import { useVault } from "@/context/VaultContext";
import { useFeedback } from "@/components/common/Feedback";

// Two-step disconnect shared by the header menu and Settings: confirm, then offer a forced
// logout only when the last changes could not be saved to Drive.
export function useDisconnectDrive() {
  const { syncStatus, logout } = useVault();
  const { confirm } = useFeedback();

  return async () => {
    const ok = await confirm({
      title: "Odpojit Google Disk?",
      message:
        syncStatus === "synced"
          ? "Aplikace se odhlásí a vrátí na přihlašovací obrazovku. Vaše data zůstávají na Google Disku a po novém přihlášení se znovu načtou."
          : "Některé změny ještě nemusí být uložené na Google Disku. Doporučujeme nejdřív počkat na dokončení synchronizace. Aplikace se odhlásí a vrátí na přihlašovací obrazovku.",
      confirmText: "Odpojit a odhlásit",
      isDestructive: true,
    });
    if (!ok) return;
    const result = await logout();
    if (result.ok) return;
    const force = await confirm({
      title: "Uložení na Google Disk selhalo",
      message: `Poslední změny se nepodařilo uložit na Google Disk (${result.error}). Pokud se odhlásíte, tyto změny budou ztraceny.`,
      confirmText: "Odhlásit i tak",
      isDestructive: true,
    });
    if (force) {
      await logout({ force: true });
    }
  };
}
