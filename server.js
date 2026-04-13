const express = require('express');
const socketIO = require('socket.io');
const cors = require('cors');
const http = require('http');
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

// Importar y usar rutas de autenticación
const authRoutes = require('./routes/auth');
app.use('/api/auth', authRoutes);

// Importar y usar rutas de mensajes
const messageRoutes = require('./routes/messages');
app.use('/api/messages', messageRoutes);

// Para almacenar usuarios conectados
const users = {};

const { verifySocketToken } = require('./middleware/auth');
const { saveMessage } = require('./controllers/messageController');

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

// Iniciar servidor
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Servidor corriendo en puerto ${PORT}`);
});