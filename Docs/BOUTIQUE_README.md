# Boutique Coiffure Ciwan - Documentación

## Descripción General

La sección de boutique online permite a los clientes comprar productos relacionados con el cuidado del cabello directamente desde el sitio web de Coiffure Ciwan. La boutique está integrada con Stripe para el procesamiento de pagos y utiliza Supabase para el almacenamiento de datos.

## Funcionalidades Implementadas

### 🛍️ Frontend del Cliente

#### Página Principal de la Boutique (`/boutique`)
- **Diseño Responsive**: Adaptado para móviles, tablets y desktop
- **Filtrado por Categorías**: Productos organizados por categorías (Productos Cabello, Kits, Accesorios)
- **Productos Destacados**: Sección especial para productos promocionales
- **Carrito de Compras**: Sistema completo de carrito con persistencia
- **Animaciones**: Efectos visuales con Framer Motion

#### Carrito de Compras
- **Gestión de Items**: Añadir, eliminar y modificar cantidades
- **Persistencia**: Los items se mantienen durante la sesión
- **Cálculo Automático**: Total y número de items actualizados en tiempo real
- **Interfaz Intuitiva**: Panel lateral deslizable con animaciones

#### Proceso de Checkout
- **Formulario de Cliente**: Captura de información personal y de envío
- **Resumen del Pedido**: Vista previa de todos los items y total
- **Integración Stripe**: Redirección a Stripe Checkout para el pago
- **Página de Éxito**: Confirmación del pedido con detalles

### 🔧 Panel de Administración

#### Gestión de Productos (`/admin/boutique`)
- **CRUD Completo**: Crear, leer, actualizar y eliminar productos
- **Gestión de Stock**: Control de inventario
- **Productos Destacados**: Marcar productos para la sección destacada
- **Categorización**: Organización por categorías
- **Estados**: Activar/desactivar productos
- **Ordenamiento**: Control del orden de visualización

### 🗄️ Base de Datos

#### Tablas Principales
```sql
-- Productos
productos (id, nombre, descripcion, precio, precio_original, stock, categoria, imagen_url, stripe_product_id, stripe_price_id, activo, destacado, orden, created_at, updated_at)

-- Pedidos
pedidos (id, cliente_nombre, cliente_email, cliente_telefono, cliente_direccion, total, estado, stripe_payment_intent_id, stripe_session_id, notas, created_at, updated_at)

-- Items de Pedido
items_pedido (id, pedido_id, producto_id, cantidad, precio_unitario, subtotal, created_at)

-- Categorías
categorias_productos (id, nombre, descripcion, imagen_url, orden, activa, created_at)

-- Carrito (Sesiones)
carrito_sesiones (id, session_id, cliente_email, created_at, updated_at)
items_carrito (id, carrito_id, producto_id, cantidad, created_at, updated_at)
```

### 🔌 APIs Implementadas

#### `/api/boutique/productos`
- **GET**: Obtener todos los productos activos
- **POST**: Crear nuevo producto

#### `/api/boutique/productos/[id]`
- **GET**: Obtener producto específico
- **PUT**: Actualizar producto
- **DELETE**: Eliminar producto

#### `/api/boutique/stripe`
- **POST**: Crear sesión de pago con Stripe

#### `/api/boutique/checkout`
- **POST**: Procesar checkout (versión básica)

## Integración con Stripe

### Productos Creados
- **Gel para Cabello Premium**: 25.99€ (ID: prod_SlTHjQcCx2TBgN)
- **Kit de Peinado Profesional**: 45.00€ (ID: prod_SlTH3ECpCtqayN)

### Flujo de Pago
1. Cliente añade productos al carrito
2. Completa información personal en checkout
3. Se crea sesión de Stripe con los items
4. Cliente es redirigido a Stripe Checkout
5. Después del pago exitoso, se actualiza el estado del pedido

## Estructura de Archivos

```
src/
├── app/
│   ├── boutique/
│   │   ├── page.tsx                    # Página principal de la boutique
│   │   └── checkout/
│   │       ├── page.tsx                # Página de checkout
│   │       └── success/
│   │           └── page.tsx            # Página de éxito
│   └── admin/
│       └── boutique/
│           └── page.tsx                # Gestión de productos
├── components/
│   └── boutique/
│       ├── Carrito.tsx                 # Componente del carrito
│       ├── CarritoContext.tsx          # Contexto del carrito
│       └── CarritoButton.tsx           # Botón del carrito
└── api/
    └── boutique/
        ├── productos/
        │   ├── route.ts                # API productos
        │   └── [id]/
        │       └── route.ts            # API producto individual
        ├── stripe/
        │   └── route.ts                # API Stripe
        └── checkout/
            └── route.ts                # API checkout
```

## Configuración Requerida

### Variables de Entorno
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_BASE_URL=your_base_url
```

### Dependencias
```json
{
  "lucide-react": "^0.263.1",
  "framer-motion": "^12.4.10"
}
```

## Instalación y Configuración

### 1. Crear Tablas en Supabase
Ejecutar el archivo `boutique_tables.sql` en la consola de Supabase.

### 2. Configurar Stripe
- Crear productos en Stripe Dashboard
- Actualizar `stripe_product_id` y `stripe_price_id` en la tabla productos

### 3. Configurar Variables de Entorno
Añadir las variables necesarias en `.env.local`

### 4. Instalar Dependencias
```bash
npm install lucide-react
```

## Uso

### Para Clientes
1. Navegar a `/boutique`
2. Explorar productos por categorías
3. Añadir productos al carrito
4. Completar checkout
5. Realizar pago con Stripe

### Para Administradores
1. Acceder a `/admin/boutique`
2. Gestionar productos (crear, editar, eliminar)
3. Controlar stock y precios
4. Marcar productos como destacados

## Características Técnicas

### Frontend
- **Next.js 15** con App Router
- **TypeScript** para tipado estático
- **TailwindCSS** para estilos
- **Framer Motion** para animaciones
- **React Context** para estado global del carrito

### Backend
- **Next.js API Routes** para endpoints
- **Supabase** para base de datos y autenticación
- **Stripe** para procesamiento de pagos

### Base de Datos
- **PostgreSQL** a través de Supabase
- **RLS (Row Level Security)** para seguridad
- **Índices optimizados** para rendimiento

## Próximas Mejoras

### Funcionalidades Planificadas
- [ ] Integración completa con Stripe SDK
- [ ] Notificaciones por email
- [ ] Sistema de cupones y descuentos
- [ ] Gestión de inventario avanzada
- [ ] Reportes de ventas
- [ ] Sistema de reseñas de productos
- [ ] Wishlist de clientes
- [ ] Productos relacionados
- [ ] Búsqueda avanzada
- [ ] Filtros por precio y características

### Mejoras Técnicas
- [ ] Optimización de imágenes
- [ ] Cache de productos
- [ ] PWA para la boutique
- [ ] Analytics de ventas
- [ ] Webhooks de Stripe
- [ ] Sistema de notificaciones push

## Soporte

Para soporte técnico o preguntas sobre la implementación, contactar al equipo de desarrollo.

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024  
**Compatibilidad**: Next.js 15+, React 19+, TypeScript 5+ 