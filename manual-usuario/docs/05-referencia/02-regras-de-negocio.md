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
| **Catálogo** | O ADMIN cria exercícios **padrão** e edita qualquer um; o personal cria **personalizados** e edita só os seus. Editar não muda fichas já montadas. |

## Avaliação física e cargas
| Regra | Detalhe |
|---|---|
| **Avaliação opcional** | Nenhum aluno precisa ter avaliação. Quando houver, só **data, peso e altura** são obrigatórios. |
| Quem registra | O **personal** (só dos seus alunos) e o **ADMIN**. O aluno apenas consulta. |
| Sexo e nascimento | Exigidos só no protocolo de **dobras cutâneas** (as equações de Pollock dependem deles). |
| PAR-Q | Opcional. Se começar, responda as 7 perguntas. Qualquer **“sim”** gera o alerta de **liberação médica**. |
| Cálculos automáticos | **IMC** (faixas da OMS), **% de gordura** (Jackson & Pollock + Siri, ou o valor da bioimpedância), **massa magra/gorda** e **relação cintura-quadril**. |
| Histórico | Cada avaliação mostra a diferença para a **anterior**; com duas ou mais, aparece a **evolução desde a primeira**. Excluir só tira do histórico (o registro fica no banco). |
| Carga por aparelho | O aluno informa a carga ao concluir cada série (opcional). Só vale para exercícios da **própria ficha ativa**. |

## Permissões por perfil
| Funcionalidade | ADMIN | PERSONAL_TRAINER | OPERATIONAL |
|---|:---:|:---:|:---:|
| Dashboard, relatórios e financeiro | ✔ | — | — |
| Cadastros (alunos, planos, usuários, personais) | ✔ | — | — |
| Catálogo de exercícios | ✔ | ✔ (consulta e seus exercícios) | — |
| Alunos vinculados e fichas de treino | — | ✔ | — |
| Registrar avaliação física | ✔ | ✔ (seus alunos) | — |
| Consultar cargas por aparelho | ✔ | ✔ (seus alunos) | ✔ (as próprias) |
| Painel do aluno (plano, pagamentos, treino, avaliação) | — | — | ✔ (apenas os próprios) |
| Chat e notificações | — | ✔ | ✔ |

As permissões são **validadas no servidor**, não apenas escondidas na tela.
