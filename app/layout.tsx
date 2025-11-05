import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

import { Navbar } from "@/components/navigation/navbar";
import "./globals.css";

const gilroy = localFont({
  variable: "--font-gilroy",
  src: [
    {
      path: "../public/fonts/Gilroy-Medium.ttf",
      weight: "400 500",
      style: "normal",
    },
    {
      path: "../public/fonts/Gilroy-SemiBold.ttf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../public/fonts/Gilroy-Black.ttf",
      weight: "900",
      style: "normal",
    },
  ],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Generic Money",
  description: "Generic Money dashboard",
  icons: {
    icon: [
      { rel: "icon", url: "/Icon.svg" },
      { rel: "shortcut icon", url: "/Icon.svg" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${gilroy.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <div className="flex min-h-screen flex-col">
          <Navbar />
          <main className="flex-1">{children}</main>
        </div>
      </body>
    </html>
  );
}
