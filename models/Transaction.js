// models/Transaction.js
const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const User = require('./User');

const Transaction = sequelize.define('Transaction', {
  transaction_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      isDecimal: true,
      min: 0.01,
    },
  },
  transaction_type: {
    type: DataTypes.ENUM('DEPOSIT', 'WITHDRAWAL'),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED'),
    allowNull: false,
    defaultValue: 'PENDING',
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
}, {
  timestamps: false,
});

// Define associations
User.hasMany(Transaction, { foreignKey: 'user_id' });
Transaction.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Transaction;
