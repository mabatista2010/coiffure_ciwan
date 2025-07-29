'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Plus, Edit, Trash2, Eye, EyeOff, Package, ShoppingCart, CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface Producto {
  id: number;
  nombre: string;
  descripcion: string;
  precio: number;
  precio_original?: number;
  stock: number;
  categoria: string;
  imagen_url: string;
  activo: boolean;
  destacado: boolean;
  orden: number;
  stripe_product_id?: string;
  stripe_price_id?: string;
}

interface Pedido {
  id: number;
  cliente_nombre: string;
  cliente_email: string;
  cliente_telefono?: string;
  cliente_direccion?: string;
  total: string;
  estado: string;
  stripe_payment_intent_id?: string;
  stripe_session_id?: string;
  notas?: string;
  created_at: string;
  updated_at: string;
  items?: PedidoItem[];
}

interface PedidoItem {
  id: number;
  pedido_id: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: string;
  subtotal: string;
  created_at: string;
  producto?: {
    nombre: string;
    imagen_url: string;
  };
}

export default function BoutiqueAdminPage() {
  const [activeTab, setActiveTab] = useState<'productos' | 'pedidos'>('productos');
  const [productos, setProductos] = useState<Producto[]>([]);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Producto | null>(null);
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    precio_original: '',
    stock: '',
    categoria: '',
    imagen_url: '',
    activo: true,
    destacado: false,
    orden: 0
  });

  useEffect(() => {
    if (activeTab === 'productos') {
      fetchProductos();
    } else {
      fetchPedidos();
    }
  }, [activeTab]);

  const fetchProductos = async () => {
    try {
      const response = await fetch('/api/boutique/productos');
      if (response.ok) {
        const data = await response.json();
        setProductos(data);
      }
    } catch (error) {
      console.error('Error fetching productos:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPedidos = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/boutique/pedidos');
      if (response.ok) {
        const data = await response.json();
        setPedidos(data);
      }
    } catch (error) {
      console.error('Error fetching pedidos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingProduct 
        ? `/api/boutique/productos/${editingProduct.id}`
        : '/api/boutique/productos';
      
      const method = editingProduct ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          precio: parseFloat(formData.precio),
          precio_original: formData.precio_original ? parseFloat(formData.precio_original) : null,
          stock: parseInt(formData.stock),
          orden: parseInt(formData.orden.toString())
        })
      });

      if (response.ok) {
        setShowForm(false);
        setEditingProduct(null);
        resetForm();
        fetchProductos();
      }
    } catch (error) {
      console.error('Error saving producto:', error);
    }
  };

  const handleEdit = (producto: Producto) => {
    setEditingProduct(producto);
    setFormData({
      nombre: producto.nombre,
      descripcion: producto.descripcion,
      precio: producto.precio.toString(),
      precio_original: producto.precio_original?.toString() || '',
      stock: producto.stock.toString(),
      categoria: producto.categoria,
      imagen_url: producto.imagen_url,
      activo: producto.activo,
      destacado: producto.destacado,
      orden: producto.orden
    });
    setShowForm(true);
  };

  const handleToggleActive = async (producto: Producto) => {
    const accion = producto.activo ? 'désactiver' : 'activer';
    if (!confirm(`Êtes-vous sûr de vouloir ${accion} le produit "${producto.nombre}" ?`)) return;
    
    try {
      const response = await fetch(`/api/boutique/productos/${producto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...producto,
          activo: !producto.activo
        })
      });
      
      if (response.ok) {
        console.log(`Produit ${accion} avec succès`);
        fetchProductos();
      } else {
        const errorData = await response.json();
        console.error('Error del servidor:', errorData);
        alert(`Erreur lors de la ${accion} du produit: ${errorData.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error(`Error ${accion}do producto:`, error);
      alert(`Erreur de connexion lors de la ${accion} du produit`);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmacion = confirm(
      'Êtes-vous sûr de vouloir supprimer ce produit ?\n\n' +
      '⚠️ AVERTISSEMENT: Cette action supprimera le produit de Stripe et de la base de données.\n' +
      'Si le produit est dans des paniers ou des commandes, les références seront supprimées.\n\n' +
      'Voulez-vous continuer ?'
    );
    
    if (!confirmacion) return;
    
    try {
      console.log('Tentative de suppression du produit avec ID:', id);
      const response = await fetch(`/api/boutique/productos/${id}`, {
        method: 'DELETE'
      });
      
      console.log('Réponse du serveur:', response.status, response.statusText);
      
      if (response.ok) {
        console.log('Produit supprimé avec succès');
        alert('Produit supprimé correctement');
        fetchProductos();
      } else {
        const errorData = await response.json();
        console.error('Error del servidor:', errorData);
        alert(`Erreur lors de la suppression du produit: ${errorData.error || 'Erreur inconnue'}`);
      }
    } catch (error) {
      console.error('Error deleting producto:', error);
      alert('Erreur de connexion lors de la suppression du produit');
    }
  };

  const handleUpdatePedidoStatus = async (pedidoId: number, newStatus: string) => {
    try {
      const response = await fetch(`/api/boutique/pedidos/${pedidoId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: newStatus })
      });

      if (response.ok) {
        fetchPedidos();
      } else {
        console.error('Error updating pedido status');
      }
    } catch (error) {
      console.error('Error updating pedido status:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      precio: '',
      precio_original: '',
      stock: '',
      categoria: '',
      imagen_url: '',
      activo: true,
      destacado: false,
      orden: 0
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const getStatusIcon = (estado: string) => {
    switch (estado) {
      case 'en_traitement':
        return <Clock className="text-yellow-400" size={16} />;
      case 'traite':
        return <CheckCircle className="text-green-400" size={16} />;
      case 'pendiente':
        return <AlertCircle className="text-red-400" size={16} />;
      default:
        return <AlertCircle className="text-gray-400" size={16} />;
    }
  };

  const getStatusText = (estado: string) => {
    switch (estado) {
      case 'en_traitement':
        return 'En Traitement';
      case 'traite':
        return 'Traité';
      case 'pendiente':
        return 'En Attente';
      default:
        return estado;
    }
  };

  const getStatusColor = (estado: string) => {
    switch (estado) {
      case 'en_traitement':
        return 'bg-yellow-600 text-white';
      case 'traite':
        return 'bg-green-600 text-white';
      case 'pendiente':
        return 'bg-red-600 text-white';
      default:
        return 'bg-gray-600 text-white';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-dark flex items-center justify-center">
        <div className="text-primary text-xl">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-primary">Gestion de la Boutique</h1>
          {activeTab === 'productos' && (
            <button
              onClick={() => {
                setShowForm(true);
                setEditingProduct(null);
                resetForm();
              }}
              className="bg-primary text-secondary px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-yellow-400 transition-colors"
            >
              <Plus size={20} />
              Nouveau Produit
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-600 mb-6">
          <button
            onClick={() => setActiveTab('productos')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'productos'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-medium hover:text-light'
            }`}
          >
            <Package size={20} />
            Produits
          </button>
          <button
            onClick={() => setActiveTab('pedidos')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'pedidos'
                ? 'text-primary border-b-2 border-primary'
                : 'text-text-medium hover:text-light'
            }`}
          >
            <ShoppingCart size={20} />
            Commandes
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'productos' && (
          <>
            {/* Información de Stripe */}
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                <h3 className="text-blue-400 font-semibold">Synchronisation avec Stripe</h3>
              </div>
              <p className="text-blue-300 text-sm">
                Les produits se synchronisent automatiquement avec Stripe. Lors de la création, modification ou suppression d&apos;un produit ici, 
                les changements se refléteront automatiquement dans votre compte Stripe pour traiter les paiements.
              </p>
            </div>

            {/* Formulario de Productos */}
            {showForm && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-secondary rounded-lg p-6 mb-8"
              >
                <h2 className="text-xl font-semibold text-light mb-4">
                  {editingProduct ? 'Modifier le Produit' : 'Nouveau Produit'}
                </h2>
                
                <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-light mb-2">Nom *</label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-light focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-light mb-2">Catégorie</label>
                    <select
                      name="categoria"
                      value={formData.categoria}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-light focus:border-primary focus:outline-none"
                    >
                      <option value="">Sélectionner une catégorie</option>
                      <option value="productos_cabello">Produits Cheveux</option>
                      <option value="kits">Kits</option>
                      <option value="accesorios">Accessoires</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-light mb-2">Prix (€) *</label>
                    <input
                      type="number"
                      name="precio"
                      value={formData.precio}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      required
                      className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-light focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-light mb-2">Prix Original (€)</label>
                    <input
                      type="number"
                      name="precio_original"
                      value={formData.precio_original}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-light focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-light mb-2">Stock</label>
                    <input
                      type="number"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-light focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-light mb-2">Ordre</label>
                    <input
                      type="number"
                      name="orden"
                      value={formData.orden}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-light focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-light mb-2">Description</label>
                    <textarea
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleInputChange}
                      rows={3}
                      className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-light focus:border-primary focus:outline-none resize-none"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-light mb-2">URL de l&apos;Image</label>
                    <input
                      type="url"
                      name="imagen_url"
                      value={formData.imagen_url}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-light focus:border-primary focus:outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-light">
                      <input
                        type="checkbox"
                        name="activo"
                        checked={formData.activo}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary bg-dark border-gray-600 rounded focus:ring-primary focus:ring-2"
                      />
                      Actif
                    </label>
                    <label className="flex items-center gap-2 text-light">
                      <input
                        type="checkbox"
                        name="destacado"
                        checked={formData.destacado}
                        onChange={handleInputChange}
                        className="w-4 h-4 text-primary bg-dark border-gray-600 rounded focus:ring-primary focus:ring-2"
                      />
                      Vedette
                    </label>
                  </div>

                  <div className="md:col-span-2 flex gap-4">
                    <button
                      type="submit"
                      className="bg-primary text-secondary px-6 py-2 rounded hover:bg-yellow-400 transition-colors"
                    >
                      {editingProduct ? 'Mettre à jour' : 'Créer'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingProduct(null);
                        resetForm();
                      }}
                      className="bg-gray-600 text-light px-6 py-2 rounded hover:bg-gray-700 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* Lista de Productos */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {productos.map((producto) => (
                <motion.div
                  key={producto.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-secondary rounded-lg overflow-hidden shadow-lg"
                >
                  <div className="relative h-48">
                    <Image
                      src={producto.imagen_url || '/placeholder-profile.jpg'}
                      alt={producto.nombre}
                      fill
                      className="object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      {producto.activo ? (
                        <Eye className="text-green-400" size={16} />
                      ) : (
                        <EyeOff className="text-red-400" size={16} />
                      )}
                      {producto.destacado && (
                        <div className="bg-primary text-secondary text-xs px-2 py-1 rounded">
                          Vedette
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="p-4">
                    <h3 className="text-lg font-semibold text-light mb-2">{producto.nombre}</h3>
                    <p className="text-text-medium text-sm mb-3 line-clamp-2">{producto.descripcion}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-bold">{producto.precio.toFixed(2)}€</span>
                        {producto.precio_original && (
                          <span className="text-text-medium line-through text-sm">
                            {producto.precio_original.toFixed(2)}€
                          </span>
                        )}
                      </div>
                      <span className="text-text-medium text-sm">Stock: {producto.stock}</span>
                    </div>
                    
                    {/* Indicador de sincronización con Stripe */}
                    <div className="flex items-center gap-2 mb-3">
                      {producto.stripe_product_id ? (
                        <div className="flex items-center gap-1 text-green-400 text-xs">
                          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                          Synchronisé avec Stripe
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-yellow-400 text-xs">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                          En attente de synchronisation
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(producto)}
                        className="flex-1 bg-primary text-secondary py-2 rounded text-sm hover:bg-yellow-400 transition-colors flex items-center justify-center gap-1"
                      >
                        <Edit size={14} />
                        Modifier
                      </button>
                      <button
                        onClick={() => handleToggleActive(producto)}
                        className={`py-2 px-3 rounded text-sm transition-colors ${
                          producto.activo 
                            ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        title={producto.activo ? 'Désactiver le produit' : 'Activer le produit'}
                      >
                        {producto.activo ? 'Désactiver' : 'Activer'}
                      </button>
                      <button
                        onClick={() => handleDelete(producto.id)}
                        className="bg-red-600 text-white py-2 px-3 rounded text-sm hover:bg-red-700 transition-colors"
                        title="Supprimer le produit définitivement"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {productos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-text-medium text-lg">Aucun produit disponible</p>
              </div>
            )}
          </>
        )}

        {activeTab === 'pedidos' && (
          <>
            {/* Lista de Pedidos */}
            <div className="space-y-6">
              {pedidos.map((pedido) => (
                <motion.div
                  key={pedido.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-secondary rounded-lg p-6 shadow-lg"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-xl font-semibold text-light">
                          Commande #{pedido.id}
                        </h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(pedido.estado)}`}>
                          {getStatusIcon(pedido.estado)}
                          <span className="ml-1">{getStatusText(pedido.estado)}</span>
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-text-medium">Client:</p>
                          <p className="text-light font-medium">{pedido.cliente_nombre}</p>
                          <p className="text-text-medium">{pedido.cliente_email}</p>
                          {pedido.cliente_telefono && (
                            <p className="text-text-medium">{pedido.cliente_telefono}</p>
                          )}
                        </div>
                        <div>
                          <p className="text-text-medium">Adresse:</p>
                          <p className="text-light">{pedido.cliente_direccion || 'Non spécifiée'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{parseFloat(pedido.total).toFixed(2)}€</p>
                      <p className="text-text-medium text-sm">
                        {formatDate(pedido.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Items del pedido */}
                  {pedido.items && pedido.items.length > 0 && (
                    <div className="border-t border-gray-600 pt-4 mb-4">
                      <h4 className="text-lg font-semibold text-light mb-3">Articles commandés:</h4>
                      <div className="space-y-2">
                        {pedido.items.map((item) => (
                          <div key={item.id} className="flex items-center gap-3 p-3 bg-dark rounded">
                            {item.producto && (
                              <div className="relative w-12 h-12">
                                <Image
                                  src={item.producto.imagen_url || '/placeholder-profile.jpg'}
                                  alt={item.producto.nombre}
                                  fill
                                  className="object-cover rounded"
                                />
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="text-light font-medium">
                                {item.producto?.nombre || `Produit #${item.producto_id}`}
                              </p>
                              <p className="text-text-medium text-sm">
                                Quantité: {item.cantidad} × {parseFloat(item.precio_unitario).toFixed(2)}€
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-primary font-semibold">
                                {parseFloat(item.subtotal).toFixed(2)}€
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-600">
                    <div className="flex-1">
                      <label className="block text-light mb-2">Statut de la commande:</label>
                      <select
                        value={pedido.estado}
                        onChange={(e) => handleUpdatePedidoStatus(pedido.id, e.target.value)}
                        className="w-full px-3 py-2 bg-dark border border-gray-600 rounded text-light focus:border-primary focus:outline-none"
                      >
                        <option value="pendiente">En Attente</option>
                        <option value="en_traitement">En Traitement</option>
                        <option value="traite">Traité</option>
                      </select>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          // Aquí podrías implementar la funcionalidad para ver detalles completos
                          alert(`Détails de la commande #${pedido.id}\n\nClient: ${pedido.cliente_nombre}\nEmail: ${pedido.cliente_email}\nTotal: ${pedido.total}€\nStatut: ${getStatusText(pedido.estado)}`);
                        }}
                        className="bg-primary text-secondary px-4 py-2 rounded hover:bg-yellow-400 transition-colors"
                      >
                        Voir Détails
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {pedidos.length === 0 && (
              <div className="text-center py-12">
                <p className="text-text-medium text-lg">Aucune commande disponible</p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
} 