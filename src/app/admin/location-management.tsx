'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';

// Definir días de la semana
const weekdays = [
  { id: 0, name: 'Dimanche' },
  { id: 1, name: 'Lundi' },
  { id: 2, name: 'Mardi' },
  { id: 3, name: 'Mercredi' },
  { id: 4, name: 'Jeudi' },
  { id: 5, name: 'Vendredi' },
  { id: 6, name: 'Samedi' }
];

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

// Interfaz para los horarios de centros
interface LocationHour {
  id?: string;
  location_id: string;
  day_of_week: number;
  slot_number: number;
  start_time: string;
  end_time: string;
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
  const [showAddForm, setShowAddForm] = useState(false);

  const [locationImageFile, setLocationImageFile] = useState<File | null>(null);
  const [locationImagePreview, setLocationImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const locationImageInputRef = useRef<HTMLInputElement>(null);

  // Estado para los horarios del centro
  const [locationHours, setLocationHours] = useState<{
    [day: number]: Array<{ start: string; end: string }>
  }>({
    0: [{ start: '', end: '' }],
    1: [{ start: '', end: '' }],
    2: [{ start: '', end: '' }],
    3: [{ start: '', end: '' }],
    4: [{ start: '', end: '' }],
    5: [{ start: '', end: '' }],
    6: [{ start: '', end: '' }],
  });

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

  // Función para cargar los horarios de un centro
  const loadLocationHours = async (locationId: string) => {
    const { data, error } = await supabase
      .from('location_hours')
      .select('*')
      .eq('location_id', locationId)
      .order('day_of_week')
      .order('slot_number');
    
    if (error) {
      console.error('Erreur lors du chargement des horaires:', error);
      return;
    }
    
    // Inicializar estructura de horarios
    const initialHours: {
      [day: number]: Array<{ start: string; end: string }>
    } = {};
    
    // Inicializar cada día con un slot vacío
    weekdays.forEach(day => {
      initialHours[day.id] = [{ start: '', end: '' }];
    });
    
    // Rellenar con datos existentes
    if (data && data.length > 0) {
      data.forEach(hour => {
        const dayOfWeek = hour.day_of_week;
        const slotNumber = hour.slot_number;
        
        // Asegurarse de que el día existe en el objeto
        if (!initialHours[dayOfWeek]) {
          initialHours[dayOfWeek] = [];
        }
        
        // Si el número de slot es mayor que la longitud del array, rellenar con slots vacíos
        while (initialHours[dayOfWeek].length <= slotNumber) {
          initialHours[dayOfWeek].push({ start: '', end: '' });
        }
        
        // Actualizar el slot específico
        initialHours[dayOfWeek][slotNumber] = {
          start: hour.start_time.substring(0, 5), // Convertir "09:00:00" a "09:00"
          end: hour.end_time.substring(0, 5)
        };
      });
    }
    
    setLocationHours(initialHours);
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

  // Funciones para gestionar los horarios
  const addTimeSlot = (dayOfWeek: number) => {
    setLocationHours(prev => {
      const updatedHours = { ...prev };
      updatedHours[dayOfWeek] = [
        ...updatedHours[dayOfWeek],
        { start: '', end: '' }
      ];
      return updatedHours;
    });
  };

  const removeTimeSlot = (dayOfWeek: number, slotIndex: number) => {
    setLocationHours(prev => {
      const updatedHours = { ...prev };
      if (updatedHours[dayOfWeek].length > 1) {
        updatedHours[dayOfWeek] = updatedHours[dayOfWeek].filter((_, index) => index !== slotIndex);
      } else {
        updatedHours[dayOfWeek] = [{ start: '', end: '' }];
      }
      return updatedHours;
    });
  };

  const updateTimeSlot = (dayOfWeek: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    setLocationHours(prev => {
      const updatedHours = { ...prev };
      updatedHours[dayOfWeek][slotIndex][field] = value;
      return updatedHours;
    });
  };

  // Función para guardar los horarios en la base de datos
  const saveLocationHours = async (locationId: string) => {
    try {
      // Primero eliminamos los horarios existentes
      const { error: deleteError } = await supabase
        .from('location_hours')
        .delete()
        .eq('location_id', locationId);
      
      if (deleteError) {
        throw deleteError;
      }
      
      // Preparamos los nuevos horarios
      const newHours: LocationHour[] = [];
      
      Object.entries(locationHours).forEach(([dayStr, slots]) => {
        const day = parseInt(dayStr);
        
        slots.forEach((slot, index) => {
          // Solo guardar slots con valores válidos
          if (slot.start && slot.end) {
            newHours.push({
              location_id: locationId,
              day_of_week: day,
              slot_number: index,
              start_time: `${slot.start}:00`,
              end_time: `${slot.end}:00`
            });
          }
        });
      });
      
      if (newHours.length > 0) {
        const { error: insertError } = await supabase
          .from('location_hours')
          .insert(newHours);
        
        if (insertError) {
          throw insertError;
        }
      }
    } catch (error) {
      console.error('Erreur lors de la sauvegarde des horaires:', error);
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
      
      const { data, error } = await supabase
        .from('locations')
        .insert([newLocationData])
        .select();
      
      if (error) {
        throw error;
      }
      
      if (data && data.length > 0) {
        // Guardar los horarios del centro
        await saveLocationHours(data[0].id);
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
      
      // Reiniciar horarios
      initializeEmptyHours();
      
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
      
      // Guardar los horarios actualizados
      await saveLocationHours(editingLocation.id);
      
      // Réinitialiser le formulaire
      setEditingLocation(null);
      setLocationImageFile(null);
      setLocationImagePreview('');
      if (locationImageInputRef.current) {
        locationImageInputRef.current.value = '';
      }
      
      // Reiniciar horarios
      initializeEmptyHours();
      
      // Recharger les centres
      loadLocations();
    } catch (error) {
      console.error('Erreur lors de la mise à jour du centre:', error);
    }
  };

  const handleEditLocation = async (location: Location) => {
    setEditingLocation(location);
    setLocationImagePreview(location.image || '');
    setShowAddForm(true);
    
    // Cargar los horarios del centro
    await loadLocationHours(location.id);
    
    // Desplazar automáticamente hacia la parte superior con animación suave
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteLocation = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce centre ? Cette action est irréversible.')) {
      return;
    }
    
    try {
      // Primero eliminamos los horarios asociados
      const { error: hoursError } = await supabase
        .from('location_hours')
        .delete()
        .eq('location_id', id);
      
      if (hoursError) {
        console.error('Erreur lors de la suppression des horaires:', hoursError);
      }
      
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
    
    // Reiniciar horarios
    initializeEmptyHours();
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingLocation) {
      await handleUpdateLocation(e);
    } else {
      await handleAddLocation(e);
      setShowAddForm(false); // Ocultar el formulario después de añadir
    }
  };

  // Inicializar horarios vacíos
  const initializeEmptyHours = () => {
    const emptyHours: {
      [day: number]: Array<{ start: string; end: string }>
    } = {};
    
    weekdays.forEach(day => {
      emptyHours[day.id] = [{ start: '', end: '' }];
    });
    
    setLocationHours(emptyHours);
  };

  return (
    <div className="bg-black text-white p-6">
      {/* Botón desplegable para agregar nuevo centro */}
      {!editingLocation && (
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-white text-black px-6 py-2 rounded-md mb-6 hover:bg-yellow-300 transition-colors border-2 border-primary font-bold"
        >
          {showAddForm ? 'Cerrar formulario' : 'Agregar un Nuevo Centro'} 
        </button>
      )}
      
      {/* Formulario para agregar/editar centro */}
      {(showAddForm || editingLocation) && (
        <div className="bg-white text-black shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">
              {editingLocation ? 'Modifier un Centre' : 'Ajouter un Nouveau Centre'}
            </h2>
            
            <form onSubmit={handleFormSubmit} className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
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
              </div>
              
              {/* Sección de horarios */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-secondary mb-4">Horaires du Centre</h3>
                
                {weekdays.map((day) => (
                  <div key={day.id} className="mb-4">
                    <h4 className="font-semibold mb-2">{day.name}</h4>
                    
                    {locationHours[day.id].map((slot, slotIndex) => (
                      <div key={slotIndex} className="flex items-center mb-2 gap-2">
                        <input
                          type="time"
                          className="px-3 py-2 border border-gray-300 rounded"
                          value={slot.start}
                          onChange={(e) => updateTimeSlot(day.id, slotIndex, 'start', e.target.value)}
                        />
                        <span className="mx-2">-</span>
                        <input
                          type="time"
                          className="px-3 py-2 border border-gray-300 rounded"
                          value={slot.end}
                          onChange={(e) => updateTimeSlot(day.id, slotIndex, 'end', e.target.value)}
                        />
                        
                        <button
                          type="button"
                          onClick={() => removeTimeSlot(day.id, slotIndex)}
                          className="ml-2 text-red-600 hover:text-red-800"
                          disabled={locationHours[day.id].length === 1 && !slot.start && !slot.end}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => addTimeSlot(day.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      + Ajouter un créneau horaire
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex space-x-2">
                <button
                  type="submit"
                  className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Téléchargement en cours...' : (editingLocation ? 'Mettre à Jour' : 'Ajouter')}
                </button>
                
                <button
                  type="button"
                  className="bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded hover:bg-gray-400 transition duration-300"
                  onClick={() => {
                    cancelEdit();
                    setShowAddForm(false);
                  }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Tabla de centros (siempre visible) */}
      <div className="bg-white text-black shadow-lg rounded-lg overflow-hidden">
        <div className="p-6">
          <h2 className="text-xl font-bold text-secondary mb-4">Liste des Centres</h2>
          
          {/* Vista de tabla para pantallas grandes */}
          <div className="hidden md:block overflow-x-auto">
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
          
          {/* Vista de tarjetas para pantallas pequeñas */}
          <div className="md:hidden space-y-4">
            {locations.map((location) => (
              <div key={location.id} className="border rounded-lg p-4 shadow-sm">
                <div className="flex">
                  {location.image && (
                    <div className="relative h-20 w-20 rounded overflow-hidden mr-3 flex-shrink-0">
                      <Image 
                        src={location.image} 
                        alt={location.name} 
                        width={80} 
                        height={80} 
                        className="absolute inset-0 w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div>
                    <h3 className="font-bold text-lg text-text-dark">{location.name}</h3>
                    <p className="text-sm text-gray-600 mb-1">{location.address}</p>
                  </div>
                </div>
                
                <div className="mt-3 space-y-1">
                  {location.phone && (
                    <p className="text-sm">
                      <span className="font-medium">Téléphone:</span> {location.phone}
                    </p>
                  )}
                  {location.email && (
                    <p className="text-sm">
                      <span className="font-medium">Email:</span> {location.email}
                    </p>
                  )}
                </div>
                
                <div className="flex space-x-2 pt-3 mt-3 border-t">
                  <button
                    onClick={() => handleEditLocation(location)}
                    className="flex-1 text-center py-1 rounded bg-blue-100 text-blue-700 font-medium text-sm"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteLocation(location.id)}
                    className="flex-1 text-center py-1 rounded bg-red-100 text-red-700 font-medium text-sm"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 