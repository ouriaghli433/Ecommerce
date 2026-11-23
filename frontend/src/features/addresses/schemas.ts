import { z } from 'zod';

export const addressSchema = z.object({
  full_name: z.string().trim().min(1, 'Full name is required').max(255),
  phone: z.string().trim().min(1, 'Phone number is required').max(30),
  address_line: z.string().trim().min(1, 'Address line is required').max(255),
  city: z.string().trim().min(1, 'City is required').max(100),
  postal_code: z.string().trim().max(20).optional().nullable(),
  country: z.string().trim().min(1, 'Country is required').max(100),
  is_default: z.boolean().optional(),
});

export type AddressFormValues = z.infer<typeof addressSchema>;
