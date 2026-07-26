import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { createWebQueryClient } from "@/lib/query-client";

export default function Providers({
  children,
}: Readonly<{ children: ReactNode }>) {
  const [queryClient] = useState(createWebQueryClient);

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
