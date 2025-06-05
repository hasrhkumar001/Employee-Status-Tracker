import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronLeft, ChevronRight, Calendar, Clock, CheckCircle, UserX, AlertCircle } from 'lucide-react';

// Status Updates Table Component
const StatusUpdatesTable = ({ statuses, questions }) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  const getAnswerForQuestion = (status, questionId) => {
    if (status.isLeave) return null;
    const response = status.responses?.find(r => r.question?._id === questionId);
    return response ? response.answer : '';
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
              Date & Time
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-28 bg-gray-50 z-10">
              Team
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            {questions.map((question) => (
              <th key={question._id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-48">
                {question.text}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {statuses.map((status, index) => (
            <tr key={status._id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 sticky left-0 bg-inherit z-10">
                <div className="flex items-center">
                  <Clock size={14} className="mr-2 text-gray-400" />
                  {formatDate(status.date)}
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 sticky left-28 bg-inherit z-10">
                {status.team?.name || 'Unknown Team'}
              </td>
              <td className="px-4 py-4 whitespace-nowrap">
                {status.isLeave ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    <UserX size={12} className="mr-1" />
                    On Leave
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <CheckCircle size={12} className="mr-1" />
                    Active
                  </span>
                )}
              </td>
              {questions.map((question) => (
                <td key={question._id} className="px-4 py-4 text-sm text-gray-900 max-w-xs">
                  <div className="break-words">
                    {status.isLeave ? (
                      <span className="text-gray-400 italic">N/A (On Leave)</span>
                    ) : (
                      getAnswerForQuestion(status, question._id) || (
                        <span className="text-gray-400 italic">No response</span>
                      )
                    )}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EmployeeStatus = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [statuses, setStatuses] = useState([]);
  const [dateFilter, setDateFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');
  const [startDateFilter, setStartDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const [pageSize, setPageSize] = useState(10);

  // Questions state for dynamic columns
  const [questions, setQuestions] = useState([]);

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
  }, [dateFilter, monthFilter, startDateFilter, endDateFilter, currentPage, pageSize]);

  const fetchStatuses = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = `?page=${currentPage}&limit=${pageSize}`;

      // Apply filters in order of priority
      if (dateFilter) {
        query += `&date=${dateFilter}`;
      } else if (startDateFilter && endDateFilter) {
        query += `&startDate=${startDateFilter}&endDate=${endDateFilter}`;
      } else if (startDateFilter) {
        // If only start date is provided, use it as both start and end date
        query += `&startDate=${startDateFilter}`;
      }else if (endDateFilter) {
        // If only start date is provided, use it as both start and end date
        query += `&endDate=${endDateFilter}`;
      }
       else if (monthFilter) {
        query += `&month=${monthFilter}`;
      }

      console.log('API Query:', `/api/status${query}`); // Debug log

      const response = await fetch(`/api/status${query}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch statuses: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      setStatuses(data.statuses || data);
      setTotalPages(data.totalPages || 1);
      setTotalRecords(data.totalRecords || data.length || 0);

      // Extract unique questions from all statuses
      const uniqueQuestions = [];
      const questionMap = new Map();

      (data.statuses || data).forEach(status => {
        if (status.responses) {
          status.responses.forEach(response => {
            if (response.question && !questionMap.has(response.question._id)) {
              questionMap.set(response.question._id, response.question);
              uniqueQuestions.push(response.question);
            }
          });
        }
      });

      setQuestions(uniqueQuestions);
    } catch (err) {
      setError(err.message || 'Failed to load statuses');
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const value = e.target.value;
    setDateFilter(value);
    // Clear other filters when specific date is selected
    if (value) {
      setMonthFilter('');
      setStartDateFilter('');
      setEndDateFilter('');
    }
    setCurrentPage(1);
  };

  const handleMonthChange = (e) => {
    const value = e.target.value;
    setMonthFilter(value);
    // Clear other filters when month is selected
    if (value) {
      setDateFilter('');
      setStartDateFilter('');
      setEndDateFilter('');
    }
    setCurrentPage(1);
  };

  const handleStartDateChange = (e) => {
    const value = e.target.value;
    setStartDateFilter(value);
    // Clear other filters when date range is used
    if (value) {
      setDateFilter('');
      setMonthFilter('');
    }
    setCurrentPage(1);
    // Clear end date if it's before the new start date
    if (endDateFilter && value && new Date(value) > new Date(endDateFilter)) {
      setEndDateFilter('');
    }
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    setEndDateFilter(value);
    // Clear other filters when date range is used
    if (value) {
      setDateFilter('');
      setMonthFilter('');
    }
    setCurrentPage(1);
    // If start date is after end date, clear start date
    if (startDateFilter && value && new Date(startDateFilter) > new Date(value)) {
      setStartDateFilter('');
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setDateFilter('');
    setMonthFilter('');
    setStartDateFilter('');
    setEndDateFilter('');
    setCurrentPage(1);
  };

  const hasActiveFilters = dateFilter || monthFilter || startDateFilter || endDateFilter;

  // Helper function to get month label from value
  const getMonthLabel = (value) => {
    const option = monthOptions.find(opt => opt.value === value);
    return option ? option.label : value;
  };

  const renderPagination = () => {
    if (totalPages <= 1) return null;

    const maxVisiblePages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    const pages = [];

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    return (
      <div className="flex items-center justify-between px-6 py-3 bg-white border-t border-gray-200">
        <div className="flex items-center text-sm text-gray-700">
          <span>
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalRecords)} of {totalRecords} results
          </span>
          <select
            value={pageSize}
            onChange={handlePageSizeChange}
            className="ml-4 rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
          >
            <option value={5}>5 per page</option>
            <option value={10}>10 per page</option>
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
          </select>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-l-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft size={16} />
          </button>

          {pages.map(page => (
            <button
              key={page}
              onClick={() => handlePageChange(page)}
              className={`inline-flex items-center px-4 py-2 text-sm font-medium border ${page === currentPage
                  ? 'bg-blue-50 border-blue-500 text-blue-600'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
            >
              {page}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="inline-flex items-center px-2 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-r-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full min-h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading status updates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={20} className="mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-2xl font-bold text-gray-800">My Status Updates</h1>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle size={16} className="text-red-500 mr-2 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      
      {/* Filters Section */}
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Calendar className="mr-2" size={20} />
            Filters
          </h2>
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Clear all filters
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="startDateFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              type="date"
              id="startDateFilter"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={startDateFilter}
              onChange={handleStartDateChange}
              max={endDateFilter || new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label htmlFor="endDateFilter" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              type="date"
              id="endDateFilter"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={endDateFilter}
              onChange={handleEndDateChange}
              min={startDateFilter || undefined}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>

          <div>
            <label htmlFor="monthFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Month Filter
            </label>
            <select
              id="monthFilter"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={monthFilter}
              onChange={handleMonthChange}
            >
              <option value="">Select month...</option>
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dateFilter" className="block text-sm font-medium text-gray-700 mb-1">
              Specific Date
            </label>
            <input
              type="date"
              id="dateFilter"
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              value={dateFilter}
              onChange={handleDateChange}
              max={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="mt-4 flex flex-wrap gap-2">
            {startDateFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                From: {new Date(startDateFilter).toLocaleDateString()}
              </span>
            )}
            {endDateFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                To: {new Date(endDateFilter).toLocaleDateString()}
              </span>
            )}
            {monthFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Month: {getMonthLabel(monthFilter)}
              </span>
            )}
            {dateFilter && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Date: {new Date(dateFilter).toLocaleDateString()}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Status Updates Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Calendar className="mr-2" size={20} />
              Status Updates - Table View
            </h2>
            {totalRecords > 0 && (
              <div className="text-sm text-gray-500">
                {totalRecords} total record{totalRecords !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </div>

        {statuses.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No status updates found</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              {hasActiveFilters
                ? "No status updates match your current filters. Try adjusting your date range or clearing filters."
                : "You haven't submitted any status updates yet. Create your first status update to see it here."
              }
            </p>
            {hasActiveFilters && (
              <button
                onClick={clearAllFilters}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-600 bg-blue-50 hover:bg-blue-100"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <>
            <StatusUpdatesTable statuses={statuses} questions={questions} />
            {renderPagination()}
          </>
        )}
      </div>
    </div>
  );
};

export default EmployeeStatus;