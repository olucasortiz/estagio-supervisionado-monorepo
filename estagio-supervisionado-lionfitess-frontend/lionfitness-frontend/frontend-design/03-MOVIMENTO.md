# Movimento funcional

O usuário quer uma interface mais animada e refinada. Movimento deve explicar mudança de estado e responder à interação, preservando a velocidade de uso.

| Situação | Tratamento preferido |
| --- | --- |
| Hover, foco e pressionamento | 120–180 ms; cor/borda, deslocamento discreto somente se útil |
| Abrir ou fechar overlay | 180–240 ms; opacidade e pequeno deslocamento |
| Troca de conteúdo/aba | 150–200 ms; preservar posição e contexto |
| Carregamento | Estado claro, sem bloquear áreas independentes |
| Salvar, copiar ou confirmar | Feedback imediato e curto; texto confirma o resultado real |
| Cronômetro de treino | Exibir o estado do temporizador existente, sem alterar sua lógica |

- Preferir CSS para efeitos simples; nenhuma nova dependência de animação é necessária por padrão.
- Animar transform/opacity; para cores, declarar propriedades específicas. Evitar `transition: all` e animações de tamanho que desloquem conteúdo.
- Respeitar `prefers-reduced-motion`; remover movimento não essencial sem ocultar feedback.
- Não criar brilho, parallax, loops decorativos ou entrada animada de cada linha da tabela.
- Feedback financeiro só confirma quando a resposta existente confirmar. A animação não pode antecipar sucesso.
- Preservar foco, clique, teclado e possibilidade de interromper a interação. Animação não adiciona etapas ao fluxo.
- Estado de envio impede duplicidade enquanto a operação estiver em andamento; erro preserva dados para correção.
