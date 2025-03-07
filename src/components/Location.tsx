'use client';

import { motion } from 'framer-motion';
import { FaMapMarkerAlt, FaPhone, FaClock } from 'react-icons/fa';

export default function Location() {
  return (
    <section id="ubicacion" className="py-20" style={{ backgroundColor: '#000000' }}>
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: '#DAA520' }}>
            Notre Emplacement
          </h2>
          <p className="text-lg max-w-2xl mx-auto" style={{ color: '#E0E0E0' }}>
            Trouvez-nous facilement et venez nous rendre visite pour profiter de notre service de première qualité.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          {/* Mapa */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="w-full h-96 rounded-lg overflow-hidden shadow-lg"
          >
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2743.793551086652!2d6.911442476846044!3d46.43075397111968!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x478e9b2f45c5a533%3A0x4cdeef48e4be5762!2sAv.%20des%20Alpes%2027%2C%201820%20Montreux%2C%20Suisse!5e0!3m2!1sfr!2s!4v1709795444257!5m2!1sfr!2s"
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen={true}
              loading="lazy"
              title="Emplacement de Coiffure Ciwan"
            ></iframe>
          </motion.div>

          {/* Información de contacto */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
            className="bg-white rounded-lg shadow-lg p-8"
          >
            <h3 className="text-2xl font-bold text-primary mb-6">
              Informations de Contact
            </h3>

            <div className="space-y-6">
              <div className="flex items-start">
                <div className="bg-primary rounded-full p-3 mr-4">
                  <FaMapMarkerAlt className="text-secondary text-xl" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-secondary">Adresse</h4>
                  <p className="text-gray-700">
                    Av. des Alpes 27 bis<br />
                    1820 Montreux
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-primary rounded-full p-3 mr-4">
                  <FaPhone className="text-secondary text-xl" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-secondary">Téléphone</h4>
                  <p className="text-gray-700">
                    077 981 22 84
                  </p>
                  <p className="text-gray-700 mt-1">
                    Vous pouvez aussi réserver par WhatsApp
                  </p>
                </div>
              </div>

              <div className="flex items-start">
                <div className="bg-primary rounded-full p-3 mr-4">
                  <FaClock className="text-secondary text-xl" />
                </div>
                <div>
                  <h4 className="font-bold text-lg text-secondary">Horaires</h4>
                  <div className="grid grid-cols-2 gap-x-4 text-gray-700">
                    <p>Lundi:</p>
                    <p>09:00 - 19:00</p>
                    <p>Mardi:</p>
                    <p>09:00 - 19:00</p>
                    <p>Mercredi:</p>
                    <p>09:00 - 19:00</p>
                    <p>Jeudi:</p>
                    <p>09:00 - 19:00</p>
                    <p>Vendredi:</p>
                    <p>09:00 - 19:00</p>
                    <p>Samedi:</p>
                    <p>09:00 - 17:00</p>
                    <p>Dimanche:</p>
                    <p>Fermé</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
} 