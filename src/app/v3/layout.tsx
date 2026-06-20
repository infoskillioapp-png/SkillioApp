import { Space_Grotesk, Inter } from "next/font/google";
import "./v3.css";

// Tema 3.0 "Foco cálido": Space Grotesk (títulos) + Inter (cuerpo).
const grotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-grotesk",
  display: "swap",
});
const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export default function V3Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${grotesk.variable} ${inter.variable} v3-root min-h-screen`}>
      {children}
    </div>
  );
}
