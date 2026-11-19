---
title: Meu plano e renovação
sidebar_position: 1
---

# Meu plano e renovação

<span className="perfil-tag perfil-al">OPERATIONAL</span> <span className="rota">/aluno</span>

## Para que serve
Mostrar se o seu plano está ativo e permitir **renovar a mensalidade** online.

## Situação do plano

| Situação | O que você vê |
|---|---|
| **Plano ativo** | Cartão com o plano e a vigência (**Válido até** a data final). |
| **Sem plano ativo** | Cartão **“Nenhum plano ativo”** com o convite *“Regularize sua assinatura para continuar treinando.”* |

<Figura id="AL-02" />
<Figura id="AL-03" />

## Renovar mensalidade
<Figura id="AL-04" />

Quando a renovação está liberada, o painel avisa, por exemplo: *“Seu plano vence em 5 dias. Você já pode renovar sem perder os dias restantes.”* Ou seja, renovar antes do vencimento **não faz você perder** os dias que sobram.

No cartão **Renovar mensalidade — Escolha uma forma de pagamento**, escolha:

| Opção | Descrição |
|---|---|
| **Pix** (selo **Rápido**) | Gera um QR Code e um código “copia e cola”. |
| **Cartão** | Crédito ou débito, processado pelo Mercado Pago. |

### Pagar com Pix
<Figura id="AL-05" />

1. Escolha **Pix**. Abre **Pagamento via Pix**.
2. **Escaneie** o QR Code com o app do seu banco *ou* use o botão de **copiar o código** e cole no app.
3. Confirme o pagamento no banco.
4. A tela atualiza sozinha: **“Pagamento aprovado com sucesso! Sua assinatura foi atualizada.”**

| Mensagem | Significado |
|---|---|
| *“QR Code indisponível”* | Não foi possível exibir a imagem; use o código copiável. |
| *“Esta cobrança Pix expirou.”* | Gere uma nova cobrança. |
| *“O pagamento via Pix não foi aprovado ou foi cancelado.”* | Tente novamente. |
| *“Não foi possível gerar o Pix. Tente novamente em instantes.”* | Falha temporária. |
| *“Não foi possível copiar automaticamente…”* | Selecione e copie o código manualmente. |

### Pagar com cartão
<Figura id="AL-06" />

1. Escolha **Cartão**. Abre **Pagamento com cartão**, com uma **pré-visualização do cartão**.
2. Selecione **Crédito** ou **Débito** (o débito é **à vista, em 1 parcela**).
3. Preencha número do cartão, **nome impresso**, **validade (MM/AA)**, **CVV** e **CPF** do titular (11 dígitos).
4. Confirme. Resultado esperado: **“Pagamento aprovado com sucesso! Sua assinatura foi renovada.”**


| Mensagem | Significado |
|---|---|
| *“Por favor, informe um número de cartão válido.”* | Número inválido. |
| *“Por favor, informe o nome impresso no cartão.”* | Nome ausente. |
| *“Por favor, informe a validade no formato MM/AA.”* / *“Mês de validade inválido.”* | Validade incorreta. |
| *“Código de segurança (CVV) inválido.”* | CVV incorreto. |
| *“Por favor, informe um CPF válido com 11 dígitos.”* | CPF incompleto. |
| *“Pagamento não autorizado pela emissora do cartão.”* | A operadora recusou; tente outro cartão. |
| *“Pagamento em análise pelo Mercado Pago.”* | Aguarde a confirmação. |

:::info[Dados do cartão]
Os dados do cartão são enviados a um módulo seguro do Mercado Pago; o sistema Lion Fitness não armazena número nem CVV.
:::

:::caution[Ambiente de teste]
Esta versão ainda não está em uso na academia: os valores são de teste e o Mercado Pago usa uma **conta de teste**. O Pix é gerado normalmente, mas **não pode ser pago por um banco comum**; no cartão, use apenas os **cartões de teste** do Mercado Pago. Veja [Ambiente de teste e pagamentos](../referencia/ambiente-de-teste).
:::

## Regras
- Após a **aprovação**, o pagamento e a assinatura são **atualizados automaticamente**, sem baixa manual.
- O pagamento online **não substitui** o registro manual feito pela recepção.
- Você vê **apenas os seus** dados.
