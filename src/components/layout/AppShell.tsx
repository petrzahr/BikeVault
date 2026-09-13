"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AlertBanner } from "./AlertBanner";
import { AddBikeModal } from "@/components/garage/AddBikeModal";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAddBikeModalOpen, setIsAddBikeModalOpen] = useState(false);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Postranní navigace */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenAddBikeModal={() => setIsAddBikeModalOpen(true)}
      />

      {/* Hlavní obsahová oblast */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header
          onToggleMobileMenu={() => setMobileMenuOpen((prev) => !prev)}
        />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
          {/* Upozorňovací banner na prošlé servisní intervaly */}
          <AlertBanner />

          <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto pb-16">
            {children}
          </main>
        </div>
      </div>

      {/* Globální modál pro založení kola ze sidebaru */}
      <AddBikeModal
        isOpen={isAddBikeModalOpen}
        onClose={() => setIsAddBikeModalOpen(false)}
      />
    </div>
  );
};

export default AppShell;
