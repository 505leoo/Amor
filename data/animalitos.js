export const ANIMALITOS = [
  {
    id: 'halcon',
    temporada: 't1',
    nombre: 'Halcón',
    rareza: 'Común',
    colorRareza: '#78a950',
    icono: '🦅',
    habilidad: 'Instinto Natural',
    habilidadTexto: '+10% de EXP obtenida en misiones.',
    legacyUnlockField: 'halconDesbloqueado',
    comercio: { color: '#a9722f', fondo: '#f3e5c8', borde: '#c69a5b' },
    imagen: require('../assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png'),
  },
  {
    id: 'ardilla',
    temporada: 't1',
    nombre: 'Ardilla',
    rareza: 'Épico',
    colorRareza: '#9a68c4',
    pistaBloqueada: 'Habitante del bosque',
    icono: '🐿️',
    habilidad: 'Reserva Dorada',
    habilidadTexto: '+10% de monedas obtenidas en eventos.',
    legacyUnlockField: 'ardillaDesbloqueada',
    comercio: { color: '#9a68c4', fondo: '#eee0f7', borde: '#b58ad5' },
    imagen: require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png'),
  },
  {
    id: 'ajolote',
    temporada: 't2',
    nombre: 'Ajolote',
    rareza: 'Épico',
    colorRareza: '#d86f9d',
    pistaBloqueada: 'Un corazón dulce entre las nubes',
    icono: '🩷',
    habilidad: 'Dulce Fortuna',
    habilidadTexto: '+10% de monedas obtenidas en eventos de temporada.',
    legacyUnlockField: 'ajoloteDesbloqueado',
    comercio: { color: '#c85f91', fondo: '#f9deea', borde: '#df91b5' },
    imagen: require('../assets/temporadas/libro/Temporada2/Animales/Ajolote/ajolote1.png'),
  },
  {
    id: 'erizo',
    temporada: 't2',
    nombre: 'Erizo',
    rareza: 'Raro',
    colorRareza: '#7655a4',
    pistaBloqueada: 'Entre cacao y estrellas espera una nueva amistad',
    icono: '🦔',
    habilidad: 'Púas de Suerte',
    habilidadTexto: '+10% de EXP obtenida en juegos.',
    legacyUnlockField: 'erizoDesbloqueado',
    comercio: { color: '#6f4d93', fondo: '#eee5f7', borde: '#a886c3' },
    imagen: require('../assets/temporadas/libro/Temporada2/Animales/Erizo/erizo1.png'),
  },
];

export const SKINS = [
  { id: 'halcon_default', storageId: 'default', animalId: 'halcon', animalNombre: 'Halcón', nombre: 'Original', temporada: 't1', rareza: 'Común', colorRareza: '#78a950', fondoRareza: '#e7f0d7', imagen: require('../assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png') },
  { id: 'halcont1', storageId: 'halcont1', animalId: 'halcon', animalNombre: 'Halcón', nombre: 'Traje especial', temporada: 't1', rareza: 'Épico', colorRareza: '#9a68c4', fondoRareza: '#eee0f7', imagen: require('../assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont1.png') },
  { id: 'halcont2', storageId: 'halcont2', animalId: 'halcon', animalNombre: 'Halcón', nombre: 'Traje celeste', temporada: 't1', rareza: 'Raro', colorRareza: '#5799cf', fondoRareza: '#dcecf7', comercioPrecio: 2000, imagen: require('../assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont2.png') },
  { id: 'ardilla_default', storageId: 'default', animalId: 'ardilla', animalNombre: 'Ardilla', nombre: 'Original', temporada: 't1', rareza: 'Raro', colorRareza: '#5799cf', fondoRareza: '#dcecf7', imagen: require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png') },
  { id: 'ardillat1', storageId: 'ardillat1', animalId: 'ardilla', animalNombre: 'Ardilla', nombre: 'Bellota Dorada', temporada: 't1', rareza: 'Épico', colorRareza: '#9a68c4', fondoRareza: '#eee0f7', imagen: require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat1.png') },
  { id: 'ardillat2', storageId: 'ardillat2', animalId: 'ardilla', animalNombre: 'Ardilla', nombre: 'Guardiana del Bosque', temporada: 't1', rareza: 'Legendario', colorRareza: '#d48a2c', fondoRareza: '#fae7bd', comercioPrecio: 2400, imagen: require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat2.png') },
  { id: 'ajolote_default', storageId: 'default', animalId: 'ajolote', animalNombre: 'Ajolote', nombre: 'Original', temporada: 't2', rareza: 'Épico', colorRareza: '#d86f9d', fondoRareza: '#f9deea', imagen: require('../assets/temporadas/libro/Temporada2/Animales/Ajolote/ajolote1.png') },
  { id: 'ajolotet1', storageId: 'ajolotet1', animalId: 'ajolote', animalNombre: 'Ajolote', nombre: 'Algodón de Azúcar', temporada: 't2', rareza: 'Épico', colorRareza: '#b477cf', fondoRareza: '#f2e3fa', imagen: require('../assets/temporadas/libro/Temporada2/Animales/Ajolote/skins/ajolotet1.png') },
  { id: 'ajolotet2', storageId: 'ajolotet2', animalId: 'ajolote', animalNombre: 'Ajolote', nombre: 'Guardián de Caramelo', temporada: 't2', rareza: 'Legendario', colorRareza: '#d48a2c', fondoRareza: '#fae3c2', comercioPrecio: 2800, imagen: require('../assets/temporadas/libro/Temporada2/Animales/Ajolote/skins/ajolotet2.png') },
  { id: 'erizo_default', storageId: 'default', animalId: 'erizo', animalNombre: 'Erizo', nombre: 'Original', temporada: 't2', rareza: 'Raro', colorRareza: '#7655a4', fondoRareza: '#eee5f7', imagen: require('../assets/temporadas/libro/Temporada2/Animales/Erizo/erizo1.png') },
  { id: 'erizot1', storageId: 'erizot1', animalId: 'erizo', animalNombre: 'Erizo', nombre: 'Cupcake de Arándanos', temporada: 't2', rareza: 'Épico', colorRareza: '#8f62bd', fondoRareza: '#efe3fa', imagen: require('../assets/temporadas/libro/Temporada2/Animales/Erizo/skins/erizot1.png') },
  { id: 'erizot2', storageId: 'erizot2', animalId: 'erizo', animalNombre: 'Erizo', nombre: 'Maestro Chocolatero', temporada: 't2', rareza: 'Legendario', colorRareza: '#c4862e', fondoRareza: '#f6e2c5', imagen: require('../assets/temporadas/libro/Temporada2/Animales/Erizo/skins/erizot2.png') },
];

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
