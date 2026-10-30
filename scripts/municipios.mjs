// Municipios de la provincia de Segovia (209) y núcleos conocidos que pertenecen a otro municipio.
export const MUNICIPIOS = `Abades|Adrada de Pirón|Adrados|Aguilafuente|Alconada de Maderuelo|Aldea Real|Aldealcorvo|Aldealengua de Pedraza|Aldealengua de Santa María|Aldeanueva de la Serrezuela|Aldeanueva del Codonal|Aldeasoña|Aldehorno|Aldehuela del Codonal|Aldeonte|Anaya|Añe|Arahuetes|Arcones|Arevalillo de Cega|Armuña|Ayllón|Barbolla|Basardilla|Bercial|Bercimuel|Bernardos|Bernuy de Porreros|Boceguillas|Brieva|Caballar|Cabañas de Polendos|Cabezuela|Calabazas de Fuentidueña|Campo de San Pedro|Cantalejo|Cantimpalos|Carabias|Carbonero el Mayor|Carrascal del Río|Casla|Castillejo de Mesleón|Castro de Fuentidueña|Castrojimeno|Castroserna de Abajo|Castroserracín|Cedillo de la Torre|Cerezo de Abajo|Cerezo de Arriba|Cilleruelo de San Mamés|Cobos de Fuentidueña|Coca|Codorniz|Collado Hermoso|Condado de Castilnovo|Corral de Ayllón|Cozuelos de Fuentidueña|Cubillo|Cuéllar|Cuevas de Provanco|Chañe|Domingo García|Donhierro|Duruelo|Encinas|Encinillas|Escalona del Prado|Escarabajosa de Cabezas|Escobar de Polendos|El Espinar|Espirdo|Fresneda de Cuéllar|Fresno de Cantespino|Fresno de la Fuente|Frumales|Fuente de Santa Cruz|Fuente el Olmo de Fuentidueña|Fuente el Olmo de Íscar|Fuentepelayo|Fuentepiñel|Fuenterrebollo|Fuentesaúco de Fuentidueña|Fuentesoto|Fuentidueña|Gallegos|Garcillán|Gomezserracín|Grajera|Honrubia de la Cuesta|Hontalbilla|Hontanares de Eresma|Los Huertos|Ituero y Lama|Juarros de Riomoros|Juarros de Voltoya|Labajos|Laguna de Contreras|Languilla|Lastras de Cuéllar|Lastras del Pozo|La Lastrilla|La Losa|Maderuelo|Marazoleja|Marazuela|Martín Miguel|Martín Muñoz de la Dehesa|Martín Muñoz de las Posadas|Marugán|Mata de Cuéllar|Matabuena|La Matilla|Melque de Cercos|Membibre de la Hoz|Migueláñez|Montejo de Arévalo|Montejo de la Vega de la Serrezuela|Monterrubio|Moral de Hornuez|Mozoncillo|Muñopedro|Muñoveros|Nava de la Asunción|Navafría|Navalilla|Navalmanzano|Navares de Ayuso|Navares de Enmedio|Navares de las Cuevas|Navas de Oro|Navas de Riofrío|Navas de San Antonio|Nieva|Olombrada|Orejana|Ortigosa de Pestaño|Ortigosa del Monte|Otero de Herreros|Pajarejos|Palazuelos de Eresma|Pedraza|Pelayos del Arroyo|Perosillo|Pinarejos|Pinarnegrillo|Prádena|Puebla de Pedraza|Rapariegos|Rebollo|Remondo|Riaguas de San Bartolomé|Riaza|Ribota|Riofrío de Riaza|Roda de Eresma|Sacramenia|Samboal|San Cristóbal de Cuéllar|San Cristóbal de la Vega|San Cristóbal de Segovia|Real Sitio de San Ildefonso|San Martín y Mudrián|San Miguel de Bernuy|San Pedro de Gaíllos|Sanchonuño|Sangarcía|Santa María la Real de Nieva|Santa Marta del Cerro|Santiuste de Pedraza|Santiuste de San Juan Bautista|Santo Domingo de Pirón|Santo Tomé del Puerto|Sauquillo de Cabezas|Sebúlcor|Sepúlveda|Sequera de Fresno|Sotillo|Sotosalbos|Tabanera la Luenga|Tolocirio|Torre Val de San Pedro|Torreadrada|Torrecaballeros|Torrecilla del Pinar|Torreiglesias|Trescasas|Turégano|Urueñas|Valdeprados|Valdevacas de Montejo|Valdevacas y Guijar|Valseca|Valtiendas|Valverde del Majano|Valle de Tabladillo|Vallelado|Valleruela de Pedraza|Valleruela de Sepúlveda|Veganzones|Vegas de Matute|Ventosilla y Tejadilla|Villacastín|Villaverde de Íscar|Villaverde de Montejo|Villeguillo|Yanguas de Eresma|Zarzuela del Monte|Zarzuela del Pinar`.split("|");

// Nombres que también son apellidos o palabras comunes: solo cuentan con "en/de/a ..." delante.
export const AMBIGUOS = new Set(["Anaya","Coca","Cubillo","Encinas","Gallegos","Marugán","Rebollo","Remondo","Sotillo","Pedraza","Nieva","Monterrubio","Brieva","Duruelo","Bercial","Codorniz","Armuña","Grajera","Casla","Caballar","Labajos","Valseca","Encinillas","Carabias","Orejana","Abades"]);

// Núcleos y nombres populares -> municipio
export const ALIAS = {
  "La Granja": "Real Sitio de San Ildefonso",
  "Palazuelos": "Palazuelos de Eresma",
  "Linares del Arroyo": "Maderuelo",
  "Burgomillodo": "Carrascal del Río",
  "Las Vencías": "Fuentidueña",
  "Pontón Alto": "Real Sitio de San Ildefonso",
  "Hoces del Duratón": "Sepúlveda",
  "Hoces del Riaza": "Montejo de la Vega de la Serrezuela",
  "Puente Alta": "Segovia",
  "Carbonero": "Carbonero el Mayor",
  "Navas de Riofrio": "Navas de Riofrío",
  "San Ildefonso": "Real Sitio de San Ildefonso",
  "Valsaín": "Real Sitio de San Ildefonso",
  "Riofrío": "Navas de Riofrío",
  "San Rafael": "El Espinar",
  "Los Ángeles de San Rafael": "El Espinar",
  "La Estación de El Espinar": "El Espinar",
  "Navas de la Asunción": "Nava de la Asunción",
  "La Pinilla": "Cerezo de Arriba",
  "Prádena del Rincón": null, // es de Madrid: se ignora
};
// Barrios incorporados al municipio de Segovia (capital)
export const BARRIOS_CAPITAL = ["Zamarramala","Revenga","Hontoria","Fuentemilanos","Madrona","Torredondo","Perogordo"];
