'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('guests', 'qrToken', {
      type: Sequelize.STRING(64),
      allowNull: true,
      unique: true,
    });
    await queryInterface.addIndex('guests', ['qrToken'], {
      name: 'idx_guests_qr_token',
      unique: true,
      where: { qrToken: { [Sequelize.Op.ne]: null } },
    });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('guests', 'idx_guests_qr_token');
    await queryInterface.removeColumn('guests', 'qrToken');
  },
};
