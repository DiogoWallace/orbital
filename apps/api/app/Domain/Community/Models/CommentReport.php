<?php

declare(strict_types=1);

namespace App\Domain\Community\Models;

use App\Domain\Community\Enums\ReportReason;
use App\Domain\Identity\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CommentReport extends Model
{
    protected $fillable = ['comment_id', 'user_id', 'reason', 'detail'];

    protected function casts(): array
    {
        return [
            'reason' => ReportReason::class,
            'reviewed_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<Comment, $this> */
    public function comment(): BelongsTo
    {
        return $this->belongsTo(Comment::class);
    }

    /** @return BelongsTo<User, $this> */
    public function reporter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
