'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('table_reservations', 'qrToken', {
      type: Sequelize.STRING(64),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addIndex('table_reservations', ['qrToken'], { unique: true, where: { qrToken: { [Sequelize.Op.ne]: null } } });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('table_reservations', 'qrToken');
  },
};
