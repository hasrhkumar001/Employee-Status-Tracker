import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, X, Plus } from 'lucide-react';
import Select from 'react-select';

const CreateTeam = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [loadingData, setLoadingData] = useState(true);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    project: '',
    members: [],
    questions: [],
    active: true
  });

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const res = await fetch('/api/questions', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!res.ok) throw new Error('Failed to fetch questions');
        const questions = await res.json();

        setFormData(prev => ({
          ...prev,
          questions: questions.length ? questions : prev.questions
        }));
      } catch (err) {
        console.error('Error fetching questions:', err);
      }
    };

    fetchQuestions();
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [projectsRes, usersRes] = await Promise.all([
        fetch('/api/projects', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        }),
        fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        })
      ]);

      if (!projectsRes.ok || !usersRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const [projectsData, usersData] = await Promise.all([
        projectsRes.json(),
        usersRes.json()
      ]);

      setProjects(projectsData);
      setUsers(usersData.filter(user => user._id && user.role === 'employee'));
    } catch (err) {
      setError(err.message || 'Failed to load data');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      ...formData,
      questions: formData.questions.map(q => q._id),
    };

    try {
      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create team');
      }

      navigate('/admin/teams');
    } catch (err) {
      alert(err.message || 'Failed to create team');
      setError(err.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    alert('Add question functionality not implemented');
  };

  const removeQuestion = (index) => {
    const newQuestions = formData.questions.filter((_, i) => i !== index);
    setFormData({ ...formData, questions: newQuestions });
  };

  const updateQuestion = (index, text) => {
    const newQuestions = [...formData.questions];
    newQuestions[index] = { ...newQuestions[index], text };
    setFormData({ ...formData, questions: newQuestions });
  };

  const memberOptions = users.map(user => ({
    value: user._id,
    label: `${user.name} (${user.email})`
  }));

  const handleMemberChange = (selectedOptions) => {
    const selectedMemberIds = selectedOptions ? selectedOptions.map(option => option.value) : [];
    setFormData({ ...formData, members: selectedMemberIds });
  };

  if (loadingData) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/admin/teams')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} className="mr-1" />
          Back to Teams
        </button>
        <h1 className="text-2xl font-bold text-gray-800">Create New Team</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Basic Information</h2>
          
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Team Name *
              </label>
              <input
                type="text"
                id="name"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700">
                Project *
              </label>
              <select
                id="project"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                value={formData.project}
                onChange={(e) => setFormData({ ...formData, project: e.target.value })}
              >
                <option value="">Select a project</option>
                {projects.map(project => (
                  <option key={project._id} value={project._id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* <div className="mt-4">
            <div className="flex items-center">
              <input
                id="active"
                type="checkbox"
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
              />
              <label htmlFor="active" className="ml-2 block text-sm text-gray-900">
                Active team
              </label>
            </div>
          </div> */}
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Team Members</h2>
          <div>
            <label htmlFor="members" className="block text-sm font-medium text-gray-700">
              Select Team Members (Employees) *
            </label>
            <Select
              id="members"
              isMulti
              options={memberOptions}
              value={memberOptions.filter(option => formData.members.includes(option.value))}
              onChange={handleMemberChange}
              placeholder="Select team members..."
              className="mt-1"
              classNamePrefix="react-select"
            />
          </div>
        </div>

        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900">Standup Questions</h2>
            {/* <button
              type="button"
              onClick={addQuestion}
              className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
            >
              <Plus size={16} className="mr-1" />
              Add Question
            </button> */}
          </div>

          <div className="space-y-3">
            {formData.questions.map((question, index) => (
              <div key={index} className="flex items-center space-x-3">
                <input
                  type="text"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  value={question.text}
                  onChange={(e) => updateQuestion(index, e.target.value)}
                  placeholder="Enter question text"
                  disabled
                  required
                />
                <span className={`px-2 py-1 text-xs rounded-full ${
                  question.isCommon
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {question.isCommon ? 'Common' : 'Custom'}
                </span>
                {!question.isCommon && (
                  <button
                    type="button"
                    onClick={() => removeQuestion(index)}
                    className="text-red-600 hover:text-red-900"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={() => navigate('/admin/teams')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
            disabled={loading}
          >
            <Save size={16} className="mr-2" />
            {loading ? 'Creating...' : 'Create Team'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTeam;