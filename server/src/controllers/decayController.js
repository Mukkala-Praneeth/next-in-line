const decayService = require('../services/decayService');

/**
 * Controller for applicant acknowledging their promotion.
 */
const acknowledge = async (req, res) => {
  const { id } = req.params;
  const applicantId = req.user.id;

  if (req.user.role !== 'applicant') {
    return res.status(403).json({
      success: false,
      message: 'Unauthorized. Only applicants can acknowledge promotions.',
      data: {}
    });
  }

  try {
    const application = await decayService.acknowledgePromotion(id, applicantId);
    res.status(200).json({
      success: true,
      message: 'Promotion acknowledged successfully.',
      data: application
    });
  } catch (error) {
    const statusCode = error.message === 'Application not found' ? 404 : 400;
    res.status(statusCode).json({
      success: false,
      message: error.message,
      data: {}
    });
  }
};

module.exports = {
  acknowledge
};