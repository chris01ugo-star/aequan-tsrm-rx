"use client";

import { Bell, FolderOpen, LayoutDashboard, Library, PanelLeft, Search } from "lucide-react";
import Image from "next/image";
import { useState, type ReactNode } from "react";
import { primaryBtn } from "@/components/ui/buttons";

export type DashView = "library" | "archive" | "analytics";

const NAV: { id: DashView; label: string; icon: typeof Library }[] = [
  { id: "library", label: "Libreria casi", icon: Library },
  { id: "archive", label: "Archivio sessioni", icon: FolderOpen },
  { id: "analytics", label: "Analytics Aula", icon: LayoutDashboard },
];

export function DashboardShell({
  collapsed,
  onToggle,
  active,
  onNavigate,
  onNewSession,
  query,
  onQuery,
  children,
}: {
  collapsed: boolean;
  onToggle: () => void;
  active: DashView;
  onNavigate: (view: DashView) => void;
  onNewSession: () => void;
  query: string;
  onQuery: (value: string) => void;
  children: ReactNode;
}) {
  const [bellOpen, setBellOpen] = useState(false);

  return (
    <div className="flex h-dvh overflow-hidden bg-[#0B1320] text-[#F8FAFC]">
      <aside
        className={`relative flex shrink-0 flex-col border-r border-[#2A486D] bg-[#16253B] transition-[width] duration-200 ${
          collapsed ? "w-[76px]" : "w-60"
        }`}
      >
        <button
          type="button"
          aria-label={collapsed ? "Espandi sidebar" : "Comprimi sidebar"}
          onClick={onToggle}
          className="absolute top-1/2 -right-[14px] z-20 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full border-2 border-[#2A486D] bg-[#16253B] text-[#F8FAFC] shadow-sm"
        >
          <PanelLeft size={16} />
        </button>
        <div className="flex h-16 items-center px-[10px]">
          <button
            type="button"
            onClick={onNewSession}
            className={`${primaryBtn} w-full ${collapsed ? "px-0" : ""}`}
            title="Nuova Sessione"
          >
            {collapsed ? "+" : "Nuova Sessione"}
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-[10px] py-4">
          {NAV.map((item) => {
            const Icon = item.icon;
            const on = active === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                title={item.label}
                className={`flex h-10 items-center gap-2 rounded-xl px-2 text-[13px] font-medium ${
                  on
                    ? "bg-[#F8FAFC] text-[#1E324E]"
                    : "text-[#9FB3C8] hover:bg-[#1E324E] hover:text-[#F8FAFC]"
                } ${collapsed ? "justify-center" : ""}`}
              >
                <Icon size={16} />
                {collapsed ? null : <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>
        <div className="p-[10px]">
          <div className={`flex items-center gap-2 ${collapsed ? "justify-center" : ""}`}>
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#1E324E] text-[11px] font-semibold text-[#F8FAFC]">
              TT
            </span>
            {collapsed ? null : (
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold">TSRM_TUTOR_01</span>
                <span className="block text-[11px] text-[#9FB3C8]">Fase Ponte · GDPR</span>
              </span>
            )}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative flex h-16 shrink-0 items-center gap-4 border-b border-[#1E324E] bg-[#16253B] px-6 shadow-[0_8px_24px_-18px_rgba(0,0,0,0.8)]">
          <label className="flex h-10 max-w-md flex-1 items-center gap-2 rounded-full border border-[#2A486D] bg-[#111D30] px-3">
            <Search size={15} className="text-[#9FB3C8]" />
            <span className="sr-only">Cerca</span>
            <input
              value={query}
              onChange={(event) => onQuery(event.target.value)}
              placeholder="Cerca casi o modalità"
              className="h-full w-full bg-transparent text-sm text-[#F8FAFC] outline-none placeholder:text-[#9FB3C8]"
            />
          </label>
          <Image
            src="/aequan-logo-horizontal.png"
            alt="Aequan"
            width={180}
            height={38}
            priority
            className={`pointer-events-none absolute top-1/2 h-[38px] w-auto -translate-y-1/2 brightness-0 invert ${
              query ? "left-[58%]" : "left-1/2 -translate-x-1/2"
            }`}
          />
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full border border-[#2A486D] px-3 py-1 text-[11px] font-medium text-[#9FB3C8] lg:inline">
              SOLO USO DIDATTICO
            </span>
            <button
              type="button"
              aria-label="Notifiche"
              onClick={() => setBellOpen((value) => !value)}
              className="grid h-10 w-10 place-items-center rounded-xl text-[#9FB3C8] hover:bg-[#1E324E] hover:text-[#F8FAFC]"
            >
              <Bell size={16} />
            </button>
            <span className="h-8 w-px bg-[#2A486D]" />
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[#1E324E] text-[11px] font-semibold">
              TT
            </span>
          </div>
          {bellOpen ? (
            <p className="absolute top-14 right-6 z-20 rounded-xl border border-[#2A486D] bg-[#16253B] px-3 py-2 text-xs text-[#9FB3C8] shadow-sm">
              Nessuna notifica didattica
            </p>
          ) : null}
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto rx-scroll">{children}</div>
      </div>
    </div>
  );
}
