type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export async function sendAppEmail({ to, subject, html, text }: SendEmailArgs) {
  const apiKey = process.env.RESEND_API_KEY ?? "";
  const from = process.env.EMAIL_FROM ?? "";

  if (!apiKey || !from) {
    return { sent: false as const, skipped: true as const, reason: "email_not_configured" };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject,
      html,
      text,
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Failed to send email via Resend", response.status, detail);
    return { sent: false as const, skipped: false as const, reason: "send_failed" };
  }

  return { sent: true as const, skipped: false as const };
}

export function buildBookingConfirmationEmail(input: {
  customerName: string | null;
  serviceName: string;
  workerName: string | null;
  startAt: string;
  endAt: string;
  myBookingsUrl: string;
  calendarUrl: string;
}) {
  const start = new Date(input.startAt);
  const end = new Date(input.endAt);
  const when = `${start.toLocaleString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })} – ${end.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;

  const greeting = input.customerName?.trim() || "Pelanggan";
  const subject = `Konfirmasi booking: ${input.serviceName}`;
  const text = [
    `Halo ${greeting},`,
    "",
    "Pembayaran kamu sudah diterima. Booking dikonfirmasi.",
    `Layanan: ${input.serviceName}`,
    input.workerName ? `Worker: ${input.workerName}` : null,
    `Waktu: ${when}`,
    "",
    `Lihat booking: ${input.myBookingsUrl}`,
    `Tambah ke kalender: ${input.calendarUrl}`,
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#18181b">
      <p>Halo ${greeting},</p>
      <p>Pembayaran kamu sudah diterima. Booking dikonfirmasi.</p>
      <ul>
        <li><strong>Layanan:</strong> ${input.serviceName}</li>
        ${input.workerName ? `<li><strong>Worker:</strong> ${input.workerName}</li>` : ""}
        <li><strong>Waktu:</strong> ${when}</li>
      </ul>
      <p>
        <a href="${input.myBookingsUrl}">Lihat booking</a>
        &nbsp;·&nbsp;
        <a href="${input.calendarUrl}">Tambah ke kalender</a>
      </p>
    </div>
  `;

  return { subject, text, html };
}
