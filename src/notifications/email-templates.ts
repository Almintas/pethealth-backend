type EmailLayoutParams = {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

function layout(params: EmailLayoutParams): { html: string; text: string } {
  const ctaBlock =
    params.ctaLabel && params.ctaUrl
      ? `<p style="margin:24px 0 0;"><a href="${params.ctaUrl}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">${params.ctaLabel}</a></p>`
      : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Segoe UI,system-ui,sans-serif;color:#172033;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="max-width:520px;background:#ffffff;border:1px solid #dce3ea;border-radius:12px;padding:32px 28px;">
          <tr><td style="font-size:20px;font-weight:700;color:#2563eb;padding-bottom:8px;">PetHealth</td></tr>
          <tr><td style="font-size:22px;font-weight:700;padding-bottom:16px;">${params.title}</td></tr>
          <tr><td style="font-size:15px;line-height:1.6;color:#334155;">${params.bodyHtml}</td></tr>
          <tr><td>${ctaBlock}</td></tr>
          <tr><td style="padding-top:28px;font-size:12px;color:#94a3b8;">PetHealth</td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textParts = [
    'PetHealth',
    '',
    params.title,
    '',
    params.bodyHtml
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim(),
  ];

  if (params.ctaLabel && params.ctaUrl) {
    textParts.push('', `${params.ctaLabel}: ${params.ctaUrl}`);
  }

  textParts.push('', 'PetHealth');

  return { html, text: textParts.join('\n') };
}

export function buildAppointmentReminderEmail(params: {
  userName: string;
  petName: string;
  dateLabel: string;
  timeLabel: string;
  type: string;
  clinicName?: string;
  veterinarianName?: string;
  viewUrl: string;
}): { subject: string; html: string; text: string } {
  const clinic = params.clinicName
    ? `<p style="margin:12px 0 0;"><strong>Clinic:</strong><br>${escapeHtml(params.clinicName)}</p>`
    : '';
  const vet = params.veterinarianName
    ? `<p style="margin:12px 0 0;"><strong>Veterinarian:</strong><br>${escapeHtml(params.veterinarianName)}</p>`
    : '';

  const bodyHtml = `
    <p>Hi ${escapeHtml(params.userName)},</p>
    <p><strong>${escapeHtml(params.petName)}</strong> has an appointment coming up in about 24 hours.</p>
    <p style="margin:16px 0 0;"><strong>Date:</strong><br>${escapeHtml(params.dateLabel)}</p>
    <p style="margin:12px 0 0;"><strong>Time:</strong><br>${escapeHtml(params.timeLabel)} (UTC)</p>
    <p style="margin:12px 0 0;"><strong>Type:</strong><br>${escapeHtml(params.type)}</p>
    ${clinic}
    ${vet}
  `;

  const { html, text } = layout({
    title: 'Upcoming appointment',
    bodyHtml,
    ctaLabel: 'View appointment',
    ctaUrl: params.viewUrl,
  });

  return {
    subject: `Appointment reminder for ${params.petName}`,
    html,
    text,
  };
}

export function buildMedicationReminderEmail(params: {
  userName: string;
  petName: string;
  medicationName: string;
  timeLabel: string;
  viewUrl: string;
}): { subject: string; html: string; text: string } {
  const bodyHtml = `
    <p>Hi ${escapeHtml(params.userName)},</p>
    <p>A medication reminder is due for <strong>${escapeHtml(params.petName)}</strong>.</p>
    <p style="margin:16px 0 0;"><strong>Medication:</strong><br>${escapeHtml(params.medicationName)}</p>
    <p style="margin:12px 0 0;"><strong>Time:</strong><br>${escapeHtml(params.timeLabel)} (UTC)</p>
  `;

  const { html, text } = layout({
    title: 'Medication reminder',
    bodyHtml,
    ctaLabel: 'View reminder',
    ctaUrl: params.viewUrl,
  });

  return {
    subject: `Medication reminder for ${params.petName}`,
    html,
    text,
  };
}

export function buildVaccinationReminderEmail(params: {
  userName: string;
  petName: string;
  vaccinationName: string;
  dateLabel: string;
  viewUrl: string;
}): { subject: string; html: string; text: string } {
  const bodyHtml = `
    <p>Hi ${escapeHtml(params.userName)},</p>
    <p><strong>${escapeHtml(params.petName)}</strong> has an upcoming vaccination reminder.</p>
    <p style="margin:16px 0 0;"><strong>Vaccination:</strong><br>${escapeHtml(params.vaccinationName)}</p>
    <p style="margin:12px 0 0;"><strong>Date:</strong><br>${escapeHtml(params.dateLabel)} (UTC)</p>
  `;

  const { html, text } = layout({
    title: 'Vaccination reminder',
    bodyHtml,
    ctaLabel: 'View reminder',
    ctaUrl: params.viewUrl,
  });

  return {
    subject: `Vaccination reminder for ${params.petName}`,
    html,
    text,
  };
}

export function buildTestEmail(params: { userName: string }): {
  subject: string;
  html: string;
  text: string;
} {
  const bodyHtml = `
    <p>Hi ${escapeHtml(params.userName)},</p>
    <p>This is a test email from your PetHealth development environment. If you received this message, Resend is configured correctly.</p>
  `;

  const { html, text } = layout({
    title: 'Test email',
    bodyHtml,
  });

  return {
    subject: 'PetHealth test email',
    html,
    text,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatUtcTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}
