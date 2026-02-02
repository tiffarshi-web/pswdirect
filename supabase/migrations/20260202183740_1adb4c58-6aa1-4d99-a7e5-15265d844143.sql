-- Refresh PostgREST schema cache to fix "relation does not exist" errors
NOTIFY pgrst, 'reload schema';