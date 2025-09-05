import "~/styles/globals.css";

import { type Metadata } from "next";
import { Inter, Shadows_Into_Light } from "next/font/google";

import { TRPCReactProvider } from "~/trpc/react";
import { ThemeProvider } from "~/components/ThemeProvider";
import { Header } from "~/components/Header";
import { Navigation } from "~/components/Navigation";
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

const shadowsIntoLight = Shadows_Into_Light({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-shadows-into-light",
});


export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${shadowsIntoLight.variable}`} style={{ height: '100%' }}>
      <body className="bg-slate-50 text-slate-900" style={{ height: '100%', margin: 0, padding: 0 }}>
        <SessionProvider>
          <TRPCReactProvider>
            <ThemeProvider>
              <Header />
              <Navigation />
              {children}
            </ThemeProvider>
          </TRPCReactProvider>
        </SessionProvider>
      </body>
    </html>
  );
}