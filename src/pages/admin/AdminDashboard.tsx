import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import { Users, Briefcase, ClipboardList, FileQuestion } from "lucide-react";

interface DashboardSummary {
  userCount: {
    total: number;
    managers: number;
    employees: number;
  };
  projectCount: number;
  teamCount: number;
  questionCount: number;
  recentActivity: {
    _id: string;
    type: string;
    name: string;
    date: string;
  }[];
}

const AdminDashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        // Fetch users
        const usersResponse = await axios.get("/api/users");
        const users = usersResponse.data;

        // Count total, managers, employees
        const totalUsers = users.length;
        const managers = users.filter((u: any) => u.role === "manager").length;
        const employees = users.filter((u: any) => u.role === "employee").length;
        const admins = users.filter((u: any) => u.role === "admin").length;

        // Fetch projects
        const projectsResponse = await axios.get("/api/projects");
        const projects = projectsResponse.data;

        // Fetch teams
        const teamsResponse = await axios.get("/api/teams");
        const teams = teamsResponse.data;

        // Fetch questions
        const questionsResponse = await axios.get("/api/questions");
        const questions = questionsResponse.data;

        // Optionally: create recentActivity based on latest users/projects/teams
        // Here, just take last 5 users/projects/teams sorted by createdAt or updatedAt
        // Assuming data have 'createdAt' or 'date' field, if not, just mock recent activity

        // Let's assume we take latest 5 from users and projects for example:
        const recentActivityUsers = users
          .slice(-3)
          .map((u: any) => ({
            _id: u._id,
            type: "user",
            name: u.name,
            date: u.createdAt || new Date().toISOString(),
          }));

        const recentActivityProjects = projects
          .slice(-2)
          .map((p: any) => ({
            _id: p._id,
            type: "project",
            name: p.name,
            date: p.createdAt || new Date().toISOString(),
          }));

        const recentActivity = [...recentActivityUsers, ...recentActivityProjects];

        setSummary({
          userCount: {
            total: totalUsers,
            managers,
            employees,admins,
          },
          projectCount: projects.length,
          teamCount: teams.length,
          questionCount: questions.length,
          recentActivity,
        });
      } catch (err: any) {
        setError(err.response?.data?.message || "Failed to fetch dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <p className="text-red-700">Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link to="/admin/users" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-blue-50 text-blue-600">
              <Users size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-semibold">{summary?.userCount.total}</p>
            </div>
          </div>
          <div className="mt-4 flex space-x-4 text-sm">
            <div>
              <p className="text-gray-500">Admins</p>
              <p className="font-medium">{summary?.userCount.admins}</p>
              </div>
            <div>
              <p className="text-gray-500">Managers</p>
              <p className="font-medium">{summary?.userCount.managers}</p>
            </div>
            <div>
              <p className="text-gray-500">Employees</p>
              <p className="font-medium">{summary?.userCount.employees}</p>
            </div>
          </div>
        </Link>

        <Link to="/admin/projects" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-green-50 text-green-600">
              <Briefcase size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Projects</p>
              <p className="text-2xl font-semibold">{summary?.projectCount}</p>
            </div>
          </div>
          <div className="mt-4 text-sm">
            <p className="text-gray-500">Active projects with assigned managers</p>
          </div>
        </Link>

        <Link to="/admin/teams" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-purple-50 text-purple-600">
              <ClipboardList size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Teams</p>
              <p className="text-2xl font-semibold">{summary?.teamCount}</p>
            </div>
          </div>
          <div className="mt-4 text-sm">
            <p className="text-gray-500">Teams across all projects</p>
          </div>
        </Link>

        <Link to="/admin/questions" className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="p-3 rounded-md bg-amber-50 text-amber-600">
              <FileQuestion size={24} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Questions</p>
              <p className="text-2xl font-semibold">{summary?.questionCount}</p>
            </div>
          </div>
          <div className="mt-4 text-sm">
            <p className="text-gray-500">Status questions across all teams</p>
          </div>
        </Link>
      </div>

        {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link to="/admin/users?new=true" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700">
            Add New User
          </Link>
          <Link to="/admin/projects?new=true" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700">
            Create Project
          </Link>
          <Link to="/admin/teams?new=true" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700">
            Create Team
          </Link>
          <Link to="/admin/questions?new=true" className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700">
            Add Question
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h2>
        <div className="space-y-3">
          {summary?.recentActivity.map(activity => (
        <div key={activity._id} className="flex items-center py-2 border-b border-gray-100 last:border-0">
          <div className={`p-2 rounded-md mr-3 ${
            activity.type === 'user' ? 'bg-blue-50 text-blue-600' :
            activity.type === 'project' ? 'bg-green-50 text-green-600' :
            activity.type === 'team' ? 'bg-purple-50 text-purple-600' :
            'bg-amber-50 text-amber-600'
          }`}>
            {activity.type === 'user' ? <Users size={18} /> : 
             activity.type === 'project' ? <Briefcase size={18} /> :
             activity.type === 'team' ? <ClipboardList size={18} /> :
             <FileQuestion size={18} />}
          </div>
          <div>
            <p className="font-medium">{activity.name}</p>
            <p className="text-sm text-gray-500">
          {activity.type.charAt(0).toUpperCase() + activity.type.slice(1)} {activity.action || "added"} on {new Date(activity.date).toLocaleDateString()}
            </p>
          </div>
        </div>
          ))}
        </div>
      </div>

    
    </div>
  );
};

export default AdminDashboard;