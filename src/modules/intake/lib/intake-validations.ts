// STRYK Intake Module Validations
import { z } from 'zod';

export const intakeFormSchema = z.object({
  // Asignación deportiva
  sport_id: z.string().min(1, 'Selecciona un deporte'),
  category_id: z.string().optional(),
  venue_id: z.string().optional(),
  plan_id: z.string().optional(),
  
  // Datos del jugador
  player_name: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .transform(val => val.trim()),
  player_birth_date: z.date({
    required_error: 'Fecha de nacimiento requerida',
  }),
  
  // Datos del tutor
  guardian_name: z.string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres')
    .transform(val => val.trim()),
  guardian_email: z.string()
    .email('Email inválido')
    .optional()
    .or(z.literal('')),
  guardian_phone: z.string()
    .min(10, 'Mínimo 10 dígitos')
    .max(15, 'Máximo 15 dígitos')
    .regex(/^[0-9]+$/, 'Solo números'),
  guardian_occupation: z.string().max(100).optional(),
  
  // Pago
  payment_method: z.enum(['efectivo', 'transferencia'], {
    required_error: 'Selecciona método de pago',
  }),
  promo_applied: z.boolean().default(false),
  promo_code: z.string().optional(),
});

export type IntakeFormValues = z.infer<typeof intakeFormSchema>;
