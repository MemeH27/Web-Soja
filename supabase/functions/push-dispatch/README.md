## push-dispatch

Edge Function que envia Web Push para eventos de `orders`.

### Variables requeridas (Supabase Functions Secrets)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (ej: `mailto:soporte@soja.com`)
- `PUSH_WEBHOOK_SECRET` (cadena larga aleatoria)

### Deploy

```bash
supabase functions deploy push-dispatch
supabase functions deploy push-self-test
```

### SQL a ejecutar

1. `supabase/push_notifications_setup.sql`
2. `supabase/push_dispatch_trigger.sql`

Despues, en `public.push_dispatch_config`, guardar:

- `function_url`: `https://<PROJECT_REF>.functions.supabase.co/push-dispatch`
- `webhook_secret`: igual a `PUSH_WEBHOOK_SECRET`
- `enabled`: `true`
