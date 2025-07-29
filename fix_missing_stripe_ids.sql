-- Actualizar productos que no tienen stripe_product_id
-- Gel para Cabello Premium (ID 1)
UPDATE productos 
SET stripe_product_id = 'prod_SlTHjQcCx2TBgN', 
    stripe_price_id = 'price_1RpwLGRtNzDWGlFv7QhT147k' 
WHERE id = 1;

-- Kit de Peinado Profesional (ID 3)
UPDATE productos 
SET stripe_product_id = 'prod_SlTH3ECpCtqayN', 
    stripe_price_id = 'price_1RpwLMRtNzDWGlFvfXoN6j9Z' 
WHERE id = 3;

-- Verificar que todos los productos tengan IDs de Stripe
SELECT 
    id, 
    nombre, 
    stripe_product_id, 
    stripe_price_id,
    CASE 
        WHEN stripe_product_id IS NULL THEN '❌ Sin sincronizar'
        ELSE '✅ Sincronizado'
    END as estado
FROM productos 
WHERE activo = true 
ORDER BY id; 