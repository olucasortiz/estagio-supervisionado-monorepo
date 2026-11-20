---
title: Alunos
sidebar_position: 1
---

# Cadastro de Alunos

<span className="perfil-tag perfil-adm">ADMIN</span> Menu: **Cadastros → Alunos**

## Para que serve
Gerenciar os alunos da academia: **listar, buscar, cadastrar, editar e inativar**. Ao cadastrar um aluno, o sistema cria automaticamente o **usuário de acesso** (perfil `OPERATIONAL`) para ele entrar no Painel do Aluno.

## Tela principal

<Figura id="ALU-01" />

| Elemento | Descrição |
|---|---|
| **Novo aluno** | Abre o painel de cadastro. |
| Resumo | Totais dos alunos carregados (ativos, inativos etc.). |
| **Lista de alunos** | Tabela com **Aluno** (foto e nome), **CPF**, **Nascimento**, **Cadastro**, **Status** e ações. |
| Busca | Procura por **nome** ou **CPF**. |
| **Situação** | Filtro: **Todos**, **Ativos** ou **Inativos**. |
| **Editar** | Abre o painel com os dados do aluno. |
| **Avaliação** | Abre a avaliação física (opcional) e as cargas do aluno. Veja [Avaliação física e cargas](../../personal-trainer/avaliacao-fisica-e-cargas). Desabilitado para aluno inativo. |
| **Inativar** | Desativa o aluno (pede confirmação). Já inativo: botão desabilitado. |

Sem alunos: *“Clique em ‘Novo aluno’ para começar.”* Com filtro sem resultado: *“Selecione outra situação para consultar os cadastros.”*

## Cadastrar um aluno (4 etapas)

O painel **Novo Aluno** guia o cadastro em quatro etapas, indicadas no topo (**Dados Pessoais · Conta · Foto · Personal**). Use **Próximo** e **Voltar** para navegar. O botão **Próximo** só avança com os campos obrigatórios da etapa preenchidos.

### Etapa 1 — Dados Pessoais
<Figura id="ALU-02" />

| Campo | Obrigatório | Observação |
|---|---|---|
| **Nome completo** | Sim | Ex.: nome do aluno. |
| **CPF** | Sim | Formato `000.000.000-00` (máscara automática). **Único no sistema.** |
| **Data de nascimento** | Sim | Não pode ser data futura. |

<Figura id="ALU-06" />

### Etapa 2 — Conta
<Figura id="ALU-03" />

| Campo | Obrigatório | Observação |
|---|---|---|
| **E-mail** | Sim | Será o login do aluno. Único. |
| **Senha inicial** | Sim (no cadastro) | Informe ao aluno, que poderá trocá-la por [recuperação de senha](../../primeiros-passos/recuperar-senha). |

### Etapa 3 — Foto
<Figura id="ALU-04" />

Opcional. Envie uma foto do aluno; o sistema valida **formato e tamanho**. A imagem é guardada no banco de dados.

### Etapa 4 — Personal
<Figura id="ALU-05" />

Opcional. Escolha o **personal trainer responsável**. O personal só enxerga e monta fichas para os alunos vinculados a ele.

Ao final, clique no botão de salvar. O sistema confirma o cadastro e o aluno aparece na lista com a data de cadastro registrada automaticamente.

## Editar um aluno
1. Na lista, clique em **Editar** na linha do aluno.
2. Altere o que for preciso, passando pelas etapas.
3. Em **Nova senha (deixe em branco para manter)**, preencha apenas se quiser trocar a senha.
4. Salve.

<Figura id="ALU-08" />

## Inativar um aluno
1. Clique em **Inativar** na linha do aluno.
2. Na janela de confirmação, escolha **Confirmar inativação** (ou **Manter aluno ativo** para desistir).

<Figura id="ALU-09" />

:::caution[Importante]
A inativação é **lógica (soft delete)**: nada é apagado do banco e o histórico é preservado. Para encerrar a matrícula com **motivo** e controle de pendências, use [Registrar Cancelamento](../financeiro/registrar-cancelamento).
:::

## Regras e validações
- **CPF único:** tentar cadastrar um CPF já existente é **bloqueado** e o sistema informa o erro.
- E-mail, nome, CPF e data de nascimento são obrigatórios.
- A **data de cadastro** é registrada automaticamente.
- A foto é validada (tipo e tamanho).

<Figura id="ALU-07" />
