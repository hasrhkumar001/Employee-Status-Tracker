import express from 'express';
import { check, validationResult } from 'express-validator';
import Question from '../models/Question.js';
import Team from '../models/Team.js';
import { auth, isAdmin, isManager } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/questions
// @desc    Create a question
// @access  Private (Admin, Manager)
router.post('/', [
  auth,
  isManager,
  [
    check('text', 'Question text is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { text, isCommon, teams = [], order } = req.body;

  try {
    // Create question
    const question = new Question({
      text,
      isCommon,
      teams,
      order: order || 0,
      createdBy: req.user._id
    });

    await question.save();

    // Add question to teams if specified
    if (teams.length > 0) {
      await Team.updateMany(
        { _id: { $in: teams } },
        { $addToSet: { questions: question._id } }
      );
    }

    res.status(201).json(question);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/questions
// @desc    Get all questions (filtered by access and isCommon)
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    let query = {};
    
    // Filter by isCommon if provided
    if (req.query.isCommon) {
      query.isCommon = req.query.isCommon === 'true';
    }
    
    // Filter by team if provided
    if (req.query.team) {
      query.teams = req.query.team;
    }
    
    // Filter by access level for managers and employees
    if (req.user.role === 'manager') {
      if (!req.query.team) {
        // Get teams from projects manager has access to
        const accessibleTeams = await Team.find({ project: { $in: req.user.projects } });
        const teamIds = accessibleTeams.map(team => team._id);
        
        query.$or = [
          { isCommon: true },
          { teams: { $in: teamIds } }
        ];
      }
    } else if (req.user.role === 'employee') {
      if (!req.query.team) {
        query.$or = [
          { isCommon: true },
          { teams: { $in: req.user.teams } }
        ];
      }
    }
    
    const questions = await Question.find(query)
      .sort({ order: 1 })
      .populate('teams', 'name')
      .populate('createdBy', 'name');
    
    res.json(questions);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   GET /api/questions/:id
// @desc    Get question by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const question = await Question.findById(req.params.id)
      .populate('teams', 'name project')
      .populate('createdBy', 'name');
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Check access for non-admins if not common
    if (req.user.role !== 'admin' && !question.isCommon) {
      // For managers - check if question is for teams in their projects
      if (req.user.role === 'manager') {
        const accessibleTeams = await Team.find({ project: { $in: req.user.projects } });
        const teamIds = accessibleTeams.map(team => team._id.toString());
        
        const hasAccess = question.teams.some(team => 
          teamIds.includes(team._id.toString())
        );
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'Not authorized to view this question' });
        }
      } 
      // For employees - check if question is for their teams
      else if (req.user.role === 'employee') {
        const hasAccess = question.teams.some(team => 
          req.user.teams.includes(team._id)
        );
        
        if (!hasAccess) {
          return res.status(403).json({ message: 'Not authorized to view this question' });
        }
      }
    }
    
    res.json(question);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   PUT /api/questions/:id
// @desc    Update question
// @access  Private (Admin, Creator Manager)
router.put('/:id', [
  auth,
  isManager,
  [
    check('text', 'Question text is required').not().isEmpty()
  ]
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Check if user is creator or admin
    if (req.user.role !== 'admin' && question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this question' });
    }
    
    // Update question fields
    const { text, isCommon, teams, order, active } = req.body;
    
    if (text) question.text = text;
    if (isCommon !== undefined) question.isCommon = isCommon;
    if (order !== undefined) question.order = order;
    if (active !== undefined) question.active = active;
    
    // Update teams if changed
    if (teams) {
      // Remove question from teams no longer associated
      const removedTeams = question.teams.filter(
        t => !teams.includes(t.toString())
      );
      
      if (removedTeams.length > 0) {
        await Team.updateMany(
          { _id: { $in: removedTeams } },
          { $pull: { questions: question._id } }
        );
      }
      
      // Add question to new teams
      const newTeams = teams.filter(
        t => !question.teams.map(qt => qt.toString()).includes(t)
      );
      
      if (newTeams.length > 0) {
        await Team.updateMany(
          { _id: { $in: newTeams } },
          { $addToSet: { questions: question._id } }
        );
      }
      
      question.teams = teams;
    }
    
    question.updatedAt = Date.now();
    
    await question.save();
    
    res.json(question);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// @route   DELETE /api/questions/:id
// @desc    Delete question
// @access  Private (Admin, Creator Manager)
router.delete('/:id', [auth, isManager], async (req, res) => {
  try {
    const question = await Question.findById(req.params.id);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }
    
    // Check if user is creator or admin
    if (req.user.role !== 'admin' && question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this question' });
    }
    
    // Remove question from all teams
    await Team.updateMany(
      { questions: question._id },
      { $pull: { questions: question._id } }
    );
    
    await question.deleteOne();
    
    res.json({ message: 'Question removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

export default router;