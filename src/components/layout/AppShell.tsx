"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { AlertBanner } from "./AlertBanner";
import { MobileNav } from "./MobileNav";
import { AddBikeModal } from "@/components/garage/AddBikeModal";
import { AddComponentModal } from "@/components/garage/AddComponentModal";

interface AppShellProps {
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAddBikeModalOpen, setIsAddBikeModalOpen] = useState(false);
  const [isAddComponentModalOpen, setIsAddComponentModalOpen] = useState(false);

  return (
    <div className="flex h-dvh bg-slate-50 overflow-hidden">
      {/* Postranní navigace */}
      <Sidebar
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onOpenAddBikeModal={() => setIsAddBikeModalOpen(true)}
        onOpenAddComponentModal={() => setIsAddComponentModalOpen(true)}
      />

      {/* Hlavní obsahová oblast */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header />

        <div className="flex-1 flex flex-col min-w-0 overflow-y-auto overscroll-contain pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
          {/* Upozorňovací banner na prošlé servisní intervaly */}
          <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-4 empty:hidden">
            <AlertBanner />
          </div>

          {/* On phones the bottom padding clears the fixed bottom bar (56px) and the home indicator */}
          <main className="flex-1 px-4 pt-4 sm:px-6 sm:pt-6 pb-[calc(5.5rem+env(safe-area-inset-bottom))] md:pb-6 max-w-7xl w-full mx-auto">
            {children}
          </main>
        </div>
      </div>

      <MobileNav
        drawerOpen={mobileMenuOpen}
        onOpenDrawer={() => setMobileMenuOpen(true)}
      />

      {/* Globální modál pro založení kola ze sidebaru */}
      <AddBikeModal
        isOpen={isAddBikeModalOpen}
        onClose={() => setIsAddBikeModalOpen(false)}
      />

      {/* Globální modál pro založení komponentu ze sidebaru */}
      <AddComponentModal
        isOpen={isAddComponentModalOpen}
        onClose={() => setIsAddComponentModalOpen(false)}
      />
    </div>
  );
};

export default AppShell;
