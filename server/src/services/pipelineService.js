const db = require('../db/pool');

const submitApplication = async (jobId, applicantId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Lock the job row
    const jobRes = await client.query(
      'SELECT * FROM jobs WHERE id = $1 FOR UPDATE',
      [jobId]
    );
    if (jobRes.rows.length === 0) {
      throw new Error('Job not found');
    }
    const job = jobRes.rows[0];
    if (job.status !== 'open') {
      throw new Error('Job is not open for applications');
    }

    // Duplicate check
    const dupRes = await client.query(
      'SELECT id FROM applications WHERE job_id = $1 AND applicant_id = $2',
      [jobId, applicantId]
    );
    if (dupRes.rows.length > 0) {
      throw new Error('Already applied for this job');
    }

    // Count current active applications
    const activeRes = await client.query(
      "SELECT COUNT(*) FROM applications WHERE job_id = $1 AND status = 'active'",
      [jobId]
    );
    const activeCount = parseInt(activeRes.rows[0].count, 10);

    let status = 'waitlisted';
    let reason = 'capacity_full';

    if (activeCount < job.active_capacity) {
      status = 'active';
      reason = 'applied_within_capacity';
    }

    // Insert application
    const insertRes = await client.query(
      `INSERT INTO applications (job_id, applicant_id, status, decay_level)
       VALUES ($1, $2, $3, 0)
       RETURNING *`,
      [jobId, applicantId, status]
    );
    const application = insertRes.rows[0];

    // Log state transition
    await client.query(
      `INSERT INTO state_transition_logs (application_id, from_status, to_status, reason)
       VALUES ($1, NULL, $2, $3)`,
      [application.id, status, reason]
    );

    await client.query('COMMIT');

    // Calculate queue position AFTER commit using pool (not client)
    if (status === 'waitlisted') {
      application.queue_position = await getQueuePosition(
        db, jobId, application.decay_level, application.created_at
      );
    }

    return application;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const promoteNextApplicant = async (jobId, client) => {
  const nextRes = await client.query(
    `SELECT * FROM applications
     WHERE job_id = $1 AND status = 'waitlisted'
     ORDER BY decay_level ASC, created_at ASC
     LIMIT 1
     FOR UPDATE SKIP LOCKED`,
    [jobId]
  );

  if (nextRes.rows.length === 0) {
    return null;
  }

  const applicant = nextRes.rows[0];

  const updatedRes = await client.query(
    `UPDATE applications
     SET status = 'active', promoted_at = NOW(), acknowledged_at = NULL, status_updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [applicant.id]
  );

  await client.query(
    `INSERT INTO state_transition_logs (application_id, from_status, to_status, reason)
     VALUES ($1, 'waitlisted', 'active', 'auto_promoted')`,
    [applicant.id]
  );

  return updatedRes.rows[0];
};

const exitPipeline = async (applicationId, reason) => {
  // Validate reason
  const validReasons = ['rejected', 'withdrawn', 'hired'];
  if (!validReasons.includes(reason)) {
    throw new Error('Invalid exit reason');
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Lock the application row
    const appRes = await client.query(
      'SELECT * FROM applications WHERE id = $1 FOR UPDATE',
      [applicationId]
    );
    if (appRes.rows.length === 0) {
      throw new Error('Application not found');
    }
    const application = appRes.rows[0];
    const oldStatus = application.status;

    // Cannot exit if already exited
    if (['rejected', 'withdrawn', 'hired'].includes(oldStatus)) {
      throw new Error('Application has already exited the pipeline');
    }

    // Update status
    await client.query(
      'UPDATE applications SET status = $1, status_updated_at = NOW() WHERE id = $2',
      [reason, applicationId]
    );

    // Log transition
    await client.query(
      `INSERT INTO state_transition_logs (application_id, from_status, to_status, reason)
       VALUES ($1, $2, $3, $4)`,
      [applicationId, oldStatus, reason, `exit_${reason}`]
    );

    // If was active, promote next person
    if (oldStatus === 'active') {
      await promoteNextApplicant(application.job_id, client);
    }

    await client.query('COMMIT');
    return { id: applicationId, previousStatus: oldStatus, status: reason };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

const getQueuePosition = async (clientOrPool, jobId, decayLevel, createdAt) => {
  const posRes = await clientOrPool.query(
    `SELECT COUNT(*) FROM applications
     WHERE job_id = $1 AND status = 'waitlisted'
     AND (decay_level < $2 OR (decay_level = $2 AND created_at < $3))`,
    [jobId, decayLevel, createdAt]
  );
  return parseInt(posRes.rows[0].count, 10) + 1;
};

const getApplicationStatus = async (applicantId, jobId) => {
  const appRes = await db.query(
    'SELECT * FROM applications WHERE applicant_id = $1 AND job_id = $2',
    [applicantId, jobId]
  );

  if (appRes.rows.length === 0) {
    return null;
  }

  const application = appRes.rows[0];
  if (application.status === 'waitlisted') {
    application.queue_position = await getQueuePosition(
      db, jobId, application.decay_level, application.created_at
    );
  }

  return application;
};

module.exports = {
  submitApplication,
  promoteNextApplicant,
  exitPipeline,
  getApplicationStatus,
  getQueuePosition,
};