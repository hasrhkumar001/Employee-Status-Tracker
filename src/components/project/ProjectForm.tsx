import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import Select from 'react-select';

const ProjectForm = ({ isEdit = false }) => {
  const [formData, setFormData] = useState({ name: '', description: '', managers: [] });
  const [users, setUsers] = useState([]);
  const [alert, setAlert] = useState('');
  const navigate = useNavigate();
  const { id } = useParams();

  const fetchManagers = async () => {
    const token = localStorage.getItem('token');
    const res = await axios.get('/api/users?role=manager', {
      headers: { Authorization: `Bearer ${token}` },
    });
    setUsers(res.data);
  };

  useEffect(() => {
    fetchManagers();

    if (isEdit) {
      const token = localStorage.getItem('token');
      axios
        .get(`/api/projects/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const project = res.data;
          setFormData({
            ...project,
            managers: project.managers.map((m) => ({
              value: m._id || m,
              label: m.name || m,
            })),
          });
        })
        .catch((err) => console.error(err));
    }
  }, [id, isEdit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    try {
      const payload = {
        ...formData,
        managers: formData.managers.map((manager) => manager.value),
      };

      if (isEdit) {
        await axios.put(`/api/projects/${id}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAlert('Project updated!');
      } else {
        await axios.post('/api/projects', payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAlert('Project created!');
      }
      setTimeout(() => navigate('/projects'), 1500);
    } catch (err) {
      console.error(err);
      setAlert('An error occurred.');
    }
  };

  const managerOptions = users.map((user) => ({
    value: user._id,
    label: `${user.name} (${user.email})`,
  }));

  return (
    <div className="max-w-xl mx-auto mt-8 p-6 bg-white rounded-xl shadow-md">
      <h2 className="text-2xl font-bold mb-4">{isEdit ? 'Edit' : 'Create'} Project</h2>

      {alert && <div className="mb-4 text-green-600 font-semibold">{alert}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="text"
          placeholder="Project Name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full border rounded px-3 py-2"
          required
        />

        <textarea
          placeholder="Description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="w-full border rounded px-3 py-2"
        ></textarea>

        <label className="block text-sm font-medium">Assign Managers:</label>
        <Select
          options={managerOptions}
          value={formData.managers}
          isMulti
          onChange={(selectedOptions) => setFormData({ ...formData, managers: selectedOptions })}
        />

        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          {isEdit ? 'Update' : 'Create'}
        </button>
      </form>
    </div>
  );
};

export default ProjectForm;
