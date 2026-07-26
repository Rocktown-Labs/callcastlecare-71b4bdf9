import { Button } from "@callcastlecare/ui/components/button";
import { Label } from "@callcastlecare/ui/components/label";
import { cn } from "@callcastlecare/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Clock } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { bookingTimeSlots } from "@/lib/scheduling";
import { serviceIdSchema, serviceOptions } from "@/lib/service-catalog";

import { RadarAddressInput } from "./radar-address-input";
import ServiceAvailability from "./service-availability";
import type { RadarAddressSuggestion } from "./use-radar-address-autocomplete";

const bookingSchema = z.object({
  address: z.string().min(5, "Enter a service address."),
  date: z.string().min(1, "Choose a date."),
  services: z.array(serviceIdSchema).min(1),
  timeSlot: z.string().min(1, "Choose a time."),
});

type ServiceId = (typeof serviceOptions)[number]["id"];
type BookingErrors = Partial<
  Record<keyof z.infer<typeof bookingSchema>, string>
>;

export default function HeroSection() {
  const navigate = useNavigate({ from: "/" });
  const [selectedServices, setSelectedServices] = useState<ServiceId[]>([
    "lawncare",
  ]);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(bookingTimeSlots[2]);
  const [isAddressValidated, setIsAddressValidated] = useState(false);
  const [errors, setErrors] = useState<BookingErrors>({});

  const toggleService = (serviceId: ServiceId) => {
    setSelectedServices((current) =>
      current.includes(serviceId)
        ? current.filter((id) => id !== serviceId)
        : [...current, serviceId]
    );
    setErrors((current) => ({ ...current, services: undefined }));
  };

  const handleAddressChange = (value: string) => {
    setAddress(value);
    setIsAddressValidated(false);
    setErrors((current) => ({ ...current, address: undefined }));
  };

  const handleAddressSelect = (suggestion: RadarAddressSuggestion) => {
    setAddress(suggestion.label);
    setIsAddressValidated(true);
    setErrors((current) => ({ ...current, address: undefined }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = bookingSchema.safeParse({
      address,
      date,
      services: selectedServices,
      timeSlot: selectedTimeSlot,
    });

    if (!result.success) {
      const nextErrors: BookingErrors = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as keyof BookingErrors;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    toast.success("Service request started");
    navigate({
      search: {
        address: result.data.address,
        date: result.data.date,
        services: result.data.services.join(","),
        timeSlot: result.data.timeSlot,
      },
      to: "/book",
    });
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-slate-950 pt-18">
      <div className="absolute inset-0">
        <img
          alt=""
          aria-hidden="true"
          className="size-full object-cover opacity-55"
          src="/callcastlecare/media/technician-van-night.png"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/78 to-slate-950/25" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-white to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100svh-72px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_460px] lg:px-8">
        <div className="max-w-3xl space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/15 px-3 py-1 text-sm font-medium text-lime-100 shadow-lg shadow-lime-950/20">
            <span className="size-2 rounded-full bg-lime-300" />
            Now serving Central Arkansas
          </div>

          <h1 className="max-w-4xl text-pretty text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
            Book home services like you book a ride.
          </h1>

          <p className="max-w-2xl text-lg leading-8 text-white/65">
            CallCastleCare brings vetted lawn care, laundry pickup, and window
            washing into one simple local marketplace, starting in Central
            Arkansas.
          </p>

          <ServiceAvailability />
        </div>

        <form
          className="rounded-3xl border border-white/20 bg-white p-5 text-slate-950 shadow-2xl shadow-slate-950/30"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-bold text-slate-950">Book a service</h2>

          <div className="mt-5 space-y-3">
            <Label className="text-slate-600">Services</Label>
            <div className="grid grid-cols-3 gap-2">
              {serviceOptions.map(({ icon: Icon, id, name }) => {
                const isSelected = selectedServices.includes(id);

                return (
                  <button
                    className={cn(
                      "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-sm transition-colors",
                      isSelected
                        ? "border-lime-500 bg-lime-100 text-slate-950"
                        : "border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white"
                    )}
                    key={id}
                    onClick={() => toggleService(id)}
                    type="button"
                  >
                    <Icon className="size-6" />
                    <span>{name}</span>
                  </button>
                );
              })}
            </div>
            {errors.services ? (
              <p className="text-sm text-rose-300">
                Select at least one service.
              </p>
            ) : null}
          </div>

          <div className="mt-5 space-y-2">
            <Label className="text-slate-600">Address</Label>
            <RadarAddressInput
              className="border-slate-200 bg-slate-50 text-slate-950 placeholder:text-slate-400 focus-visible:border-lime-500"
              error={errors.address}
              isValidated={isAddressValidated}
              onChange={handleAddressChange}
              onSelectSuggestion={handleAddressSelect}
              value={address}
            />
            {errors.address ? (
              <p className="text-sm text-rose-300">{errors.address}</p>
            ) : null}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-slate-600">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <input
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-950 outline-none focus:border-lime-500"
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setErrors((current) => ({ ...current, date: undefined }));
                  }}
                  type="date"
                  value={date}
                />
              </div>
              {errors.date ? (
                <p className="text-sm text-rose-300">{errors.date}</p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-600">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                <select
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-950 outline-none focus:border-lime-500"
                  onChange={(event) => setSelectedTimeSlot(event.target.value)}
                  value={selectedTimeSlot}
                >
                  {bookingTimeSlots.map((timeSlot) => (
                    <option key={timeSlot}>{timeSlot}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Button
            className="mt-6 h-12 w-full rounded-2xl bg-lime-300 text-base font-semibold text-slate-950 hover:bg-lime-200"
            type="submit"
          >
            Get quote
          </Button>
          <p className="mt-3 text-xs leading-5 text-slate-500">
            Pick services now. We will guide the exact details next.
          </p>
        </form>
      </div>
    </section>
  );
}
