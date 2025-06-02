import React, { useContext } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Bell, User, LogOut } from 'lucide-react';
import { AuthContext } from '../../context/AuthContext';

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ toggleSidebar }) => {
  const { user, logout } = useContext(AuthContext);

  return (
    <nav className="bg-white border-b border-gray-200 z-10">
      <div className="px-4 py-3 lg:px-6 flex justify-between items-center">
        <div className="flex items-center">
          <button
            type="button"
            className="text-gray-600 hover:text-gray-900 focus:outline-none md:hidden"
            onClick={toggleSidebar}
          >
            <Menu size={24} />
          </button>
          <Link to="/" className="text-xl font-semibold text-gray-800 ml-2 md:ml-0">
            Status Tracker
          </Link>
        </div>

        <div className="flex items-center">
          {/* <div className="relative">
            <button className="p-1 text-gray-600 hover:text-gray-900 focus:outline-none">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>
          </div> */}

          <div className="ml-4 relative">
            <div className="flex items-center">
              <div className="text-gray-700 mr-2 hidden md:block">
                <span className="block text-sm">{user?.name}</span>
                <span className="block text-xs text-gray-500 capitalize">{user?.role}</span>
              </div>
              <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600">
                <Link   to="/profile">
                <User size={18} /></Link>
              </div>
              <button
                className="ml-2 p-1 text-gray-600 hover:text-gray-900 focus:outline-none"
                onClick={logout}
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;