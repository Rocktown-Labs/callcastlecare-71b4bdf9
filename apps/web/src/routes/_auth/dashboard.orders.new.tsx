import { Badge } from "@callcastlecare/ui/components/badge";
import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Home,
  MapPin,
  Plus,
  PlusCircle,
  Sparkles,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { RadarAddressInput } from "@/components/home/radar-address-input";
import type { RadarAddressSuggestion } from "@/components/home/use-radar-address-autocomplete";
import { getServerUrl } from "@/lib/server-url";

interface CustomerAddress {
  city: string;
  country: string;
  formattedAddress?: string | null;
  id: number;
  instructions?: string | null;
  isDefault: boolean;
  label: string;
  state: string;
  street: string;
  zip: string;
}

const serviceCatalog = [
  {
    description: "Mowing, edging, and blowing of standard residential lawn.",
    id: "lawncare",
    price: "$45",
    title: "Lawn Care",
  },
  {
    description: "Wash, fold, and door-to-door laundry pickup & delivery.",
    id: "laundry",
    price: "$35",
    title: "Laundry Service",
  },
  {
    description: "Exterior & interior window cleaning for sparkling glass.",
    id: "windows",
    price: "$60",
    title: "Window Washing",
  },
  {
    description: "Bi-weekly Lawn Care + Laundry pickup combo deal.",
    id: "royal-duo",
    price: "$135/mo",
    title: "Bi-Weekly Royal Duo",
  },
  {
    description: "Monthly Lawn Care + Laundry + Exterior Windows bundle.",
    id: "crown-trio",
    price: "$210/mo",
    title: "Crown Estate Trio",
  },
] as const;

const timeSlots = [
  "06:00 - 08:00 AM",
  "08:00 - 10:00 AM",
  "10:00 - 12:00 PM",
  "12:00 - 02:00 PM",
  "02:00 - 04:00 PM",
  "04:00 - 06:00 PM",
  "06:00 - 08:00 PM",
] as const;

const DashboardOrdersNewRoute = () => {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<number | null>(
    null
  );
  const [selectedServices, setSelectedServices] = useState<string[]>([
    "lawncare",
  ]);
  const [scheduledDate, setScheduledDate] = useState(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0] ?? "";
  });
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>(
    timeSlots[1]
  );
  const [checkoutOption, setCheckoutOption] = useState<"deposit" | "full">(
    "deposit"
  );
  const [grassHeight, setGrassHeight] = useState<"low" | "medium" | "tall">(
    "low"
  );
  const [withBedding, setWithBedding] = useState(false);
  const [stories, setStories] = useState<"1" | "2" | "3">("1");
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newStreet, setNewStreet] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("AR");
  const [newZip, setNewZip] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const loadAddresses = async () => {
      const response = await fetch(
        new URL("/api/v1/addresses", getServerUrl()),
        {
          credentials: "include",
        }
      );
      if (!(active && response.ok)) {
        setIsLoading(false);
        return;
      }
      const payload = (await response.json()) as {
        addresses?: CustomerAddress[];
      };
      const list = payload.addresses ?? [];
      setAddresses(list);
      const defaultAddr = list.find((addr) => addr.isDefault) ?? list[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
      setIsLoading(false);
    };

    void loadAddresses();

    return () => {
      active = false;
    };
  }, []);

  const toggleService = (id: string) => {
    setSelectedServices((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  };

  const handleSelectRadarSuggestion = (suggestion: RadarAddressSuggestion) => {
    const raw = suggestion.raw as Record<string, unknown> | undefined;
    const { label } = suggestion;

    setNewStreet(
      String(raw?.addressLine1 ?? raw?.street ?? label.split(",")[0] ?? "")
    );
    setNewCity(String(raw?.city ?? raw?.town ?? ""));
    setNewState(String(raw?.stateCode ?? raw?.state ?? "AR"));
    setNewZip(String(raw?.postalCode ?? ""));
  };

  const saveNewAddress = async () => {
    if (!newStreet) {
      toast.error("Please enter or select a valid address.");
      return;
    }

    const response = await fetch(new URL("/api/v1/addresses", getServerUrl()), {
      body: JSON.stringify({
        address: `${newStreet}, ${newCity}, ${newState} ${newZip}`,
        city: newCity,
        country: "US",
        formattedAddress: `${newStreet}, ${newCity}, ${newState} ${newZip}`,
        isDefault: addresses.length === 0,
        label: "Home",
        state: newState,
        street: newStreet,
        zip: newZip,
      }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!response.ok) {
      toast.error("Address could not be saved.");
      return;
    }

    const payload = (await response.json()) as { address: CustomerAddress };
    setAddresses((prev) => [payload.address, ...prev]);
    setSelectedAddressId(payload.address.id);
    setShowAddAddress(false);
    toast.success("New location added.");
  };

  const handleSubmitOrder = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedAddressId && !newStreet) {
      toast.error("Please select or add a service address.");
      return;
    }

    if (selectedServices.length === 0) {
      toast.error("Select at least one service.");
      return;
    }

    setIsSubmitting(true);

    const addressObj = addresses.find((a) => a.id === selectedAddressId);
    const orderPayload = {
      address: addressObj
        ? `${addressObj.street}, ${addressObj.city}, ${addressObj.state} ${addressObj.zip}`
        : `${newStreet}, ${newCity}, ${newState} ${newZip}`,
      checkoutOption,
      grassHeight,
      scheduledDate,
      selectedServices,
      stories,
      timeSlot: selectedTimeSlot,
      withBedding,
    };

    const response = await fetch(new URL("/api/v1/checkout", getServerUrl()), {
      body: JSON.stringify(orderPayload),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    setIsSubmitting(false);

    if (!response.ok) {
      toast.error("Failed to create order. Please try again.");
      return;
    }

    toast.success("Order created successfully!");
    await navigate({ to: "/dashboard/orders" });
  };

  return (
    <main className="px-4 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto grid max-w-4xl gap-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
            <PlusCircle className="size-4" />
            1-Click Authenticated Booking
          </div>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            Book New Service
          </h1>
          <p className="mt-2 text-slate-600">
            Select your service, choose from your saved locations, and pick a
            guaranteed 2-hour arrival window.
          </p>
        </section>

        <form
          className="grid gap-6"
          onSubmit={(event) => void handleSubmitOrder(event)}
        >
          {/* Step 1: Address Selection */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-xl font-black">
                <MapPin className="size-5 text-lime-600" />
                1. Service Location
              </h2>
              <Button
                className="rounded-full text-xs font-bold"
                onClick={() => setShowAddAddress((prev) => !prev)}
                size="sm"
                type="button"
                variant="outline"
              >
                <Plus className="size-3.5" />
                {showAddAddress ? "Select Existing" : "Add New Location"}
              </Button>
            </div>

            {showAddAddress ? (
              <div className="mt-4 grid gap-3 rounded-2xl border border-lime-300 bg-lime-50/50 p-4">
                <Label htmlFor="addressSearch">
                  Radar Address Autocomplete
                </Label>
                <RadarAddressInput
                  onChange={(val) => setNewStreet(val)}
                  onSelectSuggestion={handleSelectRadarSuggestion}
                  tone="light"
                  value={newStreet}
                />
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    onChange={(e) => setNewCity(e.target.value)}
                    placeholder="City"
                    value={newCity}
                  />
                  <Input
                    onChange={(e) => setNewState(e.target.value)}
                    placeholder="State"
                    value={newState}
                  />
                  <Input
                    onChange={(e) => setNewZip(e.target.value)}
                    placeholder="ZIP"
                    value={newZip}
                  />
                </div>
                <Button
                  className="mt-2 rounded-full bg-slate-950 text-white hover:bg-slate-800"
                  onClick={() => void saveNewAddress()}
                  type="button"
                >
                  Save & Use Location
                </Button>
              </div>
            ) : (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {addresses.map((address) => {
                  const isSelected = selectedAddressId === address.id;
                  return (
                    <button
                      className={`flex flex-col items-start rounded-2xl border p-4 text-left transition-all ${
                        isSelected
                          ? "border-2 border-lime-400 bg-lime-50/60 shadow-sm"
                          : "border-slate-200 bg-white hover:border-slate-300"
                      }`}
                      key={address.id}
                      onClick={() => setSelectedAddressId(address.id)}
                      type="button"
                    >
                      <div className="flex items-center gap-2">
                        <Home className="size-4 text-slate-700" />
                        <span className="font-bold text-slate-900">
                          {address.label}
                        </span>
                        {address.isDefault ? (
                          <Badge className="bg-lime-300 text-slate-950 text-[10px]">
                            Primary
                          </Badge>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs leading-5 text-slate-600">
                        {address.formattedAddress ??
                          `${address.street}, ${address.city}, ${address.state} ${address.zip}`}
                      </p>
                    </button>
                  );
                })}

                {addresses.length === 0 && !isLoading ? (
                  <p className="col-span-2 text-sm text-slate-500">
                    No addresses saved yet. Click &quot;Add New Location&quot;
                    above.
                  </p>
                ) : null}
              </div>
            )}
            {selectedServices.includes("windows") ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Label className="font-bold">
                  Window Washing: House Stories
                </Label>
                <div className="mt-2 flex gap-3">
                  {(["1", "2", "3"] as const).map((s) => (
                    <Button
                      className={`rounded-full ${
                        stories === s
                          ? "bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                      key={s}
                      onClick={() => setStories(s)}
                      type="button"
                      variant={stories === s ? "default" : "outline"}
                    >
                      {s} {s === "1" ? "Story" : "Stories"}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}
          </section>

          {/* Step 2: Service Selection */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 border-b border-slate-100 pb-4 text-xl font-black">
              <Sparkles className="size-5 text-lime-600" />
              2. Select Services & Custom Options
            </h2>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {serviceCatalog.map((service) => {
                const isSelected = selectedServices.includes(service.id);
                return (
                  <button
                    className={`flex items-start justify-between rounded-2xl border p-4 text-left transition-all ${
                      isSelected
                        ? "border-2 border-lime-400 bg-lime-50/60 shadow-sm"
                        : "border-slate-200 bg-white hover:border-slate-300"
                    }`}
                    key={service.id}
                    onClick={() => toggleService(service.id)}
                    type="button"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {service.title}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        {service.description}
                      </p>
                      <span className="mt-2 block font-black text-lime-700">
                        {service.price}
                      </span>
                    </div>
                    <CheckCircle2
                      className={`size-5 shrink-0 ${
                        isSelected ? "text-lime-600" : "text-slate-200"
                      }`}
                    />
                  </button>
                );
              })}
            </div>

            {/* Custom Options */}
            {selectedServices.includes("lawncare") ? (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <Label className="font-bold">Lawn Care: Grass Height</Label>
                <div className="mt-2 flex gap-3">
                  {(["low", "medium", "tall"] as const).map((h) => (
                    <Button
                      className={`rounded-full capitalize ${
                        grassHeight === h
                          ? "bg-slate-950 text-white"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                      key={h}
                      onClick={() => setGrassHeight(h)}
                      type="button"
                      variant={grassHeight === h ? "default" : "outline"}
                    >
                      {h}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {selectedServices.includes("laundry") ? (
              <div className="mt-4 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <span className="font-bold text-slate-900">
                    Include Bedding / Linens
                  </span>
                  <p className="text-xs text-slate-500">
                    Sheets, duvet covers, pillowcases
                  </p>
                </div>
                <Button
                  className={`rounded-full ${
                    withBedding
                      ? "bg-slate-950 text-white"
                      : "border-slate-200 bg-white text-slate-700"
                  }`}
                  onClick={() => setWithBedding((prev) => !prev)}
                  type="button"
                  variant={withBedding ? "default" : "outline"}
                >
                  {withBedding ? "Included" : "No bedding"}
                </Button>
              </div>
            ) : null}
          </section>

          {/* Step 3: Date & 2-Hour Window Slot */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 border-b border-slate-100 pb-4 text-xl font-black">
              <Calendar className="size-5 text-lime-600" />
              3. Service Date & Arrival Window
            </h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="datePicker">Preferred Service Date</Label>
                <Input
                  className="rounded-xl border-slate-200"
                  id="datePicker"
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  type="date"
                  value={scheduledDate}
                />
              </div>

              <div className="grid gap-2">
                <Label>Guaranteed 2-Hour Arrival Window</Label>
                <div className="grid grid-cols-2 gap-2">
                  {timeSlots.map((slot) => {
                    const isSelected = selectedTimeSlot === slot;
                    return (
                      <button
                        className={`flex items-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition-all ${
                          isSelected
                            ? "border-2 border-lime-400 bg-lime-100 text-slate-950"
                            : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                        }`}
                        key={slot}
                        onClick={() => setSelectedTimeSlot(slot)}
                        type="button"
                      >
                        <Clock className="size-3.5" />
                        {slot}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </section>

          {/* Step 4: Checkout Preference */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">4. Checkout Preference</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button
                className={`rounded-2xl border p-4 text-left transition-all ${
                  checkoutOption === "deposit"
                    ? "border-2 border-lime-400 bg-lime-50/60"
                    : "border-slate-200 bg-white"
                }`}
                onClick={() => setCheckoutOption("deposit")}
                type="button"
              >
                <span className="font-bold text-slate-900">
                  $50 Service Deposit
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  Pay $50 deposit now to lock in your window. Remaining balance
                  invoiced after completion.
                </p>
              </button>
              <button
                className={`rounded-2xl border p-4 text-left transition-all ${
                  checkoutOption === "full"
                    ? "border-2 border-lime-400 bg-lime-50/60"
                    : "border-slate-200 bg-white"
                }`}
                onClick={() => setCheckoutOption("full")}
                type="button"
              >
                <span className="font-bold text-slate-900">
                  Pay Full Amount Today
                </span>
                <p className="mt-1 text-xs text-slate-500">
                  Pay total today with instant confirmation & priority route
                  dispatch.
                </p>
              </button>
            </div>

            <Button
              className="mt-6 h-12 w-full rounded-full bg-lime-300 font-bold text-slate-950 hover:bg-lime-200"
              disabled={isSubmitting}
              type="submit"
            >
              Confirm Order & Reserve Arrival Window
            </Button>
          </section>
        </form>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_auth/dashboard/orders/new")({
  component: DashboardOrdersNewRoute,
});
