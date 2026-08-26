package com.leitof7.amor

import me.pushy.sdk.Pushy
import android.content.Intent
import android.graphics.Color
import android.content.Context
import android.app.PendingIntent
import android.media.RingtoneManager
import android.app.NotificationManager
import android.content.BroadcastReceiver
import androidx.core.app.NotificationCompat

class PushReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        // Attempt to extract the "title" property from the data payload, or fallback to app shortcut label
        val notificationTitle = intent.getStringExtra("title") 
            ?: context.packageManager.getApplicationLabel(context.applicationInfo).toString()

        // Attempt to extract the "message" property from the data payload: {"message":"Hello World!"}
        val notificationText = intent.getStringExtra("message") ?: "Test notification"

        // Prepare a notification with vibration, sound and lights
        val builder = NotificationCompat.Builder(context)
            .setAutoCancel(true)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(notificationTitle)
            .setContentText(notificationText)
            .setLights(Color.RED, 1000, 1000)
            .setVibrate(longArrayOf(0, 400, 250, 400))
            .setSound(RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION))
            .setContentIntent(
                PendingIntent.getActivity(
                    context, 
                    0, 
                    Intent(context, MainActivity::class.java), 
                    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
                )
            )

        // Automatically configure a Notification Channel for devices running Android O+
        Pushy.setNotificationChannel(builder, context)

        // Get an instance of the NotificationManager service
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        // Build the notification and display it 
        // Use a random notification ID so multiple notifications don't overwrite each other
        notificationManager.notify((Math.random() * 100000).toInt(), builder.build())
    }
}
