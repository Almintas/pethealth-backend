import {
  buildAccountActivationEmail,
  buildAppointmentReminderEmail,
  buildPasswordResetEmail,
  describeAppointmentLead,
} from './email-templates';

describe('email templates', () => {
  it('describes how far away the appointment is', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const at = (hours: number) => new Date(now.getTime() + hours * 3_600_000);

    expect(describeAppointmentLead(at(24), now)).toBe('in about 24 hours');
    expect(describeAppointmentLead(at(5), now)).toBe('in about 5 hours');
    expect(describeAppointmentLead(at(0.5), now)).toBe('soon');
  });

  it('decodes HTML entities in the plain-text body', () => {
    const email = buildAppointmentReminderEmail({
      userName: 'Tom & Jerry',
      petName: 'Milo',
      dateLabel: '2026-01-01',
      timeLabel: '10:00',
      type: 'checkup',
      viewUrl: 'https://app.example.com/pets/1',
      leadLabel: 'in about 5 hours',
    });

    expect(email.text).toContain('Hi Tom & Jerry,');
    expect(email.text).toContain('in about 5 hours');
    expect(email.html).toContain('Tom &amp; Jerry');
  });

  it('builds password reset and account activation emails', () => {
    const reset = buildPasswordResetEmail({
      userName: 'Jane',
      resetUrl: 'https://app.example.com/reset-password?token=abc',
      expiresInLabel: '1 hour',
    });
    const activation = buildAccountActivationEmail({
      firstName: 'Jane',
      activationUrl: 'https://app.example.com/activate-account?token=abc',
    });

    expect(reset.text).toContain('reset-password?token=abc');
    expect(activation.subject).toContain('Activate');
  });

  it('builds appointment reminder subject and text body', () => {
    const email = buildAppointmentReminderEmail({
      userName: 'Jane Doe',
      petName: 'Milo',
      dateLabel: '2026-09-25',
      timeLabel: '15:00',
      type: 'Checkup',
      viewUrl: 'https://app.example.com/pets/1',
    });

    expect(email.subject).toBe('Appointment reminder for Milo');
    expect(email.text).toContain('Jane Doe');
    expect(email.text).toContain('https://app.example.com/pets/1');
    expect(email.html).toContain('Milo');
  });
});
