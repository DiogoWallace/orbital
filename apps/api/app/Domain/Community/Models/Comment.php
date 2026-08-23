<?php

declare(strict_types=1);

namespace App\Domain\Community\Models;

use App\Domain\Community\Enums\CommentStatus;
use App\Domain\Editorial\Models\Post;
use App\Domain\Identity\Models\User;
use Database\Factories\CommentFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\MorphMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Comment extends Model
{
    /** @use HasFactory<CommentFactory> */
    use HasFactory;

    use SoftDeletes;

    protected $fillable = ['post_id', 'user_id', 'parent_id', 'body'];

    /**
     * O mesmo default da coluna, repetido aqui de propósito.
     *
     * Default no banco só existe depois do INSERT: o objeto recém-criado volta
     * com `status` nulo até alguém recarregá-lo, e o recurso que serializa a
     * resposta do POST quebra ao ler o enum. Declarar dos dois lados custa uma
     * linha e evita um `refresh()` a cada criação.
     */
    protected $attributes = ['status' => 'visible'];

    protected function casts(): array
    {
        return [
            'status' => CommentStatus::class,
            'edited_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<Post, $this> */
    public function post(): BelongsTo
    {
        return $this->belongsTo(Post::class);
    }

    /** @return BelongsTo<User, $this> */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /** @return BelongsTo<Comment, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<Comment, $this> */
    public function replies(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id')->oldest();
    }

    /** @return MorphMany<Like, $this> */
    public function likes(): MorphMany
    {
        return $this->morphMany(Like::class, 'likeable');
    }

    /** @return HasMany<CommentReport, $this> */
    public function reports(): HasMany
    {
        return $this->hasMany(CommentReport::class);
    }

    /**
     * O fio como o público vê.
     *
     * Comentário oculto continua no banco, mas some da leitura. O registro é
     * preservado porque apagar destruiria o contexto das respostas que vieram
     * depois — e porque moderação sem histórico não é auditável.
     *
     * @param  Builder<Comment>  $query
     */
    public function scopeVisible(Builder $query): void
    {
        $query->where('status', CommentStatus::Visible);
    }

    public function isRoot(): bool
    {
        return $this->parent_id === null;
    }

    public function wasEdited(): bool
    {
        return $this->edited_at !== null;
    }
}
