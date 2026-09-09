/**
 * Formata CPF puramente para exibição visual.
 * 12312344444 -> 123.123.444-44
 * Preserva valores originais sem fabricar dados caso formato não corresponda a 11 dígitos.
 */
export function formatCpf(cpf?: string | null): string {
  if (!cpf || typeof cpf !== "string") return "—";
  const trimmed = cpf.trim();
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 11) {
    return digitsOnly.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return trimmed || "—";
}
