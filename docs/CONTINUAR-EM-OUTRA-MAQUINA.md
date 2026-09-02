# Continuar em outra máquina

O que o `git clone` **não** traz, e como reconstruir cada peça. A ordem importa:
os três primeiros passos são pré-requisito de tudo; o resto depende do que você
vai mexer.

---

## 1. A stack de desenvolvimento

**Pré-requisito:** Docker Desktop com a integração WSL ativada para a distro
`Ubuntu` (Settings → Resources → WSL Integration). Sem isso o `docker` não
existe dentro do WSL e nada sobe.

```bash
git clone https://github.com/DiogoWallace/orbital.git ~/projects/orbital
cd ~/projects/orbital

cp .env.example .env
docker compose up -d
docker compose exec api php artisan migrate --seed
```

| Serviço | URL |
|---|---|
| Frontend | http://localhost:3100 |
| API | http://localhost:8100/api/v1 |
| Mailpit | http://localhost:8125 |

Conta de desenvolvimento: `admin@orbital.local` / `password`.

Se a suíte falhar em massa com `UnexpectedValueException` do Monolog, a imagem
foi construída antes do `USER ${UID}`: `docker compose build api queue`. Se o
nginx devolver 502 depois de um `restart api`, reinicie o nginx junto — ele
resolve o IP do php-fpm uma vez só.

## 2. O hook que remove atribuição de IA

**Hooks não são versionados.** Um clone novo não tem o `commit-msg` que retira o
trailer de coautoria, e o default do harness manda incluí-lo. Sem o hook, ele
volta a aparecer.

```bash
mkdir -p .git/hooks
cat > .git/hooks/strip-ai-sig.py <<'PY'
import re
import sys

texto = sys.stdin.read()
padrao = re.compile(
    r"^\s*(Co-Authored-By:.*Claude.*|🤖 Generated with .*Claude Code.*)\s*$",
    re.IGNORECASE | re.MULTILINE,
)
sys.stdout.write(padrao.sub("", texto).rstrip() + "\n")
PY

cat > .git/hooks/commit-msg <<'SH'
#!/usr/bin/env bash
set -e
python3 "$(dirname "$0")/strip-ai-sig.py" < "$1" > "$1.stripped"
mv "$1.stripped" "$1"
SH

chmod +x .git/hooks/commit-msg
```

## 3. O ambiente Python das ferramentas

Só é necessário para **baixar** curvas do TESS. Consultar catálogo, resolver
setor e buscar alvos rodam com a biblioteca padrão.

```bash
sudo apt install python3-venv        # não vem por padrão no Ubuntu do WSL

python3 -m venv ~/.venvs/orbital-tess
source ~/.venvs/orbital-tess/bin/activate
pip install lightkurve scikit-learn
```

`lightkurve` para o download, `scikit-learn` para o treino. Nenhum dos dois
entra na aplicação — `tools/` está no `.dockerignore` e nenhum `Dockerfile` o
copia.

## 4. Os dados

| O que | Onde | Vem no clone? |
|---|---|---|
| Cinco curvas curadas | tabela `datasets` | não — reimportar (abaixo) |
| Curvas do lote (262, 103 MB) | `~/dados/tess-lote/curvas/` | **não** |
| Manifesto e resultados do lote | `tools/brenda/dados/` | **sim**, 68 KB |

**Para treinar a Brenda não é preciso baixar nada** — os CSVs versionados
bastam:

```bash
python3 tools/brenda/treinar.py --dados tools/brenda/dados/resultados.csv
```

**Para reconstruir as cinco curvas publicadas**, que são o que o módulo mostra:

```bash
cd tools/tess
for alvo in "256364928 54 transito-evidente" "261136679 1 transito-raso" \
            "285524410 61 binaria-eclipsante" "7697330 4 estrela-variavel" \
            "270950967 14 nada"; do
  set -- $alvo
  python3 baixar-curva.py --tic "$1" --setor "$2" --rotulo "$3" \
    --mascara default --saida ./curvas
done

# o comando roda no container, então os arquivos precisam estar no bind mount
mkdir -p ../../apps/api/storage/app/curvas
cp curvas/*.json ../../apps/api/storage/app/curvas/
cd ../..
docker compose exec api php artisan datasets:import \
  storage/app/curvas/*.json --publish
rm -rf apps/api/storage/app/curvas
```

A ingestão é idempotente pelo slug: rodar de novo atualiza em vez de duplicar.

**Para refazer o lote inteiro** são 3–4 horas de download. O script é retomável
— curva já baixada é pulada:

```bash
python3 tools/tess/lote-baixar.py --quantos 150 --mascara default \
  --saida ~/dados/tess-lote
```

## 5. A skill

Ela **vem** no clone (`.claude/skills/orbital/`), mas só é descoberta em sessões
abertas dentro do projeto. Para valer em qualquer sessão, um symlink — e criar
symlink no Windows exige shell elevado:

```powershell
New-Item -ItemType SymbolicLink `
  -Path "C:\Users\<voce>\.claude\skills\orbital" `
  -Target "\\wsl.localhost\Ubuntu\home\<voce>\projects\orbital\.claude\skills\orbital"
```

---

## O que muda de máquina para máquina

**Portas.** 3100, 8100, 5433, 6380 e 8125 foram escolhidas para não colidir com
outros projetos WSL. Se colidirem na máquina nova, todas são variáveis do
`.env` da raiz.

**O `gh`.** Está autenticado como `Sr-Ryuk`, e o dono do repositório é
`DiogoWallace`. Push funciona; `gh auth status` parece a conta errada.

**Trabalhar pelo Windows sobre arquivos do WSL** tem três armadilhas que falham
em silêncio, e o repositório não tem `.gitattributes` para proteger:
`$PWD` reescrito em bind mount do Docker, argumentos corrompidos ao passar por
`wsl.exe`, e CRLF gravado por editor do Windows. As três se resolvem do mesmo
jeito — pôr a lógica num arquivo `.sh` e chamar o arquivo. Detalhe em
`.claude/skills/orbital/references/environment.md`.
