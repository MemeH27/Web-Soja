## push-self-test

Edge Function para enviar una push de prueba al usuario autenticado.

Se usa desde el frontend al activar el boton de push para validar que la
suscripcion quedo lista y que el envio funciona.

### Variables requeridas (Supabase Functions Secrets)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT` (ej: `mailto:soporte@soja.com`)

### Deploy

```bash
supabase functions deploy push-self-test
```
