
-- Delete test payroll entries (test PSW IDs)
DELETE FROM public.payroll_entries
WHERE psw_id LIKE 'test-%';

-- Delete test bookings (test email pattern)
DELETE FROM public.bookings
WHERE client_email LIKE '%@test.com';

-- Delete stale DECLINED unserved orders with no client info
DELETE FROM public.unserved_orders
WHERE status = 'DECLINED';
