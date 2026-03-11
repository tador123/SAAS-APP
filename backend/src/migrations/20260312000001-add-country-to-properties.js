'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('properties', 'country', {
      type: Sequelize.STRING(2),
      allowNull: true,
      comment: 'ISO 3166-1 alpha-2 country code',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('properties', 'country');
  },
};
