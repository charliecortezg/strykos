-- Add sport_id to plans table to link plans with specific sports
ALTER TABLE public.plans 
ADD COLUMN sport_id uuid REFERENCES public.sports(id);

-- Create index for better query performance
CREATE INDEX idx_plans_sport_id ON public.plans(sport_id);