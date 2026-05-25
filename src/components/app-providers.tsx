"use client";

import { ToastProvider } from "./toast";
import { UpgradeModalProvider } from "./upgrade-modal";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <UpgradeModalProvider>{children}</UpgradeModalProvider>
    </ToastProvider>
  );
}
