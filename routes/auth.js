const express = require('express');
const router = express.Router();
const { register, login, updateUser, getUserProfile } = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');

// Ruta para registrarse: POST /api/auth/register
// Espera: { username, email, password }
router.post('/register', register);

// Ruta para iniciar sesión: POST /api/auth/login
// Espera: { email, password }
router.post('/login', login);

// Ruta para obtener perfil de un usuario
// GET /api/users/:id (requiere token)
router.get('/profile/:id', verifyToken, getUserProfile);

// Ruta para actualizar perfil del usuario
// PUT /api/users/:id (requiere token)
router.put('/profile/:id', verifyToken, updateUser);

module.exports = router;