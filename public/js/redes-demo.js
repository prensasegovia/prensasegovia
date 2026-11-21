/* Datos de PRUEBA para la zona de Redes. Todo es inventado: perfiles, textos, cifras e imágenes.
   Solo se carga en este ordenador (localhost) con ?demo en la dirección: http://localhost:8000/?demo#redes
   Sirve para ver y probar la tarjeta de cada red sin depender de que el servidor tenga datos. */
(function(){
  const h = n => new Date(Date.now() - n * 3600e3).toISOString();
  // Imagen inventada (SVG) con un degradado y un rótulo, del tamaño que se pida
  const img = (t, a, b, w = 1080, hh = 1350) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>`
    + `<rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" fill="#fff" font-family="system-ui,sans-serif" font-size="${Math.round(w / 14)}" font-weight="700" text-anchor="middle" dominant-baseline="middle">${t}</text>`
    + `<text x="50%" y="92%" fill="#ffffffaa" font-family="system-ui,sans-serif" font-size="${Math.round(w / 30)}" text-anchor="middle">IMAGEN DE PRUEBA</text></svg>`);
  const av = (t, c) => "data:image/svg+xml;charset=utf-8," + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="${c}"/><text x="50%" y="54%" fill="#fff" font-family="system-ui,sans-serif" font-size="78" font-weight="800" text-anchor="middle" dominant-baseline="middle">${t}</text></svg>`);

  window.RS_DEMO_PERFILES = [
    { id:"d1", r:"ig", g:"Plataformas y asociaciones", n:"Plataforma Vecinal Eresma", u:"@plataforma_eresma_demo", av:true },
    { id:"d2", r:"ig", g:"Ayuntamientos", n:"Ayto. Villademo", u:"@ayto_villademo" },
    { id:"d3", r:"fb", g:"Organizaciones agrarias", n:"Agrarios Tierra de Pinares", u:"agrarios.pinares.demo" },
    { id:"d4", r:"x", g:"Sindicatos", n:"Sindicato Demo Segovia", u:"@sindicato_demo", av:true },
    { id:"d5", r:"x", g:"Partidos y candidatos", n:"Candidata Demo", u:"@candidata_demo" },
    { id:"d6", r:"tt", g:"Plataformas y asociaciones", n:"Jóvenes Rurales Demo", u:"@jovenes_rurales_demo" }
  ];

  window.RS_DEMO_FEED = {
    d1: { perfiles:[{ usuario:"plataforma_eresma_demo", nombre:"Plataforma Vecinal Eresma", avatar: av("PV", "#7b2ff7"), seguidores:2318, siguiendo:412, total:486,
        bio:"Vecinos por un río limpio 🌊 Asambleas los jueves a las 20:00 en el centro cívico. #Eresma" }],
      posts:[
        { id:"ig1", url:"https://www.instagram.com/p/DEMO1/", usuario:"plataforma_eresma_demo", autor:"Plataforma Vecinal Eresma", fecha:h(1.2), tipo:"carrusel",
          texto:"Hoy hemos entregado 1.240 firmas en el registro del Ayuntamiento 📝 Gracias a todas las personas que os habéis acercado a las mesas.\n\nPróxima concentración: sábado a las 12:00 frente a la depuradora. Os esperamos.\n\n#Eresma #RíoLimpio #Segovia @ayto_villademo",
          imagenes:[img("Entrega de firmas", "#7b2ff7", "#f107a3"), img("Mesa informativa", "#f107a3", "#ff7a00"), img("Registro municipal", "#00b4d8", "#0077b6")],
          ubicacion:"Segovia, Castilla y León", colaboradores:["jovenes_rurales_demo"], metricas:{ likes:312, respuestas:47 } },
        { id:"ig2", url:"https://www.instagram.com/reel/DEMO2/", usuario:"plataforma_eresma_demo", autor:"Plataforma Vecinal Eresma", fecha:h(26), tipo:"reel", esVideo:true, duracion:48,
          texto:"Así estaba el cauce esta mañana a la altura del puente. Lo hemos comunicado a la Confederación Hidrográfica.", imagenes:[img("Reel · cauce del río", "#0f2027", "#2c5364", 1080, 1920)],
          musica:"Sonido original · plataforma_eresma_demo", metricas:{ likes:1890, respuestas:203, vistas:24100 } },
        { id:"ig3", url:"https://www.instagram.com/p/DEMO3/", usuario:"plataforma_eresma_demo", fecha:h(70), fijado:true,
          texto:"📌 Quiénes somos y cómo participar. Información en el enlace de la bio.", imagenes:[img("Quiénes somos", "#11998e", "#38ef7d")], metricas:{ likes:96, respuestas:4 } }
      ] },
    d2: { perfiles:[{ usuario:"ayto_villademo", nombre:"Ayuntamiento de Villademo", avatar: av("AV", "#0a9396"), seguidores:5120, total:1302, verificado:true }],
      posts:[
        { id:"ig4", url:"https://www.instagram.com/p/DEMO4/", usuario:"ayto_villademo", autor:"Ayuntamiento de Villademo", verificado:true, fecha:h(5),
          texto:"🚧 Corte de tráfico en la calle Real desde el lunes por obras de renovación de la red de abastecimiento. Duración prevista: 3 semanas. Desvíos señalizados.",
          imagenes:[img("Corte de tráfico · C/ Real", "#ee9b00", "#ca6702")], metricas:{ likes:58, respuestas:31 } },
        { id:"ig5", url:"https://www.instagram.com/p/DEMO5/", usuario:"ayto_villademo", autor:"Ayuntamiento de Villademo", verificado:true, fecha:h(30), editado:true,
          texto:"Pleno ordinario del jueves: orden del día y retransmisión en directo en nuestra web.", imagenes:[img("Pleno ordinario", "#005f73", "#0a9396")], metricas:{ likes:21, respuestas:2 } }
      ] },
    d3: { perfiles:[{ usuario:"agrarios.pinares.demo", nombre:"Agrarios Tierra de Pinares", avatar: av("AT", "#588157"), seguidores:8840, total:null }],
      posts:[
        { id:"fb1", url:"https://www.facebook.com/agrarios.pinares.demo/posts/DEMO1", usuario:"agrarios.pinares.demo", autor:"Agrarios Tierra de Pinares", fecha:h(3),
          texto:"🚜 TRACTORADA el próximo martes 2 de diciembre.\n\nSalida a las 10:00 desde el polígono y recorrido por la N-601 hasta la Subdelegación. Pedimos precios justos y menos burocracia en la PAC.\n\nOs dejamos la noticia completa 👇",
          enlace:{ url:"https://ejemplo-periodico.test/agro/tractorada-diciembre", titulo:"Los agricultores de Tierra de Pinares anuncian una tractorada en diciembre", dominio:"ejemplo-periodico.test", imagen: img("Noticia · tractorada", "#3a5a40", "#a3b18a", 1200, 628) },
          metricas:{ likes:742, respuestas:128, compartidos:391 } },
        { id:"fb2", url:"https://www.facebook.com/agrarios.pinares.demo/videos/DEMO2", usuario:"agrarios.pinares.demo", autor:"Agrarios Tierra de Pinares", fecha:h(51), tipo:"video", esVideo:true, duracion:135,
          texto:"Vídeo de la asamblea de ayer en Cuéllar. Más de 200 profesionales del campo.", imagenes:[img("Asamblea en Cuéllar", "#344e41", "#588157", 1280, 720)],
          ubicacion:"Cuéllar", metricas:{ likes:388, respuestas:56, compartidos:140, vistas:9800 } }
      ] },
    d4: { perfiles:[{ usuario:"sindicato_demo", nombre:"Sindicato Demo Segovia", avatar: av("SD", "#c1121f"), seguidores:3410, siguiendo:880, total:12850, verificado:true }],
      posts:[
        { id:"x1", url:"https://x.com/sindicato_demo/status/1", usuario:"sindicato_demo", autor:"Sindicato Demo Segovia", verificado:true, fecha:h(0.4),
          texto:"‼️ Convocamos concentración el viernes 28 a las 12:00 frente a la fábrica del polígono de Hontoria por los 40 despidos anunciados. #NoALosDespidos",
          imagenes:[img("Cartel concentración", "#c1121f", "#780000", 1200, 675)], metricas:{ respuestas:34, compartidos:212, likes:401, vistas:18700, guardados:22 } },
        { id:"x2", url:"https://x.com/sindicato_demo/status/2", usuario:"sindicato_demo", autor:"Sindicato Demo Segovia", fecha:h(6), tipo:"respuesta", respuestaA:"ayto_villademo",
          texto:"La reunión de esta mañana no ha servido de nada. Mantenemos todas las movilizaciones previstas.", metricas:{ respuestas:12, compartidos:40, likes:96, vistas:5200 } },
        { id:"x3", url:"https://x.com/sindicato_demo/status/3", usuario:"sindicato_demo", fecha:h(28), tipo:"cita",
          texto:"Esto es exactamente lo que venimos denunciando desde septiembre 👇",
          cita:{ autor:"Periódico de Prueba", usuario:"periodico_prueba", texto:"La empresa del polígono de Hontoria confirma un ERE que afectará a 40 trabajadores de la planta segoviana.", url:"https://x.com/periodico_prueba/status/9", fecha:h(29), imagen: img("Noticia · ERE", "#1d3557", "#457b9d", 1200, 675) },
          metricas:{ respuestas:8, compartidos:77, likes:150, vistas:7400 } },
        { id:"x4", url:"https://x.com/sindicato_demo/status/4", usuario:"sindicato_demo", fecha:h(49), tipo:"retuit", repostDe:{ autor:"Candidata Demo", usuario:"candidata_demo" },
          texto:"Todo nuestro apoyo a la plantilla. Estaremos el viernes en la concentración.", metricas:{ respuestas:3, compartidos:51, likes:88 } }
      ] },
    d5: { perfiles:[{ usuario:"candidata_demo", nombre:"Candidata Demo", avatar: av("CD", "#3a86ff"), seguidores:15400, siguiendo:610, total:7420 }],
      posts:[
        { id:"x5", url:"https://x.com/candidata_demo/status/5", usuario:"candidata_demo", autor:"Candidata Demo", fecha:h(2.5),
          texto:"Gran mañana recorriendo los pueblos de la comarca. Gracias por el cariño 💙\n\n📍 Riaza · Ayllón · Sepúlveda",
          imagenes:[img("Riaza", "#3a86ff", "#8338ec", 1200, 900), img("Ayllón", "#8338ec", "#ff006e", 1200, 900), img("Sepúlveda", "#ff006e", "#fb5607", 1200, 900), img("Mitin", "#fb5607", "#ffbe0b", 1200, 900)],
          metricas:{ respuestas:61, compartidos:98, likes:640, vistas:31200, guardados:14 } },
        { id:"x6", url:"https://x.com/candidata_demo/status/6", usuario:"candidata_demo", autor:"Candidata Demo", fecha:h(49.5), fijado:true,
          texto:"Nuestro programa para la provincia, punto por punto: https://ejemplo-programa.test/segovia #Elecciones",
          metricas:{ respuestas:20, compartidos:45, likes:230, vistas:12000 } }
      ] },
    d6: { perfiles:[{ usuario:"jovenes_rurales_demo", nombre:"Jóvenes Rurales Demo", avatar: av("JR", "#fe2c55"), seguidores:41200, siguiendo:150, total:212 }],
      posts:[
        { id:"tt1", url:"https://www.tiktok.com/@jovenes_rurales_demo/video/1", usuario:"jovenes_rurales_demo", autor:"Jóvenes Rurales Demo", fecha:h(8), tipo:"video", esVideo:true, duracion:37,
          texto:"POV: quieres quedarte a vivir en tu pueblo pero no hay vivienda 🏠😤 #despoblación #segovia #ruralidad",
          imagenes:[img("TikTok · vivienda rural", "#25f4ee", "#fe2c55", 1080, 1920)], musica:"Sonido original · jovenes_rurales_demo", ubicacion:"Cantalejo",
          metricas:{ likes:12400, respuestas:893, compartidos:2100, vistas:198000, guardados:1450 } },
        { id:"tt2", url:"https://www.tiktok.com/@jovenes_rurales_demo/video/2", usuario:"jovenes_rurales_demo", fecha:h(75), esVideo:true, duracion:15,
          texto:"Domingo de mercado 🍎", imagenes:[img("TikTok · mercado", "#000000", "#fe2c55", 1080, 1920)], musica:"Canción de prueba · Artista Demo",
          metricas:{ likes:3300, respuestas:120, compartidos:410, vistas:51000 } }
      ] }
  };
})();
