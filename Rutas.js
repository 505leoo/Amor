import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { collection, doc, getDocs, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { auth, db, storage } from './firebaseConfig';
import TabButtons from './components/TabButtons';

const RUTA_PRINCIPAL = [
  { id: 'colectivo', numero: '01', titulo: 'El comienzo', lugar: 'El colectivo', descripcion: 'Guardá una foto del colectivo: ahí empieza el día de Aurora.', etiqueta: 'PRIMER RECUERDO', recompensa: 'Unas gomitas', icono: 'directions-bus', color: '#e887a8' },
  { id: 'regalo-gomitas', numero: '02', titulo: 'Un regalo dulce', lugar: 'Las gomitas', descripcion: 'Sacale una foto al regalo antes de abrirlo y dejalo guardado como recuerdo.', etiqueta: 'DETALLE FÍSICO', recompensa: 'Un momento compartido', icono: 'card-giftcard', color: '#c889d7' },
  { id: 'obelisco', numero: '03', titulo: 'Frente al Obelisco', lugar: 'El Obelisco', descripcion: 'Sacá una foto de la torre. El corazón con las manos representa el beso.', etiqueta: 'MOMENTO ESPECIAL', recompensa: 'Un beso con vista a Buenos Aires', icono: 'favorite', color: '#a978c9' },
  { id: 'lavalle', numero: '04', titulo: 'Paseo por Lavalle', lugar: 'LaValle', descripcion: 'Guardá una foto de la calle, una vidriera o un detalle que les guste.', etiqueta: 'LA CAMINATA', recompensa: 'Un recuerdo del paseo', icono: 'photo-camera', color: '#e2a1be' },
  { id: 'comida', numero: '05', titulo: 'La parada elegida', lugar: 'Un lugar rico', descripcion: 'Cualquier local de comida cuenta si les dan ganas de pedir algo.', etiqueta: 'HORA DE COMER', recompensa: 'Un bocado de victoria', icono: 'restaurant', color: '#d38b52' },
  { id: 'flores', numero: '06', titulo: 'El último recuerdo', lugar: 'Las flores', descripcion: 'Guardá una foto del ramo para cerrar la aventura.', etiqueta: 'MENSAJE DEL FUTURO', recompensa: 'Un mensaje para Aurora', icono: 'local-florist', color: '#d2779c' },
];

const RUTA_TABS = [
  { id: 'principal', label: 'PRINCIPAL', icon: 'flag', tipo: 'resumen', ids: [] },
  { id: 'recorrido', label: 'RECORRIDO', icon: 'directions-bus', tipo: 'etapas', ids: ['colectivo'] },
  { id: 'torre', label: 'TORRE', icon: 'location-city', tipo: 'etapas', ids: ['obelisco'] },
  { id: 'paseo', label: 'PASEO', icon: 'directions-walk', tipo: 'etapas', ids: ['lavalle'] },
  { id: 'comida', label: 'COMIDA', icon: 'restaurant', tipo: 'etapas', ids: ['comida'] },
  { id: 'fin', label: '???', icon: 'help-outline', tipo: 'etapas', ids: ['flores'] },
];

const notify = (type, text) => {
  if (typeof global.showToast === 'function') global.showToast({ type, text });
};

const getPhotoExtension = (uri = '') => {
  const extension = uri.split('?')[0].split('.').pop()?.toLowerCase();
  return ['png', 'webp', 'heic', 'jpeg'].includes(extension) ? extension : 'jpg';
};

function RutaBackground() {
  const bandas = Array.from({ length: 17 }, (_, index) => 12 + (index * 48));
  return (
    <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%" viewBox="0 0 800 450" preserveAspectRatio="none">
      <Defs>
        <SvgLinearGradient id="rutasBase" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#fff7fa" />
          <Stop offset="0.48" stopColor="#f7dce6" />
          <Stop offset="1" stopColor="#e9b8cb" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="800" height="450" fill="url(#rutasBase)" />
      {bandas.map((x, index) => <React.Fragment key={index}>
        <Rect x={x} y="0" width="8" height="450" fill="#4d3948" opacity="0.105" />
        <Rect x={x + 8} y="0" width="1" height="450" fill="#ffffff" opacity="0.5" />
      </React.Fragment>)}
      <Path d="M108 80 C97 65 74 73 74 91 C74 110 108 128 108 128 C108 128 142 110 142 91 C142 73 119 65 108 80 Z" fill="#fffaff" opacity="0.52" />
      <Path d="M276 314 C266 300 244 307 244 324 C244 342 276 359 276 359 C276 359 308 342 308 324 C308 307 286 300 276 314 Z" fill="#d77da6" opacity="0.22" />
      <Path d="M514 121 C503 107 481 114 481 131 C481 149 514 167 514 167 C514 167 547 149 547 131 C547 114 525 107 514 121 Z" fill="#fffaff" opacity="0.44" />
      <Path d="M676 345 C667 333 648 339 648 354 C648 370 676 385 676 385 C676 385 704 370 704 354 C704 339 685 333 676 345 Z" fill="#a5547b" opacity="0.22" />
      <Path d="M720 75 C713 65 697 70 697 82 C697 95 720 107 720 107 C720 107 743 95 743 82 C743 70 727 65 720 75 Z" fill="#fffaff" opacity="0.58" />
      <Rect x="0" y="0" width="800" height="2" fill="#ffffff" opacity="0.66" />
      <Rect x="0" y="448" width="800" height="2" fill="#80445f" opacity="0.16" />
    </Svg>
  );
}

function TabSelector({ tabs, activeId, onChange, bloqueadas = {}, proximaId = null }) {
  return (
    <ScrollView horizontal style={styles.tabsScroller} showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabsContent}>
      {tabs.map(tab => {
        const active = tab.id === activeId;
        const bloqueada = Boolean(bloqueadas[tab.id]);
        const proxima = bloqueada && tab.id === proximaId;
        const label = bloqueada && !proxima ? '???' : tab.label;
        return (
          <TouchableOpacity key={tab.id} style={[styles.tab, active && styles.tabActive, bloqueada && styles.tabLocked, proxima && styles.tabNextLocked]} onPress={() => !bloqueada && onChange(tab.id)} disabled={bloqueada} activeOpacity={0.82}>
            <MaterialIcons name={bloqueada ? 'lock' : tab.icon} size={15} color={active ? '#fff8e8' : bloqueada ? (proxima ? '#b9abb2' : '#85757d') : '#6f5360'} />
            <Text style={[styles.tabText, active && styles.tabTextActive, bloqueada && styles.tabTextLocked, proxima && styles.tabTextNextLocked]}>{label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

function StepCard({ step, index, completed, unlocked, saved, onTakePhoto, onChoosePhoto }) {
  return (
    <View style={[styles.stepCard, !unlocked && styles.stepCardLocked, completed && styles.stepCardCompleted]}>
      <View style={styles.stepTopRow}>
        <View style={[styles.stepNumber, { backgroundColor: unlocked ? step.color : '#a99ba3' }]}>
          {completed ? <MaterialIcons name="check" size={17} color="#fff" /> : <Text style={styles.stepNumberText}>{step.numero}</Text>}
        </View>
        <View style={styles.stepHeadCopy}>
          <Text style={styles.stepLabel}>{step.etiqueta}</Text>
          <Text style={styles.stepTitle} numberOfLines={1}>{step.titulo}</Text>
          <Text style={styles.stepPlace} numberOfLines={1}>{step.lugar}</Text>
        </View>
        <View style={[styles.stepIcon, { backgroundColor: `${step.color}25` }]}>
          <MaterialIcons name={step.icono} size={21} color={unlocked ? step.color : '#8e818a'} />
        </View>
      </View>

      {completed && saved?.fotoUrl ? (
        <Image source={{ uri: saved.fotoUrl }} style={styles.savedPhoto} contentFit="cover" cachePolicy="memory-disk" />
      ) : (
        <View style={styles.stepIllustration}>
          <MaterialIcons name={step.icono} size={31} color={unlocked ? step.color : '#a99ba3'} />
          <Text style={styles.illustrationText}>{completed ? 'RECUERDO GUARDADO' : unlocked ? 'FOTO DEL MOMENTO' : 'BLOQUEADO'}</Text>
        </View>
      )}

      <Text style={styles.stepDescription} numberOfLines={3}>
        {unlocked ? step.descripcion : `Completá “${RUTA_PRINCIPAL[index - 1].titulo}” para desbloquear este momento.`}
      </Text>

      <View style={styles.rewardStrip}>
        <MaterialIcons name="card-giftcard" size={15} color="#a46a38" />
        <View style={styles.rewardTextWrap}>
          <Text style={styles.rewardCaption}>DETALLE</Text>
          <Text style={styles.rewardText} numberOfLines={1}>{step.recompensa}</Text>
        </View>
      </View>

      {unlocked && !completed && (
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.cameraButton} onPress={() => onTakePhoto(step)} activeOpacity={0.82}>
            <MaterialIcons name="photo-camera" size={16} color="#fff9ee" />
            <Text style={styles.cameraButtonText}>CÁMARA</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.galleryButton} onPress={() => onChoosePhoto(step)} activeOpacity={0.82}>
            <MaterialIcons name="photo-library" size={16} color="#81505f" />
            <Text style={styles.galleryButtonText}>SUBIR</Text>
          </TouchableOpacity>
        </View>
      )}
      {completed && <View style={styles.savedStatus}><MaterialIcons name="auto-awesome" size={14} color="#6a9c6d" /><Text style={styles.savedStatusText}>RECUERDO CONFIRMADO</Text></View>}
    </View>
  );
}

function EmptyMemories() {
  return (
    <View style={styles.emptyBox}>
      <MaterialIcons name="photo-library" size={31} color="#a77686" />
      <Text style={styles.emptyTitle}>Todavía no hay recuerdos</Text>
      <Text style={styles.emptyText}>Completá una etapa y su foto aparecerá acá.</Text>
    </View>
  );
}

const CHECKLIST_HOY = [
  { id: 'salida', icono: 'directions-walk', titulo: 'Todo listo para salir', texto: 'Una pausa antes de empezar.' },
  { id: 'camara', icono: 'photo-camera', titulo: 'Celular listo', texto: 'Para guardar cada momento.' },
  { id: 'animo', icono: 'favorite', titulo: 'Ganas de pasarla lindo', texto: 'Lo más importante de la salida.' },
];

const normalizarMarca = marca => {
  if (!marca) return null;
  if (marca?.estado) return { estado: marca.estado, fecha: marca.en || marca.fecha || null };
  return { estado: 'confirmado', fecha: marca };
};

const horaMarca = marca => {
  const fecha = normalizarMarca(marca)?.fecha;
  const value = fecha?.toDate ? fecha.toDate() : fecha instanceof Date ? fecha : null;
  return value ? value.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : null;
};

function ChecklistCard({ checklist, uid, parejaUid, onToggle, guardando, bloqueado = false }) {
  const items = checklist?.items || {};
  return (
    <View style={styles.checklistCard}>
      <View pointerEvents="none" style={styles.checklistAccent} />
      <View style={styles.checklistHeader}><View><Text style={styles.checklistEyebrow}>ENTRE LOS DOS</Text><Text style={styles.checklistTitle}>Checklist de hoy</Text></View><MaterialIcons name="checklist" size={26} color="#b26784" /></View>
      {CHECKLIST_HOY.map(item => {
        const marcas = items[item.id]?.marcas || {};
        const miMarca = normalizarMarca(marcas[uid]);
        const suMarca = normalizarMarca(marcas[parejaUid]);
        const miHora = horaMarca(marcas[uid]);
        const suHora = horaMarca(marcas[parejaUid]);
        const miConfirmado = miMarca?.estado === 'confirmado';
        const miNoConfirmado = miMarca?.estado === 'no_confirmado';
        const suConfirmado = suMarca?.estado === 'confirmado';
        const suNoConfirmado = suMarca?.estado === 'no_confirmado';
        return <TouchableOpacity key={item.id} style={[styles.checkRow, miConfirmado && styles.checkRowDone, miNoConfirmado && styles.checkRowNo, bloqueado && styles.checkRowFrozen]} onPress={() => onToggle(item.id)} disabled={guardando || bloqueado} activeOpacity={0.78}>
          <View style={styles.checkIcon}><MaterialIcons name={item.icono} size={16} color="#a4627d" /></View>
          <View style={styles.checkCopy}><Text style={styles.checkTitle}>{item.titulo}</Text><Text style={styles.checkText}>{item.texto}</Text></View>
          <View style={styles.personCheck}>
            <View style={[styles.personCircle, miConfirmado && styles.personCircleDone, miNoConfirmado && styles.personCircleNo]}>{miMarca && <MaterialIcons name={miConfirmado ? 'check' : 'close'} size={15} color="#fff" />}</View>
            <View style={styles.personMeta}><Text style={styles.personLabel}>VOS</Text>{miHora && <Text style={styles.personTime}>{miHora}</Text>}</View>
          </View>
          <View style={styles.personCheck}>
            <View style={[styles.personCircle, suConfirmado && styles.personCirclePartner, suNoConfirmado && styles.personCircleNo]}>{suMarca && <MaterialIcons name={suConfirmado ? 'check' : 'close'} size={15} color="#fff" />}</View>
            <View style={styles.personMeta}><Text style={styles.personLabel}>AURO</Text>{suHora && <Text style={styles.personTime}>{suHora}</Text>}</View>
          </View>
        </TouchableOpacity>;
      })}
    </View>
  );
}

function SwipeCue({ colectivo = false }) {
  return <View pointerEvents="none" style={styles.swipeCue}>
    <Svg width="235" height="82" viewBox="0 0 235 82">
      <Path d="M8 55 C42 27, 74 69, 108 45 S172 25, 220 45" fill="none" stroke="#a55d7c" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="2 6" opacity="0.88" />
      <Path d="M210 33 L224 45 L208 53" fill="none" stroke="#a55d7c" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M59 17 C55 11 45 14 45 21 C45 28 59 35 59 35 C59 35 73 28 73 21 C73 14 63 11 59 17 Z" fill="#efb4c8" opacity="0.9" />
      <Path d="M145 61 C142 57 135 59 135 64 C135 69 145 74 145 74 C145 74 155 69 155 64 C155 59 148 57 145 61 Z" fill="#d98aa8" opacity="0.82" />
    </Svg>
    {colectivo && <View style={styles.swipeBus}><MaterialIcons name="directions-bus" size={25} color="#a45d7c" /></View>}
    <Text style={styles.swipeCueText}>DESLIZÁ PARA SEGUIR</Text>
  </View>;
}

function BusConnector() {
  return <View pointerEvents="none" style={styles.busConnector}><MaterialIcons name="directions-bus" size={23} color="#b45f80" /><View style={styles.busConnectorLine} /><MaterialIcons name="favorite" size={13} color="#d88da8" /></View>;
}

function StarRating({ value = 0, onChange, disabled = false }) {
  return <View style={styles.starRating}>{[1, 2, 3, 4, 5].map(star => <TouchableOpacity key={star} onPress={() => onChange?.(star)} disabled={disabled} hitSlop={4} activeOpacity={0.72}><MaterialIcons name={star <= value ? 'star' : 'star-border'} size={23} color={star <= value ? '#e9ae3f' : '#cdaeb5'} /></TouchableOpacity>)}</View>;
}

function BusPhotoCard({ propio, foto, calificacion, calificacionRecibida, onCamera, onGallery, onRate, nombrePareja, variante = 'bus', tituloPropio = 'El colectivo encontrado', tituloPareja, icono = 'directions-bus', bloqueado = false, textoBloqueado }) {
  const fechaCalificacion = horaMarca(calificacion?.calificadaEn);
  const esTorre = variante === 'torre';
  const esPaseo = variante === 'paseo';
  const esComida = variante === 'comida';
  const esFlores = variante === 'flores';
  const accentColor = esTorre ? '#7b6fb1' : esPaseo ? '#bd816e' : esComida ? '#c57a46' : esFlores ? '#c9638d' : '#b36583';
  return <View style={[styles.busPhotoCard, esTorre && styles.towerPhotoCard, esPaseo && styles.paseoPhotoCard, esComida && styles.comidaPhotoCard, esFlores && styles.floresPhotoCard, propio ? styles.busPhotoCardOwn : styles.busPhotoCardPartner, esTorre && !propio && styles.towerPhotoCardPartner, esPaseo && !propio && styles.paseoPhotoCardPartner, esComida && !propio && styles.comidaPhotoCardPartner, esFlores && !propio && styles.floresPhotoCardPartner]}>
    <View style={styles.busPhotoHeader}><View><Text style={styles.busPhotoEyebrow}>{propio ? 'TU MOMENTO' : 'LA FOTO DE TU PAREJA'}</Text><Text style={styles.busPhotoTitle}>{propio ? tituloPropio : (tituloPareja || `El recuerdo de ${nombrePareja}`)}</Text></View><MaterialIcons name={propio ? 'photo-camera' : 'favorite'} size={24} color={accentColor} /></View>
    {foto?.fotoUrl ? <Image source={{ uri: foto.fotoUrl }} style={styles.busPhotoImage} contentFit="cover" cachePolicy="memory-disk" /> : <View style={[styles.busPhotoEmpty, esTorre && styles.towerPhotoEmpty, esPaseo && styles.paseoPhotoEmpty, esComida && styles.comidaPhotoEmpty, esFlores && styles.floresPhotoEmpty]}><MaterialIcons name={propio ? icono : 'hourglass-empty'} size={35} color={esTorre ? '#8077ad' : esPaseo ? '#bd816e' : esComida ? '#c57a46' : esFlores ? '#c9638d' : '#b98598'} /><Text style={styles.busEmptyText}>{propio ? 'Todavía falta tu foto' : `Esperando la foto de ${nombrePareja}`}</Text></View>}
    {propio ? (foto?.fotoUrl ? <View style={styles.busSaved}>{calificacionRecibida?.estrellas ? <><MaterialIcons name="star" size={16} color="#dda438" /><Text style={styles.busSavedText}>Tu pareja le dio {calificacionRecibida.estrellas}/5</Text></> : <><MaterialIcons name="check-circle" size={16} color="#759b62" /><Text style={styles.busSavedText}>Tu recuerdo ya está guardado</Text></>}</View> : bloqueado ? <View style={styles.photoLocked}><MaterialIcons name="lock" size={15} color="#9d7583" /><Text style={styles.photoLockedText}>{textoBloqueado || 'Primero reclamá el mensaje.'}</Text></View> : <View style={styles.busButtons}><TouchableOpacity style={styles.busCameraButton} onPress={onCamera}><MaterialIcons name="photo-camera" size={17} color="#fff" /><Text style={styles.busCameraText}>SACAR FOTO</Text></TouchableOpacity><TouchableOpacity style={styles.busGalleryButton} onPress={onGallery}><MaterialIcons name="photo-library" size={17} color="#8b5b6c" /></TouchableOpacity></View>) : foto?.fotoUrl ? <View style={styles.rateArea}><Text style={styles.rateLabel}>¿CUÁNTAS ESTRELLAS LE DAS?</Text><StarRating value={calificacion?.estrellas || 0} onChange={onRate} />{calificacion?.estrellas ? <Text style={styles.rateSaved}>Tu calificación quedó guardada{fechaCalificacion ? ` · ${fechaCalificacion}` : ''}</Text> : <Text style={styles.rateHint}>Tocá una estrella para calificarla</Text>}</View> : null}
  </View>;
}

function RecorridoIntro() {
  return <View style={styles.routeIntroCard}>
    <View style={styles.routeIntroBadge}><MaterialIcons name="directions-bus" size={30} color="#fff8fa" /></View>
    <Text style={styles.routeIntroEyebrow}>PRIMERA PISTA</Text><Text style={styles.routeIntroTitle}>El número que abre la aventura</Text>
    <Text style={styles.routeIntroText}>Buscá el colectivo cuyo número está a solo un paso de llegar al sesenta. Cuando lo encuentres, guardá una foto: ahí empieza todo.</Text>
    <View style={styles.routeRiddle}><Text style={styles.routeRiddleText}>5 + 9 = ?</Text><Text style={styles.routeRiddleHint}>Una pista muy fácil para los dos</Text></View>
  </View>;
}

function TorreIntro() {
  return <View style={styles.towerIntroCard}>
    <View style={styles.towerIntroBadge}><MaterialIcons name="location-city" size={31} color="#fffaff" /></View>
    <Text style={styles.routeIntroEyebrow}>SEGUNDA PISTA</Text><Text style={styles.towerIntroTitle}>La aguja que toca el cielo</Text>
    <Text style={styles.routeIntroText}>Es una torre finita, blanca y muy famosa. Está donde se cruzan las avenidas más grandes del centro.</Text>
    <View style={styles.towerRiddle}><Text style={styles.towerRiddleText}>Se ve desde muy lejos</Text><Text style={styles.routeRiddleHint}>Cuando la encuentres, guardá una foto</Text></View>
  </View>;
}

function GomitasRewardCard({ onPress, bloqueado, preview, tipo = 'gomitas', reclamada = false }) {
  const esBeso = tipo === 'beso';
  const esPaseo = tipo === 'paseo';
  const esComida = tipo === 'comida';
  return <TouchableOpacity style={[styles.gomitasCard, bloqueado && styles.gomitasCardLocked]} onPress={onPress} disabled={!onPress} activeOpacity={0.8}>
    <View style={[styles.gomitasGlow, esBeso && styles.kissGlow, esPaseo && styles.paseoGlow, esComida && styles.comidaGlow]} /><MaterialIcons name={bloqueado ? 'lock' : esBeso ? 'favorite' : esPaseo ? 'shopping-bag' : esComida ? 'restaurant' : 'card-giftcard'} size={35} color={bloqueado ? '#9b8790' : esBeso ? '#a8648d' : esPaseo ? '#b77665' : esComida ? '#c87a42' : '#c76b90'} />
    <Text style={styles.gomitasEyebrow}>{bloqueado ? 'PREMIO DE AURORA' : reclamada ? 'PREMIO RECLAMADO' : 'RECOMPENSA DESBLOQUEADA'}</Text><Text style={styles.gomitasTitle}>{bloqueado ? 'Todavía está guardado' : reclamada ? 'El camino sigue abierto' : esBeso ? 'Un piquito pendiente' : esPaseo ? 'Un caprichito te espera' : esComida ? 'Tu bocado de victoria' : 'Una sorpresa te espera'}</Text><Text style={styles.gomitasText}>{bloqueado ? 'Se abre cuando los dos califiquen sus fotos.' : reclamada ? 'Tocá para volver a leer tu premio.' : esBeso ? 'Tocá para descubrir el acuerdo.' : esPaseo ? 'Tocá para abrir las condiciones.' : esComida ? 'Tocá para conocer tu poder.' : 'Tocá para descubrir lo que ganaste.'}</Text>
    {preview && <View style={styles.previewPill}><Text style={styles.previewPillText}>VISTA PREVIA</Text></View>}
  </TouchableOpacity>;
}

function TorreJourney({ propiaFoto, fotoPareja, parejaUid, uid, nombrePareja, onCamera, onGallery, onRate, recompensaBloqueada, onReward, recompensaReclamada }) {
  const miCalificacion = fotoPareja?.calificaciones?.[uid] || null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recorridoScrollContent}>
    <View style={styles.introSpacerStart} /><TorreIntro /><SwipeCue /><View style={styles.routeGuideGap} />
    <BusPhotoCard propio variante="torre" icono="location-city" tituloPropio="La torre encontrada" foto={propiaFoto} calificacionRecibida={propiaFoto?.calificaciones?.[parejaUid]} onCamera={onCamera} onGallery={onGallery} nombrePareja={nombrePareja} />
    <View style={styles.towerConnector}><MaterialIcons name="location-city" size={23} color="#756aa8" /><Text style={styles.towerConnectorSpark}>✦</Text><MaterialIcons name="favorite" size={13} color="#d68aa9" /></View>
    <BusPhotoCard variante="torre" tituloPareja={`La torre de ${nombrePareja}`} foto={fotoPareja} calificacion={miCalificacion} onRate={onRate} nombrePareja={nombrePareja} />
    <View style={styles.afterPartnerGap} /><SwipeCue /><GomitasRewardCard tipo="beso" bloqueado={recompensaBloqueada} reclamada={recompensaReclamada} preview={false} onPress={onReward} />
    <View style={styles.introSpacerEnd} />
  </ScrollView>;
}

function PaseoIntro() {
  return <View style={styles.paseoIntroCard}>
    <View style={styles.paseoIntroBadge}><MaterialIcons name="storefront" size={30} color="#fffaf6" /></View>
    <Text style={styles.routeIntroEyebrow}>TERCERA PISTA</Text><Text style={styles.paseoIntroTitle}>La calle que invita a mirar</Text>
    <Text style={styles.routeIntroText}>A solo una cuadra de la gran torre hay una entrada que parece abrir la puerta a otro paseo. Tiene luces, carteles y muchas vidrieras para mirar sin apuro.</Text>
    <View style={styles.paseoRiddle}><Text style={styles.paseoRiddleText}>Buscá la entrada más linda</Text><Text style={styles.routeRiddleHint}>Cuando la encuentres, guardá una foto</Text></View>
  </View>;
}

function PaseoConnector() {
  return <View pointerEvents="none" style={styles.paseoConnector}><MaterialIcons name="directions-walk" size={24} color="#bd816e" /><View style={styles.paseoConnectorLine} /><MaterialIcons name="auto-awesome" size={15} color="#d49a55" /></View>;
}

function PaseoJourney({ propiaFoto, fotoPareja, parejaUid, uid, nombrePareja, onCamera, onGallery, onRate, recompensaBloqueada, onReward, recompensaReclamada }) {
  const miCalificacion = fotoPareja?.calificaciones?.[uid] || null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recorridoScrollContent}>
    <View style={styles.introSpacerStart} /><PaseoIntro /><SwipeCue /><View style={styles.routeGuideGap} />
    <BusPhotoCard propio variante="paseo" icono="storefront" tituloPropio="La entrada encontrada" foto={propiaFoto} calificacionRecibida={propiaFoto?.calificaciones?.[parejaUid]} onCamera={onCamera} onGallery={onGallery} nombrePareja={nombrePareja} />
    <PaseoConnector />
    <BusPhotoCard variante="paseo" tituloPareja={`La entrada de ${nombrePareja}`} foto={fotoPareja} calificacion={miCalificacion} onRate={onRate} nombrePareja={nombrePareja} />
    <View style={styles.afterPartnerGap} /><SwipeCue /><GomitasRewardCard tipo="paseo" bloqueado={recompensaBloqueada} reclamada={recompensaReclamada} preview={false} onPress={onReward} />
    <View style={styles.introSpacerEnd} />
  </ScrollView>;
}

function ComidaIntro() {
  return <View style={styles.comidaIntroCard}>
    <View style={styles.comidaIntroBadge}><MaterialIcons name="restaurant" size={31} color="#fffaf4" /></View>
    <Text style={styles.routeIntroEyebrow}>CUARTA PISTA</Text><Text style={styles.comidaIntroTitle}>El lugar que huele rico</Text>
    <Text style={styles.routeIntroText}>No hay una respuesta única: puede tener arcos dorados, una plancha con panchos, una vitrina o una cocina chiquita. Si cerca de ahí se puede pedir algo rico, encontraste la parada.</Text>
    <View style={styles.comidaRiddle}><Text style={styles.comidaRiddleText}>Cualquier antojo cuenta</Text><Text style={styles.routeRiddleHint}>Guardá la foto del lugar elegido</Text></View>
  </View>;
}

function ComidaConnector() {
  return <View pointerEvents="none" style={styles.comidaConnector}><MaterialIcons name="restaurant" size={22} color="#c57a46" /><View style={styles.comidaConnectorLine} /><MaterialIcons name="favorite" size={13} color="#d88875" /></View>;
}

function ComidaJourney({ propiaFoto, fotoPareja, parejaUid, uid, nombrePareja, onCamera, onGallery, onRate, recompensaBloqueada, onReward, recompensaReclamada }) {
  const miCalificacion = fotoPareja?.calificaciones?.[uid] || null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recorridoScrollContent}>
    <View style={styles.introSpacerStart} /><ComidaIntro /><SwipeCue /><View style={styles.routeGuideGap} />
    <BusPhotoCard propio variante="comida" icono="restaurant" tituloPropio="Tu parada elegida" foto={propiaFoto} calificacionRecibida={propiaFoto?.calificaciones?.[parejaUid]} onCamera={onCamera} onGallery={onGallery} nombrePareja={nombrePareja} />
    <ComidaConnector />
    <BusPhotoCard variante="comida" tituloPareja={`La parada de ${nombrePareja}`} foto={fotoPareja} calificacion={miCalificacion} onRate={onRate} nombrePareja={nombrePareja} />
    <View style={styles.afterPartnerGap} /><SwipeCue /><GomitasRewardCard tipo="comida" bloqueado={recompensaBloqueada} reclamada={recompensaReclamada} preview={false} onPress={onReward} />
    <View style={styles.introSpacerEnd} />
  </ScrollView>;
}

function FinalIntro() {
  return <View style={styles.finalIntroCard}>
    <View style={styles.finalIntroBadge}><Text style={styles.finalQuestion}>?</Text></View>
    <Text style={styles.routeIntroEyebrow}>SEÑAL INESPERADA</Text><Text style={styles.finalIntroTitle}>Algo llegó antes de tiempo</Text>
    <Text style={styles.routeIntroText}>Parece que el sistema confundió el orden de esta escena. Será mejor revisar el premio antes de que desaparezca…</Text>
    <View style={styles.finalRiddle}><Text style={styles.finalRiddleText}>Error 06: regalo adelantado</Text><Text style={styles.routeRiddleHint}>Tocá y averiguá qué pasó</Text></View>
  </View>;
}

function FloresRewardCard({ reclamado, esAurora, onPress }) {
  const bloqueado = !esAurora;
  const revelarFlores = reclamado;
  return <TouchableOpacity style={[styles.floresRewardCard, bloqueado && styles.floresRewardCardLocked]} onPress={onPress} disabled={!onPress} activeOpacity={0.82}>
    <View style={styles.floresRewardGlow} /><MaterialIcons name={bloqueado ? 'lock' : revelarFlores ? 'local-florist' : 'redeem'} size={39} color={bloqueado ? '#9a858d' : revelarFlores ? '#c55e89' : '#a76787'} />
    <Text style={styles.gomitasEyebrow}>{bloqueado ? 'PREMIO PARA AURORA' : revelarFlores ? 'MENSAJE RECIBIDO' : 'PREMIO ADELANTADO'}</Text>
    <Text style={styles.gomitasTitle}>{bloqueado ? 'Todavía no podés verlo' : revelarFlores ? 'Las flores ya lo saben' : 'Hay algo para vos'}</Text>
    <Text style={styles.gomitasText}>{bloqueado ? 'Aurora tiene que abrir esta parte de la ruta.' : revelarFlores ? 'La última foto ya puede completar el evento.' : 'El sistema recomienda reclamarlo primero.'}</Text>
  </TouchableOpacity>;
}

function PhotoSystemError() {
  return <View style={styles.photoSystemError}>
    <MaterialIcons name="error-outline" size={31} color="#9c7182" />
    <Text style={styles.photoSystemErrorTitle}>La última foto está fallando</Text>
    <Text style={styles.photoSystemErrorText}>Parece que esta parte de la ruta se habilitará cuando Aurora revise el premio adelantado.</Text>
  </View>;
}

function FloresConnector() {
  return <View pointerEvents="none" style={styles.floresConnector}><MaterialIcons name="local-florist" size={23} color="#c9638d" /><View style={styles.floresConnectorLine} /><MaterialIcons name="photo-camera" size={14} color="#b06b8d" /></View>;
}

function FinalJourney({ propiaFoto, fotoPareja, parejaUid, uid, nombrePareja, onCamera, onGallery, onRate, reclamado, esAurora, onClaim }) {
  const miCalificacion = fotoPareja?.calificaciones?.[uid] || null;
  const bloqueoTexto = esAurora ? 'Primero abrí tu mensaje del futuro.' : 'Esperando que Aurora abra su mensaje.';
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recorridoScrollContent}>
    <View style={styles.introSpacerStart} /><FinalIntro /><SwipeCue /><View style={styles.routeGuideGap} />
    <FloresRewardCard reclamado={reclamado} esAurora={esAurora} onPress={esAurora ? () => onClaim(reclamado) : undefined} />
    <View style={styles.afterPartnerGap} />
    {!reclamado ? <PhotoSystemError /> : <><FloresConnector /><BusPhotoCard propio variante="flores" icono="local-florist" tituloPropio="Las flores de Auro" foto={propiaFoto} calificacionRecibida={propiaFoto?.calificaciones?.[parejaUid]} onCamera={onCamera} onGallery={onGallery} nombrePareja={nombrePareja} bloqueado={!reclamado} textoBloqueado={bloqueoTexto} /><FloresConnector /><BusPhotoCard variante="flores" tituloPareja={`Las flores de ${nombrePareja}`} foto={fotoPareja} calificacion={miCalificacion} onRate={onRate} nombrePareja={nombrePareja} /></>}
    <View style={styles.introSpacerEnd} />
  </ScrollView>;
}

function RecorridoJourney({ propiaFoto, fotoPareja, parejaUid, uid, nombrePareja, onCamera, onGallery, onRate, recompensaBloqueada, onReward, previewReward, recompensaReclamada }) {
  const miCalificacion = fotoPareja?.calificaciones?.[uid] || null;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recorridoScrollContent}>
    <View style={styles.introSpacerStart} /><RecorridoIntro /><View style={styles.beforeGuideGap} /><SwipeCue colectivo /><View style={styles.routeGuideGap} />
    <BusPhotoCard propio foto={propiaFoto} calificacionRecibida={propiaFoto?.calificaciones?.[parejaUid]} onCamera={onCamera} onGallery={onGallery} nombrePareja={nombrePareja} />
    <BusConnector />
    <BusPhotoCard foto={fotoPareja} calificacion={miCalificacion} onRate={onRate} nombrePareja={nombrePareja} />
    <View style={styles.afterPartnerGap} />
    <SwipeCue /><GomitasRewardCard bloqueado={recompensaBloqueada} reclamada={recompensaReclamada} preview={previewReward} onPress={onReward} />
    <View style={styles.introSpacerEnd} />
  </ScrollView>;
}

function RouteOverview({ checklist, uid, parejaUid, onToggleChecklist, guardandoChecklist, checklistBloqueado }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.introScrollContent}>
      <View style={styles.introSpacerStart} />
      <View style={styles.introCard}>
        <View style={styles.introTop}>
          <View style={styles.introHeart}><MaterialIcons name="favorite" size={28} color="#fff8fb" /></View>
          <View style={styles.introTopCopy}><Text style={styles.introEyebrow}>UNA SALIDA PARA RECORDAR</Text><Text style={styles.introTitle}>Un día con Aurora</Text></View>
        </View>
        <Text style={styles.introDescription}>Esta ruta convierte cada parada en un recuerdo. En cada pestaña vas a encontrar un momento para fotografiar, guardar y volver a mirar juntos.</Text>
        <View style={styles.introSteps}>
          <View style={styles.introStep}><MaterialIcons name="photo-camera" size={18} color="#a95f7d" /><Text style={styles.introStepText}>Sacá o subí una foto</Text></View>
          <View style={styles.introStep}><MaterialIcons name="check-circle" size={18} color="#8aa56f" /><Text style={styles.introStepText}>Confirmá el recuerdo</Text></View>
          <View style={styles.introStep}><MaterialIcons name="card-giftcard" size={18} color="#bc8847" /><Text style={styles.introStepText}>Descubrí cada detalle</Text></View>
        </View>
      </View>
      <SwipeCue />
      <ChecklistCard checklist={checklist} uid={uid} parejaUid={parejaUid} onToggle={onToggleChecklist} guardando={guardandoChecklist} bloqueado={checklistBloqueado} />
      <View style={styles.introSpacerEnd} />
    </ScrollView>
  );
}

function UpcomingMeal() {
  return (
    <View style={styles.upcomingCard}>
      <View style={styles.upcomingIcon}><MaterialIcons name="restaurant" size={31} color="#b87852" /></View>
      <Text style={styles.upcomingEyebrow}>PRÓXIMA PARADA</Text>
      <Text style={styles.upcomingTitle}>La comida queda a elegir</Text>
      <Text style={styles.upcomingText}>Cuando decidan dónde comer, agregamos ese momento a la ruta para que también tenga su foto y recuerdo.</Text>
    </View>
  );
}

export default function Rutas({ navigation }) {
  const [activeTab, setActiveTab] = useState('principal');
  const [progressById, setProgressById] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parejaUid, setParejaUid] = useState(null);
  const [fotoParejaColectivo, setFotoParejaColectivo] = useState(null);
  const [fotoParejaObelisco, setFotoParejaObelisco] = useState(null);
  const [fotoParejaLavalle, setFotoParejaLavalle] = useState(null);
  const [fotoParejaComida, setFotoParejaComida] = useState(null);
  const [fotoParejaFlores, setFotoParejaFlores] = useState(null);
  const [recompensaFloresPropia, setRecompensaFloresPropia] = useState(false);
  const [parejaNombre, setParejaNombre] = useState('Auro');
  const [checklist, setChecklist] = useState({});
  const [guardandoChecklist, setGuardandoChecklist] = useState(false);
  const [recompensaVisible, setRecompensaVisible] = useState(false);
  const [recompensaActiva, setRecompensaActiva] = useState('gomitas');
  const [eventoTerminadoVisible, setEventoTerminadoVisible] = useState(false);

  const loadProgress = useCallback(async () => {
    const user = auth.currentUser;
    if (!user) { setLoading(false); return; }
    try {
      const snapshot = await getDocs(collection(db, 'usuarios', user.uid, 'rutas'));
      const nextProgress = {};
      snapshot.forEach(routeDoc => {
        const data = routeDoc.data() || {};
        if (data.estado === 'completado') nextProgress[routeDoc.id] = data;
      });
      setProgressById(nextProgress);
    } catch (error) {
      console.warn('[Rutas] No se pudo cargar el progreso:', error?.message || error);
      notify('error', 'No pudimos cargar tus recuerdos. Revisá tu conexión.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadProgress(); }, [loadProgress]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    const unsubUsuario = onSnapshot(doc(db, 'usuarios', uid), snapshot => setParejaUid(snapshot.data()?.pareja || null), () => setParejaUid(null));
    const unsubChecklist = onSnapshot(doc(db, 'usuarios', uid, 'rutas', 'checklist-hoy'), snapshot => setChecklist(snapshot.data() || {}), () => setChecklist({}));
    return () => { unsubUsuario(); unsubChecklist(); };
  }, []);

  useEffect(() => {
    if (!parejaUid) { setFotoParejaColectivo(null); setFotoParejaObelisco(null); setFotoParejaLavalle(null); setFotoParejaComida(null); setFotoParejaFlores(null); return undefined; }
    const unsubPareja = onSnapshot(doc(db, 'usuarios', parejaUid), snapshot => {
      const data = snapshot.data() || {};
      setParejaNombre(data.nombre || data.name || 'Auro');
    }, () => setParejaNombre('Auro'));
    const unsubFoto = onSnapshot(doc(db, 'usuarios', parejaUid, 'rutas', 'colectivo'), snapshot => setFotoParejaColectivo(snapshot.data() || null), () => setFotoParejaColectivo(null));
    const unsubObelisco = onSnapshot(doc(db, 'usuarios', parejaUid, 'rutas', 'obelisco'), snapshot => setFotoParejaObelisco(snapshot.data() || null), () => setFotoParejaObelisco(null));
    const unsubLavalle = onSnapshot(doc(db, 'usuarios', parejaUid, 'rutas', 'lavalle'), snapshot => setFotoParejaLavalle(snapshot.data() || null), () => setFotoParejaLavalle(null));
    const unsubComida = onSnapshot(doc(db, 'usuarios', parejaUid, 'rutas', 'comida'), snapshot => setFotoParejaComida(snapshot.data() || null), () => setFotoParejaComida(null));
    const unsubFlores = onSnapshot(doc(db, 'usuarios', parejaUid, 'rutas', 'flores'), snapshot => setFotoParejaFlores(snapshot.data() || null), () => setFotoParejaFlores(null));
    return () => { unsubPareja(); unsubFoto(); unsubObelisco(); unsubLavalle(); unsubComida(); unsubFlores(); };
  }, [parejaUid]);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return undefined;
    const suscribirPaso = pasoId => onSnapshot(doc(db, 'usuarios', uid, 'rutas', pasoId), snapshot => {
      const data = snapshot.data();
      if (data?.estado === 'completado') setProgressById(current => ({ ...current, [pasoId]: data }));
    });
    const unsubColectivo = suscribirPaso('colectivo');
    const unsubObelisco = suscribirPaso('obelisco');
    const unsubLavalle = suscribirPaso('lavalle');
    const unsubComida = suscribirPaso('comida');
    const unsubFlores = onSnapshot(doc(db, 'usuarios', uid, 'rutas', 'flores'), snapshot => {
      const data = snapshot.data() || null;
      setRecompensaFloresPropia(Boolean(data?.recompensaFloresReclamada));
      if (data?.estado === 'completado') setProgressById(current => ({ ...current, flores: data }));
    });
    return () => { unsubColectivo(); unsubObelisco(); unsubLavalle(); unsubComida(); unsubFlores(); };
  }, []);

  const completedCount = Object.keys(progressById).length;
  const currentTab = RUTA_TABS.find(tab => tab.id === activeTab) || RUTA_TABS[0];
  const visibleSteps = useMemo(() => currentTab.ids.map(id => RUTA_PRINCIPAL.find(step => step.id === id)).filter(Boolean), [currentTab]);
  const completedSteps = useMemo(() => RUTA_PRINCIPAL.filter(step => progressById[step.id]), [progressById]);
  const uidChecklist = auth.currentUser?.uid;
  const eventoTerminado = Boolean(progressById.flores?.eventoTerminado || fotoParejaFlores?.eventoTerminado);
  const checklistCompleto = Boolean(uidChecklist && parejaUid) && CHECKLIST_HOY.every(item => {
    const marcas = checklist?.items?.[item.id]?.marcas || {};
    return normalizarMarca(marcas[uidChecklist])?.estado === 'confirmado' && normalizarMarca(marcas[parejaUid])?.estado === 'confirmado';
  });

  const isUnlocked = step => {
    const index = RUTA_PRINCIPAL.findIndex(item => item.id === step.id);
    return index === 0 || Boolean(progressById[RUTA_PRINCIPAL[index - 1].id]);
  };

  const choosePhoto = async (step, source) => {
    if (eventoTerminado) { notify('info', 'La ruta ya terminó: tus recuerdos quedaron guardados.'); return; }
    try {
      const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { notify('error', source === 'camera' ? 'Necesitamos permiso para abrir la cámara.' : 'Necesitamos permiso para elegir una foto.'); return; }
      const result = source === 'camera'
        ? await ImagePicker.launchCameraAsync({ quality: 0.86, allowsEditing: false, mediaTypes: ['images'] })
        : await ImagePicker.launchImageLibraryAsync({ quality: 0.86, allowsEditing: false, mediaTypes: ['images'] });
      if (!result.canceled && result.assets?.[0]?.uri) setSelectedPhoto({ step, uri: result.assets[0].uri });
    } catch (error) {
      console.warn('[Rutas] Error al elegir foto:', error?.message || error);
      notify('error', 'No pudimos abrir tus fotos. Intentá de nuevo.');
    }
  };

  const confirmPhoto = async () => {
    const user = auth.currentUser;
    if (!user || !selectedPhoto || uploading) return;
    const { step, uri } = selectedPhoto;
    setUploading(true); setUploadProgress(0);
    try {
      const blob = await (await fetch(uri)).blob();
      const extension = getPhotoExtension(uri);
      const storagePath = `rutas/${user.uid}/${step.id}/${Date.now()}.${extension}`;
      const uploadTask = uploadBytesResumable(ref(storage, storagePath), blob, { contentType: `image/${extension === 'jpg' ? 'jpeg' : extension}`, customMetadata: { ruta: step.id, usuario: user.uid } });
      const fotoUrl = await new Promise((resolve, reject) => uploadTask.on('state_changed', snapshot => setUploadProgress(snapshot.totalBytes ? snapshot.bytesTransferred / snapshot.totalBytes : 0), reject, async () => {
        try { resolve(await getDownloadURL(uploadTask.snapshot.ref)); } catch (error) { reject(error); }
      }));
      const savedData = { pasoId: step.id, titulo: step.titulo, lugar: step.lugar, recompensa: step.recompensa, estado: 'completado', fotoUrl, storagePath, actualizadoEn: serverTimestamp() };
      await setDoc(doc(db, 'usuarios', user.uid, 'rutas', step.id), savedData, { merge: true });
      setProgressById(current => ({ ...current, [step.id]: { ...savedData, actualizadoEn: new Date(), fotoUrl } }));
      setSelectedPhoto(null); notify('success', `Recuerdo guardado: ${step.titulo}`);
      if (step.id === 'flores' && user.email?.toLowerCase() === 'auro@gmail.com') {
        const eventoTerminadoAhora = await runTransaction(db, async transaction => {
          const rutaRef = doc(db, 'usuarios', user.uid, 'rutas', 'flores');
          const rutaSnap = await transaction.get(rutaRef);
          if (rutaSnap.data()?.eventoTerminado) return false;
          transaction.set(rutaRef, { eventoTerminado: true, eventoTerminadoEn: serverTimestamp(), premioFinalDiamantes: 100, actualizadoEn: serverTimestamp() }, { merge: true });
          return true;
        });
        if (eventoTerminadoAhora) setEventoTerminadoVisible(true);
      }
    } catch (error) {
      console.warn('[Rutas] Error al guardar foto:', error?.message || error);
      notify('error', 'No pudimos guardar la foto. Intentá de nuevo.');
    } finally { setUploading(false); setUploadProgress(0); }
  };

  const toggleChecklist = async itemId => {
    const uid = auth.currentUser?.uid;
    if (!uid || guardandoChecklist || checklistCompleto || eventoTerminado) return;
    setGuardandoChecklist(true);
    try {
      await runTransaction(db, async transaction => {
        const userRef = doc(db, 'usuarios', uid);
        const userSnap = await transaction.get(userRef);
        const pareja = userSnap.data()?.pareja || null;
        const checklistRef = doc(db, 'usuarios', uid, 'rutas', 'checklist-hoy');
        const checklistSnap = await transaction.get(checklistRef);
        const current = checklistSnap.data() || {};
        const items = { ...(current.items || {}) };
        const item = { ...(items[itemId] || {}) };
        const marcas = { ...(item.marcas || {}) };
        const estadoActual = normalizarMarca(marcas[uid])?.estado;
        if (!estadoActual || estadoActual === 'no_confirmado') {
          marcas[uid] = { estado: 'confirmado', en: new Date() };
        } else if (estadoActual === 'confirmado') {
          marcas[uid] = { estado: 'no_confirmado', en: new Date() };
        }
        items[itemId] = { marcas };
        const next = { participantes: [uid, pareja].filter(Boolean), items, actualizadoEn: serverTimestamp() };
        transaction.set(checklistRef, next, { merge: true });
        if (pareja) transaction.set(doc(db, 'usuarios', pareja, 'rutas', 'checklist-hoy'), next, { merge: true });
      });
    } catch (error) {
      console.warn('[Rutas] Error actualizando checklist:', error?.message || error);
      notify('error', 'No pudimos actualizar el checklist.');
    } finally { setGuardandoChecklist(false); }
  };

  const calificarFotoPareja = async (pasoId, fotoPareja, estrellas) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !parejaUid || !fotoPareja?.fotoUrl || eventoTerminado) return;
    try {
      await setDoc(doc(db, 'usuarios', parejaUid, 'rutas', pasoId), {
        calificaciones: { [uid]: { estrellas, calificadaEn: new Date() } },
        actualizadoEn: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.warn('[Rutas] Error calificando foto:', error?.message || error);
      notify('error', 'No pudimos guardar tu calificación.');
    }
  };

  const reclamarFlores = async (yaReclamado = false) => {
    const user = auth.currentUser;
    if (!user || user.email?.toLowerCase() !== 'auro@gmail.com') return;
    if (yaReclamado) {
      setRecompensaActiva('flores');
      setRecompensaVisible(true);
      return;
    }
    try {
      await setDoc(doc(db, 'usuarios', user.uid, 'rutas', 'flores'), {
        recompensaFloresReclamada: true,
        recompensaFloresReclamadaEn: serverTimestamp(),
        actualizadoEn: serverTimestamp(),
      }, { merge: true });
      setRecompensaFloresPropia(true);
      setRecompensaActiva('flores');
      setRecompensaVisible(true);
    } catch (error) {
      console.warn('[Rutas] Error reclamando el mensaje de flores:', error?.message || error);
      notify('error', 'No pudimos abrir el mensaje. Intentá de nuevo.');
    }
  };

  const reclamarRecompensa = async (pasoId, tipo, yaReclamada = false) => {
    const user = auth.currentUser;
    if (!user || user.email?.toLowerCase() !== 'auro@gmail.com') return;
    if (!yaReclamada) {
      try {
        await setDoc(doc(db, 'usuarios', user.uid, 'rutas', pasoId), {
          recompensaReclamada: true,
          recompensaReclamadaEn: serverTimestamp(),
          actualizadoEn: serverTimestamp(),
        }, { merge: true });
      } catch (error) {
        console.warn('[Rutas] Error reclamando recompensa:', error?.message || error);
        notify('error', 'No pudimos reclamar el premio. Intentá de nuevo.');
        return;
      }
    }
    setRecompensaActiva(tipo);
    setRecompensaVisible(true);
  };

  const reclamarPremioFinal = async () => {
    const user = auth.currentUser;
    if (!user || user.email?.toLowerCase() !== 'auro@gmail.com') return;
    try {
      const reclamadoAhora = await runTransaction(db, async transaction => {
        const userRef = doc(db, 'usuarios', user.uid);
        const rutaRef = doc(db, 'usuarios', user.uid, 'rutas', 'flores');
        const [userSnap, rutaSnap] = await Promise.all([transaction.get(userRef), transaction.get(rutaRef)]);
        const ruta = rutaSnap.data() || {};
        if (!ruta.eventoTerminado || ruta.premioFinalReclamado) return false;
        const data = userSnap.data() || {};
        const diamantesActuales = Math.max(0, Number(data.diamantes ?? data.diamante) || 0);
        transaction.update(userRef, { diamantes: diamantesActuales + 100 });
        transaction.set(rutaRef, { premioFinalReclamado: true, premioFinalReclamadoEn: serverTimestamp(), actualizadoEn: serverTimestamp() }, { merge: true });
        return true;
      });
      if (reclamadoAhora) notify('success', '¡100 diamantes ya son tuyos!');
      setEventoTerminadoVisible(false);
    } catch (error) {
      console.warn('[Rutas] Error reclamando premio final:', error?.message || error);
      notify('error', 'No pudimos entregar tus diamantes. Intentá de nuevo.');
    }
  };

  const salir = () => {
    if (navigation?.goBack) {
      navigation.goBack();
      return;
    }
    navigation?.navigate?.('main');
  };

  const uidActual = auth.currentUser?.uid;
  const miFotoColectivo = progressById.colectivo || null;
  const miFotoObelisco = progressById.obelisco || null;
  const miFotoLavalle = progressById.lavalle || null;
  const miFotoComida = progressById.comida || null;
  const miFotoFlores = progressById.flores || null;
  const ambosCalificaron = Boolean(miFotoColectivo?.calificaciones?.[parejaUid] && fotoParejaColectivo?.calificaciones?.[uidActual]);
  const ambosCalificaronTorre = Boolean(miFotoObelisco?.calificaciones?.[parejaUid] && fotoParejaObelisco?.calificaciones?.[uidActual]);
  const ambosCalificaronPaseo = Boolean(miFotoLavalle?.calificaciones?.[parejaUid] && fotoParejaLavalle?.calificaciones?.[uidActual]);
  const ambosCalificaronComida = Boolean(miFotoComida?.calificaciones?.[parejaUid] && fotoParejaComida?.calificaciones?.[uidActual]);
  const esAurora = auth.currentUser?.email?.toLowerCase() === 'auro@gmail.com';
  const recompensaDesbloqueada = esAurora && ambosCalificaron;
  const recompensaTorreDesbloqueada = esAurora && ambosCalificaronTorre;
  const recompensaPaseoDesbloqueada = esAurora && ambosCalificaronPaseo;
  const recompensaComidaDesbloqueada = esAurora && ambosCalificaronComida;
  const recompensaRecorridoReclamada = Boolean(miFotoColectivo?.recompensaReclamada || fotoParejaColectivo?.recompensaReclamada);
  const recompensaTorreReclamada = Boolean(miFotoObelisco?.recompensaReclamada || fotoParejaObelisco?.recompensaReclamada);
  const recompensaPaseoReclamada = Boolean(miFotoLavalle?.recompensaReclamada || fotoParejaLavalle?.recompensaReclamada);
  const recompensaComidaReclamada = Boolean(miFotoComida?.recompensaReclamada || fotoParejaComida?.recompensaReclamada);
  const floresReclamadas = recompensaFloresPropia || Boolean(fotoParejaFlores?.recompensaFloresReclamada);
  const pasosDisponibles = { recorrido: checklistCompleto, torre: recompensaRecorridoReclamada, paseo: recompensaTorreReclamada, comida: recompensaPaseoReclamada, fin: recompensaComidaReclamada };
  const tabsBloqueadas = Object.fromEntries(RUTA_TABS.filter(tab => tab.id !== 'principal' && !pasosDisponibles[tab.id]).map(tab => [tab.id, true]));
  const proximaPestanaId = RUTA_TABS.find(tab => tab.id !== 'principal' && tabsBloqueadas[tab.id])?.id || null;

  return (
    <View style={styles.root}>
      <StatusBar hidden />
      <View style={styles.background}>
        <RutaBackground />
        <View style={styles.backgroundShade} />
        <TabButtons onExit={salir} customAddButton={<View />} />

        <View style={styles.content}>
          <TabSelector tabs={RUTA_TABS} activeId={activeTab} onChange={setActiveTab} bloqueadas={tabsBloqueadas} proximaId={proximaPestanaId} />

          {currentTab.tipo === 'resumen' ? (
            <View style={styles.principalArea}>
              {loading ? <View style={styles.loadingBox}><ActivityIndicator color="#ffe09a" /><Text style={styles.loadingText}>Cargando ruta…</Text></View> : <RouteOverview checklist={checklist} uid={auth.currentUser?.uid} parejaUid={parejaUid} onToggleChecklist={toggleChecklist} guardandoChecklist={guardandoChecklist} checklistBloqueado={checklistCompleto || eventoTerminado} />}
            </View>
          ) : currentTab.id === 'recorrido' ? (
            <View style={styles.recorridoArea}>
              {loading ? <View style={styles.loadingBox}><ActivityIndicator color="#ffe09a" /><Text style={styles.loadingText}>Cargando ruta…</Text></View> : <RecorridoJourney propiaFoto={miFotoColectivo} fotoPareja={fotoParejaColectivo} parejaUid={parejaUid} uid={uidActual} nombrePareja={parejaNombre} onCamera={() => choosePhoto(RUTA_PRINCIPAL[0], 'camera')} onGallery={() => choosePhoto(RUTA_PRINCIPAL[0], 'gallery')} onRate={estrellas => calificarFotoPareja('colectivo', fotoParejaColectivo, estrellas)} recompensaBloqueada={!recompensaDesbloqueada} recompensaReclamada={recompensaRecorridoReclamada} previewReward={false} onReward={recompensaDesbloqueada ? () => reclamarRecompensa('colectivo', 'gomitas', recompensaRecorridoReclamada) : undefined} />}
            </View>
          ) : currentTab.id === 'torre' ? (
            <View style={styles.recorridoArea}>
              {loading ? <View style={styles.loadingBox}><ActivityIndicator color="#ffe09a" /><Text style={styles.loadingText}>Cargando torre…</Text></View> : <TorreJourney propiaFoto={miFotoObelisco} fotoPareja={fotoParejaObelisco} parejaUid={parejaUid} uid={uidActual} nombrePareja={parejaNombre} onCamera={() => choosePhoto(RUTA_PRINCIPAL[2], 'camera')} onGallery={() => choosePhoto(RUTA_PRINCIPAL[2], 'gallery')} onRate={estrellas => calificarFotoPareja('obelisco', fotoParejaObelisco, estrellas)} recompensaBloqueada={!recompensaTorreDesbloqueada} recompensaReclamada={recompensaTorreReclamada} onReward={recompensaTorreDesbloqueada ? () => reclamarRecompensa('obelisco', 'beso', recompensaTorreReclamada) : undefined} />}
            </View>
          ) : currentTab.id === 'paseo' ? (
            <View style={styles.recorridoArea}>
              {loading ? <View style={styles.loadingBox}><ActivityIndicator color="#ffe09a" /><Text style={styles.loadingText}>Cargando paseo…</Text></View> : <PaseoJourney propiaFoto={miFotoLavalle} fotoPareja={fotoParejaLavalle} parejaUid={parejaUid} uid={uidActual} nombrePareja={parejaNombre} onCamera={() => choosePhoto(RUTA_PRINCIPAL[3], 'camera')} onGallery={() => choosePhoto(RUTA_PRINCIPAL[3], 'gallery')} onRate={estrellas => calificarFotoPareja('lavalle', fotoParejaLavalle, estrellas)} recompensaBloqueada={!recompensaPaseoDesbloqueada} recompensaReclamada={recompensaPaseoReclamada} onReward={recompensaPaseoDesbloqueada ? () => reclamarRecompensa('lavalle', 'paseo', recompensaPaseoReclamada) : undefined} />}
            </View>
          ) : currentTab.id === 'comida' ? (
            <View style={styles.recorridoArea}>
              {loading ? <View style={styles.loadingBox}><ActivityIndicator color="#ffe09a" /><Text style={styles.loadingText}>Cargando comida…</Text></View> : <ComidaJourney propiaFoto={miFotoComida} fotoPareja={fotoParejaComida} parejaUid={parejaUid} uid={uidActual} nombrePareja={parejaNombre} onCamera={() => choosePhoto(RUTA_PRINCIPAL[4], 'camera')} onGallery={() => choosePhoto(RUTA_PRINCIPAL[4], 'gallery')} onRate={estrellas => calificarFotoPareja('comida', fotoParejaComida, estrellas)} recompensaBloqueada={!recompensaComidaDesbloqueada} recompensaReclamada={recompensaComidaReclamada} onReward={recompensaComidaDesbloqueada ? () => reclamarRecompensa('comida', 'comida', recompensaComidaReclamada) : undefined} />}
            </View>
          ) : currentTab.id === 'fin' ? (
            <View style={styles.recorridoArea}>
              {loading ? <View style={styles.loadingBox}><ActivityIndicator color="#ffe09a" /><Text style={styles.loadingText}>Cargando señal…</Text></View> : <FinalJourney propiaFoto={miFotoFlores} fotoPareja={fotoParejaFlores} parejaUid={parejaUid} uid={uidActual} nombrePareja={parejaNombre} esAurora={esAurora} reclamado={floresReclamadas} onClaim={reclamarFlores} onCamera={() => choosePhoto(RUTA_PRINCIPAL[5], 'camera')} onGallery={() => choosePhoto(RUTA_PRINCIPAL[5], 'gallery')} onRate={estrellas => calificarFotoPareja('flores', fotoParejaFlores, estrellas)} />}
            </View>
          ) : <View style={styles.sectionPanel}>
            <View style={styles.panelHeading}>
              <View style={styles.panelHeadingTitle}><Text style={styles.panelEyebrow}>{currentTab.tipo === 'recuerdos' ? 'ÁLBUM DEL DÍA' : currentTab.tipo === 'proximamente' ? 'SIGUIENTE ESCENA' : 'ETAPAS DE LA RUTA'}</Text><Text style={styles.panelTitle}>{currentTab.tipo === 'recuerdos' ? 'Lo que ya vivimos' : currentTab.label}</Text></View>
              <Text style={styles.panelHint}>{currentTab.tipo === 'recuerdos' ? 'Tus fotos confirmadas' : currentTab.tipo === 'proximamente' ? 'Se completa después' : 'Deslizá para ver más'}</Text>
            </View>
            {loading ? <View style={styles.loadingBox}><ActivityIndicator color="#ffe09a" /><Text style={styles.loadingText}>Cargando ruta…</Text></View> : currentTab.tipo === 'proximamente' ? (
              <UpcomingMeal />
            ) : currentTab.tipo === 'recuerdos' ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsContent}>{completedSteps.length ? completedSteps.map(step => <StepCard key={step.id} step={step} index={RUTA_PRINCIPAL.indexOf(step)} completed unlocked saved={progressById[step.id]} onTakePhoto={() => {}} onChoosePhoto={() => {}} />) : <EmptyMemories />}</ScrollView>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsContent}>{visibleSteps.map(step => { const index = RUTA_PRINCIPAL.indexOf(step); return <StepCard key={step.id} step={step} index={index} completed={Boolean(progressById[step.id])} unlocked={isUnlocked(step)} saved={progressById[step.id]} onTakePhoto={item => choosePhoto(item, 'camera')} onChoosePhoto={item => choosePhoto(item, 'gallery')} />; })}</ScrollView>
            )}
          </View>}
        </View>
      </View>

      <Modal visible={Boolean(selectedPhoto)} transparent animationType="fade" onRequestClose={() => !uploading && setSelectedPhoto(null)}>
        <View style={styles.modalBackdrop}><View style={styles.previewModal}>
          <View style={styles.modalTopRow}><View><Text style={styles.modalEyebrow}>CONFIRMAR RECUERDO</Text><Text style={styles.modalTitle}>{selectedPhoto?.step?.titulo}</Text></View>{!uploading && <TouchableOpacity style={styles.modalClose} onPress={() => setSelectedPhoto(null)}><MaterialIcons name="close" size={19} color="#76576d" /></TouchableOpacity>}</View>
          {selectedPhoto?.uri && <Image source={{ uri: selectedPhoto.uri }} style={styles.previewImage} contentFit="cover" />}
          <Text style={styles.previewHint}>¿Esta es la foto que querés guardar para este momento?</Text>
          {uploading ? <View style={styles.uploadingBox}><ActivityIndicator color="#9c5cae" /><Text style={styles.uploadingText}>Guardando {Math.round(uploadProgress * 100)}%…</Text></View> : <View style={styles.modalActions}><TouchableOpacity style={styles.changeButton} onPress={() => setSelectedPhoto(null)}><Text style={styles.changeButtonText}>Elegir otra</Text></TouchableOpacity><TouchableOpacity style={styles.confirmButton} onPress={confirmPhoto}><MaterialIcons name="check" size={17} color="#fff" /><Text style={styles.confirmButtonText}>Confirmar</Text></TouchableOpacity></View>}
        </View></View>
      </Modal>
      <Modal visible={recompensaVisible} transparent animationType="fade" onRequestClose={() => setRecompensaVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.rewardModal}><MaterialIcons name={recompensaActiva === 'beso' ? 'favorite' : recompensaActiva === 'paseo' ? 'shopping-bag' : recompensaActiva === 'flores' ? 'local-florist' : 'card-giftcard'} size={52} color="#c66a90" /><Text style={styles.rewardModalEyebrow}>{recompensaActiva === 'flores' ? 'MENSAJE ENVIADO DESDE MAÑANA' : '¡FELIZ CUMPLEAÑOS, AURO!'}</Text><Text style={styles.rewardModalTitle}>{recompensaActiva === 'beso' ? 'Te ganaste un piquito' : recompensaActiva === 'paseo' ? 'Elegí un caprichito' : recompensaActiva === 'flores' ? 'Sí, te gustaron las flores' : 'Tu pareja te debe algo rico y gominoso'}</Text><Text style={styles.rewardModalText}>{recompensaActiva === 'beso' ? 'Un piquito lindo, rápido y con discreción… que estamos en público, por favor. Nada de escenas de novela frente al Obelisco 😳' : recompensaActiva === 'paseo' ? 'Por esta vez podés elegir una sola cosita que te guste. Elegila antes de que el paseo siga su camino… y portate bien: ni la más cara de todo el lugar, ni una servilleta de premio 😌' : recompensaActiva === 'flores' ? 'Si estás leyendo esto, las flores ya llegaron a vos. Ojalá te hayan sacado esa sonrisa que Leo siempre quiere volver a ver. Ahora dejate sacar una foto con ellas: Leo la necesita para terminar la aventura… y para guardar este momento para siempre. 🌷' : 'Por completar el primer recuerdo y mirarse las fotos con cariño, te ganaste unas gomitas.'}</Text><TouchableOpacity style={styles.rewardModalButton} onPress={() => setRecompensaVisible(false)}><Text style={styles.rewardModalButtonText}>ENTENDIDO</Text></TouchableOpacity></View></View>
      </Modal>
      <Modal visible={eventoTerminadoVisible} transparent animationType="fade" onRequestClose={() => setEventoTerminadoVisible(false)}>
        <View style={styles.modalBackdrop}><View style={styles.eventCompleteModal}><View style={styles.eventCompleteSpark}><MaterialIcons name="auto-awesome" size={34} color="#fffaf0" /></View><Text style={styles.rewardModalEyebrow}>RUTA DE AURORA</Text><Text style={styles.eventCompleteTitle}>Evento terminado</Text><Text style={styles.eventCompleteText}>Guardaron cada escena, se encontraron en el camino y dejaron un día entero convertido en recuerdos. Que estas fotos siempre les devuelvan un poquito de esta aventura.</Text><View style={styles.diamondReward}><MaterialIcons name="diamond" size={24} color="#32b9d5" /><Text style={styles.diamondRewardText}>+100 DIAMANTES</Text></View><TouchableOpacity style={styles.rewardModalButton} onPress={reclamarPremioFinal}><Text style={styles.rewardModalButtonText}>RECLAMAR PREMIO</Text></TouchableOpacity></View></View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#e7e8e8' }, background: { flex: 1, overflow: 'hidden' }, backgroundShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255,255,255,0.08)' },
  content: { flex: 1, paddingTop: 56, paddingHorizontal: 18 },
  tabsScroller: { height: 35, flexGrow: 0, zIndex: 30 }, tabsContent: { minHeight: 35, alignItems: 'center', paddingHorizontal: 1, gap: 6 }, tab: { width: 78, height: 31, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#f8e1d8', borderWidth: 1, borderColor: '#c99894', shadowColor: '#32192b', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 3, elevation: 3 }, tabActive: { backgroundColor: '#77445f', borderColor: '#f3c879', shadowOpacity: 0.38, elevation: 7 }, tabLocked: { backgroundColor: '#443d43', borderColor: '#352f35', shadowOpacity: 0.06, elevation: 1 }, tabNextLocked: { backgroundColor: '#625861', borderColor: '#4d444c' }, tabText: { color: '#6f5360', fontSize: 7.3, fontWeight: '900', letterSpacing: 0.25 }, tabTextActive: { color: '#fff8e8' }, tabTextLocked: { color: '#9a8c93' }, tabTextNextLocked: { color: '#c8bbc1' },
  sectionPanel: { flex: 1, minHeight: 215, marginTop: 10, marginBottom: 18, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 11, borderRadius: 18, backgroundColor: 'rgba(255,247,230,0.9)', borderWidth: 1.5, borderColor: 'rgba(145,84,80,0.56)', shadowColor: '#2c1424', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8 }, panelHeading: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4 }, panelHeadingTitle: { flex: 1 }, panelEyebrow: { color: '#a26a44', fontSize: 8, fontWeight: '900', letterSpacing: 1.3 }, panelTitle: { color: '#573346', fontSize: 16, fontWeight: '900', marginTop: 1 }, panelHint: { color: '#a17b83', fontSize: 9, fontWeight: '700' }, cardsContent: { flexGrow: 1, alignItems: 'center', gap: 10, paddingHorizontal: 4, paddingVertical: 4 },
  principalArea: { flex: 1, minHeight: 215, marginTop: 10, marginBottom: 18 }, recorridoArea: { flex: 1, minHeight: 215, marginTop: 10, marginBottom: 18 },
  stepCard: { width: 218, minHeight: 178, padding: 10, borderRadius: 14, backgroundColor: '#fffaf2', borderWidth: 1, borderColor: '#e5c9b1', shadowColor: '#6e4650', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 4 }, stepCardLocked: { opacity: 0.62 }, stepCardCompleted: { borderColor: '#a6c897', backgroundColor: '#fbfff3' }, stepTopRow: { flexDirection: 'row', alignItems: 'center' }, stepNumber: { width: 27, height: 27, borderRadius: 9, alignItems: 'center', justifyContent: 'center' }, stepNumberText: { color: '#fff', fontSize: 11, fontWeight: '900' }, stepHeadCopy: { flex: 1, marginLeft: 7 }, stepLabel: { color: '#af7a57', fontSize: 7, fontWeight: '900', letterSpacing: 0.8 }, stepTitle: { color: '#553447', fontSize: 14, fontWeight: '900', marginTop: 1 }, stepPlace: { color: '#a17880', fontSize: 9, marginTop: 1 }, stepIcon: { width: 31, height: 31, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  stepIllustration: { height: 47, marginTop: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f3e3dc', borderWidth: 1, borderColor: '#ead1c7' }, illustrationText: { color: '#aa7f78', fontSize: 7, fontWeight: '900', letterSpacing: 0.8, marginTop: 1 }, savedPhoto: { width: '100%', height: 47, marginTop: 8, borderRadius: 10, backgroundColor: '#eaded8' }, stepDescription: { color: '#755d66', fontSize: 9.5, lineHeight: 13, minHeight: 27, marginTop: 7 }, rewardStrip: { height: 27, marginTop: 6, paddingHorizontal: 7, borderRadius: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: '#f8ead3', borderWidth: 1, borderColor: '#edd4ad' }, rewardTextWrap: { marginLeft: 6, flex: 1 }, rewardCaption: { color: '#b08058', fontSize: 6.5, fontWeight: '900', letterSpacing: 0.7 }, rewardText: { color: '#8c5e3f', fontSize: 9, fontWeight: '900', marginTop: -1 }, cardActions: { flexDirection: 'row', gap: 6, marginTop: 7 }, cameraButton: { flex: 1, height: 26, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#a45e79' }, cameraButtonText: { color: '#fff8ee', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 }, galleryButton: { width: 66, height: 26, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3, backgroundColor: '#f2dfdb', borderWidth: 1, borderColor: '#d9b9b8' }, galleryButtonText: { color: '#81505f', fontSize: 7.5, fontWeight: '900' }, savedStatus: { height: 25, marginTop: 7, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#e5f2db' }, savedStatusText: { color: '#6a9c6d', fontSize: 7.5, fontWeight: '900', letterSpacing: 0.5 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', minWidth: 260 }, loadingText: { color: '#896b73', fontSize: 10, marginTop: 7 }, emptyBox: { width: 280, height: 150, alignItems: 'center', justifyContent: 'center', borderRadius: 14, backgroundColor: '#f6e8e1', borderWidth: 1, borderColor: '#e5c8c3' }, emptyTitle: { color: '#70485b', fontSize: 13, fontWeight: '900', marginTop: 6 }, emptyText: { maxWidth: 190, color: '#a17880', fontSize: 9, lineHeight: 13, textAlign: 'center', marginTop: 3 },
  introScrollContent: { alignItems: 'center', gap: 12, paddingVertical: 4 }, introSpacerStart: { width: 34 }, introSpacerEnd: { width: 105 }, introCard: { width: 450, minHeight: 172, padding: 15, borderRadius: 17, backgroundColor: '#fffaf5', borderWidth: 1.5, borderColor: '#e5bdc6', shadowColor: '#704755', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.22, shadowRadius: 6, elevation: 5 }, introTop: { flexDirection: 'row', alignItems: 'center' }, introHeart: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ba6c8a', borderWidth: 1, borderColor: '#934964' }, introTopCopy: { flex: 1, marginLeft: 10 }, introEyebrow: { color: '#af7a57', fontSize: 7.2, fontWeight: '900', letterSpacing: 1 }, introTitle: { color: '#593347', fontSize: 18, fontWeight: '900', marginTop: 2 }, introDescription: { color: '#765d68', fontSize: 10, lineHeight: 14, marginTop: 11 }, introSteps: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }, introStep: { width: '31.5%', minHeight: 52, paddingHorizontal: 4, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f9ece6', borderWidth: 1, borderColor: '#ecd4ca' }, introStepText: { color: '#805f6c', fontSize: 7.2, lineHeight: 9, fontWeight: '800', textAlign: 'center', marginTop: 3 }, routeStartButton: { alignSelf: 'center', height: 28, marginTop: 9, paddingHorizontal: 14, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#a45e79', borderWidth: 1, borderColor: '#86465f' }, routeStartButtonText: { color: '#fff8fb', fontSize: 7.6, fontWeight: '900', letterSpacing: 0.6 },
  swipeCue: { width: 235, height: 82, alignItems: 'center', justifyContent: 'center' }, swipeCueText: { position: 'absolute', top: 0, color: '#93506f', fontSize: 7.8, fontWeight: '900', letterSpacing: 0.9, textShadowColor: '#fff7fa', textShadowRadius: 2 }, swipeBus: { position: 'absolute', left: 88, top: 22, width: 33, height: 25, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff3f7', borderWidth: 1, borderColor: '#dfaec0', transform: [{ rotate: '-8deg' }] }, busConnector: { width: 58, height: 66, alignItems: 'center', justifyContent: 'center' }, busConnectorLine: { width: 44, height: 1.5, marginVertical: 3, borderRadius: 1, backgroundColor: '#ca849f' },
  recorridoScrollContent: { alignItems: 'center', gap: 12, paddingVertical: 4 }, beforeGuideGap: { width: 24 }, routeGuideGap: { width: 70 }, afterPartnerGap: { width: 38 }, routeIntroCard: { width: 360, height: 185, padding: 16, borderRadius: 18, alignItems: 'center', backgroundColor: '#fff8f5', borderWidth: 1.5, borderColor: '#e4b8c8', shadowColor: '#704755', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 }, routeIntroBadge: { width: 46, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#b66b89', borderWidth: 1, borderColor: '#91475f' }, routeIntroEyebrow: { color: '#ad6682', fontSize: 7.5, fontWeight: '900', letterSpacing: 1.2, marginTop: 6 }, routeIntroTitle: { color: '#5f3849', fontSize: 17, fontWeight: '900', marginTop: 2 }, routeIntroText: { color: '#80646e', fontSize: 9.3, lineHeight: 13, textAlign: 'center', marginTop: 6 }, routeRiddle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: '#f6e4eb', borderWidth: 1, borderColor: '#ebc6d3' }, routeRiddleText: { color: '#a25d7b', fontSize: 12, fontWeight: '900', letterSpacing: 1 }, routeRiddleHint: { color: '#9b7884', fontSize: 7.2, fontWeight: '800' },
  towerIntroCard: { width: 360, height: 185, padding: 16, borderRadius: 28, alignItems: 'center', backgroundColor: '#f8f6ff', borderWidth: 1.5, borderColor: '#bcb2dd', shadowColor: '#514575', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 }, towerIntroBadge: { width: 46, height: 48, borderTopLeftRadius: 22, borderTopRightRadius: 22, borderBottomLeftRadius: 8, borderBottomRightRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#786fa7', borderWidth: 1, borderColor: '#5d5687' }, towerIntroTitle: { color: '#514572', fontSize: 17, fontWeight: '900', marginTop: 2 }, towerRiddle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: '#ebe8f8', borderWidth: 1, borderColor: '#d2cbed' }, towerRiddleText: { color: '#6e649c', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 }, towerPhotoCard: { backgroundColor: '#fbfaff', borderColor: '#bab2dc' }, towerPhotoCardPartner: { backgroundColor: '#f7f3ff', borderColor: '#9d92cb' }, towerPhotoEmpty: { backgroundColor: '#eeeafb', borderColor: '#d2cbed' }, towerConnector: { width: 58, height: 66, alignItems: 'center', justifyContent: 'center' }, towerConnectorSpark: { color: '#9e91d0', fontSize: 13, marginVertical: 1 },
  paseoIntroCard: { width: 360, height: 185, padding: 16, borderRadius: 22, alignItems: 'center', backgroundColor: '#fffaf4', borderWidth: 1.5, borderColor: '#e3c1a7', shadowColor: '#765343', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 }, paseoIntroBadge: { width: 48, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c18771', borderWidth: 1, borderColor: '#9e6255', transform: [{ rotate: '-3deg' }] }, paseoIntroTitle: { color: '#704a42', fontSize: 17, fontWeight: '900', marginTop: 2 }, paseoRiddle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: '#f8ebdd', borderWidth: 1, borderColor: '#ead1b8' }, paseoRiddleText: { color: '#a66c56', fontSize: 11, fontWeight: '900', letterSpacing: 0.35 }, paseoPhotoCard: { backgroundColor: '#fffaf4', borderColor: '#dfb69e' }, paseoPhotoCardPartner: { backgroundColor: '#fff7ed', borderColor: '#d29f81' }, paseoPhotoEmpty: { backgroundColor: '#f8eadb', borderColor: '#e5c9ae' }, paseoConnector: { width: 58, height: 66, alignItems: 'center', justifyContent: 'center' }, paseoConnectorLine: { width: 44, height: 1.5, marginVertical: 3, borderRadius: 1, backgroundColor: '#d4a080' },
  comidaIntroCard: { width: 360, height: 185, padding: 16, borderRadius: 24, alignItems: 'center', backgroundColor: '#fff8ef', borderWidth: 1.5, borderColor: '#e4bd91', shadowColor: '#795033', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 }, comidaIntroBadge: { width: 47, height: 45, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#c77b45', borderWidth: 1, borderColor: '#a65b37', transform: [{ rotate: '3deg' }] }, comidaIntroTitle: { color: '#74452e', fontSize: 17, fontWeight: '900', marginTop: 2 }, comidaRiddle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: '#f9ead7', borderWidth: 1, borderColor: '#ebcbab' }, comidaRiddleText: { color: '#ae6737', fontSize: 11, fontWeight: '900', letterSpacing: 0.35 }, comidaPhotoCard: { backgroundColor: '#fff9ef', borderColor: '#e0b587' }, comidaPhotoCardPartner: { backgroundColor: '#fff5e6', borderColor: '#d49c69' }, comidaPhotoEmpty: { backgroundColor: '#f9e7d2', borderColor: '#e7c5a0' }, comidaConnector: { width: 58, height: 66, alignItems: 'center', justifyContent: 'center' }, comidaConnectorLine: { width: 44, height: 1.5, marginVertical: 3, borderRadius: 1, backgroundColor: '#d39c70' },
  finalIntroCard: { width: 360, height: 185, padding: 16, borderRadius: 23, alignItems: 'center', backgroundColor: '#fff7fb', borderWidth: 1.5, borderColor: '#d7a5bc', shadowColor: '#704255', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 }, finalIntroBadge: { width: 47, height: 47, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: '#a85b7f', borderWidth: 1, borderColor: '#86415f' }, finalQuestion: { color: '#fff9fc', fontSize: 29, lineHeight: 32, fontWeight: '900' }, finalIntroTitle: { color: '#663b50', fontSize: 17, fontWeight: '900', marginTop: 2 }, finalRiddle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 9, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 9, backgroundColor: '#f5e3ec', borderWidth: 1, borderColor: '#e8c1d2' }, finalRiddleText: { color: '#a05578', fontSize: 10, fontWeight: '900', letterSpacing: 0.3 }, floresRewardCard: { width: 250, height: 166, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fff1f7', borderWidth: 1.5, borderColor: '#e3a8c3', shadowColor: '#89455f', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 7, elevation: 6 }, floresRewardCardLocked: { backgroundColor: '#f6eef2', borderColor: '#d0c0c7', shadowOpacity: 0.1 }, floresRewardGlow: { position: 'absolute', width: 166, height: 166, borderRadius: 83, backgroundColor: '#f6c9dd', opacity: 0.6, top: -63 }, photoSystemError: { width: 320, height: 150, paddingHorizontal: 32, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8eff3', borderWidth: 1.5, borderColor: '#d9c4cd', borderStyle: 'dashed' }, photoSystemErrorTitle: { color: '#795b69', fontSize: 14, fontWeight: '900', marginTop: 5 }, photoSystemErrorText: { color: '#9b7d88', fontSize: 8.6, lineHeight: 12, textAlign: 'center', marginTop: 4 }, floresConnector: { width: 58, height: 66, alignItems: 'center', justifyContent: 'center' }, floresConnectorLine: { width: 44, height: 1.5, marginVertical: 3, borderRadius: 1, backgroundColor: '#d38eab' }, floresPhotoCard: { backgroundColor: '#fff7fb', borderColor: '#dfadbf' }, floresPhotoCardPartner: { backgroundColor: '#fff2f8', borderColor: '#cf91ac' }, floresPhotoEmpty: { backgroundColor: '#f8e4ee', borderColor: '#e6bed0' },
  busPhotoCard: { width: 320, height: 205, padding: 12, borderRadius: 16, backgroundColor: '#fff8f4', borderWidth: 1.5, shadowColor: '#704755', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5 }, busPhotoCardOwn: { borderColor: '#d5a9b8', backgroundColor: '#fff8f5' }, busPhotoCardPartner: { borderColor: '#bea4d2', backgroundColor: '#faf6ff' }, busPhotoHeader: { height: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, busPhotoEyebrow: { color: '#ad6682', fontSize: 7.1, fontWeight: '900', letterSpacing: 1.1 }, busPhotoTitle: { color: '#61394b', fontSize: 13, fontWeight: '900', marginTop: 1 }, busPhotoImage: { width: '100%', height: 93, marginTop: 7, borderRadius: 10, backgroundColor: '#efd9df' }, busPhotoEmpty: { width: '100%', height: 93, marginTop: 7, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f6e6e8', borderWidth: 1, borderColor: '#e8c7d0' }, busEmptyText: { color: '#a57b88', fontSize: 8.2, fontWeight: '800', marginTop: 4 }, busButtons: { flexDirection: 'row', gap: 6, marginTop: 8 }, busCameraButton: { flex: 1, height: 30, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, backgroundColor: '#a45e79' }, busCameraText: { color: '#fff', fontSize: 7.8, fontWeight: '900', letterSpacing: 0.5 }, busGalleryButton: { width: 35, height: 30, borderRadius: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f2dce2', borderWidth: 1, borderColor: '#d8aebb' }, busSaved: { height: 30, marginTop: 8, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, backgroundColor: '#edf4e8' }, busSavedText: { color: '#719563', fontSize: 8, fontWeight: '900' }, photoLocked: { height: 30, marginTop: 8, borderRadius: 9, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 5, backgroundColor: '#f3e9ed', borderWidth: 1, borderColor: '#dfc7d0' }, photoLockedText: { color: '#96747f', fontSize: 7.4, fontWeight: '800' }, rateArea: { alignItems: 'center', marginTop: 6 }, rateLabel: { color: '#9b6579', fontSize: 7.3, fontWeight: '900', letterSpacing: 0.7 }, starRating: { flexDirection: 'row', marginTop: 1, gap: 1 }, rateSaved: { color: '#76935f', fontSize: 7.2, fontWeight: '800', marginTop: 1 }, rateHint: { color: '#aa7d8b', fontSize: 7.2, fontWeight: '800', marginTop: 1 },
  gomitasCard: { width: 250, height: 166, borderRadius: 18, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', backgroundColor: '#fff2f7', borderWidth: 1.5, borderColor: '#e3a9c2', shadowColor: '#8b4566', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 7, elevation: 6 }, gomitasCardLocked: { backgroundColor: '#f5eef1', borderColor: '#cfc0c6', shadowOpacity: 0.1 }, gomitasGlow: { position: 'absolute', width: 165, height: 165, borderRadius: 83, backgroundColor: '#f4c7d8', opacity: 0.5, top: -62 }, kissGlow: { backgroundColor: '#ded4f4' }, paseoGlow: { backgroundColor: '#f2d5af' }, comidaGlow: { backgroundColor: '#f5cf9b' }, gomitasEyebrow: { color: '#b46585', fontSize: 7, fontWeight: '900', letterSpacing: 1, marginTop: 5 }, gomitasTitle: { color: '#713e55', fontSize: 15, fontWeight: '900', marginTop: 2 }, gomitasText: { color: '#9b7281', fontSize: 8, marginTop: 3, textAlign: 'center', paddingHorizontal: 16 }, previewPill: { position: 'absolute', right: 8, top: 8, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, backgroundColor: '#c37a95' }, previewPillText: { color: '#fff8fa', fontSize: 5.8, fontWeight: '900', letterSpacing: 0.5 },
  checklistCard: { width: 600, height: 182, padding: 12, paddingLeft: 19, borderTopLeftRadius: 9, borderTopRightRadius: 19, borderBottomRightRadius: 9, borderBottomLeftRadius: 19, backgroundColor: '#fff2f6', borderWidth: 1.5, borderColor: '#d99db3', borderStyle: 'dashed', shadowColor: '#704755', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 6, elevation: 5, overflow: 'hidden' }, checklistAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 7, backgroundColor: '#c57493' }, checklistHeader: { height: 33, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 3, borderBottomWidth: 1, borderBottomColor: '#efcada' }, checklistEyebrow: { color: '#ad617e', fontSize: 7.6, fontWeight: '900', letterSpacing: 1.3 }, checklistTitle: { color: '#613749', fontSize: 16, fontWeight: '900', marginTop: 0 }, checkRow: { height: 39, flexDirection: 'row', alignItems: 'center', marginTop: 5, paddingHorizontal: 8, borderRadius: 9, backgroundColor: 'rgba(255,255,255,0.54)', borderWidth: 1, borderColor: '#ecc4d1' }, checkRowDone: { backgroundColor: '#f1f7ea', borderColor: '#c9dcb9' }, checkRowNo: { backgroundColor: '#fff0f1', borderColor: '#dfafb7' }, checkRowFrozen: { opacity: 0.92 }, checkIcon: { width: 25, height: 25, borderRadius: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f5d5e0', borderWidth: 1, borderColor: '#e2aabf' }, checkCopy: { flex: 1, marginLeft: 8 }, checkTitle: { color: '#65404f', fontSize: 10.5, fontWeight: '900' }, checkText: { color: '#987682', fontSize: 7.5, marginTop: 1 }, personCheck: { width: 72, flexDirection: 'row', alignItems: 'center', marginLeft: 8 }, personCircle: { width: 25, height: 25, borderRadius: 13, borderWidth: 1.6, borderColor: '#cb9aaa', backgroundColor: '#fff8f9', alignItems: 'center', justifyContent: 'center' }, personCircleDone: { backgroundColor: '#8aa56f', borderColor: '#6d8d56' }, personCirclePartner: { backgroundColor: '#8aa56f', borderColor: '#6d8d56' }, personCircleNo: { backgroundColor: '#d77983', borderColor: '#b45c67' }, personMeta: { marginLeft: 4, minWidth: 37 }, personLabel: { color: '#8f5e70', fontSize: 7.2, fontWeight: '900' }, personTime: { color: '#956f7c', fontSize: 6.5, lineHeight: 7.5, fontWeight: '800' },
  upcomingCard: { flex: 1, minHeight: 142, margin: 4, paddingHorizontal: 24, borderRadius: 15, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fffaf3', borderWidth: 1, borderColor: '#e7c9bb' }, upcomingIcon: { width: 55, height: 55, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8e6cf', borderWidth: 1, borderColor: '#edcfaa' }, upcomingEyebrow: { color: '#b07b50', fontSize: 7.5, fontWeight: '900', letterSpacing: 1.2, marginTop: 7 }, upcomingTitle: { color: '#603c4d', fontSize: 16, fontWeight: '900', marginTop: 2 }, upcomingText: { maxWidth: 320, color: '#846771', fontSize: 10, lineHeight: 14, textAlign: 'center', marginTop: 5 },
  modalBackdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 18, backgroundColor: 'rgba(28,16,28,0.7)' }, previewModal: { width: '100%', maxWidth: 470, padding: 15, borderRadius: 20, backgroundColor: '#fff8ef', borderWidth: 1, borderColor: '#edcfb6' }, modalTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 }, modalEyebrow: { color: '#a36680', fontSize: 8, fontWeight: '900', letterSpacing: 1 }, modalTitle: { color: '#4b2e48', fontSize: 19, fontWeight: '900', marginTop: 2 }, modalClose: { width: 29, height: 29, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eadbe2' }, previewImage: { width: '100%', height: 205, borderRadius: 14, backgroundColor: '#eadbe2' }, previewHint: { color: '#70576a', fontSize: 11, lineHeight: 16, marginTop: 10, textAlign: 'center' }, modalActions: { flexDirection: 'row', gap: 8, marginTop: 13 }, changeButton: { flex: 1, minHeight: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#eadbe2' }, changeButtonText: { color: '#76546c', fontWeight: '900', fontSize: 11 }, confirmButton: { flex: 1.2, minHeight: 40, borderRadius: 11, flexDirection: 'row', gap: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: '#9c5cae' }, confirmButtonText: { color: '#fff', fontWeight: '900', fontSize: 11 }, uploadingBox: { alignItems: 'center', paddingVertical: 13 }, uploadingText: { color: '#70576a', fontSize: 11, fontWeight: '800', marginTop: 7 },
  rewardModal: { width: 300, minHeight: 250, padding: 21, borderRadius: 23, alignItems: 'center', backgroundColor: '#fff3f7', borderWidth: 2, borderColor: '#df9db7' }, rewardModalEyebrow: { color: '#ba6687', fontSize: 8, fontWeight: '900', letterSpacing: 1.1, textAlign: 'center', marginTop: 8 }, rewardModalTitle: { color: '#6d3d53', fontSize: 19, lineHeight: 23, fontWeight: '900', textAlign: 'center', marginTop: 5 }, rewardModalText: { color: '#8a6975', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 7 }, rewardModalButton: { minWidth: 128, height: 35, marginTop: 15, borderRadius: 11, alignItems: 'center', justifyContent: 'center', backgroundColor: '#b96787' }, rewardModalButtonText: { color: '#fff8fb', fontSize: 9, fontWeight: '900', letterSpacing: 0.8 }, eventCompleteModal: { width: 306, minHeight: 286, padding: 22, borderRadius: 26, alignItems: 'center', backgroundColor: '#fff8ee', borderWidth: 2, borderColor: '#e5bd78', shadowColor: '#5c3a2a', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.34, shadowRadius: 11, elevation: 11 }, eventCompleteSpark: { width: 58, height: 58, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d49854', borderWidth: 1, borderColor: '#ae6c39' }, eventCompleteTitle: { color: '#704831', fontSize: 22, fontWeight: '900', textAlign: 'center', marginTop: 5 }, eventCompleteText: { color: '#8c6a58', fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 7 }, diamondReward: { height: 37, marginTop: 13, paddingHorizontal: 13, borderRadius: 12, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 6, backgroundColor: '#e6f8fa', borderWidth: 1.5, borderColor: '#79cede' }, diamondRewardText: { color: '#27879c', fontSize: 11, fontWeight: '900', letterSpacing: 0.5 },
});
