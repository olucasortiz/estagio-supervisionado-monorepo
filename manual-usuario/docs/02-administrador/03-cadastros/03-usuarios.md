---
title: Usuários
sidebar_position: 3
---

# Cadastro de Usuários (administradores)

<span className="perfil-tag perfil-adm">ADMIN</span> Menu: **Cadastros → Usuários**

## Para que serve
Gerenciar as contas administrativas que acessam o painel de gestão.

## Tela principal
<Figura id="USU-01" />

Seção **Equipe administrativa**, com busca por **nome ou e-mail** e tabela com **Administrador, E-mail, Perfil e Status**. Sem registros: *“Nenhum administrador cadastrado”*.

## Formulário
<Figura id="USU-02" />

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Nome** | Sim | Nome completo. |
| **E-mail** | Sim | Único no sistema (ex.: `admin@lionfitness.com`). |
| **Senha** | Sim (no cadastro) | Armazenada com criptografia BCrypt. |
| **Perfil de acesso** | Fixo | Mostra **Administrador** — *acesso irrestrito a configurações, cadastros, financeiro e relatórios*. Não é editável. |

## Passo a passo
1. Clique em **Novo Administrador**.
2. Preencha nome, e-mail e senha; salve.
3. Para alterar, use **Editar** na linha (o campo vira **Nova senha (opcional)**: deixe em branco para manter a atual).
4. **Excluir** pede confirmação antes de executar.

## Regras
- **Usuários inativos não conseguem entrar** no sistema.
- O e-mail não pode se repetir.
- Contas de **alunos** e **personal trainers** são criadas nas suas próprias telas ([Alunos](./alunos) e [Personal Trainers](./personal-trainers)).
