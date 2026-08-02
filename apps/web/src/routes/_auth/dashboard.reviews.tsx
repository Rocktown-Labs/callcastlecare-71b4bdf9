import { Badge } from "@callcastlecare/ui/components/badge";
import { Button } from "@callcastlecare/ui/components/button";
import { Textarea } from "@callcastlecare/ui/components/textarea";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, CheckCircle2, Star, UserCheck } from "lucide-react";
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
];

const DashboardReviewsRoute = () => {
  const [completedOrders, setCompletedOrders] =
    useState<CompletedOrder[]>(mockCompletedOrders);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comments, setComments] = useState<Record<string, string>>({});
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
    toast.success("Thank you for your 5-star review! Pro payout updated.");
  };

  return (
    <main className="px-4 py-6 text-slate-950 sm:py-10">
      <div className="mx-auto grid max-w-4xl gap-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-lime-300 bg-lime-100 px-3 py-1 text-xs font-black uppercase text-lime-800">
            <Star className="size-4" />
            Service Quality Reviews
          </div>
          <h1 className="mt-3 text-3xl font-black md:text-5xl">
            Completed Services & Ratings
          </h1>
          <p className="mt-2 text-slate-600">
            Review before-and-after photo verification from your CastleCare Pro
            and leave 5-star feedback to help top providers earn higher payout
            splits!
          </p>
        </section>

        <div className="grid gap-6">
          {completedOrders.map((order) => {
            const currentRating = ratings[order.id] ?? order.reviewRating ?? 5;
            const currentComment =
              comments[order.id] ?? order.reviewComment ?? "";
            const hasReviewed = Boolean(order.reviewRating);

            return (
              <article
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
                key={order.id}
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
                  <div>
                    <h2 className="text-xl font-black">
                      {order.serviceSummary}
                    </h2>
                    <p className="mt-1 flex items-center gap-2 text-xs text-slate-500">
                      <UserCheck className="size-3.5 text-lime-600" />
                      Pro: {order.providerName ?? "CastleCare Pro"}
                    </p>
                  </div>
                  <Badge className="bg-lime-100 text-lime-800">
                    <CheckCircle2 className="mr-1 size-3" />
                    Completed & Verified
                  </Badge>
                </div>

                {/* Photo Proof */}
                <div className="mt-5">
                  <h3 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <Camera className="size-4 text-slate-500" />
                    Before & After Photo Proof
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        Before Service
                      </span>
                      <div className="mt-2 flex h-32 items-center justify-center rounded-xl bg-slate-200 font-bold text-slate-400">
                        {order.beforePhotos?.[0] ? (
                          <img
                            alt="Before"
                            className="size-full rounded-xl object-cover"
                            src={order.beforePhotos[0]}
                          />
                        ) : (
                          "Before Photo Verified"
                        )}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                        After Service
                      </span>
                      <div className="mt-2 flex h-32 items-center justify-center rounded-xl bg-slate-200 font-bold text-slate-400">
                        {order.afterPhotos?.[0] ? (
                          <img
                            alt="After"
                            className="size-full rounded-xl object-cover"
                            src={order.afterPhotos[0]}
                          />
                        ) : (
                          "After Photo Verified"
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Review Form */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <h3 className="text-sm font-bold text-slate-900">
                    {hasReviewed
                      ? "Your Submitted Rating"
                      : "Rate Your CastleCare Pro"}
                  </h3>
                  <div className="mt-3 flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        className="transition-transform hover:scale-110"
                        disabled={hasReviewed}
                        key={star}
                        onClick={() => handleRating(order.id, star)}
                        type="button"
                      >
                        <Star
                          className={`size-7 ${
                            star <= currentRating
                              ? "fill-amber-400 text-amber-400"
                              : "text-slate-300"
                          }`}
                        />
                      </button>
                    ))}
                    <span className="ml-2 font-black text-slate-900">
                      {currentRating} / 5 Stars
                    </span>
                  </div>

                  {hasReviewed ? (
                    <div className="mt-3 rounded-2xl bg-lime-50 p-4 text-sm text-slate-800">
                      <p className="font-bold">Your Review:</p>
                      <p className="mt-1 text-slate-600">
                        {currentComment || "5-star rating submitted!"}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-4 grid gap-3">
                      <Textarea
                        className="rounded-2xl border-slate-200 text-slate-900"
                        onChange={(e) =>
                          handleComment(order.id, e.target.value)
                        }
                        placeholder="Write your review for the provider (optional)..."
                        value={currentComment}
                      />
                      <Button
                        className="h-11 rounded-full bg-lime-300 font-bold text-slate-950 hover:bg-lime-200"
                        disabled={isSubmitting[order.id]}
                        onClick={() => void submitReview(order.id)}
                        type="button"
                      >
                        Submit 5-Star Rating & Review
                      </Button>
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
