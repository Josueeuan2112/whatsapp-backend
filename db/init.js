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

// Exportar la conexión para usarla en otros archivos
module.exports = db;