import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.join(process.cwd(), "service_account.json");

if (fs.existsSync(serviceAccountPath)) {
  const serviceaccount = require(serviceAccountPath) as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(serviceaccount),
    storageBucket: "gs://leazoo.appspot.com"
  });
} else {
  if (process.env.NODE_ENV !== 'test') {
    console.warn("service_account.json not found. Push notifications will be disabled.");
  }
}



export async function sendPushNotification(token: string, title: string, body: string) {
  if (admin.apps.length === 0) {
    if (process.env.NODE_ENV !== 'test') {
      console.log('Firebase not initialized. Skipping notification.');
    }
    return;
  }

  const message = {
    notification: {
      title: title,
      body: body,
    },
    data: {
      click_action: 'FLUTTER_NOTIFICATION_CLICK',
      message_body: body,
    },
    token: token,
  };
  try {
    const response = await admin.messaging().send(message);
    console.log('Successfully sent notification:');
  } catch (error: any) {
    console.error('Error sending message:', error);
    if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
      console.log(`Clearing invalid FCM token: ${token}`);
      try {
        const mongoose = await import('mongoose');
        await mongoose.model('User').updateOne({ deviceToken: token }, { $unset: { deviceToken: "" } });
      } catch (dbError) {
        console.error('Failed to clear invalid FCM token from database:', dbError);
      }
    }
  }
}

