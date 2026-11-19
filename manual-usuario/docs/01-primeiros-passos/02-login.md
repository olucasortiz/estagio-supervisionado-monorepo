---
title: Tela de Login
sidebar_position: 2
---

# Tela de Login

<span className="perfil-tag perfil-adm">ADMIN</span> <span className="perfil-tag perfil-pt">PERSONAL_TRAINER</span> <span className="perfil-tag perfil-al">OPERATIONAL</span> <span className="rota">/login</span>

## Para que serve
Identificar o usuário por **e-mail e senha** e liberar a área correspondente ao perfil.

## Elementos da tela

A tela é dividida em dois lados:

| Lado | Conteúdo |
|---|---|
| **Esquerdo (institucional)** | Marca Lion Fitness, o título **“Um só acesso para toda a academia”** e as três áreas do sistema: Administração, Personal trainers e Alunos, cada uma com uma linha explicando o que oferece. |
| **Direito (formulário)** | Título **“Bem-vindo de volta”**, campos **E-mail** e **Senha**, ícone de olho, link **Esqueci minha senha** e botão **Entrar**. |

<Figura id="LOGIN-01" />

| Elemento | Função |
|---|---|
| **E-mail** | Digite o e-mail cadastrado (ex.: `seu@email.com`). |
| **Senha** | Digite sua senha. Os caracteres ficam ocultos. |
| Ícone de **olho** | Alterna entre **Mostrar senha** e **Ocultar senha**. |
| **Esqueci minha senha** | Abre a janela de [recuperação de senha](./recuperar-senha). |
| **Entrar** | Valida os dados e abre a sua área. |

<Figura id="LOGIN-03" />

## Passo a passo
1. Digite o **E-mail** cadastrado.
2. Digite a **Senha**. Use o ícone de olho para conferir o que digitou.
3. Clique em **Entrar**.
4. O sistema abre a área do seu perfil ([veja a tabela](./acessando-o-sistema#para-onde-cada-perfil-é-levado-após-o-login)).

## Regras e validações
- E-mail e senha são verificados no servidor; as senhas são armazenadas de forma criptografada (BCrypt).
- Contas **inativas** não entram.
- A sessão usa um token seguro (JWT) com validade limitada; ao expirar, será necessário entrar novamente.

## Mensagens

| Situação | O que acontece |
|---|---|
| Credenciais incorretas | Um alerta vermelho aparece sobre o formulário. Confira e tente novamente. |
| Sessão expirada | Você é levado de volta ao login. |

<Figura id="LOGIN-02" />

## Uso no celular
O layout se reorganiza em uma coluna, mantendo os mesmos campos.

<Figura id="LOGIN-04" />

:::tip[Dica]
Se não lembrar a senha, use **Esqueci minha senha**. Não é preciso falar com a recepção para isso.
:::
