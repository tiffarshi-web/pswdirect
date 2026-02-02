-- Force refresh PostgREST schema cache for live API
NOTIFY pgrst, 'reload schema';