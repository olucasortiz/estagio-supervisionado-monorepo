# Mapa de trabalho visual

Usar o fluxo atual; não converter estado interno em novas rotas como parte deste redesign.

| Área | Arquivos principais | Aplicação visual |
| --- | --- | --- |
| Estrutura ADMIN | components/admin/GraphiteAdminShell.tsx, components/layout/DashboardLayout.jsx | Sidebar, topbar, menu mobile e temas |
| Visão geral | components/admin/AdminDashboardView.tsx, AdminRevenueChart.tsx | Indicadores, gráfico, tabelas e hierarquia |
| Cadastros | components/dashboard/sections/{Members,Plans,Users,Personal,ExerciseCatalog}Section.jsx | Listagens, filtros, campos e ações |
| Financeiro | components/dashboard/sections/{Subscriptions,Payments,Overdue,Cancellation}Section.jsx | Clareza de valores, estados e confirmações |
| Relatórios | components/reports/*Report.jsx | Filtros, tabelas e botões; preservar exportação |
| PERSONAL | app/personal/page.tsx, app/personal/personal.css, components/personal/{StudentsPanel,SheetsPanel,BuilderPanel,PersonalHeader}.tsx | Contexto do aluno/ficha, catálogo, prescrição e histórico |
| ALUNO | app/aluno/PlanoAluno.tsx, layout.tsx, page.tsx | Semana, treino do dia, execução, descanso e plano |
| Acesso | components/auth/LoginForm.tsx, ForgotPasswordDialog.tsx, app/forgot-password/page.tsx, app/reset-password/ResetPasswordClient.tsx | Login e recuperação coerentes, labels e feedback |

ADMIN mantém IDs internos: dashboard; relatórios 19–22; alunos 30, planos 31, usuários 32, personals 33, assinaturas 34, pagamentos 35, inadimplência 36, cancelamento 37 e exercícios 38.

Não alterar por estética: roles (`ADMIN`, `PERSONAL_TRAINER`, `OPERATIONAL`, `USER`), janela de renovação, cálculo financeiro, tokenização/polling, versão de fichas ou regras de cancelamento. Preservar todos os controles e integrações úteis existentes.

O progresso do ALUNO usa contador da sessão. Não representar como histórico semanal persistido. O gráfico de receita por plano deve manter indicação de estimativa conforme seu cálculo atual.

Ordem visual sugerida: concluir ADMIN, PERSONAL, ALUNO e acesso. Escolher somente a próxima tela indicada no STATUS, salvo orientação diferente do usuário.
