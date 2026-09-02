.PHONY: up down restart build logs shell db migrate fresh test lint hooks

up:        ; docker compose up -d
down:      ; docker compose down
restart:   ; docker compose restart
build:     ; docker compose build
logs:      ; docker compose logs -f --tail=100
shell:     ; docker compose exec api bash
db:        ; docker compose exec postgres psql -U orbital -d orbital
migrate:   ; docker compose exec api php artisan migrate
fresh:     ; docker compose exec api php artisan migrate:fresh --seed
test:      ; docker compose exec api php artisan test
web-shell: ; docker compose exec web sh
hooks:     ; git config core.hooksPath .githooks && git config commit.template .gitmessage && chmod +x .githooks/commit-msg && echo "hooks: core.hooksPath -> .githooks, template -> .gitmessage"
