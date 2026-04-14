let io;

const initSocket = (server) => {
    const { Server } = require('socket.io');
    io = new Server(server, {
        cors: { origin: '*' }
    });

    io.on('connection', (socket) => {
        socket.on('join_tenant', (tenantId) => {
            console.log(`Admin joined tenant room: tenant_${tenantId}`);
            socket.join(`tenant_${tenantId}`);
        });
    });

    return io;
};

const notifyNewOrder = (tenantId, order) => {
    if (io) {
        console.log(`[SOCKET] Emitting new_order to room: tenant_${tenantId}`);
        io.to(`tenant_${tenantId}`).emit('new_order', order);
    } else {
        console.warn('[SOCKET] IO not initialized, cannot emit order notification.');
    }
};

const notifyPairingCode = (tenantId, code) => {
    if (io) {
        io.to(`tenant_${tenantId}`).emit('pairing_code', { code });
    }
};

module.exports = { initSocket, notifyNewOrder, notifyPairingCode };
