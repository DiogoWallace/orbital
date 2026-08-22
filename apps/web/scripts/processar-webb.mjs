/**
 * Converte os JPEG baixados da ESA/Webb em WebP dimensionado para a página.
 *
 * Roda uma vez, à mão, dentro do container do web (onde o `sharp` já existe
 * como dependência do Next). O resultado é versionado; este script fica junto
 * para que a origem e os parâmetros de compressão sejam reproduzíveis.
 *
 *   docker compose exec web node scripts/processar-webb.mjs
 */
import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ORIGEM = ".webb-src";
const DESTINO = "public/webb";

/** O herói é full-bleed e precisa aguentar tela grande; o resto vive em grade. */
const LARGURAS = {
  "carina-cosmic-cliffs": 2400,
};
const LARGURA_PADRAO = 1400;

const NOMES = {
  weic2205a: "carina-cosmic-cliffs",
  weic2216b: "pilares-da-criacao",
  weic2209a: "campo-profundo",
  weic2208a: "quinteto-de-stephan",
  weic2212a: "nebulosa-da-tarantula",
  weic2214a: "netuno",
};

await mkdir(DESTINO, { recursive: true });

for (const arquivo of await readdir(ORIGEM)) {
  if (!arquivo.endsWith(".jpg")) continue;

  const id = path.basename(arquivo, ".jpg");
  const nome = NOMES[id];

  if (!nome) {
    console.warn(`sem nome definido para ${id}, pulando`);
    continue;
  }

  const saida = path.join(DESTINO, `${nome}.webp`);

  const { width, height } = await sharp(path.join(ORIGEM, arquivo))
    // `withoutEnlargement`: se a origem já for menor que o alvo, ampliar só
    // gastaria bytes para inventar pixel que não existe.
    .resize({ width: LARGURAS[nome] ?? LARGURA_PADRAO, withoutEnlargement: true })
    .webp({ quality: 80, effort: 6 })
    .toFile(saida);

  const { size } = await stat(saida);

  console.log(
    `${nome.padEnd(24)} ${String(width).padStart(5)}x${String(height).padEnd(5)} ` +
      `${(size / 1024).toFixed(0).padStart(5)} KB`,
  );
}
