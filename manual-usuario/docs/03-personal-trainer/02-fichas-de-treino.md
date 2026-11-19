---
title: Fichas de treino
sidebar_position: 2
---

# Fichas de treino

<span className="perfil-tag perfil-pt">PERSONAL_TRAINER</span> Aba **Fichas do Aluno**

## Para que serve
Gerenciar as fichas do aluno escolhido: criar, consultar, editar, excluir, ver o histórico e exportar em PDF. Cada ficha tem **título**, **objetivo/descrição** e **dia da semana**.

## Elementos da tela
<Figura id="PT-02" />

| Elemento | Descrição |
|---|---|
| **Nova Ficha** | Abre a criação de uma ficha para o aluno. |
| Lista de fichas | Fichas do aluno; selecione uma para ver os detalhes. |
| Dados da ficha | **Dia da semana**, **Criada em** e quantidade de **Exercícios**. |
| **Adicionar exercícios à ficha** | Leva à aba **Montar Treino**. |
| **Editar ficha** | Abre a edição (veja abaixo). |
| **Histórico de alterações** | Mostra versões anteriores. |
| **Exportar PDF** | Gera o PDF da ficha. |
| Excluir | Remove a ficha (pede confirmação). |

Sem fichas: *“Nenhuma ficha cadastrada — Este aluno ainda não possui uma ficha de treino. Clique em ‘Nova Ficha’ para iniciar.”* Carregando: *“Carregando fichas de treino…”*.

## Criar uma ficha
<Figura id="PT-03" />

1. Clique em **Nova Ficha**. Abre **Criar Nova Ficha**.
2. Preencha o **Título** (ex.: *Treino A - Peito e Tríceps*).
3. Escolha o **Dia da semana** (**Segunda-feira** a **Domingo**).
4. Confirme. A ficha aparece na lista e você segue para [montar o treino](./montar-treino).

## Editar uma ficha mantendo histórico
<Figura id="PT-08" />

1. Selecione a ficha e clique em **Editar ficha** (abre a aba **Montar Treino** em modo de edição).
2. Altere objetivo, dia, exercícios, séries, repetições, descanso ou observações.
3. Preencha o **motivo da atualização** (*“Descreva o motivo da atualização.”*).
4. Clique em **Salvar ficha e histórico**.

Confirmação: *“Ficha atualizada. A versão anterior está disponível no histórico.”*

:::caution[Atenção]
- **Fichas inativas não podem ser editadas**: *“Ficha inativa não pode ser editada.”*
- Se você trocar de aba com alterações não salvas, o sistema pergunta: *“Descartar as alterações ainda não salvas desta ficha?”*
:::

## Histórico de alterações
<Figura id="PT-09" />

1. Clique em **Histórico de alterações**.
2. À esquerda, escolha uma alteração (data e motivo). À direita, veja a **versão anterior**: **Objetivo anterior**, **Dia anterior**, **Situação anterior**, exercícios com **Instruções** e **Observações**.
3. Mensagens: *“Nenhuma alteração registrada para esta ficha.”* / *“Selecione uma alteração ao lado.”* / *“A versão anterior não possuía exercícios.”* Registros antigos podem conter apenas o texto do evento.

## Excluir uma ficha
<Figura id="PT-10" />

Clique em excluir e confirme em **Excluir ficha?**. Se falhar, aparece *“Não foi possível inativar a ficha de treino.”*

## Exportar PDF
<Figura id="PT-11" />

Clique em **Exportar PDF** para baixar a ficha formatada, pronta para imprimir ou enviar.

## Regras
- A ficha é vinculada a **um aluno** e **ao personal**.
- Cada edição **grava o histórico** (data, motivo e versão anterior).
- O aluno enxerga a ficha ativa no Painel do Aluno, **somente leitura**.
