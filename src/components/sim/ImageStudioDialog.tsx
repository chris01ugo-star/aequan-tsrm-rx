"use client";

import { useState, useSyncExternalStore } from "react";
import { ANATOMY_PRESETS, presetById } from "@/data/anatomyPresets";
import { ghostBtn } from "@/components/ui/buttons";
import {
  fileToStoredPlate,
  getActiveSet,
  getEngineMode,
  getImageStudioSnapshot,
  getPlatePreview,
  getStudioCatalog,
  loadRadiographSet,
  saveRadiographSet,
  setEngineMode,
  subscribeImageStudio,
  type ArtifactPreset,
  type EngineMode,
  type PlateSlot,
  type UploadedRadiographSet,
} from "@/lib/imageStore";

const SLOTS: { id: PlateSlot; label: string }[] = [
  { id: "PA", label: "PA / Primaria" },
  { id: "AP", label: "AP" },
  { id: "LL", label: "LL" },
];

const ARTIFACTS: { id: ArtifactPreset; label: string }[] = [
  { id: "none", label: "Nessuno" },
  { id: "metal_foreign_body", label: "Corpo metallico" },
  { id: "grid_lines_moire", label: "Moiré / linee di griglia" },
  { id: "double_exposure", label: "Doppia esposizione" },
];

export function ImageStudioDialog({ onClose }: { onClose: () => void }) {
  const current = getActiveSet();
  const [mode, setMode] = useState<EngineMode>(getEngineMode());
  const [name, setName] = useState(current?.name ?? "Studio RX");
  const [presetId, setPresetId] = useState(current?.presetId ?? "chest-pa");
  const [refKv, setRefKv] = useState(String(current?.refKv ?? presetById("chest-pa").refKv));
  const [refMas, setRefMas] = useState(String(current?.refMas ?? presetById("chest-pa").refMas));
  const [refSid, setRefSid] = useState(String(current?.refSidCm ?? presetById("chest-pa").refSidCm));
  const [thickness, setThickness] = useState(String(current?.thicknessCm ?? presetById("chest-pa").thicknessCm));
  const [invertSource, setInvertSource] = useState(current?.invertSource ?? false);
  const [artifact, setArtifact] = useState<ArtifactPreset>(current?.artifactPreset ?? "none");
  const [files, setFiles] = useState<Partial<Record<PlateSlot, File>>>({});
  const [localUrls, setLocalUrls] = useState<Partial<Record<PlateSlot, string>>>({});
  const [busy, setBusy] = useState(false);
  const studioRev = useSyncExternalStore(subscribeImageStudio, getImageStudioSnapshot, () => "0");
  void studioRev;
  const catalog = getStudioCatalog();
  const hasPrimary = Boolean(files.PA || current?.slots.PA);

  function choosePreset(id: string) {
    const preset = presetById(id);
    setPresetId(id);
    setRefKv(String(preset.refKv));
    setRefMas(String(preset.refMas));
    setRefSid(String(preset.refSidCm));
    setThickness(String(preset.thicknessCm));
  }

  function takeFile(slot: PlateSlot, file: File | undefined) {
    if (!file) return;
    if (!/image\/(png|jpeg|webp)/.test(file.type) && !/\.(png|jpe?g|webp)$/i.test(file.name)) return;
    setFiles((currentFiles) => ({ ...currentFiles, [slot]: file }));
    setLocalUrls((currentUrls) => {
      const previous = currentUrls[slot];
      if (previous) URL.revokeObjectURL(previous);
      return { ...currentUrls, [slot]: URL.createObjectURL(file) };
    });
  }

  async function apply() {
    if (mode === "drr") {
      setEngineMode("drr");
      onClose();
      return;
    }
    if (!hasPrimary) return;
    setBusy(true);
    try {
      const slots: UploadedRadiographSet["slots"] = { ...(current?.slots ?? {}) };
      for (const slot of ["PA", "AP", "LL"] as const) {
        const file = files[slot];
        if (file) slots[slot] = await fileToStoredPlate(file);
      }
      const set: UploadedRadiographSet = {
        id: current?.id ?? crypto.randomUUID(),
        name: name.trim() || "Studio RX",
        presetId,
        refKv: Number(refKv) || presetById(presetId).refKv,
        refMas: Number(refMas) || presetById(presetId).refMas,
        refSidCm: Number(refSid) || presetById(presetId).refSidCm,
        thicknessCm: Number(thickness) || presetById(presetId).thicknessCm,
        invertSource,
        artifactPreset: artifact,
        slots,
      };
      await saveRadiographSet(set, "plate");
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#1f2b3b]/40 p-3">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="studio-title"
        className="flex max-h-[calc(100dvh-24px)] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-[#e7eaef] bg-white"
      >
        <header className="flex items-center justify-between border-b border-[#e7eaef] px-4 py-3">
          <h2 id="studio-title" className="font-display text-base font-bold">
            Studio Casi · Carica RX
          </h2>
          <button type="button" onClick={onClose} className={ghostBtn}>
            Chiudi
          </button>
        </header>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-3 rx-scroll">
          <div className="flex gap-1 rounded-lg border border-[#e7eaef] bg-[#f4f6f9] p-1">
            <ModeButton on={mode === "drr"} onClick={() => setMode("drr")}>
              Motore 3D DRR (Volume TC)
            </ModeButton>
            <ModeButton on={mode === "plate"} onClick={() => setMode("plate")}>
              Radiografia Reale Caricata (2D Universale)
            </ModeButton>
          </div>

          {mode === "plate" ? (
            <>
              <label className="block text-[11px] text-slate-500">
                Nome dello studio
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-[#e7eaef] bg-[#f4f6f9] px-2 text-xs text-[#1f2b3b]"
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-3">
                {SLOTS.map((slot) => (
                  <DropSlot
                    key={slot.id}
                    label={slot.label}
                    preview={localUrls[slot.id] ?? (files[slot.id] ? null : getPlatePreview(slot.id))}
                    onFile={(file) => takeFile(slot.id, file)}
                  />
                ))}
              </div>
              <label className="block text-[11px] text-slate-500">
                Distretto / preset
                <select
                  value={presetId}
                  onChange={(event) => choosePreset(event.target.value)}
                  className="mt-1 h-8 w-full rounded-md border border-[#e7eaef] bg-[#f4f6f9] px-2 text-xs text-[#1f2b3b]"
                >
                  {ANATOMY_PRESETS.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <Num label="kVp ref" value={refKv} onChange={setRefKv} />
                <Num label="mAs ref" value={refMas} onChange={setRefMas} />
                <Num label="SID ref" value={refSid} onChange={setRefSid} />
                <Num label="Spessore (cm)" value={thickness} onChange={setThickness} />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#1f2b3b]">
                <input
                  type="checkbox"
                  checked={invertSource}
                  onChange={(event) => setInvertSource(event.target.checked)}
                />
                Inverti polarità sorgente (bone-black → bone-white)
              </label>
              <label className="block text-[11px] text-slate-500">
                Artefatto di scenario
                <select
                  value={artifact}
                  onChange={(event) => setArtifact(event.target.value as ArtifactPreset)}
                  className="mt-1 h-8 w-full rounded-md border border-[#e7eaef] bg-[#f4f6f9] px-2 text-xs text-[#1f2b3b]"
                >
                  {ARTIFACTS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              {catalog.length > 0 ? (
                <div>
                  <p className="text-[11px] tracking-[0.12em] text-slate-500 uppercase">Studi salvati</p>
                  <ul className="mt-1 space-y-1">
                    {catalog.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => void loadRadiographSet(item.id).then(onClose)}
                          className="text-left text-xs text-[#2d4f7a] hover:text-[#1f2b3b]"
                        >
                          {item.name} · {presetById(item.presetId).name}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : (
            <p className="text-xs leading-relaxed text-slate-500">
              Lo scatto torna sul volume TC e sul ray-marching conico. Le lastre già salvate restano nello studio.
            </p>
          )}
          <p className="text-[11px] leading-relaxed text-slate-500">
            In modalità 2D la fisica di fascio, kVp, mAs, AEC, scatter, griglia, penombra, rumore e artefatti è
            reale; per rotazioni 3D continue usa il motore DRR volumetrico o carica viste multiple (PA/AP/LL).
          </p>
        </div>
        <footer className="flex justify-end gap-2 border-t border-[#e7eaef] px-4 py-3">
          <button
            type="button"
            disabled={busy || (mode === "plate" && !hasPrimary)}
            onClick={() => void apply()}
            className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-[#2d4f7a] disabled:opacity-40"
          >
            {busy ? "Salvataggio…" : "Applica studio"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function ModeButton({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-0 flex-1 rounded-md px-2 py-1.5 text-[11px] leading-snug ${
        on ? "bg-[#2d4f7a] text-white" : "text-slate-500 hover:text-[#1f2b3b]"
      }`}
    >
      {children}
    </button>
  );
}

function Num({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <label className="block text-[11px] text-slate-500">
      {label}
      <input
        value={value}
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 h-8 w-full rounded-md border border-[#e7eaef] bg-[#f4f6f9] px-2 font-mono text-xs text-[#1f2b3b]"
      />
    </label>
  );
}

function DropSlot({
  label,
  preview,
  onFile,
}: {
  label: string;
  preview: string | null;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <label
      className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed border-[#e7eaef] bg-[#f4f6f9] px-2 py-2 text-center"
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        onFile(event.dataTransfer.files[0]);
      }}
    >
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={(event) => onFile(event.target.files?.[0])}
      />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="mb-1 h-14 w-full object-contain" />
      ) : null}
      <span className="text-[11px] text-[#1f2b3b]">{label}</span>
      <span className="text-[10px] text-slate-500">PNG, JPG, WebP</span>
    </label>
  );
}
