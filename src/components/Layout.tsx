import React, { useState } from 'react';
import { Link, useLocation, useNavigate, Outlet } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToastStore } from '../stores/useToastStore';
import { NotificationBell } from './NotificationBell';
import {
  LayoutDashboard, 
  LineChart, 
  BarChart3,
  Users,
  GraduationCap,
  Briefcase,
  Menu,
  Search,
  ChevronLeft,
  User,
  LogOut,
  TrendingUp
} from 'lucide-react';

export function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { addToast } = useToastStore();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Task', href: '/task', icon: LineChart },
    {
      name: 'Job Search',
      href: '/job-search',
      icon: Briefcase,
      roles: ['student']
    },
    ...(user?.role === 'admin' ? [
      { name: 'Users', href: '/users', icon: Users },
      { name: 'Students', href: '/students', icon: GraduationCap },
      { name: 'Reports', href: '/reports', icon: BarChart3, roles: ['admin', 'coach', 'mentor',] },
      { name: 'Performance', href: '/performance', icon: TrendingUp },
    ] : []),
    ...(user?.role === 'admin' || user?.role === 'mentor' || user?.role === 'coach' ? [
      { name: 'Performance', href: '/performance', icon: TrendingUp },
    ] : []),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white border-b border-gray-200 flex items-center px-4 z-50">
        <div className="flex items-center">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg hover:bg-gray-100"
          >
            <Menu className="h-5 w-5 text-gray-500" />
          </button>
          <div className="flex items-center ml-4">
            <Briefcase className="h-6 w-6 text-indigo-600" />
            <h1 className="ml-2 text-lg font-semibold text-gray-900">
              Student Management System
            </h1>
          </div>
        </div>

        <div className="flex items-center ml-auto space-x-4">
          <div className="relative max-w-md w-96">
            <input
              type="text"
              placeholder="Search tasks..."
              className="w-full pl-10 pr-4 py-1.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          </div>
          <div className="mr-4">
            <NotificationBell />
          </div>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100"
            >
              <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600">
                  {user?.full_name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            </button>
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-700 border-b border-gray-200">
                    <div className="font-medium">{user?.full_name}</div>
                    <div className="text-gray-500 truncate">{user?.email}</div>
                  </div>
                  <button
                    onClick={() => {
                      navigate('/profile');
                      setShowUserMenu(false);
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <User className="h-4 w-4 mr-2" />
                    Profile
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await signOut();
                        setShowUserMenu(false);
                        addToast('Successfully signed out', 'success');
                      } catch (error) {
                        console.error('Error signing out:', error);
                        addToast('Failed to sign out', 'error');
                      }
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-gray-100"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="flex h-screen pt-14">
        {/* Sidebar */}
        <div
          className={`fixed left-0 h-full bg-white border-r border-gray-200 transition-all duration-300 z-40 ${
            isCollapsed ? 'w-16' : 'w-64'
          }`}
        >
          <div className="flex items-center justify-end p-4">
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1.5 rounded-lg hover:bg-gray-100"
            >
              <ChevronLeft className={`h-5 w-5 text-gray-500 transition-transform duration-300 ${
                isCollapsed ? 'rotate-180' : ''
              }`} />
            </button>
          </div>
          <nav className="mt-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex items-center px-3 py-2 mx-2 rounded-lg transition-colors duration-150 ${
                    isActive
                      ? 'bg-indigo-50 text-indigo-600'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`h-5 w-5 ${
                    isActive ? 'text-indigo-600' : 'text-gray-400'
                  }`} />
                  {!isCollapsed && (
                    <span className="ml-3 text-sm font-medium">{item.name}</span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Main content */}
        <div className={`flex-1 transition-all duration-300 ${
          isCollapsed ? 'ml-16' : 'ml-64'
        }`}>
          <main className="p-6">
            <div className="max-w-7xl mx-auto">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}