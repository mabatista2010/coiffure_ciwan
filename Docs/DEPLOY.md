# Guía de Despliegue en Vercel

Esta guía te ayudará a desplegar la landing page de Coiffure Ciwan en Vercel.

## Requisitos previos

- Cuenta en [Vercel](https://vercel.com)
- Repositorio de GitHub, GitLab o Bitbucket con el código de la aplicación
- Variables de entorno de Supabase configuradas

## Pasos para el despliegue

### 1. Preparar el proyecto para el despliegue

Asegúrate de que tu proyecto cumple con los siguientes requisitos:

- El proyecto tiene un archivo `package.json` válido
- Las dependencias están correctamente instaladas y funcionan localmente
- Los archivos `.env.local` no están incluidos en el repositorio (deben estar en `.gitignore`)

### 2. Subir el código a un repositorio

1. Crea un nuevo repositorio en GitHub, GitLab o Bitbucket
2. Sube tu código al repositorio:

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin <URL_DE_TU_REPOSITORIO>
git push -u origin main
```

### 3. Configurar el proyecto en Vercel

1. Inicia sesión en [Vercel](https://vercel.com)
2. Haz clic en "Add New..." > "Project"
3. Selecciona el repositorio que acabas de crear
4. Vercel detectará automáticamente que es un proyecto Next.js
5. Configura el proyecto:
   - **Framework Preset**: Next.js
   - **Root Directory**: ./
   - **Build Command**: `next build`
   - **Output Directory**: `.next`

### 4. Configurar las variables de entorno

1. En la pantalla de configuración, ve a la sección "Environment Variables"
2. Agrega las siguientes variables:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto de Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de tu proyecto de Supabase
3. Estas son las mismas variables que tienes en tu archivo `.env.local`

### 5. Desplegar la aplicación

1. Haz clic en "Deploy"
2. Vercel comenzará a construir y desplegar tu aplicación
3. Una vez finalizado, recibirás una URL donde está desplegada tu aplicación (ej: coiffure-ciwan.vercel.app)

### 6. Configurar un dominio personalizado (opcional)

1. En el dashboard de tu proyecto en Vercel, ve a "Settings" > "Domains"
2. Haz clic en "Add" e ingresa tu dominio personalizado (ej: coiffureciwan.com)
3. Sigue las instrucciones para configurar los registros DNS con tu proveedor de dominio

### 7. Verificar el despliegue

1. Visita la URL proporcionada por Vercel
2. Asegúrate de que la aplicación funciona correctamente:
   - Los estilos se cargan adecuadamente
   - La conexión con Supabase funciona y se cargan los datos
   - Todas las secciones se muestran correctamente
   - El panel de administración funciona

## Solución de problemas comunes

### Los estilos no se cargan correctamente

- Asegúrate de que TailwindCSS está configurado correctamente
- Verifica que los archivos CSS están siendo importados adecuadamente

### No se cargan los datos de Supabase

- Verifica que las variables de entorno están configuradas correctamente en Vercel
- Asegúrate de que las tablas en Supabase están configuradas con la estructura correcta
- Comprueba que las RLS (Row Level Security) policies permiten lectura pública

### Errores en la construcción del proyecto

- Revisa los logs de construcción en Vercel para identificar el problema
- Asegúrate de que todas las dependencias están correctamente instaladas
- Verifica que el código no tiene errores de sintaxis o importaciones incorrectas

## Actualizaciones posteriores

Cada vez que hagas un push a la rama principal de tu repositorio, Vercel actualizará automáticamente la aplicación desplegada.

Para hacer una nueva implementación:

1. Realiza cambios en tu código local
2. Haz commit y push a GitHub:

```bash
git add .
git commit -m "Descripción de los cambios"
git push origin main
```

3. Vercel detectará automáticamente los cambios y actualizará la aplicación 