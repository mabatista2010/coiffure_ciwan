-- Script SQL para traducir productos de la boutique al francés
-- Coiffure Ciwan - Actualización de productos

-- Actualizar producto 1: Gel para Cabello Premium
UPDATE productos 
SET 
    nombre = 'Gel pour Cheveux Premium',
    descripcion = 'Gel de haute qualité pour une finition professionnelle et durable'
WHERE id = 1;

-- Actualizar producto 2: Cera Modeladora Natural
UPDATE productos 
SET 
    nombre = 'Cire Modélisante Naturelle',
    descripcion = 'Cire naturelle pour modeler les cheveux sans les abîmer'
WHERE id = 2;

-- Actualizar producto 3: Kit de Peinado Profesional
UPDATE productos 
SET 
    nombre = 'Kit de Coiffure Professionnel',
    descripcion = 'Kit complet avec peigne, ciseaux et spray'
WHERE id = 3;

-- Actualizar producto 4: Shampoo Hidratante
UPDATE productos 
SET 
    nombre = 'Shampooing Hydratant',
    descripcion = 'Shampooing professionnel pour cheveux secs et abîmés'
WHERE id = 4;

-- Actualizar producto 5: Aceite Capilar Reparador
UPDATE productos 
SET 
    nombre = 'Huile Capillaire Réparatrice',
    descripcion = 'Huile naturelle pour réparer et nourrir les cheveux'
WHERE id = 5;

-- Actualizar producto 6: Set de Peines Profesionales
UPDATE productos 
SET 
    nombre = 'Set de Peignes Professionnels',
    descripcion = 'Set de 3 peignes de différentes tailles'
WHERE id = 6;

-- Actualizar producto 7: Spray Termoprotector
UPDATE productos 
SET 
    nombre = 'Spray Thermo-Protecteur',
    descripcion = 'Protège vos cheveux de la chaleur des sèche-cheveux et fers à lisser'
WHERE id = 7;

-- Actualizar producto 8: Mascarilla Capilar Intensiva
UPDATE productos 
SET 
    nombre = 'Masque Capillaire Intensif',
    descripcion = 'Masque réparateur pour usage hebdomadaire'
WHERE id = 8;

-- Actualizar producto 9: champu antipiojos (corregir también la ortografía)
UPDATE productos 
SET 
    nombre = 'Shampooing Anti-Poux',
    descripcion = 'Le meilleur shampooing pour éliminer efficacement les poux'
WHERE id = 9;

-- Verificar los cambios
SELECT id, nombre, descripcion, categoria, precio, activo, destacado 
FROM productos 
ORDER BY id; 