'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { Plus, Edit, Trash2, Eye, EyeOff, Package, ShoppingCart, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { AdminCard, AdminCardContent, AdminCardHeader, SectionHeader } from '@/components/admin/ui';
import { Badge, type BadgeProps } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

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

  const getStatusVariant = (estado: string): BadgeProps['variant'] => {
    switch (estado) {
      case 'en_traitement':
        return 'warning';
      case 'traite':
        return 'success';
      case 'pendiente':
        return 'destructive';
      default:
        return 'secondary';
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
      <div className="admin-scope min-h-screen bg-dark px-4 py-8 text-zinc-100">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
          <AdminCard>
            <AdminCardContent className="flex min-h-56 items-center justify-center gap-3 text-zinc-300">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
              Chargement de la boutique...
            </AdminCardContent>
          </AdminCard>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-scope min-h-screen bg-dark px-4 py-8 text-zinc-100">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <SectionHeader
          title="Gestion de la Boutique"
          description="Produits, synchronisation Stripe et suivi des commandes."
          actions={
            activeTab === 'productos' ? (
              <Button
                type="button"
                onClick={() => {
                  setShowForm(true);
                  setEditingProduct(null);
                  resetForm();
                }}
              >
                <Plus size={20} />
                Nouveau Produit
              </Button>
            ) : null
          }
        />

        <div className="flex flex-wrap gap-2 rounded-2xl border border-white/10 bg-black/30 p-2">
          <Button
            type="button"
            variant={activeTab === 'productos' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('productos')}
            className="flex-1 justify-center sm:flex-none"
          >
            <Package size={20} />
            Produits
          </Button>
          <Button
            type="button"
            variant={activeTab === 'pedidos' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('pedidos')}
            className="flex-1 justify-center sm:flex-none"
          >
            <ShoppingCart size={20} />
            Commandes
          </Button>
        </div>

        {activeTab === 'productos' ? (
          <div className="space-y-6">
            <AdminCard tone="highlight">
              <AdminCardContent className="space-y-3 py-5">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-sky-400" />
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-sky-300">
                    Synchronisation avec Stripe
                  </h3>
                </div>
                <p className="text-sm text-zinc-300">
                  Toute création, édition ou suppression d&apos;un produit est
                  synchronisée automatiquement avec Stripe.
                </p>
              </AdminCardContent>
            </AdminCard>

            {showForm ? (
              <motion.div initial={{ opacity: 0, y: -18 }} animate={{ opacity: 1, y: 0 }}>
                <AdminCard>
                  <AdminCardHeader>
                    <h3 className="text-xl font-semibold text-zinc-100">
                      {editingProduct ? 'Modifier le produit' : 'Nouveau produit'}
                    </h3>
                    <p className="text-sm text-zinc-400">
                      Les champs marqués d&apos;une étoile sont obligatoires.
                    </p>
                  </AdminCardHeader>
                  <AdminCardContent>
                    <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-200">Nom *</label>
                        <Input
                          type="text"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-200">Catégorie</label>
                        <Select
                          value={formData.categoria}
                          onValueChange={(value) =>
                            setFormData((prev) => ({
                              ...prev,
                              categoria: value,
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner une catégorie" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="productos_cabello">Produits cheveux</SelectItem>
                            <SelectItem value="kits">Kits</SelectItem>
                            <SelectItem value="accesorios">Accessoires</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-200">Prix (€) *</label>
                        <Input
                          type="number"
                          name="precio"
                          value={formData.precio}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-200">Prix original (€)</label>
                        <Input
                          type="number"
                          name="precio_original"
                          value={formData.precio_original}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-200">Stock</label>
                        <Input
                          type="number"
                          name="stock"
                          value={formData.stock}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-200">Ordre</label>
                        <Input
                          type="number"
                          name="orden"
                          value={formData.orden}
                          onChange={handleInputChange}
                          min="0"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-zinc-200">Description</label>
                        <Textarea
                          name="descripcion"
                          value={formData.descripcion}
                          onChange={handleInputChange}
                          rows={3}
                          className="resize-none"
                        />
                      </div>

                      <div className="space-y-2 md:col-span-2">
                        <label className="text-sm font-medium text-zinc-200">URL de l&apos;image</label>
                        <Input
                          type="url"
                          name="imagen_url"
                          value={formData.imagen_url}
                          onChange={handleInputChange}
                        />
                      </div>

                      <div className="flex flex-wrap items-center gap-5 md:col-span-2">
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
                          <input
                            type="checkbox"
                            name="activo"
                            checked={formData.activo}
                            onChange={handleInputChange}
                            className="h-4 w-4 rounded border-white/25 bg-black/30 text-primary focus:ring-primary/40"
                          />
                          Actif
                        </label>
                        <label className="inline-flex items-center gap-2 text-sm text-zinc-200">
                          <input
                            type="checkbox"
                            name="destacado"
                            checked={formData.destacado}
                            onChange={handleInputChange}
                            className="h-4 w-4 rounded border-white/25 bg-black/30 text-primary focus:ring-primary/40"
                          />
                          Vedette
                        </label>
                      </div>

                      <div className="flex flex-wrap gap-3 md:col-span-2">
                        <Button type="submit">
                          {editingProduct ? 'Mettre à jour' : 'Créer'}
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setShowForm(false);
                            setEditingProduct(null);
                            resetForm();
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                    </form>
                  </AdminCardContent>
                </AdminCard>
              </motion.div>
            ) : null}

            {productos.length === 0 ? (
              <AdminCard>
                <AdminCardContent className="py-12 text-center text-zinc-400">
                  Aucun produit disponible.
                </AdminCardContent>
              </AdminCard>
            ) : (
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                {productos.map((producto) => (
                  <motion.div
                    key={producto.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <AdminCard className="h-full overflow-hidden">
                      <div className="relative h-52">
                        <Image
                          src={producto.imagen_url || '/placeholder-profile.jpg'}
                          alt={producto.nombre}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <AdminCardContent className="space-y-4 pt-5">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-lg font-semibold text-zinc-100">
                              {producto.nombre}
                            </h3>
                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant={producto.activo ? 'success' : 'destructive'}
                                className="normal-case tracking-normal"
                              >
                                {producto.activo ? (
                                  <Eye className="h-3.5 w-3.5" />
                                ) : (
                                  <EyeOff className="h-3.5 w-3.5" />
                                )}
                                {producto.activo ? 'Actif' : 'Inactif'}
                              </Badge>
                              {producto.destacado ? (
                                <Badge variant="outline" className="normal-case tracking-normal">
                                  Vedette
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                          <p className="line-clamp-2 text-sm text-zinc-400">
                            {producto.descripcion || 'Sans description.'}
                          </p>
                        </div>

                        <div className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-semibold text-primary">
                              {producto.precio.toFixed(2)}€
                            </span>
                            {producto.precio_original ? (
                              <span className="text-sm text-zinc-500 line-through">
                                {producto.precio_original.toFixed(2)}€
                              </span>
                            ) : null}
                          </div>
                          <span className="text-sm text-zinc-300">Stock: {producto.stock}</span>
                        </div>

                        <Badge
                          variant={producto.stripe_product_id ? 'success' : 'warning'}
                          className="w-fit gap-2 normal-case tracking-normal"
                        >
                          <span
                            className={`h-2 w-2 rounded-full ${
                              producto.stripe_product_id ? 'bg-emerald-400' : 'animate-pulse bg-amber-400'
                            }`}
                          />
                          {producto.stripe_product_id
                            ? 'Synchronisé avec Stripe'
                            : 'En attente de synchronisation'}
                        </Badge>

                        <div className="flex flex-wrap gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            className="flex-1"
                            onClick={() => handleEdit(producto)}
                          >
                            <Edit size={14} />
                            Modifier
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant={producto.activo ? 'outline' : 'default'}
                            onClick={() => handleToggleActive(producto)}
                            title={producto.activo ? 'Désactiver le produit' : 'Activer le produit'}
                          >
                            {producto.activo ? 'Désactiver' : 'Activer'}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(producto.id)}
                            title="Supprimer le produit définitivement"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </AdminCardContent>
                    </AdminCard>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {pedidos.length === 0 ? (
              <AdminCard>
                <AdminCardContent className="py-12 text-center text-zinc-400">
                  Aucune commande disponible.
                </AdminCardContent>
              </AdminCard>
            ) : (
              pedidos.map((pedido) => (
                <motion.div
                  key={pedido.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <AdminCard>
                    <AdminCardContent className="space-y-5 pt-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                        <div className="space-y-3">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-xl font-semibold text-zinc-100">
                              Commande #{pedido.id}
                            </h3>
                            <Badge
                              variant={getStatusVariant(pedido.estado)}
                              className="gap-1 normal-case tracking-normal"
                            >
                              {getStatusIcon(pedido.estado)}
                              {getStatusText(pedido.estado)}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                              <p className="text-xs uppercase tracking-wide text-zinc-500">Client</p>
                              <p className="mt-1 font-medium text-zinc-100">{pedido.cliente_nombre}</p>
                              <p className="mt-1 text-zinc-400">{pedido.cliente_email}</p>
                              {pedido.cliente_telefono ? (
                                <p className="text-zinc-400">{pedido.cliente_telefono}</p>
                              ) : null}
                            </div>
                            <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-sm">
                              <p className="text-xs uppercase tracking-wide text-zinc-500">Adresse</p>
                              <p className="mt-1 text-zinc-200">
                                {pedido.cliente_direccion || 'Non spécifiée'}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-primary/25 bg-primary/10 px-4 py-3 text-right">
                          <p className="text-2xl font-semibold text-primary">
                            {parseFloat(pedido.total).toFixed(2)}€
                          </p>
                          <p className="text-xs text-zinc-400">{formatDate(pedido.created_at)}</p>
                        </div>
                      </div>

                      {pedido.items && pedido.items.length > 0 ? (
                        <div className="space-y-2 border-t border-white/10 pt-4">
                          <h4 className="text-sm font-semibold uppercase tracking-wide text-zinc-300">
                            Articles commandés
                          </h4>
                          <div className="space-y-2">
                            {pedido.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
                              >
                                {item.producto ? (
                                  <div className="relative h-12 w-12 overflow-hidden rounded-lg">
                                    <Image
                                      src={item.producto.imagen_url || '/placeholder-profile.jpg'}
                                      alt={item.producto.nombre}
                                      fill
                                      className="object-cover"
                                    />
                                  </div>
                                ) : null}
                                <div className="flex-1">
                                  <p className="font-medium text-zinc-100">
                                    {item.producto?.nombre || `Produit #${item.producto_id}`}
                                  </p>
                                  <p className="text-sm text-zinc-400">
                                    Quantité: {item.cantidad} × {parseFloat(item.precio_unitario).toFixed(2)}€
                                  </p>
                                </div>
                                <p className="font-semibold text-primary">
                                  {parseFloat(item.subtotal).toFixed(2)}€
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : null}

                      <div className="flex flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-end md:justify-between">
                        <div className="w-full md:max-w-xs">
                          <label className="mb-2 block text-sm font-medium text-zinc-200">
                            Statut de la commande
                          </label>
                          <Select
                            value={pedido.estado}
                            onValueChange={(value) => handleUpdatePedidoStatus(pedido.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Statut de la commande" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pendiente">En attente</SelectItem>
                              <SelectItem value="en_traitement">En traitement</SelectItem>
                              <SelectItem value="traite">Traité</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            alert(
                              `Détails de la commande #${pedido.id}\n\nClient: ${pedido.cliente_nombre}\nEmail: ${pedido.cliente_email}\nTotal: ${pedido.total}€\nStatut: ${getStatusText(pedido.estado)}`
                            );
                          }}
                        >
                          Voir détails
                        </Button>
                      </div>
                    </AdminCardContent>
                  </AdminCard>
                </motion.div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
