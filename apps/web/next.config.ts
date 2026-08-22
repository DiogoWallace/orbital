import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota só o que o build alcança, para a imagem de produção não carregar
  // um node_modules inteiro. Ver apps/web/Dockerfile.
  output: "standalone",

  // O monorepo tem package.json na raiz do app; sem esta âncora o Next tenta
  // inferir a raiz e avisa a cada build.
  outputFileTracingRoot: __dirname,

  poweredByHeader: false,

  // Cabeçalhos aplicados a toda resposta. O CSP fica de fora por ora: o Next
  // injeta estilos inline e um CSP mal calibrado quebra a página em produção
  // sem quebrar em desenvolvimento. Entra com nonce quando houver tempo de
  // validar direito.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
