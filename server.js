const express = require('express');
const socketIO = require('socket.io');
const cors = require('cors');
const http = require('http');
const path = require('path');
require('dotenv').config();
const db = require('./db/init');


const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: { origin: "*" }
});

// Middleware
app.use(cors());
app.use(express.json());

// Servir carpeta de uploads como archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Importar y usar rutas de autenticación
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Importar y usar rutas de mensajes
const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

// Importar y usar rutas de grupos
const groupRoutes = require('./routes/groups');
app.use('/api/groups', groupRoutes);

// Para almacenar usuarios conectados
const users = {};

const { verifySocketToken } = require('./middleware/auth');
const { saveMessage, saveImageMessage } = require('./controllers/messageController');

// Almacenar usuarios conectados: { userId: socketId }
const connectedUsers = {};

// Evento cuando alguien se conecta
io.on('connection', (socket) => {
    console.log('✅ Nuevo socket conectado:', socket.id);

    // Evento para autenticarse
    socket.on('authenticate', (token) => {
        const decoded = verifySocketToken(token);

        if (!decoded) {
            console.log('❌ Token inválido para socket:', socket.id);
            socket.emit('authenticated', { success: false, error: 'Token inválido' });
            return;
        }

        // Guardar la información del usuario en el socket
        socket.userId = decoded.id;
        socket.username = decoded.username;
        connectedUsers[decoded.id] = socket.id;

        console.log(`✅ Usuario autenticado en Socket: ${decoded.username} (ID: ${decoded.id})`);
        socket.emit('authenticated', {
            success: true,
            userId: decoded.id,
            username: decoded.username
        });
    });

    // Evento para enviar un mensaje
    socket.on('send_message', (data) => {
        const { receiverId, content } = data;
        const senderId = socket.userId;

        if (!senderId || !content) {
            socket.emit('error', { message: 'Datos incompletos' });
            return;
        }

        console.log(`📨 Mensaje de ${senderId} a ${receiverId}: ${content}`);

        // Guardar el mensaje en la base de datos
        saveMessage(senderId, receiverId, content, (err, result) => {
            if (err) {
                socket.emit('error', { message: 'Error al guardar mensaje' });
                return;
            }

            // Crear el objeto del mensaje
            const message = {
                id: result.id,
                sender_id: senderId,
                receiver_id: receiverId,
                content: content,
                timestamp: result.timestamp,
                is_read: 0
            };

            // Enviar confirmación al remitente
            socket.emit('message_sent', {
                success: true,
                message: message
            });

            // Si el receptor está conectado, enviarle el mensaje
            if (connectedUsers[receiverId]) {
                io.to(connectedUsers[receiverId]).emit('receive_message', message);
            }
        });
    });

    // Evento para enviar una imagen
    socket.on('send_image', (data) => {
        const { receiverId, imageUrl } = data;
        const senderId = socket.userId;

        if (!senderId || !imageUrl) {
            socket.emit('error', { message: 'Datos incompletos' });
            return;
        }

        console.log(`🖼️ Imagen de ${senderId} a ${receiverId}`);

        // Guardar la imagen en la base de datos
        saveImageMessage(senderId, receiverId, imageUrl, (err, result) => {
            if (err) {
                socket.emit('error', { message: 'Error al guardar imagen' });
                return;
            }

            // Crear el objeto del mensaje con imagen
            const imageMessage = {
                id: result.id,
                sender_id: senderId,
                receiver_id: receiverId,
                content: imageUrl,
                message_type: 'image',
                timestamp: result.timestamp,
                is_read: 0
            };

            console.log(`✅ Imagen guardada y enviada`);

            // Enviar confirmación al remitente
            socket.emit('message_sent', {
                success: true,
                message: imageMessage
            });

            // Si el receptor está conectado, enviarle la imagen
            if (connectedUsers[receiverId]) {
                io.to(connectedUsers[receiverId]).emit('receive_message', imageMessage);
            }
        });
    });

    // ==========================================
    // EVENTOS PARA CHATS GRUPALES
    // ==========================================

    // Usuario se une a una sala de grupo
    socket.on('join_group', (data) => {
        const { groupId, userId } = data;

        console.log(`👥 Usuario ${userId} se unió al grupo ${groupId}`);

        // Agregar socket a la sala del grupo
        socket.join(`group_${groupId}`);

        // Notificar a otros en el grupo
        io.to(`group_${groupId}`).emit('user_joined_group', {
            groupId: groupId,
            userId: userId,
            message: `Usuario ${userId} se unió`,
        });
    });

    // Usuario envía mensaje al grupo
    socket.on('send_group_message', (data) => {
        const { groupId, content } = data;
        const senderId = socket.userId;

        if (!senderId || !content) {
            socket.emit('error', { message: 'Datos incompletos' });
            return;
        }

        console.log(`💬 Mensaje de grupo - Usuario ${senderId} en grupo ${groupId}`);

        // Guardar mensaje en la base de datos
        const { saveMessage } = require('./controllers/messageController');

        // Reutilizar saveMessage pero con group_id
        db.run(
            'INSERT INTO messages (sender_id, receiver_id, group_id, content, message_type) VALUES (?, ?, ?, ?, ?)',
            [senderId, null, groupId, content, 'text'],
            function (err) {
                if (err) {
                    console.error('❌ Error al guardar mensaje de grupo:', err.message);
                    socket.emit('error', { message: 'Error al guardar mensaje' });
                    return;
                }

                console.log(`✅ Mensaje de grupo guardado - ID: ${this.lastID}`);

                // Crear objeto del mensaje
                const message = {
                    id: this.lastID,
                    sender_id: senderId,
                    receiver_id: null,
                    group_id: groupId,
                    content: content,
                    message_type: 'text',
                    timestamp: new Date(),
                    is_read: 0,
                };

                // Enviar confirmación al remitente
                socket.emit('message_sent', {
                    success: true,
                    message: message,
                });

                // Enviar mensaje a TODOS en la sala del grupo
                io.to(`group_${groupId}`).emit('receive_message', message);
            }
        );
    });

    // Usuario envía imagen al grupo
    socket.on('send_group_image', (data) => {
        const { groupId, imageUrl } = data;
        const senderId = socket.userId;

        if (!senderId || !imageUrl) {
            socket.emit('error', { message: 'Datos incompletos' });
            return;
        }

        console.log(`🖼️ Imagen de grupo - Usuario ${senderId} en grupo ${groupId}`);

        // Guardar imagen en la base de datos
        db.run(
            'INSERT INTO messages (sender_id, receiver_id, group_id, content, message_type) VALUES (?, ?, ?, ?, ?)',
            [senderId, null, groupId, imageUrl, 'image'],
            function (err) {
                if (err) {
                    console.error('❌ Error al guardar imagen de grupo:', err.message);
                    socket.emit('error', { message: 'Error al guardar imagen' });
                    return;
                }

                console.log(`✅ Imagen de grupo guardada`);

                // Crear objeto del mensaje
                const imageMessage = {
                    id: this.lastID,
                    sender_id: senderId,
                    receiver_id: null,
                    group_id: groupId,
                    content: imageUrl,
                    message_type: 'image',
                    timestamp: new Date(),
                    is_read: 0,
                };

                // Enviar confirmación al remitente
                socket.emit('message_sent', {
                    success: true,
                    message: imageMessage,
                });

                // Enviar imagen a TODOS en el grupo
                io.to(`group_${groupId}`).emit('receive_message', imageMessage);
            }
        );
    });

    // Usuario está escribiendo en grupo
    socket.on('group_typing', (data) => {
        const { groupId, username } = data;
        const userId = socket.userId;

        console.log(`✏️ ${username} está escribiendo en grupo ${groupId}`);

        // Enviar a otros en el grupo (excepto al que escribe)
        socket.to(`group_${groupId}`).emit('user_typing_group', {
            groupId: groupId,
            userId: userId,
            username: username,
        });
    });

    // Usuario deja de escribir en grupo
    socket.on('group_stop_typing', (data) => {
        const { groupId } = data;
        const userId = socket.userId;

        console.log(`⏹️ Usuario ${userId} dejó de escribir en grupo ${groupId}`);

        // Notificar a otros
        socket.to(`group_${groupId}`).emit('user_stop_typing_group', {
            groupId: groupId,
            userId: userId,
        });
    });

    // Usuario se retira de una sala de grupo
    socket.on('leave_group', (data) => {
        const { groupId, userId } = data;

        console.log(`👋 Usuario ${userId} salió del grupo ${groupId}`);

        // Remover socket de la sala
        socket.leave(`group_${groupId}`);

        // Notificar a otros en el grupo
        io.to(`group_${groupId}`).emit('user_left_group', {
            groupId: groupId,
            userId: userId,
            message: `Usuario ${userId} salió`,
        });
    });

    // Evento cuando alguien se desconecta
    socket.on('disconnect', () => {
        if (socket.userId) {
            delete connectedUsers[socket.userId];
            console.log(`❌ Usuario desconectado: ${socket.username} (ID: ${socket.userId})`);
        }
    });

    // Evento para notificar que está escribiendo
    socket.on('typing', (data) => {
        const { receiverId } = data;
        if (connectedUsers[receiverId]) {
            io.to(connectedUsers[receiverId]).emit('user_typing', {
                userId: socket.userId,
                username: socket.username
            });
        }
    });

    // Evento para notificar que dejó de escribir
    socket.on('stop_typing', (data) => {
        const { receiverId } = data;
        if (connectedUsers[receiverId]) {
            io.to(connectedUsers[receiverId]).emit('user_stop_typing', {
                userId: socket.userId
            });
        }
    });
});

// Middleware para ver todas las peticiones
app.use((req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
});

// Ruta de prueba
app.get('/', (req, res) => {
    console.log('✅ Alguien accedió a la ruta principal');
    res.json({ mensaje: 'Servidor funcionando correctamente' });
});

// Ruta de debug para verificar token
app.get('/api/debug/check-token', (req, res) => {
    const token = req.headers.authorization?.split(' ')[1];
    console.log('🔍 Token recibido en /debug:', token ? token.substring(0, 20) + '...' : 'NO HAY TOKEN');
    res.json({ token: token ? token.substring(0, 20) + '...' : 'No hay token' });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});