# Integración Automática con Stripe

## 🎯 Descripción

La boutique ahora incluye integración automática con Stripe. Cuando crees, edites o elimines productos desde el panel administrativo, estos cambios se sincronizarán automáticamente con tu cuenta de Stripe.

## ⚙️ Configuración Requerida

### 1. Variable de Entorno

Agrega tu clave secreta de Stripe al archivo `.env.local`:

```bash
STRIPE_SECRET_KEY=sk_live_... # Tu clave secreta de Stripe (producción)
```

### 2. Obtener la Clave Secreta de Stripe

1. Ve a tu [Dashboard de Stripe](https://dashboard.stripe.com/)
2. Navega a **Developers** > **API keys**
3. Copia la **Secret key**:
   - `sk_test_...` para modo test (desarrollo)
   - `sk_live_...` para modo producción (recomendado para tienda real)
4. Pégala en tu archivo `.env.local`

## 🔄 Funcionalidades de Sincronización

### ✅ Crear Producto
- Se crea automáticamente en Stripe
- Se genera un precio asociado
- Se guardan los IDs de Stripe en la base de datos

### ✅ Editar Producto
- Se actualiza la información en Stripe
- Si cambia el precio, se crea un nuevo precio
- Se mantiene la sincronización

### ✅ Eliminar Producto
- Se elimina automáticamente de Stripe
- Se limpia la base de datos

## 🎨 Indicadores Visuales

### En el Panel Administrativo
- **Verde**: Producto sincronizado con Stripe
- **Amarillo**: Pendiente de sincronizar
- **Información**: Banner explicativo sobre la sincronización

### En la Lista de Productos
- Cada producto muestra su estado de sincronización
- Indicadores visuales con colores y animaciones

## 🛡️ Manejo de Errores

### Si Fallan las APIs de Stripe
- Se muestra un mensaje de error específico
- Se intenta limpiar productos creados parcialmente
- La aplicación continúa funcionando

### Logs de Consola
- Se registran todas las operaciones de Stripe
- Fácil debugging en caso de problemas

## 📋 Verificación

### Verificar Productos en Stripe
1. Ve a tu [Dashboard de Stripe](https://dashboard.stripe.com/)
2. Navega a **Products**
3. Verifica que los productos aparezcan correctamente

### Verificar Precios
1. En cada producto, verifica que tenga un precio asociado
2. Los precios están en EUR (euros)
3. Los montos están en centavos (ej: 2599 = 25.99€)

## 🚀 Próximos Pasos

### Mejoras Futuras
- [ ] Sincronización de inventario en tiempo real
- [ ] Webhooks para actualizaciones automáticas
- [ ] Gestión de descuentos y cupones
- [ ] Sincronización de imágenes de productos

### Configuración Avanzada
- [ ] Configuración de impuestos
- [ ] Gestión de variantes de productos
- [ ] Integración con envíos

## 🔧 Troubleshooting

### Error: "Error al crear producto en Stripe"
1. Verifica que `STRIPE_SECRET_KEY` esté configurada
2. Asegúrate de que la clave sea válida (`sk_live_...` para producción)
3. Verifica la conectividad a internet

### Productos no aparecen en Stripe
1. Revisa los logs del servidor
2. Verifica que no haya errores de red
3. Confirma que la clave de Stripe sea correcta

### Precios incorrectos
1. Los precios se convierten automáticamente a centavos
2. Verifica que el precio en la base de datos sea correcto
3. Revisa la configuración de moneda (EUR)

## 📞 Soporte

Si tienes problemas con la integración:
1. Revisa los logs del servidor
2. Verifica la configuración de variables de entorno
3. Confirma que tu cuenta de Stripe esté activa 