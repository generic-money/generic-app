import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import localFont from "next/font/local";

import { headers } from "next/headers";

import { Footer } from "@/components/navigation/footer";
import { Navbar } from "@/components/navigation/navbar";
import ContextProvider from "@/context";
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
        className={`${gilroy.variable} ${geistMono.variable} bg-background text-foreground antialiased`}
      >
        <ContextProvider cookies={cookies}>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ContextProvider>
      </body>
    </html>
  );
}
