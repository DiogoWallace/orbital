# ADR 0013 — Comunidade: comentários, curtidas e perfis públicos

**Status:** aceito · **Data:** 2026-08-23

## Contexto

O blog existia como publicação de mão única. Abrir conversa muda a natureza da
plataforma: passa a haver conteúdo que não é nosso, sob nomes que são de
pessoas reais, numa página pública e indexada. As decisões abaixo são menos
sobre esquema de banco e mais sobre o que a plataforma promete a quem escreve.

## Decisão

### Domínio próprio: `App\Domain\Community`

Comentário e curtida não são catálogo nem editorial: são o que os leitores
fazem *sobre* esses conteúdos. Curtida, em especial, é polimórfica desde o
primeiro dia — uma tabela para post e comentário, e para o que vier depois.
`post_likes` e `comment_likes` duplicariam a regra de "uma por pessoa por
coisa", e a terceira tabela nasceria de copiar e colar.

**Sem coluna de contagem denormalizada.** `withCount` resolve na consulta.
Contador em coluna é a categoria de dado que sai de sincronia — basta um
caminho de escrita esquecer de incrementar. Se o volume justificar, a troca
será medida, não adivinhada.

### Moderação posterior à publicação

O comentário entra no ar na hora. Fila de aprovação mataria a conversa: quem
escreve não vê o próprio texto e não volta. Em troca, três coisas existem desde
o começo:

- **Ocultar preserva a linha.** `status = hidden` tira da leitura pública e
  mantém o registro — apagar destruiria o contexto das respostas que vieram
  depois, e moderação sem histórico não é auditável.
- **Qualquer leitor denuncia**, uma vez por comentário. Denunciar de novo troca
  o motivo em vez de somar uma linha: dez cliques da mesma pessoa não podem
  pesar como dez pessoas incomodadas.
- **Moderar esvazia a fila.** Ocultar marca as denúncias pendentes como
  revisadas; fila que não esvazia sozinha vira fila que ninguém abre.

**A curadoria oculta, não reescreve.** Editar não está na policy de ninguém
além do autor. Mudar a palavra de alguém sob o nome dessa pessoa é pior do que
tirar o comentário do ar.

### Uma camada de respostas

`parent_id` aponta sempre para um comentário raiz. Responder a uma resposta
prende no mesmo raiz, e a menção no texto resolve para quem se fala. A regra
vive na action `PostComment`, não no banco: profundidade é decisão de produto,
e mudar de ideia não deveria exigir migration.

Árvore livre fica ilegível no celular a partir da terceira camada — e obrigaria
a escolher uma profundidade máxima de exibição de qualquer jeito.

### `username` como identidade pública

Até aqui uma conta tinha nome e e-mail. Nome não serve de endereço: muda,
repete, e às vezes é o nome civil de quem não quer ser encontrado por ele.
E-mail não entra em URL nunca.

O `username` é gerado no cadastro a partir do nome ou do e-mail, com desempate
numérico determinístico (`ada`, `ada2`). Ninguém escolhe apelido no meio do
cadastro — muito menos quem entra pelo Google esperando um clique. Trocar
depois é um campo em `/conta`, e o link do perfil acompanha a troca.

Forma apertada de propósito: minúsculas, números e `_`. Sem ponto, que confunde
com domínio; sem maiúscula, porque `Ada` e `ada` seriam duas pessoas numa URL
digitada de memória.

### Comentar e curtir exigem e-mail confirmado

Entram no mesmo grupo `verified` da gravação de simulação (ADR 0010). São atos
públicos ligados a um nome: sem a confirmação, uma conta descartável comenta em
nome de um endereço alheio.

### O que o perfil **não** mostra

- **E-mail, nunca** — nem hasheado para gerar avatar de terceiros. Hash de
  e-mail é reversível por dicionário e serve de identificador cruzado entre
  sites. É por isso que o avatar é feito de iniciais e de uma cor derivada do
  username, e não de Gravatar.
- **O que a pessoa curtiu.** Curtida é histórico de leitura. Comentário já era
  fala pública quando foi escrito; curtida não — expor transforma um gesto
  barato em declaração, que não foi o que a pessoa fez.

O que aparece é o que ela escreveu, e só o que está visível.

### As permissões vêm da policy, não do frontend

Cada comentário serializado carrega `viewerCan: {edit, delete, report,
moderate}`, calculado pela `CommentPolicy`. O botão que aparece e depois recebe
403 é pior que botão nenhum, e duas cópias da mesma regra divergem na primeira
mudança.

## Consequências

- Spam fica visível até alguém agir. A denúncia é a via de aviso, e o throttle
  de dez comentários por dez minutos é o teto. Se o volume mudar, o próximo
  passo é moderar o primeiro comentário de cada conta nova — não uma fila geral.
- Não há tela de moderação: a curadoria oculta pelo próprio fio, onde os botões
  aparecem. Uma fila com as denúncias pendentes é o próximo passo natural.
- Não há upload de avatar. A coluna `avatar_path` existe e fica nula.
- **Teste que troca de usuário no meio precisa de `app('auth')->forgetGuards()`
  antes do novo token**, e de `flushHeaders()` para voltar a ser anônimo. O
  guard do Sanctum guarda em memória o usuário que resolveu, e dentro de um
  teste a aplicação é a mesma entre requisições. Em produção cada requisição é
  um processo novo, e o problema não existe — o que faz dele uma armadilha só
  de teste, e das que passam despercebidas: sem isso, um curador aparece como
  leitor comum e o teste falha por um motivo que não é o do código.

## Alternativas consideradas

- **Comentário anônimo, sem conta.** Mais participação, e a moderação vira o
  produto. Descartado enquanto não houver quem modere em tempo integral.
- **Fila de aprovação.** Segura contra abuso, letal para a conversa, e exige
  uma tela de moderação antes de o recurso servir para alguma coisa.
- **Perfil identificado por id ou slug do nome.** Simples, e a URL muda quando
  a pessoa muda o nome — ou expõe o id, que é contagem de usuários de graça.
