const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Ruta donde vivirá la base de datos
const dbPath = path.join(__dirname, 'database.sqlite');

// Crear o conectar a la base de datos
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error al conectar a la BD:', err.message);
    } else {
        console.log('✅ Conectado a SQLite en:', dbPath);
    }
});

// Crear tabla de usuarios
db.run(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    phone TEXT,
    avatar_url TEXT,
    status TEXT DEFAULT 'offline',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
    if (err) {
        console.error('❌ Error creando tabla users:', err.message);
    } else {
        console.log('✅ Tabla users lista');
    }
});

// Crear tabla de mensajes
db.run(`
  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sender_id INTEGER NOT NULL,
    receiver_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    message_type TEXT DEFAULT 'text',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_read BOOLEAN DEFAULT 0,
    FOREIGN KEY(sender_id) REFERENCES users(id),
    FOREIGN KEY(receiver_id) REFERENCES users(id)
  )
`, (err) => {
    if (err) {
        console.error('❌ Error creando tabla messages:', err.message);
    } else {
        console.log('✅ Tabla messages lista');
    }
});

// Crear tabla de conversaciones
db.run(`
  CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    type TEXT DEFAULT 'direct',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`, (err) => {
    if (err) {
        console.error('❌ Error creando tabla conversations:', err.message);
    } else {
        console.log('✅ Tabla conversations lista');
    }
});

// Crear tabla de grupos
db.run(`
  CREATE TABLE IF NOT EXISTS groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    admin_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(admin_id) REFERENCES users(id)
  )
`, (err) => {
    if (err) {
        console.error('❌ Error creando tabla groups:', err.message);
    } else {
        console.log('✅ Tabla groups lista');
    }
});

// Crear tabla de miembros del grupo
db.run(`
  CREATE TABLE IF NOT EXISTS group_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    group_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(group_id, user_id),
    FOREIGN KEY(group_id) REFERENCES groups(id),
    FOREIGN KEY(user_id) REFERENCES users(id)
  )
`, (err) => {
    if (err) {
        console.error('❌ Error creando tabla group_members:', err.message);
    } else {
        console.log('✅ Tabla group_members lista');
    }
});

// Actualizar tabla de mensajes para soportar grupos
db.run(`
  ALTER TABLE messages ADD COLUMN group_id INTEGER
`, (err) => {
    if (err && !err.message.includes('duplicate column')) {
        console.error('⚠️ Nota sobre ALTER TABLE:', err.message);
    } else if (!err || err.message.includes('duplicate column')) {
        console.log('✅ Tabla messages actualizada (group_id agregado)');
    }
});


// Exportar la conexión para usarla en otros archivos
module.exports = db;