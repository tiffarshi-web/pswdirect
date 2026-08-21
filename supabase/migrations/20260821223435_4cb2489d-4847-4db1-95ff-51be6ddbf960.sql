insert into public.psw_profiles (id, first_name, last_name, email, is_test, vetting_status)
values ('11111111-2222-3333-4444-555555555556', 'Riley', 'Quality', 'qa.psw2+test@pswdirect.ca', true, 'approved')
on conflict (id) do nothing;

update public.bookings
set psw_assigned = '11111111-2222-3333-4444-555555555556',
    psw_first_name = 'Riley',
    psw_assignment_version = coalesce(psw_assignment_version,1) + 1
where id = '22222222-3333-4444-5555-666666666666';

select public._invoke_edge_function('send-psw-reassigned-email', jsonb_build_object('booking_id','22222222-3333-4444-5555-666666666666','force_resend',true));