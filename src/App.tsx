import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import ProjectManagement from './pages/admin/ProjectManagement';
import TeamManagement from './pages/admin/TeamManagement';
import QuestionManagement from './pages/admin/QuestionManagement';
import ManagerDashboard from './pages/manager/ManagerDashboard';
import TeamStatus from './pages/manager/TeamStatus';
import TeamMembers from './pages/manager/TeamMembers';
import StatusExport from './pages/manager/StatusExport';
import EmployeeDashboard from './pages/employee/EmployeeDashboard';
import StatusUpdate from './pages/employee/StatusUpdate';
import PrivateRoute from './components/routing/PrivateRoute';
import RoleRoute from './components/routing/RoleRoute';
import { AuthProvider } from './context/AuthContext';
import Layout from './components/layout/Layout';

import EditUser from './pages/EditUser';
import ProjectForm from './components/project/ProjectForm';
import EditTeam from './pages/EditTeam';
import CreateTeam from './pages/CreateTeam';
import CreateQuestion from './pages/CreateQuestion';
import EditQuestion from './pages/EditQuestion';
import ManageQuestionTeams from './pages/ManageQuestionTeams';
import CreateProject from './pages/CreateProject';
import EditProject from './pages/EditProject';
import CreateUser from './pages/CreateUser';
import EditProfie, { ProfileEdit } from './ProfileEdit';
import EmployeeStatus from './pages/employee/EmployeeStatus';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Dashboard />} />

            {/* Admin Routes */}
            <Route path="admin" element={<RoleRoute roles={['admin']}><AdminDashboard /></RoleRoute>} />
            <Route path="admin/users" element={<RoleRoute roles={['admin']}><UserManagement /></RoleRoute>} />
            <Route path="/admin/users/new" element={<RoleRoute roles={['admin', 'manager']}><CreateUser /></RoleRoute>} />
           
            <Route path="/admin/users/:id/edit" element={<RoleRoute roles={['admin', 'manager']}><EditUser /></RoleRoute>} />
             <Route path="/profile" element={<ProfileEdit />} />
            <Route path="admin/projects" element={<RoleRoute roles={['admin']}> <ProjectManagement /></RoleRoute>} />

            <Route path="admin/projects/create" element={<RoleRoute roles={['admin']}><ProjectForm /> </RoleRoute>} />

            <Route path="admin/projects/edit/:id" element={<RoleRoute roles={['admin']}><ProjectForm isEdit /></RoleRoute>} />

            <Route path="/admin/teams/new" element={<RoleRoute roles={['admin']}><CreateTeam /></RoleRoute>} />
            <Route path="/admin/teams/:id/edit" element={<RoleRoute roles={['admin']}><EditTeam /></RoleRoute>} />
            {/* <Route path="/admin/teams/:id/members" element={<TeamMembers />} /> */}

            <Route path="/admin/projects/new" element={<RoleRoute roles={['admin']}><CreateProject /></RoleRoute>} />
            <Route path="/admin/projects/:id/edit" element={<RoleRoute roles={['admin']}><EditProject /></RoleRoute>} />

            <Route
              path="/admin/questions/new"
              element={<RoleRoute roles={['admin']}><CreateQuestion /></RoleRoute>}
            />

            <Route
              path="/admin/questions/:id/edit"
              element={<RoleRoute roles={['admin']}><EditQuestion /></RoleRoute>}
            />

            <Route
              path="/admin/questions/:id/teams"
              element={<RoleRoute roles={['admin']}><ManageQuestionTeams /></RoleRoute>}
            />

            <Route path="admin/teams" element={<RoleRoute roles={['admin']}><TeamManagement /></RoleRoute>}  />
            <Route path="admin/questions" element={<RoleRoute roles={['admin']}><QuestionManagement /></RoleRoute>} />

            {/* Manager Routes */}
            <Route path="manager" element={<RoleRoute roles={['manager']}><ManagerDashboard /></RoleRoute>} />
            <Route path="manager/teams/:teamId" element={<RoleRoute roles={[ 'manager']}><TeamStatus /></RoleRoute>} />
            <Route path="manager/members/:teamId" element={<RoleRoute roles={['manager']}><TeamMembers /></RoleRoute>} />
            <Route path="manager/export" element={<RoleRoute roles={[ 'manager']}><StatusExport /></RoleRoute>} />

            {/* Employee Routes */}
            <Route path="employee" element={<RoleRoute roles={[ 'employee']}><EmployeeDashboard /></RoleRoute>} />
            <Route path="employee/status/:teamId" element={<RoleRoute roles={[ 'employee']}><StatusUpdate /></RoleRoute>} />
            <Route path="employee/status" element={<RoleRoute roles={[ 'employee']}><EmployeeStatus /></RoleRoute>} />

            {/* Edit Profile */}
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;