# Dawat Project Overview

**Project**: Dawat (আপনার নিমন্ত্রণ - "Your Invitation") - A food ordering & wallet system for Dhaka

## Architecture

### Frontend
- **Vanilla JS** (no build step, direct ES modules from CDN)
- **Firebase Auth** + **Firestore** for data
- **Single-page**: Login → Menu/Orders/Wallet (users) or Admin Dashboard (admins)
- Pixel art theme with starfield animations

### Key Features
1. **Orders**: Users place orders with daily cutoff (10 PM previous night)
2. **Wallet**: BDT balance system - debit on order, credit on refund/topup
3. **Topups**: Users request, admins confirm bank payments
4. **Admin**: Manage meals, orders, users, topups, applications
5. **Notifications**: Real-time bell notifications stored in Firestore

### Project Structure
```
/
  index.html              - Login (entry point)
  firebase.json           - Firebase config + routing rewrites
  /pages/                 - All HTML pages (moved here for organization)
  /js/                    - JavaScript modules
  /css/                   - Single stylesheet
  /config/                - Firestore rules, indexes
  /assets/sounds/         - notification.mp3
```

## Important Business Logic

### Order Cutoff Rules (app-utils.js)
- **Daily window**: Orders closed midnight → 12:30 PM each day
- **Per-date cutoff**: Can order for date D only until 10 PM on day D-1
- Active order date: before 12:30 PM = today; after = tomorrow

### Wallet System (wallet.js)
- **Balance**: Single source of truth in `wallets/{uid}`
- **Audit log**: Every transaction recorded in `walletHistory/`
- **Transactions**: Debit (orders) + Credit (refunds/topups) use Firestore transactions
- **Topups**: User requests → Admin confirms → Balance credited

### Firestore Collections
- `wallets/{uid}` - User balance (number)
- `walletHistory/{auto}` - Audit log (type, amount, balanceAfter, etc)
- `topups/{auto}` - Topup requests (status: pending|confirmed|rejected)
- `orders/{auto}` - User orders
- `notifications/{auto}` - Notifications (userId for users, "" for admin broadcast)
- `meals/{auto}` - Meal definitions
- `weeklyMenu/main` - Menu per weekday (Sat-Fri order, Fri is weekend)
- `users/{auto}` - User profiles
- `applications/{auto}` - Signup applications

## Admin Emails
Edit in `js/admin-config.js`:
```javascript
export const ADMIN_EMAILS = ["ihavedawat@gmail.com", "igotdawat@gmail.com"];
```
Must match in two places:
1. `js/admin-config.js`
2. `config/firestore.rules`

## Code Quality
- ✅ No console output (professional appearance)
- ✅ Essential comments for business logic
- ✅ No unnecessary doc comments
- ✅ Clean, organized file structure
- ✅ Single responsibility modules

## Common Tasks for Next AI

### Adding a feature
1. Check `firestore.rules` - what data access is allowed?
2. Add Firestore schema to relevant module comments
3. Implement in JS, test in browser
4. Update `firebase.rules` if permissions change

### Fixing a bug
1. Check order cutoff logic (most bugs are timezone/cutoff related)
2. Look for transaction edge cases (concurrent requests)
3. Verify Firestore rule permissions

### Performance
- Modules are tiny (no build step) - keep them under 300 lines
- Firestore batches at 450 operations (see wallet.js)
- Notifications use onSnapshot listeners (live updates)

## Deployment
- **Host**: Firebase Hosting
- **Database**: Firestore
- **Auth**: Firebase Auth
- **Deploy**: `firebase deploy` (CLI required)

---
Last updated: 2026-06-19
