import React, { useContext } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, Users, Briefcase, ClipboardList, 
  Settings, X, UserPlus, FileQuestion, 
  FileText, UserCheck, Download, LayoutGrid,
  LogOut,
  HomeIcon
} from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, setIsOpen }) => {
  const { user,logout } = useContext(AuthContext);
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black bg-opacity-50 transition-opacity md:hidden"
          onClick={() => setIsOpen(false)}
        ></div>
      )}

      {/* Sidebar */}
      <aside
        className={`inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 transform ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 transition-transform duration-300 ease-in-out`}
      >
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <Link to="/" className="flex items-center space-x-2">
            <LayoutGrid className="h-8 w-8 text-blue-600" />
            <span className="text-lg font-semibold text-gray-800">Status Tracker</span>
          </Link>
          <button
            className="md:hidden text-gray-500 hover:text-gray-600"
            onClick={() => setIsOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        <nav className="mt-5 px-4 flex flex-col h-[calc(100vh-5rem)] overflow-y-auto">
        

          {/* Admin links */}
          {user?.role === 'admin' && (
            <div className="">
              {/* <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider my-2">
                Admin
              </h3> */}
              <Link
                to="/admin"
                className={`flex items-center px-4 py-3 mb-2 rounded-md ${
                  isActive('/admin') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <HomeIcon size={20} className="mr-3" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/admin/users"
                className={`flex items-center px-4 py-3 mb-2 rounded-md ${
                  isActive('/admin/users') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <UserPlus size={20} className="mr-3" />
                <span>Users</span>
              </Link>
              <Link
                to="/admin/projects"
                className={`flex items-center px-4 py-3 mb-2 rounded-md ${
                  isActive('/admin/projects') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <Briefcase size={20} className="mr-3" />
                <span>Projects</span>
              </Link>
              <Link
                to="/admin/teams"
                className={`flex items-center px-4 py-3 mb-2 rounded-md ${
                  isActive('/admin/teams') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <Users size={20} className="mr-3" />
                <span>Teams</span>
              </Link>
              <Link
                to="/admin/questions"
                className={`flex items-center px-4 py-3 mb-2 rounded-md ${
                  isActive('/admin/questions') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <FileQuestion size={20} className="mr-3" />
                <span>Questions</span>
              </Link>
            </div>
          )}

          {/* Manager links */}
          {( user?.role === 'manager') && (
            <div className="">
              {/* <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider my-2">
                Manager
              </h3> */}
              <Link
                to="/manager"
                className={`flex items-center px-4 py-3 mb-2 rounded-md ${
                  isActive('/manager') && !isActive('/manager/export') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <HomeIcon size={20} className="mr-3" />
                <span>Dashboard</span>
              </Link>
              <Link
                to="/manager/export"
                className={`flex items-center px-4 py-3 mb-2 rounded-md ${
                  isActive('/manager/export') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setIsOpen(false)}
              >
                <Download size={20} className="mr-3" />
                <span>Export Status</span>
              </Link>
            </div>
          )}

          {/* Employee links */}
            {( user?.role === 'employee') && (
          <div className="">
            {/* <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider my-2">
              Employee
            </h3> */}
            <Link
              to="/employee"
              className={`flex items-center px-4 py-3 mb-2 rounded-md ${
              isActive('/employee') && !isActive('/employee/status')  ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <HomeIcon size={20} className="mr-3" />
              <span>Dashboard</span>
            </Link>

            <Link
              to="/employee/status"
              className={`flex items-center px-4 py-3 mb-2 rounded-md ${
                location.pathname === '/employee/status' ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <FileText size={20} className="mr-3" />
              <span>My Status</span>
            </Link>
            
          </div>)}
            <Link
              to="/profile"
              className={`flex items-center px-4 py-3 mb-2 rounded-md ${
              isActive('/profile') ? 'bg-blue-50 text-blue-600' : 'text-gray-600 hover:bg-gray-100'
              }`}
              onClick={() => setIsOpen(false)}
            >
              <UserCheck size={20} className="mr-3" />
              <span>Profile</span>
            </Link>

          <div className="mt-auto border-t pt-4">
            <button
              onClick={logout}
              className="w-full flex items-center px-4 py-3 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              <LogOut size={20} className="mr-3" />
              <span>Logout</span>
            </button>
          </div>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;