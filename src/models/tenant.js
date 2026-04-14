const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const Admin = require('./admin');

const Tenant = sequelize.define('Tenant', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    admin_id: { type: DataTypes.INTEGER, references: { model: Admin, key: 'id' } },
    shop_name: { type: DataTypes.STRING, allowNull: false, defaultValue: 'Toko Baru' },
    shop_slogan: { type: DataTypes.STRING },
    bot_number: { type: DataTypes.STRING }, // specifically for the WA bot assigned
    tunnel_url: { type: DataTypes.STRING },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
    expired_at: { type: DataTypes.DATE, defaultValue: () => {
        let d = new Date();
        d.setDate(d.getDate() + 30); // Default 30 days for new user
        return d;
    }}
});

Tenant.belongsTo(Admin, { foreignKey: 'admin_id' });
Admin.hasOne(Tenant, { foreignKey: 'admin_id' });

module.exports = Tenant;
