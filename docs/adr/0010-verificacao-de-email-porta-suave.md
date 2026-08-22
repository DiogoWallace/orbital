# ADR 0010 — Verificação de e-mail com porta suave

**Status:** aceito · **Data:** 2026-08-22

## Contexto

O cadastro aceitava qualquer endereço sem prova de posse: dava para criar conta
com o e-mail de outra pessoa. Ao mesmo tempo, o Orbital é uma vitrine — o
catálogo é público e a simulação roda no cliente (ADR 0007), sem custo para o
servidor. Exigir confirmação antes de qualquer coisa cobraria um preço alto
justamente no minuto em que a pessoa está decidindo se fica.

## Decisão

**A conta nasce utilizável, e a confirmação guarda a escrita.** Quem se cadastra
recebe sessão na hora e pode navegar o catálogo, abrir módulos e simular à
vontade. O que exige `email_verified_at` é o que **persiste** algo associado ao
endereço: gravar execução de simulação, criar projeto — o que vier a seguir
nessa categoria entra no mesmo grupo de rotas.

Um aviso fixo no topo da plataforma explica o que falta e reenvia o link. Ele
não é dispensável: enquanto a conta estiver pela metade, o aviso fica.

**Token opaco em tabela própria, não URL assinada.** `email_verification_tokens`
espelha `password_reset_tokens`: mesma forma, mesmo ciclo de vida, mesmo modelo
mental. A URL assinada do Laravel amarra a assinatura ao host da API, e o link
precisa apontar para o frontend (ADR 0009) — manter a assinatura válida ao
trocar o host seria frágil pelo que entrega.

**A política de senha é comprimento antes de composição:** 12 caracteres, com
letra e número. `symbols` e `mixedCase` ficam de fora porque empurram a pessoa
para o "Senha1!" que ela reusa em todo lugar. Em produção entra também
`uncompromised()`, que consulta o Have I Been Pwned por k-anonimato — só os
cinco primeiros caracteres do hash SHA-1 saem daqui, nunca a senha.

**O bloqueio tem `type` próprio em RFC 7807**
(`/problems/email-not-verified`), servido por um middleware nosso no lugar do
`verified` do framework. Sem isso a interface não distingue "você não tem
permissão" de "falta confirmar seu e-mail" — duas situações que pedem respostas
opostas da tela.

## Consequências

- Cadastrar continua custando um formulário, e a fricção da confirmação chega
  quando a pessoa já viu valor na plataforma.
- Toda rota de escrita nova precisa entrar no grupo `verified`. Esquecer é o
  modo de falha desta decisão; o teste que cobre `simulation-runs` é o modelo
  para as próximas.
- Confirmar não exige sessão: o link é aberto no celular na maior parte das
  vezes, e pedir login antes viraria um obstáculo no lugar de um clique.
- Contas antigas criadas antes desta mudança ficam com `email_verified_at`
  nulo e passam a ver o aviso — inclusive a conta de desenvolvimento do seed.

## Alternativas consideradas

- **Porta rígida** (não loga até confirmar). Mais forte contra cadastro com
  e-mail alheio, ao custo de perder gente na primeira visita. Se o abuso
  aparecer, a mudança é mover a emissão do token no `RegisterController` —
  o resto do fluxo já está pronto.
- **Sem verificação.** Deixaria a plataforma emitindo e-mail para endereços que
  nunca pediram nada.
- **`MustVerifyEmail` com URL assinada**, como no Laravel padrão. Boa em
  aplicação monolítica com telas; aqui a API é headless.
