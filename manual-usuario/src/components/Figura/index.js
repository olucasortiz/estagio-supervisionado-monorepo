import React, {useState} from 'react';
import useBaseUrl from '@docusaurus/useBaseUrl';
import Link from '@docusaurus/Link';
import {FIGURAS_POR_ID, PADRAO_CAPTURA, PENDENCIAS} from '@site/src/data/figuras';
import styles from './styles.module.css';

/**
 * <Figura id="LOGIN-01" />
 * Se static/img/manual/<arquivo> existir, mostra a imagem com legenda.
 * Caso contrário, mostra um marcador explícito descrevendo a imagem pendente.
 */
export default function Figura({id}) {
  const fig = FIGURAS_POR_ID[id];
  const [faltando, setFaltando] = useState(false);
  const src = useBaseUrl(fig ? `/img/manual/${fig.arquivo}` : '/img/manual/_');

  if (!fig) {
    return (
      <div className={styles.erro} role="alert">
        Figura <code>{id}</code> não está cadastrada em <code>src/data/figuras.js</code>.
      </div>
    );
  }

  return (
    <figure className={styles.figura} id={`fig-${fig.id}`}>
      {/* Tenta carregar a imagem real; se não existir, mostra o marcador. */}
      {!faltando && (
        <img
          src={src}
          alt={fig.titulo}
          loading="lazy"
          onError={() => setFaltando(true)}
          className={styles.img}
        />
      )}
      {faltando && (
        <div className={styles.marcador} role="note" aria-label={`Imagem pendente ${fig.id}`}>
          <div className={styles.topo}>
            <span className={styles.selo}>IMAGEM PENDENTE</span>
            <strong className={styles.id}>{fig.id}</strong>
            {fig.mobile && <span className={styles.chip}>celular</span>}
            {fig.destaque && <span className={styles.chip}>anotar com setas/números</span>}
          </div>
          <dl className={styles.dados}>
            <dt>Arquivo</dt>
            <dd><code>static/img/manual/{fig.arquivo}</code></dd>
            <dt>Tela</dt>
            <dd><code>{fig.tela}</code></dd>
            <dt>Perfil</dt>
            <dd>{fig.perfil}</dd>
            <dt>Capturar</dt>
            <dd>{fig.capturar}</dd>
            {fig.preparo && (<><dt>Preparo</dt><dd>{fig.preparo}</dd></>)}
            {PENDENCIAS[fig.id] && (<><dt>Por que falta</dt><dd>{PENDENCIAS[fig.id]}</dd></>)}
            <dt>Tamanho</dt>
            <dd>{fig.mobile ? PADRAO_CAPTURA.mobile : PADRAO_CAPTURA.resolucao}</dd>
          </dl>
          <Link to="/manual/lista-de-imagens" className={styles.link}>Ver a lista completa de imagens</Link>
        </div>
      )}
      <figcaption className={styles.legenda}>
        <strong>Figura {fig.id}</strong> — {fig.titulo}
      </figcaption>
    </figure>
  );
}
