const AuditLog = require('../models/AuditLog');

const log = async ({ userId, action, entity, entityId, details, req }) => {
  try {
    await AuditLog.create({
      userId,
      action,
      entity,
      entityId,
      details,
      ip: req?.ip,
      userAgent: req?.headers?.['user-agent'],
    });
  } catch (err) {
    // Never throw from audit logger
    console.error('Audit log error:', err.message);
  }
};

module.exports = { log };
