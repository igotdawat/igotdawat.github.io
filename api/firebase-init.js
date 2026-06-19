import admin from 'firebase-admin';

// Initialize Firebase Admin with service account from env var
if (!admin.apps.length) {
  const credentials = JSON.parse(process.env.GOOGLE_APPLICATION_CREDENTIALS || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(credentials),
    projectId: process.env.FIREBASE_PROJECT_ID,
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`
  });
}

export const db = admin.firestore();
export default admin;
