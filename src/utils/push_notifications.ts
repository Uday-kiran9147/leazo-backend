import * as admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { logger } from './logger';

const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  ? path.resolve(process.cwd(), process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
  : path.join(process.cwd(), "service_account.json");

if (fs.existsSync(serviceAccountPath)) {
  const serviceaccount = require(serviceAccountPath) as admin.ServiceAccount;
  admin.initializeApp({
    credential: admin.credential.cert(serviceaccount),
    storageBucket: "gs://leazoo.appspot.com"
  });
} else {
  if (process.env.NODE_ENV !== 'test') {
    logger.warn("service_account.json not found. Push notifications will be disabled.");
  }
}



export async function sendPushNotification(token: string, title: string, body: string) {
  if (admin.apps.length === 0) {
    if (process.env.NODE_ENV !== 'test') {
      logger.info('Firebase not initialized. Skipping notification.');
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
    logger.debug('Successfully sent notification to:', token);
  } catch (error: any) {
    logger.error('Error sending message:', error);
    if (error.errorInfo?.code === 'messaging/registration-token-not-registered') {
      logger.warn(`Clearing invalid FCM token: ${token}`);
      try {
        const mongoose = await import('mongoose');
        await mongoose.model('User').updateOne({ deviceToken: token }, { $unset: { deviceToken: "" } });
      } catch (dbError) {
        logger.error('Failed to clear invalid FCM token from database:', dbError);
      }
    }
  }
}

