import "server-only";

type SendPasswordResetEmailInput = {
  toEmail: string;
  userName: string;
  resetUrl: string;
  expiresInMinutes: number;
};

/**
 * Manda email com link de reset. Se RESEND_API_KEY não estiver setada,
 * só loga (útil em dev) — fluxo NÃO quebra, dev pega o link no console.
 */
export async function sendPasswordResetEmail(
  payload: SendPasswordResetEmailInput,
): Promise<void> {
  const subject = "Redefinir sua senha — Lustro";
  const firstName = payload.userName.split(" ")[0] ?? payload.userName;

  const text =
    `Oi ${firstName},\n\n` +
    `Recebemos um pedido pra redefinir a senha da sua conta Lustro.\n\n` +
    `Acesse o link abaixo pra escolher uma nova senha (válido por ${payload.expiresInMinutes} minutos):\n\n` +
    `${payload.resetUrl}\n\n` +
    `Se você NÃO pediu isso, pode ignorar esse email — sua senha continua a mesma.\n\n` +
    `— Lustro`;

  if (!process.env.RESEND_API_KEY) {
    console.warn(
      `[mock-email] password-reset → ${payload.toEmail}\n  ${subject}\n${text}`,
    );
    return;
  }

  const from = process.env.RESEND_FROM ?? "onboarding@resend.dev";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: payload.toEmail,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend ${res.status}: ${body.slice(0, 200)}`);
  }
}
