// @ts-check
import {themes as prismThemes} from 'prism-react-renderer';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'Manual do Usuário — Lion Fitness',
  tagline: 'Guia passo a passo de todas as telas do Sistema de Gestão da Academia Lion Fitness',
  favicon: 'img/favicon.ico',

  future: {v4: true},

  url: 'https://estagio-supervisionado-monorepo.vercel.app',
  // O sistema serve o manual em /ajuda/ (DOCS_BASE_URL=/ajuda/); isolado, usa a raiz.
  baseUrl: process.env.DOCS_BASE_URL || '/',

  organizationName: 'olucasortiz',
  projectName: 'estagio-supervisionado-monorepo',

  // Páginas com figuras pendentes continuam compilando; imagens ausentes viram marcadores.
  onBrokenLinks: 'throw',

  stylesheets: [
    'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500..800&family=Inter:wght@400;500;600&display=swap',
  ],

  i18n: {defaultLocale: 'pt-BR', locales: ['pt-BR']},

  markdown: {
    hooks: {onBrokenMarkdownLinks: 'warn'},
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/manual',
          sidebarPath: './sidebars.js',
          showLastUpdateTime: false,
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {defaultMode: 'dark', respectPrefersColorScheme: true},
      navbar: {
        title: 'Lion Fitness',
        logo: {alt: 'Lion Fitness', src: 'img/logo.png'},
        items: [
          {type: 'docSidebar', sidebarId: 'manualSidebar', position: 'left', label: 'Manual'},
          {to: '/manual/lista-de-imagens', label: 'Lista de imagens', position: 'right'},
        ],
      },
      footer: {
        style: 'light',
        copyright: `Manual do Usuário do Sistema Lion Fitness · Estágio Supervisionado, FIPP · versão 1.1`,
      },
      docs: {sidebar: {hideable: true, autoCollapseCategories: false}},
      tableOfContents: {minHeadingLevel: 2, maxHeadingLevel: 3},
      prism: {theme: prismThemes.github, darkTheme: prismThemes.dracula},
    }),
};

export default config;
