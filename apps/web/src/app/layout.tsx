import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// O design system pede Inter em 400/500/600/700. Servida pelo `next/font`, e
// não pelo `@import` do Google Fonts que o bundle do sistema traz: assim o
// arquivo é hospedado junto do app, sem requisição a terceiro no primeiro
// paint e sem o salto de fonte que vem junto.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

// Monoespaçada com dígitos de largura fixa: leitura de instrumento não pode
// dançar enquanto o valor muda.
const mono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Orbital — plataforma científica interativa",
    template: "%s · Orbital",
  },
  description:
    "Um laboratório digital: simulações, visualizações e análise de dados em física, astronomia, engenharia e química.",
};

export const viewport: Viewport = {
  themeColor: "#161826",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // `data-scroll-behavior` confirma ao Next que a rolagem suave do
  // `globals.css` é intencional: sem ele, o roteador desativa a própria
  // restauração de posição entre rotas para não brigar com a animação.
  return (
    <html
      lang="pt-BR"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${mono.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
