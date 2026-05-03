interface ProgressBarProps {
  current: number;
  total: number;
  label?: string;
}

/** Barra de progresso minimalista — exibida no topo do wizard. */
export function ProgressBar({ current, total, label }: ProgressBarProps) {
  const safeTotal = Math.max(total, 1);
  const safeCurrent = Math.min(Math.max(current, 0), safeTotal);
  const percentage = Math.round((safeCurrent / safeTotal) * 100);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
        <span>{label ?? `${safeCurrent} de ${safeTotal}`}</span>
        <span>{percentage}%</span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-slate-200"
        role="progressbar"
        aria-valuenow={safeCurrent}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
      >
        <div
          className="h-full rounded-full bg-cyan-600 transition-[width] duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
