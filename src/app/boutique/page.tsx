'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { useCarrito } from '../../components/boutique/CarritoContext';
import Navbar from '../../components/Navbar';
import { Star, ShoppingBag, Heart, Eye, Tag } from 'lucide-react';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  precio_original?: number;
  stock: number;
  categoria: string;
  imagen_url: string;
  destacado: boolean;
}

function BoutiqueContent() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<string>('todos');
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState<{show: boolean, message: string}>({show: false, message: ''});
  const { addItem } = useCarrito();

  const handleAddToCart = (producto: Producto) => {
    addItem(producto);
    setNotification({
      show: true,
      message: `${producto.nombre} ajouté au panier !`
    });
    setTimeout(() => setNotification({show: false, message: ''}), 2000);
  };

  useEffect(() => {
    const fetchProductos = async () => {
      try {
        const response = await fetch('/api/boutique/productos');
        if (response.ok) {
          const data = await response.json();
          setProductos(data);
          
          // Extraire les catégories uniques des produits
          const categoriasUnicas = ['todos', ...new Set(data.map((p: Producto) => p.categoria).filter(Boolean))];
          setCategorias(categoriasUnicas as string[]);
        } else {
          // Fallback aux données d'exemple si l'API échoue
          const productosEjemplo: Producto[] = [
            {
              id: 1,
              nombre: "Gel pour Cheveux Premium",
              descripcion: "Gel de haute qualité pour une finition professionnelle et durable",
              precio: 25.99,
              precio_original: 35.99,
              stock: 50,
              categoria: "productos_cabello",
              imagen_url: "/placeholder-profile.jpg",
              destacado: true
            },
            {
              id: 2,
              nombre: "Cire Modélisante Naturelle",
              descripcion: "Cire naturelle pour modeler les cheveux sans les abîmer",
              precio: 18.50,
              stock: 30,
              categoria: "productos_cabello",
              imagen_url: "/placeholder-profile.jpg",
              destacado: false
            },
            {
              id: 3,
              nombre: "Kit de Coiffure Professionnel",
              descripcion: "Kit complet avec peigne, ciseaux et spray",
              precio: 45.00,
              precio_original: 60.00,
              stock: 15,
              categoria: "kits",
              imagen_url: "/placeholder-profile.jpg",
              destacado: true
            }
          ];
          setProductos(productosEjemplo);
          setCategorias(['todos', 'productos_cabello', 'kits', 'accesorios']);
        }
      } catch (error) {
        console.error('Error fetching productos:', error);
        // Fallback aux données d'exemple
        const productosEjemplo: Producto[] = [
          {
            id: 1,
            nombre: "Gel pour Cheveux Premium",
            descripcion: "Gel de haute qualité pour une finition professionnelle et durable",
            precio: 25.99,
            precio_original: 35.99,
            stock: 50,
            categoria: "productos_cabello",
            imagen_url: "/placeholder-profile.jpg",
            destacado: true
          }
        ];
        setProductos(productosEjemplo);
        setCategorias(['todos', 'productos_cabello']);
      } finally {
        setLoading(false);
      }
    };

    fetchProductos();
  }, []);

  const productosFiltrados = categoriaSeleccionada === 'todos' 
    ? productos 
    : productos.filter(p => p.categoria === categoriaSeleccionada);

  const productosDestacados = productos.filter(p => p.destacado);

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin-custom w-12 h-12"></div>
          <div className="text-primary text-xl font-semibold">Chargement de la boutique...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark">
      {/* Navbar */}
      <Navbar />
      
      {/* Hero Section Mejorado */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-secondary via-dark to-accent overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,var(--color-primary),transparent_50%)]"></div>
        </div>
        
        <div className="relative z-10 container mx-auto px-4 flex items-center">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            className="text-center w-full max-w-4xl mx-auto"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="mb-6"
            >
              <ShoppingBag className="w-16 h-16 text-primary mx-auto mb-4" />
            </motion.div>
            
            <h1 className="text-4xl md:text-6xl font-bold text-primary mb-4 font-decorative">
              Boutique Steel & Blade
            </h1>
            
            <p className="text-lg md:text-xl text-light mb-6 max-w-2xl mx-auto leading-relaxed">
              Découvrez notre sélection exclusive de produits professionnels pour le soin et le coiffage de vos cheveux
            </p>
            
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-4 justify-center items-center"
            >
              <Link 
                href="#productos"
                className="group bg-primary text-secondary px-6 py-3 rounded-full font-bold text-base hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <span className="flex items-center gap-2">
                  Voir les Produits
                  <Tag className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                </span>
              </Link>
              
              <Link 
                href="/reservation"
                className="group border-2 border-primary text-primary px-6 py-3 rounded-full font-bold text-base hover:bg-primary hover:text-secondary transition-all duration-300 transform hover:scale-105"
              >
                Réserver un Rendez-vous
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Produits Vedettes Améliorés */}
      {productosDestacados.length > 0 && (
        <section className="py-16 bg-secondary relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,var(--color-primary),transparent_50%)]"></div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3 font-decorative">
                Produits Vedettes
              </h2>
              <p className="text-light text-base max-w-2xl mx-auto">
                Nos produits les plus populaires et les mieux notés par nos clients
              </p>
            </motion.div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {productosDestacados.map((producto, index) => (
                <motion.div
                  key={producto.id}
                  initial={{ opacity: 0, y: 50 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.8, delay: index * 0.2 }}
                  className="group bg-dark rounded-2xl overflow-hidden shadow-2xl hover:shadow-4xl transition-all duration-300"
                >
                  <div className="relative h-80 overflow-hidden">
                    <Image
                      src={producto.imagen_url}
                      alt={producto.nombre}
                      fill
                      className="object-cover"
                    />
                    
                    {/* Overlay con información */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center gap-2 mb-2">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                          ))}
                          <span className="text-light text-sm">(4.9)</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Badge de descuento */}
                    {producto.precio_original && (
                      <div className="absolute top-4 right-4 bg-coral text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">
                        -{Math.round(((producto.precio_original - producto.precio) / producto.precio_original) * 100)}%
                      </div>
                    )}
                    
                    {/* Botón de favorito */}
                    <button className="absolute top-4 left-4 w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-light mb-3">
                      {producto.nombre}
                    </h3>
                    <p className="text-text-medium mb-4 line-clamp-2 leading-relaxed">
                      {producto.descripcion}
                    </p>
                    
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-3xl font-bold text-primary">
                          {producto.precio.toFixed(2)}€
                        </span>
                        {producto.precio_original && (
                          <span className="text-text-medium line-through text-lg">
                            {producto.precio_original.toFixed(2)}€
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-text-medium bg-secondary px-2 py-1 rounded">
                        Stock: {producto.stock}
                      </span>
                    </div>
                    
                                         <motion.button 
                       onClick={() => handleAddToCart(producto)}
                       className="w-full bg-primary text-secondary py-3 rounded-xl font-bold hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl group relative overflow-hidden"
                       whileHover={{ 
                         scale: 1.02,
                         boxShadow: "0 20px 40px rgba(212, 160, 23, 0.3)"
                       }}
                       whileTap={{ scale: 0.98 }}
                     >
                       <span className="flex items-center justify-center gap-2 relative z-10">
                         <ShoppingBag className="w-5 h-5 group-hover:rotate-12 transition-transform duration-300" />
                         Ajouter au Panier
                       </span>
                       <motion.div
                         className="absolute inset-0 bg-white/20"
                         initial={{ x: "-100%" }}
                         whileHover={{ x: "100%" }}
                         transition={{ duration: 0.6 }}
                       />
                     </motion.button>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Filtres et Produits Améliorés */}
      <section id="productos" className="py-16 bg-dark">
        <div className="container mx-auto px-4">
                      <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              <h2 className="text-3xl md:text-4xl font-bold text-primary mb-3 font-decorative">
                Nos Produits
              </h2>
              <p className="text-light text-base max-w-2xl mx-auto">
                Explorez notre collection complète de produits professionnels
              </p>
            </motion.div>

          {/* Filtres Améliorés */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-wrap justify-center gap-4 mb-16"
          >
            {categorias.map((categoria) => (
              <button
                key={categoria}
                onClick={() => setCategoriaSeleccionada(categoria)}
                className={`px-8 py-3 rounded-full font-bold transition-all duration-300 transform hover:scale-105 ${
                  categoriaSeleccionada === categoria
                    ? 'bg-primary text-secondary shadow-lg'
                    : 'bg-secondary text-light hover:bg-gray-700 hover:text-primary'
                }`}
              >
                {categoria === 'todos' ? 'Tous les Produits' : 
                 categoria === 'productos_cabello' ? 'Produits pour Cheveux' :
                 categoria === 'kits' ? 'Kits Complets' : 'Accessoires'}
              </button>
            ))}
          </motion.div>

          {/* Grille de Produits Améliorée */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {productosFiltrados.map((producto, index) => (
              <motion.div
                key={producto.id}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group bg-secondary rounded-2xl overflow-hidden shadow-xl hover:shadow-3xl transition-all duration-300"
              >
                <div className="relative h-64 overflow-hidden">
                  <Image
                    src={producto.imagen_url}
                    alt={producto.nombre}
                    fill
                    className="object-cover"
                  />
                  
                  {/* Overlay con botones */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center gap-4">
                    <button className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                      <Eye className="w-5 h-5" />
                    </button>
                    <button className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center text-white hover:bg-white/30 transition-colors">
                      <Heart className="w-5 h-5" />
                    </button>
                  </div>
                  
                  {/* Badge de oferta */}
                  {producto.precio_original && (
                    <div className="absolute top-3 right-3 bg-coral text-white px-2 py-1 rounded-full text-xs font-bold">
                      Offre
                    </div>
                  )}
                </div>
                
                <div className="p-6">
                  <h3 className="text-lg font-bold text-light mb-2 line-clamp-1">
                    {producto.nombre}
                  </h3>
                  <p className="text-text-medium text-sm mb-4 line-clamp-2 leading-relaxed">
                    {producto.descripcion}
                  </p>
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-primary">
                        {producto.precio.toFixed(2)}€
                      </span>
                      {producto.precio_original && (
                        <span className="text-text-medium line-through text-sm">
                          {producto.precio_original.toFixed(2)}€
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-text-medium bg-dark px-2 py-1 rounded">
                      Stock: {producto.stock}
                    </span>
                  </div>
                  
                  <motion.button 
                    onClick={() => handleAddToCart(producto)}
                    className="w-full bg-primary text-secondary py-3 rounded-xl font-bold hover:bg-yellow-400 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl group relative overflow-hidden"
                    whileHover={{ 
                      scale: 1.02,
                      boxShadow: "0 20px 40px rgba(212, 160, 23, 0.3)"
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span className="flex items-center justify-center gap-2 relative z-10">
                      <ShoppingBag className="w-4 h-4 group-hover:rotate-12 transition-transform duration-300" />
                      Ajouter au Panier
                    </span>
                    <motion.div
                      className="absolute inset-0 bg-white/20"
                      initial={{ x: "-100%" }}
                      whileHover={{ x: "100%" }}
                      transition={{ duration: 0.6 }}
                    />
                  </motion.button>
                </div>
              </motion.div>
            ))}
          </div>

          {productosFiltrados.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <div className="max-w-md mx-auto">
                <ShoppingBag className="w-16 h-16 text-primary mx-auto mb-4" />
                <p className="text-text-medium text-lg mb-4">
                  Aucun produit disponible dans cette catégorie.
                </p>
                <button
                  onClick={() => setCategoriaSeleccionada('todos')}
                  className="bg-primary text-secondary px-6 py-2 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
                >
                  Voir Tous les Produits
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </section>

      {/* Section CTA Améliorée */}
      <section className="py-16 bg-primary relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,var(--color-secondary),transparent_50%)]"></div>
        </div>
        
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-4xl md:text-5xl font-bold text-secondary mb-6 font-decorative"
          >
            Besoin de Conseils Professionnels ?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="text-secondary text-xl mb-12 max-w-3xl mx-auto leading-relaxed"
          >
            Nos stylistes professionnels sont disponibles pour vous aider à choisir les meilleurs produits pour votre type de cheveux et votre style personnel.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="flex flex-col sm:flex-row gap-6 justify-center"
          >
            <Link 
              href="/reservation"
              className="group bg-secondary text-primary px-10 py-4 rounded-full font-bold text-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
            >
              <span className="flex items-center justify-center gap-2">
                Réserver un Rendez-vous
                <Eye className="w-5 h-5 group-hover:rotate-12 transition-transform" />
              </span>
            </Link>
            <Link 
              href="/equipo"
              className="group border-2 border-secondary text-secondary px-10 py-4 rounded-full font-bold text-lg hover:bg-secondary hover:text-primary transition-all duration-300 transform hover:scale-105"
            >
              <span className="flex items-center justify-center gap-2">
                Connaître Notre Équipe
                <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              </span>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Notification de Produit Ajouté */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.8 }}
            transition={{ duration: 0.3 }}
            className="fixed bottom-6 right-6 bg-primary text-secondary px-6 py-4 rounded-2xl shadow-2xl z-50 max-w-sm"
          >
            <div className="flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1 }}
                className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center"
              >
                <ShoppingBag className="w-4 h-4 text-primary" />
              </motion.div>
              <div>
                <p className="font-bold text-sm">{notification.message}</p>
                <p className="text-xs opacity-80">Produit ajouté correctement</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function BoutiquePage() {
  return <BoutiqueContent />;
} 