"use client";

import { Suspense } from "react";
import { ToastProvider } from "./toast";
import { UpgradeModalProvider } from "./upgrade-modal";
import { UpgradeSuccess } from "./upgrade-success";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <UpgradeModalProvider>
        <Suspense>
          <UpgradeSuccess />
        </Suspense>
        {children}
      </UpgradeModalProvider>
    </ToastProvider>
  );
}
