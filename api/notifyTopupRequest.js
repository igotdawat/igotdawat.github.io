import admin, { db } from './firebase-init.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.headers.authorization?.split('Bearer ')[1];
  if (!token) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }

  let decodedToken;
  try {
    decodedToken = await admin.auth().verifyIdToken(token);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const { userName, amount, bankRef } = req.body;

  try {
    // Create admin notification using Admin SDK (bypasses user permissions)
    await db.collection('notifications').add({
      userId: "",
      userEmail: "",
      audience: "admin",
      message:
        "Top-up requested\n" +
        "From: " + (userName || "Unknown") + "\n" +
        "Amount: " + amount + " BDT\n" +
        "Bank ref: " + bankRef,
      link: "topups-admin#pending",
      linkText: "Review",
      type: "topup-requested",
      read: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Notify topup error:', error);
    return res.status(500).json({ error: error.message || 'Failed to notify' });
  }
}
