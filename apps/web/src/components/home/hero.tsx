import { Button } from "@callcastlecare/ui/components/button";
import { Label } from "@callcastlecare/ui/components/label";
import { cn } from "@callcastlecare/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import { Calendar, ChevronDown, Clock } from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

import {
  bookingTimeSlots,
  fetchBookingAvailability,
  isBookingTimeSlot,
} from "@/lib/scheduling";
import type { BookingTimeSlot } from "@/lib/scheduling";
import { serviceIdSchema, serviceOptions } from "@/lib/service-catalog";

import { RadarAddressInput } from "./radar-address-input";
import ServiceAvailability from "./service-availability";
import type { RadarAddressSuggestion } from "./use-radar-address-autocomplete";

const todayDateValue = () => new Date().toISOString().slice(0, 10);

const bookingSchema = z.object({
  address: z.string().min(5, "Enter a service address."),
  date: z
    .string()
    .min(1, "Choose a date.")
    .refine((value) => !value || value >= todayDateValue(), {
      message: "Choose today or a future date.",
    }),
  services: z.array(serviceIdSchema).min(1),
  timeSlot: z.enum(bookingTimeSlots, {
    message: "Choose one of the available time windows.",
  }),
});

type ServiceId = (typeof serviceOptions)[number]["id"];
type BookingErrors = Partial<
  Record<keyof z.infer<typeof bookingSchema>, string>
>;

export default function HeroSection() {
  const navigate = useNavigate({ from: "/" });
  const [selectedServices, setSelectedServices] = useState<ServiceId[]>([]);
  const [address, setAddress] = useState("");
  const [date, setDate] = useState("");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<BookingTimeSlot>(
    bookingTimeSlots[2] ?? "10:00 AM - 12:00 PM"
  );
  const [availableTimeSlots, setAvailableTimeSlots] = useState<
    BookingTimeSlot[]
  >([...bookingTimeSlots]);
  const [isAddressValidated, setIsAddressValidated] = useState(false);
  const [errors, setErrors] = useState<BookingErrors>({});

  useEffect(() => {
    let isCurrent = true;

    const loadAvailability = async () => {
      try {
        const availability = await fetchBookingAvailability(date);
        if (!isCurrent) {
          return;
        }

        setAvailableTimeSlots(availability.availableSlots);
        if (
          availability.nextAvailableSlot &&
          !availability.availableSlots.includes(selectedTimeSlot)
        ) {
          setSelectedTimeSlot(availability.nextAvailableSlot);
        }
      } catch {
        if (isCurrent) {
          setAvailableTimeSlots([...bookingTimeSlots]);
        }
      }
    };

    void loadAvailability();

    return () => {
      isCurrent = false;
    };
  }, [date, selectedTimeSlot]);

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
        step: "contact",
        timeSlot: result.data.timeSlot,
      },
      to: "/book",
    });
  };

  return (
    <section className="relative min-h-screen overflow-hidden bg-[#080c16] pt-20">
      <div className="absolute inset-x-0 bottom-0 top-20 hidden sm:block">
        <img
          alt=""
          aria-hidden="true"
          className="size-full object-cover object-center opacity-90"
          src="/callcastlecare/media/hero-workers-bg.jpg"
        />
        <div className="absolute inset-0 bg-slate-950/35" />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-slate-950/58 to-slate-950/20" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-slate-950/85 to-transparent" />
      </div>

      <div className="relative mx-auto grid min-h-[calc(100svh-80px)] max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_460px] lg:px-8">
        <div className="max-w-3xl space-y-7">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300/30 bg-lime-300/15 px-3 py-1 text-sm font-medium text-lime-100 shadow-lg shadow-lime-950/20">
            <span className="size-2 rounded-full bg-lime-300" />
            Now serving Arkansas
          </div>

          <h1 className="max-w-4xl text-pretty text-5xl font-black leading-tight text-white sm:text-6xl lg:text-7xl">
            Book home services like you book a ride.
          </h1>

          <p className="max-w-2xl text-lg leading-8 text-white/65">
            CallCastleCare brings vetted lawn care, laundry pickup, and window
            washing into one simple home service marketplace across Arkansas.
          </p>

          <ServiceAvailability />
        </div>

        <form
          className="rounded-3xl border border-white/15 bg-slate-950/80 p-5 text-white shadow-2xl shadow-slate-950/50 backdrop-blur-xl"
          onSubmit={handleSubmit}
        >
          <h2 className="text-lg font-bold text-white">Book a service</h2>

          <div className="mt-5 flex flex-col gap-3">
            <Label className="text-white/60">Services</Label>
            <div className="grid grid-cols-3 gap-2">
              {serviceOptions.map(({ icon: Icon, id, name }) => {
                const isSelected = selectedServices.includes(id);

                return (
                  <button
                    className={cn(
                      "flex min-h-24 flex-col items-center justify-center gap-2 rounded-2xl border p-3 text-sm transition-colors",
                      isSelected
                        ? "border-lime-400 bg-lime-400/15 text-lime-200"
                        : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20 hover:bg-white/[0.08]"
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

          <div className="mt-5 flex flex-col gap-2">
            <Label className="text-white/60">Address</Label>
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
            <div className="flex flex-col gap-2">
              <Label className="text-white/60">Date</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                <input
                  className="h-11 w-full appearance-none rounded-2xl border border-white/10 bg-white/[0.04] pl-10 pr-10 text-sm text-white outline-none focus:border-lime-300/50 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-0"
                  min={todayDateValue()}
                  onChange={(event) => {
                    setDate(event.target.value);
                    setErrors((current) => ({ ...current, date: undefined }));
                  }}
                  type="date"
                  value={date}
                />
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-white/45"
                />
              </div>
              {errors.date ? (
                <p className="text-sm text-rose-300">{errors.date}</p>
              ) : null}
            </div>

            <div className="flex flex-col gap-2">
              <Label className="text-white/60">Time</Label>
              <div className="relative">
                <Clock className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
                <select
                  className="h-11 w-full appearance-none truncate rounded-2xl border border-white/10 bg-slate-950 pl-10 pr-10 text-sm font-semibold text-white outline-none focus:border-lime-300/50"
                  onChange={(event) => {
                    if (isBookingTimeSlot(event.target.value)) {
                      setSelectedTimeSlot(event.target.value);
                    }
                  }}
                  value={selectedTimeSlot}
                >
                  {availableTimeSlots.length > 0 ? (
                    availableTimeSlots.map((timeSlot) => (
                      <option key={timeSlot}>{timeSlot}</option>
                    ))
                  ) : (
                    <option>No slots open</option>
                  )}
                </select>
                <ChevronDown
                  aria-hidden="true"
                  className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-lime-200"
                />
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
