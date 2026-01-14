-- Add receipt_message_id column to payments table
ALTER TABLE public.payments 
ADD COLUMN IF NOT EXISTS receipt_message_id text NULL;

COMMENT ON COLUMN public.payments.receipt_message_id IS 'ID del mensaje devuelto por Resend para tracking';