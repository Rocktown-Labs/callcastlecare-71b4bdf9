import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import BookingWizard from "@/components/book/booking-wizard";
import type { BookingWizardAddress } from "@/components/book/booking-wizard";
import { getServerUrl } from "@/lib/server-url";

interface CustomerProfile {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

const getAddressLabel = (address: BookingWizardAddress) =>
  address.formattedAddress ??
  [address.street, address.city, address.state, address.zip]
    .filter(Boolean)
    .join(", ");

const DashboardBookRoute = () => {
  const [addresses, setAddresses] = useState<BookingWizardAddress[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadBookingContext = async () => {
      setIsLoading(true);
      const [addressesResponse, profileResponse] = await Promise.all([
        fetch(new URL("/api/v1/addresses", getServerUrl()), {
          credentials: "include",
        }),
        fetch(new URL("/api/v1/me/profile", getServerUrl()), {
          credentials: "include",
        }),
      ]);

      if (!active) {
        return;
      }

      if (addressesResponse.ok) {
        const payload = (await addressesResponse.json()) as {
          addresses?: BookingWizardAddress[];
        };
        setAddresses(payload.addresses ?? []);
      }

      if (profileResponse.ok) {
        const payload = (await profileResponse.json()) as {
          customer?: CustomerProfile;
        };
        setProfile(payload.customer ?? null);
      }

      setIsLoading(false);
    };

    const runLoadBookingContext = async () => {
      try {
        await loadBookingContext();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Booking details failed"
        );
        setIsLoading(false);
      }
    };

    void runLoadBookingContext();

    return () => {
      active = false;
    };
  }, []);

  const defaultAddress = addresses.find((address) => address.isDefault);
  const initialAddress = defaultAddress ?? addresses[0] ?? null;
  const contactName =
    [profile?.firstName, profile?.lastName].filter(Boolean).join(" ") || "";

  return (
    <main className="px-4 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-6">
        <section className="grid gap-3">
          <p className="text-xs font-black uppercase tracking-widest text-lime-700">
            Customer booking
          </p>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">
            Book from your account
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Pick a saved address or add a new one, then finish the same
            CastleCare quote flow with your account details already filled in.
          </p>
        </section>

        {isLoading ? (
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
            Loading your booking details...
          </div>
        ) : (
          <BookingWizard
            initialAddress={
              initialAddress ? getAddressLabel(initialAddress) : undefined
            }
            initialAddressId={initialAddress?.id ?? null}
            initialContact={{
              email: profile?.email ?? "",
              name: contactName,
              phone: profile?.phone ?? "",
              smsUpdates: true,
            }}
            initialServices={[]}
            savedAddresses={addresses}
          />
        )}
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_auth/dashboard/book")({
  component: DashboardBookRoute,
});
