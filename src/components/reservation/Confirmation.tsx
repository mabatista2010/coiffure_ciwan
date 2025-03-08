'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import { useEffect } from 'react';
import { Service, Location, Stylist } from '@/lib/supabase';
import { CustomerData } from './CustomerForm';
import { FaCheckCircle, FaCalendarAlt, FaHome } from 'react-icons/fa';
import { addToCalendar } from '@/lib/calendarUtils';

interface ConfirmationProps {
  bookingId: string;
  selectedService: Service;
  selectedLocation: Location;
  selectedStylist: Stylist;
  selectedDate: string;
  selectedTime: string;
  customerData: CustomerData;
}

export default function Confirmation({
  bookingId,
  selectedService,
  selectedLocation,
  selectedStylist,
  selectedDate,
  selectedTime,
  customerData
}: ConfirmationProps) {
  // Efecto para desplazar al principio cuando se monta el componente
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, []);

  // Formatear fecha para mostrar
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date);
  };

  // Calcular hora de fin sumando la duración del servicio
  const calculateEndTime = (startTime: string, durationMinutes: number = 30): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate);
    endDate.setMinutes(endDate.getMinutes() + durationMinutes);
    
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleAddToCalendar = () => {
    const title = `Rendez-vous de coiffure: ${selectedService.nombre}`;
    const description = `
      Service: ${selectedService.nombre}
      Centre: ${selectedLocation.name}
      Adresse: ${selectedLocation.address}
      Styliste: ${selectedStylist.name}
      Notes: ${customerData.notes || 'Aucune'}
    `;
    const location = selectedLocation.address;
    const startDate = new Date(`${selectedDate}T${selectedTime}`);
    const endDate = new Date(`${selectedDate}T${calculateEndTime(selectedTime, selectedService.duration)}`);
    
    addToCalendar(title, description, location, startDate, endDate);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <div className="flex justify-center mb-4">
          <FaCheckCircle className="text-7xl text-green-500" />
        </div>
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
          Réservation Confirmée !
        </h2>
        <p className="text-lg text-text-medium">
          Merci pour votre réservation. Nous avons envoyé les détails à votre adresse e-mail.
        </p>
        <p className="text-sm text-gray-600 mt-2">
          ID de Réservation: {bookingId}
        </p>
      </motion.div>

      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-lg p-8 mb-8">
        <h3 className="text-xl font-bold mb-4 pb-2 border-b text-secondary">
          Détails de votre réservation
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-gray-700 mb-1"><strong>Service:</strong> {selectedService.nombre}</p>
            <p className="text-gray-700 mb-1"><strong>Prix:</strong> {selectedService.precio}€</p>
            <p className="text-gray-700 mb-1"><strong>Durée:</strong> {selectedService.duration || 30} min</p>
            <p className="text-gray-700 mb-1"><strong>Centre:</strong> {selectedLocation.name}</p>
            <p className="text-gray-700 mb-1"><strong>Adresse:</strong> {selectedLocation.address}</p>
            <p className="text-gray-700 mb-4"><strong>Styliste:</strong> {selectedStylist.name}</p>
          </div>
          
          <div>
            <p className="text-gray-700 mb-1"><strong>Date:</strong> {formatDate(selectedDate)}</p>
            <p className="text-gray-700 mb-1"><strong>Heure:</strong> {selectedTime}</p>
            <p className="text-gray-700 mb-1"><strong>Nom:</strong> {customerData.name}</p>
            <p className="text-gray-700 mb-1"><strong>Email:</strong> {customerData.email}</p>
            <p className="text-gray-700 mb-1"><strong>Téléphone:</strong> {customerData.phone}</p>
            {customerData.notes && (
              <p className="text-gray-700 mb-1"><strong>Notes:</strong> {customerData.notes}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row justify-center gap-4 mb-8">
        <button
          onClick={handleAddToCalendar}
          className="bg-primary text-secondary px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition duration-300 flex items-center gap-2 justify-center"
        >
          <FaCalendarAlt /> Ajouter au calendrier
        </button>
        
        <Link
          href="/"
          className="bg-gray-200 text-gray-800 px-6 py-3 rounded-md font-semibold hover:bg-gray-300 transition duration-300 flex items-center gap-2 justify-center"
        >
          <FaHome /> Retour à l&apos;accueil
        </Link>
      </div>

      <div className="text-center text-gray-600 max-w-2xl mx-auto">
        <p className="mb-2">
          Si vous avez besoin de modifier ou d&apos;annuler votre réservation, veuillez nous contacter:
        </p>
        <p>
          <strong>Téléphone:</strong> {selectedLocation.phone} | <strong>Email:</strong> {selectedLocation.email}
        </p>
      </div>
    </div>
  );
} 