import { Button } from "@callcastlecare/ui/components/button";
import { Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getServerUrl } from "@/lib/server-url";

import type { DispatchWorker } from "./dispatch-helpers";
import {
  getWorkerAvailability,
  getWorkerDisplayName,
} from "./dispatch-helpers";

interface DispatchModalService {
  assignedWorkerId?: number | null;
  id: number;
  serviceLabel: string;
  serviceType: string;
  status: string;
}

interface DispatchModalProps {
  onClose: () => void;
  onDispatched: () => Promise<void> | void;
  orderId: number;
  workers: DispatchWorker[];
}

const sendOffer = async (serviceId: number, workerId: number) => {
  const response = await fetch(
    new URL(`/api/v1/admin/orders/${serviceId}/dispatch`, getServerUrl()),
    {
      body: JSON.stringify({ workerId }),
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "Dispatch offer failed");
  }
  return (await response.json()) as { alreadySent?: boolean };
};

const WorkerSelect = ({
  id,
  onChange,
  serviceType,
  value,
  workers,
}: {
  id: string;
  onChange: (value: string) => void;
  serviceType?: string;
  value: string;
  workers: DispatchWorker[];
}) => (
  <select
    aria-label={id}
    className="h-10 min-w-44 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold"
    onChange={(event) => onChange(event.target.value)}
    value={value}
  >
    <option value="">Choose worker</option>
    {workers.map((worker) => {
      const availability = getWorkerAvailability(worker, serviceType);
      return (
        <option disabled={!availability.ok} key={worker.id} value={worker.id}>
          {getWorkerDisplayName(worker)}
          {availability.ok ? "" : ` · ${availability.label}`}
        </option>
      );
    })}
  </select>
);

export const DispatchModal = ({
  onClose,
  onDispatched,
  orderId,
  workers,
}: DispatchModalProps) => {
  const [services, setServices] = useState<DispatchModalService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [wholeWorkerId, setWholeWorkerId] = useState("");
  const [workerByService, setWorkerByService] = useState<
    Record<number, string>
  >({});

  useEffect(() => {
    let active = true;
    const loadServices = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(
          new URL(`/api/v1/admin/orders/${orderId}`, getServerUrl()),
          { credentials: "include" }
        );
        if (!(active && response.ok)) {
          if (active) {
            toast.error("Ticket could not be loaded");
          }
          return;
        }
        const payload = (await response.json()) as {
          detail?: { services?: DispatchModalService[] };
        };
        if (active) {
          setServices(payload.detail?.services ?? []);
        }
      } catch (error) {
        if (active) {
          toast.error(
            error instanceof Error ? error.message : "Ticket load failed"
          );
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };
    void loadServices();
    return () => {
      active = false;
    };
  }, [orderId]);

  const runDispatch = async (
    targets: { serviceId: number; workerId: number }[]
  ) => {
    setIsSending(true);
    let sent = 0;
    let alreadySent = 0;
    let failed = 0;
    try {
      for (const target of targets) {
        try {
          // eslint-disable-next-line no-await-in-loop -- Sequential offers keep per-service toasts accurate.
          const result = await sendOffer(target.serviceId, target.workerId);
          if (result.alreadySent) {
            alreadySent += 1;
          } else {
            sent += 1;
          }
        } catch {
          failed += 1;
        }
      }
      if (sent > 0) {
        toast.success(
          `Offer${sent === 1 ? "" : "s"} sent for ${sent} service${sent === 1 ? "" : "s"}`
        );
      }
      if (alreadySent > 0) {
        toast.info(
          `${alreadySent} offer${alreadySent === 1 ? " was" : "s were"} already pending`
        );
      }
      if (failed > 0) {
        toast.error(`${failed} offer${failed === 1 ? "" : "s"} failed`);
      }
      if (sent > 0 || alreadySent > 0) {
        await onDispatched();
      }
    } finally {
      setIsSending(false);
    }
  };

  const sendWholeTicket = () => {
    if (!wholeWorkerId) {
      toast.error("Choose a worker first");
      return;
    }
    void runDispatch(
      services.map((service) => ({
        serviceId: service.id,
        workerId: Number(wholeWorkerId),
      }))
    );
  };

  const sendService = (serviceId: number) => {
    const workerId = workerByService[serviceId];
    if (!workerId) {
      toast.error("Choose a worker first");
      return;
    }
    void runDispatch([{ serviceId, workerId: Number(workerId) }]);
  };

  return (
    <dialog
      aria-label={`Dispatch order ${orderId}`}
      className="fixed inset-0 z-50 m-0 flex h-full max-h-none w-full max-w-none items-end justify-center bg-slate-950/60 p-4 sm:items-center"
      onClose={onClose}
      open
    >
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-lime-700">
              Dispatch desk
            </p>
            <h2 className="mt-1 text-2xl font-black">Send Order #{orderId}</h2>
            <p className="mt-1 text-sm text-slate-600">
              Send the whole ticket to one worker, or split services across the
              crew. Workers see it ondemand and accept or decline.
            </p>
          </div>
          <button
            aria-label="Close dispatch"
            className="flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-200"
            onClick={onClose}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>

        {isLoading ? (
          <p className="mt-5 rounded-2xl bg-slate-50 p-5 text-center text-sm font-bold text-slate-500">
            Loading services...
          </p>
        ) : (
          <div className="mt-5 grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-slate-950 p-4 text-white">
              <div>
                <p className="font-black">Whole ticket</p>
                <p className="text-xs font-semibold text-slate-300">
                  {services.length} service{services.length === 1 ? "" : "s"} ·
                  one worker takes everything
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <WorkerSelect
                  id="Whole ticket worker"
                  onChange={setWholeWorkerId}
                  value={wholeWorkerId}
                  workers={workers}
                />
                <Button
                  className="h-10 rounded-xl bg-lime-300 px-4 text-sm font-black text-slate-950 hover:bg-lime-200 disabled:opacity-60"
                  disabled={isSending || !wholeWorkerId}
                  onClick={sendWholeTicket}
                  type="button"
                >
                  <Send className="size-4" /> Send all
                </Button>
              </div>
            </div>

            {services.map((service) => (
              <div
                className="grid gap-3 rounded-2xl border border-slate-200 p-4 sm:grid-cols-[1fr_auto] sm:items-center"
                key={service.id}
              >
                <div>
                  <p className="font-black">{service.serviceLabel}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    Work item #{service.id} ·{" "}
                    {service.status.replaceAll("_", " ")}
                    {service.assignedWorkerId
                      ? ` · worker #${service.assignedWorkerId}`
                      : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                  <WorkerSelect
                    id={`Worker for ${service.serviceLabel}`}
                    onChange={(value) =>
                      setWorkerByService((current) => ({
                        ...current,
                        [service.id]: value,
                      }))
                    }
                    serviceType={service.serviceType}
                    value={workerByService[service.id] ?? ""}
                    workers={workers}
                  />
                  <Button
                    className="h-10 rounded-xl bg-lime-300 px-4 text-sm font-black text-slate-950 hover:bg-lime-200 disabled:opacity-60"
                    disabled={isSending || !workerByService[service.id]}
                    onClick={() => sendService(service.id)}
                    type="button"
                  >
                    <Send className="size-4" /> Send
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </dialog>
  );
};
