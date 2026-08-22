{{--
    Botão de ação. Tabela e não <a> com padding: o Outlook ignora padding em
    elementos inline, e o botão vira um link solto no meio do texto.

    Logo abaixo vai sempre a URL em texto — cliente corporativo que bloqueia
    botão, e leitor que desconfia de link, precisam poder ver para onde vão.
--}}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px 0 20px 0;">
    <tr>
        <td align="center" bgcolor="#22cde5" style="border-radius:8px;">
            <a href="{{ $url }}"
               style="display:inline-block; padding:13px 26px; font-family:Helvetica,Arial,sans-serif;
                      font-size:14px; font-weight:600; color:#090e14; text-decoration:none;
                      border-radius:8px;">{{ $rotulo }}</a>
        </td>
    </tr>
</table>

<p style="margin:0 0 4px 0; font-family:Helvetica,Arial,sans-serif; font-size:12px; color:#747b83;">
    Se o botão não funcionar, copie este endereço:
</p>
<p style="margin:0; font-family:'SF Mono',ui-monospace,Menlo,Consolas,monospace; font-size:12px;
          line-height:1.5; word-break:break-all;">
    <a href="{{ $url }}" style="color:#22cde5; text-decoration:none;">{{ $url }}</a>
</p>
