'use strict';

module.exports = {
  async up(queryInterface, Sequelize, transaction) {
    // Activate all pending properties and their admin users
    await queryInterface.sequelize.query(
      `UPDATE properties SET "isActive" = true, "approvalStatus" = 'approved', "approvedAt" = NOW() WHERE "approvalStatus" = 'pending' AND "deletedAt" IS NULL`,
      { transaction }
    );
    await queryInterface.sequelize.query(
      `UPDATE users SET "isActive" = true WHERE role = 'admin' AND "isActive" = false AND "propertyId" IN (SELECT id FROM properties WHERE "approvalStatus" = 'approved' AND "deletedAt" IS NULL) AND "deletedAt" IS NULL`,
      { transaction }
    );
  },

  async down(queryInterface) {
    // Cannot reliably reverse — which properties were originally pending is unknown
  },
};
