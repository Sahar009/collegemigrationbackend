import express from 'express';
import { 
    createProgramController, 
    getAllProgramsController, 
    getProgramByIdController, 
    updateProgramController, 
    deleteProgramController,
    searchProgramsController,
    filterProgramsController,
    createProgram 
} from '../../controllers/programController.js';

const programRouter = express.Router();

// Move the search and filter routes BEFORE the /:id route
// to prevent conflicts with parameter routing
programRouter.get('/search', searchProgramsController);
programRouter.get('/filter', filterProgramsController);

// Basic CRUD routes
programRouter.post('/', createProgramController);
programRouter.get('/', getAllProgramsController);  // This should handle all query parameters
programRouter.get('/:id', getProgramByIdController);
programRouter.put('/:id', updateProgramController);
programRouter.delete('/:id', deleteProgramController);

// add program route
programRouter.post('/create', createProgram);

export default programRouter; 