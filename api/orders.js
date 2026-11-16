import admin, { db } from './firebase-init.js';
import { notifyAdminsInternal } from './admin.js';
import { formatOrderNotification } from './format-notification.js';
import { ADMIN_EMAILS } from '../js/admin-config.js';

async function placeOrder(req, res, userId, userEmail) {
  const { items, forDate, clientTotal } = req.body;

  if (!items || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Invalid items' });
  }
  if (!forDate || typeof forDate !== 'string') {
    return res.status(400).json({ error: 'Invalid forDate' });
  }
  if (typeof clientTotal !== 'number' || clientTotal <= 0 || !Number.isInteger(clientTotal)) {
    return res.status(400).json({ error: 'Invalid total: must be positive integer' });
  }

  try {
    const mealsSnap = await db.collection('meals').get();
    const mealsById = {};
    mealsSnap.docs.forEach(doc => {
      mealsById[doc.id] = doc.data();
    });

    let serverTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.mealId || !item.qty || item.qty <= 0) {
        return res.status(400).json({ error: 'Invalid item: mealId and qty required' });
      }

      const meal = mealsById[item.mealId];
      if (!meal) {
        return res.status(400).json({ error: `Meal ${item.mealId} not found in menu` });
      }

      const serverPrice = Number(meal.price || 0);
      if (serverPrice <= 0 || !Number.isFinite(serverPrice)) {
        return res.status(400).json({ error: `Meal ${item.mealId} has invalid price` });
      }

      const qtyNum = Number(item.qty);
      if (!Number.isInteger(qtyNum) || qtyNum <= 0 || qtyNum > 100) {
        return res.status(400).json({ error: `Invalid quantity for meal ${item.mealId}: must be integer 1-100` });
      }
      const qty = qtyNum;

      validatedItems.push({
        mealId: item.mealId,
        name: meal.name || '',
        price: serverPrice,
        qty
      });
      serverTotal += serverPrice * qty;
    }

    if (!validatedItems.length) {
      return res.status(400).json({ error: 'No valid items in order' });
    }

    if (serverTotal <= 0 || !Number.isFinite(serverTotal)) {
      return res.status(400).json({ error: 'Invalid order total' });
    }

    if (serverTotal !== clientTotal) {
      return res.status(400).json({
        error: 'PRICE_MISMATCH',
        message: `Order total mismatch: server calculated ${serverTotal}৳, client sent ${clientTotal}৳`
      });
    }

    const result = await db.runTransaction(async (transaction) => {
      const walletRef = db.collection('wallets').doc(userId);
      const walletSnap = await transaction.get(walletRef);
      const currentBalance = walletSnap.exists ? Number(walletSnap.data().balance || 0) : 0;

      if (currentBalance - serverTotal < -200) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      const newBalance = currentBalance - serverTotal;

      const orderRef = db.collection('orders').doc();
      transaction.set(orderRef, {
        userId,
        userEmail: userEmail.toLowerCase(),
        forDate,
        items: validatedItems,
        total: serverTotal,
        status: 'placed',
        paid: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.update(walletRef, {
        balance: newBalance,
        email: userEmail.toLowerCase(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      const historyRef = db.collection('walletHistory').doc();
      transaction.set(historyRef, {
        userId,
        userEmail: userEmail.toLowerCase(),
        type: 'order_debit',
        amount: -serverTotal,
        balanceAfter: newBalance,
        ref: orderRef.id,
        note: 'Order for ' + forDate,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      transaction.update(orderRef, {
        paid: true,
        paidAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        orderId: orderRef.id,
        newBalance,
        total: serverTotal
      };
    });

    const order = { forDate, items: validatedItems, total: serverTotal };
    notifyAdminsInternal({
      message: formatOrderNotification({ type: 'order-placed', order, userEmail }),
      link: 'orders-admin',
      linkText: 'View orders',
      type: 'order-placed'
    }).catch(() => {});

    return res.status(200).json(result);
  } catch (error) {
    const { sendErrorResponse } = await import('./error-handler.js');
    return sendErrorResponse(res, error, 'Failed to place order');
  }
}

async function adminPlaceOrder(req, res, adminUid, adminEmail) {
  const { userEmail: targetEmailInput, forDate, items, clientTotal } = req.body;
  const targetEmail = String(targetEmailInput || '').trim().toLowerCase();

  if (!targetEmail || !forDate || !Array.isArray(items) || !items.length) {
    return res.status(400).json({ error: 'Missing userEmail, forDate, or items' });
  }
  if (typeof clientTotal !== 'number' || !Number.isFinite(clientTotal) || clientTotal <= 0 || !Number.isInteger(clientTotal)) {
    return res.status(400).json({ error: 'Invalid total: must be a positive integer' });
  }

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(forDate);
  if (!dateMatch) {
    return res.status(400).json({ error: 'Invalid delivery date' });
  }
  const [, yearText, monthText, dayText] = dateMatch;
  const year = Number(yearText);
  const month = Number(monthText);
  const day = Number(dayText);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    return res.status(400).json({ error: 'Invalid delivery date' });
  }

  try {
    let targetUser;
    try {
      targetUser = await admin.auth().getUserByEmail(targetEmail);
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        return res.status(404).json({ error: 'Customer account not found' });
      }
      throw error;
    }

    if (targetUser.disabled || !targetUser.email) {
      return res.status(400).json({ error: 'Customer account is disabled or has no email' });
    }

    const appSnap = await db.collection('applications')
      .where('email', '==', targetEmail)
      .get();
    if (appSnap.empty) {
      return res.status(404).json({ error: 'Customer application not found' });
    }
    const hasEligibleApplication = appSnap.docs.some((doc) => {
      const status = doc.data().status;
      return !['banned', 'rejected', 'pending'].includes(status);
    });
    if (!hasEligibleApplication) {
      return res.status(403).json({ error: 'Cannot place an order for this customer' });
    }

    const mealsSnap = await db.collection('meals').get();
    const mealsById = {};
    mealsSnap.docs.forEach(doc => {
      mealsById[doc.id] = doc.data();
    });

    let serverTotal = 0;
    const validatedItems = [];
    const seenMealIds = new Set();
    for (const item of items) {
      if (!item || typeof item.mealId !== 'string' || seenMealIds.has(item.mealId)) {
        return res.status(400).json({ error: 'Invalid or duplicate meal in order' });
      }
      const qty = Number(item.qty);
      if (!Number.isInteger(qty) || qty <= 0 || qty > 100) {
        return res.status(400).json({ error: `Invalid quantity for meal ${item.mealId}: must be integer 1-100` });
      }

      const meal = mealsById[item.mealId];
      if (!meal) {
        return res.status(400).json({ error: `Meal ${item.mealId} not found in menu` });
      }
      const price = Number(meal.price || 0);
      if (price <= 0 || !Number.isFinite(price)) {
        return res.status(400).json({ error: `Meal ${item.mealId} has invalid price` });
      }

      seenMealIds.add(item.mealId);
      validatedItems.push({ mealId: item.mealId, name: meal.name || '', price, qty });
      serverTotal += price * qty;
    }

    if (!Number.isFinite(serverTotal) || !Number.isInteger(serverTotal) || serverTotal <= 0) {
      return res.status(400).json({ error: 'Invalid order total' });
    }
    if (serverTotal !== clientTotal) {
      return res.status(400).json({
        error: 'PRICE_MISMATCH',
        message: `Order total mismatch: server calculated ${serverTotal}৳, client sent ${clientTotal}৳`
      });
    }

    const result = await db.runTransaction(async (transaction) => {
      const walletRef = db.collection('wallets').doc(targetUser.uid);
      const walletSnap = await transaction.get(walletRef);
      const currentBalance = walletSnap.exists ? Number(walletSnap.data().balance || 0) : 0;
      const newBalance = currentBalance - serverTotal;
      const orderRef = db.collection('orders').doc();
      const timestamp = admin.firestore.FieldValue.serverTimestamp();

      transaction.set(orderRef, {
        userId: targetUser.uid,
        userEmail: targetEmail,
        forDate,
        items: validatedItems,
        total: serverTotal,
        status: 'placed',
        paid: true,
        paidAt: timestamp,
        createdAt: timestamp,
        createdByAdminUid: adminUid,
        createdByAdminEmail: adminEmail.toLowerCase()
      });
      transaction.set(walletRef, {
        balance: newBalance,
        email: targetEmail,
        updatedAt: timestamp
      }, { merge: true });

      const historyRef = db.collection('walletHistory').doc();
      transaction.set(historyRef, {
        userId: targetUser.uid,
        userEmail: targetEmail,
        type: 'order_debit',
        amount: -serverTotal,
        balanceAfter: newBalance,
        ref: orderRef.id,
        note: `Admin order for ${forDate}`,
        createdByAdminUid: adminUid,
        createdByAdminEmail: adminEmail.toLowerCase(),
        createdAt: timestamp
      });

      return { success: true, orderId: orderRef.id, total: serverTotal, newBalance };
    });

    return res.status(200).json(result);
  } catch (error) {
    console.error('Admin order placement failed:', error);
    const { sendErrorResponse } = await import('./error-handler.js');
    return sendErrorResponse(res, error, 'Failed to place order for customer');
  }
}

async function cancelOrder(req, res, userId, userEmail) {
  const { orderId } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Missing orderId' });
  }

  try {
    let orderData = null;
    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        throw new Error('Order not found');
      }

      const order = orderSnap.data();
      orderData = order;

      if (order.userId !== userId && order.userEmail !== userEmail) {
        throw new Error('Order does not belong to this user');
      }

      if (order.status === 'cancelled') {
        throw new Error('Order already cancelled');
      }
      if (order.status !== 'placed') {
        throw new Error('Order cannot be cancelled (status: ' + order.status + ')');
      }

      const refundAmount = Number(order.total || 0);
      if (refundAmount > 0 && order.paid) {
        const walletRef = db.collection('wallets').doc(userId);
        const walletSnap = await transaction.get(walletRef);
        const currentBalance = walletSnap.exists ? Number(walletSnap.data().balance || 0) : 0;
        const newBalance = currentBalance + refundAmount;

        transaction.update(walletRef, {
          balance: newBalance,
          email: userEmail.toLowerCase(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        const historyRef = db.collection('walletHistory').doc();
        transaction.set(historyRef, {
          userId,
          userEmail: userEmail.toLowerCase(),
          type: 'order_refund',
          amount: refundAmount,
          balanceAfter: newBalance,
          ref: orderId,
          note: 'Order (cancelled) for ' + order.forDate,
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      transaction.update(orderRef, {
        status: 'cancelled',
        cancelledAt: admin.firestore.FieldValue.serverTimestamp()
      });

      return {
        success: true,
        message: 'Order cancelled successfully'
      };
    });

    if (orderData) {
      notifyAdminsInternal({
        message: formatOrderNotification({ type: 'order-cancelled', order: orderData, userEmail }),
        link: 'orders-admin',
        linkText: 'View orders',
        type: 'order-cancelled'
      }).catch(() => {});
    }

    return res.status(200).json(result);
  } catch (error) {
    const { sendErrorResponse } = await import('./error-handler.js');
    return sendErrorResponse(res, error, 'Failed to cancel order');
  }
}

async function editOrder(req, res, userId, userEmail) {
  const { orderId, items, total } = req.body;

  if (!orderId || !items || total === undefined) {
    return res.status(400).json({ error: 'Missing orderId, items, or total' });
  }

  if (typeof total !== 'number' || !Number.isFinite(total) || total <= 0 || !Number.isInteger(total)) {
    return res.status(400).json({ error: 'Invalid total: must be a positive integer' });
  }

  try {
    const mealsSnap = await db.collection('meals').get();
    const mealsById = {};
    mealsSnap.docs.forEach(doc => {
      mealsById[doc.id] = doc.data();
    });

    let serverTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      if (!item.mealId || !item.qty || item.qty <= 0) {
        return res.status(400).json({ error: 'Invalid item: mealId and qty required' });
      }

      const meal = mealsById[item.mealId];
      if (!meal) {
        return res.status(400).json({ error: `Meal ${item.mealId} not found in menu` });
      }

      const serverPrice = Number(meal.price || 0);
      if (serverPrice <= 0 || !Number.isFinite(serverPrice)) {
        return res.status(400).json({ error: `Meal ${item.mealId} has invalid price` });
      }

      const qtyNum = Number(item.qty);
      if (!Number.isInteger(qtyNum) || qtyNum <= 0 || qtyNum > 100) {
        return res.status(400).json({ error: `Invalid quantity for meal ${item.mealId}: must be integer 1-100` });
      }

      validatedItems.push({
        mealId: item.mealId,
        name: meal.name || '',
        price: serverPrice,
        qty: qtyNum
      });
      serverTotal += serverPrice * qtyNum;
    }

    if (serverTotal !== total) {
      return res.status(400).json({
        error: 'PRICE_MISMATCH',
        message: `Order total mismatch: server calculated ${serverTotal}৳, client sent ${total}৳`
      });
    }

    let orderData = null;
    const historySnap = await db.collection('walletHistory')
      .where('userId', '==', userId)
      .where('ref', '==', orderId)
      .limit(1)
      .get();

    const result = await db.runTransaction(async (transaction) => {
      const orderRef = db.collection('orders').doc(orderId);
      const orderSnap = await transaction.get(orderRef);

      if (!orderSnap.exists) {
        throw new Error('Order not found');
      }

      const order = orderSnap.data();
      orderData = order;
      if (order.userId !== userId && order.userEmail !== userEmail) {
        throw new Error('Order does not belong to this user');
      }

      const prevTotal = Number(order.total || 0);
      const diff = total - prevTotal;

      const walletRef = db.collection('wallets').doc(userId);
      const walletSnap = await transaction.get(walletRef);
      const currentBalance = walletSnap.exists ? Number(walletSnap.data().balance || 0) : 0;

      // diff > 0: user is adding to order (needs balance)
      // diff < 0: user is reducing order (refund)
      if (diff > 0 && currentBalance - diff < -200) {
        throw new Error('INSUFFICIENT_FUNDS');
      }

      const newBalance = currentBalance - diff;

      transaction.update(orderRef, {
        items: validatedItems,
        total: serverTotal,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });

      if (diff !== 0) {
        transaction.update(walletRef, {
          balance: newBalance,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });

        if (!historySnap.empty) {
          const histDocRef = historySnap.docs[0].ref;
          const newDebitAmount = -total;

          transaction.update(histDocRef, {
            amount: newDebitAmount,
            balanceAfter: newBalance,
            note: 'Order (edited) for ' + order.forDate,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }

      return {
        success: true,
        newTotal: total
      };
    });

    if (orderData) {
      notifyAdminsInternal({
        message: formatOrderNotification({
          type: 'order-edited',
          order: orderData,
          userEmail,
          items,
          newTotal: total,
          prevTotal: orderData.total,
          oldItems: orderData.items
        }),
        link: 'orders-admin',
        linkText: 'View orders',
        type: 'order-edited'
      }).catch(() => {});
    }

    return res.status(200).json(result);
  } catch (error) {
    const { sendErrorResponse } = await import('./error-handler.js');
    return sendErrorResponse(res, error, 'Failed to edit order');
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

  const userId = decodedToken.uid;
  const userEmail = decodedToken.email;
  const { action } = req.body;

  switch (action) {
    case 'admin-place':
      if (!ADMIN_EMAILS.map(email => email.toLowerCase()).includes((userEmail || '').toLowerCase())) {
        return res.status(403).json({ error: 'Unauthorized' });
      }
      return adminPlaceOrder(req, res, userId, userEmail);
    case 'place':
      return placeOrder(req, res, userId, userEmail);
    case 'cancel':
      return cancelOrder(req, res, userId, userEmail);
    case 'edit':
      return editOrder(req, res, userId, userEmail);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}
