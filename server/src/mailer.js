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
} = {}) {
  const enabled = Boolean(user && pass);
  const transport = enabled ? nodemailer.createTransport({
    host, port, secure: port === 465, requireTLS: port !== 465, auth: { user, pass },
    connectionTimeout: 15000, greetingTimeout: 15000, socketTimeout: 20000,
  }) : null;
  return {
    enabled,
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
