import * as admin from 'firebase-admin';

// import serviceaccount from "../../service_account.json";
const serviceaccount = require("../../service_account.json") as admin.ServiceAccount;

admin.initializeApp({
  credential: admin.credential.cert(serviceaccount),
  storageBucket:"gs://leazoo.appspot.com"
});



export async function sendPushNotification(token: string, title: string, body: string) {
  const message = {
    notification: {
      title: title,
      body: body,
    },
    token: token,
  };

  try {
    const response = await admin.messaging().send(message);
    // console.log('Successfully sent message:', response);
  } catch (error) {
    console.error('Error sending message:', error);
  }
}

