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
    // Check if applicant already exists
    const existingApplicant = await db.query('SELECT * FROM applicants WHERE email = $1', [email]);
    if (existingApplicant.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Applicant with this email already exists.',
        data: {}
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert applicant
    const newApplicantResult = await db.query(
      'INSERT INTO applicants (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );

    const applicant = newApplicantResult.rows[0];

    // Generate JWT
    const token = jwt.sign(
      { id: applicant.id, email: applicant.email, role: 'applicant' },
      process.env.JWT_SECRET,
      { expiresIn: jwtExpiry }
    );

    res.status(201).json({
      success: true,
      message: 'Applicant registered successfully.',
      data: {
        token,
        applicant: {
          id: applicant.id,
          name: applicant.name,
          email: applicant.email
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
    // Find applicant
    const result = await db.query('SELECT * FROM applicants WHERE email = $1', [email]);
    const applicant = result.rows[0];

    if (!applicant) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
        data: {}
      });
    }

    // Compare password
    const isPasswordValid = await bcrypt.compare(password, applicant.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials.',
        data: {}
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { id: applicant.id, email: applicant.email, role: 'applicant' },
      process.env.JWT_SECRET,
      { expiresIn: jwtExpiry }
    );

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        token,
        applicant: {
          id: applicant.id,
          name: applicant.name,
          email: applicant.email
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
