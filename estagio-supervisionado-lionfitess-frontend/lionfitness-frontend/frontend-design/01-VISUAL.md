# Direção aprovada: Graphite Performance

SaaS profissional com identidade fitness premium. Interface operacional, legível e sóbria; energia visual concentrada na marca, nos títulos e na ação principal. Preservar todas as funcionalidades e os dados existentes.

## Tokens de referência

| Papel | Grafite | Claro |
| --- | --- | --- |
| Fundo | #111315 | #F5F6F7 |
| Painel | #191C20 | #FFFFFF |
| Superfície elevada | #22262B | #FFFFFF |
| Texto principal | #F4F5F6 | #171A1E |
| Texto secundário | #A7AFBA | #596372 |
| Borda | #343B45 | #D7DCE2 |
| Contorno de campo | #697586 | #7B8796 |
| Ação principal | #C9343D | #B4232D |
| Texto da ação | #FFFFFF | #FFFFFF |
| Foco | #B7C9FF | #335CBB |

Tokens compartilhados: `app/graphite-tokens.css`, delimitados por `.graphite-admin` e `.graphite-personal`; apresentação em `app/dashboard/graphite.css` e `app/personal/personal.css`. Reutilizar nomes semânticos; não espalhar cores novas por páginas. Ao expandir, verificar herança em portais de overlays. Manter preferência de tema e exceções de login existentes até uma tarefa visual específica desse fluxo.

## Tipografia e composição

- Reutilizar Inter para leitura e dados. No ADMIN, Plus Jakarta Sans para títulos. ALUNO já carrega Archivo localmente; manter e harmonizar antes de propor outra fonte.
- Texto principal 14–16 px, títulos 26–34 px, números tabulares e formatos pt-BR.
- Espaçamento em múltiplos de 4 px; controles com raio de 8 px, painéis de 12 px.
- Tabelas para comparação; cartões para síntese ou adaptação mobile. Alinhamento predominantemente à esquerda.
- Vermelho indica ação principal. Sucesso, alerta e destrutivo têm tokens próprios e texto/ícone; nunca apenas cor.
- No mobile, preservar acesso a dados e ações, sem transbordamento da página. Alvos de toque preferencialmente 44 px.
- Sem gradientes decorativos, brilho contínuo, glassmorphism, cartões excessivamente aninhados, números fictícios ou controles sem comportamento.

Os protótipos aprovados são conceitos; não usar a imagem como justificativa para inventar recursos, imagens de exercícios, métricas, arraste ou dados persistidos ausentes no código.
