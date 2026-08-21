/* eslint-disable max-len */
const functions = require("firebase-functions");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {fetch} = require("undici");

admin.initializeApp();

const BUZON_RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const buzonExpiration = () => admin.firestore.Timestamp.fromMillis(Date.now() + BUZON_RETENTION_MS);

exports.sendPushyNotification = functions.https.onCall(
    async (data, context) => {
      logger.info("[PUSHY] Received data:", data);

      const {
        token,
        title,
        body,
        data: payloadData,
        collapseKey,
      } = data.data || data;

      if (!token || !title || !body) {
        logger.error("[PUSHY] Missing fields:", {token, title, body});
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Missing required fields",
        );
      }

      const apiSecret = process.env.PUSHY_API_SECRET;
      if (!apiSecret) {
        logger.error("[PUSHY] API secret for Pushy is not configured");
        throw new functions.https.HttpsError(
            "failed-precondition",
            "Pushy API not configured",
        );
      }

      const FIRESTORE_WINDOW_MS = 120 * 1000; // 120s window
      const MAX_PENDING_PER_TOKEN = 2;
      const db = admin.firestore();
      const docRef = db.collection("pushy_recent").doc(token);

      logger.info("[PUSHY] Pre-send check for token:",
          token.substring(0, 10) + "...");
      logger.info("[PUSHY] collapseKey:",
          {collapseKey});

      try {
        await db.runTransaction(async (tx) => {
          const snap = await tx.get(docRef);
          let sends = [];
          const now = Date.now();
          const cutoff = FIRESTORE_WINDOW_MS;
          if (snap.exists) {
            sends = snap.data().sends || [];
            sends = sends.filter((s) => (now - s.ts) < cutoff);
          }

          if (collapseKey) {
            const idx = sends.findIndex((s) => s.collapseKey === collapseKey);
            if (idx !== -1) {
              sends[idx].ts = now;
              tx.set(docRef, {sends}, {merge: true});
              logger.info("[PUSHY] CollapseKey present");
              logger.info("[PUSHY] Updated timestamp in Firestore");
              logger.info("[PUSHY] Skipping duplicate send", {collapseKey});
              return;
            }
          }

          if (sends.length >= MAX_PENDING_PER_TOKEN) {
            logger.warn("[PUSHY] Token exceeded max pending sends in window");
            const tokenPreview = token.substring(0, 10) + "...";
            logger.warn("[PUSHY] token:", tokenPreview);
            logger.warn("[PUSHY] pending:",
                {pending: sends.length});
            throw new functions.https.HttpsError(
                "resource-exhausted",
                "queue_limit_reached",
            );
          }

          sends.push({
            collapseKey: collapseKey || null,
            ts: now,
          });
          tx.set(docRef, {sends}, {merge: true});
          logger.info("[PUSHY] Registered pending send in Firestore");
          logger.info("[PUSHY] token:",
              token.substring(0, 10) + "...");
          logger.info("[PUSHY] pending:",
              {pending: sends.length});
        });
      } catch (err) {
        if (err instanceof functions.https.HttpsError) throw err;
        logger.error("[PUSHY] Transaction error:", err);
        throw new functions.https.HttpsError("internal", "transaction_failed");
      }

      logger.info("[PUSHY] Sending to token:",
          token.substring(0, 10) + "...");
      logger.info("[PUSHY] Message:",
          {title: title, body: body});

      try {
        const dataObj = Object.assign({
          title: title,
          message: body,
        }, (payloadData || {}));

        const payload = {
          to: token,
          notification: {
            title: title,
            body: body,
          },
          data: dataObj,
          ...(collapseKey ? {collapse_key: collapseKey} : {}),
        };

        const bodyStr = JSON.stringify(payload);
        logger.info("[PUSHY] Payload:", bodyStr);

        const apiUrl = `https://api.pushy.me/push?api_key=${apiSecret}`;
        logger.info("[PUSHY] Calling API:", apiUrl.replace(apiSecret, "***"));

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: bodyStr,
        });

        logger.info("[PUSHY] Response status:", response.status);

        const result = await response.json();
        logger.info("[PUSHY] Response body:", result);

        if (!response.ok) {
          logger.error("[PUSHY] API returned error:", result);
          throw new Error(`Pushy API error: ${JSON.stringify(result)}`);
        }

        try {
          await db.runTransaction(async (tx) => {
            const snap = await tx.get(docRef);
            if (!snap.exists) return;
            let sends = snap.data().sends || [];
            const now = Date.now();
            sends = sends.filter((s) => (now - s.ts) < FIRESTORE_WINDOW_MS);
            let removed = false;
            if (collapseKey) {
              const idx = sends.findIndex((s) => s.collapseKey === collapseKey);
              if (idx !== -1) {
                // Keep the collapseKey entry to preserve duplicate suppression
                // for the rest of the window and refresh its timestamp.
                sends[idx].ts = now;
                removed = true;
              }
            }
            if (!removed && sends.length > 0) {
              sends.shift();
            }
            tx.set(docRef, {sends}, {merge: true});
            logger.info("[PUSHY] Updated pending send after successful push");
            logger.info("[PUSHY] token:", token.substring(0, 10) + "...");
            logger.info("[PUSHY] remaining:", {remaining: sends.length});
          });
        } catch (cleanupErr) {
          logger.warn(
              "[PUSHY] Failed updating pending entry after send:",
              cleanupErr,
          );
        }

        return {success: true, result};
      } catch (error) {
        logger.error("[PUSHY] Error sending notification:", error);
        throw new functions.https.HttpsError("internal", error.message);
      }
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
