import express from 'express';
import StatusUpdate from '../models/Status.js';
import Team from '../models/Team.js';
import Project from '../models/Project.js';
import User from '../models/User.js';
import Question from '../models/Question.js';
import ExcelJS from 'exceljs';
import { auth, isManager } from '../middleware/auth.js';

const router = express.Router();

router.get('/excel', auth, isManager, async (req, res) => {
  try {
    const { team, teams, user, users, startDate, endDate, month, year } = req.query;
    
    // Handle both single and multiple team/user parameters
    let teamIds = [];
    let userIds = [];
    
    // Process team parameters
    if (teams) {
      // Handle comma-separated teams
      teamIds = teams.split(',').map(id => id.trim()).filter(id => id);
    } else if (team) {
      // Handle single team
      teamIds = [team];
    }
    
    // Process user parameters
    if (users) {
      // Handle comma-separated users
      userIds = users.split(',').map(id => id.trim()).filter(id => id);
    } else if (user) {
      // Handle single user
      userIds = [user];
    }
    
    // Validate input - require either teams or users
    if (teamIds.length === 0 && userIds.length === 0) {
      return res.status(400).json({ 
        message: 'Either team/teams or user/users is required'
      });
    }
    
    // Build date filter
    let dateFilter = {};
    
    if (startDate && endDate) {
      dateFilter = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    } else if (month && year) {
      const startMonthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endMonthDate = new Date(parseInt(year), parseInt(month), 0);
      
      dateFilter = {
        $gte: startMonthDate,
        $lte: endMonthDate
      };
    } else {
      // Default to current month if no date filter provided
      const today = new Date();
      const startMonthDate = new Date(today.getFullYear(), today.getMonth(), 1);
      const endMonthDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
      dateFilter = {
        $gte: startMonthDate,
        $lte: endMonthDate
      };
    }
    
    // Check permissions
    let accessibleTeamIds = [];
    
    if (req.user.role === 'admin') {
      // Admin can access all teams
      if (teamIds.length > 0) {
        accessibleTeamIds = teamIds;
      } else {
        const allTeams = await Team.find();
        accessibleTeamIds = allTeams.map(team => team._id.toString());
      }
    } else if (req.user.role === 'manager') {
      // Manager can access teams from their projects
      const managedProjects = await Project.find({ managers: req.user._id });
      const projectIds = managedProjects.map(project => project._id);
      
      let accessibleTeams;
      if (teamIds.length > 0) {
        accessibleTeams = await Team.find({
          _id: { $in: teamIds },
          project: { $in: projectIds }
        });
      } else {
        accessibleTeams = await Team.find({
          project: { $in: projectIds }
        });
      }
      
      accessibleTeamIds = accessibleTeams.map(team => team._id.toString());
      
      if (teamIds.length > 0 && accessibleTeamIds.length === 0) {
        return res.status(403).json({
          message: 'You do not have permission to access the requested teams'
        });
      }
    } else {
      // Employees can access only their teams
      return res.status(403).json({
        message: 'Only managers and admins can generate reports'
      });
    }
    
    if (accessibleTeamIds.length === 0 && userIds.length === 0) {
      return res.status(404).json({ message: 'No accessible teams or users found' });
    }
    
    // Build query
    const query = {
      date: dateFilter
    };
    
    // Add user filter if specified
    if (userIds.length > 0) {
      query.user = { $in: userIds };
    }
    
    // Add team filter if we have accessible teams
    if (accessibleTeamIds.length > 0) {
      query.team = { $in: accessibleTeamIds };
    }
    
    console.log('Query built:', JSON.stringify(query, null, 2)); // Debug log
    
    // Get all dates in the range
    const startDate1 = new Date(dateFilter.$gte);
    const endDate1 = new Date(dateFilter.$lte);
    const allDates = [];
    
    for (let d = new Date(startDate1); d <= endDate1; d.setDate(d.getDate() + 1)) {
      allDates.push(new Date(d));
    }
    
    // Get status updates with proper population
    const statusUpdates = await StatusUpdate.find(query)
      .populate('user', 'name')
      .populate('team', 'name')
      .populate('responses.question', 'text isCommon')
      .lean(); // Use lean for better performance
    
    console.log(`Found ${statusUpdates.length} status updates`); // Debug log
    
    // Determine which teams to include in the report
    let reportTeamIds = accessibleTeamIds;
    if (userIds.length > 0 && teamIds.length === 0) {
      // If only users are specified, get their teams from the status updates
      const userTeamIds = [...new Set(statusUpdates.map(update => update.team._id.toString()))];
      reportTeamIds = userTeamIds.filter(teamId => accessibleTeamIds.includes(teamId));
    }
    
    // Get all questions (common and team-specific)
    const allQuestions = await Question.find({
      $or: [
        { isCommon: true },
        { teams: { $in: reportTeamIds } }
      ]
    }).lean();
    
    // Get team and user data
    const reportTeams = await Team.find({ _id: { $in: reportTeamIds } }).lean();
    
    // Get users - either specified users or all users from the teams
    let reportUsers;
    if (userIds.length > 0) {
      reportUsers = await User.find({ 
        _id: { $in: userIds },
        teams: { $in: reportTeamIds }
      }).lean();
    } else {
      reportUsers = await User.find({ 
        teams: { $in: reportTeamIds } 
      }).lean();
    }
    
    console.log(`Processing ${reportTeams.length} teams and ${reportUsers.length} users`); // Debug log
    
    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Status Tracker';
    workbook.created = new Date();
    workbook.modified = new Date();
    
    // Add worksheet
    const worksheet = workbook.addWorksheet('Status Report');
    
    // Prepare headers
    const headers = ['Team #', 'Resource Names', 'Questions'];
    allDates.forEach(date => {
      const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD
      headers.push(formattedDate);
    });
    
    // Add headers
    worksheet.addRow(headers);
    
    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
    
    // Set column widths
    worksheet.getColumn(1).width = 15; // Team #
    worksheet.getColumn(2).width = 20; // Resource Names
    worksheet.getColumn(3).width = 30; // Questions
    
    // Set date column widths
    for (let i = 4; i <= headers.length; i++) {
      worksheet.getColumn(i).width = 25;
    }
    
    // Group status updates by team, user, and date for easy lookup
    const updatesByTeamUserDate = {};
    
    statusUpdates.forEach(update => {
      const teamId = update.team._id.toString();
      const userId = update.user._id.toString();
      const dateStr = update.date.toISOString().split('T')[0];
      
      if (!updatesByTeamUserDate[teamId]) {
        updatesByTeamUserDate[teamId] = {};
      }
      
      if (!updatesByTeamUserDate[teamId][userId]) {
        updatesByTeamUserDate[teamId][userId] = {};
      }
      
      updatesByTeamUserDate[teamId][userId][dateStr] = update.responses;
    });
    
    // Add data rows
    let rowIndex = 2;
    
    // Process each team
    reportTeams.forEach((team, teamIndex) => {
      const teamId = team._id.toString();
      const teamName = team.name;
      
      // Get users for this team (filtered by reportUsers if specific users were requested)
      const usersInTeam = reportUsers.filter(user => 
        user.teams && user.teams.some(t => t.toString() === teamId)
      );
      
      if (usersInTeam.length === 0) {
        return; // Skip if no users in team
      }
      
      // Get questions for this team (common + team-specific)
      const teamQuestions = allQuestions.filter(question => 
        question.isCommon || 
        (question.teams && question.teams.some(t => t.toString() === teamId))
      );
      
      let isFirstRowForTeam = true;
      
      // Process each user in the team
      usersInTeam.forEach((user, userIndex) => {
        const userId = user._id.toString();
        
        // Process each question for this user
        teamQuestions.forEach((question, questionIndex) => {
          const row = [];
          
          // Column A: Team # (only for first row of team)
          if (isFirstRowForTeam && userIndex === 0 && questionIndex === 0) {
            row.push(teamName);
            isFirstRowForTeam = false;
          } else {
            row.push('');
          }
          
          // Column B: Resource Names (only for first question of each user)
          if (questionIndex === 0) {
            row.push(user.name);
          } else {
            row.push('');
          }
          
          // Column C: Questions
          row.push(question.text);
          
          // Columns D onward: Date-wise entries
          allDates.forEach(date => {
            const dateStr = date.toISOString().split('T')[0];
            const userUpdates = updatesByTeamUserDate[teamId]?.[userId]?.[dateStr] || [];
            
            // Find the response for this question
            const response = userUpdates.find(r => 
              r.question && r.question._id && 
              r.question._id.toString() === question._id.toString()
            );
            
            row.push(response ? response.answer : '');
          });
          
          worksheet.addRow(row);
          rowIndex++;
        });
      });
      
      // Add empty row between teams (except for last team)
      if (teamIndex < reportTeams.length - 1) {
        worksheet.addRow([]);
        rowIndex++;
      }
    });
    
    // Format all cells
    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          vertical: 'top',
          wrapText: true
        };
        
        // Bold formatting for Team, Resource Names, and Questions columns
        if (colNumber <= 3) {
          cell.font = { bold: true };
        }
        
        // Add borders
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });
    
    // Generate Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=status-report.xlsx');
    res.setHeader('Content-Length', buffer.length);
    
    // Send file
    res.send(buffer);
    
  } catch (error) {
    console.error('Generate Excel report error:', error);
    res.status(500).json({ 
      message: 'Server error', 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;