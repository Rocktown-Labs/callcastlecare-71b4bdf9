import { Clock } from "lucide-react";

import { serviceHoursLabel } from "@/lib/scheduling";

export default function ServiceAvailability() {
  const currentHour = new Date().getHours();
  const isOpen = currentHour >= 6 && currentHour < 18;

  return (
    <div className="hidden sm:flex">
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2">
        <span
          className={
            isOpen
              ? "size-2 rounded-full bg-lime-300"
              : "size-2 rounded-full bg-rose-300"
          }
        />
        <Clock className="size-4 text-white/50" />
        <span className="text-sm font-medium text-white/75">
          {isOpen ? "Open now" : "Closed now"}
        </span>
        <span className="text-xs text-white/40">{serviceHoursLabel}</span>
      </div>
    </div>
  );
}
