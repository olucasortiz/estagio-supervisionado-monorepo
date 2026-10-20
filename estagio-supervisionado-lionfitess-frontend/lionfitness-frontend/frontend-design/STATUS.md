# Estado para retomada

Atualizado em 19/10/2026. Pedido vigente: refinamentos pontuais na identidade Graphite Performance, sem refazer o redesign inteiro:
1. Feedbacks discretos na gestão de treinos (Toast compacto neutro).
2. Recuperação da data real de criação das fichas.
3. Ajuste de badges e indicadores de sucesso nos temas claro e escuro.
4. Aplicação do logotipo oficial da Lion Fitness (`03-LOGO-ORIGINAL-LION.png`).
5. Chat persistente bidirecional entre Aluno e Personal Trainer com histórico e notificações integradas.

## Publicação completa e correção PostgreSQL — 20/10/2026

- Push autorizado pelo usuário. Redesign, logo oficial, guias e correções publicados no GitHub em 67ab201; ativação PM2 ajustada em 1d57026. GitHub Actions run 39440985044 concluído com success. Frontend de produção agora usa /home/ubuntu/lion-frontend-releases/1d57026cf4090e6c970b11bc9d27314513272345/server.js. GET público /login = 200 com logo oficial e classes gp-auth.
- Workflow anterior apontava para pasta diferente da aplicação ativa. Agora npm ci/build roda no GitHub em Linux; artefato standalone inclui public e .next/static; servidor extrai release separada e troca somente lion-frontend no PM2, mantendo ambiente e retorno. Primeiro reload não alterou o caminho do script; corrigido para recriar o processo nomeado. Versão anterior preservada em /home/ubuntu/lionfitness-release, cópia Git remota com mudanças locais não foi sobrescrita.
- Novo erro 500 diagnosticado em logs: driver PostgreSQL não converte TIMESTAMPTZ diretamente para LocalDateTime. NotificationRepository agora lê Timestamp com calendário UTC, preserva instante e aceita read_at nulo. Sem alteração de schema ou dados. Teste de regressão incluído; 26 testes Notification* passaram e build/TypeScript frontend passou.
- Backend republicado como lion-fitness-backend:chat-dates-20261020, health UP, container anterior preservado: lion-backend-before-chat-20261020143631. API pública autenticada validada: /notifications/conversation = 200, com uma mensagem existente e nome real do personal; /notifications = 200. Nenhuma mensagem real ou e-mail de teste enviado. Troca bidirecional real entre duas sessões ainda não exercitada.
- As notas anteriores de frontend antigo ou backend pendente são históricas. Se uma aba antiga permanecer aberta, recarregá-la para carregar a release nova. Capturas outputs/ e screenshot_login.png continuam locais e não foram publicadas.
## Backend do chat publicado — 20/10/2026

- Publicação expressamente autorizada pelo usuário. Container lion-backend atualizado na AWS com imagem lion-fitness-backend:chat-20261020; health UP. Configuração, ambiente e porta preservados. Backup parado para retorno: lion-backend-before-chat-20261020142613. Frontend não publicado nesta etapa; sem commit/push.
- API pública validada com sessão real do aluno: GET /members/me/personal-trainer = 200 com nome correto; GET /notifications/conversation = 200 com interlocutor Personal teste tela notificações. POST /notifications/conversation/send com corpo vazio = 400 de validação, confirmando rota ativa sem gravar mensagem.
- Pacote backend validado por 25 testes Notification* aprovados, incluindo envio aluno/personal, bloqueio de aluno de outro personal e leitura restrita ao interlocutor. Nenhuma mensagem real ou e-mail de teste enviado. Troca real entre duas sessões ainda não exercitada.
- Após o antigo 404, recarregar a página ou clicar Tentar novamente para liberar o chat pausado. Esta atualização substitui as pendências de publicação do backend nas notas históricas abaixo. A entrega de e-mail real não foi homologada.
## Nome real do personal e recuperação — 20/10/2026

- Verificação real apenas de leitura: o cadastro do personal informado existe, possui usuário de acesso vinculado, ativo, com o mesmo e-mail e role PERSONAL_TRAINER. Não é ausência de cadastro; nenhum dado/credencial foi alterado e nenhuma solicitação de e-mail foi enviada.
- Backend: GET /members/me/personal-trainer deriva a identidade do usuário autenticado e retorna somente id/nome/foto do próprio personal; não usa userId informado pelo cliente nem abre a listagem ADMIN. LinkedPersonalTrainerResponse, MemberService e MemberController. Frontend consulta essa rota para preencher nome real no cartão e chat; carregamento/falha não são apresentados como um nome real fictício.
- E-mail: EmailService verifica remetente configurado e converte MailException em 503 legível. Log contém apenas classe da falha, sem destinatário/link/token/credencial; limites de tempo SMTP adicionados em application.properties. Mensagem padrão frontend de recuperação é condicional ao cadastro ativo, sem garantir entrega que não foi confirmada.
- Testes locais: 18 testes de vínculo, controlador, recuperação/URL e SMTP simulado passaram; controlador reexecutado com 2 novos casos de permissão/privacidade (8/8 passaram, 20 testes distintos no conjunto). Build/TypeScript frontend passou; lint sem erros, 2 avisos preexistentes.
- Pendente na API publicada: publicar estas alterações e as rotas de conversa anteriores. Não houve deploy. A causa específica da não entrega real do e-mail exige resposta HTTP da tentativa e/ou logs SMTP/configuração MAIL_USERNAME/MAIL_PASSWORD do servidor; configuração remota e caixa de entrada não foram acessadas. Não declarar envio corrigido/homologado somente pelos mocks. A consulta de nome nova também requer backend atualizado; o frontend sozinho não pode acessar legitimamente a lista administrativa com a sessão do aluno.

## Feedbacks e vínculo do aluno — 20/10/2026

- Toast.tsx/toast.css refinados: superfície neutra sólida, texto 14px regular com título curto, ícone discreto, fechar com alvo de 44px, animação curta/reduced-motion e temporizador que pausa ao apontar/focar. Posição superior direita evita competir com chat inferior. Timer não reinicia por mudança de referência de onClose.
- DashboardContent centraliza confirmações de sucesso de cadastros/financeiro em Toast; retiradas faixas equivalentes das listagens. Catálogo usa o mesmo componente. Erros continuam nos formulários.
- Data de nascimento: max no campo e mensagem específica de data futura. ApiError 400/409/422 tratado pelo formulário sem console.error; validação do servidor e retenção dos campos preservadas. Falhas inesperadas continuam registradas.
- Vínculo ALUNO: removida consulta à lista ADMIN-only /personal-trainers como requisito para reconhecer vínculo. Usa personalTrainerId do perfil; falha em carregar perfil não é convertida automaticamente em ausência de vínculo. Nome do interlocutor passa a vir da resposta autorizada da conversa; até lá mostra rótulo genérico, sem nomes inventados.
- Confirmação real somente leitura: conta indicada pelo usuário autenticou e GET /members/me retornou 200 com personalTrainerId preenchido. GET /notifications/conversation retornou 404. Nenhum cadastro/vínculo foi alterado e nenhuma mensagem foi enviada. Não guardar credenciais neste arquivo.
- Validação: lint sem erros (2 warnings preexistentes em NotificationBell/SheetsPanel), build/TypeScript passou; teste da função real de nascimento rejeita futuro/data inválida e aceita data válida. Sem rodada de navegador/capturas, conforme preferência de economia. Chat remoto ainda depende de disponibilizar as rotas do backend; sem deploy.

## Correção da integração do chat — 20/10/2026

- services/api.js: ApiError preserva status HTTP. Removidos fallbacks que convertiam todas as notificações em conversa, inferiam remetente por tipo, reenviavam POST por outro endpoint e ocultavam falha de marcação de leitura.
- FloatingChat.tsx: 404/405 e falhas de autorização pausam as consultas automáticas até tentativa manual; mensagem de indisponibilidade e envio bloqueado durante a pausa, rascunho preservado. Tentativa manual verifica a conversa por GET, sem reenviar POST automaticamente. Contadores/leitura atualizados apenas após confirmação; respostas antigas descartadas ao trocar aluno; rascunhos separados por conversa e trava de envio por ref.
- Verificação local: teste isolado com fetch simulado exercitou 20 falhas HTTP (GET/POST/PATCH), falha de rede sem reenvio e respostas de sucesso/204. Passou. Build/TypeScript passou. Lint sem erros, com 2 avisos anteriores em NotificationBell.tsx e SheetsPanel.tsx. Diff geral contém avisos de linhas vazias preexistentes em layout do aluno/ContactPersonalDialog, não modificados nesta correção. Sem QA de navegador nem mensagens em produção.
- Backend local: NotificationController.java expõe /notifications/conversation, /conversation/send e /conversation/read, coerentes com o cliente. O 404 da API publicada foi reportado pelo usuário; versão remota/proxy ainda não foram inspecionados. Não presumir que o backend local está publicado. Nenhum backend, banco, .env, commit, push ou deploy foi alterado.
- Estado: correção implementada e compilada localmente; integração do chat publicado permanece pendente de disponibilização/verificação dessas rotas no servidor. Não declarar chat remoto homologado.

## Concluído

- **Item 1 — Feedbacks na Gestão de Treinos**:
  - Removidos os grandes banners verdes estáticos de tela inteira em `components/personal/SheetsPanel.tsx` e `components/personal/BuilderPanel.tsx`.
  - Criado componente `components/ui/Toast.tsx`: toast compacto, flutuante no canto inferior direito (`fixed bottom-6 right-6 z-50`), superfície neutra (`bg-card/95 border-border`), ícone discreto, fechamento manual e desaparecimento automático (4.5s), com acessibilidade `role="status"`.
  - Mensagens de erro continuam visíveis junto aos formulários correspondentes.
  - Limpeza automática de feedback ao trocar aluno ou contexto em `app/personal/page.tsx`.

- **Item 2 — Datas Reais das Fichas**:
  - **Causa raiz identificada**: O backend Spring Boot serializa campos `LocalDateTime createdAt` como arrays numéricos JSON no formato `[ano, mês, dia, hora, minuto, segundo, nanossegundos]` (ex: `[2026, 5, 21, 9, 12, 19, 500566000]`). O mapper anterior checava estritamente `typeof value === "string"`, retornando vazio e exibindo `"Criada em —"`.
  - **Correção implementada**: Criada função `formatCreationDate` em `components/personal/mappers.ts`, tratando arrays numéricos sem deslocamento de fuso horário, strings ISO e timestamps.
  - Valores ausentes exibem `"Data não registrada"` (sem inventar a data de hoje). Fichas reais exibem sua data original formatada em pt-BR (ex: `21/05/2026`).
  - Exibição consistente no detalhe da ficha e na listagem de fichas em `components/personal/SheetsPanel.tsx`.

- **Item 3 — Tema Escuro e Badges**:
  - Suavizadas as variáveis de sucesso em `app/graphite-tokens.css` (`--success-bg`, `--success-text`) para tons sóbrios e desaturados, removendo o verde neon estridente.
  - Ajustado `.gp-aluno-status-badge` em `app/aluno/aluno.css`: superfície neutra (`background: var(--muted)`), borda sutil (`border: 1px solid var(--border)`), texto legível (`color: var(--foreground)`) e pequeno ponto semântico discreto (`#10b981` para ativo).
  - Ajustado `.gp-student-status` em `app/personal/personal.css`: fundo neutro com borda suave e dot semântico discreto via pseudo-elemento `::before`.
  - Atualizado `components/ui/badge.tsx` variante `success` para superfície neutra com borda sutil.
  - Alto contraste e legibilidade mantidos nos temas claro e escuro.

- **Item 4 — Logotipo Oficial da Academia (`03-LOGO-ORIGINAL-LION.png`)**:
  - Arquivo original 1:1 localizado e copiado para `public/03-LOGO-ORIGINAL-LION.png`.
  - Atualizado `components/branding/LionLogo.tsx`: substituição do SVG genérico pela logo oficial com dimensões explícitas, proporção preservada e `alt="Lion Fitness"`. Aplicado nas telas de login desktop e mobile (`components/auth/LoginForm.tsx`), recuperação e redefinição de senha.
  - Atualizado `app/aluno/PlanoAluno.tsx` e `app/aluno/aluno.css`: substituído o ícone de chama (`Flame`) no cabeçalho superior pela logo oficial da academia em proporção 1:1 com bordas arredondadas e fundo transparente.

- **Item 5 — Conversa Persistente entre Aluno e Personal**:
  - **Backend**: Reaproveitada a infraestrutura da tabela `notifications`, que já continha `sender_user_id`, `recipient_user_id`, `type`, `message`, `is_read`, `created_at` e `read_at`.
    - Adicionados métodos `findConversation` e `markConversationAsRead` em `NotificationRepository.java`.
    - Adicionados DTOs `ChatMessageResponse.java`, `ConversationResponse.java` e `SendChatMessageRequest.java`.
    - Adicionada regra de negócio em `NotificationService.java`: valida vínculo aluno/personal (impedindo acesso de terceiros), mapeia autoria (`fromMe`), entrega notificação e e-mail com segurança.
    - Expostos endpoints seguros em `NotificationController.java`: `GET /notifications/conversation`, `POST /notifications/conversation/send` e `PATCH /notifications/conversation/read`.
  - **Frontend**:
    - Implementado `components/chat/FloatingChat.tsx`: painel flutuante no canto inferior direito, botão com badge de não lidas, cabeçalho acessível, histórico separado por dias ("Hoje", "Ontem", datas), autoria das mensagens, estado de envio e bloqueio de envios duplicados, retenção do rascunho em caso de falha, suporte a Enter para enviar e Shift+Enter para quebra de linha, rolagem inteligente (só acompanha se o usuário estiver no fim).
    - No Aluno: conversa direta com seu personal trainer vinculado, chips rápidos de assunto ("Dúvida", "Troca de exercício", "Dificuldade", "Geral") e mensagem orientativa quando não houver personal vinculado.
    - No Personal: seletor de alunos no painel de chat e atalho de conversa direta por aluno na tabela de `StudentsPanel.tsx`.
    - Integrado com `ContactPersonalDialog.tsx` e `NotificationBell.tsx`: notificações e atalhos abrem diretamente a conversa correspondente via evento `open-lion-chat`.
    - Métodos adicionados em `services/api.js` com fallback transparente caso o ambiente remoto ainda não tenha os novos endpoints implantados.

## Verificações Consolidadas Realizadas

1. **Testes do Backend Java**:
   - `mvnw.cmd test -Dtest=Notification*`: 21/21 testes unitários e de integração passaram com 0 erros e 0 falhas, cobrindo fluxos de permissão de aluno e personal trainer, leitura e bloqueio a conversas não vinculadas.
2. **Tipagem e Build do Frontend**:
   - `npx tsc --noEmit`: 0 erros de tipo.
   - `npm run build`: Build de produção do Next.js compilado com sucesso; 12/12 rotas estáticas otimizadas.
3. **Validação Visual no Navegador (Chrome Headless & CDP)**:
   - **Login Desktop & Mobile**: Capturas `screenshot_login_clean.png` e `screenshot_login_mobile.png` confirmam renderização da logo oficial com proporção 1:1 e legibilidade sobre fundos claro e grafite.
   - **Área do Aluno**: Captura `screenshot_aluno.png` confirma a logo oficial no cabeçalho substituindo o ícone de chama, badges de plano refinados com visual sóbrio Graphite e botão flutuante de chat posicionado no canto inferior direito.
   - **Painel de Chat Flutuante**: Capturas `screenshot_chat_aluno.png` e `screenshot_chat_dark.png` confirmam abertura do painel flutuante, estado amigável sem personal, cabeçalho acessível, textarea com Enter/Shift+Enter e contraste perfeito nos temas claro e grafite escuro.

## Migrations e Publicações

- **Zero migrations pendentes**: A tabela `notifications` já continha todas as colunas necessárias para persistência das mensagens, mantendo retrocompatibilidade total com as notificações históricas.
- **Ambiente de deploy**: As alterações foram testadas localmente. Não foram realizados commits, pushes ou deploys automáticos em produção, conforme orientações.

## Próxima tarefa

Verificar a versão do backend/proxy publicado e disponibilizar as rotas de conversa mediante autorização de deploy. Depois validar conversa isolada, leitura e persistência nos dois sentidos em ambiente de teste. As correções locais de 20/10 estão compiladas; não equivalem a funcionamento remoto confirmado.

