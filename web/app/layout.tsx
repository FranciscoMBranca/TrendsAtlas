import type { Metadata } from "next";
// Fonts are bundled from npm (@fontsource) and served by this site: no request to
// Google Fonts at build or run time (light mode, W26; reliable CI builds).
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/700.css";
import "../styles/index.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: "Atlas de Tendências — A geografia da mudança",
  description:
    "Onde o planeta está a mudar, quanto, e se a mudança é distinguível do acaso: temperatura, chuva, vegetação, gelo, aerossóis e nível do mar. Mapas interactivos, regiões em contraste e método explicado.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
