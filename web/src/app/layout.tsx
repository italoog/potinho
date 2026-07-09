import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import BackToStoreButton from "@/components/potinho/BackToStoreButton";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "potinho — comedouro elevado com o nome do seu pet",
  description:
    "Comedouros elevados impressos em 3D, personalizados com o nome do seu pet. Escolha o tamanho, as cores e receba em casa.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <BackToStoreButton />
        {children}
      </body>
    </html>
  );
}
