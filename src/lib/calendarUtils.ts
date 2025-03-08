// Función para añadir un evento al calendario del usuario
export const addToCalendar = (
  title: string,
  description: string,
  location: string,
  startDate: Date,
  endDate: Date
): void => {
  // Formatear fecha para Google Calendar
  const formatDate = (date: Date): string => {
    return date.toISOString().replace(/-|:|\.\d+/g, '');
  };

  // Crear URL para Google Calendar
  const googleCalendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(
    title
  )}&dates=${formatDate(startDate)}/${formatDate(
    endDate
  )}&details=${encodeURIComponent(description)}&location=${encodeURIComponent(
    location
  )}&sf=true&output=xml`;

  // Crear URL para formato iCal (para Apple Calendar, Outlook, etc.)
  const icalContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'BEGIN:VEVENT',
    `DTSTART:${formatDate(startDate)}`,
    `DTEND:${formatDate(endDate)}`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${description}`,
    `LOCATION:${location}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\n');

  const icalUrl = `data:text/calendar;charset=utf8,${encodeURIComponent(icalContent)}`;

  // Detectar dispositivo/navegador
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isApple = /iPhone|iPad|iPod|Mac/i.test(navigator.userAgent);

  if (isMobile && isApple) {
    // En dispositivos Apple, intentar abrir directamente en Calendar
    window.open(icalUrl);
  } else {
    // Para otros dispositivos, abrir Google Calendar
    window.open(googleCalendarUrl, '_blank');
  }
}; 