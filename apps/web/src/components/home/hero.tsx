import { Button } from "@callcastlecare/ui/components/button";
import { Label } from "@callcastlecare/ui/components/label";
import { cn } from "@callcastlecare/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, Clock } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import LiveClock from "@/components/live-clock";
import { bookingTimeSlots, bookingWindowHours } from "@/lib/scheduling";
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
    <section className="relative min-h-screen overflow-hidden bg-[#080c16] pt-18">
      <div className="absolute inset-0">
        <img
          alt=""
          aria-hidden="true"
          className="size-full object-cover opacity-35"
          src="/callcastlecare/media/technician-van-night.png"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#080c16] via-[#080c16]/85 to-[#080c16]/55" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100svh-72px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_460px] lg:px-8">
        <div className="max-w-3xl space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/10 px-3 py-1 text-sm font-medium text-lime-200">
            <span className="size-2 rounded-full bg-lime-300" />
            Now serving Central Arkansas
          </div>

          <h1 className="text-5xl font-bold leading-tight text-white sm:text-6xl lg:text-7xl">
            Your castle deserves{" "}
            <span className="text-lime-300">royal care.</span>
          </h1>

          <p className="max-w-2xl text-lg leading-8 text-white/65">
            Professional lawn care, laundry, and window washing delivered with
            care. Book in seconds, relax for hours.
          </p>

          <ServiceAvailability />
        </div>

        <form
          className="rounded-3xl border border-white/10 bg-slate-950/75 p-5 shadow-2xl backdrop-blur"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-semibold text-white">Book a service</h2>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <LiveClock />
            <span className="rounded-full bg-white/[0.04] px-3 py-2 text-xs font-semibold text-white/45">
              {bookingWindowHours}-hour booking windows
            </span>
          </div>

          <div className="mt-5 space-y-3">
            <Label className="text-white/70">Services</Label>
            <div className="grid grid-cols-3 gap-2">
              {serviceOptions.map(({ icon: Icon, id, name }) => {
                const isSelected = selectedServices.includes(id);

                return (
                  <button
                    className={cn(
                      "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-sm transition-colors",
                      isSelected
                        ? "border-lime-300/50 bg-lime-300/10 text-lime-200"
                        : "border-white/10 bg-white/[0.04] text-white/60 hover:border-white/25"
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
            <Label className="text-white/70">Address</Label>
            <RadarAddressInput
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
              <Label className="text-white/70">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                <input
                  className="h-11 w-full rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-3 text-sm text-white outline-none focus:border-lime-300/50"
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
              <Label className="text-white/70">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                <select
                  className="h-11 w-full rounded-2xl border border-white/10 bg-[#111827] pl-10 pr-3 text-sm text-white outline-none focus:border-lime-300/50"
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
          <p className="mt-3 text-xs leading-5 text-white/45">
            Account setup, plan selection, and payment come next.
          </p>
        </form>
      </div>
    </section>
  );
}
