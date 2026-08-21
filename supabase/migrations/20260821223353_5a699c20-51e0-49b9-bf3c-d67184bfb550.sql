update public.app_settings set setting_value = '["tiffarshi@gmail.com"]' where setting_key = 'qa_test_recipients';

insert into public.psw_profiles (id, first_name, last_name, email, is_test, vetting_status)
values ('11111111-2222-3333-4444-555555555555', 'Quinn', 'Tester', 'qa.psw+test@pswdirect.ca', true, 'approved')
on conflict (id) do update set is_test = true;

insert into public.bookings (
  id, booking_code, client_name, client_first_name, client_email, client_phone,
  client_address, patient_name, patient_address, scheduled_date, start_time, end_time,
  hours, hourly_rate, subtotal, total, service_type, status,
  is_test_data, test_target_psw_id, psw_assigned, psw_first_name, psw_assignment_version
) values (
  '22222222-3333-4444-5555-666666666666', 'CDT-QA0001', 'QA Tester', 'QA', 'tiffarshi@gmail.com', '2492884787',
  '239 Grove St E, Barrie, ON L4M 2R1', 'QA Patient', '239 Grove St E, Barrie, ON L4M 2R1',
  current_date, '10:00', '13:00', 3, 35, 105, 105, ARRAY['Companionship'], 'active',
  true, '11111111-2222-3333-4444-555555555555', '11111111-2222-3333-4444-555555555555', 'Quinn', 1
) on conflict (id) do update set psw_assignment_version = public.bookings.psw_assignment_version + 1;