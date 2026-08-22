<?php

declare(strict_types=1);

namespace App\Domain\Catalog\Models;

use App\Domain\Catalog\Enums\SectionKind;
use Database\Factories\ModuleSectionFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Bloco de conteúdo textual de um módulo, em Markdown.
 *
 * O corpo interativo do módulo vem do componente React; estas seções são a
 * camada explicativa — o que o usuário lê antes, durante e depois de mexer.
 */
class ModuleSection extends Model
{
    /** @use HasFactory<ModuleSectionFactory> */
    use HasFactory;

    protected $fillable = [
        'module_id',
        'kind',
        'anchor',
        'title',
        'body',
        'meta',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'kind' => SectionKind::class,
            'meta' => 'array',
            'position' => 'integer',
        ];
    }

    /** @return BelongsTo<Module, $this> */
    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }
}
