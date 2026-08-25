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
    imagen: require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png'),
  },
];

export const SKINS = [
  { id: 'halcon_default', storageId: 'default', animalId: 'halcon', animalNombre: 'Halcón', nombre: 'Original', temporada: 't1', rareza: 'Común', colorRareza: '#78a950', fondoRareza: '#e7f0d7', imagen: require('../assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png') },
  { id: 'halcont1', storageId: 'halcont1', animalId: 'halcon', animalNombre: 'Halcón', nombre: 'Traje especial', temporada: 't1', rareza: 'Épico', colorRareza: '#9a68c4', fondoRareza: '#eee0f7', imagen: require('../assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont1.png') },
  { id: 'halcont2', storageId: 'halcont2', animalId: 'halcon', animalNombre: 'Halcón', nombre: 'Traje celeste', temporada: 't1', rareza: 'Raro', colorRareza: '#5799cf', fondoRareza: '#dcecf7', imagen: require('../assets/temporadas/libro/Temporada1/Animales/Halcon/skins/halcont2.png') },
  { id: 'ardilla_default', storageId: 'default', animalId: 'ardilla', animalNombre: 'Ardilla', nombre: 'Original', temporada: 't1', rareza: 'Raro', colorRareza: '#5799cf', fondoRareza: '#dcecf7', imagen: require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png') },
  { id: 'ardillat1', storageId: 'ardillat1', animalId: 'ardilla', animalNombre: 'Ardilla', nombre: 'Bellota Dorada', temporada: 't1', rareza: 'Épico', colorRareza: '#9a68c4', fondoRareza: '#eee0f7', imagen: require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat1.png') },
  { id: 'ardillat2', storageId: 'ardillat2', animalId: 'ardilla', animalNombre: 'Ardilla', nombre: 'Guardiana del Bosque', temporada: 't1', rareza: 'Legendario', colorRareza: '#d48a2c', fondoRareza: '#fae7bd', imagen: require('../assets/temporadas/libro/Temporada1/Animales/Ardilla/skins/ardillat2.png') },
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
