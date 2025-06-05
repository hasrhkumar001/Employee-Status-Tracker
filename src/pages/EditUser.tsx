import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import Select from 'react-select';

interface TeamOption {
  value: string; // Changed from 'id' to 'value' for react-select
  label: string; // Changed from 'name' to 'label' for react-select
}

const EditUser: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'employee',
    password: '',
    teams: [] as string[],
  });

  const [allTeams, setAllTeams] = useState<TeamOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user and team data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const [userRes, teamsRes] = await Promise.all([
          axios.get(`/api/users/${id}`),
          axios.get('/api/teams'),
        ]);

        const user = userRes.data;
        const teamOptions = teamsRes.data.map((team: any) => ({
          value: team._id, // Changed to 'value'
          label: team.name, // Changed to 'label'
        }));

        // Extract team IDs from user.teams array of objects
        const userTeamIds = user.teams ? user.teams.map((team: any) => team._id) : [];
        
        setFormData({
          name: user.name,
          email: user.email,
          role: user.role,
          password: '',
          teams: userTeamIds,
        });

        setAllTeams(teamOptions);
      } catch (err: any) {
        setError('Failed to load user or teams');
        console.error('Error fetching data:', err);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchData();
    }
  }, [id]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Handle team selection change
  const handleTeamChange = (selectedOptions: TeamOption[] | null) => {
    const selectedTeamIds = selectedOptions ? selectedOptions.map((option) => option.value) : [];
    setFormData({ ...formData, teams: selectedTeamIds });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const dataToSend = { ...formData };
      if (!dataToSend.password) delete dataToSend.password;

      await axios.put(`/api/users/${id}`, dataToSend);
      navigate('/admin/users');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user');
    }
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit User</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Name */}
        <div>
          <label className="block text-gray-700 font-medium mb-1" htmlFor="name">Name</label>
          <input
            name="name"
            id="name"
            value={formData.name}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            onChange={handleChange}
            required
            autoComplete="off"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-gray-700 font-medium mb-1" htmlFor="email">Email</label>
          <input
            name="email"
            id="email"
            value={formData.email}
            type="email"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            onChange={handleChange}
            required
            autoComplete="off"
          />
        </div>

        {/* Password */}
        <div>
          <label className="block text-gray-700 font-medium mb-1" htmlFor="password">Password</label>
          <input
            name="password"
            id="password"
            value={formData.password}
            type="password"
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
            onChange={handleChange}
            autoComplete="new-password"
            placeholder="Leave blank to keep unchanged"
          />
        </div>

        {/* Role */}
        <div>
          <label className="block text-gray-700 font-medium mb-1" htmlFor="role">Role</label>
          <select
            name="role"
            id="role"
            value={formData.role}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Teams */}
        {formData.role !== 'admin' && (
          <div>
            <label className="block text-gray-700 font-medium mb-1">Teams</label>
            <Select
              isMulti
              name="teams"
              options={allTeams}
              value={allTeams.filter((team) => formData.teams.includes(team.value))}
              onChange={handleTeamChange}
              className="react-select-container"
              classNamePrefix="react-select"
              isDisabled={loading}
            />
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Update
        </button>
      </form>
    </div>
  );
};

export default EditUser;