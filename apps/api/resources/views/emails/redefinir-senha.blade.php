@extends('emails.layout')

@section('assunto', 'Redefinir sua senha')
@section('previa', 'O link vale por ' . $minutos . ' minutos.')
@section('titulo', 'Redefinir sua senha')

@section('conteudo')
    <p style="margin:0 0 16px 0; font-family:Helvetica,Arial,sans-serif; font-size:15px;
              line-height:1.65; color:#a8afb8;">
        Olá, {{ $nome }} — alguém pediu uma nova senha para a conta ligada a este
        endereço. Se foi você, o botão abaixo abre a página para escolher a senha nova.
    </p>

    @include('emails.partials.botao', ['url' => $url, 'rotulo' => 'Escolher nova senha'])

    <hr style="border:0; border-top:1px solid #313942; margin:28px 0 20px 0;">

    <p style="margin:0 0 12px 0; font-family:Helvetica,Arial,sans-serif; font-size:13px;
              line-height:1.65; color:#747b83;">
        O link vale por <strong style="color:#a8afb8;">{{ $minutos }} minutos</strong> e só pode
        ser usado uma vez.
    </p>

    <p style="margin:0; font-family:Helvetica,Arial,sans-serif; font-size:13px;
              line-height:1.65; color:#747b83;">
        Se não foi você que pediu, não precisa fazer nada: sem o link, a senha atual
        continua valendo. Ao redefinir, todas as sessões abertas são encerradas.
    </p>
@endsection

@section('rodape')
    Você recebeu este e-mail porque ele está cadastrado no Orbital.
@endsection
