'use client';

import React, { useState, useEffect, Fragment } from 'react';
import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaPhone, FaClock, FaEnvelope, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { supabase } from '@/lib/supabase';

// Tipo para los datos de centro
interface LocationData {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  description?: string;
  image?: string;
}

// Tipo para los horarios de centro
interface LocationHour {
  id: string;
  location_id: string;
  day_of_week: number;
  slot_number: number;
  start_time: string;
  end_time: string;
}

// Constante con los estilos del fondo para desktop
const backgroundStyle = {
  backgroundImage: 'url("https://tvdwepumtrrjpkvnitpw.supabase.co/storage/v1/object/public/fotos_peluqueria//freepik__a-highly-realistic-venetian-plaster-texture-in-dee__43097.jpeg")',
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundAttachment: 'fixed'
};

// Constante con los estilos del fondo para móvil (sin parallax)
const backgroundStyleMobile = {
  backgroundImage: 'url("https://tvdwepumtrrjpkvnitpw.supabase.co/storage/v1/object/public/fotos_peluqueria//freepik__a-highly-realistic-venetian-plaster-texture-in-dee__43097.jpeg")',
  backgroundSize: 'cover',
  backgroundPosition: 'center'
  // Se elimina backgroundAttachment: 'fixed' para móviles
};

// Nombres de los días de la semana en francés
const dayNames = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi'
];

export default function Location() {
  const [locations, setLocations] = useState<LocationData[]>([]);
  const [locationHours, setLocationHours] = useState<{[key: string]: LocationHour[]}>({});
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Para la navegación del carrusel en caso de muchos centros
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Detectar si es mobile
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    // Verificar al inicio
    checkIfMobile();
    
    // Añadir event listener para cambios de tamaño
    window.addEventListener('resize', checkIfMobile);
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Obtener los centros al cargar el componente
  useEffect(() => {
    async function fetchLocations() {
      try {
        setIsLoading(true);
        
        // Obtener todos los centros activos
        const { data: locationsData, error: locationsError } = await supabase
          .from('locations')
          .select('*')
          .eq('active', true)
          .order('name');
        
        if (locationsError) throw locationsError;
        
        if (locationsData && locationsData.length > 0) {
          setLocations(locationsData);
          
          // Seleccionar automáticamente el primer centro
          setSelectedLocation(locationsData[0].id);
          
          // Obtener los horarios de todos los centros
          const { data: hoursData, error: hoursError } = await supabase
            .from('location_hours')
            .select('*')
            .in('location_id', locationsData.map(loc => loc.id));
          
          if (hoursError) throw hoursError;
          
          // Organizar los horarios por centro
          const hoursByLocation: {[key: string]: LocationHour[]} = {};
          
          if (hoursData) {
            hoursData.forEach(hour => {
              if (!hoursByLocation[hour.location_id]) {
                hoursByLocation[hour.location_id] = [];
              }
              hoursByLocation[hour.location_id].push(hour);
            });
          }
          
          setLocationHours(hoursByLocation);
        }
      } catch (err) {
        console.error('Error al cargar centros:', err);
        setError('Error al cargar la información de los centros');
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchLocations();
  }, []);

  // Función para obtener la URL de Google Maps para la navegación
  const getDirectionsUrl = (address: string) => {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
  };
  
  // Función para obtener la URL de Google Maps según la dirección (para el iframe)
  const getGoogleMapsUrl = (address: string) => {
    // Construir URL para búsqueda de Google Maps
    return `https://maps.google.com/maps?q=${encodeURIComponent(address)}&t=&z=15&ie=UTF8&iwloc=&output=embed`;
  };

  // Función para navegar entre centros en el carrusel
  const goToPreviousCenter = () => {
    setCurrentIndex(prevIndex => prevIndex === 0 ? locations.length - 1 : prevIndex - 1);
    setSelectedLocation(locations[currentIndex === 0 ? locations.length - 1 : currentIndex - 1].id);
  };
  
  const goToNextCenter = () => {
    setCurrentIndex(prevIndex => prevIndex === locations.length - 1 ? 0 : prevIndex + 1);
    setSelectedLocation(locations[currentIndex === locations.length - 1 ? 0 : currentIndex + 1].id);
  };
  
  // Función para seleccionar un centro específico
  const selectCenter = (locationId: string, index: number) => {
    setSelectedLocation(locationId);
    setCurrentIndex(index);
  };
  
  // Ordenar las horas de un centro por día y slot
  const getFormattedHours = (locationId: string) => {
    if (!locationId) return {}; // Manejar el caso donde no hay un ID de centro válido
    
    const hours = locationHours[locationId] || [];
    
    // Organizar las horas por día de la semana
    const hoursByDay: {[key: number]: {start: string, end: string}[]} = {};
    
    // Inicializar todos los días como vacíos para mayor consistencia
    for (let day = 0; day < 7; day++) {
      hoursByDay[day] = [];
    }
    
    hours.forEach(hour => {
      if (hour.day_of_week >= 0 && hour.day_of_week <= 6) {
        hoursByDay[hour.day_of_week].push({
          start: hour.start_time?.slice(0, 5) || '', // Formato HH:MM
          end: hour.end_time?.slice(0, 5) || ''
        });
      }
    });
    
    return hoursByDay;
  };
  
  // Obtener el centro seleccionado
  const selectedLocationData = selectedLocation 
    ? locations.find(loc => loc.id === selectedLocation) 
    : locations.length > 0 ? locations[0] : null;
  
  if (isLoading) {
    return (
      <section 
        id="ubicacion" 
        className="py-20 relative"
        style={isMobile ? backgroundStyleMobile : backgroundStyle}
      >
        {/* Capa de oscurecimiento */}
        <div className="absolute inset-0 bg-black opacity-75"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <p className="text-primary">Chargement des informations...</p>
          </div>
        </div>
      </section>
    );
  }
  
  if (error) {
    return (
      <section 
        id="ubicacion" 
        className="py-20 relative"
        style={isMobile ? backgroundStyleMobile : backgroundStyle}
      >
        {/* Capa de oscurecimiento */}
        <div className="absolute inset-0 bg-black opacity-75"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <p className="text-coral">{error}</p>
          </div>
        </div>
      </section>
    );
  }
  
  if (locations.length === 0) {
    return (
      <section 
        id="ubicacion" 
        className="py-20 relative"
        style={isMobile ? backgroundStyleMobile : backgroundStyle}
      >
        {/* Capa de oscurecimiento */}
        <div className="absolute inset-0 bg-black opacity-75"></div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center">
            <p className="text-primary">Aucun centre disponible</p>
          </div>
        </div>
      </section>
    );
  }
  
  // Renderizar según el número de centros
  return (
    <section 
      id="ubicacion" 
      className="py-16 md:py-24 relative"
      style={isMobile ? backgroundStyleMobile : backgroundStyle}
    >
      {/* Capa de oscurecimiento */}
      <div className="absolute inset-0 bg-black opacity-75"></div>
      
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-10 md:mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
            {locations.length === 1 ? 'Notre Emplacement' : 'Nos Emplacements'}
          </h2>
          <p className="text-lg max-w-2xl mx-auto text-light">
            Trouvez-nous facilement et venez nous rendre visite pour profiter de notre service de première qualité.
          </p>
        </motion.div>
        
        {/* Selector de centros si hay más de uno */}
        {locations.length > 1 && (
          <div className="flex justify-center mb-8">
            <div className="flex flex-wrap gap-2 justify-center">
              {locations.map((location, index) => (
                <button
                  key={location.id}
                  onClick={() => selectCenter(location.id, index)}
                  className={`px-5 py-3 rounded-md transition-all text-sm md:text-base font-medium uppercase ${
                    selectedLocation === location.id
                      ? 'bg-primary text-secondary font-bold'
                      : 'bg-secondary border border-gray-700 text-light hover:bg-gray-800'
                  }`}
                >
                  {location.name}
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Navegación del carrusel para móviles si hay más de 1 centro */}
        {locations.length > 1 && (
          <div className="lg:hidden flex justify-center mb-6">
            <button 
              onClick={goToPreviousCenter}
              className="bg-primary text-secondary p-3 rounded-full mr-4 hover:opacity-80 transition-opacity shadow-md"
              aria-label="Centre précédent"
            >
              <FaChevronLeft />
            </button>
            <span className="text-text-medium flex items-center text-sm">
              {currentIndex + 1} / {locations.length}
            </span>
            <button 
              onClick={goToNextCenter}
              className="bg-primary text-secondary p-3 rounded-full ml-4 hover:opacity-80 transition-opacity shadow-md"
              aria-label="Centre suivant"
            >
              <FaChevronRight />
            </button>
          </div>
        )}
        
        {selectedLocationData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8 items-start">
            {/* Mapa */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="w-full h-[350px] md:h-[500px] rounded-lg overflow-hidden shadow-lg"
            >
              <iframe
                src={getGoogleMapsUrl(selectedLocationData.address)}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen={true}
                loading="lazy"
                title={`Emplacement de ${selectedLocationData.name}`}
              ></iframe>
            </motion.div>

            {/* Información de contacto */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5 }}
              viewport={{ once: true }}
              className="bg-white rounded-lg shadow-lg p-5 md:p-6 h-auto md:h-[500px] overflow-y-auto"
            >
              <h3 className="text-3xl font-bold text-primary mb-5">
                {selectedLocationData.name}
              </h3>

              <div className="space-y-5">
                <div className="flex items-start">
                  <div className="bg-primary rounded-full p-3 mr-4 flex-shrink-0">
                    <FaMapMarkerAlt className="text-secondary text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-secondary">Adresse</h4>
                    <p className="text-gray-700">
                      {selectedLocationData.address}
                    </p>
                    <a 
                      href={getDirectionsUrl(selectedLocationData.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 px-3 py-1 bg-primary text-secondary rounded-md text-sm font-medium hover:opacity-90 transition-opacity"
                    >
                      Voir itinéraire
                    </a>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary rounded-full p-3 mr-4 flex-shrink-0">
                    <FaPhone className="text-secondary text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-secondary">Téléphone</h4>
                    <p className="text-gray-700">
                      {selectedLocationData.phone}
                    </p>
                    <p className="text-gray-700 mt-1">
                      Vous pouvez aussi réserver par WhatsApp
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="bg-primary rounded-full p-3 mr-4 flex-shrink-0">
                    <FaEnvelope className="text-secondary text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-secondary">Email</h4>
                    <p className="text-gray-700">
                      {selectedLocationData.email}
                    </p>
                  </div>
                </div>

                <div className="flex items-start">
                  <div className="bg-primary rounded-full p-3 mr-4 flex-shrink-0">
                    <FaClock className="text-secondary text-xl" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-secondary">Horaires</h4>
                    <div className="grid grid-cols-2 gap-x-4 text-gray-700">
                      {Object.entries(getFormattedHours(selectedLocationData.id)).map(([day, slots]) => (
                        <Fragment key={day}>
                          <p>{dayNames[parseInt(day)]}:</p>
                          <div>
                            {slots.length > 0 ? (
                              slots.map((slot, index) => (
                                <p key={index}>{slot.start} - {slot.end}</p>
                              ))
                            ) : (
                              <p>Fermé</p>
                            )}
                          </div>
                        </Fragment>
                      ))}
                      
                      {/* Si no hay horarios para un día, mostrar como cerrado */}
                      {[0, 1, 2, 3, 4, 5, 6].map(day => {
                        const formattedHours = getFormattedHours(selectedLocationData.id);
                        if (!formattedHours[day]) {
                          return (
                            <Fragment key={day}>
                              <p>{dayNames[day]}:</p>
                              <p>Fermé</p>
                            </Fragment>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        
        {/* Botón de Reservar Ahora */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          viewport={{ once: true }}
          className="flex justify-center mt-10 md:mt-16"
        >
          <a 
            href="/reservation" 
            className="inline-flex items-center justify-center px-8 py-4 text-lg md:text-xl font-bold text-secondary bg-primary rounded-md hover:bg-opacity-90 transition-all transform hover:scale-105 shadow-lg uppercase"
          >
            Réservez Maintenant
          </a>
        </motion.div>
      </div>
    </section>
  );
} 