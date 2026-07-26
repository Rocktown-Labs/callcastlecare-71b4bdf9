import { Sparkles } from "lucide-react";

import { serviceOptions } from "@/lib/service-catalog";

const services = [
  { always: false, hours: "6am-8pm", id: "lawncare" },
  { always: true, hours: "24/7", id: "laundry" },
  { always: false, hours: "7am-7pm", id: "window-washing" },
] as const;

export default function ServiceAvailability() {
  const currentHour = new Date().getHours();

  return (
    <div className="flex flex-wrap gap-3">
      {services.map((service) => {
        const open = service.always || (currentHour >= 6 && currentHour < 20);
        const option = serviceOptions.find(({ id }) => id === service.id);
        const Icon = option?.icon ?? Sparkles;

        return (
          <div
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2"
            key={service.id}
          >
            <span
              className={
                open
                  ? "size-2 rounded-full bg-lime-300"
                  : "size-2 rounded-full bg-rose-300"
              }
            />
            <Icon className="size-4 text-white/50" />
            <span className="text-sm font-medium text-white/75">
              {option?.name}
            </span>
            <span className="text-xs text-white/40">{service.hours}</span>
          </div>
        );
      })}
    </div>
  );
}
