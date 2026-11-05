// =========================================================
// DATOS DEL CHATBOT — editar aquí destinos, precios y textos.
// Límites de WhatsApp: título de fila ≤ 24 caracteres,
// descripción ≤ 72, título de botón ≤ 20.
// =========================================================

export const AGENCIA = {
  nombre: "Caribbean Travel",
  web: "https://caribbeantravelvacaciones.com",
  horario: "lunes a sábado, 9:00 a 18:00", // COMPLETAR con el horario real
  direccion: "Av. América y Villalengua, Edificio Módulos PB, Quito",
};

export const DESTINOS = [
  { id: "panama", nombre: "Panamá", desc: "Desde USD 450 · salidas en diciembre", info: "Quito — Panamá — Quito con Aeroregional.\n\n✓ 23 kg en bodega\n✓ 10 kg de mano\n✓ Artículo personal\n\nDesde *USD 450* por persona. Hay 8 salidas confirmadas en diciembre.", conFechas: true },
  { id: "punta-cana", nombre: "Punta Cana", desc: "Todo incluido frente al mar", info: "Resorts todo incluido frente al mar Caribe. Cotizamos vuelo + hotel según tus fechas." },
  { id: "cartagena", nombre: "Cartagena", desc: "Ciudad amurallada e islas del Rosario", info: "Ciudad amurallada, playa e islas del Rosario. Cotizamos vuelo + hotel según tus fechas." },
  { id: "galapagos", nombre: "Galápagos", desc: "Islas, fauna y snorkel", info: "Islas, fauna única y snorkel. Cotizamos vuelo, hospedaje y tours." },
  { id: "curacao", nombre: "Curaçao", desc: "Calas turquesa y casas de colores", info: "Calas de agua turquesa y el centro colorido de Willemstad." },
  { id: "lima", nombre: "Lima", desc: "La capital gastronómica", info: "Gastronomía, Miraflores y Barranco. Ideal para una escapada corta." },
  { id: "rio", nombre: "Río de Janeiro", desc: "Playas, miradores y samba", info: "Copacabana, Pan de Azúcar y el Cristo Redentor." },
  { id: "santiago", nombre: "Santiago de Chile", desc: "Cordillera, viñedos y ciudad", info: "Ciudad, viñedos y la cordillera a una hora." },
];

export const PANAMA = {
  precio: 450,
  mes: "diciembre",
  salidas: [
    { dia: 2, semana: "miércoles" }, { dia: 6, semana: "domingo" },
    { dia: 10, semana: "jueves" }, { dia: 14, semana: "lunes" },
    { dia: 18, semana: "viernes" }, { dia: 22, semana: "martes" },
    { dia: 26, semana: "sábado" }, { dia: 30, semana: "miércoles" },
  ],
};

export const TEXTOS = {
  bienvenida:
    "¡Hola! 👋 Soy el asistente de *Caribbean Travel*.\nTe ayudo a encontrar tu próximo viaje en segundos. ¿Qué te gustaría hacer?",
  noEntendi:
    "No logré entenderte 🙈. Elige una opción del menú o escribe *asesor* para hablar con una persona.",
  pagos:
    "💳 *Formas de pago*\n\n• Transferencia bancaria\n• Depósito\n• Link de pago\n\nUn asesor te envía los datos al confirmar tu reserva.",
  faq:
    "❓ *Preguntas frecuentes*\n\n*¿Atienden grupos?* Sí, para más de 10 personas preparamos una oferta especial.\n\n*¿Qué soporte tengo en el viaje?* Te acompañamos desde la reserva hasta tu regreso.\n\n*¿Puedo cambiar mi paquete?* Una vez pagado al 100 % no se puede modificar; los cambios pueden generar multas de hotel o aerolínea.",
  medida:
    "✈️ *Viaje a medida*\n\nCuéntale a un asesor: destino, fechas aproximadas, número de viajeros y presupuesto. Te enviamos opciones de vuelo y hotel.",
};
