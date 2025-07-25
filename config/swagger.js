const swaggerJSDoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Medical Case Simulator API',
      version: '1.0.0',
      description: process.env.NODE_ENV === 'production' ? 'Production server' : 'Development server'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js', './models/*.js']
};

const specs = swaggerJSDoc(options);

const setupSwagger = (app) => {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "Medical Case Simulator API",
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true
    }
  }));
};

module.exports = { setupSwagger };