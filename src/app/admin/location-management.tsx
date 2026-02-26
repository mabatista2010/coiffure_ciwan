'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { AdminCard, AdminCardContent, AdminCardHeader, SectionHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
    <div className="admin-scope space-y-6">
      <SectionHeader
        title="Gestion des Centres"
        description="CRUD centres, images et plages horaires multi-slot."
      />

      {!editingLocation && (
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          variant={showAddForm ? 'outline' : 'default'}
        >
          {showAddForm ? 'Fermer formulaire' : 'Ajouter nouveau centre'}
        </Button>
      )}
      
      {/* Formulario para agregar/editar centro */}
      {(showAddForm || editingLocation) && (
        <AdminCard tone="highlight" className="mb-8">
          <AdminCardHeader>
            <h2 className="text-xl font-semibold text-primary">
              {editingLocation ? 'Modifier un Centre' : 'Ajouter un Nouveau Centre'}
            </h2>
          </AdminCardHeader>
          <AdminCardContent>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom</label>
                  <Input
                    type="text"
                    value={editingLocation ? editingLocation.name : newLocation.name}
                    onChange={(e) => editingLocation 
                      ? setEditingLocation({...editingLocation, name: e.target.value}) 
                      : setNewLocation({...newLocation, name: e.target.value})
                    }
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adresse</label>
                  <Input
                    type="text"
                    value={editingLocation ? editingLocation.address : newLocation.address}
                    onChange={(e) => editingLocation 
                      ? setEditingLocation({...editingLocation, address: e.target.value}) 
                      : setNewLocation({...newLocation, address: e.target.value})
                    }
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Téléphone</label>
                  <Input
                    type="tel"
                    value={editingLocation ? editingLocation.phone || '' : newLocation.phone || ''}
                    onChange={(e) => editingLocation 
                      ? setEditingLocation({...editingLocation, phone: e.target.value}) 
                      : setNewLocation({...newLocation, phone: e.target.value})
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</label>
                  <Input
                    type="email"
                    value={editingLocation ? editingLocation.email || '' : newLocation.email || ''}
                    onChange={(e) => editingLocation 
                      ? setEditingLocation({...editingLocation, email: e.target.value}) 
                      : setNewLocation({...newLocation, email: e.target.value})
                    }
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                  <Textarea
                    rows={3}
                    className="min-h-[110px]"
                    value={editingLocation ? editingLocation.description || '' : newLocation.description || ''}
                    onChange={(e) => editingLocation 
                      ? setEditingLocation({...editingLocation, description: e.target.value}) 
                      : setNewLocation({...newLocation, description: e.target.value})
                    }
                  />
                </div>
                
                <div className="space-y-2 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image</label>
                  <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="space-y-2">
                      <Input
                        ref={locationImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="h-auto py-2 file:mr-3 file:rounded-lg file:border file:border-primary/45 file:bg-primary/12 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                      />
                      <p className="text-xs text-muted-foreground">
                        Format recommandé: JPEG ou PNG, taille maximale 2MB
                      </p>
                    </div>
                    
                    {locationImagePreview && (
                      <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
                        <Image
                          src={locationImagePreview}
                          alt="Aperçu du centre"
                          fill
                          className="object-cover"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Sección de horarios */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-primary">Horaires du Centre</h3>
                
                <div className="rounded-xl border border-border bg-primary/5 p-3">
                  <p className="text-sm text-foreground">
                    <strong>Information importante:</strong> Configure les horaires d&apos;ouverture pour chaque jour. Vous pouvez ajouter plusieurs plages horaires par jour (par exemple, matin et soir).
                  </p>
                </div>
                
                {weekdays.map((day) => (
                  <div key={day.id} className="rounded-xl border border-border bg-card p-4">
                    <h4 className="mb-2 font-semibold text-primary">{day.name}</h4>
                    
                    {locationHours[day.id]?.map((slot, slotIndex) => (
                      <div key={slotIndex} className="mb-3 flex flex-col items-start space-y-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                        <div className="flex w-full items-center sm:w-auto">
                          <span className="mr-2 w-10 text-foreground">De</span>
                          <Input
                            type="time"
                            className="w-full sm:w-auto"
                            value={slot.start}
                            onChange={(e) => updateTimeSlot(day.id, slotIndex, 'start', e.target.value)}
                            required
                          />
                        </div>
                        
                        <div className="flex w-full items-center sm:w-auto">
                          <span className="mr-2 w-10 text-foreground">a</span>
                          <Input
                            type="time"
                            className="w-full sm:w-auto"
                            value={slot.end}
                            onChange={(e) => updateTimeSlot(day.id, slotIndex, 'end', e.target.value)}
                            required
                          />
                        </div>
                        
                        {locationHours[day.id].length > 1 && (
                          <Button
                            type="button"
                            onClick={() => removeTimeSlot(day.id, slotIndex)}
                            variant="destructive"
                            size="sm"
                            className="mt-2 sm:mt-0"
                            aria-label="Eliminar franja horaria"
                          >
                            <span>Eliminar</span>
                          </Button>
                        )}
                      </div>
                    ))}
                    
                    <Button
                      type="button"
                      onClick={() => addTimeSlot(day.id)}
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                    >
                      + Ajouter une plage horaire
                    </Button>
                  </div>
                ))}
              </div>
              
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  type="submit"
                  disabled={isUploading}
                >
                  {isUploading ? 'Téléchargement...' : (editingLocation ? 'Mise à jour du Centre' : 'Créer un Nouveau Centre')}
                </Button>
                
                <Button
                  type="button"
                  onClick={cancelEdit}
                  variant="secondary"
                  disabled={isUploading}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </AdminCardContent>
        </AdminCard>
      )}
      
      {/* Lista de centros existentes */}
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {locations.length === 0 ? (
            <p className="text-light">Aucun centre enregistré.</p>
          ) : (
            locations.map(location => (
              <div 
                key={location.id} 
                className="rounded-lg border border-border shadow-md hover:shadow-lg transition-all bg-secondary overflow-hidden"
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
                        <span className="block mt-1 text-muted-foreground">{location.description.substring(0, 100)}{location.description.length > 100 ? '...' : ''}</span>
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2 border-t border-border p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleEditLocation(location)}
                  >
                    Modifier
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleDeleteLocation(location.id)}
                  >
                    Supprimer
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 
