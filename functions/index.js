/**
 * Import function triggers from their respective submodules:
 *
 * const {onCall} = require("firebase-functions/v2/https");
 * const {onDocumentWritten} = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {fetch} = require("undici");

admin.initializeApp();

exports.sendPushyNotification = functions.https.onCall(
    async (data, context) => {
      logger.info("[PUSHY] Received data:", data);

      const {token, title, body} = data.data || data;

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

      logger.info("[PUSHY] Sending to token:", token.substring(0, 10) + "...");
      logger.info("[PUSHY] Message:", {title, body});

      try {
        const payload = {
          to: token,
          notification: {
            title,
            body,
          },
          data: {
            title,
            message: body,
          },
        };

        logger.info("[PUSHY] Payload:", JSON.stringify(payload));

        const apiUrl = `https://api.pushy.me/push?api_key=${apiSecret}`;
        logger.info("[PUSHY] Calling API:", apiUrl.replace(apiSecret, "***"));

        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {"Content-Type": "application/json"},
          body: JSON.stringify(payload),
        });

        logger.info("[PUSHY] Response status:", response.status);

        const result = await response.json();
        logger.info("[PUSHY] Response body:", result);

        if (!response.ok) {
          logger.error("[PUSHY] API returned error:", result);
          throw new Error(`Pushy API error: ${JSON.stringify(result)}`);
        }

        return {success: true, result};
      } catch (error) {
        logger.error("[PUSHY] Error sending notification:", error);
        throw new functions.https.HttpsError("internal", error.message);
      }
    });
