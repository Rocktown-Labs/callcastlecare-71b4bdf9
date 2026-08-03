import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/earn_/applicant")({
  beforeLoad: ({ search }) => {
    throw redirect({
      search: {
        plan: (search as { plan?: string }).plan === "free" ? "free" : "pro",
      },
      to: "/dashboard/provider",
    });
  },
});
