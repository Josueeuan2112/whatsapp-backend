const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/init');

// Función para REGISTRAR un nuevo usuario
const register = (req, res) => {
    const { username, email, password } = req.body;

    // Validar que todos los campos estén completos
    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }

    // Encriptar la contraseña
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Insertar en la base de datos
    db.run(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email, hashedPassword],
        function (err) {
            if (err) {
                console.error('Error al registrar:', err.message);
                return res.status(400).json({ error: 'El usuario o email ya existe' });
            }

            // Crear un token JWT para el nuevo usuario
            const token = jwt.sign(
                { id: this.lastID, username: username },
                process.env.JWT_SECRET,
                { expiresIn: '7d' }
            );

            console.log(`✅ Nuevo usuario registrado: ${username}`);
            res.status(201).json({
                mensaje: 'Usuario registrado exitosamente',
                token: token,
                userId: this.lastID,
                username: username
            });
        }
    );
};

// Función para LOGIN (iniciar sesión)
const login = (req, res) => {
    const { email, password } = req.body;

    // Validar que email y password estén presentes
    if (!email || !password) {
        return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    // Buscar usuario por email
    db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Error en la base de datos' });
        }

        // Verificar que el usuario existe
        if (!user) {
            return res.status(401).json({ error: 'Usuario no encontrado' });
        }

        // Verificar que la contraseña es correcta (compararla con la encriptada)
        const passwordValida = bcrypt.compareSync(password, user.password);
        if (!passwordValida) {
            return res.status(401).json({ error: 'Contraseña incorrecta' });
        }

        // Crear un token JWT
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log(`✅ Usuario logueado: ${user.username}`);
        res.json({
            mensaje: 'Login exitoso',
            token: token,
            userId: user.id,
            username: user.username
        });
    });
};

module.exports = { register, login };