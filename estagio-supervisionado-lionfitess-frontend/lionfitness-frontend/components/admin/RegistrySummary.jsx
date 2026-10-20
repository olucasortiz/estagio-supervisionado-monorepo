"use client";
import { Users, CheckCircle2, CirclePause } from "lucide-react";

export default function RegistrySummary({ items = [], label }) {
  const active = items.filter((item) => item.active !== false).length;
  return <dl className="gp-registry-summary" aria-label={`Resumo de ${label} carregados`}>
    <div><dt><Users size={16} aria-hidden="true" />Na listagem</dt><dd>{items.length}</dd></div>
    <div><dt><CheckCircle2 size={16} aria-hidden="true" />Ativos</dt><dd>{active}</dd></div>
    <div><dt><CirclePause size={16} aria-hidden="true" />Inativos</dt><dd>{items.length - active}</dd></div>
  </dl>;
}
