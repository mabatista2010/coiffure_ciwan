'use client';

import { useState, useEffect } from 'react';
import { supabase, Service, Stylist, StylistService } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';

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
    let updatedLocationIds;
    
    if (isSelected) {
      // Añadir centro
      updatedLocationIds = [...newStylist.locationIds, locationId];
      
      // Cargar los horarios del centro
      try {
        const { data, error } = await supabase
          .from('location_hours')
          .select('*')
          .eq('location_id', locationId)
          .order('day_of_week')
          .order('slot_number');
        
        if (error) throw error;
        
        // Preparar estructura de horarios
        const centerHours: {
          [dayOfWeek: number]: {
            active: boolean;
            start: string;
            end: string;
          }
        } = {};
        
        // Por defecto, inicializar todos los días como inactivos
        weekdays.forEach(day => {
          centerHours[day.id] = {
            active: false,
            start: defaultHours.start,
            end: defaultHours.end
          };
        });
        
        // Guardar todos los slots de horarios para procesarlos después
        const hourSlots: {
          locationId: string;
          dayOfWeek: number;
          slots: Array<{ 
            start: string; 
            end: string; 
            active: boolean;
          }>;
        }[] = [];
        
        // Si existen horarios para el centro, marcar esos días como activos
        if (data && data.length > 0) {
          // Agrupar horarios por día
          const hoursByDay: { [day: number]: Array<{ start: string; end: string; }> } = {};
          
          data.forEach(hour => {
            const day = hour.day_of_week;
            if (!hoursByDay[day]) {
              hoursByDay[day] = [];
            }
            
            hoursByDay[day].push({
              start: hour.start_time.substring(0, 5), // Convertir "09:00:00" a "09:00"
              end: hour.end_time.substring(0, 5)
            });
          });
          
          // Preparar los slots para cada día
          Object.keys(hoursByDay).forEach(dayStr => {
            const day = parseInt(dayStr);
            if (hoursByDay[day] && hoursByDay[day].length > 0) {
              // Usar el primer horario para la visualización en la interfaz
              centerHours[day] = {
                active: true,
                start: hoursByDay[day][0].start,
                end: hoursByDay[day][0].end
              };
              
              // Guardar todos los slots para este día con active=true por defecto
              hourSlots.push({
                locationId,
                dayOfWeek: day,
                slots: hoursByDay[day].map(slot => ({
                  ...slot,
                  active: true // Por defecto, todos los slots están activos
                }))
              });
            }
          });
        }
        
        // Actualizar los horarios en la interfaz
        setWorkingHours(prev => {
          const updated = { ...prev };
          updated[locationId] = centerHours;
          return updated;
        });
        
        // Guardamos los slots en un estado global para usarlos cuando se guarde el estilista
        setLocationHourSlots(prev => {
          const updated = [...prev];
          // Eliminar los slots existentes para esta ubicación
          const filtered = updated.filter(item => item.locationId !== locationId);
          // Añadir los nuevos slots
          return [...filtered, ...hourSlots];
        });
      } catch (error) {
        console.error('Error al cargar horarios del centro:', error);
        
        // En caso de error, usar horarios por defecto
        setWorkingHours(prev => {
          const updated = { ...prev };
          updated[locationId] = {};
          
          weekdays.forEach(day => {
            updated[locationId][day.id] = {
              active: true, // Por defecto, activo para todos los días
              start: defaultHours.start,
              end: defaultHours.end
            };
          });
          
          return updated;
        });
      }
    } else {
      // Eliminar centro
      updatedLocationIds = newStylist.locationIds.filter(id => id !== locationId);
      
      // Eliminar horarios para este centro
      setWorkingHours(prev => {
        const updated = { ...prev };
        delete updated[locationId];
        return updated;
      });
      
      // Eliminar slots guardados para este centro
      setLocationHourSlots(prev => prev.filter(item => item.locationId !== locationId));
    }
    
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
  const updateWorkingHour = (locationId: string, dayOfWeek: number, field: 'active' | 'start' | 'end', value: boolean | string) => {
    setWorkingHours(prev => {
      const updated = { ...prev };
      
      if (!updated[locationId]) {
        updated[locationId] = {};
      }
      
      if (!updated[locationId][dayOfWeek]) {
        updated[locationId][dayOfWeek] = {
          active: true,
          start: defaultHours.start,
          end: defaultHours.end
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
      
      // Inicializar estructura para horarios
      const hoursMap: {
        [locationId: string]: {
          [dayOfWeek: number]: {
            active: boolean;
            start: string;
            end: string;
          }
        }
      } = {};
      
      // Inicializar para todos los centros seleccionados
      if (stylist.location_ids) {
        for (const locationId of stylist.location_ids) {
          hoursMap[locationId] = {};
          weekdays.forEach(day => {
            hoursMap[locationId][day.id] = {
              active: false,
              start: defaultHours.start,
              end: defaultHours.end
            };
          });
        }
      }
      
      // Cargar horarios de trabajo del estilista
      const { data: stylistHours, error: stylistHoursError } = await supabase
        .from('working_hours')
        .select('*')
        .eq('stylist_id', stylistId);
      
      // Crear un mapa para verificar qué horarios del centro están activos para el estilista
      const activeHoursMap = new Map();
      
      if (stylistHoursError) {
        console.error('Error al cargar horarios del estilista:', stylistHoursError);
      } else if (stylistHours && stylistHours.length > 0) {
        // Procesar los horarios del estilista
        for (const hour of stylistHours) {
          if (hoursMap[hour.location_id] && hour.day_of_week >= 0 && hour.day_of_week <= 6) {
            // Activar el día si encontramos al menos un horario
            hoursMap[hour.location_id][hour.day_of_week].active = true;
            
            // Tomamos el primer horario para mostrar en la interfaz principal
            if (!hoursMap[hour.location_id][hour.day_of_week].start.includes(':')) {
              hoursMap[hour.location_id][hour.day_of_week] = {
                active: true,
                start: hour.start_time.substring(0, 5),
                end: hour.end_time.substring(0, 5)
              };
            }
            
            // Guardar este horario como activo en nuestro mapa de verificación
            const key = `${hour.location_id}-${hour.day_of_week}-${hour.start_time.substring(0, 5)}-${hour.end_time.substring(0, 5)}`;
            activeHoursMap.set(key, true);
          }
        }
      }
      
      // Establecer los horarios para la interfaz
      setWorkingHours(hoursMap);
      
      // También cargar los slots de horarios para cada centro
      if (stylist.location_ids && stylist.location_ids.length > 0) {
        // Para cada centro, cargar sus horarios
        for (const locationId of stylist.location_ids) {
          try {
            const { data, error } = await supabase
              .from('location_hours')
              .select('*')
              .eq('location_id', locationId)
              .order('day_of_week')
              .order('slot_number');
            
            if (error) throw error;
            
            if (data && data.length > 0) {
              // Agrupar horarios por día
              const hoursByDay: { [day: number]: Array<{ start: string; end: string; }> } = {};
              
              data.forEach(hour => {
                const day = hour.day_of_week;
                if (!hoursByDay[day]) {
                  hoursByDay[day] = [];
                }
                
                hoursByDay[day].push({
                  start: hour.start_time.substring(0, 5),
                  end: hour.end_time.substring(0, 5)
                });
              });
              
              // Crear y guardar los slots para cada día
              Object.keys(hoursByDay).forEach(dayStr => {
                const day = parseInt(dayStr);
                if (hoursByDay[day] && hoursByDay[day].length > 0) {
                  // Crear los slots con su estado activo/inactivo
                  const slots = hoursByDay[day].map(slot => {
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
              });
            }
          } catch (error) {
            console.error(`Error al cargar horarios del centro ${locationId}:`, error);
          }
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
              // Buscar si tenemos slots guardados para este día y ubicación
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
        throw new Error(`Error al eliminar los servicios del estilista: ${servicesError.message}`);
      }
      
      // Eliminar estilista
      const { error } = await supabase
        .from('stylists')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw new Error(`Error al eliminar el estilista: ${error.message}`);
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
    <div className="bg-black text-white p-6">
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      {/* Botón para mostrar formulario de nuevo estilista */}
      {!editMode && (
        <button
          onClick={() => setShowStylistForm(!showStylistForm)}
          className="bg-white text-black px-6 py-2 rounded-md mb-6 hover:bg-yellow-300 transition-colors border-2 border-primary"
          style={{fontWeight: 'bold'}}
        >
          {showStylistForm ? 'Cerrar formulario' : 'Agregar Nuevo Estilista'}
        </button>
      )}
      
      {/* Formulario para añadir/editar estilista */}
      {showStylistForm && (
        <div className="bg-white p-6 rounded mb-6 border border-gray-300 shadow-sm">
          <h3 className="text-xl font-semibold mb-4" style={{color: '#1a1a1a'}}>
            {editMode ? "Modificar Estilista" : "Agregar Nuevo Estilista"}
          </h3>
          
          <div className="mb-4 p-3 rounded bg-blue-50 border-l-4 border-blue-400">
            <p className="text-sm text-gray-700">
              <strong>Información importante sobre horarios:</strong> Cuando seleccionas un centro, el sistema carga automáticamente 
              todos los horarios definidos para ese centro. Si el centro tiene múltiples franjas horarias para un día 
              (por ejemplo, mañana y tarde), el estilista estará disponible en todas esas franjas si el día está activo.
            </p>
          </div>
          
          <form onSubmit={handleStylistSubmit} className="space-y-4">
            <div>
              <label className="block mb-1 text-gray-700">Nombre:</label>
              <input
                type="text"
                value={newStylist.name}
                onChange={(e) => setNewStylist({...newStylist, name: e.target.value})}
                className="w-full p-2 rounded border border-gray-300"
                style={{backgroundColor: '#ffffff', color: '#000000'}}
                placeholder="Nombre del estilista"
                required
              />
            </div>
            
            <div>
              <label className="block mb-1 text-gray-700">Descripción / Bio:</label>
              <textarea
                value={newStylist.bio}
                onChange={(e) => setNewStylist({...newStylist, bio: e.target.value})}
                className="w-full p-2 rounded border border-gray-300"
                style={{backgroundColor: '#ffffff', color: '#000000'}}
                rows={4}
                placeholder="Descripción o biografía del estilista"
              />
            </div>
            
            <div>
              <label className="block mb-1 text-gray-700">Centros donde trabaja:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded bg-gray-50 border border-gray-200">
                {locations.map(location => (
                  <div key={location.id} className="flex items-center text-gray-800">
                    <input
                      type="checkbox"
                      id={`location-${location.id}`}
                      checked={newStylist.locationIds.includes(location.id)}
                      onChange={(e) => handleLocationChange(location.id, e.target.checked)}
                      className="mr-2"
                    />
                    <label htmlFor={`location-${location.id}`}>
                      {location.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Horarios de trabajo */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2 text-gray-800">
                Horarios de trabajo:
              </h3>
              
              <div className="mb-4 p-3 rounded bg-yellow-50 border-l-4 border-yellow-400">
                <p className="text-sm text-gray-700">
                  Los horarios del estilista se adaptan automáticamente a los horarios definidos para cada centro. 
                  Si un centro tiene múltiples franjas horarias para un día, el estilista estará disponible en todas ellas.
                </p>
                <p className="text-sm mt-1 text-gray-700">
                  Para cada día, puedes activar o desactivar la disponibilidad. Si un día está activo, 
                  todos los horarios del centro para ese día se asignarán al estilista.
                </p>
              </div>
              
              {newStylist.locationIds.length === 0 ? (
                <p className="text-gray-700">Selecciona al menos un centro para configurar los horarios.</p>
              ) : (
                <div className="space-y-4">
                  {newStylist.locationIds.map(locationId => {
                    const location = locations.find(l => l.id === locationId);
                    return (
                      <div key={`hours-${locationId}`} className="p-3 rounded bg-gray-50 border border-gray-200">
                        <h4 className="font-medium mb-2 text-gray-800">
                          {location?.name}
                        </h4>
                        <div className="space-y-2">
                          {weekdays.map(day => (
                            <div key={`${locationId}-${day.id}`} className="flex flex-wrap items-center gap-3">
                              <div className="flex items-center w-32">
                                <input
                                  type="checkbox"
                                  id={`active-${locationId}-${day.id}`}
                                  checked={workingHours[locationId]?.[day.id]?.active || false}
                                  onChange={(e) => updateWorkingHour(locationId, day.id, 'active', e.target.checked)}
                                  className="mr-2"
                                />
                                <label htmlFor={`active-${locationId}-${day.id}`} className="text-gray-700">
                                  {day.name}
                                </label>
                              </div>
                              
                              {workingHours[locationId]?.[day.id]?.active && (
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <div className="flex items-center">
                                    <span className="text-gray-700 mr-2">De</span>
                                    <input
                                      type="time"
                                      className="px-2 py-1 border rounded"
                                      value={workingHours[locationId]?.[day.id]?.start || defaultHours.start}
                                      onChange={(e) => updateWorkingHour(locationId, day.id, 'start', e.target.value)}
                                      disabled={!workingHours[locationId]?.[day.id]?.active}
                                    />
                                  </div>
                                  <div className="flex items-center">
                                    <span className="text-gray-700 mr-2">a</span>
                                    <input
                                      type="time"
                                      className="px-2 py-1 border rounded"
                                      value={workingHours[locationId]?.[day.id]?.end || defaultHours.end}
                                      onChange={(e) => updateWorkingHour(locationId, day.id, 'end', e.target.value)}
                                      disabled={!workingHours[locationId]?.[day.id]?.active}
                                    />
                                  </div>
                                </div>
                              )}
                              
                              {/* Mostrar slots de horarios para seleccionar individualmente */}
                              {workingHours[locationId]?.[day.id]?.active && 
                                (() => {
                                  // Buscar slots para este centro y día
                                  const centerSlots = locationHourSlots.find(
                                    item => item.locationId === locationId && item.dayOfWeek === day.id
                                  );
                                  
                                  if (centerSlots && centerSlots.slots.length > 0) {
                                    return (
                                      <div className="mt-2 text-xs text-gray-700">
                                        <p className="mb-1"><strong>Selecciona las franjas horarias:</strong></p>
                                        <div className="pl-2 space-y-2">
                                          {centerSlots.slots.map((slot, idx) => (
                                            <div key={idx} className="flex items-center">
                                              <input
                                                type="checkbox"
                                                id={`slot-${locationId}-${day.id}-${idx}`}
                                                checked={slot.active}
                                                onChange={() => toggleHourSlot(locationId, day.id, idx)}
                                                className="mr-2"
                                              />
                                              <label 
                                                htmlFor={`slot-${locationId}-${day.id}-${idx}`}
                                                className={`${slot.active ? 'text-primary' : 'text-gray-400'}`}
                                              >
                                                {slot.start} - {slot.end}
                                              </label>
                                            </div>
                                          ))}
                                        </div>
                                        <p className="mt-2 text-xs text-amber-700">
                                          ℹ️ Solo se habilitarán las franjas horarias seleccionadas
                                        </p>
                                      </div>
                                    );
                                  }
                                  return null;
                                })()
                              }
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            
            {/* Servicios que ofrece el estilista */}
            <div>
              <label className="block mb-1 text-gray-700">Servicios ofrecidos:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded bg-gray-50 border border-gray-200">
                {services.map(service => (
                  <div key={service.id} className="flex items-center text-gray-800">
                    <input
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
                      className="mr-2"
                    />
                    <label htmlFor={`service-${service.id}`}>
                      {service.nombre} - {service.precio}€
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <label className="block mb-1 text-gray-700">Imagen de perfil:</label>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 rounded text-gray-800 border border-gray-300"
                  />
                  <p className="text-sm mt-1 text-gray-500">
                    Formato recomendado: JPEG o PNG, tamaño máximo 2MB
                  </p>
                </div>
                
                {stylistImagePreview && (
                  <div className="w-24 h-24 relative">
                    <Image
                      src={stylistImagePreview}
                      alt="Vista previa"
                      className="rounded object-cover w-full h-full border-2 border-gray-300"
                      width={96}
                      height={96}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex space-x-3 pt-2">
              <button
                type="submit"
                className="bg-primary px-4 py-2 rounded"
                style={{color: '#000000', fontWeight: 'bold'}}
                disabled={isUploading}
              >
                {isUploading ? 'Cargando...' : (editMode ? "Actualizar Estilista" : "Crear Estilista")}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  resetStylistForm();
                  setShowStylistForm(false);
                }}
                className="bg-gray-400 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Lista de estilistas - siempre visible */}
      <div className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stylists.length === 0 ? (
            <p className="text-gray-700">No hay estilistas registrados.</p>
          ) : (
            stylists.map(stylist => (
              <div 
                key={stylist.id} 
                className="rounded border shadow-sm hover:shadow-md transition-shadow bg-white border-gray-200 overflow-hidden"
              >
                {/* Imagen adaptada para diferentes tamaños */}
                {stylist.profile_img ? (
                  <>
                    {/* Imagen grande en escritorio, oculta en móvil */}
                    <div className="hidden md:block relative w-full h-48">
                      <Image 
                        src={stylist.profile_img} 
                        alt={stylist.name} 
                        fill
                        className="object-cover"
                      />
                    </div>
                    {/* Imagen pequeña en móvil, oculta en escritorio */}
                    <div className="md:hidden flex p-4">
                      <div className="relative h-16 w-16 rounded-full overflow-hidden mr-3 flex-shrink-0">
                        <Image 
                          src={stylist.profile_img} 
                          alt={stylist.name} 
                          width={64}
                          height={64}
                          className="absolute inset-0 w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h4 className="text-lg font-medium text-gray-800">
                          {stylist.name}
                        </h4>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="p-4 flex items-center">
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-200 mr-3"
                    >
                      <span className="text-gray-700">
                        {stylist.name.charAt(0)}
                      </span>
                    </div>
                    <h4 className="text-lg font-medium text-gray-800">
                      {stylist.name}
                    </h4>
                  </div>
                )}
                
                {/* Nombre visible solo en escritorio cuando hay imagen */}
                {stylist.profile_img && (
                  <div className="hidden md:block p-4 pb-2">
                    <h4 className="text-lg font-medium text-gray-800">
                      {stylist.name}
                    </h4>
                  </div>
                )}
                
                <div className="px-4">
                  {stylist.bio && (
                    <p className="mb-3 text-gray-600">
                      {stylist.bio.length > 100 ? `${stylist.bio.substring(0, 100)}...` : stylist.bio}
                    </p>
                  )}
                  
                  <div className="mb-3">
                    <h5 className="text-sm font-medium mb-1 text-gray-700">Centros:</h5>
                    <div className="flex flex-wrap gap-1">
                      {stylist.location_ids?.map(locId => (
                        <span 
                          key={locId} 
                          className="text-xs rounded px-2 py-1 bg-gray-100 text-gray-700"
                        >
                          {locations.find(loc => loc.id === locId)?.name || 'Centro desconocido'}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2 p-4 mt-auto border-t">
                  <button
                    onClick={() => loadStylistForEdit(stylist.id)}
                    className="flex-1 text-center py-1 rounded bg-blue-100 text-blue-700 font-medium text-sm hover:bg-blue-200 transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => handleDeleteStylist(stylist.id)}
                    className="flex-1 text-center py-1 rounded bg-red-100 text-red-700 font-medium text-sm hover:bg-red-200 transition-colors"
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
