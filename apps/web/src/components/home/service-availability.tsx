import { Scissors, Shirt } from "lucide-react";

const services = [
  { always: false, hours: "6am-8pm", icon: Scissors, name: "Lawn" },
  { always: true, hours: "24/7", icon: Shirt, name: "Laundry" },
] as const;

export default function ServiceAvailability() {
  const currentHour = new Date().getHours();

  return (
    <div className="flex flex-wrap gap-3">
      {services.map((service) => {
        const open = service.always || (currentHour >= 6 && currentHour < 20);

        return (
          <div
            className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] px-3 py-2"
            key={service.name}
          >
            <span
              className={open ? "size-2 bg-lime-300" : "size-2 bg-rose-300"}
            />
            <service.icon className="size-4 text-white/50" />
            <span className="text-sm font-medium text-white/75">
              {service.name}
            </span>
            <span className="text-xs text-white/40">{service.hours}</span>
          </div>
        );
      })}
    </div>
  );
}
