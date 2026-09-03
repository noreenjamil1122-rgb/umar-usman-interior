# Wallpaper Manager — Umar Usman Interior (Lahore, Pakistan)

![Umar Usman Interior Logo](/public/logo.png)

A modern, production-ready full-stack business management and inventory CRM built specifically for **Umar Usman Interior**, Lahore, Pakistan. Designed for real-time operations, inventory tracking, customer ledgers, and official Wallmaster quotations across laptops, tablets, and mobile devices.

---

## 🌟 Key Features

### 1. Wallmaster Quotation & Invoice Suite
- **Exact Official Template**: Digitized replica of the official `Wallmaster_Quotation_Template.docx` with official **UU** branding.
- **7-Column Itemized Breakdown**: `S. No` | `Code` | `Description` | `Status` | `Qty` | `UnitPrice` | `Amount`.
- **Auxiliary Job Charges**: Quick-add buttons for `GUM CHARGES` (Rs. 1,850) and `Installation charges` (Rs. 3,000) alongside wallpaper rolls.
- **8 Standard Business Terms**: Automatically printed on every quotation covering payments, returns, and wall preparation conditions.
- **One-Click A4 PDF Export**: Instant **Download / Save as PDF (A4)** button formatted for high-resolution desktop and mobile printing.

### 2. Advance Payments & Udhar (Debt) Tracking
- **Flexible Terms**: Supports 100% Cash, 50% Advance & 50% After Fitting, or custom installments.
- **Automated Calculations**: Real-time roll stock deduction upon invoice creation.
- **Auto Job Completion**: Status transitions automatically from `Advance Received` to `Fully Paid` when the balance reaches zero.
- **Multi-Channel Payments**: Supports Cash, Bank Transfer (Raast), JazzCash, EasyPaisa, and Cheque.

### 3. Real-Time Notification Bell
- **Live Pulsing Alerts**: Dynamic unread counter badge on the navigation header.
- **Categorized Streams**:
  - **Udhar Alerts**: High-priority notifications for clients with pending balances.
  - **Stock Warnings**: Automatic warnings when wallpaper rolls drop below safety thresholds or reach zero.
  - **Payment Receipts**: Instant logging when payments are cleared.
- **Live Background Polling**: Updates automatically every 15 seconds without requiring page refreshes.

### 4. Role-Based Access Control (RBAC)
- **Admin**:
  - Full system authority.
  - Staff management (create, monitor, and remove worker accounts).
  - Business profile settings and invoice deletion.
- **Workers**:
  - Authorized to generate invoices, view inventory, and record customers.
  - Strictly blocked (`403 Forbidden`) from deleting invoices, managing staff, or altering business settings.

### 5. Inventory & Multi-Godown Audit
- **Stock Audit History**: Immutable ledger recording every stock movement (`Opening Stock`, `Sold`, `Restock`, `Damage`, `Adjustment`).
- **Catalog Books**: Categorize wallpapers under specialized collections (`Rainbow8`, `Ayzah`, `Spanish`).
- **Multi-Warehouse Support**: Allocate and monitor inventory across multiple godowns.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Warm Teal & Brass luxury theme)
- **Database**: MongoDB Atlas (Mongoose ODM with direct replica set connectivity)
- **Authentication**: Custom JWT in secure `httpOnly` cookies with bcryptjs password hashing
- **Validation**: Zod schema validation
- **Testing**: Automated End-to-End Integration Test Suite

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/noreenjamil1122-rgb/umar-usman-interior.git
cd umar-usman-interior
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
# MongoDB Atlas Replica Set Connection
MONGODB_URI=mongodb://<username>:<password>@ac-g4kchjw-shard-00-00.k4ovbqv.mongodb.net:27017,ac-g4kchjw-shard-00-01.k4ovbqv.mongodb.net:27017,ac-g4kchjw-shard-00-02.k4ovbqv.mongodb.net:27017/wallpaper_manager?ssl=true&replicaSet=atlas-301nyb-shard-0&authSource=admin&retryWrites=true&w=majority

# Authentication Secrets
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=7d

# Business Branding Defaults
NEXT_PUBLIC_APP_NAME="Wallpaper Manager"
NEXT_PUBLIC_BUSINESS_NAME="Umar Usman Interior"
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Automated Tests

The repository includes an end-to-end integration test runner validating all 8 core business workflows (Auth, RBAC, Customers, Stock, Wallmaster Quotations, Notifications, Payments, and CSV exports):

```bash
npm test
```

---

## 🚢 Deployment (Vercel)

1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Add the environment variables from `.env.local` in the Vercel Project Settings (`MONGODB_URI`, `JWT_SECRET`, etc.).
4. Click **Deploy**.

---

## 📍 Contact & Business Information

**Umar Usman Interior**  
College Road, Near Five Star Naan Shop,  
Lahore, Punjab, Pakistan  
- **Contact Person**: Umar Nawaz  
- **Phone**: +92 307 4333227  
- **Email**: info@umarusmanwallpaper.com  
