import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const serif = Source_Serif_4({
  subsets: ["latin"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AEQUAN · Imaging & Clinical Simulation",
  description:
    "Piattaforma universitaria di simulazione clinica per la formazione in radiologia. Solo uso didattico, non è un dispositivo medico.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="it" className={`${inter.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full bg-[#f3f6fa] font-sans text-[#14233b]">{children}</body>
    </html>
  );
}
