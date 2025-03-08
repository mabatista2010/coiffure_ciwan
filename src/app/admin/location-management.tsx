'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';

// Definir la interfaz Location
interface Location {
  id: string;
  name: string;
  address: string;
  description?: string;
  phone?: string;
  email?: string;
  image?: string;
  active: boolean;
}

export default function LocationManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [newLocation, setNewLocation] = useState<Partial<Location>>({
    name: '',
    address: '',
    description: '',
    phone: '',
    email: '',
    image: '',
    active: true,
  });

  const [locationImageFile, setLocationImageFile] = useState<File | null>(null);
  const [locationImagePreview, setLocationImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const locationImageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('name');
    
    if (data) {
      setLocations(data);
    } else if (error) {
      console.error('Erreur lors du chargement des centres:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLocationImageFile(file);
      
      // Créer une URL pour la prévisualisation
      const previewUrl = URL.createObjectURL(file);
      setLocationImagePreview(previewUrl);
    }
  };

  const uploadImage = async (file: File) => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('centros')
        .upload(filePath, file);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Obtenir l'URL publique
      const { data } = supabase.storage
        .from('centros')
        .getPublicUrl(filePath);
      
      return data.publicUrl;
    } catch (error) {
      console.error('Erreur lors du téléversement de l\'image:', error);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let imageUrl = '';
      
      if (locationImageFile) {
        imageUrl = await uploadImage(locationImageFile) || '';
      }
      
      const newLocationData = {
        ...newLocation,
        id: uuidv4(),
        image: imageUrl,
        created_at: new Date().toISOString(),
      };
      
      const { error } = await supabase
        .from('locations')
        .insert([newLocationData]);
      
      if (error) {
        throw error;
      }
      
      // Réinitialiser le formulaire
      setNewLocation({
        name: '',
        address: '',
        description: '',
        phone: '',
        email: '',
        image: '',
        active: true,
      });
      setLocationImageFile(null);
      setLocationImagePreview('');
      if (locationImageInputRef.current) {
        locationImageInputRef.current.value = '';
      }
      
      // Recharger les centres
      loadLocations();
    } catch (error) {
      console.error('Erreur lors de l\'ajout du centre:', error);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingLocation) return;
    
    try {
      let imageUrl = editingLocation.image || '';
      
      if (locationImageFile) {
        imageUrl = await uploadImage(locationImageFile) || imageUrl;
      }
      
      const updatedLocationData = {
        ...editingLocation,
        image: imageUrl,
      };
      
      const { error } = await supabase
        .from('locations')
        .update(updatedLocationData)
        .eq('id', editingLocation.id);
      
      if (error) {
        throw error;
      }
      
      // Réinitialiser le formulaire
      setEditingLocation(null);
      setLocationImageFile(null);
      setLocationImagePreview('');
      if (locationImageInputRef.current) {
        locationImageInputRef.current.value = '';
      }
      
      // Recharger les centres
      loadLocations();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du centre:', error);
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocationImagePreview(location.image || '');
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce centre ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Recharger les centres
      loadLocations();
    } catch (error) {
      console.error('Erreur lors de la suppression du centre:', error);
    }
  };

  const cancelEdit = () => {
    setEditingLocation(null);
    setLocationImageFile(null);
    setLocationImagePreview('');
    if (locationImageInputRef.current) {
      locationImageInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-6">
        <h2 className="text-xl font-bold text-secondary mb-4">
          {editingLocation ? 'Modifier un Centre' : 'Ajouter un Nouveau Centre'}
        </h2>
        
        <form onSubmit={editingLocation ? handleUpdateLocation : handleAddLocation} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-text-dark text-sm font-bold mb-2">Nom</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded"
              value={editingLocation ? editingLocation.name : newLocation.name}
              onChange={(e) => editingLocation 
                ? setEditingLocation({...editingLocation, name: e.target.value})
                : setNewLocation({...newLocation, name: e.target.value})
              }
              required
            />
          </div>
          
          <div>
            <label className="block text-text-dark text-sm font-bold mb-2">Adresse</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded"
              value={editingLocation ? editingLocation.address : newLocation.address}
              onChange={(e) => editingLocation 
                ? setEditingLocation({...editingLocation, address: e.target.value})
                : setNewLocation({...newLocation, address: e.target.value})
              }
              required
            />
          </div>
          
          <div>
            <label className="block text-text-dark text-sm font-bold mb-2">Téléphone</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-gray-300 rounded"
              value={editingLocation ? editingLocation.phone || '' : newLocation.phone || ''}
              onChange={(e) => editingLocation 
                ? setEditingLocation({...editingLocation, phone: e.target.value})
                : setNewLocation({...newLocation, phone: e.target.value})
              }
            />
          </div>
          
          <div>
            <label className="block text-text-dark text-sm font-bold mb-2">Email</label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-gray-300 rounded"
              value={editingLocation ? editingLocation.email || '' : newLocation.email || ''}
              onChange={(e) => editingLocation 
                ? setEditingLocation({...editingLocation, email: e.target.value})
                : setNewLocation({...newLocation, email: e.target.value})
              }
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-text-dark text-sm font-bold mb-2">Description</label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded"
              rows={3}
              value={editingLocation ? editingLocation.description || '' : newLocation.description || ''}
              onChange={(e) => editingLocation 
                ? setEditingLocation({...editingLocation, description: e.target.value})
                : setNewLocation({...newLocation, description: e.target.value})
              }
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-text-dark text-sm font-bold mb-2">Image du Centre</label>
            <input
              ref={locationImageInputRef}
              type="file"
              accept="image/*"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
              onChange={handleFileChange}
            />
            
            {(locationImagePreview || (editingLocation && editingLocation.image)) && (
              <div className="relative h-40 mt-2 rounded overflow-hidden">
                <Image 
                  src={locationImagePreview || (editingLocation?.image || '')} 
                  alt="Prévisualisation du Centre" 
                  width={200} 
                  height={150} 
                  className="absolute inset-0 w-full h-full object-cover"
                />
              </div>
            )}
          </div>
          
          <div className="md:col-span-2 flex space-x-2">
            <button
              type="submit"
              className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
              disabled={isUploading}
            >
              {isUploading ? 'Téléchargement en cours...' : (editingLocation ? 'Mettre à Jour' : 'Ajouter')}
            </button>
            
            {editingLocation && (
              <button
                type="button"
                className="bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded hover:bg-gray-400 transition duration-300"
                onClick={cancelEdit}
              >
                Annuler
              </button>
            )}
          </div>
        </form>
        
        <h2 className="text-xl font-bold text-secondary mb-4">Liste des Centres</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead>
              <tr>
                <th className="py-2 px-4 border-b text-left text-text-dark">Nom</th>
                <th className="py-2 px-4 border-b text-left text-text-dark">Adresse</th>
                <th className="py-2 px-4 border-b text-left text-text-dark">Téléphone</th>
                <th className="py-2 px-4 border-b text-left text-text-dark">Email</th>
                <th className="py-2 px-4 border-b text-left text-text-dark">Image</th>
                <th className="py-2 px-4 border-b text-left text-text-dark">Actions</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((location) => (
                <tr key={location.id}>
                  <td className="py-2 px-4 border-b text-text-dark">{location.name}</td>
                  <td className="py-2 px-4 border-b text-text-dark">{location.address}</td>
                  <td className="py-2 px-4 border-b text-text-dark">{location.phone}</td>
                  <td className="py-2 px-4 border-b text-text-dark">{location.email}</td>
                  <td className="py-2 px-4 border-b">
                    {location.image && (
                      <div className="relative h-16 w-16 rounded overflow-hidden">
                        <Image 
                          src={location.image} 
                          alt={location.name} 
                          width={64} 
                          height={64} 
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </td>
                  <td className="py-2 px-4 border-b">
                    <button
                      onClick={() => handleEditLocation(location)}
                      className="text-blue-600 hover:text-blue-800 font-medium mr-2"
                    >
                      Modifier
                    </button>
                    <button
                      onClick={() => handleDeleteLocation(location.id)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} 