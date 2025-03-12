-- Verificar el valor actual
SELECT clave, valor FROM configuracion WHERE clave = 'services_background';

-- Actualizar la URL para asegurarnos de que tiene el formato correcto
-- Usar la URL exacta que vemos en la captura de pantalla
UPDATE configuracion 
SET valor = 'backgrounds/d3acd0b1-8306-45b7-85d'
WHERE clave = 'services_background';

-- Verificar el valor actualizado
SELECT clave, valor FROM configuracion WHERE clave = 'services_background'; 