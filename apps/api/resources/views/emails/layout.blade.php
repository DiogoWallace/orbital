{{--
    Casca de todo e-mail transacional do Orbital.

    Cliente de e-mail não é navegador: nada de CSS externo, nada de flexbox,
    nada de custom properties. Layout em tabela e estilo inline — o mesmo
    desenho dos tokens de `tokens.css`, transposto para hex porque `oklch()`
    não existe em nenhum cliente de e-mail relevante.

    Largura de 560px: o que cabe no painel de leitura do Outlook sem barra
    horizontal, e o que o Gmail no celular reduz sem quebrar.
--}}
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    {{-- Impede o modo escuro do cliente de reinverter o que já é escuro. --}}
    <meta name="color-scheme" content="dark">
    <meta name="supported-color-schemes" content="dark">
    <title>@yield('assunto', config('app.name'))</title>
</head>
<body style="margin:0; padding:0; background-color:#090e14; color:#eff2f5; -webkit-font-smoothing:antialiased;">

    {{-- Prévia que o cliente mostra ao lado do assunto na caixa de entrada.
         Sem ela, o cliente inventa uma a partir do primeiro texto visível. --}}
    <div style="display:none; max-height:0; overflow:hidden; opacity:0;">
        @yield('previa')
        {{-- Espaços invisíveis empurram o conteúdo real para fora da prévia. --}}
        &#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847; &#8199;&#65279;&#847;
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="background-color:#090e14;">
        <tr>
            <td align="center" style="padding:32px 16px 48px 16px;">

                <table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0"
                       style="width:560px; max-width:100%;">

                    {{-- Marca --}}
                    <tr>
                        <td style="padding:0 4px 20px 4px;">
                            <span style="font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace;
                                         font-size:14px; letter-spacing:0.22em; text-transform:uppercase;
                                         color:#22cde5;">Orbital</span>
                            <span style="font-family:Helvetica,Arial,sans-serif; font-size:12px;
                                         color:#747b83; padding-left:10px;">plataforma científica</span>
                        </td>
                    </tr>

                    {{-- Cartão --}}
                    <tr>
                        <td style="background-color:#131921; border:1px solid #313942; border-radius:12px;
                                   padding:32px;">
                            <h1 style="margin:0 0 16px 0; font-family:Helvetica,Arial,sans-serif;
                                       font-size:20px; line-height:1.3; font-weight:600; color:#eff2f5;">
                                @yield('titulo')
                            </h1>

                            @yield('conteudo')
                        </td>
                    </tr>

                    {{-- Rodapé --}}
                    <tr>
                        <td style="padding:24px 4px 0 4px; font-family:Helvetica,Arial,sans-serif;
                                   font-size:12px; line-height:1.6; color:#747b83;">
                            @yield('rodape')
                            <div style="margin-top:12px;">
                                {{ config('app.name') }} ·
                                <a href="{{ config('app.frontend_url') }}"
                                   style="color:#747b83; text-decoration:underline;">{{ parse_url((string) config('app.frontend_url'), PHP_URL_HOST) }}</a>
                            </div>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>

</body>
</html>
