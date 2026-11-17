import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: __dirname,
  },
  // O Manual do Usuário (public/ajuda, gerado por `npm run manual:publicar`) é um site estático:
  // cada página é uma pasta com index.html, que o Next não serve sozinho a partir de public/.
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/ajuda", destination: "/ajuda/index.html" },
        { source: "/ajuda/manual", destination: "/ajuda/manual/index.html" },
        { source: "/ajuda/manual/:path((?!index).+)", destination: "/ajuda/manual/:path/index.html" },
      ],
    };
  },
};

export default nextConfig;
