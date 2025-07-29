# Solución del Problema del Webhook Stripe

## 🚨 Problema Actual

Has completado un pago real en Stripe, pero el pedido no aparece en la base de datos ni en el panel administrativo. Esto indica que el webhook no se está ejecutando correctamente.

## 🔧 Solución Implementada

He implementado un **sistema de fallback** que permite crear el pedido manualmente cuando el webhook falla. Ahora, cuando completes un pago:

1. **Primera opción**: El webhook crea el pedido automáticamente (funcionamiento normal)
2. **Fallback**: Si el webhook falla, la página de éxito intenta crear el pedido manualmente

## 🛠️ Pasos para Solucionar el Problema

### 1. Verificar la Configuración del Webhook

Ve a tu **Dashboard de Stripe**:
1. Navega a **Developers** → **Webhooks**
2. Verifica que existe un webhook con:
   - **URL**: `https://tudominio.com/api/boutique/stripe/webhook`
   - **Eventos**: `checkout.session.completed`, `payment_intent.succeeded`, `payment_intent.payment_failed`
   - **Estado**: `enabled`

### 2. Configurar las Variables de Entorno

En tu archivo `.env.local`, asegúrate de tener:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... # Tu clave secreta de producción
STRIPE_WEBHOOK_SECRET=whsec_... # El secret del webhook

# Base URL
NEXT_PUBLIC_BASE_URL=https://tudominio.com
```

### 3. Obtener el Webhook Secret

1. En tu Dashboard de Stripe, ve a **Developers** → **Webhooks**
2. Encuentra tu webhook y haz clic en "Reveal signing secret"
3. Copia el secret que empieza con `whsec_`
4. Pégalo en tu archivo `.env.local` como `STRIPE_WEBHOOK_SECRET`

### 4. Usar la Página de Diagnóstico

He creado una página de diagnóstico especial. Ve a:
```
https://tudominio.com/admin/webhook-diagnostics
```

Esta página te mostrará:
- ✅ Si Stripe está configurado correctamente
- ✅ Si el webhook secret está configurado
- 📋 Lista de webhooks configurados
- 📊 Eventos recientes de Stripe
- ❌ Errores detectados

### 5. Probar el Sistema Corregido

1. **Hacer una compra de prueba**:
   - Ve a la boutique
   - Añade un producto al carrito
   - Completa el checkout
   - Usa la tarjeta de prueba: `4242 4242 4242 4242`

2. **Verificar el resultado**:
   - Deberías ver la página de éxito con los detalles del pedido
   - El pedido debe aparecer en el panel administrativo
   - Si el webhook falla, el fallback debe crear el pedido automáticamente

## 🔍 Diagnóstico Detallado

### Si el Webhook No Funciona:

1. **Verificar logs del servidor**:
   - Busca errores relacionados con el webhook
   - Verifica que la URL del webhook sea accesible

2. **Verificar configuración de Stripe**:
   - Asegúrate de usar claves de producción, no de test
   - Verifica que el webhook esté en modo "live"

3. **Verificar red**:
   - Asegúrate de que tu servidor pueda recibir webhooks de Stripe
   - Verifica que no haya firewalls bloqueando las conexiones

### Si el Fallback No Funciona:

1. **Verificar la sesión de Stripe**:
   - El fallback intenta recuperar la sesión de Stripe
   - Verifica que la sesión exista y tenga el estado "paid"

2. **Verificar permisos de base de datos**:
   - Asegúrate de que la aplicación pueda crear pedidos
   - Verifica las políticas RLS de Supabase

## 📊 Monitoreo

### Logs a Verificar:

En los logs de tu aplicación, busca:

```
✅ Webhook funcionando:
Checkout session completed: cs_...
Pedido creado exitosamente: [ID]

🔄 Fallback funcionando:
Creando pedido desde fallback para session: cs_...
Pedido creado exitosamente desde fallback: [ID]

❌ Errores:
Error verificando webhook: [error]
Error procesando webhook: [error]
```

### Verificación en Base de Datos:

```sql
-- Verificar pedidos recientes
SELECT 
    id,
    cliente_nombre,
    cliente_email,
    total,
    estado,
    stripe_session_id,
    stripe_payment_intent_id,
    created_at
FROM pedidos 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🚀 Próximos Pasos

1. **Configurar el webhook correctamente** en Stripe
2. **Verificar las variables de entorno**
3. **Usar la página de diagnóstico** para verificar la configuración
4. **Hacer una compra de prueba** para verificar que todo funciona
5. **Monitorear los logs** para asegurar que el sistema funciona correctamente

## 📞 Soporte

Si sigues teniendo problemas:

1. **Usa la página de diagnóstico** para identificar el problema específico
2. **Verifica los logs** del servidor
3. **Confirma la configuración** de Stripe
4. **Contacta soporte técnico** con los detalles del diagnóstico

## ✅ Resultado Esperado

Después de implementar estas correcciones:

- ✅ Los pedidos se crearán correctamente cuando se complete el pago
- ✅ El fallback funcionará si el webhook falla
- ✅ No habrá más pedidos "fantasma"
- ✅ El panel administrativo mostrará solo pedidos reales
- ✅ La experiencia del usuario será fluida y confiable 