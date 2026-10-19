const rightsModel = require('./rights.model');

async function listCatalog() {
  return rightsModel.listCatalog();
}

async function getUserPermissions(actor, targetId) {
  return rightsModel.getUserPermissions(actor, targetId);
}

async function getUserAudit(actor, targetId) {
  return rightsModel.getUserAudit(actor, targetId);
}

async function saveUserPermissions(actor, targetId, permissionCodes) {
  return rightsModel.replaceUserPermissions(actor, targetId, permissionCodes);
}

module.exports = {
  listCatalog,
  getUserPermissions,
  getUserAudit,
  saveUserPermissions,
};
