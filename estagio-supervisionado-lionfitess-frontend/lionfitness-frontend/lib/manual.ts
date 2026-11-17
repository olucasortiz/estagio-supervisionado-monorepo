/**
 * Endereço do Manual do Usuário (projeto Docusaurus em /manual-usuario).
 * Por padrão é servido pelo próprio sistema em /ajuda (veja `npm run manual:publicar`).
 * Para hospedar em outro lugar, defina NEXT_PUBLIC_MANUAL_URL com a base do site do manual,
 * sem barra no final (ex.: https://manual.exemplo.com).
 */
const MANUAL_BASE = (process.env.NEXT_PUBLIC_MANUAL_URL || "/ajuda").replace(/\/$/, "");

export const MANUAL_ADMIN_URL = `${MANUAL_BASE}/manual/administrador/introducao`;
