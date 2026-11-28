import { Check } from "lucide-react";
import { Fragment } from "react";
import { card } from "@/components/ui/buttons";

export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <nav aria-label="Avanzamento" className={`${card} px-4 py-4 sm:px-8`}>
      <ol className="flex items-center gap-3 overflow-x-auto">
        {steps.map((label, index) => {
          const done = index < current;
          const on = index === current;
          return (
            <Fragment key={label}>
              {index > 0 ? (
                <li aria-hidden="true" className={`h-px min-w-6 flex-1 ${index <= current ? "bg-[#123a6b]" : "bg-[#d5deea]"}`} />
              ) : null}
              <li className="flex shrink-0 items-center gap-3">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full border text-[13px] font-semibold ${
                    on
                      ? "border-[#123a6b] bg-[#123a6b] text-white"
                      : done
                        ? "border-[#123a6b] bg-white text-[#123a6b]"
                        : "border-[#c7d3e2] bg-white text-slate-500"
                  }`}
                >
                  {done ? <Check size={15} strokeWidth={2.5} /> : index + 1}
                </span>
                <span
                  className={`text-[14px] ${on ? "font-semibold text-[#123a6b]" : done ? "text-[#14233b]" : "text-slate-500"} ${
                    on ? "" : "hidden sm:inline"
                  }`}
                >
                  {label}
                </span>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
