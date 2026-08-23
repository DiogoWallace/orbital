<?php

declare(strict_types=1);

namespace App\Domain\Community\Models;

use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class Like extends Model
{
    protected $fillable = ['user_id', 'likeable_type', 'likeable_id'];

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /** @return MorphTo<Model, $this> */
    public function likeable(): MorphTo
    {
        return $this->morphTo();
    }
}
