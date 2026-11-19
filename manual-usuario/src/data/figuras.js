/**
 * REGISTRO CENTRAL DE FIGURAS DO MANUAL
 * ------------------------------------------------------------------
 * Cada figura usada no manual com <Figura id="..."/> é descrita aqui.
 * - A página "Lista de imagens" é gerada automaticamente a partir deste arquivo.
 * - Para "ligar" uma imagem: salve o PNG em  static/img/manual/<arquivo>
 *   (mesmo nome indicado abaixo). Nenhuma outra alteração é necessária.
 *
 * Campos:
 *  id        identificador único (aparece no marcador do manual)
 *  arquivo   nome do arquivo PNG a ser salvo em static/img/manual/
 *  grupo     seção do manual onde a figura aparece
 *  titulo    legenda exibida abaixo da figura
 *  tela      rota/URL do sistema onde tirar a captura
 *  perfil    usuário com o qual fazer login
 *  capturar  o que deve aparecer na imagem
 *  preparo   dados/estado necessários antes de capturar (opcional)
 *  destaque  true = vale anotar com setas/numeração (opcional)
 */

export const PERFIS = {
  ADMIN: 'ADMIN (administrador)',
  PT: 'PERSONAL_TRAINER',
  ALUNO: 'OPERATIONAL (aluno)',
  NENHUM: 'Sem login (visitante)',
};

export const PADRAO_CAPTURA = {
  resolucao: '1440 × 900 px (janela do navegador, zoom 100%)',
  formato: 'PNG',
  mobile: '390 × 844 px (emulação de celular nas ferramentas do navegador)',
  tema: 'Tema escuro (padrão do sistema), salvo quando a figura indicar o tema claro.',
  dados:
    'As capturas atuais usam os dados de teste do sistema. Antes de publicar, confira se não aparece CPF, e-mail ou foto de pessoa real; para novas capturas, prefira dados fictícios (ex.: “Maria Souza”, CPF 123.456.789-09).',
};

const F = (id, arquivo, grupo, titulo, tela, perfil, capturar, extra = {}) => ({
  id, arquivo, grupo, titulo, tela, perfil, capturar, ...extra,
});

export const FIGURAS = [
  // ───────────────────────── Acesso ─────────────────────────
  F('LOGIN-01', 'login-01-tela-completa.png', 'Acesso ao sistema',
    'Tela de login (visão geral)', '/login', PERFIS.NENHUM,
    'Tela inteira: painel institucional à esquerda (“Um só acesso para toda a academia” e as áreas Administração, Personal trainers e Alunos) e cartão “Bem-vindo de volta” com campos E-mail e Senha.',
    {destaque: true}),
  F('LOGIN-02', 'login-02-erro-credenciais.png', 'Acesso ao sistema',
    'Mensagem de erro por credenciais inválidas', '/login', PERFIS.NENHUM,
    'Cartão de login com o alerta vermelho exibido após digitar uma senha incorreta.',
    {preparo: 'Digite um e-mail válido e uma senha errada e clique em Entrar.'}),
  F('LOGIN-03', 'login-03-mostrar-senha.png', 'Acesso ao sistema',
    'Botão “Mostrar senha”', '/login', PERFIS.NENHUM,
    'Recorte do campo Senha com o texto visível e o ícone de olho em destaque.',
    {preparo: 'Digite uma senha fictícia e clique no ícone de olho.', destaque: true}),
  F('LOGIN-04', 'login-04-mobile.png', 'Acesso ao sistema',
    'Login em celular', '/login', PERFIS.NENHUM,
    'Tela de login em largura de celular (layout de uma coluna).',
    {mobile: true}),

  // ─────────────────── Recuperação de senha ───────────────────
  F('SENHA-01', 'senha-01-esqueci-dialogo.png', 'Recuperação de senha',
    'Janela “Esqueci minha senha”', '/login', PERFIS.NENHUM,
    'Caixa de diálogo de recuperação com o campo E-mail e o botão de envio.',
    {preparo: 'Na tela de login, clique em “Esqueci minha senha”.'}),
  F('SENHA-04', 'senha-04-nova-senha.png', 'Recuperação de senha',
    'Tela “Definir nova senha”', '/reset-password?token=…', PERFIS.NENHUM,
    'Formulário com Nova senha, indicador “Força da senha”, lista de requisitos (mínimo de 6 caracteres) e Confirmar nova senha.',
    {preparo: 'Abra o link do e-mail e digite uma senha para exibir o indicador de força.', destaque: true}),
  F('SENHA-05', 'senha-05-senhas-diferentes.png', 'Recuperação de senha',
    'Aviso de senhas diferentes', '/reset-password?token=…', PERFIS.NENHUM,
    'Campo “Confirmar nova senha” com a mensagem de erro de divergência.'),
  F('SENHA-07', 'senha-07-link-invalido.png', 'Recuperação de senha',
    'Link inválido ou expirado', '/reset-password', PERFIS.NENHUM,
    'Tela com o aviso “Link de redefinição ausente ou inválido…”.',
    {preparo: 'Acesse /reset-password sem o parâmetro token.'}),

  // ───────────────────── Navegação geral ─────────────────────
  F('NAV-01', 'nav-01-menu-admin.png', 'Navegação e recursos comuns',
    'Estrutura da tela do administrador', '/ (após login como ADMIN)', PERFIS.ADMIN,
    'Tela inteira com menu lateral (Visão geral, Relatórios, Cadastros, Financeiro), barra superior e área de conteúdo.',
    {destaque: true}),
  F('NAV-02', 'nav-02-tema-claro-escuro.png', 'Navegação e recursos comuns',
    'Alternância de tema claro/escuro', '/ (qualquer tela interna)', PERFIS.ADMIN,
    'Duas capturas lado a lado (montagem): a mesma tela em tema escuro e em tema claro, com o botão de tema em destaque.',
    {destaque: true}),
  F('NAV-03', 'nav-03-menu-mobile.png', 'Navegação e recursos comuns',
    'Menu lateral aberto no celular', '/ (qualquer tela interna)', PERFIS.ADMIN,
    'Largura de celular com o botão “Abrir menu” e o menu lateral aberto.',
    {mobile: true}),
  F('COM-01', 'com-01-notificacoes.png', 'Navegação e recursos comuns',
    'Janela de notificações', 'Ícone de sino', PERFIS.PT,
    'Janela “Notificações” com ao menos uma mensagem não lida (marcador) e uma já lida.',
    {preparo: 'Peça ao aluno de teste para enviar uma dúvida antes.'}),
  F('COM-02', 'com-02-responder-notificacao.png', 'Navegação e recursos comuns',
    'Resposta do personal no chat', 'Ícone de sino → Conversar', PERFIS.PT,
    'Chat aberto pelo botão “Conversar” de uma notificação, com a mensagem do aluno e a resposta do personal.'),
  F('COM-03', 'com-03-chat-aberto.png', 'Navegação e recursos comuns',
    'Chat flutuante aberto', 'Botão flutuante de chat', PERFIS.ALUNO,
    'Painel de mensagens com histórico de conversa, seletor de tipo (Geral, Dúvida, Troca de exercício, Dificuldade) e campo de envio.',
    {destaque: true}),

  // ───────────────────── Administrador · Visão geral ─────────────────────
  F('ADM-01', 'adm-01-visao-geral.png', 'Administrador · Visão geral',
    'Painel “Visão geral”', '/', PERFIS.ADMIN,
    'Tela inteira: indicadores (cards), “Receita mensal”, “Receita por plano”, registros recentes e atividades recentes.',
    {preparo: 'Base com alunos, planos e pagamentos de pelo menos 3 meses.', destaque: true}),
  F('ADM-02', 'adm-02-receita-mensal.png', 'Administrador · Visão geral',
    'Gráfico de receita mensal', '/', PERFIS.ADMIN,
    'Recorte do gráfico “Receita mensal” (últimos seis meses) e “Receita por plano”.'),

  // ───────────────────── Cadastros · Alunos ─────────────────────
  F('ALU-01', 'alu-01-lista.png', 'Administrador · Cadastros · Alunos',
    'Lista de alunos', '/ → Cadastros → Alunos', PERFIS.ADMIN,
    'Cabeçalho “Alunos”, botão “Novo aluno”, resumo, filtro Situação e tabela (Aluno, CPF, Nascimento, Cadastro, Status, ações Editar/Inativar).',
    {destaque: true}),
  F('ALU-02', 'alu-02-etapa-dados.png', 'Administrador · Cadastros · Alunos',
    'Cadastro de aluno — etapa 1 (Dados pessoais)', '/ → Alunos → Novo aluno', PERFIS.ADMIN,
    'Painel lateral “Novo Aluno” com o indicador de etapas (Dados Pessoais · Conta · Foto · Personal) e os campos Nome completo, CPF e Data de nascimento.',
    {destaque: true}),
  F('ALU-03', 'alu-03-etapa-conta.png', 'Administrador · Cadastros · Alunos',
    'Cadastro de aluno — etapa 2 (Conta)', '/ → Alunos → Novo aluno', PERFIS.ADMIN,
    'Campos E-mail e Senha inicial.'),
  F('ALU-04', 'alu-04-etapa-foto.png', 'Administrador · Cadastros · Alunos',
    'Cadastro de aluno — etapa 3 (Foto)', '/ → Alunos → Novo aluno', PERFIS.ADMIN,
    'Área de envio de foto com uma imagem de exemplo (use foto de banco de imagens).'),
  F('ALU-05', 'alu-05-etapa-personal.png', 'Administrador · Cadastros · Alunos',
    'Cadastro de aluno — etapa 4 (Personal)', '/ → Alunos → Novo aluno', PERFIS.ADMIN,
    'Seleção do personal trainer responsável e botão final de salvar.'),
  F('ALU-06', 'alu-06-erro-data.png', 'Administrador · Cadastros · Alunos',
    'Validação de data de nascimento', '/ → Alunos → Novo aluno', PERFIS.ADMIN,
    'Campo de data com a mensagem de erro em vermelho.',
    {preparo: 'Informe uma data futura ou deixe em branco e avance.'}),
  F('ALU-07', 'alu-07-cpf-duplicado.png', 'Administrador · Cadastros · Alunos',
    'Erro de CPF já cadastrado', '/ → Alunos → Novo aluno', PERFIS.ADMIN,
    'Painel de cadastro com a faixa de feedback de erro após tentar salvar CPF existente.'),
  F('ALU-08', 'alu-08-editar.png', 'Administrador · Cadastros · Alunos',
    'Edição de aluno', '/ → Alunos → Editar', PERFIS.ADMIN,
    'Painel “Editar Aluno” com campos preenchidos e o rótulo “Nova senha (deixe em branco para manter)”.'),
  F('ALU-09', 'alu-09-inativar.png', 'Administrador · Cadastros · Alunos',
    'Confirmação de inativação', '/ → Alunos → Inativar', PERFIS.ADMIN,
    'Diálogo com os botões “Manter aluno ativo” e “Confirmar inativação”.'),

  // ───────────────────── Cadastros · Planos ─────────────────────
  F('PLA-01', 'pla-01-lista.png', 'Administrador · Cadastros · Planos',
    'Lista de planos', '/ → Cadastros → Planos', PERFIS.ADMIN,
    'Tela “Planos” com a tabela e o botão de novo plano.'),
  F('PLA-02', 'pla-02-formulario.png', 'Administrador · Cadastros · Planos',
    'Formulário de plano', '/ → Planos → Novo plano', PERFIS.ADMIN,
    'Painel “Novo Plano” com Nome, Tipo (Mensal/Diário), Ativo, Valor (R$) e Duração (dias).',
    {destaque: true}),

  // ───────────────────── Cadastros · Usuários ─────────────────────
  F('USU-01', 'usu-01-lista.png', 'Administrador · Cadastros · Usuários',
    'Lista de usuários administradores', '/ → Cadastros → Usuários', PERFIS.ADMIN,
    'Tela “Usuários” com busca e tabela (Administrador, E-mail, Perfil, Status).'),
  F('USU-02', 'usu-02-formulario.png', 'Administrador · Cadastros · Usuários',
    'Formulário de usuário', '/ → Usuários → Novo', PERFIS.ADMIN,
    'Painel “Novo Administrador” com o bloco fixo “Perfil de acesso: Administrador”.'),

  // ───────────────────── Cadastros · Personal trainers ─────────────────────
  F('PER-01', 'per-01-lista.png', 'Administrador · Cadastros · Personal Trainers',
    'Lista de personal trainers', '/ → Cadastros → Personal Trainers', PERFIS.ADMIN,
    'Tela “Personal Trainers” com busca e tabela (Personal trainer, CPF, Telefone, Especialidade, Status).'),
  F('PER-02', 'per-02-formulario.png', 'Administrador · Cadastros · Personal Trainers',
    'Formulário de personal trainer', '/ → Personal Trainers → Novo', PERFIS.ADMIN,
    'Painel com Nome, CPF, Telefone, E-mail e Especialidade.'),

  // ───────────────────── Cadastros · Catálogo ─────────────────────
  F('CAT-01', 'cat-01-catalogo.png', 'Administrador · Cadastros · Catálogo de Exercícios',
    'Catálogo de exercícios', '/ → Cadastros → Catálogo de Exercícios', PERFIS.ADMIN,
    'Filtros de busca (incluindo Situação) e tabela (Nome, Categoria, Músculo, Equipamento, Origem, Situação).',
    {destaque: true}),
  F('CAT-02', 'cat-02-inativar-exercicio.png', 'Administrador · Cadastros · Catálogo de Exercícios',
    'Confirmação de inativação de exercício', '/ → Catálogo → Inativar', PERFIS.ADMIN,
    'Diálogo “Inativar exercício”.'),

  // ───────────────────── Financeiro ─────────────────────
  F('ASS-01', 'ass-01-lista.png', 'Administrador · Financeiro · Assinaturas',
    'Lista de assinaturas', '/ → Financeiro → Assinaturas', PERFIS.ADMIN,
    'Tela “Assinaturas” com a tabela (Aluno, Plano, Início, Término, Status).'),
  F('ASS-02', 'ass-02-formulario.png', 'Administrador · Financeiro · Assinaturas',
    'Nova assinatura', '/ → Assinaturas → Nova', PERFIS.ADMIN,
    'Painel “Nova Assinatura” com busca de Aluno, busca de Plano e Data de início.',
    {destaque: true}),
  F('PAG-01', 'pag-01-lista.png', 'Administrador · Financeiro · Pagamentos',
    'Histórico de pagamentos', '/ → Financeiro → Pagamentos', PERFIS.ADMIN,
    'Tela “Pagamentos” com a tabela (Aluno, Valor, Método, Status, Data) e ações Editar/Excluir.'),
  F('PAG-02', 'pag-02-formulario.png', 'Administrador · Financeiro · Pagamentos',
    'Registrar pagamento', '/ → Pagamentos → Registrar', PERFIS.ADMIN,
    'Janela “Registrar Pagamento” com a assinatura escolhida, o valor do plano preenchido (bloqueado), a data de hoje, o método Dinheiro e o status automático “Pago”.',
    {destaque: true}),
  F('INA-01', 'ina-01-inadimplencia.png', 'Administrador · Financeiro · Inadimplência',
    'Gestão de inadimplência', '/ → Financeiro → Inadimplência', PERFIS.ADMIN,
    'Indicador de proporção de inadimplência e tabela “Alunos com pendências”.',
    {preparo: 'Deixe ao menos um aluno com pagamento Pendente/Atrasado.'}),
  F('CAN-01', 'can-01-busca.png', 'Administrador · Financeiro · Registrar Cancelamento',
    'Busca do aluno a cancelar', '/ → Financeiro → Registrar Cancelamento', PERFIS.ADMIN,
    'Tela “Registrar Cancelamento” com o campo de busca por nome ou CPF e resultados.'),
  F('CAN-02', 'can-02-motivo.png', 'Administrador · Financeiro · Registrar Cancelamento',
    'Aluno selecionado e motivo', '/ → Registrar Cancelamento', PERFIS.ADMIN,
    'Aluno selecionado (com botão “Remover seleção”) e campo “Motivo do cancelamento”.',
    {destaque: true}),
  F('CAN-03', 'can-03-bloqueio.png', 'Administrador · Financeiro · Registrar Cancelamento',
    'Bloqueio por pendência financeira', '/ → Registrar Cancelamento', PERFIS.ADMIN,
    'Mensagem informando que o cancelamento foi impedido por pendência financeira.',
    {preparo: 'Use um aluno com pagamento Pendente ou Atrasado.'}),

  // ───────────────────── Relatórios ─────────────────────
  F('REL-01', 'rel-01-novos-alunos.png', 'Administrador · Relatórios',
    'Relatório de novos alunos', '/ → Relatórios → Novos Alunos', PERFIS.ADMIN,
    'Filtros (Data inicial/final), indicadores, resultado detalhado e botão Exportar PDF, após gerar o relatório.',
    {preparo: 'Período com ao menos 5 alunos cadastrados.', destaque: true}),
  F('REL-02', 'rel-02-cancelamentos.png', 'Administrador · Relatórios',
    'Relatório de cancelamentos', '/ → Relatórios → Cancelamentos', PERFIS.ADMIN,
    'Filtros, indicadores (cancelamentos e motivo mais frequente) e tabela (Nome, CPF, Data, Motivo).'),
  F('REL-03', 'rel-03-ativos-inativos.png', 'Administrador · Relatórios',
    'Relatório de ativos e inativos', '/ → Relatórios → Ativos e Inativos', PERFIS.ADMIN,
    'Filtro Situação, indicadores (Total, Ativos, Inativos/Cancelados, Taxa de retenção) e tabela.'),
  F('REL-04', 'rel-04-inadimplencia.png', 'Administrador · Relatórios',
    'Relatório de inadimplência', '/ → Relatórios → Relatório de Inadimplência', PERFIS.ADMIN,
    'Indicadores, aviso “Atenção” e tabela (Nome, CPF, Plano, Situação financeira).'),
  F('REL-05', 'rel-05-estado-vazio.png', 'Administrador · Relatórios',
    'Relatório antes de gerar', '/ → Relatórios → (qualquer)', PERFIS.ADMIN,
    'Estado inicial: mensagem “Revise os filtros… selecione Gerar Relatório”.'),
  F('REL-06', 'rel-06-pdf.png', 'Administrador · Relatórios',
    'Arquivo PDF exportado', 'Arquivo PDF baixado', PERFIS.ADMIN,
    'Primeira página do PDF gerado em “Exportar PDF”.',
    {preparo: 'Gere e exporte qualquer relatório; abra o PDF e capture a página.'}),

  // ───────────────────── Personal ─────────────────────
  F('PT-01', 'pt-01-meus-alunos.png', 'Personal Trainer',
    'Meus alunos', '/personal', PERFIS.PT,
    'Cabeçalho “Área do Personal”, abas (Meus Alunos · Fichas do Aluno · Montar Treino · Catálogo), busca, filtros Todos/Ativos/Inativos e tabela de alunos.',
    {destaque: true}),
  F('PT-02', 'pt-02-fichas.png', 'Personal Trainer',
    'Fichas do aluno', '/personal → Fichas do Aluno', PERFIS.PT,
    'Lista de fichas do aluno selecionado, com os dados da ficha atual (Dia da semana, Criada em, Exercícios) e botões de ação.',
    {destaque: true}),
  F('PT-03', 'pt-03-criar-ficha.png', 'Personal Trainer',
    'Criar nova ficha', '/personal → Fichas do Aluno → Nova ficha', PERFIS.PT,
    'Diálogo “Criar Nova Ficha” com Título (ex.: “Treino A - Peito e Tríceps”) e Dia da semana.'),
  F('PT-04', 'pt-04-montar-treino.png', 'Personal Trainer',
    'Montar treino', '/personal → Montar Treino', PERFIS.PT,
    'Lista de exercícios da ficha com “Séries x Reps” e “Descanso”, e botão “Adicionar Exercício”.',
    {destaque: true}),
  F('PT-05', 'pt-05-catalogo-busca.png', 'Personal Trainer',
    'Busca no catálogo ao prescrever', '/personal → Montar Treino → Adicionar Exercício', PERFIS.PT,
    'Painel de catálogo com busca por nome/músculo e filtros Categoria, Músculo e Equipamento.'),
  F('PT-06', 'pt-06-exercicio-selecionado.png', 'Personal Trainer',
    'Exercício selecionado para a ficha', '/personal → Montar Treino', PERFIS.PT,
    '“Exercício Selecionado” com Séries, Repetições, Descanso (seg), Notas e botão “Salvar na Ficha”.',
    {destaque: true}),
  F('PT-07', 'pt-07-exercicio-personalizado.png', 'Personal Trainer',
    'Novo exercício personalizado', '/personal → Montar Treino', PERFIS.PT,
    'Diálogo “Novo Exercício Personalizado” com Nome, Categoria, Músculo Alvo, Equipamento e Instruções.'),
  F('PT-08', 'pt-08-editar-ficha.png', 'Personal Trainer',
    'Edição de ficha com motivo', '/personal → Fichas → Editar ficha', PERFIS.PT,
    'Campo do motivo da atualização e botão “Salvar ficha e histórico”.'),
  F('PT-09', 'pt-09-historico.png', 'Personal Trainer',
    'Histórico de alterações da ficha', '/personal → Fichas → Histórico de alterações', PERFIS.PT,
    'Diálogo com a lista de alterações à esquerda e o conteúdo da versão anterior à direita.',
    {preparo: 'Edite uma ficha ao menos uma vez antes.'}),
  F('PT-10', 'pt-10-excluir-ficha.png', 'Personal Trainer',
    'Confirmação de exclusão de ficha', '/personal → Fichas', PERFIS.PT,
    'Diálogo “Excluir ficha?”.'),
  F('PT-11', 'pt-11-pdf-ficha.png', 'Personal Trainer',
    'PDF da ficha de treino', 'Arquivo PDF baixado', PERFIS.PT,
    'Primeira página do PDF gerado em “Exportar PDF”.'),
  F('PT-12', 'pt-12-chat-aluno.png', 'Personal Trainer',
    'Conversa com o aluno', '/personal → Meus Alunos → Conversar', PERFIS.PT,
    'Chat aberto a partir do botão “Conversar com <aluno>”.'),

  // ───────────────────── Aluno ─────────────────────
  F('AL-01', 'al-01-painel.png', 'Aluno',
    'Painel do aluno (visão geral)', '/aluno', PERFIS.ALUNO,
    'Tela inteira: cabeçalho com nome e “Sair”, cartão do plano, dias da semana, treino do dia e cartão “Seu Personal”.',
    {destaque: true}),
  F('AL-02', 'al-02-plano-ativo.png', 'Aluno',
    'Cartão do plano ativo', '/aluno', PERFIS.ALUNO,
    'Recorte do cartão com nome do plano, vigência e situação.',
    {preparo: 'Aluno com assinatura ativa.'}),
  F('AL-03', 'al-03-sem-plano.png', 'Aluno',
    'Aluno sem plano ativo', '/aluno', PERFIS.ALUNO,
    'Cartão “Nenhum plano ativo” com o convite para regularizar a assinatura.',
    {preparo: 'Aluno com assinatura vencida.'}),
  F('AL-04', 'al-04-renovar.png', 'Aluno',
    'Renovar mensalidade', '/aluno', PERFIS.ALUNO,
    'Cartão “Renovar mensalidade — Escolha uma forma de pagamento” com as opções Pix e Cartão.',
    {destaque: true}),
  F('AL-05', 'al-05-pix.png', 'Aluno',
    'Pagamento via Pix', '/aluno → Renovar → Pix', PERFIS.ALUNO,
    'Janela “Pagamento via Pix” com QR Code (ou “QR Code indisponível”) e o botão de copiar código.'),
  F('AL-06', 'al-06-cartao.png', 'Aluno',
    'Pagamento com cartão', '/aluno → Renovar → Cartão', PERFIS.ALUNO,
    'Janela “Pagamento com cartão” com a pré-visualização do cartão e seletor Crédito/Débito. Use dados de teste do Mercado Pago.',
    {destaque: true}),
  F('AL-08', 'al-08-dias-semana.png', 'Aluno',
    'Seleção do dia da semana', '/aluno', PERFIS.ALUNO,
    'Faixa “Dias da semana” com um dia selecionado e o treino correspondente.'),
  F('AL-09', 'al-09-lista-exercicios.png', 'Aluno',
    'Exercícios prescritos', '/aluno', PERFIS.ALUNO,
    'Lista “Exercícios prescritos” do dia, com séries, repetições e botão de iniciar treino.',
    {destaque: true}),
  F('AL-10', 'al-10-execucao.png', 'Aluno',
    'Execução do treino', '/aluno → Iniciar treino', PERFIS.ALUNO,
    'Modo de execução: Série, Repetições, Progresso da sessão e botão “Concluir série”.',
    {destaque: true}),
  F('AL-11', 'al-11-descanso.png', 'Aluno',
    'Descanso entre séries', '/aluno → Iniciar treino', PERFIS.ALUNO,
    'Tela de descanso com o cronômetro e o botão “Pular descanso e avançar”.'),
  F('AL-12', 'al-12-sem-treino.png', 'Aluno',
    'Dia sem treino', '/aluno', PERFIS.ALUNO,
    'Mensagem “Nenhum treino disponível no momento…” ou “Nenhum treino programado para esta semana.”.'),
  F('AL-13', 'al-13-seu-personal.png', 'Aluno',
    'Cartão “Seu Personal”', '/aluno', PERFIS.ALUNO,
    'Cartão do personal vinculado com o botão de abrir conversa.'),
  F('AL-14', 'al-14-mobile.png', 'Aluno',
    'Painel do aluno em celular', '/aluno', PERFIS.ALUNO,
    'Painel do aluno em largura de celular.',
    {mobile: true}),
];

/**
 * Figuras que não podem ser capturadas só navegando (gravariam dados reais, enviariam e-mail
 * ou dependem de um estado específico da conta). A página "Lista de imagens" e o marcador
 * da figura mostram o motivo, para quem for capturá-las manualmente.
 */
export const PENDENCIAS = {};

export const FIGURAS_POR_ID = Object.fromEntries(FIGURAS.map((f) => [f.id, f]));

export function agruparPorGrupo() {
  const mapa = new Map();
  for (const f of FIGURAS) {
    if (!mapa.has(f.grupo)) mapa.set(f.grupo, []);
    mapa.get(f.grupo).push(f);
  }
  return [...mapa.entries()];
}
