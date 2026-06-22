"use client";

import { Suspense } from "react";
import { ToastProvider } from "./toast";
import { RegistrationSuccess } from "./registration-success";
import { FeedbackWidget } from "./feedback-widget";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <Suspense>
        <RegistrationSuccess />
      </Suspense>
      {children}
      <FeedbackWidget />
    </ToastProvider>
  );
}
