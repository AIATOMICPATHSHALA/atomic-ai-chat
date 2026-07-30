# Atomic Pathshala — Next.js Auth + Free-Limit + Google Sheets + Admin RBAC

Aapke actual stack (Next.js App Router, no existing DB) ke hisaab se adjusted.

## Install karo

```bash
npm install mongoose bcrypt jsonwebtoken googleapis
```

## `.env.local` me add karo

```
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/atomic-pathshala
JWT_ACCESS_SECRET=<32+ char random string>
JWT_REFRESH_SECRET=<alag 32+ char random string>
GOOGLE_SHEET_ID=<sheet URL se, /d/ aur /edit ke beech wala part>
```

Random secret generate karne ke liye: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## MongoDB Atlas setup (5 min)

1. https://www.mongodb.com/cloud/atlas/register pe free account banao
2. "Build a Database" -> Free tier (M0) select karo
3. Database user banao (username/password) — ye `MONGODB_URI` me jayega
4. Network Access me "Allow access from anywhere" add karo (0.0.0.0/0) — Vercel deploy ke liye zaroori
5. "Connect" -> "Drivers" -> connection string copy karo, `<password>` replace karo

## Google Sheets setup

1. Google Cloud Console -> naya project -> "Google Sheets API" enable karo
2. IAM & Admin -> Service Accounts -> naya service account banao -> Keys -> "Add Key" -> JSON -> download
3. Downloaded file ko project root me `service-account.json` naam se rakho
4. **`.gitignore` me `service-account.json` aur `.env.local` dono add karo** — kabhi commit mat karna
5. Apni Google Sheet kholo -> Share -> service account ka email (JSON file ke `client_email` field me hai) ko Editor access do
6. Sheet me ek tab banao naam `Students` aur pehli row me headers: `Atomic ID | Name | Email | Phone | Batch | Plan | Status | Expires At | Synced At`

## File structure jo mila

```
lib/
  db.js                  → MongoDB connection (Next.js hot-reload safe)
  auth.js                → JWT sign/verify helpers
  generateAtomicId.js    → Atomic Student ID generator
  googleSheets.js        → Sheet sync function (ab batch column bhi include hai)
models/
  Student.js             → Mongoose schema (batch field + daily question tracking)
app/api/
  auth/register/route.js → ab batch field bhi accept/validate karta hai
  auth/login/route.js
  auth/refresh/route.js
  auth/logout/route.js
  ask-question/route.js  → 3-tier limit: guest (5 total) / logged-in free (5/day) / subscribed (unlimited)
  admin/students/route.js
  admin/create-admin/route.js
app/components/
  RegisterForm.jsx        → Batch dropdown ke saath ready-made registration form
```

## Question limit ka poora logic (3 tiers)

| User type | Limit |
|---|---|
| Login nahi kiya (guest) | 5 questions total (lifetime), phir login compulsory |
| Login kiya, koi subscription nahi | 5 questions **per day**, roz midnight ke baad reset |
| Login kiya, active subscription hai | Unlimited (koi counter touch nahi hota) |

`hasActiveSubscription()` method (`models/Student.js` me) check karta hai `subscription.isActive` **aur** `subscription.expiresAt` (agar expiry date nikal chuki hai, to automatically free tier me treat hoga) — isliye admin ko manually kisi ki subscription "band" karne ki zaroorat nahi, expiry date set karne se apne aap ho jayega.

## Registration Batch options

Registration form (`app/components/RegisterForm.jsx`) me ye 5 options hain:
- Selection Pro Batch
- Selection 1.0 Batch
- Arambh Batch
- Manzil Batch
- No Batch

Backend (`register/route.js`) bhi isi list se validate karta hai — koi invalid batch value bhej hi nahi sakta.

## Frontend se call kaise karo (axios, jo already installed hai)

```js
// register
const { data } = await axios.post("/api/auth/register", { name, email, phone, password });
localStorage.setItem("accessToken", data.accessToken); // access token localStorage me theek hai (short-lived, 15 min)
// refresh_token httpOnly cookie me apne aap set ho jayega, JS use isko touch nahi kar sakta

// protected call
await axios.post("/api/ask-question", { question }, {
  headers: { Authorization: `Bearer ${localStorage.getItem("accessToken")}` }
});
// agar 403 aaye error: "LOGIN_REQUIRED", to login modal khol do

// access token expire hone par
const { data } = await axios.post("/api/auth/refresh"); // cookie automatically bhej diya jayega
localStorage.setItem("accessToken", data.accessToken);
```

## First superadmin kaise banaye

Naya deployed system me koi bhi admin nahi hoga shuru me. Ek baar MongoDB Atlas ke "Browse Collections" me jaake, apna pehla registered student manually dhundo aur uska `role` field `"superadmin"` kar do. Uske baad wahi user `/api/admin/create-admin` se doosre admins bana sakta hai.

## Baaki security notes pehle wale README jaisa hi hai:
- Free-limit cookie (httpOnly) + IP dono se track hota hai — localStorage pe kabhi mat rakhna
- Access token 15 min, refresh token httpOnly cookie me 30 din
- `service-account.json` aur `.env.local` — git me kabhi nahi
- Rate limiting login route pe abhi nahi hai (Express ka `express-rate-limit` Next.js API routes me directly nahi chalta) — production ke liye `@upstash/ratelimit` recommend karunga, bata dena agar wire karna hai
