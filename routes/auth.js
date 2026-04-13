const express = require('express');
const router = express.Router();
const { register, login } = require('../controllers/authController');

// Ruta para registrarse: POST /api/auth/register
// Espera: { username, email, password }
router.post('/register', register);

// Ruta para iniciar sesión: POST /api/auth/login
// Espera: { email, password }
router.post('/login', login);

module.exports = router;