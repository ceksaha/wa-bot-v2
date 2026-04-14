const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Admin = require('./admin');

const Tenant = sequelize.define('Tenant', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    admin_id: { type: DataTypes.INTEGER, references: { model: Admin, key: 'id' } },
    shop_name: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Toko Baru' },
    shop_slogan: { type: DataTypes.STRING },
    bot_number: { type: DataTypes.STRING }, // specifically for the WA bot assigned
    tunnel_url: { type: DataTypes.STRING }
});

module.exports = Tenant;
