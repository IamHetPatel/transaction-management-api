// index.js
const express = require('express');
const bodyParser = require('body-parser');
const { body, query, param, validationResult } = require('express-validator');

const sequelize = require('./database');
const User = require('./models/User');
const Transaction = require('./models/Transaction');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

// Sync Database
sequelize
  .sync({ force: false })
  .then(async () => {
    console.log('Database synced');
    // Optionally, create a sample user
    const [user, created] = await User.findOrCreate({
      where: { username: 'john_doe' },
      defaults: {
        email: 'john@example.com',
        password: 'password123',
      },
    });
    if (created) {
      console.log('Sample user created:', user.username);
    }
  })
  .catch((err) => {
    console.error('Error syncing database:', err);
  });

/**
 * Helper Middleware for Handling Validation Results
 */
const validate = (validations) => {
  return async (req, res, next) => {
    await Promise.all(validations.map((validation) => validation.run(req)));

    const errors = validationResult(req);
    if (errors.isEmpty()) {
      return next();
    }

    res.status(400).json({ errors: errors.array() });
  };
};

/**
 * POST /api/transactions/
 * Create a new transaction
 */
app.post(
  '/api/transactions',
  validate([
    body('amount')
      .exists()
      .withMessage('Amount is required')
      .isDecimal({ decimal_digits: '0,2' })
      .withMessage('Amount must be a decimal with up to 2 decimal places')
      .custom((value) => parseFloat(value) > 0)
      .withMessage('Amount must be greater than zero'),
    body('transaction_type')
      .exists()
      .withMessage('Transaction type is required')
      .isIn(['DEPOSIT', 'WITHDRAWAL'])
      .withMessage('Transaction type must be DEPOSIT or WITHDRAWAL'),
    body('user')
      .exists()
      .withMessage('User ID is required')
      .isInt({ gt: 0 })
      .withMessage('User ID must be a positive integer'),
  ]),
  async (req, res) => {
    const { amount, transaction_type, user } = req.body;

    try {
      // Check if user exists
      const userInstance = await User.findByPk(user);
      if (!userInstance) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Create Transaction
      const transaction = await Transaction.create({
        amount,
        transaction_type,
        user_id: user,
      });

      res.status(201).json({
        transaction_id: transaction.transaction_id,
        amount: transaction.amount,
        transaction_type: transaction.transaction_type,
        status: transaction.status,
        user: transaction.user_id,
        timestamp: transaction.timestamp,
      });
    } catch (error) {
      console.error('Error creating transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/transactions/
 * Retrieve all transactions for a specific user
 */
app.get(
  '/api/transactions',
  validate([
    query('user_id')
      .exists()
      .withMessage('user_id query parameter is required')
      .isInt({ gt: 0 })
      .withMessage('user_id must be a positive integer'),
  ]),
  async (req, res) => {
    const { user_id } = req.query;

    try {
      // Check if user exists
      const userInstance = await User.findByPk(user_id);
      if (!userInstance) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Fetch Transactions
      const transactions = await Transaction.findAll({
        where: { user_id },
        attributes: [
          'transaction_id',
          'amount',
          'transaction_type',
          'status',
          'timestamp',
        ],
        order: [['timestamp', 'DESC']],
      });

      res.json({ transactions });
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * PUT /api/transactions/:transaction_id/
 * Update the status of an existing transaction
 */
app.put(
  '/api/transactions/:transaction_id',
  validate([
    param('transaction_id')
      .exists()
      .withMessage('transaction_id parameter is required')
      .isInt({ gt: 0 })
      .withMessage('transaction_id must be a positive integer'),
    body('status')
      .exists()
      .withMessage('Status is required')
      .isIn(['COMPLETED', 'FAILED'])
      .withMessage('Status must be either COMPLETED or FAILED'),
  ]),
  async (req, res) => {
    const { transaction_id } = req.params;
    const { status } = req.body;

    try {
      // Find Transaction
      const transaction = await Transaction.findByPk(transaction_id);
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      // Update Status
      transaction.status = status;
      await transaction.save();

      res.json({
        transaction_id: transaction.transaction_id,
        amount: transaction.amount,
        transaction_type: transaction.transaction_type,
        status: transaction.status,
        timestamp: transaction.timestamp,
      });
    } catch (error) {
      console.error('Error updating transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

/**
 * GET /api/transactions/:transaction_id/
 * Retrieve the details of a specific transaction
 */
app.get(
  '/api/transactions/:transaction_id',
  validate([
    param('transaction_id')
      .exists()
      .withMessage('transaction_id parameter is required')
      .isInt({ gt: 0 })
      .withMessage('transaction_id must be a positive integer'),
  ]),
  async (req, res) => {
    const { transaction_id } = req.params;

    try {
      // Find Transaction
      const transaction = await Transaction.findByPk(transaction_id, {
        attributes: [
          'transaction_id',
          'amount',
          'transaction_type',
          'status',
          'timestamp',
        ],
      });
      if (!transaction) {
        return res.status(404).json({ error: 'Transaction not found' });
      }

      res.json(transaction);
    } catch (error) {
      console.error('Error fetching transaction:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Start Server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
