type EmailLayoutParams = {
  title: string;
  bodyHtml: string;
  ctaLabel?: string;
  ctaUrl?: string;
};

function layout(params: EmailLayoutParams): { html: string; text: string } {
  const ctaBlock =
    params.ctaLabel && params.ctaUrl
      ? `<p style="margin:24px 0 0;"><a href="${escapeHtml(params.ctaUrl)}" style="display:inline-block;padding:12px 20px;background:#2563eb;color:#ffffff;text-decoration:none;border-radius:8px;font-weight:600;">${escapeHtml(params.ctaLabel)}</a></p>`
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
      .replace(/^[ \t]+/gm, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&'),
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
  /** Human-readable time until the appointment, e.g. "in about 24 hours". */
  leadLabel?: string;
}): { subject: string; html: string; text: string } {
  const clinic = params.clinicName
    ? `<p style="margin:12px 0 0;"><strong>Clinic:</strong><br>${escapeHtml(params.clinicName)}</p>`
    : '';
  const vet = params.veterinarianName
    ? `<p style="margin:12px 0 0;"><strong>Veterinarian:</strong><br>${escapeHtml(params.veterinarianName)}</p>`
    : '';

  const bodyHtml = `
    <p>Hi ${escapeHtml(params.userName)},</p>
    <p><strong>${escapeHtml(params.petName)}</strong> has an appointment coming up ${escapeHtml(params.leadLabel ?? 'in about 24 hours')}.</p>
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

export function buildAccountActivationEmail(params: {
  firstName: string;
  activationUrl: string;
  clinicName?: string;
}): {
  subject: string;
  html: string;
  text: string;
} {
  const clinicLine = params.clinicName
    ? `${escapeHtml(params.clinicName)} has added your pet to PetHealth.`
    : 'Your veterinary clinic has added your pet to PetHealth.';
  const bodyHtml = `
    <p>Hi ${escapeHtml(params.firstName)},</p>
    <p>${clinicLine} Activate your account to see your pet's medical records, vaccinations, medications and appointments, and to control which clinics can access them.</p>
    <p>The link is valid for 72 hours. If you did not expect this email, you can ignore it.</p>
  `;

  const { html, text } = layout({
    title: 'Activate your PetHealth account',
    bodyHtml,
    ctaLabel: 'Activate account',
    ctaUrl: params.activationUrl,
  });

  return {
    subject: 'Activate your PetHealth account',
    html,
    text,
  };
}

export function buildClinicAccessGrantedEmail(params: {
  firstName: string;
  petName: string;
  clinicName?: string | null;
  petUrl: string;
}): { subject: string; html: string; text: string } {
  const clinic = params.clinicName?.trim() || 'A veterinary clinic';
  const bodyHtml = `
    <p>Hi ${escapeHtml(params.firstName)},</p>
    <p>${escapeHtml(clinic)} now has access to ${escapeHtml(params.petName)}'s health records in PetHealth, using the one-time code you created.</p>
    <p>If this was you, there is nothing else to do. If you did not share a code with this clinic, open ${escapeHtml(params.petName)}'s page and revoke the clinic's access under Clinic access.</p>
  `;

  const { html, text } = layout({
    title: 'A clinic can now access your pet',
    bodyHtml,
    ctaLabel: 'Review clinic access',
    ctaUrl: params.petUrl,
  });

  return {
    subject: `${clinic} can now access ${params.petName}'s records`,
    html,
    text,
  };
}

export function buildPetFoundEmail(params: {
  firstName: string;
  petName: string;
  clinicName: string;
  clinicPhone?: string | null;
  clinicAddress?: string | null;
  message?: string | null;
  petUrl: string;
}): { subject: string; html: string; text: string } {
  const contact = [params.clinicPhone, params.clinicAddress]
    .map((value) => value?.trim())
    .filter(Boolean)
    .map((value) => escapeHtml(value!))
    .join('<br>');
  const bodyHtml = `
    <p>Hi ${escapeHtml(params.firstName)},</p>
    <p>${escapeHtml(params.clinicName)} scanned ${escapeHtml(params.petName)}'s microchip and found them in PetHealth. Please contact the clinic.</p>
    ${contact ? `<p style="margin:16px 0 0;"><strong>${escapeHtml(params.clinicName)}</strong><br>${contact}</p>` : ''}
    ${params.message?.trim() ? `<p style="margin:16px 0 0;"><strong>Message from the clinic:</strong><br>${escapeHtml(params.message.trim())}</p>` : ''}
    <p style="margin:16px 0 0;">The clinic did not get access to your pet's records or your contact details.</p>
  `;

  const { html, text } = layout({
    title: `${params.petName} is at a veterinary clinic`,
    bodyHtml,
    ctaLabel: 'Open PetHealth',
    ctaUrl: params.petUrl,
  });

  return {
    subject: `${params.petName} was found and is at ${params.clinicName}`,
    html,
    text,
  };
}

export function buildPasswordResetEmail(params: {
  userName: string;
  resetUrl: string;
  expiresInLabel: string;
}): { subject: string; html: string; text: string } {
  const bodyHtml = `
    <p>Hi ${escapeHtml(params.userName)},</p>
    <p>We received a request to reset your PetHealth password. Use the button below to choose a new one. The link expires in ${escapeHtml(params.expiresInLabel)} and can be used once.</p>
    <p>If you did not request this, you can ignore this email; your password will not change.</p>
  `;

  const { html, text } = layout({
    title: 'Reset your password',
    bodyHtml,
    ctaLabel: 'Reset password',
    ctaUrl: params.resetUrl,
  });

  return { subject: 'Reset your PetHealth password', html, text };
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
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function describeAppointmentLead(scheduledAt: Date, now: Date): string {
  const hours = Math.round(
    (scheduledAt.getTime() - now.getTime()) / (60 * 60 * 1000),
  );
  if (hours >= 23) {
    return 'in about 24 hours';
  }
  if (hours >= 2) {
    return `in about ${hours} hours`;
  }
  return 'soon';
}

export function formatUtcDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatUtcTime(date: Date): string {
  return date.toISOString().slice(11, 16);
}
