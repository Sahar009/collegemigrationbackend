'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add application_deadline to schools table
    await queryInterface.addColumn('schools', 'application_deadline', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'status'
    });

    // Remove application_deadline from programs table
    await queryInterface.removeColumn('programs', 'application_deadline');
  },

  down: async (queryInterface, Sequelize) => {
    // Add application_deadline back to programs table
    await queryInterface.addColumn('programs', 'application_deadline', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'application_fee'
    });

    // Remove application_deadline from schools table
    await queryInterface.removeColumn('schools', 'application_deadline');
  }
};
