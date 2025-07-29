-- Tabla de productos para la boutique
CREATE TABLE IF NOT EXISTS productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    descripcion TEXT,
    precio DECIMAL(10,2) NOT NULL,
    precio_original DECIMAL(10,2),
    stock INTEGER DEFAULT 0,
    categoria VARCHAR(100),
    imagen_url TEXT,
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),
    activo BOOLEAN DEFAULT true,
    destacado BOOLEAN DEFAULT false,
    orden INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de categorías de productos
CREATE TABLE IF NOT EXISTS categorias_productos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    imagen_url TEXT,
    orden INTEGER DEFAULT 0,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de pedidos
CREATE TABLE IF NOT EXISTS pedidos (
    id SERIAL PRIMARY KEY,
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_email VARCHAR(255) NOT NULL,
    cliente_telefono VARCHAR(50),
    cliente_direccion TEXT,
    total DECIMAL(10,2) NOT NULL,
    estado VARCHAR(50) DEFAULT 'pendiente',
    stripe_payment_intent_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    notas TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de items de pedido
CREATE TABLE IF NOT EXISTS items_pedido (
    id SERIAL PRIMARY KEY,
    pedido_id INTEGER REFERENCES pedidos(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de carrito de compras (sesiones)
CREATE TABLE IF NOT EXISTS carrito_sesiones (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    cliente_email VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de items del carrito
CREATE TABLE IF NOT EXISTS items_carrito (
    id SERIAL PRIMARY KEY,
    carrito_id INTEGER REFERENCES carrito_sesiones(id) ON DELETE CASCADE,
    producto_id INTEGER REFERENCES productos(id),
    cantidad INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar algunos productos de ejemplo
INSERT INTO productos (nombre, descripcion, precio, precio_original, stock, categoria, imagen_url, destacado) VALUES
('Gel para Cabello Premium', 'Gel de alta calidad para un acabado profesional y duradero', 25.99, 35.99, 50, 'productos_cabello', '/placeholder-profile.jpg', true),
('Cera Modeladora Natural', 'Cera natural para modelar el cabello sin dañarlo', 18.50, NULL, 30, 'productos_cabello', '/placeholder-profile.jpg', false),
('Kit de Peinado Profesional', 'Kit completo con peine, tijeras y spray', 45.00, 60.00, 15, 'kits', '/placeholder-profile.jpg', true),
('Shampoo Hidratante', 'Shampoo profesional para cabello seco y dañado', 22.00, NULL, 40, 'productos_cabello', '/placeholder-profile.jpg', false),
('Aceite Capilar Reparador', 'Aceite natural para reparar y nutrir el cabello', 28.50, NULL, 25, 'productos_cabello', '/placeholder-profile.jpg', false),
('Set de Peines Profesionales', 'Set de 3 peines de diferentes tamaños', 32.00, 40.00, 20, 'accesorios', '/placeholder-profile.jpg', false),
('Spray Termoprotector', 'Protege tu cabello del calor de secadores y planchas', 19.99, NULL, 35, 'productos_cabello', '/placeholder-profile.jpg', false),
('Mascarilla Capilar Intensiva', 'Mascarilla reparadora para uso semanal', 26.50, NULL, 30, 'productos_cabello', '/placeholder-profile.jpg', false);

-- Insertar categorías
INSERT INTO categorias_productos (nombre, descripcion, orden) VALUES
('Productos Cabello', 'Productos para el cuidado y estilizado del cabello', 1),
('Kits', 'Kits completos de productos', 2),
('Accesorios', 'Accesorios y herramientas para el cabello', 3);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_productos_activo ON productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_categoria ON productos(categoria);
CREATE INDEX IF NOT EXISTS idx_productos_destacado ON productos(destacado);
CREATE INDEX IF NOT EXISTS idx_pedidos_email ON pedidos(cliente_email);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_items_pedido_pedido_id ON items_pedido(pedido_id); 