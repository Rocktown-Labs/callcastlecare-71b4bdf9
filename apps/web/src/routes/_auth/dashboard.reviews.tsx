import { Badge } from "@callcastlecare/ui/components/badge";
import { Button } from "@callcastlecare/ui/components/button";
import { Textarea } from "@callcastlecare/ui/components/textarea";
import { createFileRoute } from "@tanstack/react-router";
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Star,
  UserCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { getServerUrl } from "@/lib/server-url";

interface CompletedOrder {
  afterPhotos?: string[];
  beforePhotos?: string[];
  completedAt?: string;
  id: string;
  providerName?: string;
  reviewComment?: string;
  reviewRating?: number;
  serviceSummary: string;
}

const mockCompletedOrders: CompletedOrder[] = [
  {
    afterPhotos: ["/callcastlecare/media/lawn-after.jpg"],
    beforePhotos: ["/callcastlecare/media/lawn-before.jpg"],
    completedAt: "2026-08-01T14:30:00Z",
    id: "ord_102",
    providerName: "Marcus Vance (CastleCare Pro)",
    serviceSummary: "Bi-Weekly Lawn Care + Window Washing",
  },
  {
    afterPhotos: ["/callcastlecare/media/laundry-after.jpg"],
    beforePhotos: ["/callcastlecare/media/laundry-before.jpg"],
    completedAt: "2026-07-25T11:15:00Z",
    id: "ord_098",
    providerName: "Sarah Jenkins (CastleCare Pro)",
    reviewComment:
      "Super fast turnaround on wash and fold! Everything neatly folded.",
    reviewRating: 5,
    serviceSummary: "Wash & Fold Laundry Pickup",
  },
];

const DashboardReviewsRoute = () => {
  const [completedOrders, setCompletedOrders] =
    useState<CompletedOrder[]>(mockCompletedOrders);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
  const [expandedPhotos, setExpandedPhotos] = useState<Record<string, boolean>>(
    {}
  );
  const [isSubmitting, setIsSubmitting] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;

    const loadOrders = async () => {
      const response = await fetch(new URL("/api/v1/orders", getServerUrl()), {
        credentials: "include",
      });
      if (!(active && response.ok)) {
        return;
      }
      const payload = (await response.json()) as { orders?: CompletedOrder[] };
      if (payload.orders && payload.orders.length > 0) {
        setCompletedOrders(payload.orders);
      }
    };

    void loadOrders();

    return () => {
      active = false;
    };
  }, []);

  const handleRating = (orderId: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [orderId]: rating }));
  };

  const handleComment = (orderId: string, text: string) => {
    setComments((prev) => ({ ...prev, [orderId]: text }));
  };

  const togglePhotos = (orderId: string) => {
    setExpandedPhotos((prev) => ({ ...prev, [orderId]: !prev[orderId] }));
  };

  const submitReview = async (orderId: string) => {
    const rating = ratings[orderId] ?? 5;
    const comment = comments[orderId] ?? "";

    setIsSubmitting((prev) => ({ ...prev, [orderId]: true }));

    const response = await fetch(
      new URL(`/api/v1/orders/${orderId}/review`, getServerUrl()),
      {
        body: JSON.stringify({ comment, rating }),
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      }
    ).catch(() => null);

    setIsSubmitting((prev) => ({ ...prev, [orderId]: false }));

    if (response && !response.ok) {
      toast.error("Could not submit review. Please try again.");
      return;
    }

    setCompletedOrders((prev) =>
      prev.map((order) =>
        order.id === orderId
          ? { ...order, reviewComment: comment, reviewRating: rating }
          : order
      )
    );
    toast.success(`Thank you for your ${rating}-star review!`);
  };

  return (
    <main className="px-4 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto grid max-w-6xl gap-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
            <Star className="size-4" />
            Service Quality Reviews
          </div>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            Ratings & Photo Proof
          </h1>
          <p className="mt-2 text-slate-600">
            Review completed services, check before & after photo verification,
            and leave rating feedback to support top CastleCare Pros.
          </p>
        </section>

        <div className="grid gap-4">
          {completedOrders.map((order) => {
            const currentRating = ratings[order.id] ?? order.reviewRating ?? 5;
            const currentComment =
              comments[order.id] ?? order.reviewComment ?? "";
            const hasReviewed = Boolean(order.reviewRating);
            const isPhotosOpen = expandedPhotos[order.id] ?? false;

            return (
              <article
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all hover:border-slate-300"
                key={order.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-black text-slate-950">
                        {order.serviceSummary}
                      </h2>
                      <Badge className="bg-lime-100 text-lime-800 text-xs">
                        <CheckCircle2 className="mr-1 size-3" />
                        Completed
                      </Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <UserCheck className="size-3.5 text-lime-600" />
                      Pro: {order.providerName ?? "CastleCare Pro"}
                    </p>
                  </div>

                  <Button
                    className="h-9 rounded-full border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    onClick={() => togglePhotos(order.id)}
                    type="button"
                    variant="outline"
                  >
                    <Camera className="size-3.5" />
                    Photo Proof
                    {isPhotosOpen ? (
                      <ChevronUp className="size-3.5" />
                    ) : (
                      <ChevronDown className="size-3.5" />
                    )}
                  </Button>
                </div>

                {/* Collapsible Photo Proof Drawer */}
                {isPhotosOpen ? (
                  <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Before & After Verification Photos
                    </h3>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                        <span className="text-xs font-bold text-slate-600">
                          Before Work
                        </span>
                        <div className="mt-2 flex h-28 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-400">
                          {order.beforePhotos?.[0] ? (
                            <img
                              alt="Before service"
                              className="size-full rounded-lg object-cover"
                              src={order.beforePhotos[0]}
                            />
                          ) : (
                            "Photo Verified"
                          )}
                        </div>
                      </div>
                      <div className="rounded-xl border border-slate-200 bg-white p-3 text-center">
                        <span className="text-xs font-bold text-slate-600">
                          After Work
                        </span>
                        <div className="mt-2 flex h-28 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-400">
                          {order.afterPhotos?.[0] ? (
                            <img
                              alt="After service"
                              className="size-full rounded-lg object-cover"
                              src={order.afterPhotos[0]}
                            />
                          ) : (
                            "Photo Verified"
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* Interactive Star Rating Form */}
                <div className="mt-4 pt-2">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          className="transition-transform hover:scale-110"
                          disabled={hasReviewed}
                          key={star}
                          onClick={() => handleRating(order.id, star)}
                          type="button"
                        >
                          <Star
                            className={`size-6 ${
                              star <= currentRating
                                ? "fill-amber-400 text-amber-400"
                                : "text-slate-300"
                            }`}
                          />
                        </button>
                      ))}
                      <span className="ml-2 text-sm font-black text-slate-900">
                        {currentRating} / 5 Stars
                      </span>
                    </div>

                    {hasReviewed ? (
                      <Badge className="bg-lime-100 text-lime-800">
                        Review Submitted
                      </Badge>
                    ) : (
                      <Button
                        className="h-10 rounded-full bg-lime-300 px-5 font-bold text-slate-950 hover:bg-lime-200"
                        disabled={isSubmitting[order.id]}
                        onClick={() => void submitReview(order.id)}
                        type="button"
                      >
                        Submit {currentRating}-Star Review
                      </Button>
                    )}
                  </div>

                  {hasReviewed ? (
                    <div className="mt-3 rounded-xl bg-lime-50/60 p-3 text-xs text-slate-700">
                      <span className="font-bold">Your Feedback: </span>
                      {currentComment || "5-star rating submitted!"}
                    </div>
                  ) : (
                    <div className="mt-3">
                      <Textarea
                        className="rounded-xl border-slate-200 text-xs text-slate-900 placeholder:text-slate-400"
                        onChange={(e) =>
                          handleComment(order.id, e.target.value)
                        }
                        placeholder="Write comments for your CastleCare Pro (optional)..."
                        value={currentComment}
                      />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export const Route = createFileRoute("/_auth/dashboard/reviews")({
  component: DashboardReviewsRoute,
});
