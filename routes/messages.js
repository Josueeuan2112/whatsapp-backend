const express = require('express');
const router = express.Router();
const { getMessages, getUsers } = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');

// Ruta para obtener el historial de mensajes con otro usuario
// GET /api/messages/:otherUserId (requiere token)
router.get('/:otherUserId', verifyToken, getMessages);

// Ruta para obtener lista de usuarios (para saber con quién chatear)
// GET /api/users (requiere token)
router.get('/', verifyToken, getUsers);

module.exports = router;