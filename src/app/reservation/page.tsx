'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import ServiceSelect from '@/components/reservation/ServiceSelect';
import LocationSelect from '@/components/reservation/LocationSelect';
import StylistSelect from '@/components/reservation/StylistSelect';
import DateTimeSelect from '@/components/reservation/DateTimeSelect';
import CustomerForm, { CustomerData } from '@/components/reservation/CustomerForm';
import Confirmation from '@/components/reservation/Confirmation';
import { Service, Location, Stylist } from '@/lib/supabase';

enum BookingStage {
  ServiceSelect = 1,
  LocationSelect = 2,
  StylistSelect = 3,
  DateTimeSelect = 4,
  CustomerForm = 5,
  Confirmation = 6,
}

const SERVICE_FLOW_FALLBACK = { current: 1, total: 3 };

export default function ReservationPage() {
  return (
    <Suspense fallback={<ReservationPageContent fallbackServiceSlug={null} />}>
      <ReservationPageSearchParams />
    </Suspense>
  );
}

function ReservationPageSearchParams() {
  const searchParams = useSearchParams();
  return <ReservationPageContent fallbackServiceSlug={searchParams.get('service')} />;
}

function ReservationPageContent({ fallbackServiceSlug }: { fallbackServiceSlug: string | null }) {
  const [currentStage, setCurrentStage] = useState<BookingStage>(BookingStage.ServiceSelect);
  const [serviceFlowMeta, setServiceFlowMeta] = useState(SERVICE_FLOW_FALLBACK);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedStylist, setSelectedStylist] = useState<Stylist | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [customerData, setCustomerData] = useState<CustomerData | null>(null);
  const [bookingId, setBookingId] = useState('');

  useEffect(() => {
    if (currentStage === BookingStage.Confirmation) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [currentStage]);

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    setSelectedLocation(null);
    setSelectedStylist(null);
    setSelectedDate('');
    setSelectedTime('');
    setCurrentStage(BookingStage.LocationSelect);
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
    setCurrentStage(BookingStage.StylistSelect);
  };

  const handleStylistSelect = (stylist: Stylist) => {
    setSelectedStylist(stylist);
    setCurrentStage(BookingStage.DateTimeSelect);
  };

  const handleDateTimeSelect = (date: string, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
    setCurrentStage(BookingStage.CustomerForm);
  };

  const handleCustomerSubmit = async (data: CustomerData) => {
    setCustomerData(data);

    try {
      const response = await fetch('/api/reservation/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': crypto.randomUUID(),
          'X-Booking-Source': 'web',
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

  const handleBack = () => {
    if (currentStage === BookingStage.LocationSelect) {
      setCurrentStage(BookingStage.ServiceSelect);
      return;
    }

    if (currentStage > BookingStage.ServiceSelect) {
      setCurrentStage((prev) => prev - 1);
    }
  };

  const renderCurrentStage = () => {
    switch (currentStage) {
      case BookingStage.ServiceSelect:
        return (
          <ServiceSelect
            onServiceSelect={handleServiceSelect}
            preselectedServiceSlug={fallbackServiceSlug}
            onProgressMetaChange={setServiceFlowMeta}
          />
        );

      case BookingStage.LocationSelect:
        if (!selectedService) return null;
        return <LocationSelect selectedService={selectedService} onLocationSelect={handleLocationSelect} onBack={handleBack} />;

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

  const renderProgressBar = () => {
    if (currentStage >= BookingStage.Confirmation) return null;

    const totalSteps = serviceFlowMeta.total + 4;
    const currentStep =
      currentStage === BookingStage.ServiceSelect
        ? serviceFlowMeta.current
        : serviceFlowMeta.total +
          (currentStage === BookingStage.LocationSelect
            ? 1
            : currentStage === BookingStage.StylistSelect
              ? 2
              : currentStage === BookingStage.DateTimeSelect
                ? 3
                : 4);

    return (
      <div className="container mx-auto px-4 py-4">
        <div className="relative pt-1">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <span className="inline-block rounded-full bg-primary px-2 py-1 text-xs font-semibold uppercase text-secondary">
                Étape {currentStep} de {totalSteps}
              </span>
            </div>
            <div className="text-right">
              <span className="inline-block text-xs font-semibold text-secondary">
                {Math.round((currentStep / totalSteps) * 100)}%
              </span>
            </div>
          </div>
          <div className="mb-4 flex h-2 overflow-hidden rounded bg-gray-200 text-xs">
            <div
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              className="flex flex-col justify-center whitespace-nowrap bg-primary text-center text-white shadow-none transition-all duration-500"
            />
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="flex min-h-screen flex-col bg-gray-50">
      <Navbar />
      <div className="relative flex-grow overflow-hidden pb-12 pt-24">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20"
          style={{ backgroundImage: "url('/reservation/booking-bg-16x9.jpeg')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(252,249,243,0.94)_0%,rgba(250,247,241,0.97)_38%,rgba(248,244,237,0.985)_100%)]" aria-hidden="true" />
        <div className="relative">
          {renderProgressBar()}
          {renderCurrentStage()}
        </div>
      </div>
      <Footer />
    </main>
  );
}
