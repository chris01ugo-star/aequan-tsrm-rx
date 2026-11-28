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
  title: "AEQUAN · Imaging & Clinical Simulation",
  description:
    "Piattaforma universitaria di simulazione clinica per la formazione in radiologia. Solo uso didattico, non è un dispositivo medico.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="it"
      className={`${inter.variable} ${jakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[#eef3f8] font-sans text-[#0f2744]">{children}</body>
    </html>
  );
}
