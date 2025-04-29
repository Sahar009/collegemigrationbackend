'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('agent_transactions', 'agentId', {
        type: Sequelize.INTEGER,
        allowNull: true, 
        references: {
          model: 'agents',
          key: 'agentId'
        },
        after: 'transactionId'
      });

      // Update existing records if needed (you can modify this based on your needs)
      await queryInterface.sequelize.query(`
        UPDATE agent_transactions at
        JOIN agent_applications aa ON at.applicationId = aa.applicationId
        SET at.agentId = aa.agentId
        WHERE at.agentId IS NULL;
      `);

      // Now make it not nullable after updating existing records
      await queryInterface.changeColumn('agent_transactions', 'agentId', {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'agents',
          key: 'agentId'
        }
      });

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('agent_transactions', 'agentId');
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
}; 