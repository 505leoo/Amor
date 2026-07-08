// Definición de trofeos compartida entre TrofeosContext y Trofeos.js
export const TROFEOS_DEF = [
  {
    id: 'first_friend',
    title: 'Primer amigo',
    description: 'Añade a tu primer amigo',
    reward: 15,
    icon: 'people',
    checkCompleted: (userData) => ((userData?.amigos || []).length >= 1),
  },
  {
    id: 'five_friends',
    title: '5 amigos',
    description: 'Ten al menos 5 amigos',
    reward: 30,
    icon: 'groups',
    checkCompleted: (userData) => ((userData?.amigos || []).length >= 5),
  },
  {
    id: 'first_couple',
    title: 'Primera pareja',
    description: 'Enlaza con tu pareja',
    reward: 50,
    icon: 'favorite',
    checkCompleted: (userData) => !!(userData?.pareja),
  },
  {
    id: 'week_streak',
    title: '7 días',
    description: 'Entra 7 días seguidos',
    reward: 25,
    icon: 'calendar-today',
    checkCompleted: () => false,
  },
  {
    id: 'first_gift',
    title: 'Primer regalo',
    description: 'Envía tu primer regalo',
    reward: 20,
    icon: 'card-giftcard',
    checkCompleted: () => false,
  },
  {
    id: 'collector',
    title: 'Coleccionista',
    description: 'Obtén 3 stickers',
    reward: 40,
    icon: 'collections',
    checkCompleted: () => false,
  },
  {
    id: 'explorer',
    title: 'Explorador',
    description: 'Visita todas las pestañas',
    reward: 15,
    icon: 'explore',
    checkCompleted: () => false,
  },
  {
    id: 'social',
    title: 'Social',
    description: '10 amigos',
    reward: 60,
    icon: 'emoji-people',
    checkCompleted: (userData) => ((userData?.amigos || []).length >= 10),
  },
  {
    id: 'dedicated',
    title: 'Dedicado',
    description: '30 días activo',
    reward: 100,
    icon: 'military-tech',
    checkCompleted: () => false,
  },
];

const GRID_COLS = 3;
const GRID_ROWS = 5;
export const GRID_SIZE = GRID_COLS * GRID_ROWS;

export function hasUnclaimedTrofeos(amigosCount, claimedIds) {
  const userData = { amigos: Array(amigosCount).fill(null) };
  return TROFEOS_DEF.some(
    (t) => t.checkCompleted(userData) && !claimedIds.includes(t.id)
  );
}
