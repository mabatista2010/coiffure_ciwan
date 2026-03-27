'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { v4 as uuidv4 } from 'uuid';
import { AdminSidePanel, SectionHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { fetchWithAdminAuth } from '@/lib/fetchWithAdminAuth';
import {
  createDefaultLocationSchedule,
  createEmptyDaySlot,
  DaySchedule,
  validateLocationSchedule,
  WEEKDAYS,
} from '@/lib/locationSchedule';
import { supabase } from '@/lib/supabase';

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

const createInitialLocationState = (): Partial<Location> => ({
  name: '',
  address: '',
  description: '',
  phone: '',
  email: '',
  image: '',
  active: true,
});

export default function LocationManagement() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [newLocation, setNewLocation] = useState<Partial<Location>>(createInitialLocationState());
  const [showLocationPanel, setShowLocationPanel] = useState(false);

  const [locationImageFile, setLocationImageFile] = useState<File | null>(null);
  const [locationImagePreview, setLocationImagePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const locationImageInputRef = useRef<HTMLInputElement>(null);

  const [daySchedules, setDaySchedules] = useState<DaySchedule[]>(createDefaultLocationSchedule());
  const [scheduleErrors, setScheduleErrors] = useState<string[]>([]);
  const [panelFeedback, setPanelFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    const [
      { data: hoursData, error: hoursError },
      { data: dailyData, error: dailyError },
    ] = await Promise.all([
      supabase
        .from('location_hours')
        .select('*')
        .eq('location_id', locationId)
        .order('day_of_week')
        .order('slot_number'),
      supabase
        .from('location_daily_schedule')
        .select('day_of_week,is_closed')
        .eq('location_id', locationId)
        .order('day_of_week'),
    ]);
    
    if (hoursError || dailyError) {
      console.error('Erreur lors du chargement des horaires:', hoursError || dailyError);
      return;
    }
    
    const initialSchedule = createDefaultLocationSchedule();

    initialSchedule.forEach((daySchedule) => {
      const explicitDay = (dailyData || []).find((row) => row.day_of_week === daySchedule.dayOfWeek);
      if (explicitDay) {
        daySchedule.isClosed = explicitDay.is_closed;
      }
    });

    if (hoursData && hoursData.length > 0) {
      hoursData.forEach((hour) => {
        const daySchedule = initialSchedule.find((day) => day.dayOfWeek === hour.day_of_week);

        if (!daySchedule) {
          return;
        }

        daySchedule.isClosed = false;

        while (daySchedule.slots.length <= hour.slot_number) {
          daySchedule.slots.push(createEmptyDaySlot());
        }

        daySchedule.slots[hour.slot_number] = {
          start: hour.start_time.substring(0, 5),
          end: hour.end_time.substring(0, 5),
        };
      });
    }

    setDaySchedules(initialSchedule);
    setScheduleErrors([]);
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
  const updateDaySchedule = (
    dayOfWeek: number,
    updater: (current: DaySchedule) => DaySchedule
  ) => {
    setScheduleErrors([]);
    setPanelFeedback(null);
    setDaySchedules((prev) => prev.map((day) => (
      day.dayOfWeek === dayOfWeek ? updater(day) : day
    )));
  };

  const addTimeSlot = (dayOfWeek: number) => {
    updateDaySchedule(dayOfWeek, (day) => ({
      ...day,
      slots: [...day.slots, createEmptyDaySlot()],
    }));
  };

  const removeTimeSlot = (dayOfWeek: number, slotIndex: number) => {
    updateDaySchedule(dayOfWeek, (day) => ({
      ...day,
      slots: day.slots.length > 1
        ? day.slots.filter((_, index) => index !== slotIndex)
        : [createEmptyDaySlot()],
    }));
  };

  const updateTimeSlot = (dayOfWeek: number, slotIndex: number, field: 'start' | 'end', value: string) => {
    updateDaySchedule(dayOfWeek, (day) => ({
      ...day,
      slots: day.slots.map((slot, index) => (
        index === slotIndex
          ? { ...slot, [field]: value }
          : slot
      )),
    }));
  };

  const toggleClosedState = (dayOfWeek: number, isClosed: boolean) => {
    updateDaySchedule(dayOfWeek, (day) => ({
      ...day,
      isClosed,
      slots: isClosed
        ? (day.slots.length > 0 ? day.slots : [createEmptyDaySlot()])
        : (day.slots.some((slot) => slot.start || slot.end) ? day.slots : [createEmptyDaySlot()]),
    }));
  };

  const saveLocationHours = async (locationId: string) => {
    const response = await fetchWithAdminAuth('/api/admin/schedule/location-hours', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        locationId,
        daySchedules,
      }),
    });

    const payload = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(
        payload?.error
        || payload?.message
        || 'Impossible de sauvegarder les horaires du centre.'
      );
    }

    return payload;
  };

  const initializeEmptyHours = () => {
    setDaySchedules(createDefaultLocationSchedule());
    setScheduleErrors([]);
  };

  const resetLocationFormState = () => {
    setEditingLocation(null);
    setNewLocation(createInitialLocationState());
    setLocationImageFile(null);
    setLocationImagePreview('');
    setPanelFeedback(null);
    initializeEmptyHours();

    if (locationImageInputRef.current) {
      locationImageInputRef.current.value = '';
    }
  };

  const closePanel = () => {
    setShowLocationPanel(false);
    resetLocationFormState();
  };

  const openNewLocationPanel = () => {
    resetLocationFormState();
    setShowLocationPanel(true);
  };

  const handleAddLocation = async () => {
    const validationErrors = validateLocationSchedule(daySchedules);
    setScheduleErrors(validationErrors);

    if (validationErrors.length > 0) {
      setPanelFeedback({
        type: 'error',
        message: 'Corrigez les horaires signalés avant de sauvegarder ce centre.',
      });
      return;
    }

    try {
      setIsUploading(true);
      setPanelFeedback(null);

      let imageUrl = '';

      if (locationImageFile) {
        imageUrl = await uploadImage(locationImageFile) || '';
      }

      const newLocationData = {
        id: uuidv4(),
        name: newLocation.name ?? '',
        address: newLocation.address ?? '',
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

      await saveLocationHours(newLocationData.id);
      await loadLocations();
      setEditingLocation(newLocationData);
      setLocationImageFile(null);
      setPanelFeedback({
        type: 'success',
        message: 'Centre créé et horaires enregistrés avec succès.',
      });
    } catch (error) {
      console.error('Erreur lors de l\'ajout du centre:', error);
      setPanelFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible de créer ce centre.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation) return;

    const validationErrors = validateLocationSchedule(daySchedules);
    setScheduleErrors(validationErrors);

    if (validationErrors.length > 0) {
      setPanelFeedback({
        type: 'error',
        message: 'Corrigez les horaires signalés avant de sauvegarder ce centre.',
      });
      return;
    }

    try {
      setIsUploading(true);
      setPanelFeedback(null);

      let imageUrl = editingLocation.image || '';

      if (locationImageFile) {
        // Si hay una imagen nueva para subir
        imageUrl = await uploadImage(locationImageFile) || '';
      }

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

      await saveLocationHours(editingLocation.id);
      await loadLocations();
      setEditingLocation({
        ...editingLocation,
        image: imageUrl,
      });
      setLocationImageFile(null);
      setPanelFeedback({
        type: 'success',
        message: 'Centre mis à jour avec succès.',
      });
    } catch (error) {
      console.error('Erreur lors de la mise à jour du centre:', error);
      setPanelFeedback({
        type: 'error',
        message: error instanceof Error ? error.message : 'Impossible de mettre à jour ce centre.',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleEditLocation = async (location: Location) => {
    setEditingLocation(location);
    setLocationImageFile(null);
    setLocationImagePreview(location.image || '');
    setPanelFeedback(null);
    setShowLocationPanel(true);

    await loadLocationHours(location.id);
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

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingLocation) {
      await handleUpdateLocation();
    } else {
      await handleAddLocation();
    }
  };

  return (
    <div className="admin-scope space-y-6 overflow-x-hidden">
      <SectionHeader
        title="Gestion des Centres"
        description="CRUD centres, images et plages horaires multi-slot."
      />

      <Button onClick={openNewLocationPanel}>
        Ajouter nouveau centre
      </Button>

      <AdminSidePanel
        open={showLocationPanel}
        onOpenChange={(open) => {
          if (!open) {
            closePanel();
            return;
          }
          setShowLocationPanel(true);
        }}
        width="xl"
        title={editingLocation ? 'Modifier un Centre' : 'Ajouter un Nouveau Centre'}
        description="Informations, image et horaires d’ouverture du centre."
        footer={(
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={closePanel} disabled={isUploading}>
              Fermer
            </Button>
            <Button type="submit" form="location-panel-form" disabled={isUploading}>
              {isUploading ? 'Téléchargement...' : (editingLocation ? 'Mise à jour du Centre' : 'Créer un Nouveau Centre')}
            </Button>
          </div>
        )}
      >
        <form id="location-panel-form" onSubmit={handleFormSubmit} className="space-y-6">
          {panelFeedback && (
            <section
              className={`rounded-xl border p-4 ${
                panelFeedback.type === 'success'
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-900'
                  : 'border-destructive/35 bg-destructive/10 text-destructive'
              }`}
            >
              <p className="text-sm font-medium">{panelFeedback.message}</p>
            </section>
          )}

          {scheduleErrors.length > 0 && (
            <section className="rounded-xl border border-destructive/35 bg-destructive/10 p-4 text-destructive">
              <p className="text-sm font-semibold">Horaires à corriger avant sauvegarde</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {scheduleErrors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2 min-w-0">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom</label>
                <Input
                  type="text"
                  value={editingLocation ? editingLocation.name : newLocation.name}
                  onChange={(e) => editingLocation
                    ? setEditingLocation({ ...editingLocation, name: e.target.value })
                    : setNewLocation({ ...newLocation, name: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2 min-w-0">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Adresse</label>
                <Input
                  type="text"
                  value={editingLocation ? editingLocation.address : newLocation.address}
                  onChange={(e) => editingLocation
                    ? setEditingLocation({ ...editingLocation, address: e.target.value })
                    : setNewLocation({ ...newLocation, address: e.target.value })
                  }
                  required
                />
              </div>

              <div className="space-y-2 min-w-0">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Téléphone</label>
                <Input
                  type="tel"
                  value={editingLocation ? editingLocation.phone || '' : newLocation.phone || ''}
                  onChange={(e) => editingLocation
                    ? setEditingLocation({ ...editingLocation, phone: e.target.value })
                    : setNewLocation({ ...newLocation, phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 min-w-0">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</label>
                <Input
                  type="email"
                  value={editingLocation ? editingLocation.email || '' : newLocation.email || ''}
                  onChange={(e) => editingLocation
                    ? setEditingLocation({ ...editingLocation, email: e.target.value })
                    : setNewLocation({ ...newLocation, email: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2 min-w-0">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</label>
                <Textarea
                  rows={3}
                  className="min-h-[110px]"
                  value={editingLocation ? editingLocation.description || '' : newLocation.description || ''}
                  onChange={(e) => editingLocation
                    ? setEditingLocation({ ...editingLocation, description: e.target.value })
                    : setNewLocation({ ...newLocation, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2 md:col-span-2 min-w-0">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image</label>
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end min-w-0">
                  <div className="space-y-2 min-w-0">
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
          </section>

          <section className="space-y-4 rounded-xl border border-border bg-card p-4">
            <h3 className="text-lg font-semibold text-primary">Horaires du Centre</h3>

            <div className="rounded-xl border border-border bg-primary/5 p-3">
              <p className="text-sm text-foreground">
                <strong>Information importante:</strong> Configure les horaires d&apos;ouverture pour chaque jour. Vous pouvez ajouter plusieurs plages horaires par jour (par exemple, matin et soir).
              </p>
            </div>

            {WEEKDAYS.map((day) => {
              const daySchedule = daySchedules.find((item) => item.dayOfWeek === day.id);
              const daySlots = daySchedule?.slots || [createEmptyDaySlot()];
              const isClosed = daySchedule?.isClosed ?? true;

              return (
              <div key={day.id} className="rounded-xl border border-border bg-background p-4">
                <div className="mb-4 flex min-w-0 flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-primary">{day.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {isClosed ? 'Jour fermé: aucune réservation ne sera proposée.' : 'Jour ouvert: configurez une ou plusieurs plages horaires.'}
                    </p>
                  </div>

                  <div className="grid min-w-0 grid-cols-2 gap-2 rounded-xl border border-border bg-card p-1">
                    <Button
                      type="button"
                      variant={!isClosed ? 'default' : 'ghost'}
                      size="sm"
                      className="whitespace-normal"
                      onClick={() => toggleClosedState(day.id, false)}
                    >
                      Ouvert
                    </Button>
                    <Button
                      type="button"
                      variant={isClosed ? 'default' : 'ghost'}
                      size="sm"
                      className="whitespace-normal"
                      onClick={() => toggleClosedState(day.id, true)}
                    >
                      Fermé
                    </Button>
                  </div>
                </div>

                {!isClosed && daySlots.map((slot, slotIndex) => (
                  <div key={slotIndex} className="mb-3 flex min-w-0 flex-col items-start space-y-2 rounded-lg border border-border bg-card p-3 sm:flex-row sm:items-center sm:space-x-4 sm:space-y-0">
                    <div className="flex w-full min-w-0 items-center sm:w-auto">
                      <span className="mr-2 w-10 text-foreground">De</span>
                      <Input
                        type="time"
                        className="w-full sm:w-auto"
                        value={slot.start}
                        onChange={(e) => {
                          updateTimeSlot(day.id, slotIndex, 'start', e.target.value);
                          setPanelFeedback(null);
                        }}
                      />
                    </div>

                    <div className="flex w-full min-w-0 items-center sm:w-auto">
                      <span className="mr-2 w-10 text-foreground">a</span>
                      <Input
                        type="time"
                        className="w-full sm:w-auto"
                        value={slot.end}
                        onChange={(e) => {
                          updateTimeSlot(day.id, slotIndex, 'end', e.target.value);
                          setPanelFeedback(null);
                        }}
                      />
                    </div>

                    {daySlots.length > 1 && (
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

                {isClosed && (
                  <div className="rounded-lg border border-dashed border-border bg-card/60 p-3 text-sm text-muted-foreground">
                    Ce jour est fermé. Passez-le sur <strong>Ouvert</strong> pour ajouter des horaires.
                  </div>
                )}

                {!isClosed && (
                  <Button
                    type="button"
                    onClick={() => addTimeSlot(day.id)}
                    variant="secondary"
                    size="sm"
                    className="mt-2 whitespace-normal"
                  >
                    + Ajouter une plage horaire
                  </Button>
                )}
              </div>
              );
            })}
          </section>
        </form>
      </AdminSidePanel>
      
      {/* Lista de centros existentes */}
      <div className="space-y-8">
        <div className="grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {locations.length === 0 ? (
            <p className="text-light">Aucun centre enregistré.</p>
          ) : (
            locations.map((location) => (
              <div
                key={location.id}
                className="min-w-0 overflow-hidden rounded-lg border border-border bg-secondary shadow-md transition-all hover:shadow-lg"
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
