# Especificaciones de Diseño para la Landing Page - La Fama

Este documento contiene las especificaciones detalladas para la landing page de la peluquería "La Fama". Utiliza esta información para personalizar los componentes visuales y el contenido de la página principal.

## Información General del Cliente

- **Nombre del negocio**: La Fama
- **Slogan/Lema**: "Estilo que deja huella"
- **Tipo de clientela**: Público urbano moderno, principalmente jóvenes adultos entre 18-35 años que buscan estilos contemporáneos y personalizados
- **Ubicaciones**: 3 centros ubicados en zonas estratégicas de la ciudad
- **Servicios principales**: Cortes modernos, coloración, diseño de barba, tratamientos capilares, estilismo para eventos especiales

## Paleta de Colores

- **Color primario**: #E94B8A (Rosa/Magenta) - Para acentos, botones principales y elementos destacados
- **Color secundario**: #4A90E2 (Azul) - Para secciones secundarias y elementos complementarios
- **Color de acento**: #000000 (Negro) - Para textos y delineados
- **Color para títulos especiales**: #9B4DCA (Púrpura) - Para títulos que necesiten destacar
- **Color de fondo principal**: #FFFFFF (Blanco) - Como base para las secciones
- **Color de fondo secundario**: #F8F9FA (Gris muy claro) - Para alternar secciones
- **Degradado principal**: Gradiente de #E94B8A a #4A90E2 - Para elementos especiales y fondos de secciones destacadas

## Tipografía

- **Fuente principal**: Montserrat - Pesos 400, 500, 600, 700
- **Fuente decorativa**: Playfair Display - Pesos 400, 700
- **Tamaños de texto recomendados**:
  - Títulos principales: 3rem (48px)
  - Subtítulos: 1.75rem (28px)
  - Texto regular: 1rem (16px)
  - Texto pequeño: 0.875rem (14px)

## Estructura de la Landing Page

### Sección Hero con Parallax

- **Mensaje principal**: "ESTILO & PERSONALIDAD EN CADA CORTE"
- **Subtítulo**: "Descubre la experiencia única de La Fama, donde convertimos tu imagen en una declaración de estilo"
- **Llamada a la acción principal**: "Reserva tu cita" (enlace directo al sistema de reservas)
- **Imágenes**: Fotografía de alta calidad de modelos con cortes modernos, con efecto parallax al hacer scroll
- **Estilo especial**: Efecto parallax que muestre profundidad entre texto y fondo. El texto principal aparece sobre la imagen con un overlay semi-transparente que utilice el degradado de colores principal.

### Sección Nuestros Servicios

- **Título de la sección**: "SERVICIOS EXCLUSIVOS"
- **Cantidad de servicios a mostrar**: 6 (los más populares)
- **Información a incluir por servicio**: Nombre, imagen representativa, breve descripción, precio base
- **Estilo de presentación**: Cards con hover effect que muestren información adicional, organizadas en una grid responsiva de 3x2 en desktop
- **Botón de acción**: "Ver todos los servicios" (que enlace a la sección completa de servicios)

### Sección Nuestro Equipo

- **Título de la sección**: "ESTILISTAS DE ÉLITE"
- **Contenido**: Presentación de los 4-6 estilistas destacados con fotografías profesionales de estilo editorial
- **Estilo**: Cards con efecto hover que muestren la especialidad y una breve bio de cada estilista
- **Información adicional**: Años de experiencia, especialidad y redes sociales de cada estilista

### Sección Galería con Masonry Layout

- **Título de la sección**: "NUESTRAS CREACIONES"
- **Tipo de imágenes**: Fotografías profesionales de cortes y estilos realizados en la peluquería
- **Número de imágenes**: 12-15 imágenes variadas
- **Estilo de presentación**: Masonry grid con lightbox al hacer clic en las imágenes, con efecto de filtro de color al hacer hover usando el degradado de la marca

### Sección Testimonios con Slider

- **Título de la sección**: "LO QUE DICEN NUESTROS CLIENTES"
- **Contenido**: 5-7 testimonios de clientes satisfechos con foto, nombre y texto
- **Estilo**: Slider/carrusel con control manual y automático, cards con fondo blanco y borde con el degradado de la marca

### Sección Ubicaciones con Diseño de Tabs

- **Título de la sección**: "ENCUÉNTRANOS"
- **Información a mostrar por centro**: Nombre del local, dirección completa, teléfono, horarios detallados por día, fotografía del exterior/interior
- **Inclusión de mapa**: Sí, Google Maps integrado para cada ubicación
- **Estilo de presentación**: Sistema de tabs para cambiar entre los diferentes centros, con la información y mapa actualizándose al cambiar de tab

### Sección Contacto con Parallax

- **Fondo**: Imagen de uno de los interiores más atractivos de la peluquería con efecto parallax
- **Contenido**: Formulario de contacto simple (nombre, email, teléfono, mensaje)
- **Información adicional**: Teléfono general, email de contacto, enlaces a redes sociales con iconos grandes
- **Estilo**: Fondo con overlay semitransparente del degradado de la marca, formulario con diseño minimalista y botón destacado

### Footer Moderno

- **Información de contacto**: Teléfono central, email, enlaces a todas las redes sociales con iconos
- **Enlaces adicionales**: Política de privacidad, Términos y condiciones, FAQ, Careers
- **Elementos visuales**: Logo de La Fama en versión monocromática blanca, iconos de redes sociales
- **Información legal**: Copyright 2024 La Fama - Todos los derechos reservados

## Referencias Visuales

- **Enlaces a inspiración**: 
  - [Estilo Black Panther UI](https://dribbble.com/shots/4150901-Barbershop)
  - [Diseño con degradados](https://dribbble.com/shots/17178828-Barbershop-Website-Design)
  - [Layouts modernos](https://dribbble.com/shots/15092789-Hair-Salon-Website-UI-UX-Design)

## Requisitos Especiales

- **Animaciones**: 
  - Efecto parallax en la sección hero y contacto
  - Animaciones suaves en scroll para la aparición de elementos
  - Hover effects con transiciones suaves usando el degradado de marca
  - Efecto de "reveal" al hacer scroll para las secciones
  
- **Funcionalidades extra**: 
  - Botón de "Reserva rápida" flotante que sigue al usuario al hacer scroll
  - Modo oscuro opcional que invierta los colores manteniendo el degradado de marca
  - Integración con Instagram para mostrar las últimas publicaciones

- **Consideraciones de accesibilidad**: 
  - Alto contraste entre texto y fondo
  - Tamaños de texto legibles en todos los dispositivos
  - Alternativas de texto para todas las imágenes
  - Navegación por teclado completamente funcional

- **Compatibilidad con dispositivos**: 
  - Diseño prioritario para móviles (mobile-first)
  - Experiencia mejorada para tablets con layouts específicos
  - Aprovechamiento completo del espacio en pantallas grandes

## Recursos Proporcionados

- **Logo**: Logo principal de La Fama proporcionado en formato vectorial
- **Imágenes**: Se proporcionarán fotografías profesionales de:
  - Trabajos realizados para la galería
  - Retratos de los estilistas
  - Interiores y exteriores de los locales
- **Contenido**: Textos finales para todas las secciones por confirmar
- **Otros recursos**: Vídeo promocional de 30 segundos para posible integración en el hero

---

*Nota: Este documento debe ser analizado por el desarrollador o agente de IA antes de comenzar la personalización de la landing page. Las decisiones de diseño deben priorizar las especificaciones aquí establecidas, adaptándolas a la estructura de componentes existente pero creando una experiencia visualmente distinta a la original.* 