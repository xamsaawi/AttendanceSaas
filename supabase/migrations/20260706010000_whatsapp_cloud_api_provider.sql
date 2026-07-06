-- Allow the free Meta WhatsApp Cloud API as an alternative provider to Twilio.
-- Unlike Twilio, it needs no account_sid (phone_number_id + access_token only).

alter table public.whatsapp_settings
  drop constraint whatsapp_settings_provider_check;

alter table public.whatsapp_settings
  add constraint whatsapp_settings_provider_check
  check (provider is null or provider in ('twilio', 'whatsapp_cloud_api'));
