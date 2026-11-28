"use client";

import {
  BarChart3,
  Bell,
  ChevronDown,
  CircleHelp,
  Database,
  Folder,
  Home,
  Layers,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export type DashView = "dashboard" | "library" | "archive" | "report" | "bank" | "settings";

const NAV: { id: DashView; label: string; icon: typeof Home }[] = [
  { id: "dashboard", label: "Dashboard", icon: Home },
  { id: "library", label: "Scenari clinici", icon: Layers },
  { id: "archive", label: "Archivio sessioni", icon: Folder },
  { id: "report", label: "Report", icon: BarChart3 },
  { id: "bank", label: "Banca dati casi", icon: Database },
];

export function DashboardShell({
  active,
  onNavigate,
  children,
}: {
  active: DashView;
  onNavigate: (view: DashView) => void;
  query?: string;
  onQuery?: (value: string) => void;
  showSearch?: boolean;
  children: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const [popover, setPopover] = useState<"bell" | "help" | null>(null);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f3f6fa] text-[#14233b]">
      <header className="relative z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-[#e3e9f1] bg-white px-4 sm:px-8">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg text-[#123a6b] hover:bg-slate-100 lg:hidden"
          aria-label={menu ? "Chiudi menu" : "Apri menu"}
          onClick={() => setMenu((value) => !value)}
        >
          {menu ? <X size={20} /> : <Menu size={20} />}
        </button>
        <Brand />
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <IconButton label="Notifiche" onClick={() => setPopover(popover === "bell" ? null : "bell")}>
            <Bell size={19} />
          </IconButton>
          <IconButton label="Supporto" onClick={() => setPopover(popover === "help" ? null : "help")}>
            <CircleHelp size={19} />
          </IconButton>
          <span className="mx-2 hidden h-8 w-px bg-[#e3e9f1] sm:block" />
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#e6eef8] font-display text-[14px] font-semibold text-[#123a6b]">
              RC
            </span>
            <span className="hidden leading-tight md:block">
              <span className="block font-display text-[15px] font-semibold">Dott.ssa R. Conti</span>
              <span className="block text-[12px] text-slate-500">Università di Milano</span>
            </span>
            <ChevronDown size={16} className="hidden text-slate-400 md:block" />
          </div>
        </div>
        {popover ? (
          <div className="absolute top-[64px] right-4 z-40 w-72 rounded-xl border border-[#e3e9f1] bg-white p-4 text-sm leading-relaxed text-slate-600 shadow-lg sm:right-8">
            {popover === "bell"
              ? "Nessuna nuova notifica."
              : "AEQUAN è un simulatore didattico: non è un dispositivo medico e la valutazione riguarda la tecnica di esecuzione, non la diagnosi."}
          </div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-[240px] shrink-0 border-r border-[#e3e9f1] bg-white px-4 py-6 lg:block">
          <NavList active={active} onNavigate={onNavigate} />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      {menu ? (
        <button
          type="button"
          aria-label="Chiudi menu"
          className="fixed inset-0 top-[72px] z-40 bg-[#14233b]/25 lg:hidden"
          onClick={() => setMenu(false)}
        />
      ) : null}
      <aside
        className={`fixed top-[72px] bottom-0 left-0 z-50 w-[260px] border-r border-[#e3e9f1] bg-white px-4 py-6 transition-transform lg:hidden ${
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
    </div>
  );
}

export function Brand() {
  return (
    <div className="flex min-w-0 items-center gap-4">
      <span className="flex items-center gap-2">
        <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden="true">
          <rect x="9" y="2" width="6" height="6" rx="1" fill="#2f6fb5" />
          <rect x="2" y="9" width="6" height="6" rx="1" fill="#2f6fb5" />
          <rect x="9" y="9" width="6" height="6" rx="1" fill="#123a6b" />
          <rect x="16" y="9" width="6" height="6" rx="1" fill="#2f6fb5" />
          <rect x="9" y="16" width="6" height="6" rx="1" fill="#2f6fb5" />
        </svg>
        <span className="font-display text-[26px] font-semibold tracking-tight text-[#123a6b]">AEQUAN</span>
      </span>
      <span className="hidden h-9 w-px bg-[#d5deea] sm:block" />
      <span className="hidden leading-tight sm:block">
        <span className="block font-display text-[16px] font-semibold text-[#14233b]">
          Imaging &amp; Clinical Simulation
        </span>
        <span className="block font-display text-[14px] text-slate-600 italic">Formazione in Radiologia</span>
      </span>
    </div>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid h-10 w-10 place-items-center rounded-full text-slate-600 hover:bg-slate-100"
    >
      {children}
    </button>
  );
}

function NavList({ active, onNavigate }: { active: DashView; onNavigate: (view: DashView) => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => (
        <NavItem key={item.id} item={item} on={active === item.id} onClick={() => onNavigate(item.id)} />
      ))}
      <span className="my-4 h-px bg-[#e3e9f1]" />
      <NavItem
        item={{ id: "settings", label: "Impostazioni", icon: Settings }}
        on={active === "settings"}
        onClick={() => onNavigate("settings")}
      />
    </nav>
  );
}

function NavItem({
  item,
  on,
  onClick,
}: {
  item: { id: DashView; label: string; icon: typeof Home };
  on: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-11 items-center gap-3 rounded-lg px-3 text-left text-[14px] transition ${
        on ? "bg-[#e8f0fa] font-medium text-[#123a6b]" : "text-slate-600 hover:bg-[#f5f8fc] hover:text-[#123a6b]"
      }`}
    >
      <Icon size={18} strokeWidth={1.75} />
      {item.label}
    </button>
  );
}
