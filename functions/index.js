const functions = require("firebase-functions");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {fetch} = require("undici");

admin.initializeApp();

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
