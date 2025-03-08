'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Service, Location, Stylist } from '@/lib/supabase';
import { FaUser, FaEnvelope, FaPhone, FaComment } from 'react-icons/fa';

interface CustomerFormProps {
  selectedService: Service;
  selectedLocation: Location;
  selectedStylist: Stylist;
  selectedDate: string;
  selectedTime: string;
  onSubmit: (customerData: CustomerData) => void;
  onBack: () => void;
}

export interface CustomerData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}

export default function CustomerForm({
  selectedService,
  selectedLocation,
  selectedStylist,
  selectedDate,
  selectedTime,
  onSubmit,
  onBack
}: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerData>({
    name: '',
    email: '',
    phone: '',
    notes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error cuando el usuario empieza a escribir
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Le nom est obligatoire';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'L\'email est obligatoire';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'L\'email n\'est pas valide';
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = 'Le téléphone est obligatoire';
    } else if (!/^\+?[0-9\s]{8,15}$/.test(formData.phone.replace(/[-\s]/g, ''))) {
      newErrors.phone = 'Le téléphone n\'est pas valide';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      setIsSubmitting(true);
      // Enviar datos
      onSubmit(formData);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-8"
      >
        <h2 className="text-3xl md:text-4xl font-bold mb-4 text-primary">
          Informations de Contact
        </h2>
        <p className="text-lg text-text-medium">
          Complétez vos informations pour confirmer la réservation
        </p>
      </motion.div>

      <div className="mb-6">
        <button 
          onClick={onBack}
          className="flex items-center text-primary hover:underline"
        >
          &larr; Retour à la sélection de date et heure
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Resumen de la reserva */}
        <div className="w-full md:w-1/3">
          <h3 className="text-xl font-semibold mb-4 text-secondary">
            Résumé de votre réservation
          </h3>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="mb-4 pb-4 border-b">
              <h4 className="font-semibold text-gray-800">Service</h4>
              <p className="text-gray-700">{selectedService.nombre}</p>
              <p className="text-primary font-semibold">{selectedService.precio}€</p>
            </div>
            <div className="mb-4 pb-4 border-b">
              <h4 className="font-semibold text-gray-800">Centre</h4>
              <p className="text-gray-700">{selectedLocation.name}</p>
              <p className="text-sm text-gray-600">{selectedLocation.address}</p>
            </div>
            <div className="mb-4 pb-4 border-b">
              <h4 className="font-semibold text-gray-800">Styliste</h4>
              <p className="text-gray-700">{selectedStylist.name}</p>
            </div>
            <div className="mb-4">
              <h4 className="font-semibold text-gray-800">Date et heure</h4>
              <p className="text-gray-700">{formatDate(selectedDate)}</p>
              <p className="text-gray-700">{selectedTime}</p>
            </div>
          </div>
        </div>

        {/* Formulario */}
        <div className="w-full md:w-2/3">
          <h3 className="text-xl font-semibold mb-4 text-secondary">
            Vos coordonnées
          </h3>
          <div className="bg-white rounded-lg shadow-md p-6">
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                  <FaUser /> Nom complet*
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.name ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Votre nom complet"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name}</p>}
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                  <FaEnvelope /> Email*
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="votre.email@exemple.com"
                />
                {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
              </div>

              <div className="mb-4">
                <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                  <FaPhone /> Téléphone*
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="+41 XX XXX XX XX"
                />
                {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
              </div>

              <div className="mb-6">
                <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2">
                  <FaComment /> Notes additionnelles
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                  placeholder="Écrivez toute information supplémentaire que vous souhaitez partager"
                ></textarea>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-primary text-secondary px-6 py-3 rounded-md font-semibold hover:bg-opacity-90 transition duration-300 flex items-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-secondary"></span>
                      <span>Traitement en cours...</span>
                    </>
                  ) : (
                    'Confirmer la réservation'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
} 