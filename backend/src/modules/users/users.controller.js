const usersService = require('./users.service');

async function listUsers(req, res, next) {
  try {
    const result = await usersService.listUsers(req.userListQuery, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

async function getUser(req, res, next) {
  try {
    const user = await usersService.getUser(req.params.id, req.user);
    res.status(200).json({ user });
  } catch (error) {
    next(error);
  }
}

async function addUser(req, res, next) {
  try {
    const user = await usersService.addUser(req.newUser, req.user);
    res.status(201).json({
      message: 'User created. The account must change its password at first login.',
      user,
    });
  } catch (error) {
    next(error);
  }
}

async function editUser(req, res, next) {
  try {
    const user = await usersService.editUser(req.params.id, req.userUpdate, req.user);
    res.status(200).json({ message: 'User updated.', user });
  } catch (error) {
    next(error);
  }
}

async function blockUser(req, res, next) {
  try {
    const user = await usersService.changeStatus(req.params.id, 'blocked', req.user);
    res.status(200).json({ message: 'User blocked.', user });
  } catch (error) {
    next(error);
  }
}

async function unblockUser(req, res, next) {
  try {
    const user = await usersService.changeStatus(req.params.id, 'active', req.user);
    res.status(200).json({ message: 'User unblocked.', user });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listUsers,
  getUser,
  addUser,
  editUser,
  blockUser,
  unblockUser,
};
