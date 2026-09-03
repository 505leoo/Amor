export const ALIMENTOS = [
  { id: 'zanahoria', nombre: 'Zanahoria crujiente', emoji: '🥕', saciedad: 12, precio: 65, cantidad: 3, descripcion: 'Fresca y simple. Recupera 12 puntos de saciedad por unidad.' },
  { id: 'manzana', nombre: 'Manzana dulce', emoji: '🍎', saciedad: 20, precio: 120, cantidad: 3, descripcion: 'Una merienda jugosa. Recupera 20 puntos de saciedad por unidad.' },
  { id: 'magdalena', nombre: 'Magdalena de amor', emoji: '🧁', saciedad: 35, precio: 220, cantidad: 2, descripcion: 'Un premio especial. Recupera 35 puntos de saciedad por unidad.' },
  { id: 'banana', nombre: 'Banana energética', emoji: '🍌', saciedad: 16, precio: 85, cantidad: 3, descripcion: 'Dulce y práctica. Recupera 16 puntos de saciedad por unidad.' },
  { id: 'frutilla', nombre: 'Frutilla brillante', emoji: '🍓', saciedad: 24, precio: 145, cantidad: 3, descripcion: 'Una fruta especial. Recupera 24 puntos de saciedad por unidad.' },
  { id: 'galleta', nombre: 'Galletita casera', emoji: '🍪', saciedad: 28, precio: 175, cantidad: 2, descripcion: 'Crocante y amorosa. Recupera 28 puntos de saciedad por unidad.' },
  { id: 'leche', nombre: 'Leche tibia', emoji: '🥛', saciedad: 32, precio: 195, cantidad: 2, descripcion: 'Un mimo calentito. Recupera 32 puntos de saciedad por unidad.' },
  { id: 'naranja', nombre: 'Naranja soleada', emoji: '🍊', saciedad: 18, precio: 95, cantidad: 3, descripcion: 'Fresca y jugosa. Recupera 18 puntos de saciedad por unidad.' },
  { id: 'pera', nombre: 'Pera suave', emoji: '🍐', saciedad: 22, precio: 130, cantidad: 3, descripcion: 'Dulce y liviana. Recupera 22 puntos de saciedad por unidad.' },
  { id: 'queso', nombre: 'Quesito dorado', emoji: '🧀', saciedad: 30, precio: 185, cantidad: 2, descripcion: 'Un bocado sabroso. Recupera 30 puntos de saciedad por unidad.' },
  { id: 'uvas', nombre: 'Racimo dulce', emoji: '🍇', saciedad: 26, precio: 155, cantidad: 3, descripcion: 'Pequeños bocados dulces. Recupera 26 puntos de saciedad por unidad.' },
  { id: 'sandia', nombre: 'Sandía fresca', emoji: '🍉', saciedad: 34, precio: 210, cantidad: 2, descripcion: 'Fresca y refrescante. Recupera 34 puntos de saciedad por unidad.' },
  { id: 'miel', nombre: 'Frasquito de miel', emoji: '🍯', saciedad: 38, precio: 240, cantidad: 2, descripcion: 'Un toque dorado de energía. Recupera 38 puntos de saciedad por unidad.' },
  { id: 'durazno', nombre: 'Durazno aterciopelado', emoji: '🍑', saciedad: 23, precio: 135, cantidad: 3, descripcion: 'Suave y aromático. Recupera 23 puntos de saciedad por unidad.' },
  { id: 'cereza', nombre: 'Cerezas gemelas', emoji: '🍒', saciedad: 19, precio: 110, cantidad: 3, descripcion: 'Pequeñas y dulces. Recupera 19 puntos de saciedad por unidad.' },
  { id: 'pan', nombre: 'Panecito casero', emoji: '🍞', saciedad: 31, precio: 180, cantidad: 2, descripcion: 'Recién horneado. Recupera 31 puntos de saciedad por unidad.' },
  { id: 'coco', nombre: 'Coco tropical', emoji: '🥥', saciedad: 36, precio: 225, cantidad: 2, descripcion: 'Una sorpresa refrescante. Recupera 36 puntos de saciedad por unidad.' },
];

// La saciedad completa tarda 4 horas en llegar a cero.
export const PERDIDA_SACIEDAD_POR_HORA = 100 / 4;

const convertirFechaAMs = valor => {
  if (!valor) return 0;
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : 0;
  if (valor instanceof Date) return valor.getTime();
  if (typeof valor.toMillis === 'function') return Number(valor.toMillis()) || 0;
  if (Number.isFinite(Number(valor.seconds))) return Number(valor.seconds) * 1000;
  if (Number.isFinite(Number(valor._seconds))) return Number(valor._seconds) * 1000;
  const parseado = Date.parse(valor);
  return Number.isFinite(parseado) ? parseado : 0;
};

export const calcularSaciedad = (cuidado, ahoraMs = Date.now()) => {
  const base = Number.isFinite(Number(cuidado?.saciedad)) ? Number(cuidado.saciedad) : 100;
  const marcaCliente = convertirFechaAMs(cuidado?.actualizadaEnMs);
  const marcaFirestore = convertirFechaAMs(cuidado?.actualizadaEn);
  // Firestore es la fuente más confiable cuando existe; el valor local queda
  // como respaldo para documentos creados antes de guardar actualizadaEn.
  const actualizadoMs = marcaFirestore || marcaCliente || ahoraMs;
  const ahoraValido = convertirFechaAMs(ahoraMs) || Date.now();
  const horas = Math.max(0, ahoraValido - actualizadoMs) / 3600000;
  return Math.max(0, Math.min(100, base - horas * PERDIDA_SACIEDAD_POR_HORA));
};

export const estadoSaciedad = valor => {
  const saciedad = Math.max(0, Number(valor) || 0);
  if (saciedad >= 70) return { id: 'feliz', emoji: '🥰', texto: 'Feliz', color: '#72a85f' };
  if (saciedad >= 40) return { id: 'bien', emoji: '😊', texto: 'Está bien', color: '#d0a342' };
  if (saciedad >= 15) return { id: 'hambre', emoji: '😕', texto: 'Tiene hambre', color: '#d8844f' };
  if (saciedad > 0) return { id: 'enojado', emoji: '😠', texto: 'Muy hambriento', color: '#c65f62' };
  return { id: 'dormido', emoji: '😴', texto: 'Dormido', color: '#887aa4' };
};
