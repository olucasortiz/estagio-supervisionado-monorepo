---
slug: /
sidebar_position: 0
title: Apresentação
---

# Manual do Usuário — Lion Fitness

Bem-vindo ao manual do **Sistema de Gestão da Academia Lion Fitness**, desenvolvido para a academia localizada em Santo Anastácio – SP, como projeto do Estágio Supervisionado (FIPP · Sistemas de Informação).

Este manual descreve, **tela por tela**, tudo o que cada pessoa pode fazer no sistema, com passo a passo, regras e mensagens que podem aparecer.

:::caution[Sistema em fase de validação]
Esta versão ainda não está em uso na academia. Os **valores** de planos e pagamentos são **de teste**, e os pagamentos online usam uma **conta de teste** do Mercado Pago (Pix gerado mas não pagável por bancos comuns; cartões só de teste). Veja [Ambiente de teste e pagamentos](./referencia/ambiente-de-teste).
:::

:::info[Versão do manual]
Esta é a versão **1.1**: texto completo e capturas de tela da interface atual. Algumas telas só aparecem em situações específicas (pagamento real, e-mail, plano ativo…) e continuam marcadas como **“IMAGEM PENDENTE”**, com o motivo e o que capturar. A relação completa está em [Lista de imagens](./lista-de-imagens).
:::

## Para quem é este manual

O sistema possui **três perfis de acesso**. Leia somente a parte que corresponde ao seu perfil:

| Perfil no sistema | Quem é | Área de uso | Onde ler |
|---|---|---|---|
| `ADMIN` | Administração / profissionais da academia | Painel administrativo (`/dashboard`) | [Perfil Administrador](./administrador/introducao) |
| `PERSONAL_TRAINER` | Personal trainers | Área do Personal (`/personal`) | [Perfil Personal Trainer](./personal-trainer/visao-geral) |
| `OPERATIONAL` | Alunos | Painel do Aluno (`/aluno`) | [Perfil Aluno](./aluno/visao-geral) |

Ao entrar, o sistema leva você **automaticamente** para a área do seu perfil. Não é possível abrir áreas de outro perfil: o sistema redireciona você de volta à sua.

## Como o manual está organizado

1. **[Primeiros passos](./primeiros-passos/acessando-o-sistema)** — acesso, login, recuperação de senha, navegação, tema claro/escuro e como sair. Vale para todos os perfis.
2. **Perfil Administrador** — visão geral, relatórios, cadastros e financeiro.
3. **Perfil Personal Trainer** — alunos vinculados, fichas e montagem de treinos.
4. **Perfil Aluno** — plano, pagamentos e treinos.
5. **Referência** — regras de negócio, perguntas frequentes e glossário.

## Como cada tela é documentada

Todas as telas seguem o mesmo roteiro, para facilitar a consulta:

- **Para que serve** — objetivo da tela.
- **Quem acessa** e **Como chegar** — perfil autorizado e caminho no menu.
- **Elementos da tela** — o que existe na tela e para que serve cada item.
- **Passo a passo** — as tarefas, na ordem em que são feitas.
- **Regras e validações** — o que o sistema exige ou impede.
- **Mensagens** — avisos de sucesso e de erro.

## Convenções usadas

- **Negrito** indica o nome exato de um botão, campo ou menu na tela.
- Campos marcados com **\*** são obrigatórios.
- <span className="perfil-tag perfil-adm">ADMIN</span> <span className="perfil-tag perfil-pt">PERSONAL_TRAINER</span> <span className="perfil-tag perfil-al">OPERATIONAL</span> mostram quem pode usar a tela.
- Blocos **Dica**, **Atenção** e **Importante** destacam informações que evitam erros.
- Figuras seguem o padrão <code>Figura XXX-00</code>. As telas mostram dados de teste; quando uma imagem ainda não existe, aparece um marcador tracejado descrevendo a captura.

:::tip[Requisitos para usar]
Um computador ou celular com internet e um navegador atualizado (Google Chrome, Microsoft Edge, Mozilla Firefox ou equivalente). O endereço de acesso é informado pela academia (ambiente de produção: `https://estagio-supervisionado-monorepo.vercel.app/`).
:::

## O que o sistema ainda não faz

Para evitar expectativas erradas, estas funções **estão fora da versão atual**: avaliação física, registro persistente de carga/peso por aparelho, agendamento de aulas e reserva de aparelhos, aplicativo móvel nativo, biometria, cálculo de multa/juros por atraso e jobs automáticos de notificação de vigência.

Os pagamentos online (Pix e cartão via Mercado Pago) foram validados **em ambiente de testes com simulações**.
