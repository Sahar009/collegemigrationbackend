import express from 'express';
import { 
    createProgramController, 
    getAllProgramsController, 
    getProgramByIdController, 
    updateProgramController, 
    deleteProgramController,
    searchProgramsController,
    filterProgramsController
} from '../../controllers/programController.js';

const programRouter = express.Router();

// Basic CRUD routes
programRouter.post('/', createProgramController);
programRouter.get('/', getAllProgramsController);
programRouter.get('/:id', getProgramByIdController);
programRouter.put('/:id', updateProgramController);
programRouter.delete('/:id', deleteProgramController);

// Additional functionality routes
programRouter.get('/search', searchProgramsController);
programRouter.get('/filter', filterProgramsController);

export default programRouter; 