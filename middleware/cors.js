const cors = require('cors');

const corsOptions = {
  origin: function (origin, callback) {
    // Default allowed origins
    const defaultOrigins = [
      'http://localhost:3000',
      'http://localhost:19006', // Expo web default port
      'https://medical-case-simulator.netlify.app',
      'https://preview-medical-case-simulator-kzmqunml3u6b91zmyx69.vusercontent.net'
    ];
    
    // Get additional origins from environment variable
    const envOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const allowedOrigins = [...defaultOrigins, ...envOrigins];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    // Check if origin is allowed
    if (allowedOrigins.includes(origin)) {
      console.log(`CORS: Origin allowed: ${origin}`);
      callback(null, true);
    } else {
      // In development, be more permissive
      if (process.env.NODE_ENV === 'development') {
        console.warn(`CORS: Allowing origin in development: ${origin}`);
        callback(null, true);
      } else {
        console.error(`CORS: Origin not allowed: ${origin}`);
        console.error(`CORS: Allowed origins:`, allowedOrigins);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'Cache-Control',
    'Pragma',
    'X-Request-ID'
  ],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count', 'X-Request-ID'],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

module.exports = cors(corsOptions);