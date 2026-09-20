import { buildAppointmentReminderEmail } from './email-templates';

describe('email templates', () => {
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
