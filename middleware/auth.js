const jwt = require('jsonwebtoken');

// Middleware para verificar tokens JWT en peticiones HTTP
const verifyToken = (req, res, next) => {
    // Obtener el token del header (formato: Bearer <token>)
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token no proporcionado' });
    }

    try {
        // Verificar el token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded; // Guardar info del usuario en la petición
        next(); // Continuar al siguiente middleware/ruta
    } catch (err) {
        return res.status(401).json({ error: 'Token inválido o expirado' });
    }
};

// Función para verificar token en Socket.io
const verifySocketToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return decoded;
    } catch (err) {
        return null;
    }
};

module.exports = { verifyToken, verifySocketToken };