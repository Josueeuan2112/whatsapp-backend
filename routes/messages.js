const express = require('express');
const router = express.Router();
const { getMessages, getUsers, markMessagesAsRead, getUnreadCount } = require('../controllers/messageController');
const { verifyToken } = require('../middleware/auth');
const imageHandler = require('../utils/imageHandler');

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

// Ruta para subir imagen
// POST /api/messages/upload-image (requiere token)
router.post('/upload-image', verifyToken, (req, res) => {
    try {
        const { base64Image } = req.body;
        const userId = req.user.id;

        console.log(`📤 Subiendo imagen del usuario ${userId}`);

        // Validar que la imagen no esté vacía
        if (!base64Image) {
            return res.status(400).json({ error: 'Imagen no proporcionada' });
        }

        // Validar formato Base64
        if (!imageHandler.validateBase64Image(base64Image)) {
            return res.status(400).json({ error: 'Imagen inválida' });
        }

        // Generar nombre único
        const filename = imageHandler.generateImageFilename(userId);

        // Guardar imagen
        const imageUrl = imageHandler.saveBase64Image(base64Image, filename);

        // Retornar URL para que Flutter la use
        res.json({
            mensaje: 'Imagen subida exitosamente',
            imageUrl: imageUrl,
            filename: filename,
        });
    } catch (error) {
        console.error('❌ Error subiendo imagen:', error.message);
        res.status(500).json({ error: 'Error al subir imagen' });
    }
});

module.exports = router;