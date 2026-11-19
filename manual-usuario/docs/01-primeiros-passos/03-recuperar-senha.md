---
title: Recuperação de senha
sidebar_position: 3
---

# Recuperação de senha

<span className="perfil-tag perfil-adm">ADMIN</span> <span className="perfil-tag perfil-pt">PERSONAL_TRAINER</span> <span className="perfil-tag perfil-al">OPERATIONAL</span> <span className="rota">/login → “Esqueci minha senha”</span> <span className="rota">/reset-password?token=…</span>

## Para que serve
Permite criar uma nova senha quando a atual foi esquecida, usando um link enviado ao e-mail cadastrado.

O processo tem **duas partes**: (1) pedir o link e (2) definir a nova senha.

## Parte 1 — Pedir o link

### Passo a passo
1. Na tela de login, clique em **Esqueci minha senha**.
2. Na janela que abre, digite o **E-mail** da sua conta.
3. Clique no botão de envio.
4. A janela passa a mostrar **“Verifique seu e-mail”**, com o **E-mail de destino**.

<Figura id="SENHA-01" />

### Mensagem exibida
> *“Se o e-mail estiver cadastrado e ativo, você receberá as instruções de recuperação.”*

Por segurança, a mensagem é **a mesma** exista ou não uma conta com aquele e-mail — assim ninguém consegue descobrir quem é cliente da academia.

### No e-mail
Você receberá uma mensagem com um **link de redefinição**. O link é de **uso único** e **tem prazo de validade**.


:::caution[Atenção]
Não recebeu? Confira a caixa de **spam/lixo eletrônico** e se digitou o e-mail correto. Contas inativas não recebem o link.
:::

## Parte 2 — Definir a nova senha

<Figura id="SENHA-04" />

### Elementos da tela

| Elemento | Função |
|---|---|
| **Nova senha** | Campo da nova senha (ícone de olho para mostrar/ocultar). |
| **Força da senha** | Indicador de **Muito fraca** a **Muito forte**, atualizado enquanto você digita. |
| Lista de requisitos | Marca com ✓ o que já foi cumprido (ex.: **Mínimo de 6 caracteres**). |
| **Confirmar nova senha** | Repita a senha. Deve ser igual à primeira. |
| Botão de salvar | Só fica ativo quando há um link válido. |

### Passo a passo
1. Abra o link recebido por e-mail.
2. Digite a **Nova senha** (mínimo de **6 caracteres**; quanto mais longa e variada, mais forte).
3. Digite novamente em **Confirmar nova senha**.
4. Clique para salvar.
5. Aparece **“Senha redefinida!”**. Volte ao login e entre com a nova senha.


### Mensagens de erro

| Situação | O que aparece |
|---|---|
| Senhas diferentes | Aviso sob o campo de confirmação. |
| Senha com menos de 6 caracteres | A senha é recusada. |
| Link ausente ou inválido | **“Link de redefinição ausente ou inválido. Verifique o link recebido por e-mail.”** |
| Link expirado ou já usado | **“Não foi possível redefinir a senha. O link pode ter expirado.”** — peça um novo link. |

<Figura id="SENHA-05" />
<Figura id="SENHA-07" />

## Regras de negócio
- O link é temporário, e **não pode ser reutilizado** após a troca da senha.
- Links expirados **não são aceitos**.
- A nova senha é gravada com criptografia **BCrypt**.
