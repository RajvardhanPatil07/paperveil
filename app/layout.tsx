import type { Metadata } from "next";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/newsreader/500.css";
import "@fontsource/newsreader/600.css";
import { PaperToaster } from "@/components/ui/PaperToaster";
import "./globals.css";

export const metadata: Metadata = {
  title: "PaperVeil — Local-first claim appeal desk",
  description: "The agent gets capabilities, not your identity.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <PaperToaster />
      </body>
    </html>
  );
}
