# Coiffure Ciwan - Peluquería Moderna

## Descripción
Landing page profesional para la peluquería masculina "Coiffure Ciwan", especializada en cortes modernos para hombres y niños. La aplicación está desarrollada con Next.js, TailwindCSS y Supabase.

## Características
- Diseño moderno y responsivo
- Integración con Supabase para contenido dinámico
- Secciones: Inicio, Servicios, Galería, Ubicación y Contacto
- Panel de administración para gestionar servicios e imágenes
- Optimización SEO

## Requisitos Previos
- Node.js (v18 o superior)
- Cuenta en Supabase
- Cuenta en Vercel para el despliegue

## Configuración
1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Crear cuenta en [Supabase](https://supabase.com/) y crear un nuevo proyecto

4. Configurar las tablas en Supabase:
   - Tabla `servicios` con las columnas:
     - id (serial, primary key)
     - nombre (text)
     - descripcion (text)
     - precio (numeric)
     - imagen_url (text)
   
   - Tabla `imagenes_galeria` con las columnas:
     - id (serial, primary key)
     - descripcion (text)
     - imagen_url (text)
     - fecha (date)

5. Crear un bucket en Supabase Storage llamado `coiffure-ciwan` para almacenar las imágenes

6. Crear un archivo `.env.local` en la raíz del proyecto con las siguientes variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=TU_URL_DE_SUPABASE
   NEXT_PUBLIC_SUPABASE_ANON_KEY=TU_CLAVE_ANONIMA_DE_SUPABASE
   ```

7. Ejecutar el proyecto en modo desarrollo:
   ```bash
   npm run dev
   ```

8. Configurar autenticación en Supabase para el panel de administración:
   - Ir a "Authentication" > "Providers" y habilitar "Email"
   - Crear un usuario administrador en "Authentication" > "Users"

## Despliegue
1. Crear una cuenta en [Vercel](https://vercel.com/)
2. Conectar el repositorio
3. Configurar las variables de entorno en Vercel:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
4. Implementar

## Carpetas y Archivos Principales
- `/src/components`: Componentes reutilizables
- `/src/app`: Páginas de la aplicación
- `/src/lib`: Configuración de Supabase y tipos

## Personalización
- Modificar los colores en `tailwind.config.js`
- Cambiar las imágenes y textos en los componentes
- Ajustar la información de contacto en `Footer.tsx`
- Actualizar la ubicación del mapa en `Location.tsx`

## Licencia
Este proyecto está licenciado bajo la Licencia MIT.
