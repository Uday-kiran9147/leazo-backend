import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const serviceAccountPath = path.join(__dirname, "../../service_account.json");

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
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

