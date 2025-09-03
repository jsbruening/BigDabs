import "~/styles/globals.css";

import { type Metadata } from "next";
import { Inter } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/ThemeProvider";
import { Header } from "~/components/Header";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "Big Dabs",
  description: "Play bingo with friends. Stamp your way to victory.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable}`} style={{ height: '100%' }}>
      <body className="bg-slate-50 text-slate-900" style={{ height: '100%', margin: 0, padding: 0 }}>
        <SessionProvider>
          <TRPCReactProvider>
            <ThemeProvider>
              <Header />
              {children}
            </ThemeProvider>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}