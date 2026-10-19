const authService = require('./auth.service');
const env = require('../../config/env');

function regenerateSession(session) {
  return new Promise((resolve, reject) => {
    session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

function saveSession(session) {
  return new Promise((resolve, reject) => {
    session.save((error) => (error ? reject(error) : resolve()));
  });
}

async function register(req, res, next) {
  try {
    const user = await authService.registerUser(req.registration);
    res.status(201).json({
      message: 'Registration submitted. Your account is pending approval.',
      user,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const user = await authService.authenticateUser(req.loginCredentials);
    await regenerateSession(req.session);
    req.session.user = {
      id: user.id,
      sessionVersion: user.sessionVersion,
    };
    await saveSession(req.session);

    const { sessionVersion, ...publicUser } = user;
    res.status(200).json({
      message: 'Login successful.',
      user: publicUser,
    });
  } catch (error) {
    next(error);
  }
}

function logout(req, res, next) {
  if (!req.session) {
    res.clearCookie(env.session.name, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'lax',
      path: '/',
    });
    return res.status(200).json({ message: 'Logout successful.' });
  }

  req.session.destroy((error) => {
    if (error) {
      return next(error);
    }

    res.clearCookie(env.session.name, {
      httpOnly: true,
      secure: env.isProduction,
      sameSite: 'lax',
      path: '/',
    });
    return res.status(200).json({ message: 'Logout successful.' });
  });
}

async function changePassword(req, res, next) {
  try {
    const sessionVersion = await authService.changeUserPassword({
      userId: req.user.id,
      ...req.passwordChange,
    });
    req.session.user.sessionVersion = sessionVersion;
    req.session.user.mustChangePassword = false;
    await saveSession(req.session);

    res.status(200).json({
      message: 'Password changed successfully.',
      mustChangePassword: false,
    });
  } catch (error) {
    next(error);
  }
}

function getCurrentUser(req, res) {
  res.status(200).json({ user: req.user });
}

function getProtectedResource(req, res) {
  res.status(200).json({
    message: 'You have accessed a protected resource.',
    user: req.user,
  });
}

module.exports = {
  register,
  login,
  logout,
  changePassword,
  getCurrentUser,
  getProtectedResource,
};
