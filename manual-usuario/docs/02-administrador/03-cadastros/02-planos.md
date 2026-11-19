---
title: Planos
sidebar_position: 2
---

# Cadastro de Planos

<span className="perfil-tag perfil-adm">ADMIN</span> Menu: **Cadastros → Planos**

## Para que serve
Definir os planos vendidos pela academia. Atualmente existem dois tipos: **Mensal** e **Diário**. A **duração em dias** do plano é usada para calcular automaticamente o término de cada assinatura.

## Tela principal
<Figura id="PLA-01" />

Mostra o cabeçalho **Planos – “Gerencie os planos de assinatura disponíveis”**, o botão **Novo Plano** e os planos cadastrados em **cartões**, cada um com os botões **Editar** e **Excluir**.

## Formulário de plano
<Figura id="PLA-02" />

| Campo | Obrigatório | Descrição |
|---|---|---|
| **Nome** | Sim | Ex.: *Plano Mensal Premium*. |
| **Tipo** | Sim | **Mensal** ou **Diário**. |
| **Ativo** | — | **Sim** ou **Não**. Planos inativos deixam de ser oferecidos. |
| **Valor (R$)** | Sim | Preço, ex.: `0,00`. |
| **Duração (dias)** | Sim | Ex.: `30` para mensal. Base do cálculo de vigência. |

## Passo a passo
1. Clique em **Novo Plano**.
2. Preencha os campos e salve.
3. Para alterar, clique em **Editar** no cartão do plano; para tirar o plano de oferta sem excluí-lo, mude **Ativo** para **Não**.
4. **Excluir** pede confirmação antes de executar.

## Regras
- A academia **não trabalha com planos semestrais ou anuais** (decisão administrativa).
- A data de criação é registrada automaticamente.
- Prefira marcar o plano como **Não** em **Ativo** em vez de excluir, para preservar o histórico das assinaturas existentes.
