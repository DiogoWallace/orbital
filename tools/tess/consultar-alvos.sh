#!/usr/bin/env bash
#
# Lista candidatos a alvo para o modulo transit-explorer do Orbital.
#
# Consulta a tabela TOI do NASA Exoplanet Archive por TAP e grava um CSV por
# categoria. Nao baixa curva nenhuma: isto e so a etapa de *escolher* os alvos.
#
# Nenhuma dependencia alem de curl. Nomes de coluna e valores de disposicao
# conferidos contra a propria tabela em 31/08/2026:
#
#   curl -sG "$TAP" --data-urlencode "query=select top 1 * from toi" \
#        --data-urlencode "format=csv" | head -1 | tr ',' '\n'
#
# DUAS ARMADILHAS DESCOBERTAS AO ESCREVER ISTO
#
# 1. `TOP` e aplicado ANTES de `ORDER BY`. Ordenar por profundidade nao devolve
#    as mais profundas: devolve as primeiras que casam com o WHERE, ordenadas
#    entre si. Por isso as consultas abaixo nao ordenam — quem faz o recorte e
#    o WHERE, e o resultado e uma amostra, nao um ranking.
#
# 2. O servico devolve timeout de vez em quando, sem erro util. Cada consulta
#    tenta tres vezes antes de desistir, e uma que falhe nao derruba as outras.

set -uo pipefail

TAP="https://exoplanetarchive.ipac.caltech.edu/TAP/sync"
SAIDA="${1:-./candidatos}"
TENTATIVAS=3

mkdir -p "$SAIDA"

falhas=0

consultar() {
  local nome="$1"
  local sql="$2"
  local destino="$SAIDA/$nome.csv"

  echo "==> $nome"

  for tentativa in $(seq 1 "$TENTATIVAS"); do
    if curl -sfG "$TAP" \
        --data-urlencode "query=$sql" \
        --data-urlencode "format=csv" \
        -m 90 -o "$destino.parcial"
    then
      # A API tambem sabe responder erro com status 200 e corpo de texto.
      if head -c 300 "$destino.parcial" | grep -qiE "error|exception"; then
        echo "    resposta de erro:"
        head -c 300 "$destino.parcial"
        echo
        rm -f "$destino.parcial"
        falhas=$((falhas + 1))
        return 0
      fi

      mv "$destino.parcial" "$destino"
      echo "    $(( $(wc -l < "$destino") - 1 )) linhas -> $destino"
      return 0
    fi

    echo "    tentativa $tentativa falhou; repetindo..."
    sleep 3
  done

  rm -f "$destino.parcial"
  echo "    desisti depois de $TENTATIVAS tentativas — rode de novo mais tarde."
  falhas=$((falhas + 1))
}

# Disposicoes em uso, conferidas na fonte:
#   CP  planeta confirmado      KP  planeta ja conhecido
#   PC  candidato               APC candidato ambiguo
#   FP  falso positivo          FA  alarme falso
#
# pl_trandep esta em ppm: 10 000 ppm = 1%.

# 1. Transito evidente: confirmado, fundo, estrela brilhante.
consultar "1-planeta-fundo" \
  "select top 60 tid, toi, tfopwg_disp, pl_orbper, pl_trandurh, pl_trandep, pl_rade, st_tmag, st_rad
   from toi
   where tfopwg_disp in ('CP','KP')
     and pl_trandep > 12000
     and pl_orbper between 1 and 8
     and st_tmag < 11"

# 2. Transito raso: confirmado tambem, mas perto do limite de deteccao.
#    Estrela brilhante compensa em parte a profundidade pequena.
consultar "2-planeta-raso" \
  "select top 60 tid, toi, tfopwg_disp, pl_orbper, pl_trandurh, pl_trandep, pl_rade, st_tmag, st_rad
   from toi
   where tfopwg_disp in ('CP','KP')
     and pl_trandep between 300 and 900
     and pl_orbper between 1 and 12
     and st_tmag < 10"

# 3. Falso positivo profundo: a maioria destes e binaria eclipsante.
#    Acima de 3% ja e fundo demais para planeta. Sao poucas dezenas na tabela
#    inteira, entao o TOP nao esconde nada relevante aqui.
consultar "3-falso-positivo" \
  "select top 60 tid, toi, tfopwg_disp, pl_orbper, pl_trandurh, pl_trandep, st_tmag, st_rad
   from toi
   where tfopwg_disp = 'FP'
     and pl_trandep > 30000
     and st_tmag < 12"

cat <<'FIM'

==> O setor NAO vem daqui

  A coluna `sectors` da TOI voltou vazia em todas as linhas testadas. Nao
  confie nela. O setor sai do proprio arquivo, com o lightkurve:

      python baixar-curva.py --tic <TIC>

  Sem `--setor`, o script apenas lista os setores disponiveis e sai.

==> Faltam dois casos, e eles nao saem da tabela TOI

  4. Estrela variavel — a TOI so lista objetos de interesse para transito.
     Escolha um pulsador conhecido e deixe o lightkurve resolver o nome:

         python baixar-curva.py --alvo "<nome do objeto>"

     Confirme no SIMBAD que o objeto e mesmo variavel e anote o tipo.

  5. Nada — uma estrela sem TOI nenhum. Pegue um TIC vizinho de um dos alvos
     acima e confirme que ele nao aparece na tabela:

         curl -sG "https://exoplanetarchive.ipac.caltech.edu/TAP/sync" \
           --data-urlencode "query=select tid from toi where tid = <TIC>" \
           --data-urlencode "format=csv"

     So o cabecalho, sem linhas, e o que voce quer. Anote a consulta e a data:
     "nao ha TOI para este alvo" tambem e afirmacao que precisa de procedencia.

==> Antes de fechar a escolha

  Para cada alvo, anote TIC, setor, disposicao, periodo, duracao e
  profundidade publicados, e a data da consulta. Estes valores sao a
  referencia contra a qual a analise do Orbital sera comparada, e precisam sair
  do CSV — nunca de memoria.
FIM

if [ "$falhas" -gt 0 ]; then
  echo
  echo "$falhas consulta(s) nao completaram."
  exit 1
fi
