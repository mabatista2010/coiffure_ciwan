-- Verificar productos sin sincronización con Stripe
SELECT 
    id, 
    nombre, 
    precio, 
    stripe_product_id, 
    stripe_price_id,
    CASE 
        WHEN stripe_price_id IS NULL THEN '❌ Sin sincronizar'
        ELSE '✅ Sincronizado'
    END as estado
FROM productos 
WHERE activo = true 
ORDER BY id;

-- Contar productos sincronizados vs no sincronizados
SELECT 
    COUNT(*) as total_productos,
    COUNT(stripe_price_id) as productos_sincronizados,
    COUNT(*) - COUNT(stripe_price_id) as productos_sin_sincronizar
FROM productos 
WHERE activo = true; 