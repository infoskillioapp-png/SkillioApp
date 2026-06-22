"use client";

import { Suspense } from "react";
import { ToastProvider } from "./toast";
import { UpgradeModalProvider } from "./upgrade-modal";
import { SalePopupProvider } from "./sale-popup";
import { UpgradeSuccess } from "./upgrade-success";
import { RegistrationSuccess } from "./registration-success";
import { FeedbackWidget } from "./feedback-widget";

export function AppProviders({
  children,
  offerStartedAt = null,
}: {
  children: React.ReactNode;
  offerStartedAt?: string | null;
}) {
  return (
    <ToastProvider>
      <UpgradeModalProvider offerStartedAt={offerStartedAt}>
        <SalePopupProvider>
          <Suspense>
            <UpgradeSuccess />
            <RegistrationSuccess />
          </Suspense>
          {children}
          <FeedbackWidget />
        </SalePopupProvider>
      </UpgradeModalProvider>
    </ToastProvider>
  );
}
