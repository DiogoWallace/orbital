<?php

declare(strict_types=1);

namespace App\Domain\Identity\Notifications;

use App\Domain\Identity\Support\EmailVerificationTokens;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * Confirmação do endereço de e-mail.
 *
 * Mesma mecânica do e-mail de recuperação (ADR 0009): fila, token opaco e link
 * apontando para o Next.
 */
final class VerifyEmailNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** @return array<int, int> */
    public function backoff(): array
    {
        return [10, 60, 300];
    }

    public function __construct(private readonly string $token) {}

    /** @return array<int, string> */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $url = sprintf(
            '%s/verificar-email?token=%s&email=%s',
            config('app.frontend_url'),
            $this->token,
            urlencode((string) $notifiable->email),
        );

        return (new MailMessage)
            ->subject('Confirme seu e-mail no '.config('app.name'))
            ->view('emails.verificar-email', [
                'nome' => strtok((string) $notifiable->name, ' '),
                'url' => $url,
                'minutos' => EmailVerificationTokens::EXPIRE_MINUTES,
            ]);
    }
}
