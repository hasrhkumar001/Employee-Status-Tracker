import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';

const EditUser: React.FC = () => {
  const { id } = useParams();
  const [formData, setFormData] = useState({ name: '', email: '', role: 'employee', password: '' });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`/api/users/${id}`);
        setFormData({ ...res.data, password: '' }); // Don't prefill password
      } catch (err: any) {
        alert('Failed to fetch user details');
      }
    };
    fetchUser();
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Only send password if it's not empty
      const dataToSend = { ...formData };
      if (!dataToSend.password) delete dataToSend.password;
      await axios.put(`/api/users/${id}`, dataToSend);
      navigate('/admin/users');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update user');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-8 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Edit User</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
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
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-semibold py-2 rounded hover:bg-blue-700 transition"
        >
          Update
        </button>
      </form>
    </div>
  );
};

export default EditUser;
