
-- Part 1: Add age_group to categories (source of truth for age group)
ALTER TABLE public.categories ADD COLUMN age_group TEXT NOT NULL DEFAULT '8-9';

-- Part 2: Add insights_json to evaluations (structured coach comment analysis)
ALTER TABLE public.evaluations ADD COLUMN insights_json JSONB DEFAULT NULL;
