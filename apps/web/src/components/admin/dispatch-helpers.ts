export interface DispatchWorker {
  email?: string;
  firstName: string;
  id: number;
  isActive?: boolean | null;
  lastName: string;
  nextOfferEligibleAt?: string | null;
  onboardingStatus: string;
  serviceRadiusMiles?: number | null;
  servicesOffered: string[];
}

export const normalizeServiceType = (value: string) =>
  value.replaceAll("-", "_");

export interface WorkerAvailability {
  label: string;
  ok: boolean;
}

/**
 * Best-effort availability from the worker record: approval, Connect-active
 * flag, offered services, and the post-accept offer lockout. There is no
 * shift schedule table, so "available" means eligible for a new offer now.
 */
export const getWorkerAvailability = (
  worker: DispatchWorker,
  serviceType?: string
): WorkerAvailability => {
  if (worker.onboardingStatus !== "approved") {
    return { label: "Not approved", ok: false };
  }
  if (!worker.isActive) {
    return { label: "Connect pending", ok: false };
  }
  if (
    serviceType &&
    !worker.servicesOffered
      .map((service) => normalizeServiceType(service))
      .includes(normalizeServiceType(serviceType))
  ) {
    return { label: "Different service", ok: false };
  }
  if (worker.nextOfferEligibleAt) {
    const eligibleAt = new Date(worker.nextOfferEligibleAt).getTime();
    if (Number.isFinite(eligibleAt) && eligibleAt > Date.now()) {
      return {
        label: `On a job until ${new Date(eligibleAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
        ok: false,
      };
    }
  }
  return { label: "Available", ok: true };
};

export const getWorkerDisplayName = (worker: DispatchWorker) =>
  `${worker.firstName} ${worker.lastName}`.trim() ||
  worker.email ||
  `#${worker.id}`;

export const isScheduledToday = (value?: string | null) => {
  if (!value) {
    return false;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};
