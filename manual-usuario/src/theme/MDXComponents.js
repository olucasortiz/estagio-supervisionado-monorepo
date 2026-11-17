import React from 'react';
import MDXComponents from '@theme-original/MDXComponents';
import Figura from '@site/src/components/Figura';
import ListaFiguras, {ResumoFiguras, PadraoCaptura} from '@site/src/components/ListaFiguras';

// Componentes disponíveis em todos os arquivos .md/.mdx sem precisar de import.
export default {
  ...MDXComponents,
  Figura,
  ListaFiguras,
  ResumoFiguras,
  PadraoCaptura,
};
