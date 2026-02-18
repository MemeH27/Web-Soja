-- Limpiar todas las suscripciones push existentes.
-- Las VAPID keys cambiaron, así que todas las suscripciones anteriores son inválidas.
-- Los usuarios deben volver a activar las push notifications en sus dispositivos.

delete from public.push_subscriptions;

-- Verificar que quedó vacía
select count(*) as suscripciones_restantes from public.push_subscriptions;
