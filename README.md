# 🎉 DAWAT - আপনার নিমন্ত্রণ

Secure meal ordering and wallet management platform with retro gaming UI.

## Overview

Meal ordering platform with digital wallet, built with Firebase backend and retro pixel UI. Users order meals, manage wallets, request top-ups. Admins manage menus and approve transactions.

---

## Features

**Users**: Browse menu → place order → manage wallet → request top-ups → view history  
**Admins**: Manage meals → approve applications → process top-ups → view all orders

## Architecture

Frontend (HTML/CSS/JS) → Vercel Functions (Node.js) → Firebase (Auth + Firestore)

**Security**: Multi-layer defense with Firebase Auth, Firestore rules, server-side validation, and type checking. All sensitive operations use Admin SDK with atomic transactions.

## Tech Stack

| Layer | Stack |
|-------|-------|
| Frontend | HTML5, CSS3, Vanilla JS (ES Modules) |
| Backend | Node.js, Vercel Functions |
| Database | Firebase Firestore + Auth |
| Hosting | Vercel + GitHub |

## Project Structure

```
├── api/                    # Vercel Functions
│   ├── orders.js          # Order operations (place/edit/cancel)
│   ├── topups.js          # Wallet top-ups
│   ├── admin.js           # Admin operations & notifications
│   ├── wallets.js         # Wallet debit/refund
│   ├── error-handler.js   # Error standardization
│   ├── firebase-init.js   # Admin SDK setup
│   └── auth-middleware.js # Token verification
│
├── js/                    # Client modules
│   ├── firebase.js        # SDK initialization
│   ├── wallet.js          # Wallet functions
│   ├── notifications.js   # Notification system
│   ├── admin-view.js      # Admin dashboard
│   ├── icons.js           # Shared icons & constants
│   └── app-utils.js       # Utilities
│
├── *.html                 # Pages (user + admin)
├── css/style.css         # Retro theme
├── config/               # Firestore rules & indexes
└── package.json          # Dependencies
```

## Setup

```bash
npm install
cp .env.example .env.local  # Add Firebase credentials
vercel deploy
```

Set `GOOGLE_APPLICATION_CREDENTIALS` and `FIREBASE_PROJECT_ID` in Vercel dashboard.

## API Endpoints

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `POST /api/orders` | User | Place, edit, cancel orders |
| `POST /api/topups` | User | Request top-ups |
| `POST /api/admin` | Admin or public | Manage notifications, users |
| `POST /api/wallets` | Admin | Direct wallet operations |

All sensitive operations validate prices server-side and use atomic transactions.

## Security

✅ All prices validated server-side against menu  
✅ Wallet operations use atomic transactions  
✅ Notifications only created by backend  
✅ Client writes to sensitive collections blocked  
✅ Type checking prevents string/number coercion attacks  
✅ Admin operations require verified tokens  
✅ User ownership validated on all operations

## License

Proprietary - All rights reserved
