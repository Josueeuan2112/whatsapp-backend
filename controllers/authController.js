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

const updateUser = (req, res) => {
    const { id } = req.params;
    const { username, email } = req.body;

    // Validación: el usuario solo puede actualizar su propio perfil
    if (req.user.id !== parseInt(id)) {
        return res.status(403).json({ error: 'No tienes permiso para actualizar este perfil' });
    }

    // Validar que no estén vacíos
    if (!username || !email) {
        return res.status(400).json({ error: 'Username y email son obligatorios' });
    }

    // Validar que el email tenga formato correcto (simple)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email no válido' });
    }

    console.log(`📝 Intentando actualizar usuario ID: ${id}`);

    // Primero verificar si el email ya existe en otro usuario
    db.get(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [email, id],
        (err, existingUser) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }

            if (existingUser) {
                return res.status(400).json({ error: 'Este email ya está en uso' });
            }

            // También verificar username
            db.get(
                'SELECT id FROM users WHERE username = ? AND id != ?',
                [username, id],
                (err, existingUsername) => {
                    if (err) {
                        return res.status(500).json({ error: 'Error en la base de datos' });
                    }

                    if (existingUsername) {
                        return res.status(400).json({ error: 'Este username ya está en uso' });
                    }

                    // Actualizar el usuario
                    db.run(
                        'UPDATE users SET username = ?, email = ? WHERE id = ?',
                        [username, email, id],
                        function (err) {
                            if (err) {
                                console.error('❌ Error al actualizar usuario:', err.message);
                                return res.status(500).json({ error: 'Error al actualizar perfil' });
                            }

                            console.log(`✅ Usuario ${id} actualizado - Nuevo username: ${username}`);
                            res.json({
                                mensaje: 'Perfil actualizado exitosamente',
                                userId: id,
                                username: username,
                                email: email,
                            });
                        }
                    );
                }
            );
        }
    );
};

const getUserProfile = (req, res) => {
    const { id } = req.params;

    console.log(`📖 Obteniendo perfil del usuario ID: ${id}`);

    db.get(
        'SELECT id, username, email, status, created_at FROM users WHERE id = ?',
        [id],
        (err, user) => {
            if (err) {
                return res.status(500).json({ error: 'Error en la base de datos' });
            }

            if (!user) {
                return res.status(404).json({ error: 'Usuario no encontrado' });
            }

            console.log(`✅ Perfil obtenido: ${user.username}`);
            res.json(user);
        }
    );
};

module.exports = { register, login, updateUser, getUserProfile };