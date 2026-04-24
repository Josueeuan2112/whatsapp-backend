const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth');
const {
    createGroup,
    getUserGroups,
    getGroupMembers,
    addGroupMember,
    removeGroupMember,
    getGroupMessages,
    deleteGroup,
} = require('../controllers/groupController');

// CREAR NUEVO GRUPO
// POST /api/groups/create (requiere token)
router.post('/create', verifyToken, createGroup);

// OBTENER GRUPOS DEL USUARIO
// GET /api/groups (requiere token)
router.get('/', verifyToken, getUserGroups);

// OBTENER MIEMBROS DE UN GRUPO
// GET /api/groups/:groupId/members (requiere token)
router.get('/:groupId/members', verifyToken, getGroupMembers);

// OBTENER MENSAJES DE UN GRUPO
// GET /api/groups/:groupId/messages (requiere token)
router.get('/:groupId/messages', verifyToken, getGroupMessages);

// AGREGAR MIEMBRO AL GRUPO
// POST /api/groups/add-member (requiere token, solo admin)
router.post('/add-member', verifyToken, addGroupMember);

// REMOVER MIEMBRO DEL GRUPO
// POST /api/groups/remove-member (requiere token, solo admin)
router.post('/remove-member', verifyToken, removeGroupMember);

// ELIMINAR GRUPO
// DELETE /api/groups/:groupId (requiere token, solo admin)
router.delete('/:groupId', verifyToken, deleteGroup);

module.exports = router;