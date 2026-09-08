export const ICONOS_LOCALES = {
  ardilla_bellota: require('../assets/inicio/iconos/icono-ardilla-bellota-v2.png'),
  ajolote_caramelo: require('../assets/inicio/iconos/icono-ajolote-caramelo.png'),
  erizo_dulce_medianoche: require('../assets/inicio/iconos/icono-erizo-dulce-medianoche.png'),
  pezglobo_perla_abisal: require('../assets/inicio/iconos/icono-pezglobo-perla-abisal.png'),
  gato_ovillo_dorado: require('../assets/inicio/iconos/icono-gato-ovillo-dorado.png'),
  mono_selva_dorada: require('../assets/inicio/iconos/icono-mono-selva-dorada.png'),
};

export const obtenerIconoLocal = id => (id ? ICONOS_LOCALES[id] || null : null);

export const resolverAvatarUsuario = (usuario, fallback = null) => {
  const local = obtenerIconoLocal(usuario?.iconoLocalId);
  return local || usuario?.iconoUrl || usuario?.photoURL || fallback;
};
