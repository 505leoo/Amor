export const ICONOS_LOCALES = {
  ardilla_bellota: require('../assets/inicio/iconos/icono-ardilla-bellota-v2.webp'),
  ajolote_caramelo: require('../assets/inicio/iconos/icono-ajolote-caramelo.webp'),
  erizo_dulce_medianoche: require('../assets/inicio/iconos/icono-erizo-dulce-medianoche.webp'),
  pezglobo_perla_abisal: require('../assets/inicio/iconos/icono-pezglobo-perla-abisal.webp'),
  gato_ovillo_dorado: require('../assets/inicio/iconos/icono-gato-ovillo-dorado.webp'),
  mono_selva_dorada: require('../assets/inicio/iconos/icono-mono-selva-dorada.webp'),
};

export const obtenerIconoLocal = id => (id ? ICONOS_LOCALES[id] || null : null);

export const resolverAvatarUsuario = (usuario, fallback = null) => {
  const local = obtenerIconoLocal(usuario?.iconoLocalId);
  return local || usuario?.iconoUrl || usuario?.photoURL || fallback;
};
