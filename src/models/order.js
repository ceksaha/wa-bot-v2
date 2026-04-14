const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Tenant = require('./tenant');

const Order = sequelize.define('Order', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: Tenant, key: 'id' } },
    customer_phone: { type: DataTypes.STRING, allowNull: false },
    customer_name: { type: DataTypes.STRING },
    address: { type: DataTypes.TEXT },
    items: { type: DataTypes.JSON, allowNull: false }, // Store JSON directly
    total_price: { type: DataTypes.FLOAT, allowNull: false },
    status: { type: DataTypes.ENUM('pending', 'proses', 'selesai', 'dibatalkan'), defaultValue: 'pending' },
    payment_status: { type: DataTypes.ENUM('unpaid', 'paid'), defaultValue: 'unpaid' },
    notes: { type: DataTypes.TEXT }
});

module.exports = Order;
