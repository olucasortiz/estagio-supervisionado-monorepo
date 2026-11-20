---
title: Avaliação física e cargas
sidebar_position: 5
---

# Avaliação física e cargas

<span className="perfil-tag perfil-pt">PERSONAL_TRAINER</span> <span className="perfil-tag perfil-adm">ADMIN</span> Botão **Acompanhamento** (personal) ou **Avaliação** (admin)

## Para que serve
Registrar a **avaliação física** do aluno, acompanhar a **evolução** entre uma avaliação e outra e consultar as **cargas por aparelho** que o aluno anota durante o treino.

:::tip[A avaliação física é opcional]
Nenhum aluno é obrigado a fazer avaliação física. Se ele não quiser ou ainda não fez, **não é preciso cadastrar nada**: treinos, plano e pagamentos funcionam normalmente. Quando houver avaliação, só **data, peso e altura** são obrigatórios; o resto é preenchido conforme o que foi medido.
:::

## Onde fica
- **Personal:** aba **Meus Alunos** → botão **Acompanhamento** na linha do aluno.
- **Administrador:** **Cadastros > Alunos** → botão **Avaliação** na linha do aluno (desabilitado para aluno inativo).

Abre um painel lateral com duas abas: **Avaliação física** e **Cargas por aparelho**.

## Registrar uma avaliação
1. Na aba **Avaliação física**, clique em **Nova avaliação**.
2. Preencha as partes que foram medidas:

| Parte | Campos | Obrigatório? |
|---|---|---|
| **Identificação** | Data da avaliação, sexo, objetivo | Só a **data**. O sexo é exigido apenas no protocolo de dobras. |
| **Anamnese (PAR-Q)** | 7 perguntas Sim/Não e histórico de saúde (lesões, cirurgias, medicamentos) | Não. Se começar o PAR-Q, responda as 7 perguntas, ou marque **PAR-Q não aplicado**. |
| **Sinais vitais em repouso** | Frequência cardíaca (bpm), pressão sistólica e diastólica (mmHg) | Não. A pressão é informada com os dois valores juntos. |
| **Antropometria** | **Peso (kg)** e **altura (cm)**; perímetros de tórax, cintura, abdômen, quadril, braços, coxas e panturrilhas | **Peso e altura**. Os perímetros são opcionais. |
| **Composição corporal** | Método: Pollock 7 dobras, Pollock 3 dobras, bioimpedância ou sem composição corporal | Não. As dobras só são pedidas quando o protocolo é escolhido. |
| **Observações do avaliador** | Texto livre | Não. |

3. Clique em **Salvar avaliação**. Aparece *“Avaliação física registrada.”*

Os números aceitam vírgula ou ponto (ex.: **72,5**). Ao digitar peso e altura, o formulário já mostra o **IMC estimado**.

### Protocolos de composição corporal
| Método | O que informar | Observação |
|---|---|---|
| **Pollock 7 dobras** | Peitoral, axilar média, tríceps, subescapular, abdominal, suprailíaca e coxa (mm) | Exige **sexo** e **data de nascimento** do aluno. |
| **Pollock 3 dobras** | Homens: peitoral, abdominal e coxa. Mulheres: tríceps, suprailíaca e coxa (mm) | Exige **sexo** e **data de nascimento** do aluno. |
| **Bioimpedância** | % de gordura medido pela balança | — |
| **Sem composição corporal** | Nada | Registra só peso, altura, perímetros e sinais vitais. |

## Resultados calculados
| Indicador | Como é calculado |
|---|---|
| **IMC** | Peso ÷ altura², com a classificação da OMS (abaixo do peso, peso adequado, sobrepeso, obesidade grau I, II ou III). |
| **% de gordura** | Equações de Jackson & Pollock (densidade corporal) e equação de Siri; na bioimpedância, o valor informado. |
| **Massa gorda e massa magra** | Peso × % de gordura e o restante do peso. |
| **Relação cintura-quadril** | Cintura ÷ quadril. Com o sexo informado, indica risco elevado acima de 0,90 (homens) ou 0,85 (mulheres), segundo a OMS. |
| **PAR-Q** | Qualquer resposta **“sim”** mostra o alerta *“recomenda-se liberação médica”*. |

## Histórico e evolução
- Cada avaliação mostra, ao lado de cada indicador, a **diferença para a avaliação anterior**. A cor verde indica melhora (ex.: menos gordura, mais massa magra) e a vermelha, piora; o peso aparece sem cor.
- Com **duas ou mais avaliações**, o quadro **Evolução desde a primeira avaliação** compara a primeira com a mais recente: peso, IMC, gordura (em pontos percentuais), massa magra e cintura.
- A tabela **Histórico de avaliações** lista todas, da mais recente para a mais antiga. Clique na **data** para ver aquela avaliação.
- **Ver medidas e anamnese** abre os perímetros, as dobras, as respostas “sim” do PAR-Q e as observações.

### Excluir uma avaliação
Clique em **Excluir** na linha da avaliação e confirme em **Excluir avaliação** (ou **Manter** para desistir). Ela some do histórico do personal e do aluno.

## Cargas por aparelho
A aba **Cargas por aparelho** mostra o que o aluno registrou durante os treinos:

| Coluna | Significado |
|---|---|
| **Exercício / aparelho** | Nome do exercício, aparelho e data do último registro. Clique no nome para ver as séries registradas. |
| **Última carga** | Carga × repetições da última série registrada. |
| **Recorde** | Maior carga já registrada nesse exercício. |
| **Evolução** | Diferença entre a última carga e a primeira registrada. |
| **Treinos** | Em quantos dias diferentes o exercício foi registrado. |

As cargas são anotadas pelo próprio aluno ao concluir cada série (veja [Meus treinos](../aluno/meus-treinos)).

## Regras
- A avaliação física é **opcional** para o aluno.
- O personal só avalia e consulta os **seus** alunos; o administrador, qualquer aluno ativo.
- O aluno **consulta** as próprias avaliações e cargas, mas não altera as avaliações.
