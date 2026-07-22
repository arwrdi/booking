import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Dyvara",
    template: "%s | Dyvara",
  },
  description: "Dyvara Beauty Studio — booking layanan dengan worker pilihanmu.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      className={`${dmSans.variable} ${fraunces.variable} h-full antialiased`}
      style={{ backgroundColor: "#f5f0fa", colorScheme: "light" }}
    >
      <body
        className="flex min-h-full flex-col bg-[#f5f0fa] font-sans text-foreground"
        style={{ backgroundColor: "#f5f0fa" }}
      >
        {children}
      </body>
    </html>
  );
}
