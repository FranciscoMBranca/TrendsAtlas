import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import "../styles/index.css";
import Providers from "./providers";

// next/font downloads the files at build time and serves them from this site:
// no request to Google Fonts at runtime (light mode, W26).
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-sans", display: "swap" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono", display: "swap" });
const newsreader = Newsreader({ subsets: ["latin"], weight: ["400", "500"], style: ["normal", "italic"], variable: "--font-newsreader", display: "swap" });

export const metadata: Metadata = {
  title: "Atlas de Tendências — A geografia da mudança",
  description:
    "Onde o planeta está a mudar, quanto, e se a mudança é distinguível do acaso: temperatura, chuva, vegetação, gelo, aerossóis e nível do mar. Mapas interactivos, regiões em contraste e método explicado.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt" className={`${plexSans.variable} ${plexMono.variable} ${newsreader.variable}`}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
