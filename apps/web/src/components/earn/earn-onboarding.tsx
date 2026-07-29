import {
  formatUsPhoneInput,
  phoneSchema,
} from "@callcastlecare/api/validation";
import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import { Textarea } from "@callcastlecare/ui/components/textarea";
import { cn } from "@callcastlecare/ui/lib/utils";
import { useNavigate } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  BriefcaseBusiness,
  Car,
  Check,
  ClipboardList,
  Crown,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  User,
} from "lucide-react";
import type { ChangeEvent, FormEvent } from "react";
import { useMemo, useState } from "react";
import { z } from "zod";

const storageKey = "callcastlecare.provider-application.v1";
const maxVehicleYear = new Date().getFullYear() + 1;

const providerServices = [
  {
    description: "Mowing, edging, trimming, and cleanup.",
    id: "lawncare",
    label: "Lawn Care",
  },
  {
    description: "Pickup, delivery, wash and fold, and bedding support.",
    id: "laundry",
    label: "Laundry",
  },
  {
    description: "Exterior and interior glass service.",
    id: "window-washing",
    label: "Window Washing",
  },
] as const;

const steps = [
  { icon: User, id: "contact", label: "Contact" },
  { icon: BriefcaseBusiness, id: "services", label: "Jobs" },
  { icon: Car, id: "vehicle", label: "Vehicle" },
  { icon: Crown, id: "plan", label: "Plan" },
] as const;

const planOptions = [
  {
    description:
      "Join the provider queue, track your review status, and continue setup from the dashboard.",
    id: "free",
    label: "Standard Provider",
    price: "Free",
    split: "60 / 40",
  },
  {
    description:
      "One-time provider setup upgrade for priority review, Pro status, and a stronger starting split.",
    id: "pro",
    label: "CastleCare Pro",
    price: "$50",
    split: "70 / 30",
  },
] as const;

type StepId = (typeof steps)[number]["id"];
type ProviderServiceId = (typeof providerServices)[number]["id"];
type ProviderPlan = (typeof planOptions)[number]["id"];

interface ProviderApplicationDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  streetAddress: string;
  city: string;
  state: string;
  zip: string;
  services: ProviderServiceId[];
  canDoAllServices: boolean;
  serviceNotes: string;
  hasVehicle: boolean;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: string;
  vehicleColor: string;
  licensePlate: string;
  vin: string;
  serviceRadiusMiles: string;
  weeklyAvailability: string;
  plan: ProviderPlan;
}

const initialDraft: ProviderApplicationDraft = {
  canDoAllServices: false,
  city: "",
  email: "",
  firstName: "",
  hasVehicle: true,
  lastName: "",
  licensePlate: "",
  phone: "",
  plan: "free",
  serviceNotes: "",
  serviceRadiusMiles: "20",
  services: [],
  state: "AR",
  streetAddress: "",
  vehicleColor: "",
  vehicleMake: "",
  vehicleModel: "",
  vehicleYear: "",
  vin: "",
  weeklyAvailability: "",
  zip: "",
};

const serviceSchema = z
  .array(z.enum(["lawncare", "laundry", "window-washing"]))
  .min(1, "Select at least one job type.");

const contactSchema = z.object({
  city: z.string().trim().min(2, "Enter your city."),
  email: z.string().trim().email("Enter a valid email."),
  firstName: z.string().trim().min(1, "Enter your first name."),
  lastName: z.string().trim().min(1, "Enter your last name."),
  phone: phoneSchema,
  state: z.string().trim().length(2, "Use the two-letter state code."),
  streetAddress: z.string().trim().min(5, "Enter your street address."),
  zip: z
    .string()
    .trim()
    .regex(/^\d{5}$/u, "Enter a 5-digit ZIP code."),
});

const servicesSchema = z.object({
  serviceNotes: z.string().trim().max(600).optional(),
  services: serviceSchema,
});

const vehicleSchema = z
  .object({
    hasVehicle: z.boolean(),
    licensePlate: z.string().trim(),
    serviceRadiusMiles: z
      .string()
      .trim()
      .regex(/^\d+$/u, "Enter a service radius.")
      .refine((value) => Number(value) >= 5 && Number(value) <= 100, {
        message: "Use a radius from 5 to 100 miles.",
      }),
    vehicleColor: z.string().trim(),
    vehicleMake: z.string().trim(),
    vehicleModel: z.string().trim(),
    vehicleYear: z
      .string()
      .trim()
      .regex(/^\d{4}$/u, "Enter a 4-digit year.")
      .refine(
        (value) => {
          const year = Number(value);
          return year >= 1980 && year <= maxVehicleYear;
        },
        { message: `Use a year from 1980 to ${maxVehicleYear}.` }
      ),
    vin: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-HJ-NPR-Z0-9]{17}$/u, "Enter a valid 17-character VIN."),
    weeklyAvailability: z
      .string()
      .trim()
      .min(10, "Tell us when you can usually work.")
      .max(600),
  })
  .superRefine((value, context) => {
    if (!value.hasVehicle) {
      return;
    }

    const requiredVehicleFields = [
      ["vehicleMake", "Enter the vehicle make."],
      ["vehicleModel", "Enter the vehicle model."],
      ["vehicleColor", "Enter the vehicle color."],
      ["licensePlate", "Enter the license plate."],
    ] as const;

    for (const [field, message] of requiredVehicleFields) {
      if (!value[field]) {
        context.addIssue({
          code: "custom",
          message,
          path: [field],
        });
      }
    }
  });

const planSchema = z.object({
  plan: z.enum(["free", "pro"]),
});

const fullApplicationSchema = vehicleSchema.safeExtend({
  ...contactSchema.shape,
  ...planSchema.shape,
  ...servicesSchema.shape,
});

type FieldErrors = Partial<Record<keyof ProviderApplicationDraft, string>>;

const getStepIndex = (step: StepId) =>
  steps.findIndex((stepItem) => stepItem.id === step);

const getFlattenedErrors = (result: z.SafeParseReturnType<unknown, unknown>) =>
  result.success
    ? {}
    : Object.fromEntries(
        Object.entries(result.error.flatten().fieldErrors).map(
          ([field, messages]) => [field, messages?.[0] ?? "Check this field."]
        )
      );

const getStepErrors = (
  step: StepId,
  draft: ProviderApplicationDraft
): FieldErrors => {
  if (step === "contact") {
    return getFlattenedErrors(contactSchema.safeParse(draft)) as FieldErrors;
  }

  if (step === "services") {
    return getFlattenedErrors(servicesSchema.safeParse(draft)) as FieldErrors;
  }

  if (step === "vehicle") {
    return getFlattenedErrors(vehicleSchema.safeParse(draft)) as FieldErrors;
  }

  return getFlattenedErrors(planSchema.safeParse(draft)) as FieldErrors;
};

const FieldError = ({ children }: { children?: string }) =>
  children ? (
    <p className="mt-2 text-xs font-medium text-red-200">{children}</p>
  ) : null;

const WizardInput = ({
  error,
  icon: Icon,
  label,
  ...props
}: React.ComponentProps<typeof Input> & {
  error?: string;
  icon: LucideIcon;
  label: string;
}) => (
  <div>
    <Label className="text-white/72" htmlFor={props.id}>
      {label}
    </Label>
    <div className="relative mt-2">
      <Icon
        aria-hidden="true"
        className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35"
      />
      <Input
        {...props}
        className={cn(
          "h-11 border-white/10 bg-white/[0.06] pl-10 text-white placeholder:text-white/30",
          error && "border-red-300/60"
        )}
      />
    </div>
    <FieldError>{error}</FieldError>
  </div>
);

export default function EarnOnboarding() {
  const navigate = useNavigate({ from: "/earn" });
  const [activeStep, setActiveStep] = useState<StepId>("contact");
  const [draft, setDraft] = useState<ProviderApplicationDraft>(initialDraft);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeStepIndex = getStepIndex(activeStep);
  const selectedPlan = useMemo(
    () =>
      planOptions.find((option) => option.id === draft.plan) ?? planOptions[0],
    [draft.plan]
  );

  const updateDraft = <Key extends keyof ProviderApplicationDraft>(
    key: Key,
    value: ProviderApplicationDraft[Key]
  ) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const { [key]: _removed, ...next } = current;
      return next;
    });
  };

  const updateTextField =
    (key: keyof ProviderApplicationDraft) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      updateDraft(key, event.target.value as never);
    };

  const updatePhone = (event: ChangeEvent<HTMLInputElement>) => {
    updateDraft("phone", formatUsPhoneInput(event.target.value));
  };

  const toggleService = (serviceId: ProviderServiceId) => {
    setDraft((current) => {
      const hasService = current.services.includes(serviceId);
      const services = hasService
        ? current.services.filter((id) => id !== serviceId)
        : [...current.services, serviceId];

      return {
        ...current,
        canDoAllServices: services.length === providerServices.length,
        services,
      };
    });
    setErrors((current) => ({ ...current, services: undefined }));
  };

  const toggleAllServices = () => {
    const allServices = providerServices.map(({ id }) => id);
    setDraft((current) => ({
      ...current,
      canDoAllServices: !current.canDoAllServices,
      services: current.canDoAllServices ? [] : allServices,
    }));
    setErrors((current) => ({ ...current, services: undefined }));
  };

  const goToStep = (step: StepId) => {
    if (getStepIndex(step) <= activeStepIndex) {
      setActiveStep(step);
      setErrors({});
    }
  };

  const goNext = () => {
    const nextErrors = getStepErrors(activeStep, draft);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    const nextStep = steps[activeStepIndex + 1];
    if (nextStep) {
      setErrors({});
      setActiveStep(nextStep.id);
    }
  };

  const goBack = () => {
    const previousStep = steps[activeStepIndex - 1];
    if (previousStep) {
      setErrors({});
      setActiveStep(previousStep.id);
    }
  };

  const submitApplication = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const result = fullApplicationSchema.safeParse(draft);

    if (!result.success) {
      const nextErrors = getFlattenedErrors(result) as FieldErrors;
      setErrors(nextErrors);
      const firstErrorStep = steps.find(({ id }) =>
        Object.keys(getStepErrors(id, draft)).some((key) => key in nextErrors)
      );

      if (firstErrorStep) {
        setActiveStep(firstErrorStep.id);
      }

      return;
    }

    setIsSubmitting(true);

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(storageKey, JSON.stringify(result.data));
    }

    await navigate({
      search: {
        intent: "earn",
        plan: result.data.plan,
        role: "staff",
      },
      to: "/sign-up",
    });
  };

  return (
    <section className="border-t border-white/5 bg-[#080c16] py-20" id="apply">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:px-8">
        <div className="self-start">
          <p className="text-sm font-bold uppercase text-lime-300">
            Provider onboarding
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Start the application before the heavy paperwork.
          </h2>
          <p className="mt-4 text-base leading-7 text-white/62">
            We collect the basics now: who you are, where you can work, the jobs
            you want, and the vehicle details needed for local dispatch. The
            remaining identity, driving, payment, and quality steps happen after
            your account is created.
          </p>

          <div className="mt-8 grid gap-3">
            {[
              {
                icon: ClipboardList,
                text: "Manual review is supported until provider volume justifies deeper automation.",
              },
              {
                icon: BadgeCheck,
                text: "Free applicants land in a dashboard holding stage with review status and next steps.",
              },
              {
                icon: ShieldCheck,
                text: "CastleCare Pro starts the same flow with priority setup and a one-time $50 upgrade.",
              },
            ].map(({ icon: Icon, text }) => (
              <div
                className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-white/70"
                key={text}
              >
                <Icon
                  aria-hidden="true"
                  className="mt-0.5 size-5 text-lime-300"
                />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <form
          className="rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-2xl shadow-black/25 sm:p-6"
          onSubmit={submitApplication}
        >
          <div className="grid grid-cols-4 gap-2 rounded-3xl border border-white/10 bg-[#080c16] p-2">
            {steps.map(({ icon: Icon, id, label }, index) => {
              const isActive = id === activeStep;
              const isComplete = index < activeStepIndex;

              return (
                <button
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center rounded-2xl px-2 text-xs font-bold text-white/40 transition-colors",
                    isActive && "bg-lime-300 text-slate-950",
                    isComplete && "text-lime-200 hover:bg-white/10"
                  )}
                  disabled={index > activeStepIndex}
                  key={id}
                  onClick={() => goToStep(id)}
                  type="button"
                >
                  {isComplete ? (
                    <Check aria-hidden="true" className="mb-1 size-4" />
                  ) : (
                    <Icon aria-hidden="true" className="mb-1 size-4" />
                  )}
                  {label}
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            {activeStep === "contact" ? (
              <div className="grid gap-4 sm:grid-cols-2">
                <WizardInput
                  error={errors.firstName}
                  icon={User}
                  id="provider-first-name"
                  label="First name"
                  onChange={updateTextField("firstName")}
                  value={draft.firstName}
                />
                <WizardInput
                  error={errors.lastName}
                  icon={User}
                  id="provider-last-name"
                  label="Last name"
                  onChange={updateTextField("lastName")}
                  value={draft.lastName}
                />
                <WizardInput
                  error={errors.email}
                  icon={Mail}
                  id="provider-email"
                  label="Email"
                  onChange={updateTextField("email")}
                  type="email"
                  value={draft.email}
                />
                <WizardInput
                  error={errors.phone}
                  icon={Phone}
                  id="provider-phone"
                  inputMode="tel"
                  label="Phone"
                  onChange={updatePhone}
                  placeholder="(501)-827-1551"
                  value={draft.phone}
                />
                <div className="sm:col-span-2">
                  <WizardInput
                    error={errors.streetAddress}
                    icon={MapPin}
                    id="provider-address"
                    label="Street address"
                    onChange={updateTextField("streetAddress")}
                    value={draft.streetAddress}
                  />
                </div>
                <WizardInput
                  error={errors.city}
                  icon={MapPin}
                  id="provider-city"
                  label="City"
                  onChange={updateTextField("city")}
                  value={draft.city}
                />
                <div className="grid grid-cols-[0.65fr_1fr] gap-3">
                  <WizardInput
                    error={errors.state}
                    icon={MapPin}
                    id="provider-state"
                    label="State"
                    maxLength={2}
                    onChange={(event) =>
                      updateDraft("state", event.target.value.toUpperCase())
                    }
                    value={draft.state}
                  />
                  <WizardInput
                    error={errors.zip}
                    icon={MapPin}
                    id="provider-zip"
                    inputMode="numeric"
                    label="ZIP"
                    maxLength={5}
                    onChange={updateTextField("zip")}
                    value={draft.zip}
                  />
                </div>
              </div>
            ) : null}

            {activeStep === "services" ? (
              <div className="grid gap-5">
                <button
                  className={cn(
                    "flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left text-white transition-colors",
                    draft.canDoAllServices &&
                      "border-lime-300/60 bg-lime-300/10"
                  )}
                  onClick={toggleAllServices}
                  type="button"
                >
                  <span>
                    <span className="block font-bold">
                      I can do all active services
                    </span>
                    <span className="mt-1 block text-sm text-white/55">
                      Lawn Care, laundry, and Window Washing.
                    </span>
                  </span>
                  <span
                    className={cn(
                      "flex size-6 items-center justify-center rounded-full border border-white/20",
                      draft.canDoAllServices &&
                        "border-lime-300 bg-lime-300 text-slate-950"
                    )}
                  >
                    {draft.canDoAllServices ? (
                      <Check aria-hidden="true" className="size-4" />
                    ) : null}
                  </span>
                </button>

                <div className="grid gap-3 md:grid-cols-3">
                  {providerServices.map(({ description, id, label }) => {
                    const isSelected = draft.services.includes(id);

                    return (
                      <button
                        className={cn(
                          "min-h-32 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left transition-colors",
                          isSelected && "border-lime-300/60 bg-lime-300/10"
                        )}
                        key={id}
                        onClick={() => toggleService(id)}
                        type="button"
                      >
                        <span className="flex items-center justify-between">
                          <span className="font-bold text-white">{label}</span>
                          <span
                            className={cn(
                              "flex size-6 items-center justify-center rounded-full border border-white/20 text-slate-950",
                              isSelected && "border-lime-300 bg-lime-300"
                            )}
                          >
                            {isSelected ? (
                              <Check aria-hidden="true" className="size-4" />
                            ) : null}
                          </span>
                        </span>
                        <span className="mt-3 block text-sm leading-6 text-white/55">
                          {description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FieldError>{errors.services}</FieldError>

                <div>
                  <Label
                    className="text-white/72"
                    htmlFor="provider-service-notes"
                  >
                    Notes, tools, or experience
                  </Label>
                  <Textarea
                    className="mt-2 min-h-28 border-white/10 bg-white/[0.06] text-white placeholder:text-white/30"
                    id="provider-service-notes"
                    onChange={updateTextField("serviceNotes")}
                    placeholder="Tell us what you have, what you prefer, and anything we should know before dispatch."
                    value={draft.serviceNotes}
                  />
                  <FieldError>{errors.serviceNotes}</FieldError>
                </div>
              </div>
            ) : null}

            {activeStep === "vehicle" ? (
              <div className="grid gap-4">
                <button
                  className={cn(
                    "flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left text-white transition-colors",
                    draft.hasVehicle && "border-lime-300/60 bg-lime-300/10"
                  )}
                  onClick={() => updateDraft("hasVehicle", !draft.hasVehicle)}
                  type="button"
                >
                  <span>
                    <span className="block font-bold">
                      I have reliable transportation
                    </span>
                    <span className="mt-1 block text-sm text-white/55">
                      Vehicle details help us match driving routes and service
                      zones.
                    </span>
                  </span>
                  <Car aria-hidden="true" className="size-5 text-lime-300" />
                </button>

                <div className="grid gap-4 sm:grid-cols-2">
                  <WizardInput
                    error={errors.vehicleMake}
                    icon={Car}
                    id="vehicle-make"
                    label="Make"
                    onChange={updateTextField("vehicleMake")}
                    value={draft.vehicleMake}
                  />
                  <WizardInput
                    error={errors.vehicleModel}
                    icon={Car}
                    id="vehicle-model"
                    label="Model"
                    onChange={updateTextField("vehicleModel")}
                    value={draft.vehicleModel}
                  />
                  <WizardInput
                    error={errors.vehicleYear}
                    icon={Car}
                    id="vehicle-year"
                    inputMode="numeric"
                    label="Year"
                    maxLength={4}
                    onChange={updateTextField("vehicleYear")}
                    value={draft.vehicleYear}
                  />
                  <WizardInput
                    error={errors.vehicleColor}
                    icon={Car}
                    id="vehicle-color"
                    label="Color"
                    onChange={updateTextField("vehicleColor")}
                    value={draft.vehicleColor}
                  />
                  <WizardInput
                    error={errors.licensePlate}
                    icon={Car}
                    id="vehicle-plate"
                    label="License plate"
                    onChange={updateTextField("licensePlate")}
                    value={draft.licensePlate}
                  />
                  <WizardInput
                    error={errors.vin}
                    icon={ShieldCheck}
                    id="vehicle-vin"
                    label="VIN"
                    maxLength={17}
                    onChange={(event) =>
                      updateDraft("vin", event.target.value.toUpperCase())
                    }
                    value={draft.vin}
                  />
                  <WizardInput
                    error={errors.serviceRadiusMiles}
                    icon={MapPin}
                    id="provider-radius"
                    inputMode="numeric"
                    label="Service radius in miles"
                    onChange={updateTextField("serviceRadiusMiles")}
                    value={draft.serviceRadiusMiles}
                  />
                </div>

                <div>
                  <Label
                    className="text-white/72"
                    htmlFor="provider-availability"
                  >
                    Weekly availability
                  </Label>
                  <Textarea
                    className="mt-2 min-h-28 border-white/10 bg-white/[0.06] text-white placeholder:text-white/30"
                    id="provider-availability"
                    onChange={updateTextField("weeklyAvailability")}
                    placeholder="Example: weekdays after 4pm, Saturday mornings, or 20 hours per week."
                    value={draft.weeklyAvailability}
                  />
                  <FieldError>{errors.weeklyAvailability}</FieldError>
                </div>
              </div>
            ) : null}

            {activeStep === "plan" ? (
              <div className="grid gap-4">
                <div className="rounded-2xl border border-lime-300/20 bg-lime-300/10 p-4 text-sm leading-6 text-lime-100">
                  <Sparkles
                    aria-hidden="true"
                    className="mb-2 size-5 text-lime-300"
                  />
                  Your provider dashboard will open with application status,
                  manual review notes, and the next setup CTAs. Stripe Connect
                  can come after the account is created.
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {planOptions.map((option) => {
                    const isSelected = draft.plan === option.id;

                    return (
                      <button
                        className={cn(
                          "rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left transition-colors",
                          isSelected && "border-lime-300/70 bg-lime-300/10"
                        )}
                        key={option.id}
                        onClick={() => updateDraft("plan", option.id)}
                        type="button"
                      >
                        <span className="flex items-start justify-between gap-3">
                          <span>
                            <span className="block text-lg font-bold text-white">
                              {option.label}
                            </span>
                            <span className="mt-1 block text-3xl font-black text-white">
                              {option.price}
                            </span>
                          </span>
                          <span
                            className={cn(
                              "flex size-7 items-center justify-center rounded-full border border-white/20 text-slate-950",
                              isSelected && "border-lime-300 bg-lime-300"
                            )}
                          >
                            {isSelected ? (
                              <Check aria-hidden="true" className="size-4" />
                            ) : null}
                          </span>
                        </span>
                        <span className="mt-4 block text-sm text-white/55">
                          Starting split
                        </span>
                        <span className="mt-1 block text-2xl font-bold text-lime-200">
                          {option.split}
                        </span>
                        <span className="mt-3 block text-sm leading-6 text-white/58">
                          {option.description}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <FieldError>{errors.plan}</FieldError>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <Button
              className="h-11 rounded-full border-white/15 bg-transparent text-white hover:bg-white/10"
              disabled={activeStepIndex === 0 || isSubmitting}
              onClick={goBack}
              type="button"
              variant="outline"
            >
              <ArrowLeft aria-hidden="true" className="size-4" />
              Back
            </Button>

            {activeStep === "plan" ? (
              <Button
                className="h-11 rounded-full bg-lime-300 px-6 font-bold text-slate-950 hover:bg-lime-200"
                disabled={isSubmitting}
                type="submit"
              >
                {isSubmitting ? (
                  <LoaderCircle
                    aria-hidden="true"
                    className="size-4 animate-spin"
                  />
                ) : null}
                {draft.plan === "pro"
                  ? "Continue as CastleCare Pro"
                  : "Create provider account"}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            ) : (
              <Button
                className="h-11 rounded-full bg-lime-300 px-6 font-bold text-slate-950 hover:bg-lime-200"
                onClick={goNext}
                type="button"
              >
                Continue
                <ArrowRight aria-hidden="true" className="size-4" />
              </Button>
            )}
          </div>

          <p className="mt-4 text-center text-xs text-white/45">
            Selected path: {selectedPlan.label}. No SSN is collected in this
            application.
          </p>
        </form>
      </div>
    </section>
  );
}
