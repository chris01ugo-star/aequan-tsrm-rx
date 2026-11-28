export function TickMeter({
  value,
  max = 5,
  mixed = false,
}: {
  value: number;
  max?: number;
  mixed?: boolean;
}) {
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: max }, (_, index) => {
        const on = index < value;
        const amber = mixed && on && index === value - 1 && value > 1;
        return (
          <span
            key={index}
            className={`h-1.5 flex-1 ${on ? (amber ? "bg-amber-rx" : "bg-ok") : "bg-line"}`}
          />
        );
      })}
    </div>
  );
}
