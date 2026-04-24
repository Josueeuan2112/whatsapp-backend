const db = require('../db/init');

// CREAR UN NUEVO GRUPO
const createGroup = (req, res) => {
    const { name, description, memberIds } = req.body;
    const adminId = req.user.id;

    // Validaciones
    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'El nombre del grupo es requerido' });
    }

    if (!memberIds || memberIds.length === 0) {
        return res.status(400).json({ error: 'Debe haber al menos un miembro' });
    }

    console.log(`👥 Creando grupo "${name}" - Admin: ${adminId}`);

    // Insertar grupo
    db.run(
        'INSERT INTO groups (name, description, admin_id) VALUES (?, ?, ?)',
        [name, description || null, adminId],
        function (err) {
            if (err) {
                console.error('❌ Error creando grupo:', err.message);
                return res.status(500).json({ error: 'Error al crear grupo' });
            }

            const groupId = this.lastID;
            console.log(`✅ Grupo creado con ID: ${groupId}`);

            // Agregar admin como miembro
            const allMembers = [adminId, ...memberIds];
            let addedMembers = 0;

            allMembers.forEach((userId) => {
                db.run(
                    'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)',
                    [groupId, userId],
                    (err) => {
                        if (err) {
                            console.error('❌ Error agregando miembro:', err.message);
                        } else {
                            addedMembers++;
                            console.log(`✅ Miembro ${userId} agregado al grupo`);
                        }

                        // Cuando se agregan todos, retornar respuesta
                        if (addedMembers === allMembers.length) {
                            res.json({
                                mensaje: 'Grupo creado exitosamente',
                                groupId: groupId,
                                name: name,
                                admin_id: adminId,
                                memberCount: allMembers.length,
                            });
                        }
                    }
                );
            });
        }
    );
};

// OBTENER TODOS LOS GRUPOS DEL USUARIO
const getUserGroups = (req, res) => {
    const userId = req.user.id;

    console.log(`📋 Obteniendo grupos del usuario ${userId}`);

    db.all(
        `SELECT g.* FROM groups g
     INNER JOIN group_members gm ON g.id = gm.group_id
     WHERE gm.user_id = ?
     ORDER BY g.created_at DESC`,
        [userId],
        (err, groups) => {
            if (err) {
                console.error('❌ Error obteniendo grupos:', err.message);
                return res.status(500).json({ error: 'Error obteniendo grupos' });
            }

            console.log(`✅ ${groups.length} grupos encontrados`);
            res.json({
                grupos: groups || [],
            });
        }
    );
};

// OBTENER MIEMBROS DE UN GRUPO
const getGroupMembers = (req, res) => {
    const { groupId } = req.params;

    console.log(`👥 Obteniendo miembros del grupo ${groupId}`);

    db.all(
        `SELECT u.id, u.username, u.email, gm.joined_at FROM users u
     INNER JOIN group_members gm ON u.id = gm.user_id
     WHERE gm.group_id = ?
     ORDER BY gm.joined_at ASC`,
        [groupId],
        (err, members) => {
            if (err) {
                console.error('❌ Error obteniendo miembros:', err.message);
                return res.status(500).json({ error: 'Error obteniendo miembros' });
            }

            console.log(`✅ ${members.length} miembros encontrados`);
            res.json({
                members: members || [],
            });
        }
    );
};

// AGREGAR MIEMBRO A GRUPO
const addGroupMember = (req, res) => {
    const { groupId, userId } = req.body;
    const requesterId = req.user.id;

    console.log(`➕ Agregando usuario ${userId} al grupo ${groupId}`);

    // Verificar que quien hace la petición es el admin
    db.get(
        'SELECT admin_id FROM groups WHERE id = ?',
        [groupId],
        (err, group) => {
            if (err || !group) {
                return res.status(404).json({ error: 'Grupo no encontrado' });
            }

            if (group.admin_id !== requesterId) {
                console.log('❌ Solo el admin puede agregar miembros');
                return res.status(403).json({ error: 'Solo el admin puede agregar miembros' });
            }

            // Agregar miembro
            db.run(
                'INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)',
                [groupId, userId],
                function (err) {
                    if (err) {
                        console.error('❌ Error agregando miembro:', err.message);
                        return res.status(500).json({ error: 'Error agregando miembro' });
                    }

                    console.log(`✅ Miembro agregado exitosamente`);
                    res.json({
                        mensaje: 'Miembro agregado al grupo',
                        groupId: groupId,
                        userId: userId,
                    });
                }
            );
        }
    );
};

// REMOVER MIEMBRO DE GRUPO
const removeGroupMember = (req, res) => {
    const { groupId, userId } = req.body;
    const requesterId = req.user.id;

    console.log(`➖ Removiendo usuario ${userId} del grupo ${groupId}`);

    // Verificar que quien hace la petición es el admin
    db.get(
        'SELECT admin_id FROM groups WHERE id = ?',
        [groupId],
        (err, group) => {
            if (err || !group) {
                return res.status(404).json({ error: 'Grupo no encontrado' });
            }

            if (group.admin_id !== requesterId) {
                return res.status(403).json({ error: 'Solo el admin puede remover miembros' });
            }

            // No permitir que el admin se remueva a sí mismo
            if (userId === group.admin_id) {
                return res.status(400).json({ error: 'El admin no puede removerse a sí mismo' });
            }

            // Remover miembro
            db.run(
                'DELETE FROM group_members WHERE group_id = ? AND user_id = ?',
                [groupId, userId],
                function (err) {
                    if (err) {
                        console.error('❌ Error removiendo miembro:', err.message);
                        return res.status(500).json({ error: 'Error removiendo miembro' });
                    }

                    console.log(`✅ Miembro removido exitosamente`);
                    res.json({
                        mensaje: 'Miembro removido del grupo',
                        groupId: groupId,
                        userId: userId,
                    });
                }
            );
        }
    );
};

// OBTENER MENSAJES DE UN GRUPO
const getGroupMessages = (req, res) => {
    const { groupId } = req.params;

    console.log(`💬 Obteniendo mensajes del grupo ${groupId}`);

    db.all(
        `SELECT m.*, u.username FROM messages m
     INNER JOIN users u ON m.sender_id = u.id
     WHERE m.group_id = ?
     ORDER BY m.timestamp ASC`,
        [groupId],
        (err, messages) => {
            if (err) {
                console.error('❌ Error obteniendo mensajes:', err.message);
                return res.status(500).json({ error: 'Error obteniendo mensajes' });
            }

            console.log(`✅ ${messages.length} mensajes encontrados`);
            res.json({
                messages: messages || [],
            });
        }
    );
};

// ELIMINAR GRUPO (solo admin)
const deleteGroup = (req, res) => {
    const { groupId } = req.params;
    const requesterId = req.user.id;

    console.log(`🗑️ Eliminando grupo ${groupId}`);

    // Verificar que es el admin
    db.get(
        'SELECT admin_id FROM groups WHERE id = ?',
        [groupId],
        (err, group) => {
            if (err || !group) {
                return res.status(404).json({ error: 'Grupo no encontrado' });
            }

            if (group.admin_id !== requesterId) {
                return res.status(403).json({ error: 'Solo el admin puede eliminar el grupo' });
            }

            // Eliminar miembros del grupo
            db.run(
                'DELETE FROM group_members WHERE group_id = ?',
                [groupId],
                (err) => {
                    if (err) {
                        console.error('❌ Error eliminando miembros:', err.message);
                        return res.status(500).json({ error: 'Error eliminando grupo' });
                    }

                    // Eliminar mensajes del grupo
                    db.run(
                        'DELETE FROM messages WHERE group_id = ?',
                        [groupId],
                        (err) => {
                            if (err) {
                                console.error('❌ Error eliminando mensajes:', err.message);
                                return res.status(500).json({ error: 'Error eliminando grupo' });
                            }

                            // Eliminar el grupo
                            db.run(
                                'DELETE FROM groups WHERE id = ?',
                                [groupId],
                                function (err) {
                                    if (err) {
                                        console.error('❌ Error eliminando grupo:', err.message);
                                        return res.status(500).json({ error: 'Error eliminando grupo' });
                                    }

                                    console.log(`✅ Grupo eliminado exitosamente`);
                                    res.json({
                                        mensaje: 'Grupo eliminado exitosamente',
                                    });
                                }
                            );
                        }
                    );
                }
            );
        }
    );
};

module.exports = {
    createGroup,
    getUserGroups,
    getGroupMembers,
    addGroupMember,
    removeGroupMember,
    getGroupMessages,
    deleteGroup,
};