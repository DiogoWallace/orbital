# syntax=docker/dockerfile:1
FROM php:8.4-fpm-alpine AS base

# install-php-extensions resolve dependências de sistema automaticamente;
# manter a lista enxuta mantém a imagem pequena e o boot rápido.
COPY --from=mlocati/php-extension-installer:2 /usr/bin/install-php-extensions /usr/local/bin/

RUN install-php-extensions \
        pdo_pgsql \
        pgsql \
        redis \
        zip \
        intl \
        bcmath \
        gd \
        exif \
        pcntl \
        opcache \
    && apk add --no-cache git bash postgresql-client

COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-orbital.ini

WORKDIR /var/www/html

# Usuário não-root com o UID do host: evita arquivos pertencentes a root
# aparecendo no bind mount do WSL.
ARG UID=1000
ARG GID=1000
RUN if ! getent group ${GID} >/dev/null; then addgroup -g ${GID} app; fi \
    && if ! getent passwd ${UID} >/dev/null; then \
         adduser -u ${UID} -G "$(getent group ${GID} | cut -d: -f1)" -S -s /bin/bash app; \
       fi

# Pelo número, não pelo nome: se o UID já existia na imagem base, o nome do
# usuário não é necessariamente `app`.
USER ${UID}
