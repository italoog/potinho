import type { Metadata } from "next";
import { Geist, Geist_Mono, Poppins } from "next/font/google";
import BackToStoreButton from "@/components/potinho/BackToStoreButton";
import FreeShippingBar from "@/components/potinho/FreeShippingBar";
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

const title = "potinho — comedouro elevado com o nome do seu pet";
const description =
  "Comedouros elevados impressos em 3D, com o nome do pet gravado em relevo na peça — tamanho e cores na medida de cada casa, entregues na porta.";
const ogImage = "/products/comedouro-pet/montado.png";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  title,
  description,
  openGraph: {
    title,
    description,
    url: "/",
    siteName: "potinho",
    images: [ogImage],
    locale: "pt_BR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: [ogImage],
  },
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
      <body className="min-h-full flex flex-col pt-9">
        <FreeShippingBar />
        <BackToStoreButton />
        {children}
      </body>
    </html>
  );
}
