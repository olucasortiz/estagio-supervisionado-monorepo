import React from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import styles from './index.module.css';

const FICHAS = [
  {
    cls: 'adm',
    perfil: 'Administrador',
    rota: '/',
    resumo: 'Cadastros, financeiro, relatórios e indicadores da academia.',
    inicio: '/manual/administrador/introducao',
    linhas: [
      ['Ler o painel de indicadores', 'Visão geral', '/manual/administrador/visao-geral/painel-visao-geral'],
      ['Cadastrar um aluno', 'Cadastros', '/manual/administrador/cadastros/alunos'],
      ['Vincular o aluno a um plano', 'Financeiro', '/manual/administrador/financeiro/assinaturas'],
      ['Registrar um pagamento', 'Financeiro', '/manual/administrador/financeiro/pagamentos'],
      ['Cancelar uma matrícula', 'Financeiro', '/manual/administrador/financeiro/registrar-cancelamento'],
      ['Gerar um relatório em PDF', 'Relatórios', '/manual/administrador/relatorios/como-funcionam'],
    ],
  },
  {
    cls: 'pt',
    perfil: 'Personal trainer',
    rota: '/personal',
    resumo: 'Alunos vinculados, fichas de treino e exercícios.',
    inicio: '/manual/personal-trainer/visao-geral',
    linhas: [
      ['Encontrar meus alunos', 'Meus Alunos', '/manual/personal-trainer/meus-alunos'],
      ['Criar a ficha de um aluno', 'Fichas', '/manual/personal-trainer/fichas-de-treino'],
      ['Montar o treino', 'Montar Treino', '/manual/personal-trainer/montar-treino'],
      ['Criar um exercício próprio', 'Montar Treino', '/manual/personal-trainer/montar-treino'],
      ['Ver o histórico de uma ficha', 'Fichas', '/manual/personal-trainer/fichas-de-treino'],
      ['Responder uma dúvida', 'Notificações', '/manual/referencia/notificacoes-e-chat'],
    ],
  },
  {
    cls: 'al',
    perfil: 'Aluno',
    rota: '/aluno',
    resumo: 'Plano, pagamentos, treinos e conversa com o personal.',
    inicio: '/manual/aluno/visao-geral',
    linhas: [
      ['Ver a situação do meu plano', 'Meu plano', '/manual/aluno/meu-plano-e-pagamentos'],
      ['Renovar por Pix', 'Meu plano', '/manual/aluno/meu-plano-e-pagamentos'],
      ['Ver o treino do dia', 'Treinos', '/manual/aluno/meus-treinos'],
      ['Executar o treino', 'Treinos', '/manual/aluno/meus-treinos'],
      ['Falar com meu personal', 'Chat', '/manual/aluno/personal-e-chat'],
    ],
  },
];

const ATALHOS = [
  ['Entrar e recuperar a senha', '/manual/primeiros-passos/login'],
  ['Regras de negócio', '/manual/referencia/regras-de-negocio'],
  ['Perguntas frequentes', '/manual/referencia/perguntas-frequentes'],
];

export default function Home() {
  return (
    <Layout title="Manual do Usuário" description="Passo a passo de cada tela do Sistema de Gestão da Academia Lion Fitness.">
      <main className={styles.page}>
        <header className={styles.hero}>
          <h1 className={styles.title}>
            Cada tela do Lion Fitness, explicada passo a passo.
          </h1>
          <p className={styles.lead}>
            Escolha o seu perfil e vá direto à tarefa. O manual mostra onde clicar, o que preencher e o que o sistema avisa quando algo dá errado.
          </p>
        </header>

        <section className={styles.fichas} aria-label="Tarefas por perfil">
          {FICHAS.map((f, i) => (
            <article key={f.perfil} className={`${styles.ficha} ${styles[f.cls]}`} style={{'--i': i}}>
              <div className={styles.cabeca}>
                <h2>{f.perfil}</h2>
                <code>{f.rota}</code>
              </div>
              <p className={styles.resumo}>{f.resumo}</p>
              <ul className={styles.linhas}>
                {f.linhas.map(([titulo, secao, to]) => (
                  <li key={titulo}>
                    <Link to={to} className={styles.linha}>
                      <span className={styles.tarefa}>{titulo}</span>
                      <span className={styles.leader} aria-hidden="true" />
                      <span className={styles.secao}>{secao}</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link to={f.inicio} className={styles.inicio}>Ver tudo do perfil {f.perfil.toLowerCase()}</Link>
            </article>
          ))}
        </section>

        <nav className={styles.atalhos} aria-label="Atalhos gerais">
          {ATALHOS.map(([t, to]) => (
            <Link key={to} to={to}>{t}</Link>
          ))}
        </nav>
      </main>
    </Layout>
  );
}
