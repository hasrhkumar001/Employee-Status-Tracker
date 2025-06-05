import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Save, X, UserPlus, Loader } from 'lucide-react';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface Project {
  _id: string;
  name: string;
  description: string;
  managers: User[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FormData {
  name: string;
  description: string;
  managers: string[];
  active: boolean;
}

const EditProject: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [project, setProject] = useState<Project | null>(null);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    description: '',
    managers: [],
    active: true
  });

  const [availableManagers, setAvailableManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch project data and available managers
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [projectResponse, managersResponse] = await Promise.all([
          axios.get(`/api/projects/${id}`),
          axios.get('/api/users?role=manager')
        ]);

        const projectData = projectResponse.data;
        setProject(projectData);
        setFormData({
          name: projectData.name,
          description: projectData.description || '',
          managers: projectData.managers.map((m: User) => m._id),
          active: projectData.active
        });
        setAvailableManagers(managersResponse.data);
      } catch (err: any) {
        const errorMessage = err.response?.data?.message || 'Failed to fetch project data';
        setErrors({ general: errorMessage });
      } finally {
        setFetchingData(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleManagerSelect = (managerId: string) => {
    setFormData(prev => ({
      ...prev,
      managers: prev.managers.includes(managerId)
        ? prev.managers.filter(id => id !== managerId)
        : [...prev.managers, managerId]
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Project name must be at least 2 characters';
    }

    if (formData.description.trim().length > 500) {
      newErrors.description = 'Description must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        ...formData,
        name: formData.name.trim(),
        description: formData.description.trim()
      };

      await axios.put(`/api/projects/${id}`, payload);
      navigate('/admin/projects', { 
        state: { message: 'Project updated successfully!' }
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.response?.data?.errors?.[0]?.msg || 
                          'Failed to update project';
      setErrors({ general: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const selectedManagers = availableManagers.filter(manager => 
    formData.managers.includes(manager._id)
  );

  if (fetchingData) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Loader className="animate-spin h-8 w-8 text-blue-500 mx-auto mb-4" />
          <p className="text-gray-600">Loading project data...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 p-4 rounded-md">
          <p className="text-red-700">Project not found or you don't have permission to edit it.</p>
          <Link
            to="/admin/projects"
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Back to Projects
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            to="/admin/projects"
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Edit Project</h1>
            <p className="text-gray-600">Update project information and settings</p>
          </div>
        </div>
      </div>

      {/* Project Info */}
      <div className="bg-gray-50 p-4 rounded-lg border">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-medium text-gray-800">Current Project: {project.name}</h3>
            <p className="text-sm text-gray-600 mt-1">
              Created: {new Date(project.createdAt).toLocaleDateString()}
              {project.updatedAt && project.updatedAt !== project.createdAt && (
                <span className="ml-2">
                  • Last updated: {new Date(project.updatedAt).toLocaleDateString()}
                </span>
              )}
            </p>
          </div>
          <div className={`px-2 py-1 rounded-full text-xs font-medium ${
            project.active 
              ? 'bg-green-100 text-green-800' 
              : 'bg-gray-100 text-gray-800'
          }`}>
            {project.active ? 'Active' : 'Inactive'}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white shadow-sm rounded-lg border">
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* General Error */}
          {errors.general && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-md">
              <p className="text-red-700 text-sm">{errors.general}</p>
            </div>
          )}

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2">
              Basic Information
            </h3>

            {/* Project Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                Project Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Enter project name"
                maxLength={100}
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.name.length}/100 characters
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  errors.description ? 'border-red-300 focus:border-red-500' : 'border-gray-300 focus:border-blue-500'
                }`}
                placeholder="Enter project description"
                maxLength={500}
              />
              {errors.description && (
                <p className="mt-1 text-sm text-red-600">{errors.description}</p>
              )}
              <p className="mt-1 text-sm text-gray-500">
                {formData.description.length}/500 characters
              </p>
            </div>

            {/* Status */}
            {/* <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleInputChange}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm font-medium text-gray-700">
                  Project is active
                </span>
              </label>
              <p className="mt-1 text-sm text-gray-500">
                Active projects are visible to team members and can be worked on
              </p>
            </div> */}
          </div>

          {/* Manager Assignment */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-2 flex-1">
                Project Managers
              </h3>
              <div className="flex items-center text-sm text-gray-500 ml-4">
                <UserPlus size={16} className="mr-1" />
                {formData.managers.length} selected
              </div>
            </div>

            {availableManagers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No managers available to assign</p>
                <p className="text-sm">Create manager accounts first to assign them to projects</p>
              </div>
            ) : (
              <>
                {/* Selected Managers Display */}
                {selectedManagers.length > 0 && (
                  <div className="bg-blue-50 p-4 rounded-md">
                    <h4 className="text-sm font-medium text-blue-800 mb-2">Selected Managers:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedManagers.map(manager => (
                        <div
                          key={manager._id}
                          className="inline-flex items-center bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm"
                        >
                          <span className="mr-2">{manager.name}</span>
                          <button
                            type="button"
                            onClick={() => handleManagerSelect(manager._id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Available Managers List */}
                <div className="border border-gray-200 rounded-md max-h-60 overflow-y-auto">
                  <div className="p-2">
                    <p className="text-sm text-gray-600 mb-2">
                      Select managers to assign to this project:
                    </p>
                    <div className="space-y-1">
                      {availableManagers.map(manager => (
                        <label
                          key={manager._id}
                          className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={formData.managers.includes(manager._id)}
                            onChange={() => handleManagerSelect(manager._id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                          />
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {manager.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              {manager.email}
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              to="/admin/projects"
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Save size={16} className="mr-2" />
                  Update Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProject;