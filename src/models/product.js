const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Tenant = require('./tenant');

const Product = sequelize.define('Product', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: Tenant, key: 'id' } },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT },
    price: { type: DataTypes.FLOAT, allowNull: false },
    is_available: { type: DataTypes.BOOLEAN, defaultValue: true }
});

module.exports = Product;
