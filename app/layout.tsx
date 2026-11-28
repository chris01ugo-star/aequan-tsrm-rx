import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AEQUAN // Imaging & Clinical Simulation (TSRM RX)",
  description:
    "Simulatore didattico di radiologia tradizionale per la formazione TSRM. Non è un dispositivo medico.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="h-full overflow-hidden bg-obsidian font-sans text-ice">{children}</body>
    </html>
  );
}
