import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Plus_Jakarta_Sans,
  Instrument_Serif,
  JetBrains_Mono,
  Roboto,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
  display: "swap",
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const roboto = Roboto({
  variable: "--font-roboto-loaded",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Skillio · estudiá con ritmo",
  description:
    "App de estudio con Pomodoro, gamificación, agenda y herramientas IA para estudiantes universitarios.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider
      localization={esES}
      appearance={{
        variables: {
          colorPrimary: "#A5402D",
          colorText: "#353831",
          colorBackground: "#FBF1EF",
          fontFamily: "var(--font-jakarta), system-ui, sans-serif",
          borderRadius: "12px",
        },
      }}
    >
      <html
        lang="es"
        data-theme="light"
        className={`${bricolage.variable} ${jakarta.variable} ${instrumentSerif.variable} ${jetbrainsMono.variable} ${roboto.variable} h-full antialiased`}
        suppressHydrationWarning
      >
        <body className="min-h-full flex flex-col bg-bg text-ink font-sans">
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
