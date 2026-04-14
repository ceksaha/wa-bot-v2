const { DataTypes } = require('sequelize');
const { sequelize } = require('../db');

const Admin = sequelize.define('Admin', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    username: { type: DataTypes.STRING, unique: true, allowNull: false },
    password: { type: DataTypes.STRING, allowNull: false },
    role: { type: DataTypes.STRING, defaultValue: 'tenant' }, // can be superadmin or tenant
});

module.exports = Admin;
