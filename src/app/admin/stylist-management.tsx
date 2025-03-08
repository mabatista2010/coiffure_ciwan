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

  // Función para cargar horarios de trabajo de un estilista
  const loadWorkingHours = async (stylistId: string) => {
    try {
      const { data, error } = await supabase
        .from('working_hours')
        .select('*')
        .eq('stylist_id', stylistId);
        
      if (error) throw error;
      
      // Inicializar estructura de horarios
      const hoursMap: {
        [locationId: string]: {
          [dayOfWeek: number]: {
            active: boolean;
            start: string;
            end: string;
          }
        }
      } = {};
      
      // Inicializar con todos los centros y días
      newStylist.locationIds.forEach(locationId => {
        hoursMap[locationId] = {};
        weekdays.forEach(day => {
          hoursMap[locationId][day.id] = {
            active: false,
            start: defaultHours.start,
            end: defaultHours.end
          };
        });
      });
      
      // Rellenar con datos existentes
      if (data && data.length > 0) {
        data.forEach(hour => {
          if (hoursMap[hour.location_id] && hour.day_of_week >= 0 && hour.day_of_week <= 6) {
            hoursMap[hour.location_id][hour.day_of_week] = {
              active: true,
              start: hour.start_time.substring(0, 5), // Convertir "09:00:00" a "09:00"
              end: hour.end_time.substring(0, 5)
            };
          }
        });
      }
      
      setWorkingHours(hoursMap);
      return data;
    } catch (error) {
      console.error('Error al cargar horarios de trabajo:', error);
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
    setNewStylist({
      name: '',
      bio: '',
      locationIds: [],
      serviceIds: [],
    });
    setStylistImageFile(null);
    setStylistImagePreview('');
    setWorkingHours({});
    setEditMode(false);
    setShowStylistForm(false);
    setSelectedStylist('');
  };

  // Inicializar horarios cuando se selecciona un centro
  const handleLocationChange = (locationId: string, isSelected: boolean) => {
    let updatedLocationIds;
    
    if (isSelected) {
      // Añadir centro
      updatedLocationIds = [...newStylist.locationIds, locationId];
      
      // Inicializar horarios para este centro
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
    } else {
      // Eliminar centro
      updatedLocationIds = newStylist.locationIds.filter(id => id !== locationId);
      
      // Eliminar horarios para este centro
      setWorkingHours(prev => {
        const updated = { ...prev };
        delete updated[locationId];
        return updated;
      });
    }
    
    setNewStylist({
      ...newStylist,
      locationIds: updatedLocationIds
    });
  };

  // Actualizar horario para un centro y día específico
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
      
      // Cargar horarios de trabajo
      await loadWorkingHours(stylistId);
      
      setSelectedStylist(stylistId);
      setEditMode(true);
      setShowStylistForm(true);
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
        
        // 3. Crear o actualizar horarios
        for (const locationId of newStylist.locationIds) {
          if (!workingHours[locationId]) continue;
          
          for (const dayId in workingHours[locationId]) {
            const day = parseInt(dayId);
            const hourData = workingHours[locationId][day];
            
            if (!hourData.active) {
              // Si el día no está activo, eliminar el horario si existe
              const key = `${locationId}-${day}`;
              const existingHour = currentHoursMap.get(key);
              
              if (existingHour) {
                const { error: deleteError } = await supabase
                  .from('working_hours')
                  .delete()
                  .eq('id', existingHour.id);
                  
                if (deleteError) {
                  console.error(`Error al eliminar horario: ${deleteError.message}`);
                }
              }
            } else {
              // Si el día está activo, crear o actualizar
              const key = `${locationId}-${day}`;
              const existingHour = currentHoursMap.get(key);
              
              if (existingHour) {
                // Actualizar horario existente
                const { error: updateError } = await supabase
                  .from('working_hours')
                  .update({
                    start_time: `${hourData.start}:00`,
                    end_time: `${hourData.end}:00`
                  })
                  .eq('id', existingHour.id);
                  
                if (updateError) {
                  console.error(`Error al actualizar horario: ${updateError.message}`);
                }
              } else {
                // Crear nuevo horario
                const { error: insertError } = await supabase
                  .from('working_hours')
                  .insert([{
                    id: uuidv4(),
                    stylist_id: stylistId,
                    location_id: locationId,
                    day_of_week: day,
                    start_time: `${hourData.start}:00`,
                    end_time: `${hourData.end}:00`
                  }]);
                  
                if (insertError) {
                  console.error(`Error al crear horario: ${insertError.message}`);
                }
              }
            }
          }
        }
        
        // 4. Eliminar horarios de centros que ya no están asignados
        if (currentHours) {
          for (const hour of currentHours) {
            if (!newStylist.locationIds.includes(hour.location_id)) {
              const { error: deleteError } = await supabase
                .from('working_hours')
                .delete()
                .eq('id', hour.id);
                
              if (deleteError) {
                console.error(`Error al eliminar horario: ${deleteError.message}`);
              }
            }
          }
        }
      }
      
      // Recargar datos
      await loadStylists();
      resetStylistForm();
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
    <div>
      <h2 className="text-2xl font-semibold mb-4" style={{color: '#ffffff'}}>Gestión de Estilistas</h2>
      
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {errorMessage}
        </div>
      )}
      
      {/* Botón para mostrar formulario de nuevo estilista */}
      {!showStylistForm ? (
        <button
          onClick={() => setShowStylistForm(true)}
          className="bg-primary px-4 py-2 rounded mb-6"
          style={{color: '#000000', fontWeight: 'bold'}}
        >
          Agregar Nuevo Estilista
        </button>
      ) : (
        <div className="bg-gray-800 p-6 rounded mb-6 border border-gray-700">
          <h3 className="text-xl font-semibold mb-4" style={{color: '#ffffff'}}>
            {editMode ? "Modificar Estilista" : "Agregar Nuevo Estilista"}
          </h3>
          
          <form onSubmit={handleStylistSubmit} className="space-y-4">
            <div>
              <label className="block mb-1" style={{color: '#ffffff'}}>Nombre:</label>
              <input
                type="text"
                value={newStylist.name}
                onChange={(e) => setNewStylist({...newStylist, name: e.target.value})}
                className="w-full p-2 rounded"
                style={{backgroundColor: '#f0f0f0', color: '#000000'}}
                placeholder="Nombre del estilista"
                required
              />
            </div>
            
            <div>
              <label className="block mb-1" style={{color: '#ffffff'}}>Descripción / Bio:</label>
              <textarea
                value={newStylist.bio}
                onChange={(e) => setNewStylist({...newStylist, bio: e.target.value})}
                className="w-full p-2 rounded"
                style={{backgroundColor: '#f0f0f0', color: '#000000'}}
                rows={4}
                placeholder="Descripción o biografía del estilista"
              />
            </div>
            
            <div>
              <label className="block mb-1" style={{color: '#ffffff'}}>Centros donde trabaja:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded" style={{backgroundColor: '#333333'}}>
                {locations.map(location => (
                  <div key={location.id} className="flex items-center" style={{color: '#e0e0e0'}}>
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
            
            {/* Nueva sección: Horarios de trabajo */}
            {newStylist.locationIds.length > 0 && (
              <div>
                <label className="block mb-1" style={{color: '#ffffff'}}>Horarios de trabajo:</label>
                <div className="space-y-4">
                  {newStylist.locationIds.map(locationId => {
                    const location = locations.find(l => l.id === locationId);
                    return (
                      <div key={`hours-${locationId}`} className="p-3 rounded" style={{backgroundColor: '#333333'}}>
                        <h4 className="font-medium mb-2" style={{color: '#ffffff'}}>
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
                                <label htmlFor={`active-${locationId}-${day.id}`} style={{color: '#e0e0e0'}}>
                                  {day.name}
                                </label>
                              </div>
                              
                              {workingHours[locationId]?.[day.id]?.active && (
                                <div className="flex items-center space-x-2 flex-wrap">
                                  <div className="flex items-center">
                                    <span style={{color: '#e0e0e0'}} className="mr-2">De</span>
                                    <input
                                      type="time"
                                      value={workingHours[locationId]?.[day.id]?.start || defaultHours.start}
                                      onChange={(e) => updateWorkingHour(locationId, day.id, 'start', e.target.value)}
                                      className="p-1 rounded"
                                      style={{backgroundColor: '#f0f0f0', color: '#000000'}}
                                    />
                                  </div>
                                  <div className="flex items-center">
                                    <span style={{color: '#e0e0e0'}} className="mr-2">a</span>
                                    <input
                                      type="time"
                                      value={workingHours[locationId]?.[day.id]?.end || defaultHours.end}
                                      onChange={(e) => updateWorkingHour(locationId, day.id, 'end', e.target.value)}
                                      className="p-1 rounded"
                                      style={{backgroundColor: '#f0f0f0', color: '#000000'}}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            
            {/* Servicios que ofrece el estilista */}
            <div>
              <label className="block mb-1" style={{color: '#ffffff'}}>Servicios ofrecidos:</label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-3 rounded" style={{backgroundColor: '#333333'}}>
                {services.map(service => (
                  <div key={service.id} className="flex items-center" style={{color: '#e0e0e0'}}>
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
              <label className="block mb-1" style={{color: '#ffffff'}}>Imagen de perfil:</label>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="w-full p-2 rounded"
                    style={{color: '#ffffff'}}
                  />
                  <p className="text-sm mt-1" style={{color: '#999999'}}>
                    Formato recomendado: JPEG o PNG, tamaño máximo 2MB
                  </p>
                </div>
                
                {stylistImagePreview && (
                  <div className="w-24 h-24 relative">
                    <Image
                      src={stylistImagePreview}
                      alt="Vista previa"
                      className="rounded object-cover w-full h-full border-2"
                      style={{borderColor: '#555555'}}
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
                onClick={resetStylistForm}
                className="bg-gray-600 text-white px-4 py-2 rounded"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Lista de estilistas */}
      <div className="mb-6">
        <h3 className="text-xl font-semibold mb-2" style={{color: '#ffffff'}}>
          Estilistas Registrados
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stylists.length === 0 ? (
            <p style={{color: '#e0e0e0'}}>No hay estilistas registrados.</p>
          ) : (
            stylists.map(stylist => (
              <div 
                key={stylist.id} 
                className="p-4 rounded border"
                style={{backgroundColor: '#333333', borderColor: '#555555'}}
              >
                <div className="flex items-center space-x-3 mb-2">
                  {stylist.profile_img ? (
                    <Image 
                      src={stylist.profile_img} 
                      alt={stylist.name} 
                      className="w-12 h-12 rounded-full object-cover"
                      width={48}
                      height={48}
                    />
                  ) : (
                    <div 
                      className="w-12 h-12 rounded-full flex items-center justify-center"
                      style={{backgroundColor: '#555555'}}
                    >
                      <span style={{color: '#ffffff'}}>
                        {stylist.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  
                  <h4 className="text-lg font-medium" style={{color: '#ffffff'}}>
                    {stylist.name}
                  </h4>
                </div>
                
                {stylist.bio && (
                  <p className="mb-3" style={{color: '#e0e0e0'}}>
                    {stylist.bio.length > 100 ? `${stylist.bio.substring(0, 100)}...` : stylist.bio}
                  </p>
                )}
                
                <div className="mb-3">
                  <h5 className="text-sm font-medium mb-1" style={{color: '#cccccc'}}>Centros:</h5>
                  <div className="flex flex-wrap gap-1">
                    {stylist.location_ids?.map(locId => (
                      <span 
                        key={locId} 
                        className="text-xs rounded px-2 py-1"
                        style={{backgroundColor: '#444444', color: '#e0e0e0'}}
                      >
                        {locations.find(loc => loc.id === locId)?.name || 'Centro desconocido'}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => loadStylistForEdit(stylist.id)}
                    className="flex-1 text-sm bg-blue-500 text-white px-2 py-1 rounded"
                  >
                    Editar Estilista y Servicios
                  </button>
                  <button
                    onClick={() => handleDeleteStylist(stylist.id)}
                    className="text-sm bg-red-500 text-white px-2 py-1 rounded"
                  >
                    Eliminar
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
