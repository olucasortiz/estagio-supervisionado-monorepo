# Graphite Performance — primeiro incremento

Registro histórico. A especificação vigente e o índice de leitura seletiva estão em [AGENTS.md](AGENTS.md) e `frontend-design/`. O escopo atual é exclusivamente visual; preservar funcionalidades, rotas e arquitetura existentes.

Escopo: shell administrativo e fluxo de alunos. Os portais PERSONAL e ALUNO ainda não foram migrados. Nenhuma dependência foi adicionada. As permissões, endpoints, regras financeiras e exportações existentes foram preservados.

## Direção e referências

Os protótipos de 18/10/2026 definem a direção aprovada: superfícies grafite sólidas, vermelho Lion para ação, números tabulares, leitura clara e hierarquia por tarefa. O tema claro continua disponível e a preferência salva do usuário é respeitada. As fontes já carregadas Inter e Plus Jakarta Sans são reutilizadas.

| Fonte | Aplicação neste incremento |
| --- | --- |
| Anthropic Frontend Design — https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md | Composição específica para gestão de academia; contenção de decoração e movimento; títulos e controles com hierarquia própria. |
| Vercel Web Interface Guidelines — https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md | Link de salto, nomes acessíveis, ordenação por teclado, foco em overlays, indicação de etapa, mensagens de estado, redução de movimento e alvos de toque. |
| Refero Styles — https://styles.refero.design/ | Referência de sistemas semânticos; os tokens usados são próprios do Lion, não uma cópia de um tema de terceiro. |
| MicroKit — https://microkit.co/ | Referência de feedback curto em controles e estados de interação; sem incorporar snippets. |
| Bencho — https://bencho.dev/ | Referência de navegação e estados de componentes; sem incorporar snippets. |

Taste/redesign, Inspora, Awesome Design, Spell UI e Details Vault permanecem fontes para revisão e próximos incrementos. Nenhum componente ou tema específico dessas fontes foi importado. Não se presume instalação, uso de MCP, licença de snippets nem compatibilidade por aparência. O menu mobile reutiliza o Dialog local; botões, tabela e gaveta continuam componentes do Lion.

## Limites e validação

Os estilos estão delimitados por `.graphite-admin`; a expansão visual do dashboard e demais portais continua pendente. Mudanças de rotas não pertencem ao redesign. A listagem usa os alunos já carregados, sem inventar métricas globais. Testes de navegador devem usar API local de fixtures; nunca o fallback publicado. Não executar pagamentos reais ou operações na base publicada para validar aparência.
