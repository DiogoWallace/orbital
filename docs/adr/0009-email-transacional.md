# ADR 0009 — E-mail transacional: link para o frontend, envio em fila

**Status:** aceito · **Data:** 2026-08-22

## Contexto

A recuperação de senha é o primeiro fluxo da plataforma que sai pela porta de
e-mail. Ela expõe três problemas que valem decisão registrada, porque todo
e-mail transacional seguinte — verificação de conta, convite, aviso de execução
concluída — vai herdar a resposta.

1. **Para onde o link aponta.** A API é headless (ADR 0002) e as telas vivem no
   Next (ADR 0004). O gerador de link do Laravel assume rotas web na própria
   aplicação, que aqui não existem.
2. **Quando o e-mail é enviado.** SMTP é rede: lento, e fora do nosso controle.
3. **O que a resposta do endpoint conta.** "Esqueci minha senha" é um formulário
   público que recebe um e-mail e sabe se ele tem conta.

## Decisão

**O link aponta para o frontend.** `config('app.frontend_url')` monta a URL, e
a `ResetPasswordNotification` substitui a notificação do framework no model
`User`. Quem clica é uma pessoa, e pessoa precisa cair numa página — não num
JSON. O Next recebe o token opaco e o repassa à API na hora de trocar a senha.

**Todo e-mail vai para a fila** (`ShouldQueue`, `tries = 3`, backoff crescente).
O tempo de resposta do endpoint fica independente do provedor, e uma
indisponibilidade momentânea não custa o pedido do usuário.

**A resposta é sempre a mesma frase, sempre 200.** Cadastrado ou não, primeiro
pedido ou décimo: corpo e status idênticos. O status real do broker vai para o
log. É a mesma disciplina que o `LoginController` já seguia ao gastar um hash
mesmo quando o usuário não existe.

**A casca do e-mail é Blade em tabela, com hex.** Não usamos o tema Markdown do
Laravel: o desenho é o mesmo de `tokens.css`, mas `oklch()` não existe em
nenhum cliente de e-mail relevante, e nem flexbox. Um teste garante que
`oklch(` nunca apareça no HTML enviado.

**Mailpit em desenvolvimento, Resend em produção.** Em desenvolvimento nada sai
da máquina — um endereço errado num teste não pode virar e-mail de verdade para
um estranho.

## Consequências

- Adicionar um e-mail novo é criar uma Notification e uma view em
  `resources/views/emails/`; a casca e a fila já estão de pé.
- O worker da fila passa a ser caminho crítico de um fluxo que o usuário
  espera: se ele cair, o e-mail não sai e ninguém é avisado. Monitoramento
  continua na lista do que não existe (ver `docs/DEPLOY.md`).
- Trocar de provedor é mudar variável de ambiente, não código.

## Alternativas consideradas

- **URL assinada do Laravel apontando para a API**, que depois redireciona para
  o Next. Funciona em produção, onde as duas coisas estão no mesmo domínio, e
  quebra em desenvolvimento, onde estão em portas diferentes. Também obrigaria
  a reescrever host mantendo a assinatura válida — frágil pelo que entrega.
- **Envio síncrono.** Simples até o provedor ficar lento; aí o usuário espera o
  SMTP com o formulário travado.
- **Responder "e-mail não encontrado".** Melhor mensagem de erro, ao custo de
  entregar a qualquer um a lista de quem tem conta na plataforma.
