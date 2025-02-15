import  Application  from './ApplicationSchema.js';
import { ApplicationDocument } from './applicationDocumentSchema.js';
import { Member } from './memberSchema.js';
import { Program } from './programSchema.js';

// Define all associations
export const setupAssociations = () => {
    // Application associations
    Application.belongsTo(Member, { 
        foreignKey: 'memberId',
        targetKey: 'memberId',
        as: 'member'
    });

    Application.belongsTo(Program, {
        foreignKey: 'programId',
        targetKey: 'programId',
        as: 'program'
    });

    Application.hasOne(ApplicationDocument, {
        foreignKey: 'memberId',
        sourceKey: 'memberId',
        as: 'applicationDocument'
    });

    // ApplicationDocument associations
    ApplicationDocument.belongsTo(Member, { 
        foreignKey: 'memberId',
        targetKey: 'memberId'
    });

    ApplicationDocument.belongsTo(Application, {
        foreignKey: 'memberId',
        targetKey: 'memberId',
        as: 'application'
    });

    // Program associations
    Program.hasMany(Application, {
        foreignKey: 'programId',
        as: 'applications'
    });
};

// Make sure we're exporting the function properly
export default setupAssociations; 