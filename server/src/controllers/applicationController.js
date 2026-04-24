const pipelineService = require('../services/pipelineService');
const db = require('../db/pool');

const apply = async (req, res) => {
  const { jobId } = req.params;
  const applicantId = req.user.id;

  if (req.user.role !== 'applicant') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Only applicants can apply for jobs.',
      data: {}
    });
  }

  try {
    const application = await pipelineService.submitApplication(jobId, applicantId);
    res.status(201).json({
      success: true,
      message: `Applied successfully. Status: ${application.status}`,
      data: application
    });
  } catch (error) {
    const statusCode = error.message === 'Job not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};

const withdraw = async (req, res) => {
  const { id } = req.params;
  const applicantId = req.user.id;

  if (req.user.role !== 'applicant') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Only applicants can withdraw.',
      data: {}
    });
  }

  try {
    const appRes = await db.query(
      'SELECT applicant_id FROM applications WHERE id = $1',
      [id]
    );
    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.', data: {} });
    }
    if (appRes.rows[0].applicant_id !== applicantId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.', data: {} });
    }

    const result = await pipelineService.exitPipeline(id, 'withdrawn');
    res.status(200).json({
      success: true,
      message: 'Withdrawn successfully.',
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message, data: {} });
  }
};

const reject = async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.id;

  if (req.user.role !== 'company') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Only companies can reject.',
      data: {}
    });
  }

  try {
    const appRes = await db.query(
      `SELECT a.id, j.company_id FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [id]
    );
    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.', data: {} });
    }
    if (appRes.rows[0].company_id !== companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.', data: {} });
    }

    const result = await pipelineService.exitPipeline(id, 'rejected');
    res.status(200).json({
      success: true,
      message: 'Application rejected.',
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message, data: {} });
  }
};

const hire = async (req, res) => {
  const { id } = req.params;
  const companyId = req.user.id;

  if (req.user.role !== 'company') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Only companies can hire.',
      data: {}
    });
  }

  try {
    const appRes = await db.query(
      `SELECT a.id, j.company_id FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [id]
    );
    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.', data: {} });
    }
    if (appRes.rows[0].company_id !== companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.', data: {} });
    }

    const result = await pipelineService.exitPipeline(id, 'hired');
    res.status(200).json({
      success: true,
      message: 'Applicant hired.',
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message, data: {} });
  }
};

const getStatus = async (req, res) => {
  const { jobId } = req.params;
  const applicantId = req.user.id;

  if (req.user.role !== 'applicant') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Only applicants can check status.',
      data: {}
    });
  }

  try {
    const status = await pipelineService.getApplicationStatus(applicantId, jobId);
    if (!status) {
      return res.status(404).json({ success: false, message: 'Application not found.', data: {} });
    }

    res.status(200).json({
      success: true,
      message: 'Status retrieved.',
      data: status
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message, data: {} });
  }
};

const getJobApplications = async (req, res) => {
  const { jobId } = req.params;
  const companyId = req.user.id;

  if (req.user.role !== 'company') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Only companies can view applications.',
      data: {}
    });
  }

  try {
    const jobRes = await db.query('SELECT company_id FROM jobs WHERE id = $1', [jobId]);
    if (jobRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Job not found.', data: {} });
    }
    if (jobRes.rows[0].company_id !== companyId) {
      return res.status(403).json({ success: false, message: 'Unauthorized.', data: {} });
    }

    const applications = await db.query(
      `SELECT a.*, ap.name as applicant_name, ap.email as applicant_email
       FROM applications a
       JOIN applicants ap ON a.applicant_id = ap.id
       WHERE a.job_id = $1
       ORDER BY
         CASE WHEN a.status = 'active' THEN 0
              WHEN a.status = 'waitlisted' THEN 1
              ELSE 2 END,
         a.decay_level ASC,
         a.created_at ASC`,
      [jobId]
    );

    res.status(200).json({
      success: true,
      message: 'Applications retrieved.',
      data: applications.rows
    });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error.', data: {} });
  }
};

const getApplicationHistory = async (req, res) => {
  const { id } = req.params;

  try {
    const appRes = await db.query(
      `SELECT a.*, j.company_id
       FROM applications a
       JOIN jobs j ON a.job_id = j.id
       WHERE a.id = $1`,
      [id]
    );

    if (appRes.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found.', data: {} });
    }

    const application = appRes.rows[0];

    if (req.user.role === 'company' && application.company_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.', data: {} });
    }

    if (req.user.role === 'applicant' && application.applicant_id !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Unauthorized.', data: {} });
    }

    const historyRes = await db.query(
      `SELECT
        stl.*,
        to_char(stl.created_at, 'YYYY-MM-DD HH24:MI:SS') as formatted_time
       FROM state_transition_logs stl
       WHERE stl.application_id = $1
       ORDER BY stl.created_at ASC`,
      [id]
    );

    res.status(200).json({
      success: true,
      message: 'Application history retrieved.',
      data: {
        application_id: id,
        history: historyRes.rows
      }
    });
  } catch (error) {
    console.error('Get history error:', error);
    res.status(500).json({ success: false, message: 'Server error.', data: {} });
  }
};

module.exports = {
  apply,
  withdraw,
  reject,
  hire,
  getStatus,
  getJobApplications,
  getApplicationHistory
};