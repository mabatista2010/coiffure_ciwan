# Lista de Verificación para Implementación

Utiliza esta lista para asegurarte de haber completado todos los pasos necesarios para adaptar la aplicación para el nuevo cliente "La Fama".

## Configuración Inicial

- [ ] Clonar el repositorio de GitHub
- [ ] Instalar dependencias con `npm install`
- [ ] Verificar que la aplicación se ejecuta correctamente con `npm run dev`

## Configuración de Supabase

- [ ] Crear nuevo proyecto en Supabase
- [ ] Ejecutar `supabase_setup_script.sql` para crear las tablas
- [ ] Ejecutar scripts adicionales si es necesario (`location_hours_table.sql`, `supabase-working-hours-fix.sql`)
- [ ] Crear buckets de almacenamiento:
  - [ ] `centros`
  - [ ] `estilistas`
  - [ ] `stylists`
  - [ ] `fotos_peluqueria`
- [ ] Configurar políticas de seguridad con `storage_policies.sql`
- [ ] Crear usuario administrativo en Authentication de Supabase

## Configuración del Proyecto

- [ ] Crear archivo `.env.local` con variables de Supabase
- [ ] Actualizar metadata en `src/app/layout.tsx`:
  - [ ] Título: "La Fama - Estilo que deja huella"
  - [ ] Descripción: "Descubre la experiencia única de La Fama, donde convertimos tu imagen en una declaración de estilo"
  - [ ] Keywords: "peluquería, estilistas, cortes modernos, coloración, barba, estilo urbano"
  - [ ] OpenGraph: Actualizar con nueva imagen y datos

## Personalización de la Landing Page

- [ ] Revisar y comprender detalladamente el archivo `setup-guide/Design_Landing_Page.md`
- [ ] Actualizar variables de estilo en `src/styles/theme.css`:
  - [ ] `--color-primary`: #E94B8A (Rosa/Magenta)
  - [ ] `--color-secondary`: #4A90E2 (Azul)
  - [ ] `--color-accent`: #000000 (Negro)
  - [ ] `--color-coral`: #9B4DCA (Púrpura)
  - [ ] Agregar nuevas variables para degradados y fondos
- [ ] Personalizar componentes:
  - [ ] `Navbar.tsx` - Implementar diseño moderno con logo de La Fama
  - [ ] `Hero.tsx` - Añadir efecto parallax y estructura según especificaciones
  - [ ] `Services.tsx` - Implementar grid de cards con hover effects
  - [ ] Crear componente `Team.tsx` para la sección de estilistas
  - [ ] `Gallery.tsx` - Implementar layout masonry con lightbox
  - [ ] Crear componente `Testimonials.tsx` para slider de testimonios
  - [ ] `Location.tsx` - Implementar sistema de tabs para centros
  - [ ] Crear componente `Contact.tsx` con efecto parallax
  - [ ] `Footer.tsx` - Diseño actualizado con redes sociales destacadas
- [ ] Implementar efectos y animaciones:
  - [ ] Efecto parallax en Hero y Contact
  - [ ] Animaciones de scroll reveal
  - [ ] Transiciones y hover effects con degradados
  - [ ] Botón flotante de reserva rápida
- [ ] Reemplazar recursos estáticos en `/public/`:
  - [ ] Logo de La Fama
  - [ ] Favicon actualizado
  - [ ] Imágenes hero con modelos
  - [ ] Imágenes de servicios, estilistas y galería

## Configuración de Datos Iniciales

- [ ] Configurar servicios principales:
  - [ ] Cortes modernos
  - [ ] Coloración
  - [ ] Diseño de barba
  - [ ] Tratamientos capilares
  - [ ] Estilismo para eventos especiales
- [ ] Configurar los 3 centros con sus direcciones y horarios
- [ ] Configurar estilistas destacados con especialidades
- [ ] Configurar los valores básicos en la tabla `configuracion`:
  - [ ] `hero_title`: "ESTILO & PERSONALIDAD EN CADA CORTE"
  - [ ] `hero_subtitle`: "Descubre la experiencia única de La Fama, donde convertimos tu imagen en una declaración de estilo"
  - [ ] `hero_image`: URL de la imagen principal
  - [ ] `contact_phone`: Teléfono de contacto
  - [ ] `contact_email`: Email de contacto
  - [ ] `social_instagram`, `social_facebook`, etc.
- [ ] Subir imágenes para la galería (12-15 trabajos destacados)
- [ ] Configurar testimonios de clientes

## Pruebas

- [ ] Verificar la correcta visualización de la landing page
  - [ ] Efecto parallax funciona correctamente
  - [ ] Todas las animaciones se muestran adecuadamente
  - [ ] Los degradados y efectos de color se visualizan correctamente
- [ ] Probar el sistema de reservas:
  - [ ] Selección de servicio
  - [ ] Selección de centro
  - [ ] Selección de estilista
  - [ ] Selección de fecha y hora
  - [ ] Formulario de cliente
  - [ ] Confirmación
- [ ] Probar el panel administrativo:
  - [ ] Login
  - [ ] Gestión de reservas
  - [ ] Gestión de estilistas
  - [ ] Gestión de centros
  - [ ] CRM
  - [ ] Estadísticas
- [ ] Verificar diseño responsive en diferentes dispositivos:
  - [ ] Móvil: Verificar diseño mobile-first
  - [ ] Tablet: Comprobar layouts específicos
  - [ ] Desktop: Verificar aprovechamiento del espacio

## Despliegue

- [ ] Preparar para producción con `npm run build`
- [ ] Verificar que la compilación es exitosa
- [ ] Configurar proyecto en Vercel o proveedor elegido
- [ ] Configurar variables de entorno en la plataforma de despliegue
- [ ] Desplegar la aplicación
- [ ] Verificar la URL de producción

## Post-Implementación

- [ ] Realizar copia de seguridad de la configuración inicial
- [ ] Documentar cualquier personalización específica
- [ ] Verificar el acceso administrativo está funcionando
- [ ] Configurar dominio personalizado si es necesario
- [ ] Configurar SSL si es necesario

## Entrega al Cliente

- [ ] Proporcionar credenciales administrativas
- [ ] Proporcionar documentación básica de uso
- [ ] Programar sesión de capacitación si es necesario 