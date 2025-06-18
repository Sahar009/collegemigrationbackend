module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('programs', 'schoolId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'schools',
        key: 'schoolId'
      },
      onUpdate: 'CASCADE',
      onDelete: 'RESTRICT'
    });

    // Add index for better query performance
    await queryInterface.addIndex('programs', ['schoolId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('programs', ['schoolId']);
    await queryInterface.removeColumn('programs', 'schoolId');
  }
};
