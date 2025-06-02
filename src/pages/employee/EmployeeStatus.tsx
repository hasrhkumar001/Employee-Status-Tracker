import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Select from 'react-select';

const EmployeeStatus = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState(null);
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Generate month options for the last 12 months
  const monthOptions = (() => {
    const options = [];
    const today = new Date();
    for (let i = 0; i < 12; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const label = date.toLocaleString('default', { month: 'long', year: 'numeric' });
      options.push({ value: `${year}-${month.toString().padStart(2, '0')}`, label });
    }
    return options;
  })();

  useEffect(() => {
    fetchStatuses();
  }, [dateFilter, monthFilter, startDateFilter, endDateFilter]);

  const fetchStatuses = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = '';
      if (dateFilter) {
        query = `?date=${dateFilter}`;
      } else if (monthFilter) {
        query = `?month=${monthFilter.value}`;
      } else if (startDateFilter && endDateFilter) {
        query = `?startDate=${startDateFilter}&endDate=${endDateFilter}`;
      }

      const response = await fetch(`/api/status${query}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch statuses');
      }

      const data = await response.json();
      setStatuses(data);
    } catch (err) {
      setError(err.message || 'Failed to load statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    setDateFilter(e.target.value);
    setMonthFilter(null);
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const handleMonthChange = (selectedOption) => {
    setMonthFilter(selectedOption);
    setDateFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
  };

  const handleStartDateChange = (e) => {
    setStartDateFilter(e.target.value);
    setDateFilter('');
    setMonthFilter(null);
    if (endDateFilter && new Date(e.target.value) > new Date(endDateFilter)) {
      setEndDateFilter('');
    }
  };

  const handleEndDateChange = (e) => {
    setEndDateFilter(e.target.value);
    setDateFilter('');
    setMonthFilter(null);
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center space-x-4">
        <button
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} className="mr-1" />
          Back to Dashboard
        </button>
        <h1 className="text-2xl font-bold text-gray-800">My Status Updates</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {/* <div>
            <label htmlFor="dateFilter" className="block text-sm font-medium text-gray-700">
              Select Date
            </label>
            <input
              type="date"
              id="dateFilter"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={dateFilter}
              onChange={handleDateChange}
            />
          </div> */}
          {/* <div>
            <label htmlFor="monthFilter" className="block text-sm font-medium text-gray-700">
              Select Month
            </label>
            <Select
              id="monthFilter"
              options={monthOptions}
              value={monthFilter}
              onChange={handleMonthChange}
              placeholder="Select a month..."
              className="mt-1"
              classNamePrefix="react-select"
              isClearable
            />
          </div> */}
          <div>
            <label htmlFor="startDateFilter" className="block text-sm font-medium text-gray-700">
              Start Date
            </label>
            <input
              type="date"
              id="startDateFilter"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={startDateFilter}
              onChange={handleStartDateChange}
            />
          </div>
          <div>
            <label htmlFor="endDateFilter" className="block text-sm font-medium text-gray-700">
              End Date
            </label>
            <input
              type="date"
              id="endDateFilter"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              value={endDateFilter}
              onChange={handleEndDateChange}
              min={startDateFilter}
            />
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Status Updates</h2>
        {statuses.length === 0 ? (
          <p className="text-gray-500">No status updates found for the selected filters.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Team
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responses
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {statuses.map((status) => (
                  <tr key={status._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {status.team?.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(status.date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {status.isLeave ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {status.leaveReason || 'Leave'}
                        </span>
                      ) : (
                        'Active'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {status.isLeave ? (
                        '-'
                      ) : (
                        <ul className="list-disc list-inside">
                          {status.responses.map((response, index) => (
                            <li key={index}>
                              <strong>{response.question?.text}:</strong> {response.answer}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeStatus;