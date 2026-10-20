# Skills e ferramentas — uso efetivo

Pedido explícito em 19/10/2026: utilizar as skills e tecnologias indicadas. Este bloco complementa os guias anteriores e prevalece sobre a antiga opção de usar somente componentes locais.

## Antes de uma tarefa visual

1. Ler STATUS e o guia da tela. Identificar se é implementação, crítica, reprodução de imagem ou QA.
2. Ler a skill apropriada abaixo; aplicar suas instruções relevantes. Não ler todas em cada turno.
3. Preservar Graphite Performance e os fluxos existentes. Regras estéticas genéricas das skills não substituem decisões explícitas aprovadas. Nunca inventar dados de produção ou ampliar backend para atender uma skill.
4. Registrar fonte, componente, adaptação e verificações. Instalação não equivale a aplicação; aplicação não equivale a todas as verificações passadas.

## Skills instaladas no Codex

Local nesta máquina: `C:/Users/lucas/.codex/skills/`. A descoberta automática estará disponível a partir do próximo turno; os arquivos podem ser lidos diretamente. Em outra máquina, instalar com skill-installer a partir das fontes abaixo.

| Fonte | Diretório local / aplicação |
| --- | --- |
| anthropics/skills, skills/frontend-design | frontend-design: planejar hierarquia, tokens e composição; construir e criticar com captura real |
| Leonxlnx/taste-skill, skills/taste-skill | taste-skill; nome interno design-taste-frontend. Para este SaaS, seguir references/app-screens.md. Manter palette/type aprovados; compor a partir dos dados e trabalhos reais |
| vercel-labs/agent-skills, skills/web-design-guidelines | web-design-guidelines: buscar as regras atuais da Vercel e revisar os arquivos afetados; registrar achados e limites |
| Leonxlnx/imagegen-skills, skills/image-to-code | image-to-code atual: geração/análise/implementação quando a tarefa exigir nova exploração por imagem. Nos incrementos operacionais já aprovados, não regenerar protótipos automaticamente; registrar essa exceção do projeto |
| microsoft/playwright-cli, skills/playwright-cli | playwright-cli: referência dos comandos de QA; execução local via npm run qa:browser -- <comando> |

Redesign Skill está aposentada e aponta para Taste Skill. O caminho antigo Image to Code contém só aviso de mudança; usar a versão atual instalada em image-to-code.

## Aplicação nesta preparação

- Frontend Design: mantidos os tokens, tipografia e alinhamento Graphite; foco funcional sem decoração contínua.
- Taste Skill: draw de app executado e registrado em references/taste/direction.json; revisão estática de finance.css e FinanceMetrics.jsx: 0 FAIL/0 WARN. A direção sorteada/selecionada é consultiva: preto puro, limite de cor e substituição do shell não prevalecem sobre o Graphite aprovado. Não foi executado inspect.mjs no navegador; não declarar uma aprovação visual da Taste Skill.
- Web Design Guidelines: regras atuais consultadas; integração de foco mantém outline por teclado e respeita redução de movimento. Não equivale a auditoria completa do sistema.
- MicroKit: adaptação real do Focus Field em app/dashboard/microkit-focus.css, aplicado aos inputs/textarea dos cadastros, financeiro, catálogo e à busca de alunos PERSONAL. Fichas/diálogos de prescrição usam adaptação equivalente em app/personal/workouts.css, com crédito e licença referenciados. Tokens compartilhados em app/graphite-tokens.css. Fonte original e licença MIT em references/microkit. Preservados IDs, eventos e validações.
- Playwright CLI: versão 0.1.22 fixada em devDependencies. CLI validado por --version; a validação de navegação anterior usou o navegador do ambiente, não o CLI. Respeitar restrições da ferramenta disponível quando controlar o navegador.
- Image to Code: instalada e preparada; nenhuma nova imagem gerada nesta tarefa de configuração.

## Demais fontes

| Fonte | Uso e estado |
| --- | --- |
| Refero / Inspora | Referência de telas/temas; consultar exemplos específicos quando houver acesso. Não são pacotes npm e não foram integrados como código |
| Awesome Design (VoltAgent/awesome-design-md) | Catálogo candidato dos guias anteriores; confirmar a identidade da fonte antes de dizer que é a indicada originalmente |
| Spell UI | Fonte oficial consultada; componentes ainda não incorporados. Selecionar um componente necessário, verificar licença e dependências React/Tailwind antes de copiar |
| MicroKit | Focus Field incorporado com licença; não existe pacote de runtime para instalar |
| Bencho | Biblioteca consultada; selecionar interação funcional e verificar licença antes de incorporar |
| Details Vault | Fonte consultada; conferir acesso/licença do bloco selecionado. Não copiar conteúdo restrito nem instalar um pacote fictício |

Não importar todas as bibliotecas em massa. Cada integração precisa corresponder a uma necessidade real da tela e passar por QA. Não transformar telas administrativas em landing pages com efeitos contínuos.

## QA e custo

Continuar 05-QA.md. CLI é ferramenta de desenvolvimento, não dependência do site em produção. Não usar credenciais nem serviços de cobrança reais em testes. Evitar guardar estado de autenticação no repositório. Os scripts da Taste que abrem outro navegador só devem ser usados quando permitidos pelo ambiente; caso contrário registrar o limite e usar o navegador autorizado. Não instalar browsers ou fazer upgrade de toda a stack sem necessidade.

O npm reportou 15 vulnerabilidades ao instalar a ferramenta; a origem não foi auditada nesta tarefa. Não executar audit fix --force como efeito colateral do redesign.

## Verificação desta integração

CLI confirmou 0.1.22; lint, build/TypeScript e diff passaram. Foco por Tab no campo de Plano conferido nos dois temas, com outline sólido e transição de 160 ms; captura lion-microkit-foco-v5.jpg. Não houve alteração de handlers nem submissão de dados nesta integração.
