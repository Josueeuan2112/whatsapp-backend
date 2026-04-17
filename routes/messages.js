const express = require('express');
const router = express.Router();
const { getMessages, getUsers, markMessagesAsRead, getUnreadCount } = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');

// Ruta para obtener el historial de mensajes con otro usuario
// GET /api/messages/:otherUserId (requiere token)
router.get('/:otherUserId', verifyToken, getMessages);

// Ruta para obtener lista de usuarios (para saber con quién chatear)
// GET /api/users (requiere token)
router.get('/', verifyToken, getUsers);

// Ruta para obtener contador de mensajes no leídos
// GET /api/messages/unread/count (requiere token)
router.get('/unread/count', verifyToken, getUnreadCount);

// Ruta para marcar mensajes como leídos
// POST /api/messages/mark-read (requiere token)
router.post('/mark-read', verifyToken, markMessagesAsRead);

module.exports = router;