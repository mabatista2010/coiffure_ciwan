-- Actualizar productos con sus IDs de Stripe
UPDATE productos SET 
  stripe_product_id = 'prod_SlTcATGTVNYemr',
  stripe_price_id = 'price_1RpwfhRtNzDWGlFvqGzUsSml'
WHERE id = 2;

UPDATE productos SET 
  stripe_product_id = 'prod_SlTdVsWhv0Qh2w',
  stripe_price_id = 'price_1RpwfnRtNzDWGlFvBPFV8vSc'
WHERE id = 4;

UPDATE productos SET 
  stripe_product_id = 'prod_SlTdLNqjcCKOMm',
  stripe_price_id = 'price_1RpwftRtNzDWGlFv0VC0iEKU'
WHERE id = 5;

UPDATE productos SET 
  stripe_product_id = 'prod_SlTd3Vp3ajn4OX',
  stripe_price_id = 'price_1Rpwg1RtNzDWGlFv668PUJ0p'
WHERE id = 6;

UPDATE productos SET 
  stripe_product_id = 'prod_SlTdT9QRFcf8R5',
  stripe_price_id = 'price_1Rpwg8RtNzDWGlFvzq8hFUpL'
WHERE id = 7;

UPDATE productos SET 
  stripe_product_id = 'prod_SlTd70sLAyL3Tg',
  stripe_price_id = 'price_1RpwgERtNzDWGlFvvH0J1fp4'
WHERE id = 8;

UPDATE productos SET 
  stripe_product_id = 'prod_SlTdL6wOo0Iowv',
  stripe_price_id = 'price_1RpwgNRtNzDWGlFvpHE1GyTd'
WHERE id = 9;

-- Verificar que todos los productos tengan sus IDs de Stripe
SELECT id, nombre, stripe_product_id, stripe_price_id FROM productos WHERE activo = true ORDER BY id; 