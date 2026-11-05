/* =========================================================
   DESTINOS INICIALES
   - Respaldo: se muestran si la base de datos no está
     configurada o no responde.
   - Migración: el panel admin los importa a la base de datos
     con el botón "Importar destinos iniciales".
   Después de migrar, los cambios se hacen desde /admin.
   ========================================================= */
window.CT_DATOS = {
  destinos: [
    {
      slug: "panama",
      nombre: "Panamá",
      pais: "Panamá",
      frase: "Casco Antiguo, compras y skyline",
      descripcion: "Descubre el Casco Antiguo, el Canal y la vida frente al mar en la Cinta Costera, con tiempo para compras. Un asesor te confirma hotel, traslados y condiciones antes de pagar.",
      categorias: ["ciudad", "cerca", "sabores"],
      precio: 450,
      etiqueta: "8 salidas en dic",
      ruta: "Quito — Panamá — Quito",
      aerolinea: "Aeroregional",
      incluye: [
        { titulo: "Bodega", valor: "23 kg" },
        { titulo: "De mano", valor: "10 kg" },
        { titulo: "Personal", valor: "Artículo incluido" }
      ],
      itinerario: [
        { titulo: "Llegada y Casco Antiguo", detalle: "Calles coloniales, plazas y miradores al atardecer." },
        { titulo: "Canal de Panamá y Cinta Costera", detalle: "Esclusas de Miraflores y paseo frente a la bahía." },
        { titulo: "Compras y regreso", detalle: "Tiempo libre y traslado al aeropuerto." }
      ],
      fotos: [
        { url: "img/panama-casco.jpg", alt: "Calle del Casco Antiguo de Panamá" },
        { url: "img/panama-skyline.jpg", alt: "Skyline de Ciudad de Panamá desde la Cinta Costera" }
      ],
      salidas: ["2026-12-02", "2026-12-06", "2026-12-10", "2026-12-14", "2026-12-18", "2026-12-22", "2026-12-26", "2026-12-30"],
      destacado: true
    },
    { slug: "punta-cana", nombre: "Punta Cana", pais: "Rep. Dominicana", frase: "Todo incluido frente al mar", categorias: ["playa"],
      descripcion: "Resorts todo incluido frente al mar Caribe. Cotizamos vuelo y hotel según tus fechas." },
    { slug: "cartagena", nombre: "Cartagena", pais: "Colombia", frase: "Ciudad amurallada e islas del Rosario", categorias: ["playa", "ciudad", "cerca", "sabores"],
      descripcion: "Ciudad amurallada, playa e islas del Rosario. Cotizamos vuelo y hotel según tus fechas." },
    { slug: "galapagos", nombre: "Galápagos", pais: "Ecuador", frase: "Islas, fauna y snorkel", categorias: ["naturaleza", "playa", "cerca"],
      descripcion: "Islas, fauna única y snorkel. Cotizamos vuelo, hospedaje y tours." },
    { slug: "curacao", nombre: "Curaçao", pais: "Curazao", frase: "Calas turquesa y casas de colores", categorias: ["playa"],
      descripcion: "Calas de agua turquesa y el centro colorido de Willemstad." },
    { slug: "lima", nombre: "Lima", pais: "Perú", frase: "La capital gastronómica", categorias: ["ciudad", "sabores", "cerca"],
      descripcion: "Gastronomía, Miraflores y Barranco. Ideal para una escapada corta." },
    { slug: "rio-de-janeiro", nombre: "Río de Janeiro", pais: "Brasil", frase: "Playas, miradores y samba", categorias: ["playa", "ciudad"],
      descripcion: "Copacabana, Pan de Azúcar y el Cristo Redentor." },
    { slug: "santiago-de-chile", nombre: "Santiago", pais: "Chile", frase: "Cordillera, viñedos y ciudad", categorias: ["ciudad", "naturaleza", "sabores"],
      descripcion: "Ciudad, viñedos y la cordillera a una hora." }
  ]
};
