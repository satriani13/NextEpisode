import nodemailer from 'nodemailer';

// Envío por SMTP (p. ej. Gmail con contraseña de aplicación). Sin SMTP_USER/SMTP_PASS no se envía nada:
// en desarrollo el código se imprime en consola para poder probar el flujo.
export function createMailer({
  host = process.env.SMTP_HOST || 'smtp.gmail.com',
  // 587 + STARTTLS: el VPS (Hetzner) bloquea los puertos de salida 25 y 465.
  port = Number(process.env.SMTP_PORT || 587),
  user = process.env.SMTP_USER,
  pass = process.env.SMTP_PASS,
  from = process.env.MAIL_FROM || process.env.SMTP_USER,
  suggestionsTo = process.env.SUGGESTIONS_TO || 'julio.pajuelo@gmail.com',
} = {}) {
  const enabled = Boolean(user && pass);
  const transport = enabled ? nodemailer.createTransport({
    host, port, secure: port === 465, requireTLS: port !== 465, auth: { user, pass },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
  }) : null;
  return {
    enabled,
    // Avisa de una sugerencia nueva con el aspecto de la app (cine nocturno + acento ember). Devuelve true si se envió.
    async sendSuggestion({ username, email, body, createdAt }) {
      if (!enabled) {
        console.warn('SMTP no configurado: no se envía la sugerencia');
        return false;
      }
      const { subject, text, html } = suggestionEmail({ username, email, body, createdAt });
      await transport.sendMail({ from: `NextEpisode <${from}>`, to: suggestionsTo, replyTo: email, subject, text, html });
      return true;
    },
    async sendResetCode({ to, username, code }) {
      const pretty = `${code.slice(0, 4)}-${code.slice(4)}`;
      if (!enabled) {
        console.warn('SMTP no configurado: no se envía el correo de recuperación');
        if (process.env.NODE_ENV !== 'production') console.log(`[dev] código de ${to}: ${pretty}`);
        return;
      }
      await transport.sendMail({
        from: `NextEpisode <${from}>`,
        to,
        subject: 'Tu código para recuperar la contraseña de NextEpisode',
        text: `Hola ${username},\n\nTu código de recuperación es: ${pretty}\n\nCaduca en 1 hora. Introdúcelo en la app junto con tu nueva contraseña.\nSi no lo has pedido tú, ignora este correo: tu contraseña no ha cambiado.\n`,
        html: `<p>Hola ${username},</p><p>Tu código de recuperación es:</p><p style="font-size:28px;letter-spacing:4px;font-weight:700">${pretty}</p><p>Caduca en 1 hora. Introdúcelo en la app junto con tu nueva contraseña.</p><p style="color:#666">Si no lo has pedido tú, ignora este correo: tu contraseña no ha cambiado.</p>`,
      });
    },
  };
}

const esc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/\n/g, '<br>');

// createdAt: 'YYYY-MM-DD HH:MM:SS' (UTC, como lo guarda SQLite).
export function suggestionEmail({ username, email, body, createdAt }) {
  const when = new Date(`${createdAt.replace(' ', 'T')}Z`);
  const date = new Intl.DateTimeFormat('es-ES', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Madrid' }).format(when);
  const subject = `Sugerencia de ${username} para NextEpisode`;
  const text = `Nueva sugerencia para NextEpisode\n\nUsuario: ${username} <${email}>\nFecha: ${date}\n\n${body}\n`;
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="color-scheme" content="dark"></head>
<body style="margin:0;padding:0;background:#0B0B10">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0B0B10"><tr><td align="center" style="padding:32px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:#F5F5F7">
    <tr><td style="padding:0 4px 18px;font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#FF6B3D;font-weight:700">NextEpisode &middot; Sugerencia</td></tr>
    <tr><td style="padding:0 4px 22px;font-size:30px;line-height:1.15;font-weight:700;letter-spacing:-0.5px">Una idea para mejorar la app</td></tr>
    <tr><td style="background:#14141C;border:1px solid #2A2A36;border-radius:24px;padding:24px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td width="48" valign="top"><div style="width:44px;height:44px;line-height:44px;text-align:center;border-radius:22px;background:#2A1710;border:1px solid #FF6B3D;color:#FF6B3D;font-size:18px;font-weight:700">${esc(username[0].toUpperCase())}</div></td>
        <td valign="middle" style="padding-left:12px"><div style="font-size:16px;font-weight:600;color:#F5F5F7">${esc(username)}</div><div style="font-size:13px;color:#8F8FA3">${esc(email)}</div></td>
        <td align="right" valign="middle" style="font-size:13px;color:#BDBDCB">${esc(date)}</td>
      </tr></table>
      <div style="height:1px;background:#2A2A36;margin:20px 0"></div>
      <div style="font-size:16px;line-height:1.6;color:#F5F5F7">${esc(body)}</div>
    </td></tr>
    <tr><td style="padding:18px 4px 0;font-size:12px;color:#8F8FA3">Responde a este correo para contestar directamente al usuario.</td></tr>
  </table>
</td></tr></table></body></html>`;
  return { subject, text, html };
}
