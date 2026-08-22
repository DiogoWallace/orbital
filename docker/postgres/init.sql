-- Extensões usadas pelo catálogo:
--   pg_trgm   -> busca tolerante a erro de digitação (títulos, tags)
--   unaccent  -> busca ignorando acentos (conteúdo em português)
--   citext    -> e-mails case-insensitive sem lower() em toda query
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS citext;

-- Banco de testes separado.
--
-- Os testes rodam contra PostgreSQL, e não contra SQLite em memória, porque o
-- schema usa jsonb e índices GIN: um teste que passasse em SQLite não diria
-- nada sobre o banco real (ADR 0003).
CREATE DATABASE orbital_test OWNER orbital;

\connect orbital_test

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS citext;
