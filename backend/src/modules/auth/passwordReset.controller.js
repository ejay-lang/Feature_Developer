const passwordResetService = require('./passwordReset.service');

function logResetRequestFailure(req, error) {
  console.error('Forgot-password request failed.', {
    requestId: req.requestId,
    code: error.code || 'PASSWORD_RESET_REQUEST_FAILED',
    name: error.name,
  });
}

async function forgotPassword(req, res) {
  let resetRequest;

  try {
    resetRequest = await passwordResetService.preparePasswordReset(req.resetEmail);
  } catch (error) {
    logResetRequestFailure(req, error);
  }

  res.status(202).json({
    message: 'If an active account exists for that email, password reset instructions will be sent shortly.',
    requestId: req.requestId,
  });

  if (resetRequest) {
    passwordResetService.queuePasswordResetEmail(resetRequest)
      .catch((error) => logResetRequestFailure(req, error));
  }
}

async function resetPassword(req, res, next) {
  try {
    await passwordResetService.resetPassword(req.resetPassword);
    res.status(200).json({
      message: 'Password reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  forgotPassword,
  resetPassword,
};
