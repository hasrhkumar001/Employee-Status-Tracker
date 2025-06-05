import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const inputClass =
  "w-full px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 transition";
const labelClass = "block text-sm font-medium text-gray-700 mb-1";
const buttonClass =
  "w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded transition disabled:bg-gray-400 disabled:cursor-not-allowed";
const errorClass = "text-red-500 text-sm mt-1";

interface FormData {
  name: string;
  email: string;
  password: string;
  role: string;
}

interface ValidationErrors {
  name?: string;
  email?: string;
  password?: string;
}

const CreateUser: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    role: 'employee'
  });
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Validation functions
  const validateName = (name: string): string | undefined => {
    if (!name.trim()) return 'Name is required';
    if (name.trim().length < 2) return 'Name must be at least 2 characters';
    if (name.trim().length > 50) return 'Name must be less than 50 characters';
    if (!/^[a-zA-Z\s]+$/.test(name.trim())) return 'Name can only contain letters and spaces';
    return undefined;
  };

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) return 'Email is required';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) return 'Please enter a valid email address';
    if (email.length > 100) return 'Email must be less than 100 characters';
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return 'Password is required';
    if (password.length < 6) return 'Password must be at least 6 characters';
    if (password.length > 128) return 'Password must be less than 128 characters';
  
    return undefined;
  };

  const validateForm = (): boolean => {
    const newErrors: ValidationErrors = {};
    
    const nameError = validateName(formData.name);
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    if (nameError) newErrors.name = nameError;
    if (emailError) newErrors.email = emailError;
    if (passwordError) newErrors.password = passwordError;

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });

    // Clear error for the field being modified
    if (errors[name as keyof ValidationErrors]) {
      setErrors({ ...errors, [name]: undefined });
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let error: string | undefined;

    switch (name) {
      case 'name':
        error = validateName(value);
        break;
      case 'email':
        error = validateEmail(value);
        break;
      case 'password':
        error = validatePassword(value);
        break;
    }

    if (error) {
      setErrors({ ...errors, [name]: error });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        <p className="ml-4 text-gray-700 p-4">Creating user...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/users', {
        ...formData,
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase()
      });
      navigate('/admin/users');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = !errors.name && !errors.email && !errors.password && 
                     formData.name.trim() && formData.email.trim() && formData.password;

  return (
    <div className="max-w-md mx-auto mt-16 p-8 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-center text-gray-800">Create User</h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className={labelClass}>Name *</label>
          <input
            id="name"
            name="name"
            value={formData.name}
            placeholder="Enter full name"
            className={`${inputClass} ${errors.name ? 'border-red-500 focus:ring-red-400' : ''}`}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="name"
          />
          {errors.name && (
            <div className="flex items-center justify-between mt-1">
              <p className={errorClass}>{errors.name}</p>
              <button
                type="button"
                onClick={() => setErrors({ ...errors, name: undefined })}
                className="text-red-500 hover:text-red-700 ml-2"
                aria-label="Clear name error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="email" className={labelClass}>Email *</label>
          <input
            id="email"
            name="email"
            value={formData.email}
            placeholder="Enter email address"
            type="email"
            className={`${inputClass} ${errors.email ? 'border-red-500 focus:ring-red-400' : ''}`}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="email"
          />
          {errors.email && (
            <div className="flex items-center justify-between mt-1">
              <p className={errorClass}>{errors.email}</p>
              <button
                type="button"
                onClick={() => setErrors({ ...errors, email: undefined })}
                className="text-red-500 hover:text-red-700 ml-2"
                aria-label="Clear email error"
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <div>
          <label htmlFor="password" className={labelClass}>Password *</label>
          <input
            id="password"
            name="password"
            value={formData.password}
            placeholder="Enter password"
            type="password"
            className={`${inputClass} ${errors.password ? 'border-red-500 focus:ring-red-400' : ''}`}
            onChange={handleChange}
            onBlur={handleBlur}
            autoComplete="new-password"
          />
          {errors.password && (
            <div className="flex items-center justify-between mt-1">
              <p className={errorClass}>{errors.password}</p>
              <button
                type="button"
                onClick={() => setErrors({ ...errors, password: undefined })}
                className="text-red-500 hover:text-red-700 ml-2"
                aria-label="Clear password error"
              >
                ✕
              </button>
            </div>
          )}
          {/* <div className="text-xs text-gray-500 mt-1">
            Password must contain: 6+ characters, uppercase, lowercase, number, and special character
          </div> */}
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

        <button 
          type="submit" 
          className={buttonClass} 
          
        >
          {loading ? 'Creating...' : 'Create User'}
        </button>
      </form>
    </div>
  );
};

export default CreateUser;