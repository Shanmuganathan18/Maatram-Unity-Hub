import { z } from 'zod';

export const loginSchema = z.object({
  login: z.string().trim().min(1, 'Enter your email address or student ID.'),
  password: z.string().min(1, 'Enter your password.'),
  remember: z.boolean().optional(),
});

export const profileSchema = z.object({
  phone: z.string().trim().regex(/^$|^[6-9]\d{9}$/, 'Enter a valid 10-digit Indian mobile number.'),
  alternateEmail: z.string().trim().email('Enter a valid email address.').or(z.literal('')),
});

/** Builds a Zod schema from an event's configured custom questions. */
export const buildAnswersSchema = (questions) => {
  const shape = {};
  questions.forEach((q) => {
    if (q.type === 'checkbox') shape[q.id] = q.required ? z.literal(true, { errorMap: () => ({ message: 'Please confirm to continue.' }) }) : z.boolean().optional();
    else shape[q.id] = q.required ? z.string().trim().min(1, 'This question is required.') : z.string().optional();
  });
  return z.object(shape);
};

export const declineSchema = (required) => z.object({ reason: required ? z.string().trim().min(3, 'Please give a short reason for declining.') : z.string().optional() });
