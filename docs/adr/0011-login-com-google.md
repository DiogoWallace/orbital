# ADR 0011 — Login com o Google: OAuth na API, ticket de uso único para o BFF

**Status:** aceito · **Data:** 2026-08-22

## Contexto

Login social remove a fricção de inventar mais uma senha, e no Orbital ele
esbarra em duas restrições já decididas: a API é a única autoridade de
identidade, e o token de sessão só existe em cookie httpOnly escrito pelo Next
(ADR 0004). O fluxo OAuth, por natureza, é navegação do usuário — sai do nosso
site, passa pelo Google e volta. Alguma coisa precisa costurar as duas pontas.

## Decisão

**O OAuth roda na API.** O `client_secret` do Google vive só lá, e a URI de
redirecionamento autorizada aponta para a API. Quem recebe o `code` é quem tem
o segredo para trocá-lo. O Next só encaminha o usuário e recolhe o resultado.

**O callback volta com um _ticket_, nunca com o token.** A API guarda o token
de acesso no cache do Redis por 60 segundos, indexado por uma string aleatória,
e redireciona o navegador para o BFF com ela na query. O BFF troca o ticket
pelo token pela rede interna e o grava no cookie. Redirecionar com o token na
URL o deixaria no histórico do navegador, no cabeçalho `Referer` e no log de
qualquer proxy no caminho. O ticket vale um minuto e some no primeiro uso.

**Sem Socialite.** Ele exige Guzzle ^6|^7 e o projeto está no 8, trazido pelo
Laravel 13. Instalá-lo custaria rebaixar o Guzzle e somar cinco pacotes
(`league/oauth1-client`, `phpseclib`, `firebase/php-jwt`, `paragonie/*`) para um
único fluxo OAuth 2.0. O cliente próprio tem cerca de cem linhas sobre o
`Http` do Laravel.

O perfil vem do endpoint `userinfo`, e não da decodificação do `id_token`. Os
dois carregam a mesma informação, mas o `id_token` é um JWT cuja assinatura
precisaria ser verificada contra as chaves públicas rotativas do Google. A
resposta do `userinfo` chega pela nossa própria conexão TLS com o Google — é o
mesmo caminho que o Socialite segue para este provedor.

**O `state` vai em cookie httpOnly, além da URL.** Sem sessão não há onde
guardá-lo do jeito clássico. No retorno, query e cookie precisam bater: um
atacante consegue montar uma URL de callback com um `code` dele, mas não
consegue escrever o cookie no navegador da vítima.

**Ligação com conta local existente só quando o provedor confirma o e-mail.**
Se o Google diz `email_verified`, a conta é ligada e o e-mail local passa a
valer como confirmado — o Google acabou de provar a posse do endereço. Se não
confirma, o login é recusado: bastaria criar uma conta no provedor com o e-mail
de outra pessoa para assumir a conta dela aqui.

**Conta criada pelo Google não tem senha** (`users.password` virou nulável), e
tentar entrar com senha nela devolve o mesmo erro genérico de sempre — dizer
"esta conta entra pelo Google" devolveria exatamente a informação que a mensagem
única do login existe para esconder. A dica fica na tela, visível para todos,
sem depender do e-mail digitado. Quem quiser deixar de depender do provedor usa
a recuperação de senha, que funciona porque o endereço já está confirmado.

**Provedores ficam em `social_accounts`, não numa coluna em `users`.** O
segundo provedor — GitHub, ORCID — não deve exigir migration na tabela central.

## Consequências

- Sem `GOOGLE_CLIENT_ID` o botão não aparece (`GOOGLE_LOGIN_ENABLED`) e a rota
  responde 503. O ambiente sem credenciais funciona inteiro, só sem o botão.
- Manter o fluxo passa a ser nosso. É um fluxo estável e coberto por testes com
  o HTTP falsificado, mas mudança de contrato no Google é problema nosso.
- O `?proximo=` do login por senha não atravessa o Google: quem entra pelo botão
  volta no painel. Carregar o destino exigiria mais um cookie no caminho.
- Adicionar outro provedor é escrever um cliente novo com o mesmo contrato
  (`SocialProfileData`) e mais duas rotas. A action que resolve o usuário e o
  mecanismo de ticket servem sem alteração.

## Alternativas consideradas

- **Auth.js no Next.** Frontend autossuficiente, mas criaria uma segunda
  autoridade de identidade e um endpoint privilegiado novo na API — contra o
  ADR 0004.
- **Rebaixar o Guzzle e usar o Socialite.** Manutenção terceirizada e caminho
  pronto para outros provedores, ao custo de cinco dependências e de uma versão
  antiga do cliente HTTP em todo o projeto.
- **Redirecionar com o token na URL.** Um passo a menos e um vazamento a mais.
