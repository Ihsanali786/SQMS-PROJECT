// backend/config/swagger.js
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Queue Management System API',
      version: '2.0.0',
      description: 'Complete API documentation for SQMS',
      contact: {
        name: 'SQMS Support',
        email: 'support@smartqueue.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:5000/api',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string', enum: ['user', 'admin'] }
          }
        },
        Token: {
          type: 'object',
          properties: {
            tokenNumber: { type: 'string' },
            service: { type: 'string' },
            branchId: { type: 'string' },
            status: { type: 'string', enum: ['waiting', 'serving', 'completed', 'cancelled'] },
            position: { type: 'number' },
            estimatedWaitTime: { type: 'number' }
          }
        },
        Branch: {
          type: 'object',
          properties: {
            branchId: { type: 'string' },
            name: { type: 'string' },
            city: { type: 'string' },
            address: { type: 'string' },
            capacity: { type: 'number' }
          }
        }
      }
    },
    security: [{ bearerAuth: [] }]
  },
  apis: ['./routes/*.js']
};

const specs = swaggerJsdoc(options);

module.exports = { swaggerUi, specs };