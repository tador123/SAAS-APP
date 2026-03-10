const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'HotelSaaS API',
      version: '1.0.0',
      description: 'Hotel + Restaurant Hospitality SaaS Backend API',
      contact: { name: 'HotelSaaS Team' },
    },
    servers: [
      { url: '/api/v1', description: 'Versioned' },
      { url: '/api', description: 'Legacy (backward-compatible)' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            requestId: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            limit: { type: 'integer' },
            totalPages: { type: 'integer' },
          },
        },
        // ── Auth ───────────────────────────────
        LoginRequest: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
          },
        },
        LoginResponse: {
          type: 'object',
          properties: {
            token: { type: 'string' },
            refreshToken: { type: 'string' },
            user: { $ref: '#/components/schemas/User' },
          },
        },
        RegisterRequest: {
          type: 'object',
          required: ['username', 'email', 'password', 'firstName', 'lastName'],
          properties: {
            username: { type: 'string', minLength: 3, maxLength: 50 },
            email: { type: 'string', format: 'email' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'receptionist', 'waiter', 'chef', 'staff'] },
            phone: { type: 'string' },
          },
        },
        // ── User ──────────────────────────────
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            username: { type: 'string' },
            email: { type: 'string' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'manager', 'receptionist', 'waiter', 'chef', 'staff'] },
            phone: { type: 'string' },
            isActive: { type: 'boolean' },
            subscriptionPlan: { type: 'string', enum: ['free', 'basic', 'premium', 'enterprise'] },
            lastLogin: { type: 'string', format: 'date-time' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        // ── Room ──────────────────────────────
        Room: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            roomNumber: { type: 'string' },
            type: { type: 'string', enum: ['single', 'double', 'twin', 'suite', 'deluxe', 'penthouse'] },
            floor: { type: 'integer' },
            price: { type: 'number' },
            status: { type: 'string', enum: ['available', 'occupied', 'reserved', 'maintenance', 'cleaning'] },
            amenities: { type: 'array', items: { type: 'string' } },
            description: { type: 'string' },
            maxOccupancy: { type: 'integer' },
            images: { type: 'array', items: { type: 'string' } },
          },
        },
        // ── Guest ─────────────────────────────
        Guest: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            firstName: { type: 'string' },
            lastName: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            idType: { type: 'string', enum: ['passport', 'national_id', 'drivers_license', 'other'] },
            idNumber: { type: 'string' },
            nationality: { type: 'string' },
            address: { type: 'string' },
            dateOfBirth: { type: 'string', format: 'date' },
            vipStatus: { type: 'boolean' },
            notes: { type: 'string' },
          },
        },
        // ── Reservation ────────────────────────
        Reservation: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            guestId: { type: 'integer' },
            roomId: { type: 'integer' },
            checkIn: { type: 'string', format: 'date' },
            checkOut: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show'] },
            adults: { type: 'integer' },
            children: { type: 'integer' },
            totalAmount: { type: 'number' },
            paidAmount: { type: 'number' },
            specialRequests: { type: 'string' },
            source: { type: 'string', enum: ['walk_in', 'phone', 'website', 'booking_com', 'airbnb', 'other'] },
          },
        },
        // ── MenuCategory ──────────────────────
        MenuCategory: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            sortOrder: { type: 'integer' },
            isActive: { type: 'boolean' },
          },
        },
        // ── MenuItem ──────────────────────────
        MenuItem: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            categoryId: { type: 'integer' },
            name: { type: 'string' },
            description: { type: 'string' },
            price: { type: 'number' },
            image: { type: 'string' },
            isAvailable: { type: 'boolean' },
            preparationTime: { type: 'integer' },
            allergens: { type: 'array', items: { type: 'string' } },
            isVegetarian: { type: 'boolean' },
            isVegan: { type: 'boolean' },
          },
        },
        // ── RestaurantTable ───────────────────
        RestaurantTable: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            tableNumber: { type: 'string' },
            capacity: { type: 'integer' },
            status: { type: 'string', enum: ['available', 'occupied', 'reserved', 'maintenance'] },
            location: { type: 'string', enum: ['indoor', 'outdoor', 'terrace', 'private'] },
          },
        },
        // ── Order ─────────────────────────────
        OrderItem: {
          type: 'object',
          properties: {
            menuItemId: { type: 'integer' },
            name: { type: 'string' },
            quantity: { type: 'integer' },
            price: { type: 'number' },
            notes: { type: 'string' },
          },
        },
        Order: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            orderNumber: { type: 'string' },
            tableId: { type: 'integer' },
            guestId: { type: 'integer' },
            reservationId: { type: 'integer' },
            items: { type: 'array', items: { $ref: '#/components/schemas/OrderItem' } },
            orderType: { type: 'string', enum: ['dine_in', 'room_service', 'takeaway'] },
            status: { type: 'string', enum: ['pending', 'confirmed', 'preparing', 'ready', 'served', 'completed', 'cancelled'] },
            subtotal: { type: 'number' },
            tax: { type: 'number' },
            discount: { type: 'number' },
            total: { type: 'number' },
            notes: { type: 'string' },
            servedBy: { type: 'integer' },
          },
        },
        // ── Invoice ───────────────────────────
        InvoiceItem: {
          type: 'object',
          properties: {
            description: { type: 'string' },
            quantity: { type: 'integer' },
            unitPrice: { type: 'number' },
            total: { type: 'number' },
          },
        },
        Invoice: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            invoiceNumber: { type: 'string' },
            guestId: { type: 'integer' },
            reservationId: { type: 'integer' },
            items: { type: 'array', items: { $ref: '#/components/schemas/InvoiceItem' } },
            subtotal: { type: 'number' },
            tax: { type: 'number' },
            discount: { type: 'number' },
            total: { type: 'number' },
            status: { type: 'string', enum: ['draft', 'pending', 'paid', 'overdue', 'void', 'refunded'] },
            paymentMethod: { type: 'string', enum: ['cash', 'credit_card', 'debit_card', 'bank_transfer', 'online', 'other'] },
            paidAt: { type: 'string', format: 'date-time' },
            dueDate: { type: 'string', format: 'date' },
            notes: { type: 'string' },
          },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth', description: 'Authentication & token management' },
      { name: 'Rooms', description: 'Hotel room management' },
      { name: 'Guests', description: 'Guest management' },
      { name: 'Reservations', description: 'Booking management' },
      { name: 'Restaurant', description: 'Menu categories, items, and tables' },
      { name: 'Orders', description: 'Restaurant order management' },
      { name: 'Invoices', description: 'Billing & invoices' },
      { name: 'Dashboard', description: 'Analytics & statistics' },
      { name: 'Audit Logs', description: 'Activity audit trail' },
      { name: 'Uploads', description: 'File uploads' },
    ],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);

/** Mount Swagger UI on the express app */
function setupSwagger(app) {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customSiteTitle: 'HotelSaaS API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  }));
  // Raw spec endpoint
  app.get('/api-docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

module.exports = { setupSwagger, swaggerSpec };
