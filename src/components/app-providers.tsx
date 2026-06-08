"use client";

import { Suspense } from "react";
import { ToastProvider } from "./toast";
import { UpgradeModalProvider } from "./upgrade-modal";
import { UpgradeSuccess } from "./upgrade-success";
import { RegistrationSuccess } from "./registration-success";
import { FeedbackWidget } from "./feedback-widget";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <UpgradeModalProvider>
        <Suspense>
          <UpgradeSuccess />
          <RegistrationSuccess />
        </Suspense>
        {children}
        <FeedbackWidget />
      </UpgradeModalProvider>
    </ToastProvider>
  );
}
