import { Analytics } from "@vercel/analytics/next";
import type { Metadata } from "next";
import localFont from "next/font/local";
import { headers } from "next/headers";

import { Footer } from "@/components/navigation/footer";
import { Navbar } from "@/components/navigation/navbar";
import { Toaster } from "@/components/ui/sonner";
import ContextProvider from "@/context";

import "./globals.css";

const gilroy = localFont({
  variable: "--font-gilroy",
  src: [
    {
      path: "../public/fonts/Gilroy-Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../public/fonts/Gilroy-RegularItalic.ttf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../public/fonts/Gilroy-Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../public/fonts/Gilroy-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Gilroy-Bold.ttf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../public/fonts/Gilroy-BoldItalic.woff",
      weight: "700",
      style: "italic",
    },
    {
      path: "../public/fonts/Gilroy-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Generic USD",
  description: "A better onchain dollar.",
  metadataBase: new URL("https://app.generic.money"),
  openGraph: {
    title: "Generic USD",
    description: "A better onchain dollar.",
    url: "https://app.generic.money",
    siteName: "Generic USD",
    images: [
      {
        url: "/opengraph.jpeg",
        width: 1200,
        height: 630,
        alt: "Generic USD",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    site: "@genericmoney",
    title: "Generic USD",
    description: "A better onchain dollar.",
    images: ["/opengraph.jpeg"],
  },
  keywords: [
    "defi",
    "stablecoin",
    "onchain",
    "usd",
    "crypto",
    "web3",
    "yield",
    "lending",
    "liquidity",
    "token",
    "digital dollar",
    "fiat-backed",
  ],
  icons: {
    icon: [
      { rel: "icon", url: "/Icon.svg" },
      { rel: "shortcut icon", url: "/Icon.svg" },
    ],
  },
};

export const viewport = {
  themeColor: "#3F79FF",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersObj = await headers();
  const cookies = headersObj.get("cookie");

  return (
    <html lang="en">
      <body
        className={`${gilroy.variable} bg-background text-foreground antialiased`}
      >
        <ContextProvider cookies={cookies}>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
          <Toaster position="top-right" closeButton />
          {/* Keep analytics enabled for production telemetry. */}
          <Analytics />
        </ContextProvider>
      </body>
    </html>
  );
}
