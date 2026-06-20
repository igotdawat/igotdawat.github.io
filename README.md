# 🎉 DAWAT - আপনার নিমন্ত্রণ

> A secure, modern meal ordering and wallet management platform with enterprise-grade security

[![Vercel Deploy](https://img.shields.io/badge/Deployed%20on-Vercel-000?style=for-the-badge&logo=vercel)](https://yourproject.vercel.app)
[![Firebase](https://img.shields.io/badge/Backend-Firebase-FFA500?style=for-the-badge&logo=firebase)](https://firebase.google.com)
[![Node.js](https://img.shields.io/badge/Runtime-Node.js-339933?style=for-the-badge&logo=node.js)](https://nodejs.org)
[![Security](https://img.shields.io/badge/Security-Enterprise%20Grade-green?style=for-the-badge)](./config/firestore.rules)

---

## 📖 Project Overview

**DAWAT** is a retro-themed meal ordering and wallet management system designed with security-first architecture. Users can browse daily meal menus, place orders, manage digital wallets, and track transaction history. Admins manage meals, approve top-ups, and oversee operations.

Built with a **gaming aesthetic** (retro pixel art UI), the platform combines nostalgic design with modern security practices.

---

## ✨ Key Features

### 👥 For Users
- 🍽️ **Daily Meal Ordering** - Browse and order from today's menu
- 💰 **Digital Wallet** - Secure wallet with transaction history
- 📲 **Top-up Management** - Request wallet top-ups with bank references
- 📝 **Order Management** - View, edit, or cancel placed orders
- 🔔 **Notifications** - Real-time alerts for order and payment updates
- 📊 **Transaction History** - Complete audit trail of all wallet transactions

### 👨‍💼 For Administrators
- 🍴 **Meal Management** - Create, update, and manage daily menus
- 💳 **Top-up Processing** - Review and confirm/reject top-up requests
- 📋 **Order Oversight** - Monitor all user orders in real-time
- 👤 **User Management** - View user profiles and activity
- 🔐 **Admin Dashboard** - Comprehensive admin control panel

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Client)                        │
│  HTML • CSS • Vanilla JavaScript • Firebase SDK              │
│  Deployed on: Vercel Static Hosting                          │
└──────────────────┬──────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │                     │
┌───────▼─────────┐  ┌────────▼──────────┐
│  Vercel API     │  │  Firebase/Cloud   │
│  Functions      │  │  Services         │
│  (Node.js)      │  │                   │
│  - placeOrder   │  │  ✓ Firestore DB   │
│  - editOrder    │  │  ✓ Firebase Auth  │
│  - cancelOrder  │  │  ✓ Security Rules │
│  - confirmTopup │  │                   │
│  - rejectTopup  │  └───────────────────┘
└─────────────────┘
```

---

## 🔒 Security Architecture

### Multi-Layer Defense

```
🛡️ Layer 1: Firebase Authentication
   └─ JWT token verification
   └─ Session management

🛡️ Layer 2: Firestore Security Rules
   └─ Role-based access control
   └─ Field-level validation
   └─ Document ownership checks

🛡️ Layer 3: Server-Side API Validation
   └─ Admin SDK (bypasses client rules)
   └─ Price verification against menu
   └─ Wallet balance checks
   └─ Atomic transactions

🛡️ Layer 4: Input Sanitization
   └─ HTML escaping
   └─ Type validation
   └─ Quantity bounds checking
```

### ✅ Security Features

| Feature | Implementation |
|---------|-----------------|
| **Order Manipulation** | Server validates prices against menu; rejects mismatches |
| **Price Fraud** | Strict atomic transactions; wallet debit confirmed before order marked paid |
| **Wallet Tampering** | Direct client writes blocked; only Admin SDK can modify |
| **Direct API Exploits** | Firestore rules enforce: `allow create, update, delete: if false` for sensitive collections |
| **Notification Spoofing** | Only backend/Admin SDK can create notifications; users cannot fabricate alerts |
| **User Self-Approval** | Users can only create applications for their own email with "pending" status |
| **Fake Admin Notifications** | Admin notifications strictly controlled; users cannot create them via client |
| **Session Hijacking** | Firebase Auth handles token validation; HTTPS enforced |

---

## 🚀 Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Responsive design with retro gaming theme
- **Vanilla JavaScript (ES Modules)** - Client-side logic
- **Firebase SDK** - Real-time database, authentication

### Backend
- **Node.js** - Runtime
- **Vercel Functions** - Serverless API endpoints
- **Firebase Admin SDK** - Server-side database operations

### Database & Services
- **Firestore** - NoSQL real-time database
- **Firebase Authentication** - User identity management
- **Firebase Security Rules** - Access control

### Deployment
- **Vercel** - Static hosting + serverless functions
- **GitHub** - Version control

---

## 📁 Project Structure

```
dawat/
├── 📄 HTML Pages (User)
│   ├── index.html                 # Login page
│   ├── menu.html                  # Browse & order meals
│   ├── orders.html                # View & manage orders
│   ├── wallet.html                # Wallet & top-ups
│   ├── settings.html              # Account settings
│   ├── apply.html                 # Submit application/profile
│   ├── 404.html                   # Error page
│   │
│   ├── 📄 Admin Pages
│   ├── menu-admin.html            # Manage daily meals
│   ├── orders-admin.html          # View all orders
│   ├── topups-admin.html          # Process top-up requests
│   ├── applications.html          # Review user applications
│   ├── settings-admin.html        # Admin settings
│   └── users.html                 # User management
│
├── 📂 api/                        # Vercel Serverless Functions
│   ├── Order Management
│   ├── ├── placeOrder.js          # Create order + debit wallet
│   ├── ├── editOrder.js           # Modify order + adjust wallet
│   ├── └── cancelOrder.js         # Cancel order + refund wallet
│   ├── 
│   ├── Wallet Operations
│   ├── ├── debitWallet.js         # Debit wallet (admin only)
│   ├── ├── refundWallet.js        # Refund wallet (admin only)
│   ├── ├── confirmTopup.js        # Confirm wallet top-up
│   ├── └── rejectTopup.js         # Reject wallet top-up
│   ├── 
│   ├── Data Management
│   ├── ├── wipeUserData.js        # Delete all data for one user
│   ├── └── deleteAllUserData.js   # Bulk delete all users/specific users
│   ├── 
│   ├── Notifications
│   ├── ├── sendAdminNotification.js   # Backend: Send admin alerts
│   ├── └── notifyNewApplication.js    # Backend: Notify on new applications
│   ├── 
│   └── Shared Utilities
│       ├── firebase-init.js           # Firebase Admin SDK setup
│       ├── error-handler.js           # Centralized error handling
│       ├── delete-user-data-helper.js # Shared delete logic
│       └── constants.js               # Shared constants & limits
│
├── 📂 js/                         # Client-side Modules
│   ├── firebase.js                # Firebase SDK initialization
│   ├── admin-config.js            # Admin email list
│   ├── admin-helpers.js           # Admin utility functions
│   ├── admin-view.js              # Admin dashboard logic
│   ├── wallet.js                  # Wallet operations
│   ├── wallet-secure.js           # Secure wallet API calls
│   ├── notifications.js           # Notification system
│   ├── notify-admins-api.js       # Backend notification helper
│   ├── modal.js                   # Dialog/modal components
│   ├── app-utils.js               # Utility functions
│   └── stars.js                   # UI animations
│
├── 📂 css/
│   └── style.css                  # Unified styling (retro theme)
│
├── 📂 config/
│   ├── firestore.rules            # Firestore security rules
│   └── firestore.indexes.json     # Firestore indexes
│
├── ⚙️ Configuration Files
│   ├── vercel.json                # Vercel deployment config
│   ├── firebase.json              # Firebase config
│   ├── package.json               # Dependencies
│   ├── .gitignore                 # Git ignore rules
│   └── .env.example               # Environment variables template
│
└── 🔧 Dev Configuration
    ├── .vercelignore              # Vercel ignore rules
    ├── .claude/settings.json      # Claude Code settings
    └── .env.local                 # Local environment variables (never commit)
```

---

## 🎮 User Guide

### Getting Started

1. **Sign Up / Login** (`index.html`)
   - Create account or sign in
   - Verify email via Firebase Auth

2. **Submit Profile** (`apply.html`)
   - Provide name, mobile, office, address
   - Application pending admin approval

3. **Browse Menu** (`menu.html`)
   - View today's available meals
   - Check prices & availability
   - Select quantities

4. **Place Order**
   - Review order total
   - Server validates prices against menu
   - Wallet debited automatically
   - Order confirmed with status "placed"

5. **Manage Orders** (`orders.html`)
   - View all past and pending orders
   - Edit quantities/items (before 12 PM)
   - Cancel orders (automatic wallet refund)

6. **Wallet Management** (`wallet.html`)
   - Check current balance in header
   - Request top-up with bank reference
   - Wait for admin approval
   - Balance updates instantly on confirmation
   - View complete transaction history

---

## 👨‍💻 Developer Guide

### Setup

```bash
# 1. Clone repository
git clone https://github.com/yourusername/yourproject.git
cd yourproject

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Edit .env.local with your Firebase credentials

# 4. Local development with dotenv
# Node.js will automatically load .env.local via dotenv package

# 5. Deploy to Vercel (if authorized)
vercel deploy

# 6. Set environment variables on Vercel
# Configure GOOGLE_APPLICATION_CREDENTIALS and FIREBASE_PROJECT_ID in Vercel dashboard
```

### API Endpoints

#### Order Management
```
POST /api/placeOrder
  - Create order with validation & wallet debit
  - Authentication: Required (Firebase)
  - Input: { items: [{mealId, qty}], forDate, clientTotal }
  - Returns: { orderId, newBalance, total }
  - Security: Server validates prices against menu; prevents fraud

POST /api/editOrder
  - Modify existing order (quantity/items)
  - Authentication: Required
  - Input: { orderId, items: [{mealId, qty}], total }
  - Returns: { success, newBalance }
  - Security: Validates ownership; recalculates prices server-side

POST /api/cancelOrder
  - Cancel order and refund wallet
  - Authentication: Required
  - Input: { orderId }
  - Returns: { success, message }
  - Security: Only order owner can cancel
```

#### Wallet Management
```
POST /api/debitWallet
  - Debit wallet (internal use only)
  - Authentication: Admin SDK only (bypasses Firestore rules)
  - Input: { userId, amount }
  - Returns: { success, newBalance }

POST /api/refundWallet
  - Refund wallet (internal use only)
  - Authentication: Admin SDK only
  - Input: { userId, amount }
  - Returns: { success, newBalance }

POST /api/confirmTopup
  - Admin confirms wallet top-up request
  - Authentication: Admin only
  - Input: { topupId }
  - Returns: { success, message, newBalance }

POST /api/rejectTopup
  - Admin rejects wallet top-up request
  - Authentication: Admin only
  - Input: { topupId }
  - Returns: { success, message }
```

#### Data Management
```
POST /api/wipeUserData
  - Admin: Delete all data for specific email
  - Authentication: Admin SDK only
  - Input: { email }
  - Deletes: orders, wallet, topups, history, notifications, applications
  - Returns: { success, message, totalDeleted }

POST /api/deleteAllUserData
  - Admin: Bulk delete all users or specific users
  - Authentication: Admin SDK only
  - Input: { deleteAll: boolean, emails?: [string] }
  - Deletes: all user data across all collections
  - Returns: { success, message, totalDeleted }
```

#### Notifications
```
POST /api/sendAdminNotification
  - Backend: Send notification to admin
  - Authentication: Admin SDK only
  - Input: { adminEmail, message, type }
  - Returns: { success, notificationId }

POST /api/notifyNewApplication
  - Backend: Notify admins of new application
  - Authentication: Admin SDK only
  - Input: { applicantName, applicantEmail }
  - Returns: { success, message }
```

### Database Schema

#### Collections

**wallets/{userId}**
```
{
  balance: number,              # Current wallet balance in currency
  email: string,                # User email
  updatedAt: timestamp          # Last update timestamp
}
```

**orders/{orderId}**
```
{
  userId: string,               # User ID
  userEmail: string,            # User email
  forDate: string,              # YYYY-MM-DD format
  items: [{
    mealId: string,
    name: string,
    price: number,
    qty: number
  }],
  total: number,                # Total order amount
  status: "placed" | "cancelled",
  paid: boolean,                # Payment status (debited from wallet)
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**topups/{topupId}**
```
{
  userId: string,
  userEmail: string,
  amount: number,               # Top-up amount
  bankRef: string,              # Bank reference for verification
  status: "pending" | "confirmed" | "rejected",
  requestedAt: timestamp,
  processedAt: timestamp
}
```

**notifications/{notificationId}**
```
{
  userId: string,
  message: string,
  type: string,                 # "order", "topup", "admin", etc.
  read: boolean,
  createdAt: timestamp
}
```

**applications/{applicationId}** (User profiles/applications)
```
{
  userId: string,
  email: string,                # Cannot be changed after creation
  name: string,
  mobile: string,
  office: string,
  address: string,
  status: "pending" | "approved" | "rejected",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Security Rules Summary

```firestore
orders:
  ↳ allow create, update, delete: if false
  ↳ Only Admin SDK can create/modify orders

wallets:
  ↳ allow create, delete: if false
  ↳ allow update: if isAdmin
  ↳ Prevents clients from directly modifying balances

notifications:
  ↳ allow create: if isAdmin
  ↳ Only backend via Admin SDK can create notifications
  ↳ Prevents users from fabricating alerts

applications:
  ↳ allow create: if status == "pending" && email exists
  ↳ allow read: if userId matches || isAdmin
  ↳ allow update: if isAdmin
  ↳ Only safe fields: name, mobile, email, office, address
  ↳ Users cannot approve themselves or create applications for others

topups:
  ↳ allow create: if userId matches && status == "pending"
  ↳ allow read: if userId matches || isAdmin
  ↳ allow update: if isAdmin
  ↳ Users can only request; admins approve/reject
```

---

## 🧪 Testing Checklist

### User Features
- [ ] Sign up / login with email verification
- [ ] Submit profile application for admin approval
- [ ] Browse daily menu and view prices
- [ ] Place order with wallet debit
- [ ] Edit order quantities (before deadline)
- [ ] Cancel order with automatic refund
- [ ] Request wallet top-up with bank reference
- [ ] View transaction history
- [ ] Receive notifications for orders/topups
- [ ] Check wallet balance in real-time

### Admin Features
- [ ] Manage daily meal menu (add/edit/remove)
- [ ] View all user orders with filters
- [ ] Confirm/reject wallet top-up requests
- [ ] Review user applications
- [ ] Manage user profiles & access
- [ ] Monitor wallet transactions
- [ ] Delete user data (single or bulk)
- [ ] Receive admin notifications

### Security Validation
- [ ] Cannot create order via direct API (Firestore rules block)
- [ ] Cannot modify wallet directly (client writes blocked)
- [ ] Cannot change order price (server re-validates)
- [ ] Cannot create fake notifications (backend-only)
- [ ] Cannot bypass authentication (Firebase Auth required)
- [ ] Cannot approve own application (admin-only update)
- [ ] Cannot create application for other email (validated)
- [ ] Cannot access other users' orders/wallet (ownership checks)
- [ ] Cannot manipulate topup status (admin-only)
- [ ] Session tokens secure (HTTPS + Firebase handling)

---

## 🔐 Environment Variables

**Local Development** (`.env.local`)
```env
# Firebase Admin SDK (keep these secret - never commit)
GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id
```

**Vercel Production** (set in Vercel Dashboard)
```
GOOGLE_APPLICATION_CREDENTIALS = <content of service-account.json>
FIREBASE_PROJECT_ID = your-firebase-project-id
```

⚠️ **CRITICAL**: 
- Never commit `.env.local` or service account keys to git
- Use `.gitignore` to exclude these files
- Load `.env.local` automatically in local dev via dotenv
- Set production env vars via Vercel dashboard, not in code
- Rotate service account keys regularly
- Restrict service account to Firebase Admin permissions only

---

## 📊 Performance Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Order Placement | < 2s | ✅ Optimized |
| Menu Load | < 500ms | ✅ Real-time |
| Notification Delivery | < 1s | ✅ Real-time |
| Wallet Update | Instant | ✅ Real-time |

---

## 🔧 Recent Improvements

### Error Handling (commit b9fd771)
- Centralized error handling via `api/error-handler.js`
- Consistent error responses across all endpoints
- Better logging and debugging

### Database Optimization (commit 777f48a)
- Optimized Firestore queries for better performance
- Added compound indexes for complex filters
- Reduced document reads in high-traffic endpoints

### Constants & Configuration (commit 1855eac)
- Extracted batch limits and validation rules to `api/constants.js`
- Improved quantity validation (batch sizes, maximum orders)
- Cleaner configuration management

### Local Development (commit b1e45b9)
- Automatic `.env.local` loading via dotenv
- Improved local development experience
- No manual environment variable setup needed

---

## 🐛 Troubleshooting

### Common Issues

**"Missing or insufficient permissions"**
- Firestore rules blocking operation
- Verify user authentication
- Check role (user vs admin)

**"Price mismatch"**
- Client price ≠ server menu price
- Menu updated after client load
- Refresh page and retry

**"Insufficient funds"**
- Wallet balance < order total
- Request top-up first

**"Order already cancelled"**
- Order status already "cancelled"
- Cannot cancel twice

---

## 📞 Support

- **Issues**: Report via GitHub Issues
- **Security**: Report security vulnerabilities privately
- **Features**: Suggest via GitHub Discussions

---

## 📄 License

Proprietary - All rights reserved

---

## 🎨 Design Credits

- **Retro Gaming Theme** - Custom CSS with pixel-art aesthetic
- **Icons & Emojis** - Unicode emoji set
- **Color Palette** - Retro arcade inspiration

---

## 🚀 Future Roadmap

- [ ] Mobile app (iOS/Android)
- [ ] Advanced meal filtering
- [ ] Recurring orders
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Payment gateway integration

---

<div align="center">

### ⭐ Made with ❤️ using Firebase, Vercel & Node.js

**[Deploy Guide](#setup)** • **[Report Issue](https://github.com/yourusername/yourproject/issues)** • **[Documentation](#-developer-guide)**

</div>
