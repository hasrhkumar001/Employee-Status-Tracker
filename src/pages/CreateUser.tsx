import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const inputClass =
    "w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const buttonClass =
    "w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition";

const CreateUser: React.FC = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        role: 'employee'
    });
    const navigate = useNavigate();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await axios.post('/api/users', formData);
            navigate('/admin/users');
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to create user');
        }
    };

    return (
        <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-xl shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Create User</h2>
            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label htmlFor="name" className={labelClass}>Name</label>
                    <input
                        id="name"
                        name="name"
                        placeholder="Enter name"
                        className={inputClass}
                        onChange={handleChange}
                        required
                        autoComplete="off"
                    />
                </div>
                <div>
                    <label htmlFor="email" className={labelClass}>Email</label>
                    <input
                        id="email"
                        name="email"
                        placeholder="Enter email"
                        type="email"
                        className={inputClass}
                        onChange={handleChange}
                        required
                        autoComplete="off"
                    />
                </div>
                <div>
                    <label htmlFor="password" className={labelClass}>Password</label>
                    <input
                        id="password"
                        name="password"
                        placeholder="Enter password"
                        type="password"
                        className={inputClass}
                        onChange={handleChange}
                        required
                        autoComplete="new-password"
                    />
                </div>
                <div>
                    <label htmlFor="role" className={labelClass}>Role</label>
                    <select
                        id="role"
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className={inputClass}
                    >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <button type="submit" className={buttonClass}>
                    Create
                </button>
            </form>
        </div>
    );
};

export default CreateUser;
