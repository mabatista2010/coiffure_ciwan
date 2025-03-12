-- Verificar el valor actual
SELECT clave, valor FROM configuracion WHERE clave = 'services_background';

-- Actualizar la URL para que use el bucket hero_images
-- Si la URL actual comienza con 'backgrounds/', la actualizamos para que sea solo el nombre del archivo
UPDATE configuracion 
SET valor = SUBSTRING(valor FROM 'backgrounds/(.*)$')
WHERE clave = 'services_background'
AND valor LIKE 'backgrounds/%';

-- Si la URL no tiene el formato correcto, establecer un valor por defecto
-- Nota: Esto solo se ejecutará si no se actualizó en el paso anterior
UPDATE configuracion 
SET valor = 'd3acd0b1-8306-45b7-85d'
WHERE clave = 'services_background'
AND valor NOT LIKE '%d3acd0b1-8306-45b7-85d%';

-- Verificar el valor actualizado
SELECT clave, valor FROM configuracion WHERE clave = 'services_background'; 