# HotelSaaS — User Guide

A comprehensive guide to using the Hotel & Restaurant SaaS Platform.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
   - [Signing Up](#signing-up)
   - [Logging In](#logging-in)
   - [Password Recovery](#password-recovery)
2. [Dashboard](#2-dashboard)
3. [Room Management](#3-room-management)
4. [Reservations](#4-reservations)
5. [Guest Management](#5-guest-management)
6. [Restaurant](#6-restaurant)
   - [Menu Categories](#menu-categories)
   - [Menu Items](#menu-items)
   - [Tables](#tables)
7. [Orders](#7-orders)
8. [Kitchen Display](#8-kitchen-display)
9. [Invoices](#9-invoices)
10. [Guest Folio](#10-guest-folio)
11. [QR Ordering](#11-qr-ordering)
12. [Housekeeping](#12-housekeeping)
13. [User Management](#13-user-management)
14. [Settings](#14-settings)
    - [Profile & Password](#profile--password)
    - [Subscription Plans](#subscription-plans)
    - [Branding](#branding)
    - [Desktop App](#desktop-app)
15. [Audit Logs](#15-audit-logs)
16. [System Administration](#16-system-administration)
17. [User Roles & Permissions](#17-user-roles--permissions)
18. [Mobile App](#18-mobile-app)
19. [Desktop App](#19-desktop-app)
20. [Internationalization](#20-internationalization)
21. [API Documentation](#21-api-documentation)

---

## 1. Getting Started

### Signing Up

1. Navigate to the **Sign Up** page.
2. Fill in your details:
   - **Property Name** — Your hotel or restaurant name (2–100 characters).
   - **First Name** and **Last Name**.
   - **Email** — Will be used for login.
   - **Password** — Must be at least 8 characters with an uppercase letter, a number, and a special character.
   - **Phone** (optional).
   - **Country** — 2-letter ISO code (e.g., `US`, `GB`, `IN`). Determines default currency.
   - **Currency** — 3-letter code (e.g., `USD`, `EUR`, `INR`). Auto-set from country if provided.
   - **Timezone** (optional, defaults to UTC).
3. Click **Create Account**.
4. Your account will be created with **Pending Approval** status. A system administrator must approve your property before you can log in.
5. You will receive a notification once your account has been approved.

### Logging In

1. Navigate to the **Login** page.
2. Enter your **Email** and **Password**.
3. Click **Login**.
4. On success, you are redirected to the Dashboard. Your session stays active for 1 hour; after that the app automatically refreshes your session using a secure refresh token (valid for 7 days).

> **Note:** Login will be blocked if your property is pending approval, has been rejected, or has been deactivated.

### Password Recovery

1. Click **Forgot Password** on the login page.
2. Enter the email address registered with your account.
3. Check your inbox for a password reset link.
4. Click the link and enter your new password.
5. After resetting, all existing sessions are terminated — you will need to log in again on all devices.

---

## 2. Dashboard

The Dashboard is your homepage after logging in. It provides a real-time overview of your property's operations.

**Key Performance Indicators:**

| Metric | Description |
|--------|-------------|
| Total Rooms | Number of rooms in your property |
| Occupancy Rate | Percentage of rooms currently occupied |
| Today's Check-ins | Reservations arriving today |
| Today's Check-outs | Reservations departing today |
| Active Orders | Orders currently being processed |
| Pending Invoices | Unpaid invoices |
| Daily Revenue | Revenue earned today |
| Monthly Revenue | Revenue earned this month |

**Revenue Chart** — A 7-day revenue trend graph.

**Recent Activity** — Tables showing the most recent reservations and orders.

All dashboard data refreshes in real time via WebSocket — no need to manually reload the page.

---

## 3. Room Management

Navigate to **Rooms** from the sidebar.

### Viewing Rooms

- Rooms are displayed in a paginated table.
- **Filter** by status (available, occupied, reserved, maintenance, cleaning).
- **Search** rooms by room number.
- **Sort** by clicking column headers.
- **Export** your room list to CSV or print/PDF.

### Adding a Room

1. Click **Add Room**.
2. Fill in the details:
   - **Room Number** (required) — e.g., `101`, `A-201`.
   - **Type** — Single, Double, Twin, Suite, Deluxe, or Penthouse.
   - **Floor** — Floor number.
   - **Price** — Nightly rate.
   - **Max Occupancy** — Maximum number of guests.
   - **Amenities** — WiFi, TV, minibar, etc.
   - **Description** — Additional details about the room.
   - **Image** — Upload a photo of the room (JPEG, PNG, WebP, or GIF; max 5 MB).
3. Click **Save**.

### Editing a Room

Click on a room row or the edit icon to modify its details. You can change the status, price, amenities, or upload a new image.

### Deleting a Room

Admins can soft-delete a room. The room is deactivated but kept in the database for historical records.

### Room Statuses

| Status | Meaning |
|--------|---------|
| **Available** | Ready for booking |
| **Occupied** | Guest currently checked in |
| **Reserved** | Reserved for an upcoming booking |
| **Maintenance** | Under repair or renovation |
| **Cleaning** | Being cleaned by housekeeping |

---

## 4. Reservations

Navigate to **Reservations** from the sidebar.

### Creating a Reservation

1. Click **New Reservation**.
2. Select a **Guest** (or create one on the fly).
3. Select a **Room** (only available rooms shown).
4. Set **Check-in** and **Check-out** dates.
5. Choose a **Booking Source** (Walk-in, Phone, Website, Booking.com, Airbnb, Other).
6. Add any **Special Requests** or notes.
7. Click **Create**.

The system automatically prevents double bookings for the same room and date range. An email confirmation is sent to the guest.

### Reservation Workflow

```
Pending → Confirmed → Checked In → Checked Out
   ↓          ↓
Cancelled   Cancelled / No Show
```

| Action | What Happens |
|--------|------------|
| **Confirm** | Reservation is confirmed; email sent to guest |
| **Check In** | Room status changes to "Occupied" |
| **Check Out** | Room status changes to "Available"; checkout summary emailed |
| **Cancel** | Room is freed; reservation marked cancelled |
| **No Show** | Guest didn't arrive; room freed |

### Filtering & Searching

- Filter by status, date range, guest name, or room number.
- Results are paginated for performance.

---

## 5. Guest Management

Navigate to **Guests** from the sidebar.

### Guest Profiles

Each guest record includes:
- **Name** (first and last)
- **Email** and **Phone**
- **ID Type** — Passport, National ID, or Driver's License
- **ID Number**
- **Nationality**
- **Address**
- **Date of Birth**
- **VIP Status** — Flag for priority service
- **Notes** — Any special preferences or information

### Actions

- **Add Guest** — Create a guest profile in advance or during reservation.
- **Edit Guest** — Update any guest details.
- **Search** — Find guests by name, email, or phone number.
- **View History** — Through the Guest Folio, see all of a guest's stays, orders, and invoices.

---

## 6. Restaurant

Navigate to **Restaurant** from the sidebar. The page has three sections accessible via tabs.

### Menu Categories

Categories organize your menu (e.g., Appetizers, Main Course, Desserts, Beverages).

- **Create** — Name, description, sort order, active/inactive toggle.
- **Reorder** — Set sort order to control display sequence.
- **Toggle** — Activate or deactivate categories (inactive categories are hidden from QR menus).

### Menu Items

Each item belongs to a category.

| Field | Description |
|-------|-------------|
| Name | Item name |
| Category | Parent category |
| Price | Item price |
| Description | Details about the dish |
| Prep Time | Estimated preparation time (minutes) |
| Vegetarian | Flag for vegetarian items |
| Vegan | Flag for vegan items |
| Image | Upload a photo (JPEG, PNG, WebP, GIF; max 5 MB) |
| Available | Toggle availability on/off |

- Chefs can create and edit menu items.
- Only admins and managers can delete items.

### Tables

Manage your restaurant tables.

| Field | Description |
|-------|-------------|
| Table Number | e.g., `T1`, `Patio-3` |
| Capacity | Maximum seats |
| Location | Indoor, Outdoor, Patio, etc. |
| Status | Available, Occupied, Reserved, Cleaning |

---

## 7. Orders

Navigate to **Orders** from the sidebar.

### Creating an Order

1. Click **New Order**.
2. Select **Order Type**:
   - **Dine-in** — Select a restaurant table.
   - **Room Service** — Link to a guest and/or reservation.
   - **Takeaway** — No table assignment.
3. Add **Menu Items** with quantities.
4. Optionally apply **Tax** rate and **Discount** percentage.
5. Add **Notes** (e.g., "No onions", "Extra spicy").
6. Click **Create Order**.

> **Important:** Item prices are always pulled from the database — they cannot be manually overridden to prevent fraud. Totals are computed server-side.

### Order Workflow

```
Pending → Confirmed → Preparing → Ready → Served → Completed
                ↓          ↓        ↓
             Cancelled  Cancelled  Cancelled
```

Each status change is pushed in real time to the Kitchen Display.

### Order Numbers

Orders are automatically assigned sequential numbers:
- Regular orders: `ORD-20260316-0001`
- QR orders: `QR-20260316-0001`

---

## 8. Kitchen Display

Navigate to **Kitchen** from the sidebar.

The Kitchen Display is a real-time Kanban board designed for kitchen staff. It shows three columns:

| Column | Orders Shown |
|--------|-------------|
| **New Orders** | Confirmed orders awaiting preparation |
| **Preparing** | Orders currently being prepared |
| **Ready** | Orders ready for serving |

**Features:**
- **Real-time updates** — New orders appear instantly via WebSocket (no page refresh needed).
- **Audio alert** — A sound plays when a new order arrives.
- **Elapsed timer** — Each order card shows how long it has been waiting.
- **One-click progression** — Click a button to move an order to the next status.
- **Order details** — Each card shows table number, items with quantities, and special notes.

> **Tip:** The Kitchen Display only shows confirmed orders. Pending orders (not yet confirmed by staff) do not appear.

---

## 9. Invoices

Navigate to **Invoices** from the sidebar. *(Requires Basic plan or higher.)*

### Creating an Invoice

1. Click **New Invoice**.
2. Select a **Guest** and optionally link to a **Reservation**.
3. Add **Line Items**: description, quantity, and unit price.
4. Set **Tax Rate** (percentage) and **Discount** (percentage) if applicable.
5. The system calculates subtotal, tax, discount, and total automatically.
6. Click **Create**.

Invoices are assigned auto-generated numbers: `INV-20260316-0001`.

### Invoice Workflow

```
Draft → Pending → Paid
                → Overdue → Paid
                         → Void
                         → Refunded
```

| Action | Description |
|--------|-------------|
| **Mark as Paid** | Record payment with method (Cash, Credit Card, Debit Card, Bank Transfer, Online, Other) |
| **Void** | Cancel an invoice (admin/manager only) |
| **Email Invoice** | Send invoice details to the guest via email |

### Filtering

Filter invoices by status (draft, pending, paid, overdue, void, refunded).

---

## 10. Guest Folio

Navigate to **Folio** from the sidebar. *(Admin and Manager only.)*

The Guest Folio provides a consolidated financial view for a specific guest.

### What It Shows

| Section | Details |
|---------|---------|
| **Room Charges** | All reservations with dates, room, and nightly rate |
| **Restaurant Charges** | All orders with items and amounts |
| **Invoices** | All invoices with status and amounts |
| **Summary** | Total room charges + total restaurant charges − total paid = **Balance Due** |

Folios are automatically numbered: `FOL-20260316-0001`.

Use this view to settle a guest's account at checkout or during their stay.

---

## 11. QR Ordering

Navigate to **QR Ordering** from the sidebar. *(Admin and Manager only.)*

QR Ordering lets your restaurant guests browse the menu and place orders by scanning a QR code — no app download or login required.

### Setup

1. Go to **QR Ordering**.
2. You will see a list of all your restaurant tables.
3. Click **Generate QR** next to a table.
4. A unique QR code is generated for that table.
5. Print the QR code and place it on the table.

### How It Works (Guest Experience)

1. Guest scans the QR code with their phone camera.
2. A menu page opens in their browser — no login needed.
3. Guest browses categories and items, adds items to their order.
4. Guest submits the order.
5. The order appears instantly on the Kitchen Display and in the Orders list.
6. Staff serves the order to the correct table.

### For Staff

- QR orders appear in the Orders list with a `QR-` prefix.
- The table is automatically identified from the QR token.
- Orders are processed through the same workflow as regular orders.

---

## 12. Housekeeping

Navigate to **Housekeeping** from the sidebar.

### Creating a Task

1. Click **New Task**.
2. Select a **Room**.
3. Choose the **Task Type**:
   - **Checkout Clean** — After guest checkout.
   - **Daily Clean** — Routine daily cleaning.
   - **Deep Clean** — Thorough cleaning between guests or periodic.
   - **Maintenance** — Repairs or fixes needed.
   - **Inspection** — Room quality check.
4. Set **Priority**: Low, Medium, High, or Urgent.
5. **Assign** to a staff member.
6. Add any **Notes**.
7. Click **Create**.

### Task Workflow

```
Pending → In Progress → Completed → Inspected
```

| Status | Meaning |
|--------|---------|
| **Pending** | Task has been created, not yet started |
| **In Progress** | Staff member is working on it |
| **Completed** | Cleaning/maintenance is done, awaiting inspection |
| **Inspected** | Verified by manager — room is marked as **Available** automatically |

### Filtering

Filter tasks by status, priority, assigned staff member, or room.

---

## 13. User Management

Navigate to **Users** from the sidebar. *(Admin only.)*

### Viewing Staff

See all staff members in your property, including their name, email, role, and active status.

### Adding Staff

1. Click **Add User**.
2. Fill in: username, email, password, first name, last name, and phone.
3. New users are created with the **Staff** role by default.
4. Staff limits are enforced by your subscription plan (see [Subscription Plans](#subscription-plans)).

### Managing Staff

- **Change Role** — Promote or reassign staff (see [Roles](#17-user-roles--permissions)).
- **Activate/Deactivate** — Toggle a user's access without deleting them.
- **Delete** — Soft-delete a user (deactivates their account).

> **Note:** You cannot delete your own account or assign the `system_admin` role.

---

## 14. Settings

Navigate to **Settings** from the sidebar.

### Profile & Password

- **Edit Profile** — Update your first name, last name, and phone number.
- **Change Password** — Enter your current password and a new password.

### Subscription Plans

View your current plan and upgrade to access more features.

| Feature | Free | Basic | Premium | Enterprise |
|---------|------|-------|---------|------------|
| Rooms | 10 | 50 | Unlimited | Unlimited |
| Tables | 5 | 20 | Unlimited | Unlimited |
| Staff Accounts | 1 | 5 | Unlimited | Unlimited |
| Invoices | — | ✓ | ✓ | ✓ |
| Analytics | — | — | ✓ | ✓ |
| API Access | — | — | ✓ | ✓ |
| Custom Branding | — | — | ✓ | ✓ |
| Multi-Property | — | — | — | ✓ |

- Click **Upgrade** to start a Stripe Checkout session for the desired plan.
- Click **Manage Billing** to open the Stripe Customer Portal where you can update payment methods, view invoices, or cancel.

### Branding

*(Premium and Enterprise plans only.)*

Customize your property's appearance in the web admin:

| Setting | Description |
|---------|-------------|
| Brand Name | Displayed in the sidebar and headers |
| Tagline | Shown under the brand name |
| Logo URL | Your property's logo |
| Favicon URL | Browser tab icon |
| Primary Color | Main accent color (hex, e.g., `#2563eb`) |
| Accent Color | Secondary accent (e.g., `#d4a843`) |
| Sidebar Color | Sidebar background color |

### Desktop App

Download the desktop app for your operating system:

| Platform | Formats |
|----------|---------|
| Windows | `.msi` installer, `.exe` portable |
| macOS | `.dmg` disk image |
| Linux | `.deb` package, `.AppImage` portable |

---

## 15. Audit Logs

Navigate to **Audit Logs** from the sidebar. *(Admin and Manager only.)*

Every action performed in the system is logged for accountability and debugging.

### What's Logged

- **User actions** — Login, logout, create, update, delete operations.
- **Entity types** — Rooms, reservations, guests, orders, invoices, users, properties, etc.
- **Changes** — The specific data that changed (before/after values).
- **Timestamps** — When the action occurred.
- **User** — Who performed the action.

### Filtering

Filter audit logs by:
- **Action** (create, update, delete, login, logout, approve, reject)
- **Entity Type** (Room, Reservation, Guest, Order, Invoice, User, Property, etc.)
- **User** (who performed the action)

All logs are scoped to your property — you can only see actions within your own property.

---

## 16. System Administration

Navigate to **System Admin** from the sidebar. *(System Admin only.)*

The System Admin dashboard provides a platform-wide management view.

### Platform Statistics

| Metric | Description |
|--------|-------------|
| Total Properties | All registered properties |
| Pending Approval | Properties awaiting review |
| Active Properties | Approved and active |
| Rejected | Previously rejected signups |
| Total Users | All users across all properties |

### Managing Properties

| Action | Description |
|--------|-------------|
| **Approve** | Approve a pending property — activates the property and its admin user |
| **Reject** | Reject with an optional reason — deactivates all associated users |
| **Toggle Active** | Enable/disable an approved property |
| **Delete** | Soft-delete a property and deactivate all its users |

### Searching & Filtering

- Search properties by name or email.
- Filter by approval status: Pending, Approved, Rejected.
- View all users across all properties.

### Approval Flow

```
New Signup → Pending → Approved (property + admin activated)
                    → Rejected (with optional reason)
```

When a property is **approved**:
1. The property's `isActive` is set to `true`.
2. The property's `approvalStatus` is set to `approved`.
3. The property admin's `isActive` is set to `true`.
4. The admin can now log in and start using the system.

When a property is **rejected**:
1. The property's `approvalStatus` is set to `rejected`.
2. All associated users are deactivated.
3. The admin sees a "rejected" message if they try to log in.

---

## 17. User Roles & Permissions

| Role | Description | Key Permissions |
|------|-------------|----------------|
| **System Admin** | Platform operator | Full access to all properties. Approves/rejects signups. Manages platform. |
| **Admin** | Property owner | Full access to their property. Manages users, invoices, branding, billing, audit logs, QR codes, and folio. |
| **Manager** | Property manager | Similar to Admin but cannot manage users. Can create housekeeping tasks, access invoices, folio, QR ordering, and audit logs. |
| **Receptionist** | Front desk | Manages rooms, reservations, guests, orders. Can upload images and send email notifications. |
| **Waiter** | Restaurant staff | Views rooms, reservations, guests. Creates and manages orders. |
| **Chef** | Kitchen staff | Creates/edits menu items. Updates order statuses via Kitchen Display. |
| **Staff** | General staff | Read-only view of rooms, reservations, guests, orders, housekeeping, kitchen, and settings. Default role for new users. |

### Permission Summary

| Feature | System Admin | Admin | Manager | Receptionist | Waiter | Chef | Staff |
|---------|:-----------:|:-----:|:-------:|:------------:|:------:|:----:|:-----:|
| Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View Rooms | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create/Edit Rooms | ✓ | ✓ | ✓ | — | — | — | — |
| Delete Rooms | ✓ | ✓ | — | — | — | — | — |
| Reservations | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Guests | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ |
| Create/Edit Menu | ✓ | ✓ | ✓ | — | — | ✓ | — |
| Orders | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Kitchen Display | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Invoices | ✓ | ✓ | ✓ | — | — | — | — |
| Guest Folio | ✓ | ✓ | ✓ | — | — | — | — |
| QR Ordering | ✓ | ✓ | ✓ | — | — | — | — |
| Housekeeping | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| User Management | ✓ | ✓ | — | — | — | — | — |
| Audit Logs | ✓ | ✓ | ✓ | — | — | — | — |
| Branding | ✓ | ✓ | ✓ | — | — | — | — |
| Billing/Subscription | ✓ | ✓ | — | — | — | — | — |
| System Admin Panel | ✓ | — | — | — | — | — | — |

---

## 18. Mobile App

The HotelSaaS mobile app (built with Flutter) is available for iOS and Android and mirrors the web admin's functionality.

### Features

- **All core modules** — Dashboard, Rooms, Reservations, Guests, Restaurant, Orders, Invoices, Housekeeping, Kitchen Display, Folio, QR Ordering, Users, Settings.
- **Offline Mode** — Data is cached locally using Hive. When internet connectivity is lost, you can still view cached data. Changes sync automatically when you're back online.
- **Push Notifications** — Receive real-time alerts for new orders, reservation updates, and system events via Firebase.
- **Dark Mode** — Toggle between light and dark themes in Settings.
- **Multi-language** — Supports the same languages as the web admin (English, Spanish, French).

### Getting Started

1. Install the app from the App Store (iOS) or Google Play (Android).
2. Enter your property's server URL if prompted (production: `http://ec2-54-147-92-173.compute-1.amazonaws.com`).
3. Log in with your email and password.
4. Navigate using the bottom tab bar and drawer menu.

---

## 19. Desktop App

The HotelSaaS Desktop App (built with Tauri) provides a native application experience on Windows, macOS, and Linux.

### Features

- **Native window** — Runs as a proper desktop application with system tray integration.
- **System tray** — The app minimizes to the system tray with a "HotelSaaS - Running" tooltip.
- **All web features** — Provides the complete web admin experience in a native container.
- **Direct printing** — Print invoices and reports directly from the app.
- **Keyboard shortcuts** — Native keyboard shortcut support.

### Installation

Download from **Settings → Desktop App** in the web admin, or from the GitHub Releases page.

| Platform | File | Install Method |
|----------|------|---------------|
| Windows | `.msi` | Run installer |
| Windows | `.exe` | Portable — run directly |
| macOS | `.dmg` | Open and drag to Applications |
| Linux | `.deb` | `sudo dpkg -i file.deb` |
| Linux | `.AppImage` | `chmod +x file.AppImage && ./file.AppImage` |

**System Requirements:**
- Window: 1024×700 minimum resolution.
- Internet connection required (connects to the live server).

---

## 20. Internationalization

The HotelSaaS web admin supports three languages:

| Language | Code |
|----------|------|
| English | `en` |
| Español (Spanish) | `es` |
| Français (French) | `fr` |

### Changing Language

The app automatically detects your browser's preferred language. To manually change:

1. Look for the language switcher in the navigation area.
2. Select your preferred language.
3. Your preference is saved in your browser and persists across sessions.

All interface labels, buttons, navigation items, messages, and form elements are translated.

---

## 21. API Documentation

Interactive API documentation is available at:

```
http://ec2-54-147-92-173.compute-1.amazonaws.com/api/docs
```

The Swagger/OpenAPI documentation provides:
- A complete list of all endpoints.
- Request/response schemas.
- Authentication requirements.
- Try-it-out functionality to test endpoints directly.

### Authentication for API Calls

All authenticated endpoints require a Bearer token in the `Authorization` header:

```
Authorization: Bearer <your-jwt-token>
```

Obtain a token by calling `POST /api/auth/login` with your email and password.

---

## Frequently Asked Questions

**Q: I signed up but can't log in.**
A: New accounts require approval by the system administrator. You'll be notified once your account is approved.

**Q: I reached the room/table/staff limit.**
A: Your subscription plan has limits. Go to **Settings → Subscription** and upgrade to a higher plan.

**Q: Can guests place orders without an app?**
A: Yes! Use QR Ordering. Generate QR codes for your tables, and guests can scan them to browse the menu and place orders from their phone's browser — no app or login required.

**Q: How do I prevent double bookings?**
A: The system automatically prevents double bookings. When creating a reservation, only available rooms for the selected dates are shown. The backend uses serializable transactions to ensure no conflicts.

**Q: Can I use this on my phone?**
A: Yes. You can use the mobile app (Flutter, available on iOS and Android) or simply open the web admin in your phone's browser — it's fully responsive.

**Q: How do I export data?**
A: On the Rooms page, use the **Export CSV** button. For invoices and reports, use the **Print/PDF** option.

**Q: What happens when I delete something?**
A: All deletions are "soft deletes" — the data is hidden from the interface but preserved in the database for historical reporting and audit purposes.

**Q: Is my data isolated from other properties?**
A: Yes. The platform uses multi-tenant architecture. Every piece of data is scoped to your property. You can only see and manage data belonging to your property.

**Q: How do I contact support?**
A: Reach out to your system administrator or use the contact information provided during onboarding.
