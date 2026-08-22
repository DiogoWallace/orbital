<?php

declare(strict_types=1);

namespace App\Domain\Identity\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

/**
 * O e-mail de recuperação de senha.
 *
 * Vai para a fila: SMTP é rede, e rede é lenta e falha. Enfileirar mantém o
 * tempo de resposta do endpoint independente do provedor de e-mail — e, com
 * `tries`, uma indisponibilidade momentânea não custa o pedido do usuário.
 *
 * O link aponta para o frontend, nunca para a API: quem clica é uma pessoa.
 * O Next recebe o token e o repassa à API na hora de trocar a senha.
 */
final class ResetPasswordNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;

    /** Espera crescente entre tentativas, para não martelar um provedor caído. */
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
            '%s/redefinir-senha?token=%s&email=%s',
            config('app.frontend_url'),
            $this->token,
            urlencode($notifiable->getEmailForPasswordReset()),
        );

        return (new MailMessage)
            ->subject('Redefinir sua senha no '.config('app.name'))
            ->view('emails.redefinir-senha', [
                'nome' => strtok((string) $notifiable->name, ' '),
                'url' => $url,
                'minutos' => (int) config('auth.passwords.'.config('auth.defaults.passwords').'.expire', 60),
            ]);
    }
}
