@extends('emails.layout')

@section('assunto', 'Confirme seu e-mail')
@section('previa', 'Um clique e sua conta está confirmada.')
@section('titulo', 'Confirme seu e-mail')

@section('conteudo')
    <p style="margin:0 0 16px 0; font-family:Helvetica,Arial,sans-serif; font-size:15px;
              line-height:1.65; color:#a8afb8;">
        Bem-vindo ao Orbital, {{ $nome }}. Falta um passo: confirmar que este endereço
        é seu. Depois disso você pode salvar execuções de simulação e criar projetos.
    </p>

    @include('emails.partials.botao', ['url' => $url, 'rotulo' => 'Confirmar meu e-mail'])

    <hr style="border:0; border-top:1px solid #313942; margin:28px 0 20px 0;">

    <p style="margin:0 0 12px 0; font-family:Helvetica,Arial,sans-serif; font-size:13px;
              line-height:1.65; color:#747b83;">
        O link vale por <strong style="color:#a8afb8;">{{ $minutos }} minutos</strong>. Se
        expirar, dá para pedir outro pelo aviso que aparece no topo da plataforma.
    </p>

    <p style="margin:0; font-family:Helvetica,Arial,sans-serif; font-size:13px;
              line-height:1.65; color:#747b83;">
        Se você não criou conta no Orbital, ignore esta mensagem — sem a confirmação,
        a conta não faz nada com o seu endereço.
    </p>
@endsection

@section('rodape')
    Você recebeu este e-mail porque ele foi usado em um cadastro no Orbital.
@endsection
