const db = require('../db/init');

// Función para obtener el historial de mensajes entre dos usuarios
const getMessages = (req, res) => {
    const { id: userId } = req.user; // El token decodificado
    const { otherUserId } = req.params;

    // Obtener todos los mensajes entre estos dos usuarios
    db.all(
        `SELECT * FROM messages 
     WHERE (sender_id = ? AND receiver_id = ?) 
     OR (sender_id = ? AND receiver_id = ?)
     ORDER BY timestamp ASC`,
        [userId, otherUserId, otherUserId, userId],
        (err, messages) => {
            if (err) {
                return res.status(500).json({ error: 'Error al obtener mensajes' });
            }
            res.json(messages);
        }
    );
};

// Función para guardar un mensaje en la base de datos
const saveMessage = (senderId, receiverId, content, callback) => {
    db.run(
        'INSERT INTO messages (sender_id, receiver_id, content, message_type) VALUES (?, ?, ?, ?)',
        [senderId, receiverId, content, 'text'],
        function (err) {
            if (err) {
                console.error('Error al guardar mensaje:', err.message);
                if (callback) callback(err);
                return;
            }
            console.log(`✅ Mensaje guardado - De ${senderId} a ${receiverId}`);
            if (callback) callback(null, { id: this.lastID, timestamp: new Date() });
        }
    );
};

// Función para obtener todos los usuarios
const getUsers = (req, res) => {
    console.log('📥 PETICIÓN GET /api/messages recibida');
    console.log('🔐 req.user:', req.user);

    if (!req.user) {
        console.log('❌ NO HAY USER EN req.user');
        return res.status(401).json({ error: 'No autenticado' });
    }

    const { id: userId } = req.user;  // ← CAMBIO AQUÍ
    console.log(`🔍 Buscando usuarios EXCEPTO el usuario ID: ${userId}`);

    db.all(
        'SELECT id, username, email, status FROM users WHERE id != ?',
        [userId],
        (err, users) => {
            if (err) {
                console.log('❌ Error en consulta SQL:', err.message);
                return res.status(500).json({ error: 'Error al obtener usuarios' });
            }

            console.log(`✅ Se encontraron ${users ? users.length : 0} usuarios`);
            console.log('📊 Usuarios:', users);
            res.json(users || []);
        }
    );
};

// Función para marcar mensajes como leídos
const markMessagesAsRead = (req, res) => {
    const { receiverId } = req.body;
    const senderId = receiverId; // El que mandó los mensajes
    const currentUserId = req.user.id; // El que está leyendo

    console.log(`📖 Marcando mensajes como leídos de ${senderId} a ${currentUserId}`);

    db.run(
        'UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0',
        [senderId, currentUserId],
        function (err) {
            if (err) {
                console.error('Error marcando como leído:', err.message);
                return res.status(500).json({ error: 'Error marcando como leído' });
            }

            console.log(`✅ ${this.changes} mensajes marcados como leídos`);
            res.json({
                mensaje: 'Mensajes marcados como leídos',
                markedCount: this.changes,
            });
        }
    );
};

// Función para obtener contador de mensajes no leídos
const getUnreadCount = (req, res) => {
    const userId = req.user.id;

    console.log(`📊 Obteniendo contador de no leídos para usuario ${userId}`);

    db.all(
        `SELECT sender_id, COUNT(*) as count 
     FROM messages 
     WHERE receiver_id = ? AND is_read = 0 
     GROUP BY sender_id`,
        [userId],
        (err, rows) => {
            if (err) {
                return res.status(500).json({ error: 'Error obteniendo contador' });
            }

            // Convertir a objeto: { userId: count }
            const unreadCounts = {};
            if (rows && rows.length > 0) {
                rows.forEach(row => {
                    unreadCounts[row.sender_id] = row.count;
                });
            }

            console.log(`✅ Conteos de no leídos:`, unreadCounts);
            res.json(unreadCounts);
        }
    );
};

module.exports = { getMessages, saveMessage, getUsers, markMessagesAsRead, getUnreadCount };