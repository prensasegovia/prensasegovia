/* ================= Estado ================= */
// Se recuerdan solo las preferencias que el usuario elige a propósito.
const st = {
  view:"noticias",            // pestaña
  sub:null,                   // pantalla encima: {t:"pueblo",name} | {t:"imp"} | {t:"medios"}
  cat: null,                  // tema elegido en la barra (null = todos); no se recuerda
  sinCapital: store.get("sinCapital2", false),
  compacta: store.get("compacta", false),
  avisos: store.get("avisos", false),
  kws: store.get("kws", ["Guardia Civil"]),
  soloKw: store.get("soloKw", false),
  tema: store.get("tema","auto"), letra: store.get("letra","auto"),
  periodicos: [], periodico: "todos", viaGoogle: [], parteDesde: "24h", ambito: store.get("ambito","interes"), parteLinks: store.get("parteLinks", false),
  rango:"3",                  // no se recuerda: cada vez que se abre, 3 días
  q:"", townQ:"",
  dias:[], fuentes:[], actualizado:"", loaded:false, error:false,
  seen: new Set(store.get("seen3", null) ? store.get("seen", []) : []),
  favs: store.get("favs", {}),  // id -> {n: noticia, t: guardada en}
  abiertos: new Set(),        // tarjetas con todos los medios desplegados
  pending:null
};
const saveF = () => { store.set("sinCapital2",st.sinCapital); store.set("kws",st.kws); store.set("soloKw",st.soloKw); };

