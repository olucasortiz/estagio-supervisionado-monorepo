---
title: Cancelamentos
sidebar_position: 2
---

# Relatório “Cancelamentos”

<span className="perfil-tag perfil-adm">ADMIN</span> Menu: **Relatórios → Cancelamentos**

## Para que serve
Analisar a **evasão**: quem foi desligado, quando e por qual motivo.

## Elementos da tela
<Figura id="REL-02" />

| Elemento | Descrição |
|---|---|
| **Data inicial** / **Data final** | Período da consulta. |
| Indicadores | **Cancelamentos no período** e **Motivo mais frequente**. |
| **Resultado detalhado** | Colunas **Nome, CPF, Data, Motivo**; busca por nome, CPF ou motivo. |
| **Exportar PDF** | Baixa o relatório. |

## Passo a passo
1. Informe o período e clique em **Gerar Relatório**.
2. Veja o motivo mais frequente para orientar ações de retenção.
3. Exporte em PDF, se necessário.

## Mensagens
| Situação | Mensagem |
|---|---|
| Datas em branco | *“Selecione as datas inicial e final.”* |
| Data inicial > final | *“A data inicial não pode ser posterior à data final.”* |
| Sem resultados | *“Nenhum cancelamento no período.”* |

:::info[De onde vêm os dados]
Dos **registros de cancelamento** feitos em [Registrar Cancelamento](../financeiro/registrar-cancelamento).
:::
