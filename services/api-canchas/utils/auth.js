'use strict';

const jwt = require('jsonwebtoken');
// This service will also need the JWT_SECRET from its environment variables
const JWT_SECRET = process.env.JWT_SECRET;

const verifyToken = (event) => {
  const authHeader = event.headers.Authorization || event.headers.authorization;
  if (!authHeader) return null;

  const token = authHeader.split(' ')[1];
  if (!token) return null;

  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error("Token verification failed:", error);
    return null;
  }
};

module.exports = {
  verifyToken,
};
