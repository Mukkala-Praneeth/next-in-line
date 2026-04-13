const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db/pool');
require('dotenv').config();

const saltRounds = 10;
const jwtExpiry = '7d';

const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Name, email, and password are required.',
      data: {}
    });
  }

  try {
    // Check if company already exists
    const existingCompany = await db.query('SELECT * FROM companies WHERE email = $1', [email]);
    if (existingCompany.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Company with this email already exists.',
        data: {}
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert company
    const newCompanyResult = await db.query(
      'INSERT INTO companies (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );

    const company = newCompanyResult.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { id: company.id, email: company.email, role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: jwtExpiry }
    );

    res.status(201).json({
      success: true,
      message: 'Company registered successfully.',
      data: {
        token,
        company: {
          id: company.id,
          name: company.name,
          email: company.email
        }
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration.',
      data: {}
    });
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: 'Email and password are required.',
      data: {}
    });
  }

  try {
    // Find company
    const result = await db.query('SELECT * FROM companies WHERE email = $1', [email]);
    const company = result.rows[0];

    if (!company) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
        data: {}
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, company.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
        data: {}
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: company.id, email: company.email, role: 'company' },
      process.env.JWT_SECRET,
      { expiresIn: jwtExpiry }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        company: {
          id: company.id,
          name: company.name,
          email: company.email
        }
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login.',
      data: {}
    });
  }
};

module.exports = {
  register,
  login
};
