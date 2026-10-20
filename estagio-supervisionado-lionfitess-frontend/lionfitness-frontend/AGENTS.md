# Lion Fitness — frontend Graphite Performance

## Escopo vigente

As funcionalidades existentes são a base a preservar. O trabalho aprovado é visual: frontend mais moderno, bonito, responsivo, acessível e com animações funcionais. Não ampliar o trabalho para backend, banco, autenticação, permissões, endpoints, payloads, cálculos, pagamentos, persistência de treinos ou migração de rotas. Refatorações locais de apresentação são aceitáveis quando necessárias ao visual.

## Leitura seletiva

Ao retomar implementação visual, leia [STATUS.md](frontend-design/STATUS.md) e [01-VISUAL.md](frontend-design/01-VISUAL.md). Depois abra somente o bloco relacionado à tarefa:

| Tarefa | Bloco |
| --- | --- |
| Controles, tabelas, formulários, overlays ou fontes externas | [02-COMPONENTES.md](frontend-design/02-COMPONENTES.md) |
| Animações e microinterações | [03-MOVIMENTO.md](frontend-design/03-MOVIMENTO.md) |
| Escolher tela e localizar arquivos | [04-TELAS.md](frontend-design/04-TELAS.md) |
| Verificar uma entrega | [05-QA.md](frontend-design/05-QA.md) |

## Execução econômica

- Preserve as decisões visuais aprovadas; não reabra a direção estética a cada tarefa.
- Leia apenas os arquivos de código afetados e suas dependências diretas. Evite repetir inventário completo, relatórios e histórico da conversa.
- Não recarregue todos os guias nem pesquise novamente todas as referências. Consulte a fonte exata quando a integração exigir licença, compatibilidade ou API atual.
- Reutilize a stack e componentes locais; não instale bibliotecas para comprovar uso de uma referência.
- Trabalhe por tela ou componente; não faça migração geral JSX/TSX, troca de framework ou reestruturação de estado como parte do redesign.
- Após uma entrega, atualize somente o status afetado, verificações e próximo passo em STATUS.md. Registre limites sem repetir o relatório inteiro.
- Documentação isolada não exige build, screenshots ou testes de aplicação. Código visual exige as verificações proporcionais descritas em 05-QA.md.
- A documentação não inicia trabalho agendado nem autoriza publicação. Não faça commit, push ou deploy como efeito colateral do redesign.

## Skills e ferramentas solicitadas pelo usuário

A partir de 19/10/2026, aplicar [06-SKILLS.md](frontend-design/06-SKILLS.md) nas próximas tarefas visuais. Não basta citar as fontes: ler a skill relevante, aplicar seu fluxo e registrar evidência/limites. A direção Graphite aprovada e o escopo funcional continuam prevalecendo.

## Fonte de verdade

Pedido atual do usuário e código real prevalecem sobre relatórios antigos. Estes guias são a especificação vigente; GRAPHITE_PERFORMANCE.md é o registro histórico do primeiro incremento. Markdown não instala componentes, não é executado pelo frontend e não substitui a leitura do código necessário.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
