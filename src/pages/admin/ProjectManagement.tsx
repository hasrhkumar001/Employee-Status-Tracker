import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Plus, Edit, Trash2, Users, Search, Filter } from 'lucide-react';

interface Project {
  _id: string;
  name: string;
  description: string;
  managers: {
    _id: string;
    name: string;
    email: string;
  }[];
  teams: {
    _id: string;
    name: string;
  }[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
  createdBy: {
    _id: string;
    name: string;
  };
}

const ProjectManagement: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/projects');
      setProjects(response.data);
      setFilteredProjects(response.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  // Filter projects based on search term and status
  useEffect(() => {
    let filtered = projects;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(project =>
        project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.managers.some(manager => 
          manager.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(project => 
        statusFilter === 'active' ? project.active : !project.active
      );
    }

    setFilteredProjects(filtered);
  }, [projects, searchTerm, statusFilter]);

  const handleDelete = async (projectId: string, projectName: string) => {
    if (!window.confirm(`Are you sure you want to delete the project "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await axios.delete(`/api/projects/${projectId}`);
      setProjects(prev => prev.filter(project => project._id !== projectId));
      alert('Project deleted successfully');
    } catch (err: any) {
      alert('Failed to delete project: ' + (err.response?.data?.message || err.message));
    }
  };

  const handleStatusToggle = async (projectId: string, currentStatus: boolean) => {
    try {
      const response = await axios.put(`/api/projects/${projectId}`, {
        active: !currentStatus
      });
      
      setProjects(prev => prev.map(project => 
        project._id === projectId 
          ? { ...project, active: !currentStatus }
          : project
      ));
    } catch (err: any) {
      alert('Failed to update project status: ' + (err.response?.data?.message || err.message));
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 p-4 rounded-md">
        <p className="text-red-700">Error: {error}</p>
        <button 
          onClick={fetchProjects}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Project Management</h1>
        <Link
          to="/admin/projects/create"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus size={16} className="mr-2" />
          New Project
        </Link>
      </div>

      {/* Filters */}
      {/* <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search projects, descriptions, or managers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </div> */}

      {/* Projects Table */}
      <div className="bg-white shadow-sm rounded-lg border">
        {filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 text-lg mb-2">No projects found</div>
            <p className="text-gray-400">
              {projects.length === 0 
                ? 'Get started by creating your first project.' 
                : 'Try adjusting your search or filter criteria.'
              }
            </p>
            {projects.length === 0 && (
              <Link
                to="/admin/projects/create"
                className="inline-flex items-center mt-4 px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
              >
                <Plus size={16} className="mr-2" />
                Create First Project
              </Link>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Managers
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teams
                  </th>
                  {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th> */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.map(project => (
                  <tr key={project._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{project.name}</div>
                      <div className="text-sm text-gray-500 max-w-xs truncate">
                        {project.description || 'No description'}
                      </div>
                      {project.createdBy && (
                        <div className="text-xs text-gray-400 mt-1">
                          Created by {project.createdBy.name}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {project.managers.length > 0 ? (
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {project.managers.slice(0, 3).map(manager => (
                              <div
                                key={manager._id}
                                className="h-8 w-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center"
                                title={`${manager.name} (${manager.email})`}
                              >
                                <span className="text-xs font-medium text-blue-600">
                                  {manager.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                            ))}
                            {project.managers.length > 3 && (
                              <div className="h-8 w-8 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                                <span className="text-xs font-medium text-gray-600">
                                  +{project.managers.length - 3}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="ml-3 text-sm text-gray-600">
                            {project.managers.length} manager{project.managers.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">No managers assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {project.teams.length} team{project.teams.length !== 1 ? 's' : ''}
                      </div>
                      {project.teams.length > 0 && (
                        <div className="text-sm text-gray-500 max-w-xs truncate">
                          {project.teams.map(team => team.name).join(', ')}
                        </div>
                      )}
                    </td>
                    {/* <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleStatusToggle(project._id, project.active)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                          project.active
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                        }`}
                      >
                        {project.active ? 'Active' : 'Inactive'}
                      </button>
                    </td> */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(project.createdAt).toLocaleDateString()}</div>
                      {project.updatedAt && project.updatedAt !== project.createdAt && (
                        <div className="text-xs text-gray-400">
                          Updated {new Date(project.updatedAt).toLocaleDateString()}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        {/* <Link
                          to={`/admin/projects/${project._id}/teams`}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded transition-colors"
                          title="Manage Teams"
                        >
                          <Users size={18} />
                        </Link> */}
                        <Link
                          to={`/admin/projects/${project._id}/edit`}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded transition-colors"
                          title="Edit Project"
                        >
                          <Edit size={18} />
                        </Link>
                        {/* <button
                          onClick={() => handleDelete(project._id, project.name)}
                          className="text-red-600 hover:text-red-900 p-1 rounded transition-colors"
                          title="Delete Project"
                        >
                          <Trash2 size={18} />
                        </button> */}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Summary */}
      {filteredProjects.length > 0 && (
        <div className="text-sm text-gray-500 text-center">
          Showing {filteredProjects.length} of {projects.length} projects
          {searchTerm && ` matching "${searchTerm}"`}
          {statusFilter !== 'all' && ` with ${statusFilter} status`}
        </div>
      )}
    </div>
  );
};

export default ProjectManagement;