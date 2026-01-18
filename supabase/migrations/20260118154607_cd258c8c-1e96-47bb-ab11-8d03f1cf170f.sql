-- Part 3: Add body column to email_logs table for care sheet read access
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS body TEXT;

-- Add is_recalled column for recall functionality
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS is_recalled BOOLEAN DEFAULT false;

-- Add recalled_at timestamp
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS recalled_at TIMESTAMP WITH TIME ZONE;

-- Add recall_reason text
ALTER TABLE public.email_logs 
ADD COLUMN IF NOT EXISTS recall_reason TEXT;