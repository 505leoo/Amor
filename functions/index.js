/* eslint-disable max-len */
const functions = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onDocumentUpdated, onDocumentWritten} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const crypto = require("crypto");

admin.initializeApp();

const BUZON_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const buzonExpiration = () => admin.firestore.Timestamp.fromMillis(Date.now() + BUZON_RETENTION_MS);
const FIRESTORE_NOTIFICATION_TEMPLATES = [
  {
    id: "notificacion_1_actualizacion",
    nombre: "Notificación 1",
    titulo: "Una nueva actualización llegó a Amor",
    descripcion: "Hay nuevos detalles, mejoras y pequeñas sorpresas esperándote. Entra a Amor y descubre todo lo que cambió.",
  },
  {
    id: "notificacion_2_sorpresa",
    nombre: "Notificación 2",
    titulo: "Amor tiene algo bonito para ti",
    descripcion: "Una sorpresa acaba de aparecer. Vuelve cuando puedas y descubre qué preparamos con cariño.",
  },
];

const ensureFirestoreNotificationTemplates = async (db) => {
  const creadas = [];
  for (const template of FIRESTORE_NOTIFICATION_TEMPLATES) {
    const ref = db.collection("notificaciones").doc(template.id);
    const snap = await ref.get();
    if (snap.exists) continue;
    await ref.set({
      nombre: template.nombre,
      titulo: template.titulo,
      descripcion: template.descripcion,
      enviar: "no",
      vibrar: true,
      estado: "lista",
      estadoTexto: "Lista para enviar",
      dispositivosObjetivo: 0,
      dispositivosLlegados: 0,
      creadaEn: admin.firestore.FieldValue.serverTimestamp(),
      actualizadaEn: admin.firestore.FieldValue.serverTimestamp(),
    });
    creadas.push(template.id);
  }
  if (creadas.length) logger.info("[FirestoreBroadcast] Plantillas creadas", {creadas});
  return creadas;
};

const FCM_BATCH_SIZE = 500;
const FCM_INVALID_TOKEN_CODES = new Set([
  "messaging/invalid-registration-token",
  "messaging/registration-token-not-registered",
]);
const FCM_RETRYABLE_CODES = new Set([
  "messaging/internal-error",
  "messaging/server-unavailable",
  "messaging/unknown-error",
]);

const normalizeFcmToken = (value) => {
  const token = typeof value === "string" ? value.trim() : "";
  return token.length >= 20 && token.length <= 4096 && !/\s/.test(token) ? token : null;
};

const getUserFcmTokens = (data = {}) => [...new Set([
  normalizeFcmToken(data.fcmToken),
  ...(Array.isArray(data.fcmTokens) ? data.fcmTokens.map(normalizeFcmToken) : []),
].filter(Boolean))];

const collectFcmRecipients = (userDocs) => {
  const tokens = [];
  const owners = new Map();
  for (const userDoc of userDocs) {
    const userData = userDoc.data() || {};
    for (const token of getUserFcmTokens(userData)) {
      if (!owners.has(token)) {
        owners.set(token, []);
        tokens.push(token);
      }
      owners.get(token).push({ref: userDoc.ref, data: userData});
    }
  }
  return {tokens, owners};
};

const normalizeFcmData = (payload = {}) => {
  const result = {};
  let totalLength = 0;
  for (const [rawKey, rawValue] of Object.entries(payload || {})) {
    if (rawValue === undefined || rawValue === null) continue;
    let key = String(rawKey).trim().replace(/[^a-zA-Z0-9_.-]/g, "_").slice(0, 80);
    if (!key || key === "from" || key === "message_type" || /^(google|gcm)\./i.test(key)) key = `amor_${key || "data"}`;
    let value;
    try {
      value = typeof rawValue === "string" ? rawValue : JSON.stringify(rawValue);
    } catch (_) {
      value = String(rawValue);
    }
    value = String(value).slice(0, 1800);
    if (totalLength + key.length + value.length > 3500) break;
    result[key] = value;
    totalLength += key.length + value.length;
  }
  return result;
};

const normalizeCollapseKey = (value) => {
  const key = String(value || "").trim().replace(/[^a-zA-Z0-9_.-]/g, "_");
  return key ? key.slice(0, 64) : undefined;
};

const sendMulticastWithRetry = async (message) => {
  try {
    return await admin.messaging().sendEachForMulticast(message);
  } catch (error) {
    const code = error && error.code;
    if (code && !FCM_RETRYABLE_CODES.has(code)) throw error;
    logger.warn("[FCM] Falló el lote completo; reintentando una vez", {code: code || "network_error"});
    await new Promise((resolve) => setTimeout(resolve, 500));
    return admin.messaging().sendEachForMulticast(message);
  }
};

const cleanupInvalidFcmTokens = async (invalidTokens, owners) => {
  if (!invalidTokens.length || !owners) return;
  const updates = new Map();
  for (const token of invalidTokens) {
    for (const owner of owners.get(token) || []) {
      const path = owner.ref.path;
      if (!updates.has(path)) updates.set(path, {ref: owner.ref, data: owner.data, tokens: new Set()});
      updates.get(path).tokens.add(token);
    }
  }
  const entries = [...updates.values()];
  for (let index = 0; index < entries.length; index += 450) {
    const batch = admin.firestore().batch();
    for (const entry of entries.slice(index, index + 450)) {
      const tokens = [...entry.tokens];
      const update = {fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokens)};
      if (tokens.includes(entry.data.fcmToken)) {
        update.fcmToken = admin.firestore.FieldValue.delete();
      }
      batch.set(entry.ref, update, {merge: true});
    }
    await batch.commit();
  }
  logger.info("[FCM] Tokens inválidos eliminados", {count: invalidTokens.length});
};

const sendFcmToTokens = async ({
  tokens,
  title,
  body,
  data = {},
  collapseKey,
  vibrate = true,
  owners,
}) => {
  const uniqueTokens = [...new Set((tokens || []).map(normalizeFcmToken).filter(Boolean))];
  const invalidTokens = [];
  const failures = [];
  let successCount = 0;
  const normalizedCollapseKey = normalizeCollapseKey(collapseKey);
  const baseMessage = {
    notification: {title: String(title), body: String(body)},
    data: normalizeFcmData(data),
    android: {
      priority: "high",
      ttl: 24 * 60 * 60 * 1000,
      restrictedPackageName: "com.leitof7.amor",
      ...(normalizedCollapseKey ? {collapseKey: normalizedCollapseKey} : {}),
      notification: {
        channelId: "amor-notifications",
        sound: "default",
        ...(vibrate ? {defaultVibrateTimings: true} : {}),
      },
    },
  };

  for (let index = 0; index < uniqueTokens.length; index += FCM_BATCH_SIZE) {
    const batchTokens = uniqueTokens.slice(index, index + FCM_BATCH_SIZE);
    const first = await sendMulticastWithRetry({...baseMessage, tokens: batchTokens});
    const outcomes = first.responses.map((response, responseIndex) => ({
      token: batchTokens[responseIndex],
      response,
    }));
    const retryable = outcomes.filter(({response}) => !response.success && FCM_RETRYABLE_CODES.has(response.error && response.error.code));
    if (retryable.length) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const retry = await sendMulticastWithRetry({
        ...baseMessage,
        tokens: retryable.map((item) => item.token),
      });
      retry.responses.forEach((response, retryIndex) => {
        const original = outcomes.find((item) => item.token === retryable[retryIndex].token);
        if (original) original.response = response;
      });
    }

    for (const {token, response} of outcomes) {
      if (response.success) {
        successCount += 1;
        continue;
      }
      const code = response.error && response.error.code || "messaging/unknown-error";
      failures.push({tokenPreview: `${token.slice(0, 8)}…`, code});
      if (FCM_INVALID_TOKEN_CODES.has(code)) invalidTokens.push(token);
    }
  }

  await cleanupInvalidFcmTokens([...new Set(invalidTokens)], owners);
  return {
    successCount,
    failureCount: uniqueTokens.length - successCount,
    targetCount: uniqueTokens.length,
    failures,
  };
};

exports.registerFcmToken = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const token = normalizeFcmToken(request.data && request.data.token);
  const platform = String(request.data && request.data.platform || "android").toLowerCase();
  if (!token || platform !== "android") throw new HttpsError("invalid-argument", "Token FCM inválido.");

  const db = admin.firestore();
  const userRef = db.collection("usuarios").doc(request.auth.uid);
  const [primarySnap, listSnap] = await Promise.all([
    db.collection("usuarios").where("fcmToken", "==", token).get(),
    db.collection("usuarios").where("fcmTokens", "array-contains", token).get(),
  ]);
  const previousOwners = new Map();
  [...primarySnap.docs, ...listSnap.docs].forEach((userDoc) => {
    if (userDoc.id !== request.auth.uid) previousOwners.set(userDoc.ref.path, userDoc);
  });

  const batch = db.batch();
  for (const userDoc of previousOwners.values()) {
    const update = {fcmTokens: admin.firestore.FieldValue.arrayRemove(token)};
    if ((userDoc.data() || {}).fcmToken === token) update.fcmToken = admin.firestore.FieldValue.delete();
    batch.set(userDoc.ref, update, {merge: true});
  }
  batch.set(userRef, {
    fcmToken: token,
    fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
    fcmPlatform: "android",
    fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, {merge: true});
  await batch.commit();
  logger.info("[FCM] Token registrado", {uid: request.auth.uid, reassignedFrom: previousOwners.size});
  return {success: true};
});

exports.unregisterFcmToken = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const token = normalizeFcmToken(request.data && request.data.token);
  if (!token) throw new HttpsError("invalid-argument", "Token FCM inválido.");
  const userRef = admin.firestore().collection("usuarios").doc(request.auth.uid);
  const snap = await userRef.get();
  if (!snap.exists) return {success: true};
  const update = {
    fcmTokens: admin.firestore.FieldValue.arrayRemove(token),
    fcmTokenUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  };
  if ((snap.data() || {}).fcmToken === token) update.fcmToken = admin.firestore.FieldValue.delete();
  await userRef.set(update, {merge: true});
  return {success: true};
});

exports.sendFcmNotification = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const title = String(request.data && request.data.title || "").trim().replace(/\s+/g, " ");
  const body = String(request.data && request.data.body || "").trim().replace(/\s+/g, " ");
  const payloadData = request.data && request.data.data || {};
  if (title.length < 2 || title.length > 100 || body.length < 2 || body.length > 500) {
    throw new HttpsError("invalid-argument", "Revisa el título y el mensaje.");
  }

  const db = admin.firestore();
  const senderSnap = await db.collection("usuarios").doc(request.auth.uid).get();
  const partnerUid = senderSnap.exists ? (senderSnap.data() || {}).pareja : null;
  if (!partnerUid || partnerUid === request.auth.uid) {
    throw new HttpsError("failed-precondition", "No tienes una pareja vinculada.");
  }
  const partnerSnap = await db.collection("usuarios").doc(partnerUid).get();
  if (!partnerSnap.exists) throw new HttpsError("not-found", "No encontramos a tu pareja.");
  const recipients = collectFcmRecipients([partnerSnap]);
  if (!recipients.tokens.length) return {success: false, sent: 0, error: "no_fcm_token"};

  const collapseKey = normalizeCollapseKey(payloadData.collapseKey);
  const dedupeKey = crypto.createHash("sha256")
      .update(`${request.auth.uid}|${partnerUid}|${collapseKey || `${title}|${body}`}`)
      .digest("hex");
  const dedupeRef = db.collection("fcm_recent").doc(dedupeKey);
  const pairKey = crypto.createHash("sha256").update(`${request.auth.uid}|${partnerUid}`).digest("hex");
  const rateRef = db.collection("fcm_rate_limits").doc(pairKey);
  const now = Date.now();
  const claimed = await db.runTransaction(async (tx) => {
    const [dedupeSnap, rateSnap] = await Promise.all([tx.get(dedupeRef), tx.get(rateRef)]);
    if (dedupeSnap.exists && now - Number((dedupeSnap.data() || {}).sentAtMs) < 15000) return false;
    const recentSends = (rateSnap.exists && Array.isArray((rateSnap.data() || {}).recentSends) ?
      rateSnap.data().recentSends : []).map(Number).filter((sentAt) => now - sentAt < 60 * 1000);
    if (recentSends.length >= 10) {
      throw new HttpsError("resource-exhausted", "Espera un momento antes de enviar más avisos.");
    }
    tx.set(dedupeRef, {
      sentAtMs: now,
      expiresAt: admin.firestore.Timestamp.fromMillis(now + 60 * 60 * 1000),
    });
    tx.set(rateRef, {
      recentSends: [...recentSends, now],
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    return true;
  });
  if (!claimed) return {success: true, sent: 0, deduplicated: true};

  const result = await sendFcmToTokens({
    ...recipients,
    title,
    body,
    collapseKey,
    data: {
      ...payloadData,
      fromUserId: request.auth.uid,
      partnerId: partnerUid,
    },
  });
  logger.info("[FCM] Notificación de pareja procesada", {
    from: request.auth.uid,
    to: partnerUid,
    sent: result.successCount,
    failed: result.failureCount,
  });
  return {
    success: result.successCount > 0,
    sent: result.successCount,
    failed: result.failureCount,
    error: result.successCount ? null : "fcm_send_failed",
  };
});

// Ruleta diaria: el premio y el límite se resuelven en servidor para que el
// cliente no pueda repetir giros ni modificar la recompensa.
const RECOMPENSAS_COLECCION_RULETA = [
  {tipo: "animal", animalId: "ardilla", legacyUnlockField: "ardillaDesbloqueada", loteId: "ardilla", premioLoteId: "personaje", nombre: "Ardilla"},
  {tipo: "animal", animalId: "ajolote", legacyUnlockField: "ajoloteDesbloqueado", loteId: "ajolote", premioLoteId: "personaje", nombre: "Ajolote"},
  {tipo: "animal", animalId: "erizo", legacyUnlockField: "erizoDesbloqueado", loteId: "erizo", premioLoteId: "personaje", nombre: "Erizo"},
  {tipo: "skin", animalId: "ardilla", skinId: "ardillat1", loteId: "ardilla", premioLoteId: "ardillat1", nombre: "Bellota Dorada"},
  {tipo: "skin", animalId: "ardilla", skinId: "ardillat2", loteId: "ardilla", premioLoteId: "ardillat2", nombre: "Guardiana del Bosque"},
  {tipo: "skin", animalId: "ajolote", skinId: "ajolotet1", loteId: "ajolote", premioLoteId: "ajolotet1", nombre: "Algodón de Azúcar"},
  {tipo: "skin", animalId: "ajolote", skinId: "ajolotet2", loteId: "ajolote", premioLoteId: "ajolotet2", nombre: "Guardián de Caramelo"},
  {tipo: "skin", animalId: "erizo", skinId: "erizot1", loteId: "erizo", premioLoteId: "erizot1", nombre: "Cupcake de Arándanos"},
  {tipo: "skin", animalId: "erizo", skinId: "erizot2", loteId: "erizo", premioLoteId: "erizot2", nombre: "Maestro Chocolatero"},
  {tipo: "icono", iconoId: "ardilla_bellota", loteId: "ardilla", premioLoteId: "icono", nombre: "Bellota Dorada"},
  {tipo: "icono", iconoId: "ajolote_caramelo", loteId: "ajolote", premioLoteId: "icono", nombre: "Reino de Caramelo"},
  {tipo: "icono", iconoId: "erizo_dulce_medianoche", loteId: "erizo", premioLoteId: "icono", nombre: "Dulce Medianoche"},
];

const ejecutarGiroRuletaDiaria = async (uid) => {
  const db = admin.firestore();
  const dayKey = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date());
  const premios = [
    {id: "pierdes_300", tipo: "perdida", cantidad: 300, peso: 20},
    {id: "sin_premio", tipo: "nada", cantidad: 0, peso: 10},
    {id: "monedas_75", tipo: "dinero", cantidad: 75, peso: 23},
    {id: "cartas_3", tipo: "cartasAnimalitos", cantidad: 3, peso: 15},
    {id: "monedas_150", tipo: "dinero", cantidad: 150, peso: 14},
    {id: "cartas_5", tipo: "cartasAnimalitos", cantidad: 5, peso: 6},
    {id: "diamantes_10", tipo: "diamantes", cantidad: 10, peso: 8},
    {id: "diamantes_25", tipo: "diamantes", cantidad: 25, peso: 4},
    {id: "sorpresa_coleccion", tipo: "coleccion", cantidad: 1, peso: 4.1667},
  ];
  const total = premios.reduce((sum, item) => sum + item.peso, 0);
  let roll = Math.random() * total;
  const premio = premios.find((item) => {
    roll -= item.peso;
    return roll <= 0;
  }) || premios[0];
  const selectorColeccion = Math.random();
  const userRef = db.collection("usuarios").doc(uid);
  const ruletaRef = userRef.collection("minijuegos").doc("ruleta_diaria");
  const ticketRef = userRef.collection("inventario").doc("ticket_ruleta");
  let cantidadAplicada = premio.cantidad;
  let recompensaColeccion = null;
  let premioAplicado = premio;
  await db.runTransaction(async (tx) => {
    const animalRefs = Object.fromEntries(["ardilla", "ajolote", "erizo"].map((animalId) => [animalId, userRef.collection("animalitos").doc(animalId)]));
    const loteRefs = Object.fromEntries(["ardilla", "ajolote", "erizo"].map((animalId) => [animalId, userRef.collection("lotes").doc(animalId)]));
    const [userSnap, ruletaSnap, ticketSnap, ...coleccionSnaps] = await Promise.all([
      tx.get(userRef), tx.get(ruletaRef), tx.get(ticketRef),
      ...Object.values(animalRefs).map((ref) => tx.get(ref)),
      ...Object.values(loteRefs).map((ref) => tx.get(ref)),
    ]);
    if (!userSnap.exists) throw new HttpsError("not-found", "Usuario no encontrado.");
    const ruletaData = ruletaSnap.data() || {};
    const usarGiroDiario = ruletaData.ultimoGiroDia !== dayKey;
    const ticketData = ticketSnap.data() || {};
    const ticketsDisponibles = Math.max(0, Number(ticketData.cantidad) || 0);
    if (!usarGiroDiario && ticketsDisponibles < 1) {
      throw new HttpsError("failed-precondition", "No tienes giros disponibles.");
    }
    if (!usarGiroDiario) {
      tx.set(ticketRef, {cantidad: ticketsDisponibles - 1}, {merge: true});
    }
    const userData = userSnap.data() || {};
    const saldo = Math.max(0, Number(userData.dinero) || 0);
    const animalData = Object.fromEntries(Object.keys(animalRefs).map((animalId, index) => [animalId, coleccionSnaps[index].data() || {}]));
    const loteData = Object.fromEntries(Object.keys(loteRefs).map((animalId, index) => [animalId, coleccionSnaps[index + 3].data() || {}]));

    if (premio.tipo === "coleccion") {
      const desbloqueado = (animalId) => {
        const animal = animalData[animalId] || {};
        const config = RECOMPENSAS_COLECCION_RULETA.find((item) => item.tipo === "animal" && item.animalId === animalId);
        return animal.desbloqueado === true || userData.animalito === animalId || Boolean(config && config.legacyUnlockField && userData[config.legacyUnlockField]) || Number(animal.nivel) > 0 || Number(animal.cartas !== undefined ? animal.cartas : animal.copias) > 0;
      };
      const disponibles = RECOMPENSAS_COLECCION_RULETA.filter((item) => {
        if (item.tipo === "animal") return !desbloqueado(item.animalId);
        if (item.tipo === "skin") return desbloqueado(item.animalId) && !((animalData[item.animalId].skinsDesbloqueadas || {})[item.skinId]) && !(((userData.skinsDesbloqueadas || {})[item.animalId] || {})[item.skinId]) && !(userData.animalito === item.animalId && userData.skin === item.skinId);
        return !((userData.iconosDesbloqueados || {})[item.iconoId]) && userData.iconoLocalId !== item.iconoId;
      });
      const elegida = disponibles[Math.min(disponibles.length - 1, Math.floor(selectorColeccion * disponibles.length))];
      if (elegida) {
        recompensaColeccion = elegida;
        if (elegida.tipo === "animal") {
          tx.set(userRef, {[elegida.legacyUnlockField]: true}, {merge: true});
          tx.set(animalRefs[elegida.animalId], {desbloqueado: true, nivel: Math.max(1, Number(animalData[elegida.animalId].nivel) || 1)}, {merge: true});
        } else if (elegida.tipo === "skin") {
          tx.set(animalRefs[elegida.animalId], {skinsDesbloqueadas: {...(animalData[elegida.animalId].skinsDesbloqueadas || {}), [elegida.skinId]: true}}, {merge: true});
        } else {
          tx.set(userRef, {iconosDesbloqueados: {...(userData.iconosDesbloqueados || {}), [elegida.iconoId]: true}}, {merge: true});
        }
        tx.set(loteRefs[elegida.loteId], {
          animalId: elegida.loteId,
          premiosUnicos: {...(loteData[elegida.loteId].premiosUnicos || {}), [elegida.premioLoteId]: true},
          ultimaRecompensaRuleta: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
      } else {
        premioAplicado = {id: "cartas_5", tipo: "cartasAnimalitos", cantidad: 5};
      }
    }

    cantidadAplicada = premioAplicado.tipo === "perdida" ? Math.min(premioAplicado.cantidad, saldo) : premioAplicado.cantidad;
    if (premioAplicado.tipo === "perdida" && cantidadAplicada > 0) {
      tx.update(userRef, {dinero: admin.firestore.FieldValue.increment(-cantidadAplicada)});
    } else if (premioAplicado.tipo !== "nada" && premioAplicado.tipo !== "coleccion") {
      tx.update(userRef, {[premioAplicado.tipo]: admin.firestore.FieldValue.increment(cantidadAplicada)});
    }
    tx.set(ruletaRef, {
      ultimoPremio: premioAplicado.id,
      ultimoGiroEn: admin.firestore.FieldValue.serverTimestamp(),
      ultimoTipoGiro: usarGiroDiario ? "diario" : "ticket",
      ...(usarGiroDiario ? {ultimoGiroDia: dayKey} : {}),
      girosTotales: admin.firestore.FieldValue.increment(1),
    }, {merge: true});
  });
  return {id: premioAplicado.id, tipo: premioAplicado.tipo, cantidad: cantidadAplicada, recompensa: recompensaColeccion};
};

exports.girarRuletaDiaria = onCall(async (request) => {
  let uid = request.auth && request.auth.uid;
  const authToken = request.data && request.data.authToken;
  if (!uid && authToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(authToken);
      uid = decodedToken.uid;
    } catch (_) {
      throw new HttpsError("unauthenticated", "Tu sesión ya no es válida.");
    }
  }
  if (!uid) throw new HttpsError("unauthenticated", "Inicia sesión para girar.");
  return ejecutarGiroRuletaDiaria(uid);
});

// Compatibilidad con React Native: las demás callables estables de la app
// usan esta generación y reciben el token de Auth sin problemas.
exports.girarRuletaDiariaV1 = functions.https.onCall(async (data, context) => {
  let uid = context.auth && context.auth.uid;
  const payload = (data && data.data) || data || {};
  if (!uid && payload.authToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(payload.authToken);
      uid = decodedToken.uid;
    } catch (_) {
      throw new functions.https.HttpsError("unauthenticated", "Tu sesión ya no es válida.");
    }
  }
  if (!uid) throw new functions.https.HttpsError("unauthenticated", "Inicia sesión para girar.");
  return ejecutarGiroRuletaDiaria(uid);
});

// Mensajes globales de Comunidad. La identidad, el cooldown y los destinatarios
// se validan en servidor; el cliente únicamente presenta el compositor.
exports.adminCommunityBroadcast = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const email = String(request.auth.token.email || "").trim().toLowerCase();
  if (email !== "admin@gmail.com") {
    throw new HttpsError("permission-denied", "Solo Administración puede enviar avisos.");
  }

  const db = admin.firestore();
  const stateRef = db.collection("configuracion").doc("comunidad_broadcast");
  const now = Date.now();
  // Temporal: tanto Avisos como las plantillas de Firestore descansan un minuto.
  const cooldownMs = 60 * 1000;
  const action = String((request.data || {}).action || "status");
  const stateSnap = await stateRef.get();
  const state = stateSnap.data() || {};
  const lastSentMs = Number(state.lastSentMs) || 0;
  const nextAllowedAt = lastSentMs + cooldownMs;
  if (action === "status") {
    return {ok: true, nextAllowedAt, lastTitle: state.lastTitle || null};
  }
  if (action === "ensure_templates") {
    const creadas = await ensureFirestoreNotificationTemplates(db);
    return {ok: true, creadas};
  }
  if (action !== "send") throw new HttpsError("invalid-argument", "Acción inválida.");

  const title = String(request.data.title || "").trim().replace(/\s+/g, " ");
  const body = String(request.data.body || "").trim().replace(/\s+/g, " ");
  if (title.length < 4 || title.length > 60 || body.length < 10 || body.length > 180) {
    throw new HttpsError("invalid-argument", "Revisa el título y el mensaje.");
  }

  await db.runTransaction(async (tx) => {
    const snap = await tx.get(stateRef);
    const current = snap.data() || {};
    const currentLast = Number(current.lastSentMs) || 0;
    const sendingUntil = Number(current.sendingUntil) || 0;
    if (now < currentLast + cooldownMs) {
      throw new HttpsError("resource-exhausted", "Debes esperar antes de otro aviso.", {nextAllowedAt: currentLast + cooldownMs});
    }
    if (now < sendingUntil) {
      throw new HttpsError("aborted", "Ya hay un envío en curso.");
    }
    tx.set(stateRef, {sendingUntil: now + 2 * 60 * 1000, sendingBy: request.auth.uid}, {merge: true});
  });

  try {
    const users = await db.collection("usuarios").get();
    const recipients = collectFcmRecipients(users.docs);
    if (!recipients.tokens.length) throw new HttpsError("failed-precondition", "No hay dispositivos registrados.");
    const result = await sendFcmToTokens({
      ...recipients,
      title,
      body,
      data: {type: "community_broadcast"},
      collapseKey: `community-${now}`,
    });
    await stateRef.set({
      lastSentMs: now,
      lastTitle: title,
      lastBody: body,
      lastSentBy: request.auth.uid,
      lastRecipientCount: result.successCount,
      lastFailedCount: result.failureCount,
      sentAt: admin.firestore.FieldValue.serverTimestamp(),
      sendingUntil: 0,
    }, {merge: true});
    return {ok: result.successCount > 0, sent: result.successCount, failed: result.failureCount, nextAllowedAt: now + cooldownMs};
  } catch (error) {
    await stateRef.set({sendingUntil: 0}, {merge: true}).catch(() => {});
    if (error instanceof HttpsError) throw error;
    logger.error("[CommunityBroadcast] Error", error);
    throw new HttpsError("internal", "No se pudo enviar el aviso.");
  }
});

// Cola editable desde Firestore. Para disparar una plantilla, Administración
// únicamente cambia `enviar` de "no" a "si". El trigger toma un bloqueo,
// devuelve el campo a "no" y conserva todo el historial del último intento.
exports.enviarNotificacionDesdeFirestore = onDocumentWritten("notificaciones/{notificationId}", async (event) => {
  const beforeSnap = event.data && event.data.before;
  const afterSnap = event.data && event.data.after;
  if (!afterSnap || !afterSnap.exists) return null;
  const before = beforeSnap && beforeSnap.exists ? beforeSnap.data() || {} : {};
  const after = afterSnap.data() || {};
  const quiereEnviar = (value) => value === true || ["si", "sí", "yes"].includes(String(value || "").trim().toLowerCase());
  if (!quiereEnviar(after.enviar) || quiereEnviar(before.enviar)) return null;

  const db = admin.firestore();
  const notificationRef = event.data.after.ref;
  const broadcastStateRef = db.collection("configuracion").doc("comunidad_broadcast");
  const notificationId = event.params.notificationId;
  const now = Date.now();
  const cooldownMs = 60 * 1000;
  const title = String(after.titulo || "").trim().replace(/\s+/g, " ");
  const body = String(after.descripcion || after.cuerpo || "").trim().replace(/\s+/g, " ");

  try {
    const lockTaken = await db.runTransaction(async (tx) => {
      const [currentSnap, stateSnap] = await Promise.all([tx.get(notificationRef), tx.get(broadcastStateRef)]);
      const current = currentSnap.data() || {};
      const broadcastState = stateSnap.data() || {};
      if (!quiereEnviar(current.enviar)) throw new Error("trigger_ya_procesado");
      const nextAllowedAt = (Number(broadcastState.lastFirestoreSentMs) || 0) + cooldownMs;
      if (now < nextAllowedAt || now < (Number(broadcastState.firestoreSendingUntil) || 0)) {
        tx.set(notificationRef, {
          enviar: "no",
          estado: "esperando_cooldown",
          estadoTexto: now < nextAllowedAt ? "Esperando el límite de un minuto" : "Ya hay otro envío en curso",
          proximoEnvioMs: Math.max(nextAllowedAt, Number(broadcastState.firestoreSendingUntil) || 0),
          actualizadaEn: admin.firestore.FieldValue.serverTimestamp(),
        }, {merge: true});
        return false;
      }
      tx.set(notificationRef, {
        enviar: "no",
        estado: "procesando",
        estadoTexto: "Preparando el envío…",
        ultimoIntentoEn: admin.firestore.FieldValue.serverTimestamp(),
        ultimoIntentoMs: now,
        errorUltimoEnvio: admin.firestore.FieldValue.delete(),
        actualizadaEn: admin.firestore.FieldValue.serverTimestamp(),
      }, {merge: true});
      tx.set(broadcastStateRef, {firestoreSendingUntil: now + 60 * 1000, firestoreSendingBy: notificationId}, {merge: true});
      return true;
    });
    if (!lockTaken) return null;
  } catch (error) {
    if (error.message === "trigger_ya_procesado") return null;
    throw error;
  }

  if (title.length < 4 || title.length > 60 || body.length < 10 || body.length > 180) {
    await notificationRef.set({
      enviar: "no",
      estado: "error",
      estadoTexto: "Notificación no enviada",
      errorUltimoEnvio: "El título o la descripción no tienen un tamaño válido.",
      actualizadaEn: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    await broadcastStateRef.set({firestoreSendingUntil: 0}, {merge: true}).catch(() => {});
    return null;
  }

  try {
    const users = await db.collection("usuarios").get();
    const recipients = collectFcmRecipients(users.docs);
    if (!recipients.tokens.length) throw new Error("No hay dispositivos registrados.");
    const result = await sendFcmToTokens({
      ...recipients,
      title,
      body,
      data: {type: "firestore_broadcast", notificationId},
      collapseKey: `firestore-${notificationId}-${now}`,
      vibrate: after.vibrar !== false,
    });

    await notificationRef.set({
      enviar: "no",
      estado: "finalizada",
      estadoTexto: result.failureCount ? "Envío finalizado con algunos errores" : "Envío aceptado por FCM",
      ultimaVezEnviada: admin.firestore.FieldValue.serverTimestamp(),
      ultimaVezEnviadaMs: now,
      dispositivosObjetivo: result.targetCount,
      dispositivosLlegados: result.successCount,
      dispositivosFallidos: result.failureCount,
      actualizadaEn: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    await broadcastStateRef.set({
      lastFirestoreSentMs: now,
      lastFirestoreTitle: title,
      lastFirestoreBody: body,
      lastFirestoreRecipientCount: result.successCount,
      lastFirestoreFailedCount: result.failureCount,
      lastFirestoreSentAt: admin.firestore.FieldValue.serverTimestamp(),
      firestoreSendingUntil: 0,
    }, {merge: true});
    return null;
  } catch (error) {
    logger.error("[FirestoreBroadcast] Error", {notificationId, error});
    await notificationRef.set({
      enviar: "no",
      estado: "error",
      estadoTexto: "Notificación no enviada",
      errorUltimoEnvio: String(error.message || error),
      actualizadaEn: admin.firestore.FieldValue.serverTimestamp(),
    }, {merge: true});
    await broadcastStateRef.set({firestoreSendingUntil: 0}, {merge: true}).catch(() => {});
    return null;
  }
});

// Actividad breve para que la pareja pueda ver los momentos importantes sin
// depender de textos fijos en Inicio. Solo registra cambios relevantes.
exports.registrarActividadPareja = onDocumentUpdated("usuarios/{userId}", async (event) => {
  const before = event.data.before.data() || {};
  const after = event.data.after.data() || {};
  const numero = (value) => Number(value) || 0;
  const expAntes = numero(before.exp);
  const expDespues = numero(after.exp);
  const monedasAntes = numero(before.dinero);
  const monedasDespues = numero(after.dinero);
  const diamantesAntes = numero(before.diamantes || before.diamante);
  const diamantesDespues = numero(after.diamantes || after.diamante);
  let actividad = null;

  const nivelAntes = 1 + Math.floor(expAntes / 100);
  const nivelDespues = 1 + Math.floor(expDespues / 100);
  if (nivelDespues > nivelAntes) {
    actividad = {tipo: "nivel", nivel: nivelDespues};
  } else if (diamantesDespues - diamantesAntes >= 10) {
    actividad = {tipo: "epico", cantidad: diamantesDespues - diamantesAntes};
  } else if (monedasDespues - monedasAntes >= 50) {
    actividad = {tipo: "monedas", cantidad: monedasDespues - monedasAntes};
  } else if (monedasAntes - monedasDespues >= 1) {
    actividad = {tipo: "compra", cantidad: monedasAntes - monedasDespues};
  }
  if (!actividad) return null;
  return event.data.after.ref.collection("actividad").add({
    ...actividad,
    creadoEn: admin.firestore.FieldValue.serverTimestamp(),
  });
});

// ─── Crédito de Menta ──────────────────────────────────────────────────────
// Las monedas y las fechas se calculan en el servidor, no en el cliente.
const MENTA_PRESTAMOS = [250, 500, 1000];
const MENTA_INTERES = 0.10;
const MENTA_RECARGO = 0.20;
const MENTA_PLAZO_MS = 3 * 24 * 60 * 60 * 1000;

exports.creditoMenta = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError(
        "unauthenticated", "Inicia sesión para usar el crédito de Menta.");
  }

  const data = request.data || {};
  const operation = data.operation;
  if (!["solicitar", "saldar"].includes(operation)) {
    throw new HttpsError(
        "invalid-argument", "Operación no válida.");
  }

  const userRef = admin.firestore().collection("usuarios")
      .doc(request.auth.uid);
  const comercioRef = userRef.collection("comercio").doc("estado");
  const now = Date.now();

  return admin.firestore().runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef);
    const comercioSnap = await tx.get(comercioRef);
    const userData = userSnap.exists ? userSnap.data() : {};
    const comercioData = comercioSnap.exists ? comercioSnap.data() : (userData.comercio || {});
    const dinero = Number.isFinite(userData.dinero) ? userData.dinero : 0;
    const credito = comercioData.mentaCredito;

    if (operation === "solicitar") {
      const principal = Number(data.amount);
      if (!MENTA_PRESTAMOS.includes(principal)) {
        throw new HttpsError(
            "invalid-argument", "Importe de préstamo no disponible.");
      }
      if (credito && credito.activo && credito.restante > 0) {
        throw new HttpsError(
            "failed-precondition", "Primero debes saldar tu crédito actual.");
      }

      const total = Math.ceil(principal * (1 + MENTA_INTERES));
      const creditoId = `${request.auth.uid}-${now}`;
      const nuevoCredito = {
        creditoId,
        activo: true,
        principal,
        restante: total,
        interes: MENTA_INTERES,
        recargo: MENTA_RECARGO,
        vencimientoMs: now + MENTA_PLAZO_MS,
        recargoAplicado: false,
        emitidoEn: now,
      };
      tx.set(userRef, {dinero: dinero + principal}, {merge: true});
      tx.set(comercioRef, {...comercioData, mentaCredito: nuevoCredito}, {merge: true});
      const diaKey = new Date(now).toISOString().slice(0, 10);
      tx.set(admin.firestore().collection("buzon")
          .doc(`mentita-deuda-${request.auth.uid}-${diaKey}`), {
        para: request.auth.uid,
        tipo: "deuda",
        creditoId,
        fase: "aviso",
        deudaDia: diaKey,
        creadoEn: admin.firestore.FieldValue.serverTimestamp(),
        expiraEn: buzonExpiration(),
        leido: false,
        texto: "Mentita te deja un aviso con cariño: tienes una deuda pendiente. Cuando puedas, recuerda saldarla.",
      }, {merge: true});
      return {ok: true, credito: nuevoCredito, dinero: dinero + principal};
    }

    if (!credito || !credito.activo ||
        !Number.isFinite(credito.restante) || credito.restante <= 0) {
      throw new HttpsError(
          "failed-precondition", "No tienes una deuda activa con Menta.");
    }

    const vencido = now > credito.vencimientoMs;
    const restanteConRecargo = vencido && !credito.recargoAplicado ?
      Math.ceil(credito.restante * (1 + MENTA_RECARGO)) : credito.restante;
    const abonoSolicitado = Number(data.amount);
    if (!Number.isInteger(abonoSolicitado) || abonoSolicitado <= 0) {
      throw new HttpsError(
          "invalid-argument", "El abono debe ser un número entero positivo.");
    }
    const abono = Math.min(abonoSolicitado, restanteConRecargo);
    if (dinero < abono) {
      throw new HttpsError(
          "failed-precondition",
          "No tienes monedas suficientes para este abono.");
    }

    const restante = restanteConRecargo - abono;
    const creditoActualizado = {
      ...credito,
      restante,
      recargoAplicado: credito.recargoAplicado || vencido,
      activo: restante > 0,
      saldadoEn: restante === 0 ? now : null,
    };
    let avisosSnap = null;
    if (restante === 0 && credito.creditoId) {
      avisosSnap = await tx.get(admin.firestore().collection("buzon")
          .where("para", "==", request.auth.uid)
          .where("tipo", "==", "deuda")
          .where("creditoId", "==", credito.creditoId));
    }
    if (restante === 0) {
      const saldoAvisoRef = admin.firestore().collection("buzon").doc();
      tx.set(saldoAvisoRef, {
        para: request.auth.uid,
        tipo: "deuda_saldada",
        creadoEn: admin.firestore.FieldValue.serverTimestamp(),
        expiraEn: buzonExpiration(),
        leido: false,
        creditoId: credito.creditoId || null,
        texto: "Deuda saldada. Mentita respira tranquila... por ahora.",
      });
    }
    tx.set(userRef, {dinero: dinero - abono}, {merge: true});
    tx.set(comercioRef, {...comercioData, mentaCredito: creditoActualizado}, {merge: true});
    if (avisosSnap) avisosSnap.docs.forEach((aviso) => tx.delete(aviso.ref));
    return {ok: true, restante, dinero: dinero - abono, vencido};
  });
});

// Regalos entre pareja: el servidor valida y mueve el regalo de forma atómica.
exports.regaloPareja = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const data = request.data || {};
  const tipo = data.tipo;
  const cantidad = Number(data.cantidad);
  const permitidos = ["dinero", "diamantes", "cartasAnimalitos"];
  const esUnico = tipo === "icono" || tipo === "traje";
  const itemId = typeof data.itemId === "string" ? data.itemId : "";
  if ((!permitidos.includes(tipo) && !esUnico) ||
      (!esUnico && (!Number.isInteger(cantidad) || cantidad < 1)) ||
      (esUnico && !itemId)) {
    throw new HttpsError("invalid-argument", "Regalo no válido.");
  }

  const db = admin.firestore();
  const remitenteRef = db.collection("usuarios").doc(request.auth.uid);
  return db.runTransaction(async (tx) => {
    const remitenteSnap = await tx.get(remitenteRef);
    if (!remitenteSnap.exists) {
      throw new HttpsError("not-found", "Usuario no encontrado.");
    }
    const remitente = remitenteSnap.data();
    if (!remitente.pareja) {
      throw new HttpsError("failed-precondition", "Necesitas una pareja.");
    }
    const destinoRef = db.collection("usuarios").doc(remitente.pareja);
    const destinoSnap = await tx.get(destinoRef);
    if (!destinoSnap.exists || destinoSnap.data().pareja !== request.auth.uid) {
      throw new HttpsError(
          "failed-precondition", "La pareja ya no está vinculada.");
    }
    if (esUnico) {
      const campo = tipo === "icono" ? "iconosDesbloqueados" :
        "skinsDesbloqueadas";
      const origen = remitente[campo] || {};
      const tieneObjeto = tipo === "icono" ? origen[itemId] :
        origen.halcon && origen.halcon[itemId];
      if (!tieneObjeto) {
        throw new HttpsError("failed-precondition", "No tienes ese objeto.");
      }
      if (tipo === "icono") {
        const nuevoOrigen = {...origen};
        delete nuevoOrigen[itemId];
        tx.update(remitenteRef, {[campo]: nuevoOrigen});
      } else {
        const nuevoOrigen = {...origen, halcon: {...(origen.halcon || {})}};
        delete nuevoOrigen.halcon[itemId];
        tx.update(remitenteRef, {[campo]: nuevoOrigen});
      }
    } else {
      const disponible = Number(remitente[tipo] || 0);
      if (disponible < cantidad) {
        throw new HttpsError(
            "failed-precondition", "No tienes suficiente para regalar.");
      }
      tx.update(remitenteRef, {[tipo]: disponible - cantidad});
      // El destinatario lo acreditará desde Recompensas al reclamarlo.
    }
    const mensaje = {tipo: "regalo", regaloTipo: tipo,
      itemId: esUnico ? itemId : null, cantidad: esUnico ? 1 : cantidad,
      de: request.auth.uid,
      creadoEn: admin.firestore.FieldValue.serverTimestamp(), leido: false};
    tx.set(db.collection("regalos_pareja").doc(), {...mensaje,
      para: destinoRef.id, reclamado: false, expiraEn: buzonExpiration()});
    tx.set(db.collection("buzon").doc(), {...mensaje, para: remitenteRef.id,
      expiraEn: buzonExpiration(), texto: "Tu regalo fue enviado a tu pareja."});
    return {ok: true};
  });
});

exports.reclamarRegaloPareja = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión.");
  const regaloId = String((request.data || {}).regaloId || "");
  if (!regaloId) throw new HttpsError("invalid-argument", "Regalo inválido.");
  const db = admin.firestore();
  const regaloRef = db.collection("regalos_pareja").doc(regaloId);
  const usuarioRef = db.collection("usuarios").doc(request.auth.uid);
  return db.runTransaction(async (tx) => {
    const regaloSnap = await tx.get(regaloRef);
    const usuarioSnap = await tx.get(usuarioRef);
    const regalo = regaloSnap.data();
    if (!regaloSnap.exists || regalo.para !== request.auth.uid || regalo.reclamado) {
      throw new HttpsError("not-found", "Ese regalo ya no está disponible.");
    }
    if (regalo.expiraEn && regalo.expiraEn.toMillis() <= Date.now()) {
      throw new HttpsError("deadline-exceeded", "Ese regalo ya expiró.");
    }
    const usuario = usuarioSnap.data() || {};
    if (["dinero", "diamantes", "cartasAnimalitos"].includes(regalo.regaloTipo)) {
      tx.update(usuarioRef, {[regalo.regaloTipo]: Number(usuario[regalo.regaloTipo] || 0) + regalo.cantidad});
    } else if (regalo.regaloTipo === "icono") {
      tx.update(usuarioRef, {iconosDesbloqueados: {...(usuario.iconosDesbloqueados || {}), [regalo.itemId]: true}});
    } else if (regalo.regaloTipo === "traje") {
      const skins = usuario.skinsDesbloqueadas || {};
      tx.update(usuarioRef, {skinsDesbloqueadas: {...skins, halcon: {
        ...(skins.halcon || {}), [regalo.itemId]: true}}});
    }
    tx.update(regaloRef, {reclamado: true, reclamadoEn: admin.firestore.FieldValue.serverTimestamp()});
    return {ok: true};
  });
});

// Canje de códigos: toda la validación y entrega ocurre en una transacción.
// "usos" representa cuántas personas distintas pueden usar el código.
exports.canjearCodigo = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Inicia sesión para canjear un código.");
  const codigo = String((request.data || {}).codigo || "").trim().toUpperCase();
  if (!codigo || codigo.length > 32) throw new HttpsError("invalid-argument", "Código no válido.");

  const db = admin.firestore();
  const codeQuery = db.collection("codigos").where("codigo", "==", codigo).limit(1);
  return db.runTransaction(async (tx) => {
    const codeSnap = await tx.get(codeQuery);
    if (codeSnap.empty) throw new HttpsError("not-found", "Código no encontrado.");
    const codeRef = codeSnap.docs[0].ref;
    const code = codeSnap.docs[0].data();
    const reclamadoPor = Array.isArray(code.reclamadoPor) ? code.reclamadoPor : [];
    const usos = Math.max(1, Number(code.usos) || 1);
    if (reclamadoPor.includes(request.auth.uid)) {
      throw new HttpsError("already-exists", "Ya usaste este código.");
    }
    if (reclamadoPor.length >= usos) {
      throw new HttpsError("resource-exhausted", "Este código ya alcanzó sus usos por persona.");
    }
    if (code.expiraDias && code.creadoEn) {
      const creadoMs = code.creadoEn.toMillis ? code.creadoEn.toMillis() : Date.parse(code.creadoEn);
      if (Date.now() > creadoMs + Number(code.expiraDias) * 86400000) {
        throw new HttpsError("deadline-exceeded", "Este código ya expiró.");
      }
    }

    const userRef = db.collection("usuarios").doc(request.auth.uid);
    const userSnap = await tx.get(userRef);
    const user = userSnap.data() || {};
    const tipo = code.recompensaTipo || "dinero";
    const cantidadBase = code.recompensaCantidad !== undefined ? code.recompensaCantidad : code.recompensa;
    const cantidad = Math.max(1, Number(cantidadBase) || 0);
    if (!cantidad || !["dinero", "exp", "cartasAnimalitos", "icono"].includes(tipo)) {
      throw new HttpsError("failed-precondition", "La recompensa del código no es válida.");
    }

    const updates = {};
    if (tipo === "dinero" || tipo === "exp" || tipo === "cartasAnimalitos") {
      updates[tipo] = (Number(user[tipo]) || 0) + cantidad;
    } else {
      const itemId = String(code.recompensaItemId || "").trim();
      if (!itemId) throw new HttpsError("failed-precondition", "El icono de este código no está configurado.");
      updates.iconosDesbloqueados = {...(user.iconosDesbloqueados || {}), [itemId]: true};
    }
    tx.set(userRef, updates, {merge: true});
    tx.update(codeRef, {reclamadoPor: [...reclamadoPor, request.auth.uid]});
    return {ok: true, recompensa: {tipo, cantidad, itemId: code.recompensaItemId || null}};
  });
});

// Conserva el buzón liviano sin depender de que el usuario abra la pantalla.
// Los avisos llevan su propia fecha de expiración y se eliminan en lotes para
// respetar el límite de operaciones de cada batch de Firestore.
exports.limpiarBuzonExpirado = onSchedule({
  schedule: "every 24 hours",
  timeZone: "America/Argentina/Buenos_Aires",
}, async () => {
  const db = admin.firestore();
  const ahora = admin.firestore.Timestamp.now();
  let total = 0;
  const limpiarColeccion = async (nombre, campoFecha, limite = ahora) => {
    let continuar = true;
    while (continuar) {
      const snap = await db.collection(nombre)
          .where(campoFecha, "<=", limite)
          .limit(450)
          .get();
      if (snap.empty) {
        continuar = false;
        continue;
      }
      const batch = db.batch();
      snap.docs.forEach((item) => batch.delete(item.ref));
      await batch.commit();
      total += snap.size;
      if (snap.size < 450) continuar = false;
    }
  };
  await limpiarColeccion("buzon", "expiraEn");
  await limpiarColeccion("regalos_pareja", "expiraEn");
  // Compatibilidad con avisos antiguos creados antes de expiraEn.
  const corteAntiguo = admin.firestore.Timestamp.fromMillis(Date.now() - BUZON_RETENTION_MS);
  await limpiarColeccion("buzon", "creadoEn", corteAntiguo);
  await limpiarColeccion("regalos_pareja", "creadoEn", corteAntiguo);
  logger.info("[Buzon] Avisos expirados eliminados", {total});
  return null;
});

// Funciona también cuando la temporada se cambia desde Firestore.
// Solo escribe si cambia Temporada, para no entrar en un bucle al actualizar
// el propio timestamp.
exports.actualizarFechaTemporada = onDocumentUpdated(
    "Temporada/actual",
    async (event) => {
      const antes = event.data.before.data() || {};
      const despues = event.data.after.data() || {};
      if (antes.Temporada === despues.Temporada) return null;

      await event.data.after.ref.update({
        actualizadaEn: admin.firestore.FieldValue.serverTimestamp(),
      });
      logger.info("[Temporada] Cambio detectado", {
        temporada: despues.Temporada,
      });
      return null;
    },
);
