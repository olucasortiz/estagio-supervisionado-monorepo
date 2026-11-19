---
title: Pagamentos
sidebar_position: 2
---

# Pagamentos

<span className="perfil-tag perfil-adm">ADMIN</span> Menu: **Financeiro → Pagamentos**

## Para que serve
Registrar e consultar os **pagamentos manuais** (balcão) vinculados às assinaturas. Pagamentos feitos pelo aluno por **Pix ou cartão** no painel dele também aparecem aqui como histórico.

## Tela principal
<Figura id="PAG-01" />

**Histórico de pagamentos** — *“Consulte valores, métodos e situação dos lançamentos.”* Busca por **aluno, status ou método**. Colunas: **Aluno, Valor, Método, Status, Data**, com ações **Editar** e **Excluir**. Sem registros: *“Nenhum pagamento registrado”*.

## Registrar um pagamento
<Figura id="PAG-02" />

O valor e o status **não são digitados**: o sistema preenche a partir da assinatura e do método escolhido.

| Campo | Como funciona |
|---|---|
| **Assinatura** \* | Busca por aluno ou plano. Mostra o plano e a situação da assinatura. |
| **Valor** | Preenchido com o **valor do plano** da assinatura e bloqueado para edição. Ex.: assinatura de um plano diário de R$ 20,00 registra R$ 20,00. |
| **Data do pagamento** \* | Vem preenchida com a data de hoje; altere se o recebimento foi em outro dia. |
| **Método** \* | **Dinheiro**, **Cartão**, **Pix** ou **Boleto**, cada um com seu ícone. |
| **Status** | Definido pelo método (tabela abaixo). |

### Status automático
| Método | Status ao registrar | Próximo passo |
|---|---|---|
| **Dinheiro** | **Pago** | Nenhum: o dinheiro é recebido na hora. |
| **Pix** | **Pendente** | Abre a cobrança Pix; vira **Pago** quando o pagamento é confirmado. |
| **Cartão** | **Pendente** | Abre o pagamento com cartão; vira **Pago** quando aprovado. |
| **Boleto** | **Pendente** | Edite o lançamento e marque **Pago** quando o boleto for compensado. |

**Atrasado** também é automático: um pagamento **Pendente** cuja assinatura já venceu aparece como **Atrasado** na tabela e no total *Em atraso*.

### Passo a passo
1. Clique em **Registrar Pagamento**.
2. Escolha a **Assinatura** do aluno. O **Valor** aparece sozinho.
3. Confira a **Data** e escolha o **Método**. O campo **Status** mostra como o lançamento será gravado.
4. Clique em **Registrar** (ou **Registrar com Pix** / **Pagar com Cartão**).

### Editar um lançamento
Em **Editar**, o status pode ser trocado para **Pendente**, **Pago (pagamento confirmado)** ou **Cancelado**. É assim que se dá baixa em um boleto. O valor registrado não muda.

### Cobrar um pagamento pendente
Nas linhas pendentes, os botões **Pix** e **Cartão** abrem a cobrança daquela assinatura com o valor do plano.

:::info[Ambiente de teste]
Nesta versão os valores são de teste e o Mercado Pago usa uma conta de teste. Veja [Ambiente de teste e pagamentos](../../referencia/ambiente-de-teste) para os cartões de teste e a simulação do Pix.
:::

## Mensagens
- Sem selecionar assinatura: *“Por favor, selecione uma assinatura para continuar.”*
- Sem escolher o método: *“Escolha o método de pagamento.”*
- Plano sem valor cadastrado: *“O plano desta assinatura não tem valor cadastrado. Ajuste o plano em Cadastros > Planos.”*
- Assinatura vencida: *“Assinatura vencida. Renovação liberada.”*

## Regras
- Todo pagamento está **vinculado a uma assinatura**.
- Pagamentos **Pendentes** ou **Atrasados** tornam o aluno **inadimplente** e **bloqueiam o cancelamento** da matrícula.
- O pagamento online (Pix/cartão) **não substitui** o registro manual: os dois convivem.
