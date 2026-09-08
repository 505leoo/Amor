export const ANIMALITOS = [
  {
    id: 'halcon',
    tipo: 'Aire',
    nombre: 'Halcón',
    rareza: 'Común',
    colorRareza: '#78a950',
    icono: '🦅',
    habilidad: 'Instinto Natural',
    habilidadTexto: '+10% de EXP obtenida en objetivos diarios.',
    legacyUnlockField: 'halconDesbloqueado',
    comercio: { color: '#a9722f', fondo: '#f3e5c8', borde: '#c69a5b' },
    imagen: require('../assets/Animalitos/Halcon/halcon1.png'),
  },
  {
    id: 'ardilla',
    tipo: 'Tierra',
    nombre: 'Ardilla',
    rareza: 'Épico',
    colorRareza: '#9a68c4',
    pistaBloqueada: 'Habitante del bosque',
    icono: '🐿️',
    habilidad: 'Reserva Dorada',
    habilidadTexto: '+10% de monedas obtenidas en eventos.',
    legacyUnlockField: 'ardillaDesbloqueada',
    comercio: { color: '#9a68c4', fondo: '#eee0f7', borde: '#b58ad5' },
    imagen: require('../assets/Animalitos/Ardilla/ardilla1.png'),
  },
  {
    id: 'ajolote',
    tipo: 'Agua',
    nombre: 'Ajolote',
    rareza: 'Épico',
    colorRareza: '#d86f9d',
    pistaBloqueada: 'Un corazón dulce entre las nubes',
    icono: '🩷',
    habilidad: 'Dulce Fortuna',
    habilidadTexto: '+10% de monedas obtenidas en eventos de temporada.',
    legacyUnlockField: 'ajoloteDesbloqueado',
    comercio: { color: '#c85f91', fondo: '#f9deea', borde: '#df91b5' },
    imagen: require('../assets/Animalitos/Ajolote/ajolote1.png'),
  },
  {
    id: 'erizo',
    tipo: 'Tierra',
    nombre: 'Erizo',
    rareza: 'Raro',
    colorRareza: '#7655a4',
    pistaBloqueada: 'Entre cacao y estrellas espera una nueva amistad',
    icono: '🦔',
    habilidad: 'Púas de Suerte',
    habilidadTexto: '+10% de EXP obtenida en juegos.',
    legacyUnlockField: 'erizoDesbloqueado',
    comercio: { color: '#6f4d93', fondo: '#eee5f7', borde: '#a886c3' },
    imagen: require('../assets/Animalitos/Erizo/erizo1.png'),
  },
  {
    id: 'loro',
    tipo: 'Aire',
    nombre: 'Loro',
    rareza: 'Legendario',
    colorRareza: '#d48a2c',
    pistaBloqueada: 'Una voz de colores se esconde entre dulces y plumas',
    icono: '🦜',
    habilidad: 'Eco Festivo',
    habilidadTexto: '+10% de cartas universales obtenidas en juegos.',
    legacyUnlockField: 'loroDesbloqueado',
    comercio: { color: '#c96a55', fondo: '#fae2cf', borde: '#dc9972' },
    imagen: require('../assets/Animalitos/Loro/loro1.png'),
  },
  {
    id: 'pezglobo',
    tipo: 'Agua',
    nombre: 'Pez Globo',
    rareza: 'Épico',
    colorRareza: '#5f70c7',
    pistaBloqueada: 'Una pequeña esfera del arrecife guarda una gran valentía',
    icono: '🐡',
    habilidad: 'Burbuja Protectora',
    habilidadTexto: '+10% de diamantes obtenidos en eventos de temporada.',
    legacyUnlockField: 'pezgloboDesbloqueado',
    comercio: { color: '#5578b8', fondo: '#dfeaf7', borde: '#87a7d1' },
    imagen: require('../assets/Animalitos/PezGlobo/pezglobo1.png'),
  },
  {
    id: 'gato',
    tipo: 'Tierra',
    nombre: 'Gato',
    rareza: 'Raro',
    colorRareza: '#6f89ad',
    pistaBloqueada: 'Entre ovillos y pasos suaves espera una nueva amistad',
    icono: '🐱',
    habilidad: 'Paso Silencioso',
    habilidadTexto: '+10% de EXP obtenida en juegos.',
    legacyUnlockField: 'gatoDesbloqueado',
    comercio: { color: '#7188a4', fondo: '#e7edf3', borde: '#9cadbf' },
    imagen: require('../assets/Animalitos/Gato/gato1.png'),
  },
];

const TEMATICAS_POR_SKIN = {
  halcon_default: 'Originales', halcont1: 'Aventuras', halcont2: 'Aventuras',
  ardilla_default: 'Originales', ardillat1: 'Naturaleza', ardillat2: 'Naturaleza',
  ajolote_default: 'Originales', ajolotet1: 'Dulces', ajolotet2: 'Dulces',
  erizo_default: 'Originales', erizot1: 'Dulces', erizot2: 'Dulces',
  loro_default: 'Originales', lorot1: 'Dulces', lorot2: 'Aventuras',
  pezglobo_default: 'Originales', pezglobot1: 'Dulces', pezglobot2: 'Fantasía',
  gato_default: 'Originales', gatot1: 'Fantasía', gatot2: 'Fantasía',
};

export const SKINS = [
  { id: 'halcon_default', storageId: 'default', animalId: 'halcon', animalNombre: 'Halcón', nombre: 'Original', tipo: 'Aire', rareza: 'Común', colorRareza: '#78a950', fondoRareza: '#e7f0d7', imagen: require('../assets/Animalitos/Halcon/halcon1.png') },
  { id: 'halcont1', storageId: 'halcont1', animalId: 'halcon', animalNombre: 'Halcón', nombre: 'Traje especial', tipo: 'Aire', rareza: 'Épico', colorRareza: '#9a68c4', fondoRareza: '#eee0f7', imagen: require('../assets/Animalitos/Halcon/skins/halcont1.png') },
  { id: 'halcont2', storageId: 'halcont2', animalId: 'halcon', animalNombre: 'Halcón', nombre: 'Traje celeste', tipo: 'Aire', rareza: 'Raro', colorRareza: '#5799cf', fondoRareza: '#dcecf7', comercioPrecio: 2000, imagen: require('../assets/Animalitos/Halcon/skins/halcont2.png') },
  { id: 'ardilla_default', storageId: 'default', animalId: 'ardilla', animalNombre: 'Ardilla', nombre: 'Original', tipo: 'Tierra', rareza: 'Raro', colorRareza: '#5799cf', fondoRareza: '#dcecf7', imagen: require('../assets/Animalitos/Ardilla/ardilla1.png') },
  { id: 'ardillat1', storageId: 'ardillat1', animalId: 'ardilla', animalNombre: 'Ardilla', nombre: 'Bellota Dorada', tipo: 'Tierra', rareza: 'Épico', colorRareza: '#9a68c4', fondoRareza: '#eee0f7', imagen: require('../assets/Animalitos/Ardilla/skins/ardillat1.png') },
  { id: 'ardillat2', storageId: 'ardillat2', animalId: 'ardilla', animalNombre: 'Ardilla', nombre: 'Guardiana del Bosque', tipo: 'Tierra', rareza: 'Legendario', colorRareza: '#d48a2c', fondoRareza: '#fae7bd', comercioPrecio: 2400, imagen: require('../assets/Animalitos/Ardilla/skins/ardillat2.png') },
  { id: 'ajolote_default', storageId: 'default', animalId: 'ajolote', animalNombre: 'Ajolote', nombre: 'Original', tipo: 'Agua', rareza: 'Épico', colorRareza: '#d86f9d', fondoRareza: '#f9deea', imagen: require('../assets/Animalitos/Ajolote/ajolote1.png') },
  { id: 'ajolotet1', storageId: 'ajolotet1', animalId: 'ajolote', animalNombre: 'Ajolote', nombre: 'Algodón de Azúcar', tipo: 'Agua', rareza: 'Épico', colorRareza: '#b477cf', fondoRareza: '#f2e3fa', imagen: require('../assets/Animalitos/Ajolote/skins/ajolotet1.png') },
  { id: 'ajolotet2', storageId: 'ajolotet2', animalId: 'ajolote', animalNombre: 'Ajolote', nombre: 'Guardián de Caramelo', tipo: 'Agua', rareza: 'Legendario', colorRareza: '#d48a2c', fondoRareza: '#fae3c2', comercioPrecio: 2800, imagen: require('../assets/Animalitos/Ajolote/skins/ajolotet2.png') },
  { id: 'erizo_default', storageId: 'default', animalId: 'erizo', animalNombre: 'Erizo', nombre: 'Original', tipo: 'Tierra', rareza: 'Raro', colorRareza: '#7655a4', fondoRareza: '#eee5f7', imagen: require('../assets/Animalitos/Erizo/erizo1.png') },
  { id: 'erizot1', storageId: 'erizot1', animalId: 'erizo', animalNombre: 'Erizo', nombre: 'Cupcake de Arándanos', tipo: 'Tierra', rareza: 'Épico', colorRareza: '#8f62bd', fondoRareza: '#efe3fa', imagen: require('../assets/Animalitos/Erizo/skins/erizot1.png') },
  { id: 'erizot2', storageId: 'erizot2', animalId: 'erizo', animalNombre: 'Erizo', nombre: 'Maestro Chocolatero', tipo: 'Tierra', rareza: 'Legendario', colorRareza: '#c4862e', fondoRareza: '#f6e2c5', imagen: require('../assets/Animalitos/Erizo/skins/erizot2.png') },
  { id: 'loro_default', storageId: 'default', animalId: 'loro', animalNombre: 'Loro', nombre: 'Original', tipo: 'Aire', rareza: 'Legendario', colorRareza: '#d48a2c', fondoRareza: '#fae7bd', imagen: require('../assets/Animalitos/Loro/loro1.png') },
  { id: 'lorot1', storageId: 'lorot1', animalId: 'loro', animalNombre: 'Loro', nombre: 'Piñata Tropical', tipo: 'Aire', rareza: 'Épico', colorRareza: '#9a68c4', fondoRareza: '#eee0f7', imagen: require('../assets/Animalitos/Loro/skins/lorot1.png') },
  { id: 'lorot2', storageId: 'lorot2', animalId: 'loro', animalNombre: 'Loro', nombre: 'Capitán Piruleta', tipo: 'Aire', rareza: 'Legendario', colorRareza: '#d48a2c', fondoRareza: '#fae3c2', comercioPrecio: 3200, imagen: require('../assets/Animalitos/Loro/skins/lorot2.png') },
  { id: 'pezglobo_default', storageId: 'default', animalId: 'pezglobo', animalNombre: 'Pez Globo', nombre: 'Original', tipo: 'Agua', rareza: 'Épico', colorRareza: '#5f70c7', fondoRareza: '#e2e7f7', imagen: require('../assets/Animalitos/PezGlobo/pezglobo1.png') },
  { id: 'pezglobot1', storageId: 'pezglobot1', animalId: 'pezglobo', animalNombre: 'Pez Globo', nombre: 'Arrecife de Caramelo', tipo: 'Agua', rareza: 'Épico', colorRareza: '#b56cc3', fondoRareza: '#f4e1f6', imagen: require('../assets/Animalitos/PezGlobo/skins/pezglobot1.png') },
  { id: 'pezglobot2', storageId: 'pezglobot2', animalId: 'pezglobo', animalNombre: 'Pez Globo', nombre: 'Guardián Abisal', tipo: 'Agua', rareza: 'Legendario', colorRareza: '#d48a2c', fondoRareza: '#dce9f6', comercioPrecio: 3400, imagen: require('../assets/Animalitos/PezGlobo/skins/pezglobot2.png') },
  { id: 'gato_default', storageId: 'default', animalId: 'gato', animalNombre: 'Gato', nombre: 'Original', tipo: 'Tierra', rareza: 'Raro', colorRareza: '#6f89ad', fondoRareza: '#e7edf3', imagen: require('../assets/Animalitos/Gato/gato1.png') },
  { id: 'gatot1', storageId: 'gatot1', animalId: 'gato', animalNombre: 'Gato', nombre: 'Nube de Fresa', tipo: 'Tierra', rareza: 'Épico', colorRareza: '#c5659c', fondoRareza: '#f8e0ec', imagen: require('../assets/Animalitos/Gato/skins/gatot1.png') },
  { id: 'gatot2', storageId: 'gatot2', animalId: 'gato', animalNombre: 'Gato', nombre: 'Guardián Lunar', tipo: 'Tierra', rareza: 'Legendario', colorRareza: '#d48a2c', fondoRareza: '#dfe7f7', comercioPrecio: 3600, imagen: require('../assets/Animalitos/Gato/skins/gatot2.png') },
].map(skin => ({ ...skin, tematica: TEMATICAS_POR_SKIN[skin.id] || 'Originales' }));

export const ANIMALITOS_POR_ID = Object.fromEntries(ANIMALITOS.map(animal => [animal.id, animal]));

export const SKINS_POR_ANIMAL = SKINS.reduce((acc, skin) => {
  if (!acc[skin.animalId]) acc[skin.animalId] = [];
  acc[skin.animalId].push(skin);
  return acc;
}, {});

export const IMAGENES_POR_SKIN = Object.fromEntries(
  Object.entries(SKINS_POR_ANIMAL).map(([animalId, skins]) => [
    animalId,
    Object.fromEntries(skins.map(skin => [skin.storageId, skin.imagen])),
  ]),
);

export const animalitoEstaDesbloqueado = (animal, usuario = {}, estado = {}) => {
  if (!animal) return false;
  const usuarioSeguro = usuario && typeof usuario === 'object' ? usuario : {};
  const estadoSeguro = estado && typeof estado === 'object' ? estado : {};
  if (usuarioSeguro.animalito === animal.id) return true;
  if (animal.legacyUnlockField && usuarioSeguro[animal.legacyUnlockField]) return true;
  return estadoSeguro.desbloqueado === true
    || (estadoSeguro.desbloqueado !== false && (Number(estadoSeguro.nivel) > 0 || Number(estadoSeguro.cartas ?? estadoSeguro.copias) > 0));
};
