# Guía para crear nuevos Animalitos

Esta guía reúne las reglas visuales y técnicas necesarias para agregar un Animalito sin romper la identidad de la colección ni dejar integraciones incompletas.

## 1. Identidad visual de la colección

Antes de generar un Animalito nuevo hay que revisar, como mínimo, estas referencias:

- `assets/temporadas/libro/Temporada1/Animales/Halcon/halcon1.png`
- `assets/temporadas/libro/Temporada1/Animales/Ardilla/ardilla1.png`
- `assets/temporadas/libro/Temporada2/Animales/Ajolote/ajolote1.png`
- `assets/temporadas/libro/Temporada2/Animales/Erizo/erizo1.png`
- Una skin de cada temporada para entender cómo cambia una botarga completa.

Los Animalitos tienen estas características compartidas:

- Silueta redonda, compacta, ancha y muy fácil de reconocer en tamaños pequeños.
- Vista frontal o casi frontal.
- Ojos grandes, ovalados, marrón oscuro y con reflejos blancos.
- Mejillas circulares rosadas.
- Contornos gruesos de color marrón chocolate, ligeramente irregulares.
- Textura artesanal de acuarela, papel o fibra visible en todos los colores.
- Formas simples, infantiles y sin detalles demasiado finos.
- Fondo completamente transparente.
- El personaje ocupa aproximadamente entre 72 % y 78 % del lienzo cuadrado.
- Todas las extremidades y partes importantes deben quedar dentro del lienzo.

## 2. La regla más importante: animal y botarga

El Animalito no debe parecer un humano genérico disfrazado, pero tampoco debe ser solamente una ilustración literal del animal.

La lógica correcta es:

> El propio animal lleva una botarga grande y acolchada inspirada en su misma especie.

Por ejemplo:

- El Halcón conserva ojos y pico de ave dentro de su traje de Halcón.
- La Ardilla conserva nariz, expresión y rasgos de ardilla dentro de su traje de Ardilla.
- El Loro debe conservar su pico y rostro de loro dentro de una botarga de Loro.

El rostro debe estar separado visualmente de la botarga mediante una abertura clara con costura o contorno marrón. Los rasgos propios de la especie pertenecen al rostro del Animalito.

Nunca se deben duplicar rasgos. Un Loro no puede tener dos pares de ojos o dos picos —uno en el rostro y otro en la capucha—. Siempre debe existir un solo rostro legible.

## 3. Cómo diseñar la skin base

La skin base debe comunicar la especie antes que cualquier tema secundario.

Debe incluir:

- Rasgos faciales propios del animal.
- Botarga exterior inspirada en la misma especie.
- Una paleta principal fácil de identificar.
- Una silueta distinta de los Animalitos existentes.
- Pocos elementos decorativos.

No debe incluir:

- Sombreros, coronas o accesorios temáticos que parezcan una skin especial.
- Fondos, pisos, sombras o escenarios.
- Texto, letras, marcas de agua o marcos.
- Anatomía realista.
- Un segundo rostro dibujado en la botarga.

## 4. Cómo diseñar las dos skins

Una skin no es solamente la base con un accesorio agregado. Debe transformar la botarga completa, como sucede con Bellota Dorada, Guardiana del Bosque, Algodón de Azúcar o Maestro Chocolatero.

Cada skin debe conservar exactamente:

- La identidad del animal.
- El rostro, ojos, mejillas y rasgos de especie.
- Las proporciones generales.
- La postura.
- La escala y el encuadre.

Cada skin puede cambiar:

- Material y textura de la botarga.
- Paleta de colores.
- Forma exterior del traje.
- Tema narrativo.
- Alas, cola, púas, orejas u otros elementos exteriores, siempre sin perder la especie.

Conviene que las dos skins sean claramente diferentes:

1. Una skin colorida, suave o festiva, normalmente Épica.
2. Una skin más elaborada y premium, normalmente Legendaria.

Los elementos deben seguir siendo legibles cuando la imagen se muestra dentro de una tarjeta pequeña. Evitar exceso de joyas, líneas diminutas o accesorios que tapen el rostro.

## 5. El icono del Animalito también es obligatorio

Cada Animalito debe tener un icono propio, relacionado con su identidad, colores y uno de sus conceptos de temporada. No alcanza con usar un emoji ni con recortar la imagen principal sin adaptar su composición.

El icono funciona como avatar pequeño, recompensa o insignia. Debe conservar el mismo acabado artesanal, pero simplificado para que siga siendo reconocible a 32–64 px.

### Requisitos visuales

- Composición cuadrada, centrada y con margen suficiente.
- Rostro, silueta o símbolo principal del Animalito.
- Un objeto, material o motivo que realmente pertenezca al personaje o a una skin.
- Paleta conectada con su temporada y rareza.
- Contorno marrón, textura de acuarela/papel y acabado de la colección.
- Contraste alto y pocos detalles pequeños.
- Sin texto, letras, logos ni marcas de agua.

El objeto del icono debe contar una versión reducida de la identidad del personaje. La bellota representa a Ardilla; el caramelo representa a Ajolote; el cacao y los dulces representan a Erizo. Para Loro podría usarse una pluma de colores, una piñata tropical o un detalle de Capitán Piruleta. No debe ser un objeto elegido al azar.

### Requisitos técnicos e integración

- Crear un PNG cuadrado, preferentemente de `1254 × 1254`.
- Usar transparencia alfa real cuando el componente lo requiera.
- Probarlo reducido a 32–64 px antes de aprobarlo.
- Guardarlo en `assets/inicio/iconos/` con un nombre estable.
- Registrarlo en `data/iconosLocales.js` y en `menus/Iconos.js` o el catálogo remoto si se entrega como recompensa.
- Reutilizar el mismo `iconoId` en recompensas, lotes, ruleta y Functions.
- No referenciar un icono que no tenga archivo o documento real.

Ejemplo de registro:

```js
export const ICONOS_LOCALES = {
  ardilla_bellota: require('../assets/inicio/iconos/icono-ardilla-bellota-v2.png'),
  ajolote_caramelo: require('../assets/inicio/iconos/icono-ajolote-caramelo.png'),
  erizo_dulce_medianoche: require('../assets/inicio/iconos/icono-erizo-dulce-medianoche.png'),
  loro_pinata: require('../assets/inicio/iconos/icono-loro-pinata.png'),
};
```

No usar nombres temporales como `icono-nuevo`, `icono-prueba` o `icono-final2`.

## 6. Flujo correcto de generación

1. Inspeccionar visualmente todas las bases y varias skins existentes.
2. Definir por escrito la especie, rareza, paleta, habilidad y concepto de las skins.
3. Generar solamente la base.
4. Revisar la base antes de generar skins:
   - ¿Parece parte de la misma colección?
   - ¿Se entiende la especie?
   - ¿Se nota la botarga?
   - ¿Tiene un único rostro?
   - ¿El encuadre coincide con los demás?
5. Corregir la base hasta que esté aprobada.
6. Usar la base aprobada como referencia principal para cada skin.
7. Generar cada skin por separado.
8. Verificar transparencia y dimensiones antes de conectar los archivos al código.
9. Integrar el Animalito en todos los sistemas correspondientes.
10. Ejecutar la validación del proyecto.

No se deben generar las skins a partir de una base todavía dudosa. Cualquier error de identidad se propaga y resulta más costoso corregirlo después.

## 7. Estructura de carpetas y nombres

Usar esta estructura exacta:

```text
assets/temporadas/libro/TemporadaN/Animales/NombreAnimal/
├── animal1.png
└── skins/
    ├── animalt1.png
    └── animalt2.png
```

Ejemplo del Loro:

```text
assets/temporadas/libro/Temporada2/Animales/Loro/
├── loro1.png
└── skins/
    ├── lorot1.png
    └── lorot2.png
```

Reglas para los identificadores:

- ID del animal: minúsculas y sin espacios, por ejemplo `loro`.
- Skin base: ID de catálogo `loro_default` y `storageId: 'default'`.
- Primera skin: `lorot1`.
- Segunda skin: `lorot2`.
- Campo de compatibilidad/desbloqueo: `loroDesbloqueado`.
- Temporada: `t1`, `t2`, etcétera.

No conservar versiones como `-v2`, `final`, `nuevo` o `corregido` dentro de la carpeta final. El código debe apuntar a nombres estables.

## 8. Requisitos técnicos de las imágenes

- Formato PNG.
- Lienzo cuadrado.
- Tamaño recomendado: `1254 × 1254`, igual que la mayoría de los assets actuales.
- Canal alfa real: `Format32bppArgb` o equivalente.
- Esquinas con alfa cero.
- Sin damero dibujado dentro de la imagen.
- Sin fondo blanco, negro, verde o gris.
- Sin halo claro alrededor del contorno.
- El contorno no debe tocar los bordes del lienzo.

Importante: ver un damero en una previsualización no garantiza transparencia. Hay que comprobar el canal alfa del archivo final. Si el PNG es RGB de 24 bits, el fondo está incrustado aunque parezca un patrón de transparencia.

## 9. Plantilla de prompt para la base

```text
Caso de uso: personaje estilizado para un juego móvil.
Referencias: usar las bases existentes como referencias estrictas de estilo,
proporciones, rostro, textura, contorno y encuadre.

Crear “[NOMBRE]”, un [ESPECIE] bebé que lleva una botarga grande y acolchada
inspirada en su misma especie. No es un humano disfrazado y tampoco es una
representación realista del animal.

El rostro conserva los rasgos propios de [ESPECIE] y aparece dentro de una
abertura clara, separada de la botarga por una costura marrón gruesa. Debe
tener exactamente un par de ojos y una sola versión de cada rasgo facial.

Silueta muy redonda, compacta y ancha; vista frontal; ojos grandes marrones
con reflejos blancos; mejillas rosadas; textura de acuarela y papel; contorno
chocolate grueso e irregular; formas infantiles y legibles.

Lienzo cuadrado con fondo realmente transparente. Personaje completo,
centrado, ocupando alrededor del 75 % del lienzo. Sin piso, sombra, escenario,
marco, texto, logotipo, marca de agua ni personajes adicionales.
```

El prompt debe describir expresamente dónde está cada rasgo propio de la especie para evitar ojos, bocas, narices o picos duplicados.

## 10. Plantilla de prompt para una skin

```text
Usar la imagen base aprobada como referencia exacta de identidad, rostro,
postura, proporciones y escala. Las skins existentes son referencias de cómo
una skin reemplaza la botarga exterior completa.

Crear “[NOMBRE DE SKIN]”: transformar toda la botarga exterior en [CONCEPTO],
con [PALETA Y MATERIALES]. Conservar exactamente el rostro, los rasgos de la
especie, los ojos, las mejillas, los pies, la postura y el encuadre.

La nueva botarga debe tener una silueta propia y ser legible en una tarjeta
pequeña. Mantener textura de acuarela/papel, contornos marrón chocolate y
formas redondeadas.

Debe existir exactamente un rostro. No duplicar ojos, pico, nariz, boca,
orejas ni otros rasgos. No tapar los ojos. Fondo realmente transparente, sin
damero incrustado, piso, sombra, texto, marco, logotipo o marca de agua.
```

## 11. Integración en el catálogo central

Registrar la ficha del animal en `data/animalitos.js`, dentro de `ANIMALITOS`:

```js
{
  id: 'animal',
  temporada: 't2',
  nombre: 'Animal',
  rareza: 'Legendario',
  colorRareza: '#d48a2c',
  pistaBloqueada: 'Una pista breve',
  icono: '🐾',
  habilidad: 'Nombre de habilidad',
  habilidadTexto: 'Descripción breve del efecto.',
  legacyUnlockField: 'animalDesbloqueado',
  comercio: { color: '#...', fondo: '#...', borde: '#...' },
  imagen: require('../assets/temporadas/libro/Temporada2/Animales/Animal/animal1.png'),
}
```

Registrar también las tres entradas en `SKINS`:

- Base con `storageId: 'default'`.
- Skin 1 con su ID propio.
- Skin 2 con su ID propio.

Al estar correctamente registrado en el catálogo central, el Animalito queda disponible para:

- `Animalitos.js`
- `Player.js`
- `components/AnimalitoShowcase.js`
- `menus/Perfil.js`
- `Comerciante.js`
- Cualquier componente que use `ANIMALITOS`, `ANIMALITOS_POR_ID`, `SKINS_POR_ANIMAL` o `IMAGENES_POR_SKIN`.

No crear mapas de imágenes duplicados dentro de cada componente si el catálogo central ya resuelve el caso.

## 12. Progreso y recompensas

Agregar una entrada del animal en `RECOMPENSAS_NIVEL`, dentro de `Animalitos.js`.

La progresión actual usa hitos en niveles:

- Nivel 5: monedas.
- Nivel 15: diamantes.
- Nivel 25: icono especial o pendiente.
- Nivel 75: cartas universales.
- Nivel 100: primera skin.

Los IDs de skin usados como recompensa deben coincidir exactamente con los registrados en `data/animalitos.js`.

## 13. Desbloqueo y economía

Antes de dar por terminada la integración, decidir explícitamente cómo se obtiene el Animalito:

- Evento de temporada.
- Lote.
- Ruleta.
- Código.
- Migración o campo manual temporal.

Si se agrega a un lote o a la ruleta, actualizar tanto el cliente como las Functions correspondientes. No agregar una recompensa de servidor que apunte a documentos, lotes o skins inexistentes.

El Animalito puede considerarse desbloqueado mediante:

- Su campo `legacyUnlockField` en el documento del usuario.
- `usuarios/{uid}/animalitos/{animalId}.desbloqueado`.
- Un nivel o cartas guardadas en el estado del Animalito.
- Estar actualmente equipado, según la compatibilidad existente.

La segunda skin puede tener `comercioPrecio` si se venderá en el Comerciante. El precio debe guardar relación con su rareza y con las skins existentes.

## 14. Temporadas

El campo `temporada` controla cuándo aparece el contenido mediante `contenidoDisponible`.

- Un Animalito de Temporada 2 debe usar `temporada: 't2'` en su ficha y en sus tres skins.
- No hay que añadir condiciones manuales en `Player` o `Perfil`.
- Si tendrá un evento o lote propio, debe añadirse además a la pantalla y configuración correspondiente.

## 15. Lista de comprobación final

### Visual

- [ ] Revisé todas las bases existentes antes de generar.
- [ ] El animal pertenece visualmente a la colección.
- [ ] Se entiende que es el propio animal dentro de una botarga de su especie.
- [ ] Existe un solo rostro y no hay rasgos duplicados.
- [ ] La base no parece una skin especial.
- [ ] Las skins cambian la botarga completa y no son solo accesorios.
- [ ] El Animalito tiene un icono propio relacionado con su identidad.
- [ ] El icono se reconoce al reducirlo a 32–64 px.
- [ ] El motivo del icono está conectado con una skin, objeto o concepto real del personaje.
- [ ] Las tres imágenes mantienen identidad, escala y postura.
- [ ] Se leen bien en tamaño de tarjeta.

### Archivos

- [ ] Los tres PNG tienen nombres definitivos.
- [ ] Miden aproximadamente `1254 × 1254`.
- [ ] Tienen transparencia alfa real.
- [ ] No contienen damero, fondo ni halo.
- [ ] No quedaron archivos temporales o duplicados.

### Código

- [ ] Agregué la ficha a `ANIMALITOS`.
- [ ] Agregué base y dos skins a `SKINS`.
- [ ] Los `require(...)` usan rutas exactas y existentes.
- [ ] Agregué recompensas de nivel en `Animalitos.js`.
- [ ] Registré el icono en `data/iconosLocales.js` y en el catálogo de iconos si corresponde.
- [ ] El `iconoId` usado por recompensas, lotes o Functions existe realmente.
- [ ] Definí una fuente real de desbloqueo.
- [ ] Revisé lote, ruleta, evento, Comerciante y Functions si aplican.
- [ ] Probé lista, detalle, equipar, cambiar skin, Player y Perfil.
- [ ] Ejecuté `node scripts/validate.js`.
- [ ] No desplegué Functions sin autorización explícita.

## 16. Errores que no deben repetirse

- Generar primero un animal literal que no parece llevar una botarga.
- Corregirlo convirtiéndolo en un personaje humanoide disfrazado.
- Añadir un segundo par de ojos o un segundo pico en la capucha.
- Generar las skins antes de aprobar definitivamente la base.
- Crear skins que solo añaden gafas, corona o capa sobre la base.
- Crear el Animalito sin un icono relacionado o dejarlo con un emoji como sustituto permanente.
- Diseñar un icono que no se entiende al reducirlo a tamaño de avatar.
- Referenciar un icono en una recompensa sin registrarlo en el catálogo local o remoto.
- Suponer que un damero visible significa que el PNG tiene transparencia.
- Dejar imágenes nuevas fuera del catálogo central.
- Añadir el animal al catálogo sin recompensas ni estrategia de desbloqueo.
- Duplicar rutas o lógica que ya se deriva de `data/animalitos.js`.
