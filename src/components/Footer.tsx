'use client';

import Link from 'next/link';
import { FaFacebook, FaInstagram, FaTwitter, FaWhatsapp, FaLock } from 'react-icons/fa';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer id="contacto" className="py-12 relative" style={{ backgroundColor: '#121212' }}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo y descripción */}
          <div>
            <h3 className="text-2xl font-bold mb-4" style={{ color: '#E76F51', fontFamily: 'Dancing Script, cursive' }}>
              Coiffure Ciwan
            </h3>
            <p style={{ color: '#E0E0E0' }} className="mb-4">
              Salon de coiffure moderne spécialisé dans les coupes pour hommes et enfants, avec les meilleurs stylistes et barbiers de la ville.
            </p>
          </div>

          {/* Enlaces rápidos */}
          <div>
            <h4 className="text-xl font-bold mb-4" style={{ color: '#DAA520' }}>Liens Rapides</h4>
            <ul className="space-y-2">
              <li>
                <Link href="#servicios" style={{ color: '#E0E0E0' }} className="hover:text-primary transition duration-300">
                  Services
                </Link>
              </li>
              <li>
                <Link href="#galeria" style={{ color: '#E0E0E0' }} className="hover:text-primary transition duration-300">
                  Galerie
                </Link>
              </li>
              <li>
                <Link href="#ubicacion" style={{ color: '#E0E0E0' }} className="hover:text-primary transition duration-300">
                  Localisation
                </Link>
              </li>
              <li>
                <Link href="tel:+41779812284" style={{ color: '#E0E0E0' }} className="hover:text-primary transition duration-300">
                  Contact
                </Link>
              </li>
            </ul>
          </div>

          {/* Redes sociales */}
          <div>
            <h4 className="text-xl font-bold mb-4" style={{ color: '#DAA520' }}>Suivez-nous</h4>
            <div className="flex space-x-4">
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: '#DAA520', color: '#121212' }}
                className="rounded-full p-3 hover:opacity-80 transition duration-300"
                aria-label="Facebook"
              >
                <FaFacebook size={20} />
              </a>
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: '#DAA520', color: '#121212' }}
                className="rounded-full p-3 hover:opacity-80 transition duration-300"
                aria-label="Instagram"
              >
                <FaInstagram size={20} />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: '#DAA520', color: '#121212' }}
                className="rounded-full p-3 hover:opacity-80 transition duration-300"
                aria-label="Twitter"
              >
                <FaTwitter size={20} />
              </a>
              <a
                href="https://wa.me/41779812284"
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: '#DAA520', color: '#121212' }}
                className="rounded-full p-3 hover:opacity-80 transition duration-300"
                aria-label="WhatsApp"
              >
                <FaWhatsapp size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Línea divisoria */}
        <div className="border-t border-gray-700 mt-8 pt-8 text-center">
          <p style={{ color: '#E0E0E0' }} className="mb-2">
            © {currentYear} Coiffure Ciwan. Tous droits réservés.
          </p>
        </div>
      </div>
      
      {/* Botón de administración colocado en la esquina inferior derecha */}
      <div className="absolute bottom-4 right-4">
        <Link 
          href="/admin" 
          className="flex items-center space-x-1 px-3 py-1 rounded-full bg-black bg-opacity-60 hover:bg-opacity-90 transition-all duration-300 border border-gray-700"
          aria-label="Accès administrateur"
          title="Administration"
        >
          <FaLock size={10} className="text-yellow-500" />
          <span className="text-xs text-yellow-500 font-light">Admin</span>
        </Link>
      </div>
    </footer>
  );
} 