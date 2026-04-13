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

// Para almacenar usuarios conectados
const users = {};

// Evento cuando alguien se conecta
io.on('connection', (socket) => {
    console.log('✅ Usuario conectado:', socket.id);

    // Evento cuando alguien se desconecta
    socket.on('disconnect', () => {
        console.log('❌ Usuario desconectado:', socket.id);
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