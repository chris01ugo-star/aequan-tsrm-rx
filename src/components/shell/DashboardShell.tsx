"use client";

import {
  BarChart3,
  Bell,
  CircleHelp,
  Database,
  Folder,
  GraduationCap,
  Home,
  Layers,
  Menu,
  Settings,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export type DashView = "dashboard" | "library" | "archive" | "report" | "bank" | "settings";

const NAV: { group: string; items: { id: DashView; label: string; icon: typeof Home }[] }[] = [
  {
    group: "Formazione",
    items: [
      { id: "dashboard", label: "Valutazione tirocinio", icon: Home },
      { id: "library", label: "Scenari clinici", icon: Layers },
    ],
  },
  {
    group: "Risultati",
    items: [
      { id: "archive", label: "Sessioni svolte", icon: Folder },
      { id: "report", label: "Report", icon: BarChart3 },
    ],
  },
  {
    group: "Materiali",
    items: [
      { id: "bank", label: "Banca dati casi", icon: Database },
      { id: "settings", label: "Impostazioni", icon: Settings },
    ],
  },
];

export function DashboardShell({
  active,
  onNavigate,
  onGuide,
  onTeacher,
  children,
}: {
  active: DashView;
  onNavigate: (view: DashView) => void;
  onGuide?: () => void;
  onTeacher?: () => void;
  query?: string;
  onQuery?: (value: string) => void;
  showSearch?: boolean;
  children: ReactNode;
}) {
  const [menu, setMenu] = useState(false);
  const [popover, setPopover] = useState<"bell" | "help" | null>(null);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-[#f6f7f9] text-[#1f2b3b]">
      <header className="relative z-30 flex h-[72px] shrink-0 items-center gap-3 border-b border-[#e7eaef] bg-white px-4 sm:px-8">
        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg text-[#2d4f7a] hover:bg-slate-100 lg:hidden"
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
          {onGuide ? (
            <button type="button" onClick={onGuide} className="h-10 rounded-xl px-3 text-sm font-medium text-slate-500 hover:bg-[#f1f3f6] hover:text-[#2d4f7a]">
              ? Guida
            </button>
          ) : null}
          <span className="mx-2 hidden h-8 w-px bg-[#e7eaef] sm:block" />
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-[#edf1f6] text-[13px] font-semibold text-[#2d4f7a]">
              RC
            </span>
            <span className="hidden leading-tight md:block">
              <span className="block text-[14px] font-medium">Dott.ssa R. Conti</span>
              <span className="block text-[12px] text-slate-500">Università di Milano</span>
            </span>
          </div>
        </div>
        {popover ? (
          <div className="absolute top-[64px] right-4 z-40 w-72 rounded-xl border border-[#e7eaef] bg-white p-4 text-sm leading-relaxed text-slate-600 shadow-lg sm:right-8">
            {popover === "bell"
              ? "Nessuna nuova notifica."
              : "AEQUAN è un simulatore didattico: non è un dispositivo medico e la valutazione riguarda la tecnica di esecuzione, non la diagnosi."}
          </div>
        ) : null}
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="hidden h-full w-[248px] shrink-0 flex-col overflow-y-auto border-r border-[#e7eaef] bg-white px-3 py-6 lg:flex">
          <NavList active={active} onNavigate={onNavigate} onTeacher={onTeacher} />
        </aside>
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>

      {menu ? (
        <button
          type="button"
          aria-label="Chiudi menu"
          className="fixed inset-0 top-[72px] z-40 bg-[#1f2b3b]/25 lg:hidden"
          onClick={() => setMenu(false)}
        />
      ) : null}
      <aside
        className={`fixed top-[72px] bottom-0 left-0 z-50 flex w-[260px] flex-col border-r border-[#e7eaef] bg-white px-4 py-6 transition-transform lg:hidden ${
          menu ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <NavList
          active={active}
          onTeacher={onTeacher}
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
          <rect x="9" y="9" width="6" height="6" rx="1" fill="#2d4f7a" />
          <rect x="16" y="9" width="6" height="6" rx="1" fill="#2f6fb5" />
          <rect x="9" y="16" width="6" height="6" rx="1" fill="#2f6fb5" />
        </svg>
        <span className="font-display text-[24px] font-semibold tracking-tight text-[#2d4f7a]">AEQUAN</span>
      </span>
      <span className="hidden h-9 w-px bg-[#dde2e9] sm:block" />
      <span className="hidden leading-tight sm:block">
        <span className="block text-[14px] font-medium text-[#1f2b3b]">Formazione in Radiologia</span>
        <span className="block text-[12px] text-slate-500">Corso di laurea TSRM</span>
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

function NavList({
  active,
  onNavigate,
  onTeacher,
}: {
  active: DashView;
  onNavigate: (view: DashView) => void;
  onTeacher?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-6">
      {NAV.map((section) => (
        <div key={section.group}>
          <p className="mb-1.5 px-3 text-[12px] font-medium text-slate-400">{section.group}</p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => (
              <NavItem key={item.id} item={item} on={active === item.id} onClick={() => onNavigate(item.id)} />
            ))}
          </div>
        </div>
      ))}
      {onTeacher ? (
        <div>
          <p className="mb-1.5 px-3 text-[12px] font-medium text-slate-400">Area Docente</p>
          <button
            type="button"
            onClick={onTeacher}
            className="flex h-10 w-full items-center gap-3 rounded-xl px-3 text-left text-[14px] text-slate-600 hover:bg-[#f4f6f9] hover:text-[#2d4f7a]"
          >
            <GraduationCap size={17} strokeWidth={1.6} className="text-slate-400" />
            Studio immagini
          </button>
        </div>
      ) : null}
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
      className={`relative flex h-10 items-center gap-3 rounded-xl px-3 text-left text-[14px] transition ${
        on ? "bg-[#edf1f6] font-medium text-[#2d4f7a]" : "text-slate-600 hover:bg-[#f4f6f9] hover:text-[#2d4f7a]"
      }`}
    >
      <Icon size={17} strokeWidth={1.6} className={on ? "" : "text-slate-400"} />
      {item.label}
    </button>
  );
}
