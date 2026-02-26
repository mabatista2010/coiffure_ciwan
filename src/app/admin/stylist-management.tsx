'use client';

import { useState, useEffect } from 'react';
import { supabase, Service, Stylist, StylistService } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';
import { AdminCard, AdminCardContent, AdminCardHeader, SectionHeader } from '@/components/admin/ui';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// Define días de la semana para mostrar en la interfaz
const weekdays = [
  { id: 0, name: 'Dimanche' },
  { id: 1, name: 'Lundi' },
  { id: 2, name: 'Mardi' },
  { id: 3, name: 'Mercredi' },
  { id: 4, name: 'Jeudi' },
  { id: 5, name: 'Vendredi' },
  { id: 6, name: 'Samedi' }
];

// Horarios predeterminados
const defaultHours = {
  start: '09:00',
  end: '18:00'
};

interface StylistManagementProps {
  services: Service[];
  locations: Array<{
    id: string;
    name: string;
    address: string;
    active: boolean;
    [key: string]: string | boolean | number | string[] | undefined | Record<string, unknown>;
  }>;
  onUpdate: () => void;
}

export default function StylistManagement({ services, locations, onUpdate }: StylistManagementProps) {
  const [errorMessage, setErrorMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  // Estado para estilistas y sus servicios
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [selectedStylist, setSelectedStylist] = useState<string>('');
  const [, setStylistServices] = useState<StylistService[]>([]);
  
  // Estado para nuevo estilista
  const [showStylistForm, setShowStylistForm] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);
  const [stylistImageFile, setStylistImageFile] = useState<File | null>(null);
  const [stylistImagePreview, setStylistImagePreview] = useState<string>('');
  const [newStylist, setNewStylist] = useState<{
    name: string;
    bio: string;
    locationIds: string[];
    serviceIds: string[];
  }>({
    name: '',
    bio: '',
    locationIds: [],
    serviceIds: [],
  });

  // Estado para horarios de trabajo
  const [workingHours, setWorkingHours] = useState<{
    [locationId: string]: {
      [dayOfWeek: number]: {
        active: boolean;
        start: string;
        end: string;
        useCustomHours: boolean;
      }
    }
  }>({});

  // Estado para slots de horarios guardados y su estado activo/inactivo
  const [locationHourSlots, setLocationHourSlots] = useState<{
    locationId: string;
    dayOfWeek: number;
    slots: Array<{ 
      start: string; 
      end: string; 
      active: boolean;
    }>;
  }[]>([]);

  // Cargar estilistas al iniciar
  useEffect(() => {
    loadStylists();
  }, []);

  // Función para cargar estilistas
  const loadStylists = async () => {
    try {
      const { data, error } = await supabase
        .from('stylists')
        .select('*')
        .order('name');
        
      if (error) throw error;
      
      if (data) {
        setStylists(data);
      }
    } catch (error) {
      console.error('Error al cargar estilistas:', error);
    }
  };

  // Función para cargar servicios de un estilista
  const loadStylistServices = async (stylistId: string) => {
    try {
      const { data, error } = await supabase
        .from('stylist_services')
        .select('*')
        .eq('stylist_id', stylistId);
        
      if (error) throw error;
      
      setStylistServices(data || []);
      return data;
    } catch (error) {
      console.error('Error al cargar servicios del estilista:', error);
      setStylistServices([]);
      return [];
    }
  };

  // Función para manejar cambios de archivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStylistImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setStylistImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para subir archivo
  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    if (!file) return null;
    
    setIsUploading(true);
    try {
      // Generar nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;
      
      // Verificar sesión antes de subir
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('No hay sesión activa. Por favor, inicie sesión de nuevo.');
      }
      
      // Subir archivo a Supabase Storage
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: uploadResponse, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file, {
          upsert: true,
          cacheControl: '3600'
        });
      
      if (error) {
        console.error('Error detallado de Supabase:', error);
        throw error;
      }
      
      // Obtener URL pública del archivo
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;
    } catch (err: Error | unknown) {
      console.error('Error al subir el archivo:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Error al subir el archivo');
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  // Resetear formulario de estilista
  const resetStylistForm = () => {
    setShowStylistForm(false);
    setEditMode(false);
    setSelectedStylist('');
    setStylistImageFile(null);
    setStylistImagePreview('');
    setWorkingHours({});
    setLocationHourSlots([]);
    setNewStylist({
      name: '',
      bio: '',
      locationIds: [],
      serviceIds: [],
    });
    setErrorMessage('');
  };

  // Inicializar horarios cuando se selecciona un centro
  const handleLocationChange = async (locationId: string, isSelected: boolean) => {
    let updatedLocationIds = [...newStylist.locationIds];
    
    if (isSelected) {
      // Agregar centro
      updatedLocationIds.push(locationId);
      
      // Inicializar horarios por defecto para esta ubicación
      setWorkingHours(prev => {
        const updated = { ...prev };
        updated[locationId] = {};
        
        weekdays.forEach(day => {
          updated[locationId][day.id] = {
            active: true,
            start: defaultHours.start,
            end: defaultHours.end,
            useCustomHours: false // Por defecto, usar horarios del centro
          };
        });
        
        return updated;
      });
      
      try {
        // Obtener horarios del centro seleccionado
        const { data: locationHoursData, error } = await supabase
          .from('location_hours')
          .select('*')
          .eq('location_id', locationId);
          
        if (error) throw error;
        
        if (locationHoursData && locationHoursData.length > 0) {
          // Ordenar los datos por día de la semana y hora de inicio
          const hoursByDay: { [key: string]: Array<{ start: string, end: string, active: boolean }> } = {};
          
          // Procesar y organizar los horarios del centro por día
          locationHoursData.forEach(hour => {
            const day = hour.day_of_week;
            if (!hoursByDay[day]) {
              hoursByDay[day] = [];
            }
            
            hoursByDay[day].push({
              start: hour.start_time.slice(0, 5), // Formato HH:MM
              end: hour.end_time.slice(0, 5),
              active: true // Por defecto, todos los slots están activos
            });
          });
          
          // Crear objetos de horarios por centro y día para guardar en el estado
          const hourSlots: Array<{
            locationId: string;
            dayOfWeek: number;
            slots: Array<{ start: string; end: string; active: boolean }>;
          }> = [];
          
          for (const dayStr in hoursByDay) {
            const day = parseInt(dayStr);
            if (hoursByDay[day] && hoursByDay[day].length > 0) {
              hourSlots.push({
                locationId,
                dayOfWeek: day,
                slots: hoursByDay[day]
              });
            }
          }
          
          // Guardamos los slots en un estado global para usarlos cuando se guarde el estilista
          setLocationHourSlots(prev => {
            const updated = [...prev];
            // Eliminar los slots existentes para esta ubicación
            const filtered = updated.filter(item => item.locationId !== locationId);
            // Añadir los nuevos slots
            return [...filtered, ...hourSlots];
          });
        } else {
          // Si no hay horarios definidos para el centro, mostrar un mensaje
          console.warn(`No se encontraron horarios definidos para el centro ${locationId}`);
          // Podríamos mostrar un mensaje al usuario aquí
        }
      } catch (error) {
        console.error("Error al cargar los horarios del centro:", error);
        setErrorMessage("Error al cargar los horarios del centro. Por favor, inténtelo de nuevo.");
      }
    } else {
      // Eliminar centro
      updatedLocationIds = updatedLocationIds.filter(id => id !== locationId);
      
      // Eliminar horarios de este centro
      setWorkingHours(prev => {
        const updated = { ...prev };
        delete updated[locationId];
        return updated;
      });
      
      // Eliminar slots de horarios de este centro
      setLocationHourSlots(prev => prev.filter(item => item.locationId !== locationId));
    }
    
    // Actualizar lista de centros seleccionados
    setNewStylist({
      ...newStylist,
      locationIds: updatedLocationIds
    });
  };

  // Función para activar/desactivar un slot de horario específico
  const toggleHourSlot = (locationId: string, dayOfWeek: number, slotIndex: number) => {
    setLocationHourSlots(prev => {
      const updated = [...prev];
      
      // Buscar el elemento correspondiente
      const locationIndex = updated.findIndex(
        item => item.locationId === locationId && item.dayOfWeek === dayOfWeek
      );
      
      if (locationIndex >= 0 && updated[locationIndex].slots[slotIndex]) {
        // Crear una copia profunda para evitar mutaciones
        const newLocation = {
          ...updated[locationIndex],
          slots: [...updated[locationIndex].slots]
        };
        
        // Actualizar el slot específico
        newLocation.slots[slotIndex] = {
          ...newLocation.slots[slotIndex],
          active: !newLocation.slots[slotIndex].active
        };
        
        // Actualizar el array completo
        updated[locationIndex] = newLocation;
        
        // Si todos los slots están inactivos, desactivar el día en la interfaz principal
        const allSlotsInactive = newLocation.slots.every(slot => !slot.active);
        if (allSlotsInactive) {
          setWorkingHours(prev => {
            const updatedHours = { ...prev };
            if (updatedHours[locationId] && updatedHours[locationId][dayOfWeek]) {
              updatedHours[locationId][dayOfWeek].active = false;
            }
            return updatedHours;
          });
        } else if (!workingHours[locationId]?.[dayOfWeek]?.active) {
          // Si había estado inactivo pero ahora hay al menos un slot activo, activar el día
          setWorkingHours(prev => {
            const updatedHours = { ...prev };
            if (updatedHours[locationId] && updatedHours[locationId][dayOfWeek]) {
              updatedHours[locationId][dayOfWeek].active = true;
            }
            return updatedHours;
          });
        }
      }
      
      return updated;
    });
  };

  // Actualizar el handler del checkbox del día para manejar múltiples slots
  const updateWorkingHour = (locationId: string, dayOfWeek: number, field: 'active' | 'start' | 'end' | 'useCustomHours', value: boolean | string) => {
    setWorkingHours(prev => {
      const updated = { ...prev };
      
      if (!updated[locationId]) {
        updated[locationId] = {};
      }
      
      if (!updated[locationId][dayOfWeek]) {
        updated[locationId][dayOfWeek] = {
          active: true,
          start: defaultHours.start,
          end: defaultHours.end,
          useCustomHours: false
        };
      }
      
      updated[locationId][dayOfWeek] = {
        ...updated[locationId][dayOfWeek],
        [field]: value
      };
      
      // Si estamos desactivando un día, desactivar todos sus slots
      if (field === 'active' && value === false) {
        setLocationHourSlots(prev => {
          const updated = [...prev];
          const locationItem = updated.find(
            item => item.locationId === locationId && item.dayOfWeek === dayOfWeek
          );
          
          if (locationItem) {
            const index = updated.indexOf(locationItem);
            const newItem = {
              ...locationItem,
              slots: locationItem.slots.map(slot => ({
                ...slot,
                active: false
              }))
            };
            updated[index] = newItem;
          }
          
          return updated;
        });
      } 
      // Si estamos activando un día, activar al menos el primer slot
      else if (field === 'active' && value === true) {
        setLocationHourSlots(prev => {
          const updated = [...prev];
          const locationItem = updated.find(
            item => item.locationId === locationId && item.dayOfWeek === dayOfWeek
          );
          
          if (locationItem && locationItem.slots.length > 0) {
            const index = updated.indexOf(locationItem);
            const newSlots = [...locationItem.slots];
            // Activar al menos el primer slot
            if (!newSlots[0].active) {
              newSlots[0] = { ...newSlots[0], active: true };
            }
            
            const newItem = {
              ...locationItem,
              slots: newSlots
            };
            updated[index] = newItem;
          }
          
          return updated;
        });
      }
      
      return updated;
    });
  };

  // Cargar datos de estilista para editar
  const loadStylistForEdit = async (stylistId: string) => {
    const stylist = stylists.find(s => s.id === stylistId);
    if (stylist) {
      setNewStylist({
        name: stylist.name,
        bio: stylist.bio || '',
        locationIds: stylist.location_ids || [],
        serviceIds: [], // Se cargará a continuación
      });
      
      if (stylist.profile_img) {
        setStylistImagePreview(stylist.profile_img);
      } else {
        setStylistImagePreview('');
      }
      
      // Cargar servicios del estilista
      const stylistServicesData = await loadStylistServices(stylistId);
      
      // Extraer IDs de servicio y cargarlos en el estado
      const serviceIds = stylistServicesData.map(ss => ss.service_id.toString());
      setNewStylist(prev => ({
        ...prev,
        serviceIds: serviceIds,
      }));
      
      // Resetear los slots de horarios guardados
      setLocationHourSlots([]);
      
      // Inicializar horarios para cada ubicación y día de la semana
      if (stylist.location_ids && stylist.location_ids.length > 0) {
        // Configurar objeto de trabajo con ubicaciones y días de la semana
        const initialWorkingHours: {
          [locationId: string]: {
            [dayOfWeek: number]: {
              active: boolean;
              start: string;
              end: string;
              useCustomHours: boolean;
            }
          }
        } = {};
        stylist.location_ids.forEach(locationId => {
          initialWorkingHours[locationId] = {};
          weekdays.forEach(day => {
            initialWorkingHours[locationId][day.id] = {
              active: false,
              start: defaultHours.start,
              end: defaultHours.end,
              useCustomHours: false // Por defecto, usar horarios del centro
            };
          });
        });
        
        setWorkingHours(initialWorkingHours);
        
        // Limpiar slots de horarios previos
        setLocationHourSlots([]);
        
        // Cargar horarios de trabajo existentes para cada ubicación
        try {
          const { data: stylistWorkingHours, error } = await supabase
            .from('working_hours')
            .select('*')
            .eq('stylist_id', stylistId);
            
          if (error) throw error;
          
          if (stylistWorkingHours) {
            // Mapa para seguimiento de horarios activos
            const activeHoursMap = new Map();
            
            // Procesar los horarios de cada ubicación
            for (const locationId of stylist.location_ids) {
              // Filtrar los horarios por ubicación
              const locationHours = stylistWorkingHours.filter(h => h.location_id === locationId);
              
              // Actualizar los días activos en horarios de trabajo
              locationHours.forEach(hour => {
                // Marcar como activo en el estado de la interfaz
                if (initialWorkingHours[locationId] && initialWorkingHours[locationId][hour.day_of_week]) {
                  initialWorkingHours[locationId][hour.day_of_week].active = true;

                  // Detectar si usaba horarios personalizados
                  // Si solo hay un horario para este día y no coincide con ningún slot del centro,
                  // probablemente sea un horario personalizado
                  const dayHours = locationHours.filter(h => 
                    h.location_id === locationId && h.day_of_week === hour.day_of_week
                  );

                  if (dayHours.length === 1) {
                    const startTime = hour.start_time.slice(0, 5);
                    const endTime = hour.end_time.slice(0, 5);
                    
                    initialWorkingHours[locationId][hour.day_of_week].start = startTime;
                    initialWorkingHours[locationId][hour.day_of_week].end = endTime;
                    
                    // Marcar clave para horarios activos del estilista
                    const key = `${locationId}-${hour.day_of_week}-${startTime}-${endTime}`;
                    activeHoursMap.set(key, true);
                  }
                }
              });
              
              // Determinar si usaba horarios personalizados para cada día
              weekdays.forEach(day => {
                const dayHours = locationHours.filter(h => 
                  h.location_id === locationId && h.day_of_week === day.id
                );
                
                // Si solo hay un horario para este día y está activo, verificar si coincide con alguno de los slots del centro
                if (dayHours.length === 1 && initialWorkingHours[locationId][day.id].active) {
                  // Cargar los horarios del centro para este día
                  initialWorkingHours[locationId][day.id].useCustomHours = true;
                }
              });
              
              // Cargar los horarios del centro para poder mostrar los slots
              try {
                const { data: locationHoursData, error } = await supabase
                  .from('location_hours')
                  .select('*')
                  .eq('location_id', locationId);
                  
                if (error) throw error;
                
                if (locationHoursData && locationHoursData.length > 0) {
                  // Organizar por día de la semana
                  const hoursByDay: { [day: string]: Array<{ start: string; end: string; active: boolean }> } = {};
                  locationHoursData.forEach(hour => {
                    const day = hour.day_of_week;
                    if (!hoursByDay[day]) {
                      hoursByDay[day] = [];
                    }
                    hoursByDay[day].push({
                      start: hour.start_time.slice(0, 5),
                      end: hour.end_time.slice(0, 5),
                      active: false // Se actualizará a continuación
                    });
                  });
                  
                  // Para cada día con horarios en el centro
                  for (const dayStr in hoursByDay) {
                    const day = parseInt(dayStr);
                    if (hoursByDay[day] && hoursByDay[day].length > 0) {
                      // Crear los slots con su estado activo/inactivo
                      const slots = hoursByDay[day].map((slot: { start: string; end: string }) => {
                        // Verificar si este slot está activo para el estilista
                        const key = `${locationId}-${day}-${slot.start}-${slot.end}`;
                        const isActive = activeHoursMap.has(key);
                        
                        return {
                          ...slot,
                          active: isActive // Establecer como activo solo si lo encontramos en los horarios del estilista
                        };
                      });
                      
                      // Guardar slots para este día y centro
                      setLocationHourSlots(prev => [
                        ...prev,
                        {
                          locationId,
                          dayOfWeek: day,
                          slots: slots
                        }
                      ]);
                    }
                  }
                }
              } catch (error) {
                console.error(`Error al cargar horarios del centro ${locationId}:`, error);
              }
            }
          }
          
          // Actualizar el estado con los horarios configurados
          setWorkingHours(initialWorkingHours);
        } catch (error) {
          console.error('Error al cargar horarios de trabajo:', error);
        }
      }
      
      setSelectedStylist(stylistId);
      setEditMode(true);
      setShowStylistForm(true);
      
      // Desplazar automáticamente hacia la parte superior con animación suave
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };
  
  // Manejar creación/edición de estilista
  const handleStylistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setErrorMessage('');
      
      if (!newStylist.name) {
        setErrorMessage('El nombre del estilista es obligatorio');
        return;
      }
      
      if (newStylist.locationIds.length === 0) {
        setErrorMessage('El estilista debe trabajar en al menos un centro');
        return;
      }
      
      // Validar que todos los centros tengan al menos un día con horario activo
      const hasInvalidSchedule = newStylist.locationIds.some(locationId => {
        if (!workingHours[locationId]) return true;
        return !Object.values(workingHours[locationId]).some(day => day.active);
      });
      
      if (hasInvalidSchedule) {
        setErrorMessage('Cada centro debe tener al menos un día con horario configurado');
        return;
      }
      
      // Manejar imagen si hay una nueva
      let profileImgUrl = editMode ? stylists.find(s => s.id === selectedStylist)?.profile_img || '' : '';
      
      if (stylistImageFile) {
        // Subir la nueva imagen
        const uploadedUrl = await uploadFile(stylistImageFile, 'stylists');
        if (uploadedUrl) {
          profileImgUrl = uploadedUrl;
        }
      }
      
      let stylistId = selectedStylist;
      
      if (editMode) {
        // Actualizar estilista existente
        const { error } = await supabase
          .from('stylists')
          .update({
            name: newStylist.name,
            bio: newStylist.bio,
            location_ids: newStylist.locationIds,
            profile_img: profileImgUrl,
          })
          .eq('id', selectedStylist);
          
        if (error) {
          throw new Error(`Error al actualizar el estilista: ${error.message}`);
        }
      } else {
        // Crear nuevo estilista
        const { data, error } = await supabase
          .from('stylists')
          .insert([{
            name: newStylist.name,
            bio: newStylist.bio,
            location_ids: newStylist.locationIds,
            profile_img: profileImgUrl,
            active: true,
          }])
          .select();
          
        if (error) {
          throw new Error(`Error al crear el estilista: ${error.message}`);
        }
        
        if (data && data.length > 0) {
          stylistId = data[0].id;
        }
      }
      
      // Si tenemos un ID de estilista, actualizamos sus servicios y horarios
      if (stylistId) {
        // 1. Obtener servicios actuales
        const { data: currentServices, error: fetchError } = await supabase
          .from('stylist_services')
          .select('*')
          .eq('stylist_id', stylistId);
          
        if (fetchError) {
          throw new Error(`Error al obtener servicios actuales: ${fetchError.message}`);
        }
        
        // 2. Determinar servicios a eliminar
        const currentServiceIds = currentServices?.map(cs => cs.service_id.toString()) || [];
        const servicesToRemove = currentServiceIds.filter(id => !newStylist.serviceIds.includes(id));
        
        // 3. Determinar servicios a añadir
        const servicesToAdd = newStylist.serviceIds.filter(id => !currentServiceIds.includes(id));
        
        // 4. Eliminar servicios que ya no están seleccionados
        if (servicesToRemove.length > 0) {
          for (const serviceId of servicesToRemove) {
            const service = currentServices?.find(cs => cs.service_id.toString() === serviceId);
            if (service) {
              const { error: deleteError } = await supabase
                .from('stylist_services')
                .delete()
                .eq('id', service.id);
                
              if (deleteError) {
                console.error(`Error al eliminar servicio ${serviceId}:`, deleteError);
              }
            }
          }
        }
        
        // 5. Añadir nuevos servicios
        if (servicesToAdd.length > 0) {
          const newServices = servicesToAdd.map(serviceId => ({
            stylist_id: stylistId,
            service_id: serviceId
          }));
          
          const { error: insertError } = await supabase
            .from('stylist_services')
            .insert(newServices);
            
          if (insertError) {
            console.error('Error al añadir nuevos servicios:', insertError);
          }
        }
        
        // Gestionar horarios de trabajo
        // 1. Obtener horarios actuales
        const { data: currentHours, error: hoursError } = await supabase
          .from('working_hours')
          .select('*')
          .eq('stylist_id', stylistId);
          
        if (hoursError) {
          throw new Error(`Error al obtener horarios actuales: ${hoursError.message}`);
        }
        
        // 2. Crear un mapa de horarios actuales para fácil acceso
        const currentHoursMap = new Map();
        if (currentHours) {
          currentHours.forEach(hour => {
            const key = `${hour.location_id}-${hour.day_of_week}`;
            currentHoursMap.set(key, hour);
          });
        }
        
        // 3. Eliminar todos los horarios existentes del estilista
        const { error: deleteHoursError } = await supabase
          .from('working_hours')
          .delete()
          .eq('stylist_id', stylistId);
          
        if (deleteHoursError) {
          console.error('Error al eliminar horarios existentes:', deleteHoursError);
        }
        
        // 4. Crear nuevos horarios basados en la interfaz y los slots guardados
        const newWorkingHours = [];
        
        // Procesar solo los slots activos de cada centro y día
        for (const locationId of newStylist.locationIds) {
          if (!workingHours[locationId]) continue;
          
          for (const dayId in workingHours[locationId]) {
            const day = parseInt(dayId);
            const hourData = workingHours[locationId][day];
            
            if (hourData.active) {
              // Verificar si se usan horarios personalizados
              if (hourData.useCustomHours) {
                // Usar el horario personalizado definido en los campos de la interfaz
                newWorkingHours.push({
                  id: uuidv4(),
                  stylist_id: stylistId,
                  location_id: locationId,
                  day_of_week: day,
                  start_time: `${hourData.start}:00`,
                  end_time: `${hourData.end}:00`
                });
              } else {
                // Usar los horarios del centro según los slots seleccionados
                const locationSlots = locationHourSlots.find(
                  item => item.locationId === locationId && item.dayOfWeek === day
                );
                
                if (locationSlots && locationSlots.slots.length > 0) {
                  // Filtrar solo los slots activos
                  const activeSlots = locationSlots.slots.filter(slot => slot.active);
                  
                  if (activeSlots.length > 0) {
                    // Crear un registro para cada slot activo
                    activeSlots.forEach(slot => {
                      newWorkingHours.push({
                        id: uuidv4(),
                        stylist_id: stylistId,
                        location_id: locationId,
                        day_of_week: day,
                        start_time: `${slot.start}:00`,
                        end_time: `${slot.end}:00`
                      });
                    });
                  } else {
                    // Si no hay slots activos pero el día está activo, usar el horario de la interfaz
                    newWorkingHours.push({
                      id: uuidv4(),
                      stylist_id: stylistId,
                      location_id: locationId,
                      day_of_week: day,
                      start_time: `${hourData.start}:00`,
                      end_time: `${hourData.end}:00`
                    });
                  }
                } else {
                  // Si no hay slots guardados, usar el horario de la interfaz
                  newWorkingHours.push({
                    id: uuidv4(),
                    stylist_id: stylistId,
                    location_id: locationId,
                    day_of_week: day,
                    start_time: `${hourData.start}:00`,
                    end_time: `${hourData.end}:00`
                  });
                }
              }
            }
          }
        }
        
        // 5. Insertar los nuevos horarios
        if (newWorkingHours.length > 0) {
          const { error: insertHoursError } = await supabase
            .from('working_hours')
            .insert(newWorkingHours);
            
          if (insertHoursError) {
            console.error('Error al insertar nuevos horarios:', insertHoursError);
          }
        }
      }
      
      // Recargar datos
      await loadStylists();
      resetStylistForm();
      setShowStylistForm(false);
      onUpdate(); // Notificar al componente padre que hubo cambios
      
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error inesperado');
    }
  };

  // Manejar eliminación de estilista
  const handleDeleteStylist = async (id: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar este estilista? Esta acción no se puede deshacer.')) {
      return;
    }
    
    try {
      // Eliminar servicios relacionados primero
      const { error: servicesError } = await supabase
        .from('stylist_services')
        .delete()
        .eq('stylist_id', id);
        
      if (servicesError) {
        throw new Error(`Erreur lors de la suppression des services de l'estiliste: ${servicesError.message}`);
      }
      
      // Eliminar estilista
      const { error } = await supabase
        .from('stylists')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw new Error(`Erreur lors de la suppression de l'estiliste: ${error.message}`);
      }
      
      // Recargar datos
      await loadStylists();
      if (selectedStylist === id) {
        resetStylistForm();
      }
      
        onUpdate(); // Notificar al componente padre que hubo cambios
      
    } catch (error) {
      console.error('Error:', error);
      setErrorMessage(error instanceof Error ? error.message : 'Error inesperado');
    }
  };

  return (
    <div className="admin-scope space-y-6">
      <SectionHeader
        title="Gestion des Stylistes"
        description="Profils, services assignés et horaires de travail par centre."
      />

      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      {/* Botón para mostrar formulario de nuevo estilista */}
      {!editMode && (
        <Button
          onClick={() => setShowStylistForm(!showStylistForm)}
          variant={showStylistForm ? 'outline' : 'default'}
        >
          {showStylistForm ? 'Fermer formulaire' : 'Ajouter nouveau styliste'}
        </Button>
      )}
      
      {/* Formulario para añadir/editar estilista */}
      {showStylistForm && (
        <AdminCard tone="highlight" className="mb-6">
          <AdminCardHeader>
            <h3 className="text-xl font-semibold text-primary">
              {editMode ? "Modifier l'estiliste" : "Ajouter un nouvel estiliste"}
            </h3>
          </AdminCardHeader>
          <AdminCardContent className="space-y-4">
            <div className="rounded-xl border border-border bg-primary/5 p-3">
              <p className="text-sm text-foreground">
                <strong className="text-primary">Information importante sur les horaires:</strong> Lorsque vous sélectionnez un centre, le système charge automatiquement
                tous les horaires définis pour ce centre. Si le centre a plusieurs plages horaires pour un jour
                (par exemple, matin et après-midi), l&apos;estiliste sera disponible dans toutes ces plages horaires si le jour est activé.
              </p>
            </div>
            
            <form onSubmit={handleStylistSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Nom</label>
                <Input
                  type="text"
                  value={newStylist.name}
                  onChange={(e) => setNewStylist({...newStylist, name: e.target.value})}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Biographie</label>
                <Textarea
                  value={newStylist.bio}
                  onChange={(e) => setNewStylist({...newStylist, bio: e.target.value})}
                  rows={3}
                  className="min-h-[110px]"
                />
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Centres où travaille</label>
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-2">
                  {locations.map(location => (
                    <div key={location.id} className="flex items-center text-foreground">
                      <Input
                        type="checkbox"
                        id={`location-${location.id}`}
                        checked={newStylist.locationIds.includes(location.id)}
                        onChange={(e) => handleLocationChange(location.id, e.target.checked)}
                        className="mr-2 h-4 w-4 accent-primary"
                      />
                      <label htmlFor={`location-${location.id}`} className="cursor-pointer hover:text-primary">
                        {location.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Services offerts</label>
                <div className="grid grid-cols-1 gap-2 rounded-xl border border-border bg-card p-3 md:grid-cols-2">
                  {services.map(service => (
                    <div key={service.id} className="flex items-center text-foreground">
                      <Input
                        type="checkbox"
                        id={`service-${service.id}`}
                        checked={newStylist.serviceIds.includes(service.id.toString())}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewStylist({
                              ...newStylist,
                              serviceIds: [...newStylist.serviceIds, service.id.toString()]
                            });
                          } else {
                            setNewStylist({
                              ...newStylist,
                              serviceIds: newStylist.serviceIds.filter(id => id !== service.id.toString())
                            });
                          }
                        }}
                        className="mr-2 h-4 w-4 accent-primary"
                      />
                      <label htmlFor={`service-${service.id}`} className="cursor-pointer hover:text-primary">
                        {service.nombre} - {service.precio} CHF
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Horarios de trabajo - Restaurado con el nuevo estilo */}
              <div className="mb-6 space-y-3">
                <h3 className="text-lg font-semibold text-primary">
                  Horaires de travail
                </h3>
                
                <div className="rounded-xl border border-border bg-primary/5 p-3">
                  <p className="text-sm text-foreground">
                    Pour chaque jour et centre, vous pouvez choisir entre utiliser les horaires prédéfinis du centre
                    ou configurer un horaire personnalisé pour l&apos;estiliste.
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    - <strong className="text-primary">Mode Horaires du Centre</strong>: Sélectionnez les plages horaires spécifiques du centre où travaille l&apos;estiliste.
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    - <strong className="text-primary">Mode Horaires Personnalisés</strong>: Définissez un horaire unique pour l&apos;estiliste, indépendant des horaires du centre.
                  </p>
                </div>
                
                {newStylist.locationIds.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sélectionnez au moins un centre pour configurer les horaires.</p>
                ) : (
                  <div className="space-y-4">
                    {newStylist.locationIds.map(locationId => {
                      const location = locations.find(l => l.id === locationId);
                      return (
                        <div key={`hours-${locationId}`} className="rounded-xl border border-border bg-card p-3">
                          <h4 className="mb-2 font-medium text-primary">
                            {location?.name}
                          </h4>
                          <div className="space-y-2">
                            {weekdays.map(day => (
                              <div key={`${locationId}-${day.id}`} className="mb-3 border-b border-border pb-3">
                                <div className="flex flex-wrap items-center gap-3">
                                  <div className="flex w-32 items-center sm:w-auto">
                                    <Input
                                      type="checkbox"
                                      id={`active-${locationId}-${day.id}`}
                                      checked={workingHours[locationId]?.[day.id]?.active || false}
                                      onChange={(e) => updateWorkingHour(locationId, day.id, 'active', e.target.checked)}
                                      className="mr-2 h-4 w-4 accent-primary"
                                    />
                                    <label htmlFor={`active-${locationId}-${day.id}`} className="cursor-pointer font-medium text-foreground hover:text-primary">
                                      {day.name}
                                    </label>
                                  </div>
                                  
                                  {workingHours[locationId]?.[day.id]?.active && (
                                    <div className="mt-2 w-full">
                                      <div className="mb-3 flex flex-col items-start gap-2 sm:flex-row sm:items-center sm:gap-4">
                                        <span className="text-sm font-medium text-foreground">Mode de l&apos;horaire:</span>
                                        <div className="flex w-full flex-col gap-2 pl-0 sm:flex-row sm:gap-4">
                                          <div className="flex w-full items-center rounded-lg border border-border bg-background p-2 sm:w-auto">
                                            <Input
                                              type="radio"
                                              id={`center-hours-${locationId}-${day.id}`}
                                              name={`hours-mode-${locationId}-${day.id}`}
                                              checked={!workingHours[locationId]?.[day.id]?.useCustomHours}
                                              onChange={() => updateWorkingHour(locationId, day.id, 'useCustomHours', false)}
                                              className="mr-2 h-4 w-4 accent-primary"
                                            />
                                            <label htmlFor={`center-hours-${locationId}-${day.id}`} className="cursor-pointer whitespace-nowrap text-sm text-foreground hover:text-primary">
                                              Horaires du Centre
                                            </label>
                                          </div>
                                          <div className="flex w-full items-center rounded-lg border border-border bg-background p-2 sm:w-auto">
                                            <Input
                                              type="radio"
                                              id={`custom-hours-${locationId}-${day.id}`}
                                              name={`hours-mode-${locationId}-${day.id}`}
                                              checked={workingHours[locationId]?.[day.id]?.useCustomHours || false}
                                              onChange={() => updateWorkingHour(locationId, day.id, 'useCustomHours', true)}
                                              className="mr-2 h-4 w-4 accent-primary"
                                            />
                                            <label htmlFor={`custom-hours-${locationId}-${day.id}`} className="cursor-pointer whitespace-nowrap text-sm text-foreground hover:text-primary">
                                              Horaires Personnalisés
                                            </label>
                                          </div>
                                        </div>
                                      </div>
                                      
                                      {/* Champs pour les horaires personnalisés */}
                                      {workingHours[locationId]?.[day.id]?.useCustomHours && (
                                        <div className="flex w-full flex-col items-start space-y-2 rounded-lg border border-border bg-background p-3 sm:flex-row sm:items-center sm:space-x-2 sm:space-y-0">
                                          <div className="flex w-full items-center sm:w-auto">
                                            <span className="mr-2 w-10 text-foreground">De</span>
                                            <Input
                                              type="time"
                                              className="w-full sm:w-auto"
                                              value={workingHours[locationId]?.[day.id]?.start || defaultHours.start}
                                              onChange={(e) => updateWorkingHour(locationId, day.id, 'start', e.target.value)}
                                              disabled={!workingHours[locationId]?.[day.id]?.active}
                                            />
                                          </div>
                                          <div className="flex w-full items-center sm:w-auto">
                                            <span className="mr-2 w-10 text-foreground">a</span>
                                            <Input
                                              type="time"
                                              className="w-full sm:w-auto"
                                              value={workingHours[locationId]?.[day.id]?.end || defaultHours.end}
                                              onChange={(e) => updateWorkingHour(locationId, day.id, 'end', e.target.value)}
                                              disabled={!workingHours[locationId]?.[day.id]?.active}
                                            />
                                          </div>
                                        </div>
                                      )}
                                      
                                      {/* Mostrar slots de horarios del centro solo si no usa horarios personalizados */}
                                      {workingHours[locationId]?.[day.id]?.active &&
                                        !workingHours[locationId]?.[day.id]?.useCustomHours &&
                                        (() => {
                                          // Buscar slots para este centro y día
                                          const centerSlots = locationHourSlots.find(
                                            item => item.locationId === locationId && item.dayOfWeek === day.id
                                          );
                                          
                                          if (centerSlots && centerSlots.slots.length > 0) {
                                            return (
                                              <div className="mt-2 w-full max-w-full overflow-hidden rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground sm:px-3">
                                                <p className="mb-2 text-sm font-bold text-primary">Sélectionnez les plages horaires:</p>
                                                <div className="grid w-full grid-cols-1 gap-2">
                                                  {centerSlots.slots.map((slot, idx) => (
                                                    <div key={idx} className={`flex w-full items-center rounded border p-2 ${slot.active ? 'border-primary bg-primary/10' : 'border-border bg-card'}`}>
                                                      <Input
                                                        type="checkbox"
                                                        id={`slot-${locationId}-${day.id}-${idx}`}
                                                        checked={slot.active}
                                                        onChange={() => toggleHourSlot(locationId, day.id, idx)}
                                                        className="mr-2 h-4 w-4 flex-shrink-0 accent-primary"
                                                      />
                                                      <label
                                                        htmlFor={`slot-${locationId}-${day.id}-${idx}`}
                                                        className={`${slot.active ? 'font-medium text-primary' : 'text-foreground'} cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap hover:text-primary`}
                                                      >
                                                        {slot.start} - {slot.end}
                                                      </label>
                                                    </div>
                                                  ))}
                                                </div>
                                                <p className="mt-3 text-xs italic text-amber-300">
                                                  Seules les plages horaires sélectionnées seront activées.
                                                </p>
                                              </div>
                                            );
                                          } else {
                                            return (
                                              <div className="mt-2 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground sm:px-3">
                                                <p className="font-medium text-amber-300">
                                                  Aucune plage horaire définie pour ce centre dans ce jour.
                                                </p>
                                                <p className="mt-1 text-foreground">
                                                  Veuillez configurer les horaires du centre dans la section de gestion des centres.
                                                </p>
                                              </div>
                                            );
                                          }
                                          return null;
                                        })()
                                      }
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Image de profil</label>
                <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="h-auto py-2 file:mr-3 file:rounded-lg file:border file:border-primary/45 file:bg-primary/12 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-primary"
                    />
                    <p className="text-xs text-muted-foreground">
                      Format recommandé: JPEG ou PNG, taille maximale 2MB
                    </p>
                  </div>
                  
                  {stylistImagePreview && (
                    <div className="relative h-24 w-24 overflow-hidden rounded-xl border border-border">
                      <Image
                        src={stylistImagePreview}
                        alt="Aperçu du profil"
                        fill
                        className="object-cover"
                      />
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Button
                  type="submit"
                  disabled={isUploading}
                >
                  {isUploading ? 'Téléchargement...' : (editMode ? "Mise à jour de l'estiliste" : "Créer un nouvel estiliste")}
                </Button>
                
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    resetStylistForm();
                    setShowStylistForm(false);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </AdminCardContent>
        </AdminCard>
      )}
      
      {/* Lista de estilistas - siempre visible */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stylists.length === 0 ? (
            <p className="text-light">Aucun estiliste enregistré.</p>
          ) : (
            stylists.map(stylist => (
              <div 
                key={stylist.id} 
                className="rounded-lg border border-border shadow-md hover:shadow-lg transition-all bg-secondary overflow-hidden"
              >
                {/* Imagen en la parte superior ocupando todo el ancho */}
                <div className="relative w-full h-48 sm:h-64">
                  {stylist.profile_img ? (
                    <Image 
                      src={stylist.profile_img} 
                      alt={stylist.name} 
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-dark">
                      <span className="text-4xl sm:text-6xl font-bold text-primary">
                        {stylist.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                
                {/* Contenido debajo de la imagen */}
                <div className="p-4 sm:p-5">
                  <h4 className="text-xl font-bold text-primary mb-2">
                    {stylist.name}
                  </h4>
                  
                  {stylist.bio && (
                    <p className="mb-4 text-light text-sm sm:text-base">
                      {stylist.bio.length > 120 ? `${stylist.bio.substring(0, 120)}...` : stylist.bio}
                    </p>
                  )}
                  
                  <div className="mb-4">
                    <h5 className="text-sm font-medium mb-2 text-primary">Centres:</h5>
                    <div className="flex flex-wrap gap-2">
                      {stylist.location_ids?.map(locId => (
                        <span 
                          key={locId} 
                          className="text-xs rounded-full px-3 py-1 bg-dark text-light"
                        >
                          {locations.find(loc => loc.id === locId)?.name || 'Centre inconnu'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 border-t border-border p-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="flex-1"
                    onClick={() => loadStylistForEdit(stylist.id)}
                  >
                    Modifier
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleDeleteStylist(stylist.id)}
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
