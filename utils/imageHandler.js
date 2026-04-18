const fs = require('fs');
const path = require('path');

class ImageHandler {
    constructor() {
        this.uploadsDir = path.join(__dirname, '../uploads/images');

        // Crear carpeta si no existe
        if (!fs.existsSync(this.uploadsDir)) {
            fs.mkdirSync(this.uploadsDir, { recursive: true });
            console.log('✅ Carpeta de imágenes creada');
        }
    }

    // GUARDAR IMAGEN BASE64 EN DISCO
    saveBase64Image(base64String, filename) {
        try {
            console.log(`💾 Guardando imagen: ${filename}`);

            // Decodificar Base64
            const buffer = Buffer.from(base64String, 'base64');

            // Crear ruta completa
            const filepath = path.join(this.uploadsDir, filename);

            // Guardar archivo
            fs.writeFileSync(filepath, buffer);

            console.log(`✅ Imagen guardada: ${filename}`);

            // Retornar URL relativa para usar en la app
            return `/uploads/images/${filename}`;
        } catch (error) {
            console.error('❌ Error guardando imagen:', error.message);
            throw error;
        }
    }

    // GENERAR NOMBRE ÚNICO PARA IMAGEN
    generateImageFilename(userId, timestamp = Date.now()) {
        // Formato: user_123_1703245890123.jpg
        return `user_${userId}_${timestamp}.jpg`;
    }

    // ELIMINAR IMAGEN
    deleteImage(filename) {
        try {
            const filepath = path.join(this.uploadsDir, filename);

            if (fs.existsSync(filepath)) {
                fs.unlinkSync(filepath);
                console.log(`✅ Imagen eliminada: ${filename}`);
                return true;
            }
            return false;
        } catch (error) {
            console.error('❌ Error eliminando imagen:', error.message);
            return false;
        }
    }

    // VALIDAR IMAGEN BASE64
    validateBase64Image(base64String) {
        try {
            // Verificar que es un string válido
            if (!base64String || typeof base64String !== 'string') {
                return false;
            }

            // Decodificar para validar
            Buffer.from(base64String, 'base64');
            return true;
        } catch (error) {
            return false;
        }
    }
}

module.exports = new ImageHandler();