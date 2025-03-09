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
      setIsUploading(true);
      
      let imageUrl = '';
      
      if (locationImageFile) {
        imageUrl = await uploadImage(locationImageFile) || '';
      }
      
      const newLocationData = {
        id: uuidv4(),
        name: newLocation.name,
        address: newLocation.address,
        description: newLocation.description,
        phone: newLocation.phone,
        email: newLocation.email,
        image: imageUrl,
        active: true
      };
      
      const { error } = await supabase
        .from('locations')
        .insert(newLocationData);
        
      if (error) {
        throw error;
      }
      
      // Guardar los horarios para el nuevo centro
      await saveLocationHours(newLocationData.id);
      
      // Reiniciar el formulario
      setNewLocation({
        name: '',
        address: '',
        description: '',
        phone: '',
        email: '',
        image: '',
        active: true
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
      
      setIsUploading(false);
    } catch (error) {
      console.error('Erreur lors de l\'ajout du centre:', error);
      setIsUploading(false);
    }
  };

  const handleUpdateLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingLocation) return;
    
    try {
      setIsUploading(true);
      
      let imageUrl = editingLocation.image || '';
      
      if (locationImageFile) {
        // Si hay una imagen nueva para subir
        imageUrl = await uploadImage(locationImageFile) || '';
      }
      
      // Actualizar información principal
      const { error } = await supabase
        .from('locations')
        .update({
          name: editingLocation.name,
          address: editingLocation.address,
          description: editingLocation.description,
          phone: editingLocation.phone,
          email: editingLocation.email,
          image: imageUrl,
          active: true
        })
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
      setShowAddForm(false);
      
      if (locationImageInputRef.current) {
        locationImageInputRef.current.value = '';
      }
      
      // Reiniciar horarios
      initializeEmptyHours();
      
      // Recharger les centres
      loadLocations();
      
      setIsUploading(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour du centre:', error);
      setIsUploading(false);
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
    setShowAddForm(false);
    
    // Inicializar horarios vacíos
    initializeEmptyHours();
    
    if (locationImageInputRef.current) {
      locationImageInputRef.current.value = '';
    }
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
    <div className="bg-dark text-light p-6">
      <h1 className="text-3xl font-bold text-primary mb-6">Gestion des Centres</h1>
      
      {/* Botón desplegable para agregar nuevo centro */}
      {!editingLocation && (
        <button 
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-secondary text-light px-6 py-2 rounded-md mb-6 hover:bg-dark hover:text-primary transition-colors border-2 border-primary font-bold"
        >
          {showAddForm ? 'Cerrar formulario' : 'Agregar un Nuevo Centro'} 
        </button>
      )}
      
      {/* Formulario para agregar/editar centro */}
      {(showAddForm || editingLocation) && (
        <div className="bg-secondary shadow-lg rounded-lg overflow-hidden mb-8 border border-primary">
          <div className="p-6">
            <h2 className="text-xl font-bold text-primary mb-4">
              {editingLocation ? 'Modifier un Centre' : 'Ajouter un Nouveau Centre'}
            </h2>
            
            <form onSubmit={handleFormSubmit} className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-light text-sm font-bold mb-2">Nom</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-600 rounded bg-dark text-light"
                    value={editingLocation ? editingLocation.name : newLocation.name}
                    onChange={(e) => editingLocation 
                      ? setEditingLocation({...editingLocation, name: e.target.value}) 
                      : setNewLocation({...newLocation, name: e.target.value})
                    }
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-light text-sm font-bold mb-2">Adresse</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-600 rounded bg-dark text-light"
                    value={editingLocation ? editingLocation.address : newLocation.address}
                    onChange={(e) => editingLocation 
                      ? setEditingLocation({...editingLocation, address: e.target.value}) 
                      : setNewLocation({...newLocation, address: e.target.value})
                    }
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-light text-sm font-bold mb-2">Téléphone</label>
                  <input
                    type="tel"
                    className="w-full px-3 py-2 border border-gray-600 rounded bg-dark text-light"
                    value={editingLocation ? editingLocation.phone || '' : newLocation.phone || ''}
                    onChange={(e) => editingLocation 
                      ? setEditingLocation({...editingLocation, phone: e.target.value}) 
                      : setNewLocation({...newLocation, phone: e.target.value})
                    }
                  />
                </div>
                
                <div>
                  <label className="block text-light text-sm font-bold mb-2">Email</label>
                  <input
                    type="email"
                    className="w-full px-3 py-2 border border-gray-600 rounded bg-dark text-light"
                    value={editingLocation ? editingLocation.email || '' : newLocation.email || ''}
                    onChange={(e) => editingLocation 
                      ? setEditingLocation({...editingLocation, email: e.target.value}) 
                      : setNewLocation({...newLocation, email: e.target.value})
                    }
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-light text-sm font-bold mb-2">Description</label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-600 rounded bg-dark text-light"
                    rows={3}
                    value={editingLocation ? editingLocation.description || '' : newLocation.description || ''}
                    onChange={(e) => editingLocation 
                      ? setEditingLocation({...editingLocation, description: e.target.value}) 
                      : setNewLocation({...newLocation, description: e.target.value})
                    }
                  />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-light text-sm font-bold mb-2">Image</label>
                  <div className="flex flex-col sm:flex-row gap-4 w-full items-center">
                    <div className="w-full">
                      <div className="w-full flex justify-center sm:justify-start">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="w-full max-w-xs sm:max-w-full p-2 rounded text-light bg-dark border border-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary"
                        />
                      </div>
                      <p className="text-sm mt-2 text-gray-400 text-center sm:text-left">
                        Formato recomendado: JPEG o PNG, tamaño máximo 2MB
                      </p>
                    </div>
                    
                    {locationImagePreview && (
                      <div className="w-24 h-24 relative flex-shrink-0">
                        <Image
                          src={locationImagePreview}
                          alt="Vista previa"
                          className="rounded object-cover w-full h-full border-2 border-primary"
                          width={96}
                          height={96}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Sección de horarios */}
              <div className="mb-6">
                <h3 className="text-lg font-bold text-primary mb-4">Horaires du Centre</h3>
                
                <div className="p-3 rounded bg-dark border-l-4 border-primary mb-4">
                  <p className="text-sm text-light">
                    <strong>Información importante:</strong> Configure los horarios de apertura para cada día. Puede añadir múltiples franjas horarias por día (por ejemplo, mañana y tarde).
                  </p>
                </div>
                
                {weekdays.map((day) => (
                  <div key={day.id} className="mb-4 p-4 border border-gray-700 rounded bg-secondary">
                    <h4 className="font-bold mb-2 text-primary">{day.name}</h4>
                    
                    {locationHours[day.id]?.map((slot, slotIndex) => (
                      <div key={slotIndex} className="flex flex-col sm:flex-row items-start sm:items-center mb-3 space-y-2 sm:space-y-0 sm:space-x-4 bg-dark p-3 rounded border border-gray-700">
                        <div className="flex items-center w-full sm:w-auto">
                          <span className="text-light mr-2 w-10">De</span>
                          <input
                            type="time"
                            className="px-3 py-2 border border-gray-600 rounded bg-dark text-light w-full sm:w-auto"
                            value={slot.start}
                            onChange={(e) => updateTimeSlot(day.id, slotIndex, 'start', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="flex items-center w-full sm:w-auto">
                          <span className="text-light mr-2 w-10">a</span>
                          <input
                            type="time"
                            className="px-3 py-2 border border-gray-600 rounded bg-dark text-light w-full sm:w-auto"
                            value={slot.end}
                            onChange={(e) => updateTimeSlot(day.id, slotIndex, 'end', e.target.value)}
                            required
                          />
                        </div>
                        
                        {locationHours[day.id].length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTimeSlot(day.id, slotIndex)}
                            className="mt-2 sm:mt-0 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            aria-label="Eliminar franja horaria"
                          >
                            <span>Eliminar</span>
                          </button>
                        )}
                      </div>
                    ))}
                    
                    <button
                      type="button"
                      onClick={() => addTimeSlot(day.id)}
                      className="px-3 py-1 mt-2 bg-dark text-light rounded hover:bg-gray-700 transition-colors border border-gray-600"
                    >
                      + Añadir franja horaria
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 justify-center sm:justify-start">
                <button
                  type="submit"
                  className="bg-primary px-6 py-2 rounded font-bold text-secondary hover:bg-yellow-400 transition-colors w-full sm:w-auto"
                  disabled={isUploading}
                >
                  {isUploading ? 'Chargement...' : (editingLocation ? 'Actualizar Centro' : 'Crear Centro')}
                </button>
                
                <button
                  type="button"
                  onClick={cancelEdit}
                  className="bg-gray-600 text-white px-6 py-2 rounded hover:bg-gray-700 transition-colors w-full sm:w-auto"
                  disabled={isUploading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Lista de centros existentes */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.length === 0 ? (
            <p className="text-light">No hay centros registrados.</p>
          ) : (
            locations.map(location => (
              <div 
                key={location.id} 
                className="rounded-lg border border-primary shadow-md hover:shadow-lg transition-all bg-secondary overflow-hidden"
              >
                {/* Imagen en la parte superior ocupando todo el ancho */}
                <div className="relative w-full h-48 sm:h-64">
                  {location.image ? (
                    <Image 
                      src={location.image} 
                      alt={location.name} 
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-dark">
                      <span className="text-4xl sm:text-6xl font-bold text-primary">
                        {location.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Contenido debajo de la imagen */}
                <div className="p-5">
                  <h3 className="text-xl font-bold text-primary mb-2">{location.name}</h3>
                  <p className="text-sm text-light mb-2">{location.address}</p>
                  
                  <div className="space-y-2 mb-4">
                    {location.phone && (
                      <p className="text-sm text-light">
                        <span className="font-medium">Téléphone:</span> {location.phone}
                      </p>
                    )}
                    {location.email && (
                      <p className="text-sm text-light">
                        <span className="font-medium">Email:</span> {location.email}
                      </p>
                    )}
                    {location.description && (
                      <p className="text-sm text-light mt-2">
                        <span className="font-medium">Description:</span> 
                        <span className="block mt-1 text-gray-300">{location.description.substring(0, 100)}{location.description.length > 100 ? '...' : ''}</span>
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex border-t border-gray-700">
                  <button
                    onClick={() => handleEditLocation(location)}
                    className="flex-1 text-center py-3 font-medium text-light hover:bg-dark hover:text-primary transition-colors"
                  >
                    Modifier
                  </button>
                  <div className="w-px bg-gray-700"></div>
                  <button
                    onClick={() => handleDeleteLocation(location.id)}
                    className="flex-1 text-center py-3 font-medium text-light hover:bg-dark hover:text-primary transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 