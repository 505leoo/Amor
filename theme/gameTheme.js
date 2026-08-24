export const gameColors = Object.freeze({
  overlay: 'rgba(16, 9, 5, 0.82)',
  parchment: '#fff4d6',
  parchmentLight: '#fff9e8',
  parchmentMuted: '#f2dcae',
  parchmentDeep: '#ead2a0',
  wood: '#9b6a35',
  woodDark: '#6a3d18',
  woodShadow: '#4b2f18',
  gold: '#e9b85f',
  goldDark: '#b77932',
  text: '#704b2d',
  textSoft: '#9a7244',
  green: '#6f9e55',
  greenDark: '#437b39',
  blue: '#5d89ab',
  danger: '#c85f5f',
  white: '#fff8dc',
});

export const gameShadow = Object.freeze({
  shadowColor: '#171008',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.42,
  shadowRadius: 14,
  elevation: 20,
});

export const gamePanel = Object.freeze({
  backgroundColor: gameColors.parchment,
  borderWidth: 3,
  borderColor: gameColors.wood,
  borderRadius: 18,
  ...gameShadow,
});

export const gameText = Object.freeze({
  fontFamily: 'Delius',
  color: gameColors.text,
});

