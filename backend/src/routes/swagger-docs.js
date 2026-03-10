/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user (admin only)
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterRequest'
 *     responses:
 *       201: { description: User created }
 *       400: { description: Validation error }
 *       409: { description: Duplicate email/username }
 *
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login with email and password
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LoginRequest'
 *     responses:
 *       200:
 *         description: Tokens returned
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/LoginResponse'
 *       401: { description: Invalid credentials }
 *
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user profile
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *
 * /auth/refresh:
 *   post:
 *     tags: [Auth]
 *     summary: Refresh access token (token rotation)
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: New token pair }
 *       401: { description: Invalid/expired refresh token }
 *
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke a specific refresh token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [refreshToken]
 *             properties:
 *               refreshToken: { type: string }
 *     responses:
 *       200: { description: Logged out }
 *
 * /auth/logout-all:
 *   post:
 *     tags: [Auth]
 *     summary: Revoke all refresh tokens for current user
 *     responses:
 *       200: { description: All sessions terminated }
 *
 * /auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset email
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200: { description: Reset email sent (always returns 200 for security) }
 *
 * /auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password with token
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password reset successfully }
 *       400: { description: Invalid or expired token }
 */

/**
 * @swagger
 * /rooms:
 *   get:
 *     tags: [Rooms]
 *     summary: List rooms (paginated, filterable)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20, maximum: 100 } }
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: type, schema: { type: string } }
 *       - { in: query, name: floor, schema: { type: integer } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rooms: { type: array, items: { $ref: '#/components/schemas/Room' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *   post:
 *     tags: [Rooms]
 *     summary: Create a room (admin/manager)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       201: { description: Room created }
 *
 * /rooms/{id}:
 *   get:
 *     tags: [Rooms]
 *     summary: Get room by ID
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Room'
 *   put:
 *     tags: [Rooms]
 *     summary: Update a room (admin/manager)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Room'
 *     responses:
 *       200: { description: Room updated }
 *   delete:
 *     tags: [Rooms]
 *     summary: Soft-delete a room (admin)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Room soft-deleted }
 */

/**
 * @swagger
 * /guests:
 *   get:
 *     tags: [Guests]
 *     summary: List guests (paginated, searchable)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: search, schema: { type: string } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 guests: { type: array, items: { $ref: '#/components/schemas/Guest' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *   post:
 *     tags: [Guests]
 *     summary: Create a guest
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Guest'
 *     responses:
 *       201: { description: Guest created }
 *
 * /guests/{id}:
 *   get:
 *     tags: [Guests]
 *     summary: Get guest by ID
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Guest'
 *   put:
 *     tags: [Guests]
 *     summary: Update a guest
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Guest updated }
 *   delete:
 *     tags: [Guests]
 *     summary: Soft-delete a guest
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Guest soft-deleted }
 */

/**
 * @swagger
 * /reservations:
 *   get:
 *     tags: [Reservations]
 *     summary: List reservations (paginated, filterable by status/date range)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: status, schema: { type: string } }
 *       - { in: query, name: startDate, schema: { type: string, format: date } }
 *       - { in: query, name: endDate, schema: { type: string, format: date } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 reservations: { type: array, items: { $ref: '#/components/schemas/Reservation' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *   post:
 *     tags: [Reservations]
 *     summary: Create a reservation (SERIALIZABLE isolation)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Reservation'
 *     responses:
 *       201: { description: Reservation created }
 *       409: { description: Room already booked for the given dates }
 *
 * /reservations/{id}:
 *   get:
 *     tags: [Reservations]
 *     summary: Get reservation by ID
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Reservation'
 *   put:
 *     tags: [Reservations]
 *     summary: Update a reservation
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Reservation updated }
 *   delete:
 *     tags: [Reservations]
 *     summary: Soft-delete a reservation (admin/manager)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Reservation soft-deleted }
 *
 * /reservations/{id}/status:
 *   patch:
 *     tags: [Reservations]
 *     summary: Change reservation status
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string, enum: [pending,confirmed,checked_in,checked_out,cancelled,no_show] }
 *     responses:
 *       200: { description: Status updated }
 *       400: { description: Invalid transition }
 */

/**
 * @swagger
 * /restaurant/categories:
 *   get:
 *     tags: [Restaurant]
 *     summary: List menu categories
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/MenuCategory' }
 *   post:
 *     tags: [Restaurant]
 *     summary: Create a menu category (admin/manager)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuCategory'
 *     responses:
 *       201: { description: Category created }
 *
 * /restaurant/menu:
 *   get:
 *     tags: [Restaurant]
 *     summary: List menu items
 *     parameters:
 *       - { in: query, name: categoryId, schema: { type: integer } }
 *       - { in: query, name: available, schema: { type: boolean } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/MenuItem' }
 *   post:
 *     tags: [Restaurant]
 *     summary: Create a menu item (admin/manager/chef)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/MenuItem'
 *     responses:
 *       201: { description: Menu item created }
 *
 * /restaurant/tables:
 *   get:
 *     tags: [Restaurant]
 *     summary: List restaurant tables
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/RestaurantTable' }
 *   post:
 *     tags: [Restaurant]
 *     summary: Create a restaurant table (admin/manager)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RestaurantTable'
 *     responses:
 *       201: { description: Table created }
 */

/**
 * @swagger
 * /orders:
 *   get:
 *     tags: [Orders]
 *     summary: List orders (paginated, filterable)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: status, schema: { type: string } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 orders: { type: array, items: { $ref: '#/components/schemas/Order' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *   post:
 *     tags: [Orders]
 *     summary: Create an order (DB-sequence number, server-side totals)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Order'
 *     responses:
 *       201: { description: Order created }
 *
 * /orders/{id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get order by ID
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Order'
 *   put:
 *     tags: [Orders]
 *     summary: Update an order
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Order updated }
 *
 * /orders/{id}/status:
 *   patch:
 *     tags: [Orders]
 *     summary: Change order status (validates transitions)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status: { type: string }
 *     responses:
 *       200: { description: Status changed }
 *       400: { description: Invalid transition }
 */

/**
 * @swagger
 * /invoices:
 *   get:
 *     tags: [Invoices]
 *     summary: List invoices (paginated, filterable)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 20 } }
 *       - { in: query, name: status, schema: { type: string } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 invoices: { type: array, items: { $ref: '#/components/schemas/Invoice' } }
 *                 pagination: { $ref: '#/components/schemas/Pagination' }
 *   post:
 *     tags: [Invoices]
 *     summary: Create an invoice
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Invoice'
 *     responses:
 *       201: { description: Invoice created }
 *
 * /invoices/{id}:
 *   get:
 *     tags: [Invoices]
 *     summary: Get invoice by ID
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200:
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Invoice'
 *   put:
 *     tags: [Invoices]
 *     summary: Update an invoice
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Invoice updated }
 *
 * /invoices/{id}/pay:
 *   patch:
 *     tags: [Invoices]
 *     summary: Mark invoice as paid
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [paymentMethod]
 *             properties:
 *               paymentMethod: { type: string, enum: [cash,credit_card,debit_card,bank_transfer,online,other] }
 *     responses:
 *       200: { description: Invoice paid }
 *
 * /invoices/{id}/void:
 *   patch:
 *     tags: [Invoices]
 *     summary: Void an invoice (admin/manager)
 *     parameters:
 *       - { in: path, name: id, required: true, schema: { type: integer } }
 *     responses:
 *       200: { description: Invoice voided }
 */

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get overview statistics
 *     responses:
 *       200: { description: Dashboard stats object }
 *
 * /dashboard/recent-reservations:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get 10 most recent reservations
 *     responses:
 *       200: { description: Array of recent reservations }
 *
 * /dashboard/recent-orders:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get 10 most recent orders
 *     responses:
 *       200: { description: Array of recent orders }
 *
 * /dashboard/revenue-chart:
 *   get:
 *     tags: [Dashboard]
 *     summary: Get 7-day revenue chart data
 *     responses:
 *       200: { description: Array of daily revenue }
 */

/**
 * @swagger
 * /audit-logs:
 *   get:
 *     tags: [Audit Logs]
 *     summary: List audit logs (admin/manager)
 *     parameters:
 *       - { in: query, name: page, schema: { type: integer, default: 1 } }
 *       - { in: query, name: limit, schema: { type: integer, default: 50 } }
 *       - { in: query, name: action, schema: { type: string } }
 *       - { in: query, name: entityType, schema: { type: string } }
 *       - { in: query, name: userId, schema: { type: integer } }
 *     responses:
 *       200: { description: Paginated audit logs }
 */

/**
 * @swagger
 * /uploads/image:
 *   post:
 *     tags: [Uploads]
 *     summary: Upload an image (room photo, menu photo, etc.)
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image, type]
 *             properties:
 *               image: { type: string, format: binary }
 *               type: { type: string, enum: [room, menu, profile] }
 *     responses:
 *       200:
 *         description: Image uploaded
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url: { type: string }
 *                 filename: { type: string }
 */
