import {
  normalizePhoneInput,
  optionalPhoneSchema,
} from "@callcastlecare/api/validation";
import { Button } from "@callcastlecare/ui/components/button";
import { Input } from "@callcastlecare/ui/components/input";
import { Label } from "@callcastlecare/ui/components/label";
import { Textarea } from "@callcastlecare/ui/components/textarea";
import { useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";

import { apiClient } from "@/lib/api-client";

interface OrderOption {
  id: number;
  label: string;
}

interface SupportFormProps {
  defaultRequestType?: "dashboard_help" | "help" | "service_area";
  email?: string;
  name?: string;
  orderOptions?: OrderOption[];
  showAddressFields?: boolean;
  showOrderReference?: boolean;
  sourcePath: string;
  title?: string;
}

const serviceOptions = [
  { label: "General question", value: "unknown" },
  { label: "Lawn care", value: "lawncare" },
  { label: "Laundry", value: "laundry" },
  { label: "Window washing", value: "window_washing" },
  { label: "Multiple services", value: "combo" },
] as const;

const supportFormSchema = z.object({
  addressText: z.string().trim().max(240).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  email: z.email("Enter a valid email address."),
  message: z.string().trim().min(10, "Tell us a little more.").max(2000),
  name: z.string().trim().min(2, "Enter your name.").max(120),
  orderId: z.number().int().positive().optional().nullable(),
  orderNumber: z.string().trim().max(80).optional().or(z.literal("")),
  phone: optionalPhoneSchema,
  requestType: z
    .enum(["help", "dashboard_help", "service_area"])
    .default("help"),
  serviceType: z
    .enum(["lawncare", "laundry", "window_washing", "combo", "unknown"])
    .default("unknown"),
  sourcePath: z.string().trim().max(160).optional().or(z.literal("")),
  state: z.string().trim().max(40).optional().or(z.literal("")),
  zip: z.string().trim().max(20).optional().or(z.literal("")),
});

type SupportFormValues = z.infer<typeof supportFormSchema>;
type SupportFormErrors = Partial<Record<keyof SupportFormValues, string>>;
type ClearSupportError = (field: keyof SupportFormErrors) => void;

const emptyOrderOptions: OrderOption[] = [];

const getFormString = (formData: FormData, key: string) =>
  formData.get(key)?.toString() ?? "";

const getOrderId = (formData: FormData) => {
  const orderIdValue = getFormString(formData, "orderId");
  return orderIdValue ? Number(orderIdValue) : null;
};

const createSupportPayload = (
  formData: FormData,
  defaultRequestType: NonNullable<SupportFormProps["defaultRequestType"]>,
  sourcePath: string
) => ({
  addressText: getFormString(formData, "addressText"),
  city: getFormString(formData, "city"),
  email: getFormString(formData, "email"),
  message: getFormString(formData, "message"),
  name: getFormString(formData, "name"),
  orderId: getOrderId(formData),
  orderNumber: getFormString(formData, "orderNumber"),
  phone: getFormString(formData, "phone"),
  requestType: defaultRequestType,
  serviceType: getFormString(formData, "serviceType") || "unknown",
  sourcePath,
  state: getFormString(formData, "state"),
  zip: getFormString(formData, "zip"),
});

const OrderReferenceField = ({
  orderOptions,
  showOrderReference,
}: {
  orderOptions: OrderOption[];
  showOrderReference: boolean;
}) => {
  if (orderOptions.length > 0) {
    return (
      <div className="space-y-2 sm:col-span-2">
        <Label htmlFor="orderId">Related order</Label>
        <select
          className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950"
          id="orderId"
          name="orderId"
        >
          <option value="">No specific order</option>
          {orderOptions.map((order) => (
            <option key={order.id} value={order.id}>
              {order.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (!showOrderReference) {
    return null;
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="orderNumber">Order number, if you have one</Label>
      <Input
        className="h-11 rounded-full border-slate-200 bg-slate-50 px-4"
        id="orderNumber"
        name="orderNumber"
        placeholder="Example: CC-1024"
      />
    </div>
  );
};

const AddressFields = ({
  clearError,
  errors,
}: {
  clearError: ClearSupportError;
  errors: SupportFormErrors;
}) => (
  <>
    <div className="space-y-2 sm:col-span-2">
      <Label htmlFor="addressText">Address or neighborhood</Label>
      <Input
        aria-invalid={Boolean(errors.addressText)}
        className="h-11 rounded-full border-slate-200 bg-slate-50 px-4"
        id="addressText"
        name="addressText"
        onChange={() => clearError("addressText")}
        placeholder="Street, city, or area you want covered"
      />
      {errors.addressText ? (
        <p className="text-sm text-rose-600">{errors.addressText}</p>
      ) : null}
    </div>
    <div className="space-y-2">
      <Label htmlFor="city">City</Label>
      <Input
        aria-invalid={Boolean(errors.city)}
        className="h-11 rounded-full border-slate-200 bg-slate-50 px-4"
        id="city"
        name="city"
        onChange={() => clearError("city")}
      />
      {errors.city ? (
        <p className="text-sm text-rose-600">{errors.city}</p>
      ) : null}
    </div>
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Input
          aria-invalid={Boolean(errors.state)}
          className="h-11 rounded-full border-slate-200 bg-slate-50 px-4"
          defaultValue="AR"
          id="state"
          name="state"
          onChange={() => clearError("state")}
        />
        {errors.state ? (
          <p className="text-sm text-rose-600">{errors.state}</p>
        ) : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="zip">ZIP</Label>
        <Input
          aria-invalid={Boolean(errors.zip)}
          className="h-11 rounded-full border-slate-200 bg-slate-50 px-4"
          id="zip"
          name="zip"
          onChange={() => clearError("zip")}
        />
        {errors.zip ? (
          <p className="text-sm text-rose-600">{errors.zip}</p>
        ) : null}
      </div>
    </div>
  </>
);

const ContactFields = ({
  clearError,
  defaultEmail,
  defaultName,
  errors,
}: {
  clearError: ClearSupportError;
  defaultEmail: string;
  defaultName: string;
  errors: SupportFormErrors;
}) => (
  <>
    <div className="space-y-2">
      <Label htmlFor="name">Name</Label>
      <Input
        aria-invalid={Boolean(errors.name)}
        className="h-11 rounded-full border-slate-200 bg-slate-50 px-4"
        defaultValue={defaultName}
        id="name"
        name="name"
        onChange={() => clearError("name")}
        required
      />
      {errors.name ? (
        <p className="text-sm text-rose-600">{errors.name}</p>
      ) : null}
    </div>
    <div className="space-y-2">
      <Label htmlFor="email">Email</Label>
      <Input
        aria-invalid={Boolean(errors.email)}
        className="h-11 rounded-full border-slate-200 bg-slate-50 px-4"
        defaultValue={defaultEmail}
        id="email"
        name="email"
        onChange={() => clearError("email")}
        required
        type="email"
      />
      {errors.email ? (
        <p className="text-sm text-rose-600">{errors.email}</p>
      ) : null}
    </div>
    <div className="space-y-2">
      <Label htmlFor="phone">Phone</Label>
      <Input
        aria-invalid={Boolean(errors.phone)}
        className="h-11 rounded-full border-slate-200 bg-slate-50 px-4"
        id="phone"
        inputMode="tel"
        name="phone"
        onChange={(event) => {
          event.currentTarget.value = normalizePhoneInput(
            event.currentTarget.value
          );
          clearError("phone");
        }}
        pattern="[0-9\s()+.-]*"
        type="tel"
      />
      {errors.phone ? (
        <p className="text-sm text-rose-600">{errors.phone}</p>
      ) : null}
    </div>
  </>
);

const MessageField = ({
  clearError,
  error,
}: {
  clearError: ClearSupportError;
  error?: string;
}) => (
  <div className="space-y-2 sm:col-span-2">
    <Label htmlFor="message">How can we help?</Label>
    <Textarea
      aria-invalid={Boolean(error)}
      className="min-h-32 rounded-3xl border-slate-200 bg-slate-50 px-4 py-3"
      id="message"
      name="message"
      onChange={() => clearError("message")}
      required
    />
    {error ? <p className="text-sm text-rose-600">{error}</p> : null}
  </div>
);

export const SupportForm = ({
  defaultRequestType = "help",
  email = "",
  name = "",
  orderOptions = emptyOrderOptions,
  showAddressFields = false,
  showOrderReference = true,
  sourcePath,
  title = "Tell us what is going on",
}: SupportFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<SupportFormErrors>({});

  const clearError = (field: keyof SupportFormErrors) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const form = event.currentTarget;
    const formData = new FormData(form);
    const parsed = supportFormSchema.safeParse(
      createSupportPayload(formData, defaultRequestType, sourcePath)
    );
    if (!parsed.success) {
      const nextErrors: SupportFormErrors = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0] as keyof SupportFormErrors;
        nextErrors[field] ??= issue.message;
      }
      setErrors(nextErrors);
      return;
    }

    setIsSubmitting(true);
    const response = await apiClient.support.$post({
      json: parsed.data,
    });

    setIsSubmitting(false);

    if (!response.ok) {
      toast.error("We could not send that request. Please check the form.");
      return;
    }

    form.reset();
    setErrors({});
    setSubmitted(true);
    toast.success("Request sent. CastleCare will follow up soon.");
  };

  return (
    <form
      className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-xl shadow-slate-950/5 sm:p-7"
      noValidate
      onSubmit={handleSubmit}
    >
      <div>
        <p className="text-sm font-black uppercase tracking-[0.18em] text-lime-600">
          Help Center
        </p>
        <h2 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Share the key details and we will route it into the CastleCare admin
          queue for follow-up.
        </p>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ContactFields
          clearError={clearError}
          defaultEmail={email}
          defaultName={name}
          errors={errors}
        />
        <div className="space-y-2">
          <Label htmlFor="serviceType">Service</Label>
          <select
            className="h-11 w-full rounded-full border border-slate-200 bg-slate-50 px-4 text-sm text-slate-950"
            id="serviceType"
            name="serviceType"
          >
            {serviceOptions.map((service) => (
              <option key={service.value} value={service.value}>
                {service.label}
              </option>
            ))}
          </select>
        </div>

        <OrderReferenceField
          orderOptions={orderOptions}
          showOrderReference={showOrderReference}
        />

        {showAddressFields ? (
          <AddressFields clearError={clearError} errors={errors} />
        ) : null}

        <MessageField clearError={clearError} error={errors.message} />
      </div>

      <Button
        className="mt-5 h-12 w-full rounded-full bg-lime-300 font-black text-slate-950 hover:bg-lime-200"
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? "Sending..." : "Send request"}
      </Button>
      {submitted ? (
        <p className="mt-3 text-center text-sm font-semibold text-emerald-700">
          We received it. You will hear from CastleCare soon.
        </p>
      ) : null}
    </form>
  );
};
