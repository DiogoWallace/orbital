<?php

declare(strict_types=1);

namespace App\Http\Requests\V1;

use App\Domain\Community\Enums\ReportReason;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ReportCommentRequest extends FormRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'reason' => ['required', Rule::enum(ReportReason::class)],
            'detail' => ['sometimes', 'nullable', 'string', 'max:500'],
        ];
    }
}
