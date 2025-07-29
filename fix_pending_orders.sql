-- Script para limpiar pedidos "fantasma" que nunca se pagaron
-- Este script elimina pedidos que están en estado 'pendiente' y no tienen stripe_payment_intent_id

-- Primero, mostrar los pedidos que serán eliminados
SELECT 
    id,
    cliente_nombre,
    cliente_email,
    total,
    estado,
    stripe_session_id,
    stripe_payment_intent_id,
    created_at
FROM pedidos 
WHERE estado = 'pendiente' 
    AND stripe_payment_intent_id IS NULL;

-- Eliminar los items de pedido asociados a pedidos pendientes sin pago
DELETE FROM items_pedido 
WHERE pedido_id IN (
    SELECT id 
    FROM pedidos 
    WHERE estado = 'pendiente' 
        AND stripe_payment_intent_id IS NULL
);

-- Eliminar los pedidos pendientes sin pago
DELETE FROM pedidos 
WHERE estado = 'pendiente' 
    AND stripe_payment_intent_id IS NULL;

-- Verificar que se eliminaron correctamente
SELECT 
    COUNT(*) as pedidos_restantes,
    estado
FROM pedidos 
GROUP BY estado; 