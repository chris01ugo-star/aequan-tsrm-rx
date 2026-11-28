"use client";

import {
  Bell,
  BookOpen,
  CircleHelp,
  FolderOpen,
  Layers,
  LayoutDashboard,
  Menu,
  Settings,
  Stethoscope,
  X,
} from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";

export type DashView = "dashboard" | "library" | "archive" | "report" | "bank" | "settings";

const NAV: { id: DashView; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "library", label: "Scenari clinici", icon: Stethoscope },
  { id: "archive", label: "Archivio sessioni", icon: FolderOpen },
  { id: "report", label: "Report", icon: BookOpen },
  { id: "bank", label: "Banca dati casi", icon: Layers },
  { id: "settings", label: "Impostazioni", icon: Settings },
];

export function DashboardShell({
  active,
  onNavigate,
  query,
  onQuery,
  showSearch = false,
  children,
}: {
  active: DashView;
  onNavigate: (view: DashView) => void;
  query: string;
  onQuery: (value: string) => void;
  showSearch?: boolean;
  children: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const [help, setHelp] = useState(false);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#e8eef6] text-[#0f2744]">
      <header className="z-30 flex h-16 shrink-0 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-3 backdrop-blur-md sm:px-5">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-xl text-[#1e3a5f] hover:bg-slate-100 lg:hidden"
          aria-label={menu ? "Chiudi menu" : "Apri menu"}
          onClick={() => setMenu((value) => !value)}
        >
          {menu ? <X size={18} /> : <Menu size={18} />}
        </button>
        <div className="flex min-w-0 items-center gap-3">
          <Image
            src="/aequan-logo-horizontal.png"
            alt="Aequan"
            width={148}
            height={28}
            priority
            className="h-7 w-auto"
          />
          <span className="hidden h-8 w-px bg-slate-200 sm:block" />
          <span className="hidden min-w-0 leading-tight sm:block">
            <span className="block truncate text-[13px] font-semibold text-[#1e3a5f]">
              Imaging & Clinical Simulation
            </span>
            <span className="block truncate text-[11px] text-slate-500">Formazione in Radiologia</span>
          </span>
        </div>
        {showSearch ? (
          <label className="ml-auto hidden h-10 max-w-xs flex-1 items-center rounded-full border border-slate-200 bg-slate-50 px-3 md:flex">
            <span className="sr-only">Cerca</span>
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Cerca casi o modalità"
              className="h-full w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </label>
        ) : (
          <div className="ml-auto" />
        )}
        <div className="relative flex items-center gap-1 sm:gap-2">
          <button
            type="button"
            aria-label="Notifiche"
            onClick={() => {
              setBell((value) => !value);
              setHelp(false);
            }}
            className="hidden h-10 w-10 place-items-center rounded-full text-slate-500 hover:bg-slate-100 sm:grid"
          >
            <Bell size={18} />
          </button>
          <button
            type="button"
            onClick={() => {
              setHelp((value) => !value);
              setBell(false);
            }}
            className="inline-flex h-10 items-center gap-1.5 rounded-full px-2 text-sm font-medium text-slate-600 hover:bg-slate-100"
          >
            <CircleHelp size={18} />
            <span className="hidden md:inline">Supporto</span>
          </button>
          <span className="mx-1 hidden h-8 w-px bg-slate-200 sm:block" />
          <div className="flex items-center gap-2 rounded-full py-1 pr-1 pl-1 sm:pr-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#dbe7f6] text-[12px] font-semibold text-[#1e3a5f]">
              RC
            </span>
            <span className="hidden leading-tight md:block">
              <span className="block text-[13px] font-semibold">Dott.ssa R. Conti</span>
              <span className="block text-[11px] text-slate-500">Università di Milano</span>
            </span>
          </div>
          {bell ? (
            <p className="absolute top-12 right-0 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-3 text-xs text-slate-500 shadow-lg">
              Nessuna notifica. Le sessioni restano su questo browser.
            </p>
          ) : null}
          {help ? (
            <p className="absolute top-12 right-0 z-40 w-72 rounded-2xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-lg">
              Simulatore didattico AEQUAN. Non è un dispositivo medico e non sostituisce il referto
              clinico. I punteggi valutano la tecnica, non la diagnosi.
            </p>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[232px] shrink-0 flex-col border-r border-slate-200/80 bg-white/70 px-3 py-4 lg:flex">
          <NavList active={active} onNavigate={onNavigate} />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto pb-24 lg:pb-6">{children}</main>
      </div>

      {menu ? (
        <button
          type="button"
          aria-label="Chiudi menu"
          className="fixed inset-0 z-40 bg-[#0f2744]/30 lg:hidden"
          onClick={() => setMenu(false)}
        />
      ) : null}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-50 w-[min(84vw,280px)] border-r border-slate-200 bg-white p-3 shadow-xl transition-transform lg:hidden ${
          menu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavList
          active={active}
          onNavigate={(view) => {
            setMenu(false);
            onNavigate(view);
          }}
        />
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-4 border-t border-slate-200 bg-white/95 px-1 py-1 backdrop-blur lg:hidden">
        {NAV.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const on = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-1 py-2 text-[10px] font-medium ${
                on ? "text-[#1e3a5f]" : "text-slate-400"
              }`}
            >
              <Icon size={16} />
              {item.label.split(" ")[0]}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function NavList({
  active,
  onNavigate,
}: {
  active: DashView;
  onNavigate: (view: DashView) => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const Icon = item.icon;
        const on = active === item.id;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`flex h-11 items-center gap-3 rounded-xl px-3 text-left text-[14px] font-medium transition ${
              on
                ? "bg-[#e8f0fb] text-[#1e3a5f]"
                : "text-slate-500 hover:bg-slate-50 hover:text-[#1e3a5f]"
            }`}
          >
            <Icon size={18} />
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}
