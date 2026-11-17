import React from 'react';
import {FIGURAS, PADRAO_CAPTURA, PENDENCIAS, agruparPorGrupo} from '@site/src/data/figuras';
import capturadas from '@site/src/data/capturadas.json';

const CAPTURADAS = new Set(capturadas);

export function ResumoFiguras() {
  const total = FIGURAS.length;
  const mobile = FIGURAS.filter((f) => f.mobile).length;
  const anotar = FIGURAS.filter((f) => f.destaque).length;
  const prontas = FIGURAS.filter((f) => CAPTURADAS.has(f.arquivo)).length;
  return (
    <ul>
      <li><strong>{prontas}</strong> capturadas e <strong>{total - prontas}</strong> pendentes, de <strong>{total}</strong> no total</li>
      <li><strong>{mobile}</strong> em formato de celular</li>
      <li><strong>{anotar}</strong> que merecem anotações (setas e números)</li>
    </ul>
  );
}

export function PadraoCaptura() {
  return (
    <table>
      <tbody>
        <tr><th>Resolução (desktop)</th><td>{PADRAO_CAPTURA.resolucao}</td></tr>
        <tr><th>Resolução (celular)</th><td>{PADRAO_CAPTURA.mobile}</td></tr>
        <tr><th>Formato</th><td>{PADRAO_CAPTURA.formato}</td></tr>
        <tr><th>Tema</th><td>{PADRAO_CAPTURA.tema}</td></tr>
        <tr><th>Dados</th><td>{PADRAO_CAPTURA.dados}</td></tr>
        <tr><th>Onde salvar</th><td><code>manual-usuario/static/img/manual/&lt;arquivo&gt;</code></td></tr>
      </tbody>
    </table>
  );
}

export default function ListaFiguras() {
  return (
    <>
      {agruparPorGrupo().map(([grupo, itens]) => (
        <section key={grupo}>
          <h2>{grupo}</h2>
          <div style={{overflowX: 'auto'}}>
            <table>
              <thead>
                <tr>
                  <th>Situação</th>
                  <th>ID</th>
                  <th>Arquivo</th>
                  <th>Tela</th>
                  <th>Perfil</th>
                  <th>O que mostrar</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((f) => (
                  <tr key={f.id}>
                    <td>{CAPTURADAS.has(f.arquivo) ? 'Capturada' : 'Pendente'}</td>
                    <td><code>{f.id}</code></td>
                    <td><code>{f.arquivo}</code></td>
                    <td><code>{f.tela}</code></td>
                    <td>{f.perfil}</td>
                    <td>
                      {f.capturar}
                      {f.preparo && <><br /><em>Preparo: {f.preparo}</em></>}
                      {!CAPTURADAS.has(f.arquivo) && PENDENCIAS[f.id] && <><br /><strong>Por que falta:</strong> {PENDENCIAS[f.id]}</>}
                      {f.mobile && <><br /><strong>Formato celular.</strong></>}
                      {f.destaque && <><br /><strong>Anotar com setas/números.</strong></>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </>
  );
}
