import { clsx } from "clsx";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const normalizedStatus = status.toLowerCase();
  
  let colors = "bg-gray-100 text-gray-600 border-gray-200";
  let dotColor = "bg-gray-400";
  
  if (normalizedStatus === "online") {
    colors = "bg-emerald-50 text-emerald-700 border-emerald-200";
    dotColor = "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]";
  } else if (normalizedStatus === "offline") {
    colors = "bg-slate-100 text-slate-600 border-slate-200";
    dotColor = "bg-slate-400";
  } else if (normalizedStatus === "away") {
    colors = "bg-amber-50 text-amber-700 border-amber-200";
    dotColor = "bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]";
  }

  const label = normalizedStatus.charAt(0).toUpperCase() + normalizedStatus.slice(1);

  return (
    <span className={clsx(
      "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border",
      colors,
      className
    )}>
      <span className={clsx("w-2 h-2 rounded-full", dotColor)} />
      {label}
    </span>
  );
}
