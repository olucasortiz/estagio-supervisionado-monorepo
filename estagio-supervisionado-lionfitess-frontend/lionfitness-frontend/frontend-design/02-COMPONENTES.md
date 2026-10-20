# Componentes e referências

## Reutilização local

Stack: Next App Router, React 19, Tailwind 4, TypeScript/JSX, Lucide. PDFs usam jsPDF/AutoTable. Conferir versões no package.json se uma integração depender delas.

| Necessidade | Base existente |
| --- | --- |
| Estrutura ADMIN | components/admin/GraphiteAdminShell.tsx |
| Botão e campos | components/ui/button.tsx, input.tsx, select.tsx |
| Tabela, busca e status | components/ui/DataTable.jsx, SearchInput.jsx, StatusBadge.jsx |
| Diálogo e gaveta | components/ui/dialog.tsx, Drawer.jsx |
| Cadastro de aluno | components/ui/MemberWizardDrawer.jsx |
| Pagamentos | components/payment/* e components/ui/*PaymentModal.jsx |

Esses componentes são próprios; não presumir contratos completos de Shadcn/Radix. `Button.asChild` é ignorado, `cn()` não resolve conflitos Tailwind e o gráfico administrativo é SVG próprio. Usar variantes explícitas; verificar chamadas antes de mudar uma API compartilhada.

## Papel das fontes indicadas pelo usuário

| Fonte | Aplicação |
| --- | --- |
| [Frontend Design Anthropic](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | Hierarquia, tipografia e composição ligadas ao domínio fitness |
| [Taste Skill](https://github.com/Leonxlnx/taste-skill) | Crítica visual; variante de redesign para projeto existente |
| [Web Design Guidelines](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) | Foco, formulários, responsividade e interação |
| [Image to Code — candidato identificado](https://github.com/Leonxlnx/taste-skill/tree/main/skills/image-to-code-skill) | Traduzir conceitos aprovados em componentes; não regenerar imagens a cada alteração |
| [Refero](https://styles.refero.design/) e [Inspora](https://www.inspora.design/) | Temas, densidade e composição |
| [Awesome Design — candidato](https://github.com/VoltAgent/awesome-design-md) | Referências de sistemas visuais; identidade original ainda não confirmada |
| [Spell UI](https://spell.sh/docs/introduction), [MicroKit](https://microkit.co/), [Bencho](https://bencho.dev/), [Details Vault](https://www.details.so/vault/hero-01/) | Componentes e microinterações pontuais compatíveis com a direção aprovada |
| [Playwright CLI](https://github.com/microsoft/playwright-cli) | Opção de inspeção e captura; não pressupor instalação |

O primeiro incremento não integrava snippets nem skills externas. Desde 19/10/2026, as skills estão instaladas e devem ser aplicadas conforme 06-SKILLS.md. Integração efetiva: MicroKit Focus Field em app/dashboard/microkit-focus.css, adaptado aos controles existentes, com licença e fonte em references/microkit. Playwright CLI 0.1.22 instalado para QA. As demais bibliotecas ainda exigem seleção por tela e licença; não declarar integração antes de incorporar e validar o código.

Para incorporar algo: selecionar componente específico, conferir licença/imports/React 19/Tailwind 4, adaptar aos tokens Lion e registrar origem e dependências nesta tabela ou no STATUS. Se a adaptação exigir mudança funcional, separar do redesign. Não executar instaladores genéricos que sobrescrevam componentes locais.
