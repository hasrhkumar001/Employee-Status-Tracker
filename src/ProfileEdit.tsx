import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { X, User, Mail, Lock, Edit3, Check, AlertCircle } from 'lucide-react';

// Alert Component with auto-close and cross button
const Alert: React.FC<{ 
  type: 'success' | 'error'; 
  message: string; 
  onClose: () => void;
}> = ({ type, message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Auto close after 3 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  const isSuccess = type === 'success';
  
  return (
    <div className={`
      mb-6 p-4 rounded-xl border flex items-center justify-between
      transform transition-all duration-300 ease-in-out
      ${isSuccess 
        ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
        : 'bg-red-50 border-red-200 text-red-700'
      }
    `}>
      <div className="flex items-center gap-3">
        {isSuccess ? (
          <Check className="w-5 h-5 text-emerald-600" />
        ) : (
          <AlertCircle className="w-5 h-5 text-red-600" />
        )}
        <span className="font-medium">{message}</span>
      </div>
      <button
        onClick={onClose}
        className={`
          p-1 rounded-full transition-colors duration-200
          ${isSuccess 
            ? 'hover:bg-emerald-100 text-emerald-600' 
            : 'hover:bg-red-100 text-red-600'
          }
        `}
        aria-label="Close alert"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

// Modern Modal Component
const Modal: React.FC<{ open: boolean; onClose: () => void; children: React.ReactNode }> = ({
  open,
  onClose,
  children,
}) => {
  if (!open) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl p-8 relative w-full max-w-lg mx-4 transform transition-all duration-300 scale-100">
        <button
          className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors duration-200"
          onClick={onClose}
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
        {children}
      </div>
    </div>
  );
};

export const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/login');
          return;
        }

        axios.defaults.headers.common['x-auth-token'] = token;

        const authResponse = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const userId = authResponse.data._id;

        const response = await axios.get(`/api/users/${userId}`);
        const user = response.data;

        setCurrentUser(user);
        setFormData({
          name: user.name,
          email: user.email,
          password: '',
        });
      } catch (err: any) {
        if (err.response?.status === 401) {
          navigate('/login');
        } else {
          setError('Failed to load profile data');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setSuccess(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentUser) {
      setError('User data not loaded');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const dataToSend: any = {
        name: formData.name,
        email: formData.email,
      };

      if (formData.password && formData.password.trim() !== '') {
        dataToSend.password = formData.password;
      }

      const response = await axios.put(`/api/users/${currentUser.id || currentUser._id}`, dataToSend);

      setSuccess('Profile updated successfully!');
      setFormData({ ...formData, password: '' });
      setCurrentUser(response.data);
      setModalOpen(false);
    } catch (err: any) {
      if (err.response?.status === 401) {
        navigate('/login');
      } else if (err.response?.status === 403) {
        setError('You are not authorized to update this profile');
      } else {
        setError(err.response?.data?.message || 'Failed to update profile');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && !formData.name) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Loading your profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen   p-6">
      <div className="  shadow-lg mx-auto">
        {/* Alerts */}
        {success && (
          <Alert 
            type="success" 
            message={success} 
            onClose={() => setSuccess(null)} 
          />
        )}
        {error && (
          <Alert 
            type="error" 
            message={error} 
            onClose={() => setError(null)} 
          />
        )}

        {/* Profile Card */}
        <div className=" p-3  ">
          <div className=""></div>
          
          <div className="">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between ">
              <div className="flex flex-col lg:flex-row lg:items-end lg:gap-6">
                <div className="mb-4 lg:mb-0">
                  <div className="w-32 h-32 rounded-full bg-white p-1 shadow-xl">
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-4xl font-bold text-white">
                      {currentUser?.name?.[0]?.toUpperCase() || '?'}
                    </div>
                  </div>
                </div>
                
                <div className="">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    {currentUser?.name || 'Loading...'}
                  </h1>
                  <p className="text-gray-600 mb-4 flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    {currentUser?.email}
                  </p>
                  
                  <div className="flex flex-wrap gap-3">
                    <span className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-4 py-2 rounded-full text-sm font-medium">
                      <User className="w-4 h-4" />
                      Role: {currentUser?.role || 'N/A'}
                    </span>
                    {/* {currentUser?.teams && currentUser.teams.length > 0 && (
                      <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
                        Teams: {currentUser.teams.map((team: any) => team.name || team).join(', ')}
                      </span>
                    )} */}
                  </div>
                </div>
              </div>
              
              <button
                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold px-6 py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center gap-2 self-start lg:self-auto mt-4 lg:mt-0"
                onClick={() => setModalOpen(true)}
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Edit Modal */}
        <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
          <div className="pr-8">
            <h2 className="text-2xl font-bold mb-6 text-gray-900 flex items-center gap-3">
              <Edit3 className="w-6 h-6 text-blue-600" />
              Edit Profile
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-1">
                <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2" htmlFor="name">
                  <User className="w-4 h-4 text-gray-500" />
                  Name
                </label>
                <input
                  name="name"
                  id="name"
                  value={formData.name}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  onChange={handleChange}
                  required
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2" htmlFor="email">
                  <Mail className="w-4 h-4 text-gray-500" />
                  Email
                </label>
                <input
                  name="email"
                  id="email"
                  value={formData.email}
                  type="email"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  onChange={handleChange}
                  disabled={true} // Email is not editable
                  required
                  autoComplete="off"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-gray-700 font-medium mb-2 flex items-center gap-2" htmlFor="password">
                  <Lock className="w-4 h-4 text-gray-500" />
                  New Password
                </label>
                <input
                  name="password"
                  id="password"
                  value={formData.password}
                  type="password"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
                  onChange={handleChange}
                  autoComplete="new-password"
                  placeholder="Leave blank to keep current password"
                  minLength={6}
                />
                {formData.password && formData.password.length > 0 && formData.password.length < 6 && (
                  <p className="text-red-500 text-sm mt-2 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Password must be at least 6 characters
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold py-3 rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              >
                {loading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Updating...
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    Update Profile
                  </div>
                )}
              </button>
            </form>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default ProfileEdit;