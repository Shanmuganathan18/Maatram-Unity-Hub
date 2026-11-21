import { z } from 'zod';
export const loginSchema = z.object({ email: z.string().trim().min(1, 'Enter your email address.').email('Enter a valid email address.'), password: z.string().min(1, 'Enter your password.'), remember: z.boolean().optional() });
export const profileSchema = z.object({ phone: z.string().trim().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.') });

const question = z.object({ id: z.string(), label: z.string().trim().min(3, 'Question text is required (min 3 characters).'), type: z.enum(['short', 'long', 'single', 'multiple', 'yesno']), required: z.boolean(), optionsText: z.string().optional() })
  .refine((q) => !['single', 'multiple'].includes(q.type) || (q.optionsText ?? '').split('\n').map((x) => x.trim()).filter(Boolean).length >= 2, { message: 'Add at least two options (one per line).', path: ['optionsText'] });

export const eventSchema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters.'),
  category: z.string().min(1, 'Choose a category.'),
  description: z.string().trim().min(10, 'Add a short description (min 10 characters).'),
  organizer: z.string().trim().min(2, 'Organizer is required.'),
  contact: z.string().trim().min(5, 'Contact information is required.'),
  targetInstitutionIds: z.array(z.string()).min(1, 'Select at least one institution.'),
  departments: z.array(z.string()), years: z.array(z.number()), groups: z.array(z.string()),
  date: z.string().min(1, 'Choose the event date.'),
  startTime: z.string().min(1, 'Start time is required.'), endTime: z.string().min(1, 'End time is required.'),
  responseDeadline: z.string().min(1, 'Response deadline is required.'),
  mode: z.enum(['physical', 'online']),
  venue: z.string().optional(), address: z.string().optional(), platform: z.string().optional(), link: z.string().optional(), instructions: z.string().optional(),
  capacityEnabled: z.boolean(), capacity: z.coerce.number().optional(), waitlistEnabled: z.boolean(),
  questions: z.array(question),
}).superRefine((v, ctx) => {
  if (v.startTime && v.endTime && v.endTime <= v.startTime) ctx.addIssue({ code: 'custom', path: ['endTime'], message: 'End time must be after start time.' });
  if (v.mode === 'physical' && !v.venue?.trim()) ctx.addIssue({ code: 'custom', path: ['venue'], message: 'Venue name is required for physical events.' });
  if (v.mode === 'online') { if (!v.platform?.trim()) ctx.addIssue({ code: 'custom', path: ['platform'], message: 'Platform is required.' }); if (!/^https?:\/\/\S+$/.test(v.link ?? '')) ctx.addIssue({ code: 'custom', path: ['link'], message: 'Enter a valid meeting link (https://…).' }); }
  if (v.capacityEnabled && !(v.capacity >= 1)) ctx.addIssue({ code: 'custom', path: ['capacity'], message: 'Capacity must be at least 1.' });
  if (v.date && v.responseDeadline && `${v.responseDeadline}` > `${v.date}T${v.startTime || '23:59'}`) ctx.addIssue({ code: 'custom', path: ['responseDeadline'], message: 'Response deadline must be before the event starts.' });
});
