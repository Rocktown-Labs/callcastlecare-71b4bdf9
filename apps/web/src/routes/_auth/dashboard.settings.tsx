import { Badge } from "@callcastlecare/ui/components/badge";
import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import { Textarea } from "@callcastlecare/ui/components/textarea";
import { createFileRoute, useBlocker } from "@tanstack/react-router";
import {
  Check,
  Home,
  MapPin,
  Plus,
  Save,
  Settings,
  Star,
  Trash2,
  X,
} from "lucide-react";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { RadarAddressInput } from "@/components/home/radar-address-input";
import type { RadarAddressSuggestion } from "@/components/home/use-radar-address-autocomplete";
import { getServerUrl } from "@/lib/server-url";

interface CustomerProfile {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
}

interface CustomerAddress {
  city: string;
  country: string;
  formattedAddress?: string | null;
  id: number;
  instructions?: string | null;
  isDefault: boolean;
  isValidated: boolean;
  label: string;
  state: string;
  street: string;
  zip: string;
}

const emptyAddressForm = {
  addressText: "",
  city: "",
  formattedAddress: "",
  instructions: "",
  isDefault: false,
  label: "Home",
  state: "AR",
  street: "",
  zip: "",
};

const DashboardSettingsRoute = () => {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [profileForm, setProfileForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });
  const [addressForm, setAddressForm] = useState(emptyAddressForm);
  const [showAddForm, setShowAddForm] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const blocker = useBlocker({
    enableBeforeUnload: isDirty,
    shouldBlockFn: () => isDirty,
    withResolver: true,
  });

  useEffect(() => {
    let active = true;

    const loadSettings = async () => {
      const [profileResponse, addressesResponse] = await Promise.all([
        fetch(new URL("/api/v1/me/profile", getServerUrl()), {
          credentials: "include",
        }),
        fetch(new URL("/api/v1/addresses", getServerUrl()), {
          credentials: "include",
        }),
      ]);

      if (!active) {
        return;
      }

      if (profileResponse.ok) {
        const payload = (await profileResponse.json()) as {
          customer?: CustomerProfile;
        };
        const customer = payload.customer ?? null;
        setProfile(customer);
        setProfileForm({
          firstName: customer?.firstName ?? "",
          lastName: customer?.lastName ?? "",
          phone: customer?.phone ?? "",
        });
      }

      if (addressesResponse.ok) {
        const payload = (await addressesResponse.json()) as {
          addresses?: CustomerAddress[];
        };
        setAddresses(payload.addresses ?? []);
      }

      setIsLoading(false);
    };

    const runLoadSettings = async () => {
      try {
        await loadSettings();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Settings failed to load"
        );
        setIsLoading(false);
      }
    };

    void runLoadSettings();

    return () => {
      active = false;
    };
  }, []);

  const updateProfileField = (
    field: keyof typeof profileForm,
    value: string
  ) => {
    setProfileForm((current) => ({ ...current, [field]: value }));
    setIsDirty(true);
  };

  const updateAddressField = (
    field: keyof typeof addressForm,
    value: string
  ) => {
    setAddressForm((current) => ({ ...current, [field]: value }));
    setIsDirty(true);
  };

  const handleSelectRadarSuggestion = (suggestion: RadarAddressSuggestion) => {
    const raw = suggestion.raw as Record<string, unknown> | undefined;
    const addressStr = suggestion.label;

    setAddressForm((current) => ({
      ...current,
      addressText: addressStr,
      city: String(raw?.city ?? raw?.town ?? current.city ?? ""),
      formattedAddress: addressStr,
      state: String(raw?.stateCode ?? raw?.state ?? current.state ?? "AR"),
      street: String(
        raw?.addressLine1 ?? raw?.street ?? addressStr.split(",")[0] ?? ""
      ),
      zip: String(raw?.postalCode ?? current.zip ?? ""),
    }));
    setIsDirty(true);
    toast.success("Address filled from suggestion");
  };

  const primaryAddress = useMemo(
    () => addresses.find((addr) => addr.isDefault) ?? addresses[0] ?? null,
    [addresses]
  );

  const secondaryAddresses = useMemo(
    () => addresses.filter((addr) => addr.id !== primaryAddress?.id),
    [addresses, primaryAddress]
  );

  const needsOnboarding = useMemo(() => {
    if (!profile) {
      return false;
    }
    return !profile.phone || addresses.length === 0;
  }, [profile, addresses]);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const response = await fetch(
      new URL("/api/v1/me/profile", getServerUrl()),
      {
        body: JSON.stringify(profileForm),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      }
    );

    setIsSaving(false);

    if (!response.ok) {
      toast.error("Profile could not be saved.");
      return;
    }

    const payload = (await response.json()) as { customer: CustomerProfile };
    setProfile(payload.customer);
    setIsDirty(false);
    toast.success("Profile contact details saved.");
  };

  const addAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);

    const payloadBody = {
      address:
        addressForm.addressText ||
        addressForm.street ||
        addressForm.formattedAddress,
      city: addressForm.city,
      country: "US",
      formattedAddress: addressForm.formattedAddress || addressForm.street,
      instructions: addressForm.instructions || null,
      isDefault: addresses.length === 0 ? true : addressForm.isDefault,
      label: addressForm.label || "Home",
      state: addressForm.state,
      street: addressForm.street,
      zip: addressForm.zip,
    };

    const response = await fetch(new URL("/api/v1/addresses", getServerUrl()), {
      body: JSON.stringify(payloadBody),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    setIsSaving(false);

    if (!response.ok) {
      toast.error(
        "Address could not be saved. Please check the address fields."
      );
      return;
    }

    const payload = (await response.json()) as { address: CustomerAddress };
    setAddresses((current) => [payload.address, ...current]);
    setAddressForm(emptyAddressForm);
    setShowAddForm(false);
    setIsDirty(false);
    toast.success("Address saved successfully!");
  };

  const setDefaultAddress = async (addressId: number) => {
    const response = await fetch(
      new URL(`/api/v1/addresses/${addressId}/default`, getServerUrl()),
      {
        credentials: "include",
        method: "POST",
      }
    );

    if (!response.ok) {
      toast.error("Default address could not be updated.");
      return;
    }

    setAddresses((current) =>
      current.map((address) => ({
        ...address,
        isDefault: address.id === addressId,
      }))
    );
    toast.success("Primary address updated.");
  };

  const deleteAddress = async (addressId: number) => {
    const response = await fetch(
      new URL(`/api/v1/addresses/${addressId}`, getServerUrl()),
      {
        credentials: "include",
        method: "DELETE",
      }
    );

    if (!response.ok) {
      toast.error("Address could not be deleted.");
      return;
    }

    setAddresses((current) =>
      current.filter((address) => address.id !== addressId)
    );
    toast.success("Address removed.");
  };

  return (
    <main className="px-4 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto grid max-w-5xl gap-6">
        {/* Header Section */}
        <section className="grid gap-3 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
            <Settings className="size-4" />
            Customer settings
          </div>
          <h1 className="text-3xl font-black tracking-tight md:text-5xl">
            Account & Service Addresses
          </h1>
          <p className="max-w-2xl text-base leading-7 text-slate-600">
            Manage your contact details and saved home service locations for
            instant 1-click booking.
          </p>
        </section>

        {needsOnboarding && !isLoading ? (
          <section className="rounded-3xl border border-lime-300 bg-lime-50 p-5">
            <Badge className="bg-lime-300 text-slate-950">Setup needed</Badge>
            <h2 className="mt-3 text-xl font-black">
              Complete your account profile
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Add your phone number and at least one primary service address so
              orders can be dispatched to your location.
            </p>
          </section>
        ) : null}

        {blocker.status === "blocked" ? (
          <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Unsaved changes</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Save your settings before leaving, or discard the edits and
              continue.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button
                className="rounded-full border-slate-200"
                onClick={() => blocker.reset()}
                type="button"
                variant="outline"
              >
                Stay here
              </Button>
              <Button
                className="rounded-full bg-slate-950 text-white hover:bg-slate-800"
                onClick={() => {
                  setIsDirty(false);
                  blocker.proceed();
                }}
                type="button"
              >
                Discard changes
              </Button>
            </div>
          </section>
        ) : null}

        {isLoading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center font-bold text-slate-500">
            Loading settings...
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            {/* Contact Form */}
            <form
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              onSubmit={(event) => void saveProfile(event)}
            >
              <h2 className="text-xl font-black">Contact Profile</h2>
              <p className="mt-1 text-sm text-slate-500">{profile?.email}</p>
              <div className="mt-5 grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    className="rounded-xl border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-lime-400"
                    id="firstName"
                    onChange={(event) =>
                      updateProfileField("firstName", event.target.value)
                    }
                    value={profileForm.firstName}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    className="rounded-xl border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-lime-400"
                    id="lastName"
                    onChange={(event) =>
                      updateProfileField("lastName", event.target.value)
                    }
                    value={profileForm.lastName}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="phone">Phone number</Label>
                  <Input
                    className="rounded-xl border-slate-200 text-slate-900 focus-visible:ring-2 focus-visible:ring-lime-400"
                    id="phone"
                    onChange={(event) =>
                      updateProfileField("phone", event.target.value)
                    }
                    placeholder="(501) 555-0199"
                    value={profileForm.phone}
                  />
                </div>
              </div>
              <Button
                className="mt-6 h-11 w-full rounded-full bg-lime-300 font-bold text-slate-950 hover:bg-lime-200"
                disabled={isSaving}
                type="submit"
              >
                <Save className="size-4" />
                Save contact details
              </Button>
            </form>

            {/* Saved Addresses Section */}
            <section className="grid gap-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-xl font-black text-slate-950">
                  Service Locations
                </h2>
                <Button
                  className="rounded-full bg-slate-950 font-bold text-white hover:bg-slate-800"
                  onClick={() => setShowAddForm((prev) => !prev)}
                  type="button"
                >
                  {showAddForm ? (
                    <>
                      <X className="size-4" />
                      Close Form
                    </>
                  ) : (
                    <>
                      <Plus className="size-4" />
                      Add New Address
                    </>
                  )}
                </Button>
              </div>

              {/* Inline Add Address Modal/Collapsible Card */}
              {showAddForm ? (
                <form
                  className="rounded-3xl border border-lime-300/80 bg-lime-50/50 p-6 shadow-md"
                  onSubmit={(event) => void addAddress(event)}
                >
                  <div className="flex items-center justify-between border-b border-lime-200/60 pb-3">
                    <h3 className="text-lg font-black text-slate-900">
                      Add Service Location
                    </h3>
                    <Badge className="bg-lime-300 text-slate-950">
                      Radar Verified
                    </Badge>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor="addressSearch">
                        Search Address (Autocomplete after 7 chars)
                      </Label>
                      <RadarAddressInput
                        onChange={(val) => updateAddressField("street", val)}
                        onSelectSuggestion={handleSelectRadarSuggestion}
                        tone="light"
                        value={addressForm.street}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="label">Location Label</Label>
                      <Input
                        className="rounded-xl bg-white text-slate-900"
                        id="label"
                        onChange={(event) =>
                          updateAddressField("label", event.target.value)
                        }
                        placeholder="Home, Work, Vacation..."
                        value={addressForm.label}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="city">City</Label>
                      <Input
                        className="rounded-xl bg-white text-slate-900"
                        id="city"
                        onChange={(event) =>
                          updateAddressField("city", event.target.value)
                        }
                        value={addressForm.city}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="state">State</Label>
                      <Input
                        className="rounded-xl bg-white text-slate-900"
                        id="state"
                        onChange={(event) =>
                          updateAddressField("state", event.target.value)
                        }
                        value={addressForm.state}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="zip">ZIP Code</Label>
                      <Input
                        className="rounded-xl bg-white text-slate-900"
                        id="zip"
                        onChange={(event) =>
                          updateAddressField("zip", event.target.value)
                        }
                        value={addressForm.zip}
                      />
                    </div>
                    <div className="grid gap-2 md:col-span-2">
                      <Label htmlFor="instructions">
                        Access Notes / Gate Code (Optional)
                      </Label>
                      <Textarea
                        className="rounded-xl bg-white text-slate-900"
                        id="instructions"
                        onChange={(event) =>
                          updateAddressField("instructions", event.target.value)
                        }
                        placeholder="Side gate code is 1234, watch for dog..."
                        value={addressForm.instructions}
                      />
                    </div>
                  </div>

                  <div className="mt-5 flex gap-3">
                    <Button
                      className="h-11 flex-1 rounded-full bg-slate-950 font-bold text-white hover:bg-slate-800"
                      disabled={isSaving}
                      type="submit"
                    >
                      <Save className="size-4" />
                      Save Address
                    </Button>
                    <Button
                      className="h-11 rounded-full border-slate-300"
                      onClick={() => setShowAddForm(false)}
                      type="button"
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : null}

              {/* Primary Address */}
              {primaryAddress ? (
                <article className="rounded-3xl border-2 border-lime-400 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <Home className="size-5 text-lime-600" />
                        <h3 className="text-lg font-black">
                          {primaryAddress.label}
                        </h3>
                        <Badge className="bg-lime-300 font-bold text-slate-950">
                          <Star className="mr-1 size-3 fill-slate-950 text-slate-950" />
                          Primary Location
                        </Badge>
                      </div>
                      <p className="mt-2 text-base font-medium text-slate-800">
                        {primaryAddress.formattedAddress ??
                          `${primaryAddress.street}, ${primaryAddress.city}, ${primaryAddress.state} ${primaryAddress.zip}`}
                      </p>
                      {primaryAddress.instructions ? (
                        <p className="mt-1 text-xs text-slate-500">
                          Notes: {primaryAddress.instructions}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </article>
              ) : null}

              {/* Secondary Addresses List */}
              <div className="grid gap-3">
                {secondaryAddresses.map((address) => (
                  <article
                    className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-colors hover:border-slate-300"
                    key={address.id}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <MapPin className="size-4 text-slate-500" />
                          <h3 className="font-black text-slate-900">
                            {address.label}
                          </h3>
                        </div>
                        <p className="mt-1 text-sm text-slate-600">
                          {address.formattedAddress ??
                            `${address.street}, ${address.city}, ${address.state} ${address.zip}`}
                        </p>
                        {address.instructions ? (
                          <p className="mt-1 text-xs text-slate-400">
                            Notes: {address.instructions}
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          className="h-9 rounded-full border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-100"
                          onClick={() => void setDefaultAddress(address.id)}
                          type="button"
                          variant="outline"
                        >
                          <Check className="size-3.5" />
                          Make Primary
                        </Button>
                        <Button
                          className="h-9 rounded-full border-rose-200 text-xs font-bold text-rose-600 hover:bg-rose-50"
                          onClick={() => void deleteAddress(address.id)}
                          type="button"
                          variant="outline"
                        >
                          <Trash2 className="size-3.5" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              {addresses.length === 0 && !showAddForm ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
                  <MapPin className="mx-auto size-8 text-slate-400" />
                  <p className="mt-2 text-sm font-bold text-slate-600">
                    No service locations saved yet
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Add an address above to start booking service.
                  </p>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_auth/dashboard/settings")({
  component: DashboardSettingsRoute,
});
