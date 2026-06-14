import type { Metadata } from "next";
import Script from "next/script";
import {
  Bricolage_Grotesque,
  Plus_Jakarta_Sans,
  Instrument_Serif,
  JetBrains_Mono,
  Roboto,
} from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import { esES } from "@clerk/localizations";
import { UtmCapture } from "@/components/utm-capture";
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
  metadataBase: new URL("https://skillio.digital"),
  title: "Skillio · estudiá con ritmo",
  description:
    "App de estudio con Pomodoro, gamificación, agenda y herramientas IA para estudiantes universitarios.",
  icons: {
    icon: [{ url: "/logo-mark.svg", type: "image/svg+xml" }],
  },
  other: {
    "facebook-domain-verification": "2sergbx06k8lh6609j9dyejopmc3b",
  },
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
          <UtmCapture />
          {children}

          {/* Meta Pixel — init + PageView en la carga inicial. Purchase se dispara en /pago-exitoso */}
          <Script id="fb-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','1331882875540046');fbq('track','PageView');`}
          </Script>
          <noscript>
            <img
              height="1"
              width="1"
              style={{ display: "none" }}
              src="https://www.facebook.com/tr?id=1331882875540046&ev=PageView&noscript=1"
              alt=""
            />
          </noscript>
        </body>
      </html>
    </ClerkProvider>
  );
}
