---
title: Ambiente de teste e pagamentos
sidebar_position: 0
---

# Ambiente de teste e pagamentos

:::caution[Esta versão ainda não está em uso na academia]
O sistema está em **fase de validação**. Os valores de planos e pagamentos cadastrados agora são **valores de teste**, e as contas do Mercado Pago são **contas de teste**. Quando o sistema for entregue ao estabelecimento, os planos recebem os preços reais e o Mercado Pago passa a usar as credenciais de produção da academia.
:::

## Pix

- O sistema **gera o Pix de verdade**: QR Code e código “copia e cola” no formato oficial.
- Como a conta do Mercado Pago é de **teste**, esse Pix **não pode ser pago pelo aplicativo de um banco comum**. Isso é esperado e não é um erro.
- Para concluir o fluxo nos testes, o administrador usa **Simular confirmação (ambiente acadêmico)** na janela do Pix, aberta pelo botão **Pix** de um pagamento pendente em **Financeiro → Pagamentos**. O pagamento passa a **Pago** e a assinatura é renovada, como aconteceria com um Pix real.

## Cartão de crédito e débito

Use **somente** os cartões de teste publicados pelo Mercado Pago. Nunca digite um cartão real nesta versão.

| Tipo | Bandeira | Número | CVV | Validade |
|---|---|---|---|---|
| Crédito | Mastercard | `5480 8328 0103 3311` | `123` | `11/30` |
| Crédito | Visa | `4235 6477 2802 5682` | `123` | `11/30` |
| Crédito | American Express | `3753 651535 56885` | `1234` | `11/30` |
| Débito | Elo | `5067 7667 8388 8311` | `123` | `11/30` |

O **nome do titular** escolhe o resultado do teste:

| Nome do titular | Resultado | CPF do titular |
|---|---|---|
| `APRO` | Pagamento aprovado | `123.456.789-09` |
| `OTHE` | Recusado por erro geral | `123.456.789-09` |
| `CONT` | Pagamento pendente | qualquer CPF válido |
| `FUND` | Recusado por saldo insuficiente | qualquer CPF válido |
| `SECU` | Recusado por código de segurança inválido | qualquer CPF válido |
| `EXPI` | Recusado por problema na validade | qualquer CPF válido |

Fonte: Mercado Pago Developers, página “Cartões de teste” do Checkout Transparente (consultada em 19/11/2026). A página traz outros nomes de teste para cenários de recusa específicos.

## Dinheiro e boleto

Registrados pelo administrador em **Financeiro → Pagamentos**. Dinheiro entra como **Pago** na hora; boleto entra como **Pendente** até alguém editar o lançamento e marcar como **Pago**. Veja [Pagamentos](../administrador/financeiro/pagamentos).
