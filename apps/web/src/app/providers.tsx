"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";

import { PipProvider } from "@/features/timer/components/PipProvider";
import { getQueryClient } from "@/lib/query-client";

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {/* Above every layout on purpose: the floating window has to survive
            navigating between the app shell and Focus, which are siblings. */}
        <PipProvider>{children}</PipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
