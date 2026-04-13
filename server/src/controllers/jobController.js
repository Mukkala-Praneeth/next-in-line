const db = require('../db/pool');

const createJob = async (req, res) => {
  const { title, description, active_capacity, decay_window_hours = 48 } = req.body;
  const company_id = req.user.id;

  if (req.user.role !== 'company') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Only companies can create job postings.',
      data: {}
    });
  }

  if (!title || !description || !active_capacity) {
    return res.status(400).json({
      success: false,
      message: 'Title, description, and active_capacity are required.',
      data: {}
    });
  }

  if (active_capacity <= 0 || !Number.isInteger(Number(active_capacity))) {
    return res.status(400).json({
      success: false,
      message: 'active_capacity must be a positive integer.',
      data: {}
    });
  }

  try {
    const result = await db.query(
      'INSERT INTO jobs (company_id, title, description, active_capacity, decay_window_hours) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [company_id, title, description, active_capacity, decay_window_hours]
    );

    res.status(201).json({
      success: true,
      message: 'Job created successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Create job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during job creation.',
      data: {}
    });
  }
};

const getJob = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query(
      `SELECT j.*, c.name as company_name 
       FROM jobs j 
       JOIN companies c ON j.company_id = c.id 
       WHERE j.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Job not found.',
        data: {}
      });
    }

    res.status(200).json({
      success: true,
      message: 'Job retrieved successfully.',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Get job error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving job.',
      data: {}
    });
  }
};

const getCompanyJobs = async (req, res) => {
  const company_id = req.user.id;

  if (req.user.role !== 'company') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Access restricted to companies.',
      data: {}
    });
  }

  try {
    const result = await db.query(
      `SELECT 
        j.*,
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id AND status = 'active') as active_count,
        (SELECT COUNT(*) FROM applications WHERE job_id = j.id AND status = 'waitlisted') as waitlist_count
      FROM jobs j
      WHERE j.company_id = $1
      ORDER BY j.created_at DESC`,
      [company_id]
    );

    res.status(200).json({
      success: true,
      message: 'Company jobs retrieved successfully.',
      data: result.rows
    });
  } catch (error) {
    console.error('Get company jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving company jobs.',
      data: {}
    });
  }
};

module.exports = {
  createJob,
  getJob,
  getCompanyJobs
};
