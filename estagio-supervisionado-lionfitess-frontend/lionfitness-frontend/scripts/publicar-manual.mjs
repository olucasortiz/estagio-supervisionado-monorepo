// Gera o Manual do Usuário (../../manual-usuario) e o copia para public/ajuda,
// de onde o sistema o serve em /ajuda. Rode antes de `next build` quando o manual mudar.
import { execSync } from "node:child_process";
import { cpSync, rmSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const aqui = path.dirname(fileURLToPath(import.meta.url));
const manual = path.resolve(aqui, "../../../manual-usuario");
const destino = path.resolve(aqui, "../public/ajuda");

if (!existsSync(manual)) throw new Error(`Pasta do manual não encontrada: ${manual}`);
if (!existsSync(path.join(manual, "node_modules"))) execSync("npm ci", { cwd: manual, stdio: "inherit" });

execSync("npm run build", { cwd: manual, stdio: "inherit", env: { ...process.env, DOCS_BASE_URL: "/ajuda/" } });
rmSync(destino, { recursive: true, force: true });
cpSync(path.join(manual, "build"), destino, { recursive: true });
console.log(`Manual publicado em ${destino} (acesse /ajuda/manual/administrador/introducao).`);
