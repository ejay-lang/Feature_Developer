const rightsService = require('./rights.service');

async function listCatalog(req, res, next) {
  try {
    res.status(200).json(await rightsService.listCatalog());
  } catch (error) {
    next(error);
  }
}

async function getUserPermissions(req, res, next) {
  try {
    res.status(200).json(await rightsService.getUserPermissions(req.user, req.params.id));
  } catch (error) {
    next(error);
  }
}

async function getUserAudit(req, res, next) {
  try {
    res.status(200).json(await rightsService.getUserAudit(req.user, req.params.id));
  } catch (error) {
    next(error);
  }
}

async function saveUserPermissions(req, res, next) {
  try {
    const result = await rightsService.saveUserPermissions(
      req.user,
      req.params.id,
      req.permissionCodes,
    );
    res.status(200).json({
      message: result.changed ? 'Permissions saved and audit logged.' : 'Permissions are unchanged.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  listCatalog,
  getUserPermissions,
  getUserAudit,
  saveUserPermissions,
};
