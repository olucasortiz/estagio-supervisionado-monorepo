---
title: Assinaturas
sidebar_position: 1
---

# Assinaturas

<span className="perfil-tag perfil-adm">ADMIN</span> Menu: **Financeiro → Assinaturas**

## Para que serve
Registrar a **adesão do aluno a um plano**. A assinatura guarda a data de início, o plano e o status — e o sistema **calcula sozinho a data de término**.

## Tela principal
<Figura id="ASS-01" />

Cabeçalho **Assinaturas – “Gerencie os vínculos entre alunos e planos”**, botão **Nova Assinatura** e a lista **Assinaturas cadastradas**, com busca por **nome do aluno ou plano** e colunas **Aluno, Plano, Início, Término, Status**. Sem registros: *“Nenhuma assinatura cadastrada”*.

## Formulário
<Figura id="ASS-02" />

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Aluno** | Sim | Busca por nome ou e-mail (*“Buscar aluno pelo nome ou e-mail…”*). Sem resultado: *“Nenhum aluno encontrado.”* |
| **Plano** | Sim | Busca de plano (*“Buscar plano…”*). Sem resultado: *“Nenhum plano encontrado.”* |
| **Data de início** | Sim | Início da vigência. |

## Passo a passo
1. Clique em **Nova Assinatura**.
2. Escolha o **Aluno** e o **Plano**.
3. Informe a **Data de início**.
4. Salve. O **Término** aparece na lista, calculado pela **duração (dias)** do plano.

## Regras e validações
- **Término automático** = data de início + duração em dias do plano; o administrador **não digita** a data final.
- É impossível criar assinatura **sem aluno válido** ou **sem plano válido**.
- Para planos **Mensal** e **Diário**, vale sempre a duração cadastrada no plano.
- **Editar** altera os dados; **Excluir** pede confirmação (*“Deseja inativar / excluir este registro?”*).
