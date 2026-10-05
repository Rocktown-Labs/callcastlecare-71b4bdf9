export interface RouteWorkerSummary {
  email?: string | null;
  firstName: string;
  id: number;
  lastName: string;
}

export interface AdminRouteRow {
  createdAt?: string | null;
  id: number;
  name: string;
  routeDate: string;
  status: string;
  stopCount: number;
  updatedAt?: string | null;
  worker: RouteWorkerSummary | null;
  workerId: number;
}

export interface RouteStopOrder {
  id: number;
  scheduledEndAt?: string | null;
  scheduledStartAt?: string | null;
  serviceType?: string | null;
  status?: string | null;
  totalPriceCents?: number | null;
}

export interface RouteStopDetail {
  address?: {
    city?: string | null;
    formattedAddress?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    state?: string | null;
    street?: string | null;
    zip?: string | null;
  } | null;
  customer?: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phone?: string | null;
  } | null;
  id: number;
  order: RouteStopOrder | null;
  orderId: number;
  plannedEndAt?: string | null;
  plannedStartAt?: string | null;
  routeId: number;
  sequence: number;
  status: string;
}

export interface AdminRouteDetail {
  route: {
    createdAt?: string | null;
    id: number;
    name: string;
    routeDate: string;
    status: string;
    workerId: number;
  };
  stops: RouteStopDetail[];
  worker:
    | (RouteWorkerSummary & {
        isActive?: boolean | null;
        onboardingStatus?: string | null;
        phone?: string | null;
      })
    | null;
}

export const routeLifecycleStatuses = [
  "draft",
  "published",
  "in_progress",
  "completed",
  "cancelled",
] as const;

export const getRouteStatusTone = (status: string) => {
  if (status === "in_progress") {
    return "bg-lime-100 text-lime-800";
  }
  if (status === "published") {
    return "bg-sky-100 text-sky-800";
  }
  if (status === "completed") {
    return "bg-slate-950 text-white";
  }
  if (status === "cancelled") {
    return "bg-rose-100 text-rose-800";
  }
  return "bg-slate-100 text-slate-700";
};

export const formatRouteServiceLabel = (serviceType?: string | null) => {
  if (serviceType === "lawncare") {
    return "Lawn Care";
  }
  if (serviceType === "laundry") {
    return "Laundry";
  }
  if (serviceType === "window_washing") {
    return "Window Washing";
  }
  return serviceType?.replaceAll("_", " ") ?? "Service";
};

export const formatRouteDate = (value?: string | null) => {
  if (!value) {
    return "No date";
  }
  const date = new Date(value.length <= 10 ? `${value}T12:00:00` : value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    weekday: "short",
    year: "numeric",
  }).format(date);
};

export const getTodayInputValue = () => {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
};
