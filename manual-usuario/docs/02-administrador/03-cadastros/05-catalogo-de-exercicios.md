---
title: Catálogo de Exercícios
sidebar_position: 5
---

# Catálogo de Exercícios

<span className="perfil-tag perfil-adm">ADMIN</span> Menu: **Cadastros → Catálogo de Exercícios**

## Para que serve
Consultar a **biblioteca interna de exercícios** usada pelos personais para montar as fichas e controlar quais exercícios estão **disponíveis** (ativos) ou não (inativos).

## Elementos da tela
<Figura id="CAT-01" />

| Bloco | Descrição |
|---|---|
| **Filtros de busca** | Busca por nome, grupo muscular, categoria e equipamento, e o filtro **Situação**: *Ativos e inativos autorizados*, *Ativos* ou *Inativos*. |
| **Biblioteca de exercícios** | Tabela com **Nome, Categoria, Músculo, Equipamento, Origem e Situação**. |
| Resumo da consulta | Total encontrado com os filtros atuais. |
| Ação por linha | **Editar** e **Inativar** / **Ativar** (para exercícios que você pode gerir) ou o texto **Somente consulta**. |
| **Novo exercício** | Botão ao lado do resumo da biblioteca. |

## Passo a passo — cadastrar ou editar
1. Clique em **Novo exercício** (ou em **Editar** na linha do exercício).
2. Preencha **Nome\***, **Categoria\***, **Músculo\***, **Equipamento / aparelho** e **Instruções\***.
3. Clique em **Salvar exercício**. Aparece *“Exercício … cadastrado com sucesso.”* (ou *atualizado*).

Exercícios criados pelo administrador entram no catálogo como **Padrão**. Não é possível ter dois exercícios padrão ativos com o mesmo nome e categoria. Editar um exercício não altera as fichas já montadas: elas guardam a cópia do exercício como estava.

## Passo a passo — ativar ou inativar
1. Filtre ou busque o exercício.
2. Clique em **Inativar** (ou **Ativar**).
3. Confirme na janela **Inativar exercício** / **Ativar exercício**.

<Figura id="CAT-02" />

## Regras
- Cada exercício tem **nome, categoria, grupo muscular, equipamento e instruções**.
- O catálogo interno é a **base da prescrição** de treinos; uma API externa **não** é a fonte principal.
- **Origem** indica se o exercício é do catálogo padrão ou **personalizado** (criado por um personal). Exercícios personalizados ficam vinculados ao personal que os criou, que os cadastra em [Montar Treino](../../personal-trainer/montar-treino) ou no catálogo, e só ele (ou o administrador) pode editá-los.
- Exercício inativo deixa de ser oferecido na prescrição, mas continua nas fichas que já o usam.

**Mensagens de erro possíveis:** *“Não foi possível carregar o catálogo.”*, *“Não foi possível buscar exercícios.”*, *“Não foi possível atualizar o exercício.”*
