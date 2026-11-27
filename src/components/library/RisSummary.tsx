import { TickMeter } from "@/components/ui/TickMeter";
import type { ClinicalCase } from "@/types/rx";

export function RisSummary({ clinical }: { clinical: ClinicalCase }) {
  return (
    <div className="space-y-2 text-sm text-[#F8FAFC]">
      <p className="font-mono text-[11px] text-[#6BA3DE]">{clinical.pseudoId}</p>
      <p>
        {clinical.ageYears} anni · {clinical.sex} · {clinical.weightKg} kg · {clinical.heightCm} cm
      </p>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <p className="text-[11px] text-[#9FB3C8]">Collaborazione 4/5</p>
          <TickMeter value={4} />
        </div>
        <div>
          <p className="text-[11px] text-[#9FB3C8]">Dolore 2/5</p>
          <TickMeter value={2} mixed />
        </div>
      </div>
    </div>
  );
}
