// Gera src/data/capturadas.json com os PNGs já salvos em static/img/manual/.
// Roda automaticamente antes de `npm start` e `npm run build`.
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
const dir = new URL('../static/img/manual/', import.meta.url);
const arquivos = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.png') && !f.startsWith('_')) : [];
writeFileSync(new URL('../src/data/capturadas.json', import.meta.url), JSON.stringify(arquivos.sort(), null, 2) + '\n');
console.log(`[capturas] ${arquivos.length} imagens encontradas`);
