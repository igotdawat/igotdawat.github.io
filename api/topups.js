import admin, { db } from './firebase-init.js';
import { ADMIN_EMAILS } from '../js/admin-config.js';
import { notifyAdminsInternal } from './admin.js';

async function sendEmailUser(to, subject, body) {
  try {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: 'igotdawat@gmail.com' },
        subject,
        content: [{ type: 'text/plain', value: body }]
      })
    });
    if (!response.ok) {
      throw new Error(`SendGrid returned HTTP ${response.status}`);
    }
  } catch (err) {
    console.error('Email error:', err);
  }
}

async function createTopupRequest(req, res, decodedToken) {
  const userId = decodedToken.uid;
  const userEmail = decodedToken.email;
  const { amount, bankRef } = req.body;

  if (typeof amount !== 'number' || !Number.isFinite(amount) || !Number.isInteger(amount) || amount < 100 || amount > 10000) {
    return res.status(400).json({ error: 'Invalid amount' });
  }

  if (!bankRef || typeof bankRef !== 'string') {
    return res.status(400).json({ error: 'Invalid bank reference' });
  }

  try {
    const pendingTopups = await db.collection('topups')
      .where('userId', '==', userId)
      .where('status', '==', 'pending')
      .get();

    if (pendingTopups.size >= 2) {
      return res.status(400).json({ error: 'You can only have 2 pending topup requests at a time' });
    }

    let appSnap = await db.collection('applications')
      .where('userId', '==', userId)
      .limit(1)
      .get();

    // Fallback to email query if userId not found (for new users before first order/topup)
    if (appSnap.empty) {
      appSnap = await db.collection('applications')
        .where('email', '==', userEmail.toLowerCase())
        .limit(1)
        .get();
    }

    if (appSnap.empty || appSnap.docs[0].data().status !== 'approved') {
      return res.status(403).json({ error: 'Your application is not approved yet' });
    }

    const topupRef = await db.collection('topups').add({
      userId,
      userEmail: userEmail.toLowerCase(),
      amount: Number(amount),
      bankRef: String(bankRef).substring(0, 100),
      status: 'pending',
      requestedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // Get user's name from application record
    let userName = '';
    try {
      const appSnap = await db.collection('applications')
        .where('email', '==', userEmail.toLowerCase())
        .limit(1)
        .get();
      if (!appSnap.empty) {
        userName = appSnap.docs[0].data().name || '';
      }
    } catch (e) {
      // If lookup fails, continue without name
    }

    const byLabel = userName ? `${userName} (${userEmail})` : userEmail;

    await notifyAdminsInternal({
      message: `Top-up requested\nFrom: ${byLabel}\nAmount: ৳${amount}\nBank ref: ${bankRef}`,
      link: 'topups-admin#pending',
      linkText: 'Review',
      type: 'topup-requested'
    }).catch(error => console.error('Top-up notification failed:', error));

    try {
      await sendEmailUser(
        'igotdawat@gmail.com',
        'Top-up request',
        `New top-up request\n\nFrom: ${byLabel}\nAmount: ৳${amount}\nBank ref: ${bankRef}\n\nPlease review in the admin panel.\n\nBest regards,\nDawat`
      );
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }

    return res.status(200).json({
      success: true,
      topupId: topupRef.id
    });
  } catch (error) {
    const { sendErrorResponse } = await import('./error-handler.js');
    return sendErrorResponse(res, error, 'Failed to create top-up request');
  }
}

async function confirmTopup(req, res, decodedToken) {
  const adminEmail = decodedToken.email;
  const { topupId } = req.body;

  if (!ADMIN_EMAILS.map(e => e.toLowerCase()).includes((adminEmail || '').toLowerCase())) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!topupId) {
    return res.status(400).json({ error: 'Missing topupId' });
  }

  try {
    let topupData = null;
    const result = await db.runTransaction(async (transaction) => {
      const topupRef = db.collection('topups').doc(topupId);
      const topupSnap = await transaction.get(topupRef);

      if (!topupSnap.exists) {
        throw new Error('TOPUP_NOT_FOUND');
      }

      const topup = topupSnap.data();
      topupData = topup;

      if (topup.status !== 'pending') {
        return { alreadyHandled: true, status: topup.status };
      }

      const amount = Number(topup.amount || 0);
      if (amount <= 0) {
        throw new Error('Invalid topup amount');
      }

      const walletRef = db.collection('wallets').doc(topup.userId);
      const walletSnap = await transaction.get(walletRef);
      const currentBalance = walletSnap.exists ? Number(walletSnap.data().balance || 0) : 0;
      const newBalance = currentBalance + amount;

      transaction.set(walletRef, {
        balance: newBalance,
        email: topup.userEmail,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });

      const historyRef = db.collection('walletHistory').doc();
      transaction.set(historyRef, {
        userId: topup.userId,
        userEmail: topup.userEmail,
        type: 'topup',
        amount,
        balanceAfter: newBalance,
        ref: topupId,
        note: "BRAC ref " + (topup.bankRef || ""),
        byAdmin: adminEmail.toLowerCase(),
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.update(topupRef, {
        status: 'confirmed',
        confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
        adminEmail: adminEmail.toLowerCase()
      });

      return {
        alreadyHandled: false,
        status: 'confirmed',
        balance: newBalance
      };
    });

    try {
      await sendEmailUser(
        topupData.userEmail,
        'Top-up confirmed',
        `Your top-up of ৳${topupData.amount} has been confirmed.\n\nYour new wallet balance: ৳${result.balance}\n\nBest regards,\nDawat`
      );
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }

    return res.status(200).json(result);
  } catch (error) {
    const { sendErrorResponse } = await import('./error-handler.js');
    return sendErrorResponse(res, error, 'Failed to confirm top-up');
  }
}

async function rejectTopup(req, res, decodedToken) {
  const adminEmail = decodedToken.email;
  const { topupId } = req.body;

  if (!ADMIN_EMAILS.map(e => e.toLowerCase()).includes((adminEmail || '').toLowerCase())) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  if (!topupId) {
    return res.status(400).json({ error: 'Missing topupId' });
  }

  try {
    let topupData = null;
    const result = await db.runTransaction(async (transaction) => {
      const topupRef = db.collection('topups').doc(topupId);
      const topupSnap = await transaction.get(topupRef);

      if (!topupSnap.exists) {
        throw new Error('TOPUP_NOT_FOUND');
      }

      const topup = topupSnap.data();
      topupData = topup;

      if (topup.status !== 'pending') {
        return { alreadyHandled: true, status: topup.status };
      }

      transaction.update(topupRef, {
        status: 'rejected',
        rejectedAt: admin.firestore.FieldValue.serverTimestamp(),
        adminEmail: adminEmail.toLowerCase()
      });

      return {
        alreadyHandled: false,
        status: 'rejected'
      };
    });

    try {
      await sendEmailUser(
        topupData.userEmail,
        'Top-up declined',
        `Your top-up request of ৳${topupData.amount} has been declined.\n\nPlease contact support if you have questions.\n\nBest regards,\nDawat`
      );
    } catch (emailErr) {
      console.error('Email send failed:', emailErr);
    }

    return res.status(200).json(result);
  } catch (error) {
    const { sendErrorResponse } = await import('./error-handler.js');
    return sendErrorResponse(res, error, 'Failed to reject top-up');
  }
}

async function createCashTopup(req, res, decodedToken) {
  const adminEmail = (decodedToken.email || '').toLowerCase();
  if (!ADMIN_EMAILS.map(email => email.toLowerCase()).includes(adminEmail)) {
    return res.status(403).json({ error: 'Unauthorized' });
  }

  const userEmail = typeof req.body.userEmail === 'string'
    ? req.body.userEmail.trim().toLowerCase()
    : '';
  const requestId = req.body.requestId;
  const amount = req.body.amount;
  const note = req.body.note === undefined ? '' : req.body.note;

  if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{20}$/.test(requestId)) {
    return res.status(400).json({ error: 'Invalid cash payment request ID' });
  }
  if (!userEmail || userEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userEmail)) {
    return res.status(400).json({ error: 'Invalid customer email' });
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) ||
      !Number.isInteger(amount) || amount < 100 || amount > 10000) {
    return res.status(400).json({ error: 'Amount must be between 100 and 10000 Tk' });
  }
  if (typeof note !== 'string' || note.length > 160) {
    return res.status(400).json({ error: 'Note must be 160 characters or fewer' });
  }

  try {
    const appSnap = await db.collection('applications')
      .where('email', '==', userEmail)
      .limit(10)
      .get();
    if (!appSnap.docs.some(doc => doc.data().status === 'approved')) {
      return res.status(403).json({ error: 'Customer application is not approved' });
    }

    const customer = await admin.auth().getUserByEmail(userEmail);
    if (customer.disabled) {
      return res.status(403).json({ error: 'Customer account is disabled' });
    }

    const topupRef = db.collection('topups').doc(requestId);
    const walletRef = db.collection('wallets').doc(customer.uid);
    const historyRef = db.collection('walletHistory').doc();
    const notificationRef = db.collection('notifications').doc();
    const result = await db.runTransaction(async transaction => {
      const topupSnap = await transaction.get(topupRef);
      const walletSnap = await transaction.get(walletRef);
      const currentBalance = walletSnap.exists ? Number(walletSnap.data().balance || 0) : 0;
      if (!Number.isFinite(currentBalance)) {
        throw new Error('Invalid wallet balance');
      }
      if (topupSnap.exists) {
        const existing = topupSnap.data();
        if (existing.paymentMethod !== 'cash' || existing.userId !== customer.uid) {
          return { conflict: true };
        }
        return {
          success: true,
          alreadyHandled: true,
          topupId: topupRef.id,
          userEmail: existing.userEmail,
          amount: Number(existing.amount),
          balance: Number(existing.balanceAfter)
        };
      }
      const newBalance = currentBalance + amount;
      if (!Number.isFinite(newBalance)) {
        throw new Error('Invalid wallet balance');
      }
      const timestamp = admin.firestore.FieldValue.serverTimestamp();
      const historyNote = note ? `Cash payment · ${note}` : 'Cash payment';
      const message = [
        'Top-up confirmed',
        `Amount: ৳${amount}`,
        'Payment method: Cash',
        `Added by: ${adminEmail}`,
        `New wallet balance: ৳${newBalance}`
      ].join('\n');

      transaction.set(walletRef, {
        balance: newBalance,
        email: userEmail,
        updatedAt: timestamp
      }, { merge: true });
      transaction.set(topupRef, {
        userId: customer.uid,
        userEmail,
        amount,
        paymentMethod: 'cash',
        bankRef: '',
        note,
        status: 'confirmed',
        requestedAt: timestamp,
        confirmedAt: timestamp,
        adminEmail,
        balanceAfter: newBalance
      });
      transaction.set(historyRef, {
        userId: customer.uid,
        userEmail,
        type: 'topup',
        paymentMethod: 'cash',
        amount,
        balanceAfter: newBalance,
        ref: topupRef.id,
        note: historyNote,
        byAdmin: adminEmail,
        createdAt: timestamp
      });
      transaction.set(notificationRef, {
        userId: customer.uid,
        userEmail,
        audience: 'user',
        message,
        link: 'wallet#history',
        linkText: 'View wallet',
        type: 'topup-confirmed',
        read: false,
        createdAt: timestamp
      });

      return {
        success: true,
        alreadyHandled: false,
        topupId: topupRef.id,
        userEmail,
        amount,
        balance: newBalance
      };
    });

    if (result.conflict) {
      return res.status(409).json({ error: 'This request ID is already in use. Submit the payment again.' });
    }

    if (!result.alreadyHandled) {
      await sendEmailUser(
        userEmail,
        'Cash payment added to your wallet',
        `A cash payment of ৳${amount} has been added to your wallet.\n\nPayment method: Cash\nAdded by: ${adminEmail}\nYour new wallet balance: ৳${result.balance}\n\nBest regards,\nDawat`
      );
    }

    return res.status(200).json(result);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ error: 'Customer account was not found' });
    }
    const { sendErrorResponse } = await import('./error-handler.js');
    return sendErrorResponse(res, error, 'Failed to record cash payment');
  }
}

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

  const { action } = req.body;

  switch (action) {
    case 'create':
      return createTopupRequest(req, res, decodedToken);
    case 'confirm':
      return confirmTopup(req, res, decodedToken);
    case 'reject':
      return rejectTopup(req, res, decodedToken);
    case 'cash':
      return createCashTopup(req, res, decodedToken);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}
