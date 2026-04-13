const db = require('../db/pool');
const { promoteNextApplicant } = require('./pipelineService');

/**
 * Periodically checks for applications that have been promoted but not acknowledged
 * within the specified decay window.
 */
const checkAndDecay = async () => {
  const client = await db.getClient();
  let decayedCount = 0;

  try {
    // Find all applications that should be decayed
    const appsToDecay = await client.query(`
      SELECT a.*, j.decay_window_hours
      FROM applications a
      JOIN jobs j ON a.job_id = j.id
      WHERE a.status = 'active'
        AND a.promoted_at IS NOT NULL
        AND a.acknowledged_at IS NULL
        AND NOW() - a.promoted_at > (j.decay_window_hours * INTERVAL '1 hour')
    `);

    for (const app of appsToDecay.rows) {
      try {
        await client.query('BEGIN');

        // Lock the row and re-verify condition
        const verifyRes = await client.query(`
          SELECT a.*, j.decay_window_hours
          FROM applications a
          JOIN jobs j ON a.job_id = j.id
          WHERE a.id = $1
          FOR UPDATE
        `, [app.id]);

        if (verifyRes.rows.length === 0) {
          await client.query('ROLLBACK');
          continue;
        }

        const currentApp = verifyRes.rows[0];
        const isStillValidForDecay = 
          currentApp.status === 'active' &&
          currentApp.promoted_at !== null &&
          currentApp.acknowledged_at === null &&
          (new Date() - new Date(currentApp.promoted_at)) > (currentApp.decay_window_hours * 60 * 60 * 1000);

        if (!isStillValidForDecay) {
          await client.query('ROLLBACK');
          continue;
        }

        const newDecayCount = (currentApp.decay_count || 0) + 1;
        const newDecayLevel = (currentApp.decay_level || 0) + newDecayCount;

        // Update application
        await client.query(`
          UPDATE applications
          SET status = 'waitlisted',
              decay_count = $1,
              decay_level = $2,
              promoted_at = NULL,
              status_updated_at = NOW()
          WHERE id = $3
        `, [newDecayCount, newDecayLevel, currentApp.id]);

        // Log transition
        await client.query(`
          INSERT INTO state_transition_logs (
            application_id, from_status, to_status, reason, metadata
          ) VALUES ($1, 'active', 'waitlisted', 'inactivity_decay', $2)
        `, [
          currentApp.id,
          JSON.stringify({
            decay_count: newDecayCount,
            new_decay_level: newDecayLevel,
            decay_window_hours: currentApp.decay_window_hours
          })
        ]);

        // Promote next applicant
        await promoteNextApplicant(currentApp.job_id, client);

        await client.query('COMMIT');
        decayedCount++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`Error decaying application ${app.id}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in checkAndDecay:', error);
  } finally {
    client.release();
  }

  return decayedCount;
};

/**
 * Acknowledges a promotion for an application.
 */
const acknowledgePromotion = async (applicationId, applicantId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Lock and verify application
    const appRes = await client.query(`
      SELECT * FROM applications
      WHERE id = $1 AND applicant_id = $2
      FOR UPDATE
    `, [applicationId, applicantId]);

    if (appRes.rows.length === 0) {
      throw new Error('Application not found');
    }

    const application = appRes.rows[0];

    if (application.status !== 'active' || !application.promoted_at || application.acknowledged_at) {
      throw new Error('Application is not in a state to be acknowledged');
    }

    // Update application
    const updatedRes = await client.query(`
      UPDATE applications
      SET acknowledged_at = NOW(),
          status_updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [applicationId]);

    // Log transition
    await client.query(`
      INSERT INTO state_transition_logs (
        application_id, from_status, to_status, reason
      ) VALUES ($1, 'active', 'active', 'promotion_acknowledged')
    `, [applicationId]);

    await client.query('COMMIT');
    return updatedRes.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  checkAndDecay,
  acknowledgePromotion
};