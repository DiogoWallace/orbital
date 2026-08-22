#!/bin/sh
set -e

# Os arquivos de `public/` são servidos pela imagem do nginx, que os copia do
# mesmo commit — ver docker/nginx/Dockerfile.prod. Este container cuida só do PHP.

# Caches de configuração e rotas só podem ser gerados aqui, e não no build:
# eles congelam os valores de ambiente, que só existem em tempo de execução.
php artisan config:cache
php artisan route:cache
php artisan event:cache

exec "$@"
