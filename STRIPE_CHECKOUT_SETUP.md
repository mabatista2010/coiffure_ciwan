# Configuración de Stripe Checkout

## 🎯 Descripción

Ahora tu boutique usa **Stripe Checkout real** para procesar pagos. Los clientes serán redirigidos a la página de pago segura de Stripe donde podrán introducir sus datos de tarjeta.

## ⚙️ Configuración Requerida

### 1. Variables de Entorno

Agrega estas variables a tu archivo `.env.local`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_... # Tu clave secreta de Stripe (producción)

# Base URL for Stripe redirects
NEXT_PUBLIC_BASE_URL=http://localhost:3000 # Cambiar a tu dominio en producción

# Webhook (opcional para producción)
STRIPE_WEBHOOK_SECRET=whsec_... # Webhook secret de Stripe
```

### 2. Configurar URLs de Redirección

En tu dashboard de Stripe:
1. Ve a **Settings** > **Checkout settings**
2. Configura las URLs de redirección:
   - **Success URL**: `https://tudominio.com/boutique/checkout/success?session_id={CHECKOUT_SESSION_ID}`
   - **Cancel URL**: `https://tudominio.com/boutique/checkout`

## 🔄 Flujo de Pago

### 1. Cliente Agrega Productos al Carrito
- Navega por la boutique
- Agrega productos al carrito
- Ve el resumen del carrito

### 2. Proceder al Pago
- Completa el formulario con sus datos
- Hace clic en "Proceder al Pago"
- Es redirigido a **Stripe Checkout**

### 3. Stripe Checkout
- Página segura de Stripe
- Formulario de datos de tarjeta
- Validación automática
- Procesamiento del pago

### 4. Confirmación
- Si el pago es exitoso → Redirigido a página de éxito
- Si el pago falla → Redirigido de vuelta al checkout
- Si cancela → Redirigido de vuelta al checkout

## 🛡️ Seguridad

### ✅ Ventajas de Stripe Checkout
- **PCI Compliance**: Stripe maneja todos los datos sensibles
- **Fraude**: Detección automática de fraude
- **Validación**: Validación automática de tarjetas
- **Múltiples Métodos**: Tarjetas, Apple Pay, Google Pay, etc.

### 🔒 Datos Seguros
- Los datos de tarjeta nunca pasan por tu servidor
- Stripe maneja toda la información sensible
- Tu aplicación solo recibe confirmación del pago

## 🧪 Pruebas

### Tarjetas de Prueba (Modo Test)
Si usas `sk_test_...`:
- **Visa**: `4242424242424242`
- **Mastercard**: `5555555555554444`
- **Declinada**: `4000000000000002`

### Datos de Prueba
- **Fecha**: Cualquier fecha futura
- **CVC**: Cualquier 3 dígitos
- **Código Postal**: Cualquier código válido

## 📊 Monitoreo

### Dashboard de Stripe
1. Ve a tu [Dashboard de Stripe](https://dashboard.stripe.com/)
2. Navega a **Payments** para ver transacciones
3. **Analytics** para estadísticas de ventas

### Logs de la Aplicación
- Los logs muestran todas las operaciones de Stripe
- Errores específicos de Stripe
- Confirmaciones de pagos exitosos

## 🔧 Troubleshooting

### Error: "No se puede procesar el pago"
1. Verifica que `STRIPE_SECRET_KEY` esté configurada
2. Confirma que los productos tengan `stripe_price_id`
3. Revisa los logs del servidor

### Error: "URL de redirección inválida"
1. Verifica `NEXT_PUBLIC_BASE_URL`
2. Asegúrate de que las URLs estén configuradas en Stripe
3. Confirma que el dominio sea correcto

### Pagos no aparecen en Stripe
1. Verifica la conectividad a internet
2. Revisa los logs de la aplicación
3. Confirma que la clave de Stripe sea correcta

## 🚀 Próximos Pasos

### Mejoras Futuras
- [ ] Webhooks para confirmación automática
- [ ] Emails de confirmación automáticos
- [ ] Gestión de reembolsos
- [ ] Suscripciones recurrentes

### Configuración Avanzada
- [ ] Personalización del checkout
- [ ] Múltiples monedas
- [ ] Impuestos automáticos
- [ ] Envíos integrados

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs del servidor
2. Verifica la configuración de Stripe
3. Consulta la [documentación de Stripe](https://stripe.com/docs)
4. Contacta al soporte de Stripe si es necesario 