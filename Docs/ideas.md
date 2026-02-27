## Ideas de implementaciones para peluqueriaprueba##

1. Creacion de un sistema completo de notificaciones usando realtime de supabase, cuando un cliente hace una reserva, se nos muestra immediatamente via un popup inferior y se activa la campana de notificaciones quen os lleva a una pantalla dedciada de notificacioens. desde aqui podemos confirmar/anular/modificar las reservas.
Debemos tener la opcion de hacer cosas en masas, aceptar todas las reservas, pudiendo seleccionar varias o con la opcion de seleccoinar todas (hay que pensar cual es la forma mas logica). por ejemplo seleccoinar todas las pendientes y confirmar todas o algo asi. tenemos que crear un modal de detalle de reserva con shadcn/ui reutilizable donde tendremos todos los detalles de la reserva, y un boton de confirmar/anular y tambien poder modificarla desde ahi, pudiendo cambiar todo pero que esto se valide en BD con las reservas reales para que no se pisen.

