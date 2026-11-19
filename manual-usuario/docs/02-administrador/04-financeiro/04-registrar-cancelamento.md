---
title: Registrar Cancelamento
sidebar_position: 4
---

# Registrar Cancelamento

<span className="perfil-tag perfil-adm">ADMIN</span> Menu: **Financeiro → Registrar Cancelamento**

## Para que serve
Encerrar formalmente a matrícula de um aluno, guardando o **motivo** e a **data**, para alimentar o relatório de cancelamentos.

:::caution[Aviso exibido na tela]
*“Esta ação cancela a matrícula do aluno. O sistema pode impedir o cancelamento se existirem dívidas pendentes.”*
:::

## Passo a passo

### 1. Buscar o aluno
<Figura id="CAN-01" />

No campo **Buscar aluno para cancelamento**, digite **nome ou CPF** e escolha o aluno na lista.

### 2. Conferir e informar o motivo
<Figura id="CAN-02" />

- O aluno escolhido aparece resumido. Para trocar, clique em **Remover seleção**.
- Preencha **Motivo do cancelamento**. O campo exibe a dica “(opcional)”, mas o motivo alimenta o relatório de cancelamentos e o histórico de evasão — preencha sempre.

### 3. Confirmar
Clique para confirmar o cancelamento. O aluno é **desativado logicamente** e o registro é guardado no histórico.

## Regras e validações
- **Bloqueio por dívida:** se o aluno tiver pagamento **Pendente** ou **Atrasado**, o cancelamento é **impedido** e o sistema informa a pendência. Regularize em [Pagamentos](./pagamentos) e tente de novo.
- A validação ocorre **antes** de alterar o status do aluno e **antes** de criar o registro de cancelamento.
- Aluno já cancelado/inativo: *“Este aluno já está cancelado/inativo.”*
- O aluno **não é apagado**; dados anteriores são preservados.
- O histórico guarda **aluno, data e motivo**.

<Figura id="CAN-03" />
