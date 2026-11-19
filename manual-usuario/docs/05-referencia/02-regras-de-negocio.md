---
title: Regras de negócio
sidebar_position: 2
---

# Regras de negócio

Resumo das regras que o sistema aplica e que você percebe ao usar as telas.

## Cadastros
| Regra | Onde se aplica |
|---|---|
| **CPF é único** para alunos e para personais. | [Alunos](../administrador/cadastros/alunos), [Personal Trainers](../administrador/cadastros/personal-trainers) |
| **E-mail é único** por usuário. | Usuários, Alunos |
| Ao cadastrar um aluno, o sistema **cria o usuário `OPERATIONAL`** dele. | Alunos |
| Inativar **não apaga** nada (*soft delete*). | Alunos e demais cadastros |
| **Usuários inativos não entram** no sistema. | Login |
| Senhas são guardadas com **BCrypt**. | Todos os perfis |

## Planos, assinaturas e pagamentos
| Regra | Detalhe |
|---|---|
| Tipos de plano | **Mensal** e **Diário** (sem semestral/anual). |
| **Vigência automática** | Término = início + duração (dias) do plano. |
| Assinatura exige **aluno e plano válidos**. | — |
| Pagamento vinculado a uma assinatura | Valor = preço do plano da assinatura (não é digitado). Métodos: Dinheiro, Pix, Cartão, Boleto. |
| Status automático | Dinheiro entra **Pago**; Pix, Cartão e Boleto entram **Pendente** até a confirmação. Pendente com assinatura vencida aparece como **Atrasado**. |
| **Inadimplente** | Pagamento Pendente/Atrasado com assinatura vencida. **Sem multa nem juros.** |

## Cancelamento
1. Só o **ADMIN** cancela.
2. O sistema **verifica pendências** (Pendente ou Atrasado). Havendo, o cancelamento é **bloqueado**.
3. Sem pendências, o aluno é **desativado** e o registro (aluno, data e **motivo**) vai para o **histórico**.

## Treinos
| Regra | Detalhe |
|---|---|
| Ficha vinculada a **um aluno** e **um personal** | O personal só cria fichas para **seus** alunos. |
| **Catálogo interno** como base | Exercícios personalizados ficam vinculados ao personal que os criou. |
| **Edição gera histórico** | Data, motivo e versão anterior. |
| **Aluno só consulta** | Não altera fichas, pagamentos ou dados administrativos. |

## Permissões por perfil
| Funcionalidade | ADMIN | PERSONAL_TRAINER | OPERATIONAL |
|---|:---:|:---:|:---:|
| Dashboard, relatórios e financeiro | ✔ | — | — |
| Cadastros (alunos, planos, usuários, personais) | ✔ | — | — |
| Catálogo de exercícios | ✔ | ✔ (consulta e seus exercícios) | — |
| Alunos vinculados e fichas de treino | — | ✔ | — |
| Painel do aluno (plano, pagamentos, treino) | — | — | ✔ (apenas os próprios) |
| Chat e notificações | — | ✔ | ✔ |

As permissões são **validadas no servidor**, não apenas escondidas na tela.
