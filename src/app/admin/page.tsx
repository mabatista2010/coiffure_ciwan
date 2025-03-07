'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase, Service, GalleryImage } from '@/lib/supabase';
import { v4 as uuidv4 } from 'uuid';
import Image from 'next/image';

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Estado para servicios
  const [services, setServices] = useState<Service[]>([]);
  const [newService, setNewService] = useState<Partial<Service>>({
    nombre: '',
    descripcion: '',
    precio: 0,
    imagen_url: '',
  });
  const [serviceImageFile, setServiceImageFile] = useState<File | null>(null);
  const [serviceImagePreview, setServiceImagePreview] = useState<string>('');
  
  // Estado para galería
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [newImage, setNewImage] = useState<Partial<GalleryImage>>({
    descripcion: '',
    imagen_url: '',
    fecha: new Date().toISOString().split('T')[0],
  });
  const [galleryImageFile, setGalleryImageFile] = useState<File | null>(null);
  const [galleryImagePreview, setGalleryImagePreview] = useState<string>('');

  // Estado para configuraciones
  const [heroDesktopImage, setHeroDesktopImage] = useState('');
  const [heroMobileImage, setHeroMobileImage] = useState('');
  const [heroDesktopFile, setHeroDesktopFile] = useState<File | null>(null);
  const [heroMobileFile, setHeroMobileFile] = useState<File | null>(null);
  const [heroDesktopPreview, setHeroDesktopPreview] = useState<string>('');
  const [heroMobilePreview, setHeroMobilePreview] = useState<string>('');
  
  // Referencias para los inputs de archivo
  const heroDesktopInputRef = useRef<HTMLInputElement>(null);
  const heroMobileInputRef = useRef<HTMLInputElement>(null);
  const serviceImageInputRef = useRef<HTMLInputElement>(null);
  const galleryImageInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para indicar carga
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya está autenticado
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        setIsAuthenticated(true);
        loadData();
      }
    };
    
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        throw error;
      }
      
      setIsAuthenticated(true);
      loadData();
    } catch (error: Error | unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
    }
  };

  const loadData = async () => {
    // Cargar servicios
    const { data: servicesData } = await supabase
      .from('servicios')
      .select('*')
      .order('id');
    
    if (servicesData) {
      setServices(servicesData);
    }
    
    // Cargar imágenes de galería
    const { data: galleryData } = await supabase
      .from('imagenes_galeria')
      .select('*')
      .order('fecha', { ascending: false });
    
    if (galleryData) {
      setGalleryImages(galleryData);
    }

    // Cargar configuraciones
    const { data: configData } = await supabase
      .from('configuracion')
      .select('*');
    
    if (configData) {
      // Buscar configuraciones específicas
      const desktopImage = configData.find(c => c.clave === 'hero_image_desktop');
      const mobileImage = configData.find(c => c.clave === 'hero_image_mobile');
      
      if (desktopImage) {
        setHeroDesktopImage(desktopImage.valor);
        setHeroDesktopPreview(desktopImage.valor);
      }
      if (mobileImage) {
        setHeroMobileImage(mobileImage.valor);
        setHeroMobilePreview(mobileImage.valor);
      }
    }
  };

  // Función para manejar la selección de archivos
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, setFile: React.Dispatch<React.SetStateAction<File | null>>, setPreview: React.Dispatch<React.SetStateAction<string>>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Función para subir un archivo a Supabase Storage
  const uploadFile = async (file: File, bucket: string, folder: string = '') => {
    if (!file) return null;
    
    setIsUploading(true);
    try {
      // Generar un nombre único para el archivo
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;
      
      console.log(`Intentando subir archivo a bucket: "${bucket}", ruta: "${filePath}"`);
      
      // Subir el archivo a Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, file);
      
      if (error) {
        console.error('Error detallado de Supabase:', error);
        throw error;
      }
      
      console.log('Archivo subido correctamente:', data);
      
      // Obtener la URL pública del archivo
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);
      
      console.log('URL pública generada:', urlData.publicUrl);
      
      return urlData.publicUrl;
    } catch (err: Error | unknown) {
      console.error('Error al subir archivo:', err);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let imagen_url = newService.imagen_url;
      
      // Si hay un archivo seleccionado, subirlo primero
      if (serviceImageFile) {
        const fileUrl = await uploadFile(serviceImageFile, 'fotos_peluqueria', 'servicios');
        if (fileUrl) {
          imagen_url = fileUrl;
        }
      }
      
      const { error } = await supabase
        .from('servicios')
        .insert([{ ...newService, imagen_url }]);
      
      if (error) throw error;
      
      // Limpiar el formulario
      setNewService({
        nombre: '',
        descripcion: '',
        precio: 0,
        imagen_url: '',
      });
      setServiceImageFile(null);
      setServiceImagePreview('');
      if (serviceImageInputRef.current) {
        serviceImageInputRef.current.value = '';
      }
      
      loadData();
    } catch (error: Error | unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      console.error('Error al añadir servicio:', error);
    }
  };

  const handleDeleteService = async (id: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
      try {
        const { error } = await supabase
          .from('servicios')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        loadData();
      } catch (error: Error | unknown) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        console.error('Error al eliminar servicio:', error);
      }
    }
  };

  const handleAddImage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      let imagen_url = newImage.imagen_url;
      
      // Si hay un archivo seleccionado, subirlo primero
      if (galleryImageFile) {
        const fileUrl = await uploadFile(galleryImageFile, 'fotos_peluqueria', 'galeria');
        if (fileUrl) {
          imagen_url = fileUrl;
        }
      }
      
      const { error } = await supabase
        .from('imagenes_galeria')
        .insert([{ ...newImage, imagen_url }]);
      
      if (error) throw error;
      
      // Limpiar el formulario
      setNewImage({
        descripcion: '',
        imagen_url: '',
        fecha: new Date().toISOString().split('T')[0],
      });
      setGalleryImageFile(null);
      setGalleryImagePreview('');
      if (galleryImageInputRef.current) {
        galleryImageInputRef.current.value = '';
      }
      
      loadData();
    } catch (error: Error | unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error));
      console.error('Error al añadir imagen:', error);
    }
  };

  const handleDeleteImage = async (id: number) => {
    if (confirm('¿Estás seguro de que quieres eliminar esta imagen?')) {
      try {
        const { error } = await supabase
          .from('imagenes_galeria')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        loadData();
      } catch (error: Error | unknown) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        console.error('Error al eliminar imagen:', error);
      }
    }
  };

  const updateHeroImage = async (clave: string, file: File | null, currentUrl: string) => {
    try {
      setIsUploading(true);
      let valor = currentUrl;
      
      // Si hay un archivo seleccionado, subirlo primero
      if (file) {
        const fileUrl = await uploadFile(file, 'hero_images');
        if (fileUrl) {
          valor = fileUrl;
        } else {
          throw new Error('No se pudo subir el archivo');
        }
      }
      
      // Actualizar la configuración en la base de datos
      const { error } = await supabase
        .from('configuracion')
        .update({ valor })
        .eq('clave', clave);
      
      if (error) throw error;
      
      // Recargar datos
      loadData();
      
    } catch (error: Error | unknown) {
      console.error('Error completo:', error);
      setErrorMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="max-w-md w-full p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6 text-secondary">Admin Login</h1>
          
          {errorMessage && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {errorMessage}
            </div>
          )}
          
          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-text-dark text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-text-dark text-sm font-bold mb-2" htmlFor="password">
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-primary focus:border-primary"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300"
            >
              Iniciar Sesión
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-secondary">
            Panel de Administración - <span className="text-primary">Coiffure Ciwan</span>
          </h1>
          <p className="mt-2 text-text-medium">
            Gestiona los servicios e imágenes de la galería
          </p>
        </div>

        {/* Sección de Hero Images */}
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Imágenes del Hero</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Imagen de escritorio */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-text-dark mb-2">Imagen para Escritorio</h3>
                <p className="text-text-medium mb-4">Esta imagen se mostrará en la versión de escritorio con fade de izquierda a derecha.</p>
                
                <div className="mb-4">
                  <label className="block text-text-dark text-sm font-bold mb-2">Seleccionar imagen</label>
                  <input
                    ref={heroDesktopInputRef}
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                    onChange={(e) => handleFileChange(e, setHeroDesktopFile, setHeroDesktopPreview)}
                  />
                </div>
                
                {heroDesktopPreview && (
                  <div className="relative h-40 mb-4 rounded overflow-hidden">
                    <Image 
                      src={heroDesktopPreview} 
                      alt="Hero Desktop Preview" 
                      width={200} 
                      height={150} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => updateHeroImage('hero_image_desktop', heroDesktopFile, heroDesktopImage)}
                  className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Subiendo...' : 'Actualizar Imagen'}
                </button>
              </div>
              
              {/* Imagen móvil */}
              <div className="border rounded-lg p-4">
                <h3 className="font-bold text-text-dark mb-2">Imagen para Móvil</h3>
                <p className="text-text-medium mb-4">Esta imagen se mostrará en la versión móvil con fade de arriba a abajo.</p>
                
                <div className="mb-4">
                  <label className="block text-text-dark text-sm font-bold mb-2">Seleccionar imagen</label>
                  <input
                    ref={heroMobileInputRef}
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                    onChange={(e) => handleFileChange(e, setHeroMobileFile, setHeroMobilePreview)}
                  />
                </div>
                
                {heroMobilePreview && (
                  <div className="relative h-40 mb-4 rounded overflow-hidden">
                    <Image 
                      src={heroMobilePreview} 
                      alt="Hero Mobile Preview" 
                      width={200} 
                      height={150} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
                
                <button
                  onClick={() => updateHeroImage('hero_image_mobile', heroMobileFile, heroMobileImage)}
                  className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Subiendo...' : 'Actualizar Imagen'}
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-8">
          <div className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Gestionar Servicios</h2>
            
            <form onSubmit={handleAddService} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-text-dark text-sm font-bold mb-2">Nombre</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  value={newService.nombre}
                  onChange={(e) => setNewService({ ...newService, nombre: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-text-dark text-sm font-bold mb-2">Precio (€)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  value={newService.precio}
                  onChange={(e) => setNewService({ ...newService, precio: Number(e.target.value) })}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-text-dark text-sm font-bold mb-2">Descripción</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  rows={2}
                  value={newService.descripcion}
                  onChange={(e) => setNewService({ ...newService, descripcion: e.target.value })}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-text-dark text-sm font-bold mb-2">Imagen del servicio</label>
                <input
                  ref={serviceImageInputRef}
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                  onChange={(e) => handleFileChange(e, setServiceImageFile, setServiceImagePreview)}
                />
                
                {serviceImagePreview && (
                  <div className="mt-4">
                    <Image 
                      src={serviceImagePreview} 
                      alt="Vista previa" 
                      width={200} 
                      height={150} 
                      className="rounded-lg"
                    />
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Subiendo...' : 'Añadir Servicio'}
                </button>
              </div>
            </form>
            
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white">
                <thead>
                  <tr>
                    <th className="py-2 px-4 border-b text-left text-text-dark">Nombre</th>
                    <th className="py-2 px-4 border-b text-left text-text-dark">Descripción</th>
                    <th className="py-2 px-4 border-b text-left text-text-dark">Precio</th>
                    <th className="py-2 px-4 border-b text-left text-text-dark">Imagen</th>
                    <th className="py-2 px-4 border-b text-left text-text-dark">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map((service) => (
                    <tr key={service.id}>
                      <td className="py-2 px-4 border-b text-text-dark">{service.nombre}</td>
                      <td className="py-2 px-4 border-b text-text-dark">{service.descripcion}</td>
                      <td className="py-2 px-4 border-b text-text-dark">{service.precio}€</td>
                      <td className="py-2 px-4 border-b">
                        {service.imagen_url && (
                          <div className="relative h-16 w-16 rounded overflow-hidden">
                            <Image 
                              src={service.imagen_url} 
                              alt={service.nombre} 
                              width={64} 
                              height={64} 
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-4 border-b">
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-600 hover:text-red-800 font-medium"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-bold text-secondary mb-4">Gestionar Galería</h2>
            
            <form onSubmit={handleAddImage} className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-text-dark text-sm font-bold mb-2">Descripción</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  value={newImage.descripcion}
                  onChange={(e) => setNewImage({ ...newImage, descripcion: e.target.value })}
                  required
                />
              </div>
              
              <div>
                <label className="block text-text-dark text-sm font-bold mb-2">Fecha</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded"
                  value={newImage.fecha}
                  onChange={(e) => setNewImage({ ...newImage, fecha: e.target.value })}
                  required
                />
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-text-dark text-sm font-bold mb-2">Imagen para la galería</label>
                <input
                  ref={galleryImageInputRef}
                  type="file"
                  accept="image/*"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-secondary hover:file:bg-yellow-400"
                  onChange={(e) => handleFileChange(e, setGalleryImageFile, setGalleryImagePreview)}
                />
                
                {galleryImagePreview && (
                  <div className="relative h-40 mt-2 rounded overflow-hidden">
                    <Image 
                      src={galleryImagePreview} 
                      alt="Gallery Preview" 
                      width={200} 
                      height={150} 
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
              </div>
              
              <div className="md:col-span-2">
                <button
                  type="submit"
                  className="bg-primary text-secondary font-bold py-2 px-4 rounded hover:bg-yellow-400 transition duration-300 disabled:opacity-50"
                  disabled={isUploading}
                >
                  {isUploading ? 'Subiendo...' : 'Añadir Imagen'}
                </button>
              </div>
            </form>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {galleryImages.map((image) => (
                <div key={image.id} className="border rounded-lg overflow-hidden">
                  <div className="relative pt-[60%]">
                    <Image 
                      src={image.imagen_url} 
                      alt={image.descripcion} 
                      width={200} 
                      height={150} 
                      className="absolute top-0 left-0 w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-4">
                    <p className="font-medium text-text-dark">{image.descripcion}</p>
                    <p className="text-sm text-text-medium">{new Date(image.fecha).toLocaleDateString()}</p>
                    <button
                      onClick={() => handleDeleteImage(image.id)}
                      className="mt-2 text-sm text-red-600 hover:text-red-800 font-medium"
                    >
                      Eliminar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 