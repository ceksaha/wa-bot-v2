const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');
const Tenant = require('./tenant');

const UserSession = sequelize.define('UserSession', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    tenant_id: { type: DataTypes.INTEGER, allowNull: false, references: { model: Tenant, key: 'id' } },
    phone: { type: DataTypes.STRING, allowNull: false },
    stage: { type: DataTypes.STRING, defaultValue: 'START' },
    cart: { type: DataTypes.JSON, defaultValue: [] },
    tempMenuMap: { type: DataTypes.JSON, defaultValue: [] }
}, {
    indexes: [
        {
            unique: true,
            fields: ['tenant_id', 'phone']
        }
    ]
});

module.exports = UserSession;
