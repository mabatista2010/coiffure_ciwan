'use client';

import { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ServiceSelect from '@/components/reservation/ServiceSelect';
import LocationSelect from '@/components/reservation/LocationSelect';
import StylistSelect from '@/components/reservation/StylistSelect';
import DateTimeSelect from '@/components/reservation/DateTimeSelect';
import CustomerForm, { CustomerData } from '@/components/reservation/CustomerForm';
import Confirmation from '@/components/reservation/Confirmation';
import { Service, Location, Stylist } from '@/lib/supabase';

// Étapes du processus de réservation
enum BookingStage {
  ServiceSelect = 1,
  LocationSelect = 2,
  StylistSelect = 3,
  DateTimeSelect = 4,
  CustomerForm = 5,
  Confirmation = 6,
}

export default function ReservationPage() {
  // État pour l'étape actuelle
  const [currentStage, setCurrentStage] = useState<BookingStage>(BookingStage.ServiceSelect);
  
  // États pour conserver les sélections de l'utilisateur
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [bookingId, setBookingId] = useState<string>('');

  // Añadir un efecto para desplazar al principio cuando cambia la etapa
  useEffect(() => {
    // Desplazar al principio cuando se llega a la confirmación
    if (currentStage === BookingStage.Confirmation) {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, [currentStage]);

  // Gérer la sélection de service
  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setCurrentStage(BookingStage.LocationSelect);
  };

  // Gérer la sélection de centre
  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setCurrentStage(BookingStage.StylistSelect);
  };

  // Gérer la sélection de styliste
  const handleStylistSelect = (stylist: Stylist) => {
    setSelectedStylist(stylist);
    setCurrentStage(BookingStage.DateTimeSelect);
  };

  // Gérer la sélection de date et heure
  const handleDateTimeSelect = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setCurrentStage(BookingStage.CustomerForm);
  };

  // Gérer l'envoi du formulaire du client
  const handleCustomerSubmit = async (data: CustomerData) => {
    setCustomerData(data);
    
    try {
      // Envoyer les données de la réservation à l'API
      const response = await fetch('/api/reservation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerName: data.name,
          customerEmail: data.email,
          customerPhone: data.phone,
          notes: data.notes,
          serviceId: selectedService?.id,
          locationId: selectedLocation?.id,
          stylistId: selectedStylist?.id,
          bookingDate: selectedDate,
          startTime: selectedTime,
        }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la création de la réservation');
      }

      const result = await response.json();
      setBookingId(result.bookingId);
      setCurrentStage(BookingStage.Confirmation);
    } catch (error) {
      console.error('Erreur:', error);
      alert('Une erreur est survenue lors du traitement de votre réservation. Veuillez réessayer.');
    }
  };

  // Gérer le bouton de retour
  const handleBack = () => {
    if (currentStage > BookingStage.ServiceSelect) {
      setCurrentStage(currentStage - 1);
    }
  };

  // Rendre l'étape actuelle
  const renderCurrentStage = () => {
    switch (currentStage) {
      case BookingStage.ServiceSelect:
        return <ServiceSelect onServiceSelect={handleServiceSelect} />;
      
      case BookingStage.LocationSelect:
        if (!selectedService) return null;
        return (
          <LocationSelect 
            selectedService={selectedService} 
            onLocationSelect={handleLocationSelect} 
            onBack={handleBack}
          />
        );
      
      case BookingStage.StylistSelect:
        if (!selectedService || !selectedLocation) return null;
        return (
          <StylistSelect 
            selectedService={selectedService} 
            selectedLocation={selectedLocation} 
            onStylistSelect={handleStylistSelect} 
            onBack={handleBack}
          />
        );
      
      case BookingStage.DateTimeSelect:
        if (!selectedService || !selectedLocation || !selectedStylist) return null;
        return (
          <DateTimeSelect 
            selectedService={selectedService} 
            selectedLocation={selectedLocation} 
            selectedStylist={selectedStylist} 
            onDateTimeSelect={handleDateTimeSelect} 
            onBack={handleBack}
          />
        );
      
      case BookingStage.CustomerForm:
        if (!selectedService || !selectedLocation || !selectedStylist || !selectedDate || !selectedTime) return null;
        return (
          <CustomerForm 
            selectedService={selectedService} 
            selectedLocation={selectedLocation} 
            selectedStylist={selectedStylist} 
            selectedDate={selectedDate} 
            selectedTime={selectedTime} 
            onSubmit={handleCustomerSubmit} 
            onBack={handleBack}
          />
        );
      
      case BookingStage.Confirmation:
        if (!selectedService || !selectedLocation || !selectedStylist || !selectedDate || !selectedTime || !customerData) return null;
        return (
          <Confirmation 
            bookingId={bookingId}
            selectedService={selectedService} 
            selectedLocation={selectedLocation} 
            selectedStylist={selectedStylist} 
            selectedDate={selectedDate} 
            selectedTime={selectedTime} 
            customerData={customerData}
          />
        );
      
      default:
        return null;
    }
  };

  // Rendre la barre de progression
  const renderProgressBar = () => {
    // Ne montrer que sur les étapes 1-5, pas sur la confirmation
    if (currentStage >= BookingStage.Confirmation) return null;

    return (
      <div className="container mx-auto px-4 py-4">
        <div className="relative pt-1">
          <div className="flex mb-2 items-center justify-between">
            <div>
              <span className="text-xs font-semibold inline-block py-1 px-2 uppercase rounded-full text-secondary bg-primary">
                Étape {currentStage} de 5
              </span>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold inline-block text-secondary">
                {Math.round((currentStage / 5) * 100)}%
              </span>
            </div>
          </div>
          <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
            <div 
              style={{ width: `${(currentStage / 5) * 100}%` }} 
              className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary transition-all duration-500"
            ></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <div className="flex-grow pt-24 pb-12 bg-gray-50">
        {renderProgressBar()}
        {renderCurrentStage()}
      </div>
      <Footer />
    </main>
  );
} 