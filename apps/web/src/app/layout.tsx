import type { Metadata, Viewport } from "next";
import {
  Atkinson_Hyperlegible_Mono,
  Atkinson_Hyperlegible_Next,
  Bricolage_Grotesque,
} from "next/font/google";
import "./globals.css";

// Self hosted by next/font (served from this origin and precached with the shell), so
// the first offline open never waits on a font request. Only the weights DESIGN.md uses.
const display = Bricolage_Grotesque({
  weight: "700",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-bricolage",
});

const text = Atkinson_Hyperlegible_Next({
  weight: ["400", "600"],
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson-next",
});

const mono = Atkinson_Hyperlegible_Mono({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-atkinson-mono",
});

export const metadata: Metadata = {
  title: "Morning Feed",
  description: "Today's newsletters, ready before your commute.",
  appleWebApp: {
    capable: true,
    title: "Morning",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#F5F7F8",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${text.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
