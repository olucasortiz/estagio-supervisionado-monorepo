---
title: Personal Trainers
sidebar_position: 4
---

# Cadastro de Personal Trainers

<span className="perfil-tag perfil-adm">ADMIN</span> Menu: **Cadastros → Personal Trainers**

## Para que serve
Cadastrar e manter os profissionais responsáveis pelo acompanhamento e pela prescrição de treinos. Cada personal tem uma **conta de usuário** vinculada, com a qual acessa a [Área do Personal](../../personal-trainer/visao-geral).

## Tela principal
<Figura id="PER-01" />

Seção **Equipe de personal trainers**, com busca por **nome, especialidade ou e-mail** e tabela com **Personal trainer, CPF, Telefone, Especialidade e Status**. Sem registros: *“Nenhum personal trainer cadastrado”*.

## Formulário
<Figura id="PER-02" />

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Nome** | Sim | Nome completo. |
| **CPF** | Sim | `000.000.000-00`. Não pode se repetir. |
| **Telefone** | Não | `(00) 00000-0000`. |
| **E-mail** | Sim | E-mail de acesso. |
| **Especialidade** | Sim | Ex.: *Musculação, Funcional…* |

## Passo a passo
1. Clique em **Novo Personal Trainer** e preencha os campos.
2. Salve. O personal já pode ser escolhido na **etapa 4** do [cadastro de aluno](./alunos).
3. Use **Editar** para atualizar dados e **Excluir** para remover o profissional (pede confirmação).

## Regras
- O **CPF é único**.
- A data de criação é registrada automaticamente.
- O personal **não altera dados administrativos ou financeiros** — apenas acompanha treinos dos alunos sob sua responsabilidade.
