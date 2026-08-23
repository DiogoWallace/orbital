<?php

declare(strict_types=1);

namespace App\Domain\Editorial\Models;

use App\Domain\Catalog\Models\Tag;
use App\Domain\Editorial\Enums\PostStatus;
use App\Domain\Identity\Models\User;
use Database\Factories\PostFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * Um texto publicável do blog.
 *
 * O corpo é Markdown, renderizado no frontend pelo mesmo pipeline das seções
 * de módulo — o que dá fórmula em KaTeX e tabela de GFM de graça, sem abrir
 * campo de HTML livre que precisaria ser sanitizado.
 */
class Post extends Model
{
    /** @use HasFactory<PostFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = [
        'author_id',
        'slug',
        'title',
        'excerpt',
        'body',
        'status',
        'published_at',
        'cover_path',
        'cover_credit',
        'cover_source',
    ];

    protected function casts(): array
    {
        return [
            'status' => PostStatus::class,
            'published_at' => 'immutable_datetime',
        ];
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /** @return BelongsToMany<Tag, $this> */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(Tag::class);
    }

    /**
     * Recorte público do blog.
     *
     * Como no catálogo, `published_at` no futuro segura o post até a data sem
     * exigir processo em background: a data é a agenda.
     *
     * @param  Builder<Post>  $query
     */
    public function scopePublished(Builder $query): void
    {
        $query->where('status', PostStatus::Published)
            ->whereNotNull('published_at')
            ->where('published_at', '<=', now());
    }

    public function isPubliclyVisible(): bool
    {
        return $this->status->isPublic()
            && $this->published_at !== null
            && $this->published_at->isPast();
    }

    /**
     * Tempo de leitura, em minutos.
     *
     * Calculado, e não guardado em coluna: valor derivado que fica no banco
     * envelhece na primeira edição que alguém faz sem lembrar de recalcular.
     *
     * 200 palavras por minuto é a média de leitura de texto corrido em tela;
     * o mínimo de 1 evita "0 min de leitura" em nota curta.
     */
    public function readingMinutes(): int
    {
        return max(1, (int) ceil(str_word_count(strip_tags($this->body)) / 200));
    }
}
