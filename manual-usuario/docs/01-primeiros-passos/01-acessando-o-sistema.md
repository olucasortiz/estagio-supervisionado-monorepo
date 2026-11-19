---
title: Acessando o sistema
sidebar_position: 1
---

# Acessando o sistema

## Para que serve
Explica como abrir o sistema e o que acontece quando você entra, está desconectado ou tenta abrir uma área que não é sua.

## Como acessar
1. Abra o navegador.
2. Digite o endereço do sistema fornecido pela academia.
3. Se você ainda não entrou, o sistema mostra automaticamente a tela de **Login**.

## Para onde cada perfil é levado após o login

| Perfil | Destino | Observação |
|---|---|---|
| Administrador (`ADMIN`) | `/dashboard` — Painel administrativo | Menu completo de gestão |
| Personal trainer (`PERSONAL_TRAINER`) | `/personal` — Área do Personal | Alunos vinculados e fichas |
| Aluno (`OPERATIONAL`) | `/aluno` — Painel do Aluno | Somente consulta dos próprios dados |

## Comportamentos de proteção

- **Sem login:** ao tentar abrir qualquer tela interna, o sistema leva você ao login e, depois de entrar, retorna à tela que você queria abrir.
- **Já logado:** se abrir a tela de login estando conectado, o sistema leva você direto à sua área.
- **Área de outro perfil:** o sistema redireciona você de volta à área do seu perfil. Um aluno, por exemplo, não consegue abrir o painel administrativo.
- **Usuário inativo:** contas desativadas **não conseguem entrar**.
- **Carregando acesso:** por instantes pode aparecer o aviso **“Carregando acesso...”** enquanto o sistema confere sua sessão. Aguarde.

<Figura id="LOGIN-01" />
