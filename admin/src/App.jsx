import React from 'react'
import List from './pages/List'
import Navbar from './components/Navbar'
import { Routes, Route } from 'react-router-dom'
import Hero from './pages/Hero'
import { Home } from 'lucide-react'
import { useUser } from "@clerk/clerk-react";
import { Link } from "react-router-dom";
import DashboardPage from './components/DashboardPage';
import AddPage from './components/AddPage';
import Appointments from './pages/Appointments'
import SerDashboard from './pages/SerDashboard'
import AddSer from './pages/AddSer'
import ListService from './pages/ListService'
import ServiceAppointments from './pages/ServiceAppointments'

function RequireAuth({ children }) {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) return null;
  if (!isSignedIn) return (
    <div className="min-h-screen font-mono flex items-center justify-center bg-linear-to-bfrom-emerald-50 via-green-50 to-emerald-100 px-4">
      <div className="text-center">
        <p className="text-emerald-800 font-semibold text-lg sm:text-2xl mb-4 animate-fade-in">
          Please sign in to view this page
        </p>

        <div className="flex justify-center">
          <Link
            to="/"
            className="px-4 py-2 text-sm rounded-full bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md transition-all duration-300 ease-in-out animate-bounce-subtle"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
  return children;
}

const App = () => {
  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Hero />} />

        <Route
          path="/h"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/add"
          element={
            <RequireAuth>
              <AddPage />
            </RequireAuth>
          }
        />

        <Route
          path="/list"
          element={
            <RequireAuth>
              <List />
            </RequireAuth>
          }
        />

        <Route
          path="/appointments"
          element={
            <RequireAuth>
              <Appointments />
            </RequireAuth>
          }
        />

        <Route
          path="/service-dashboard"
          element={
            <RequireAuth>
              <SerDashboard />
            </RequireAuth>
          }
        />

        {/* Add new service */}
        <Route
          path="/add-service"
          element={
            <RequireAuth>
              <AddSer />
            </RequireAuth>
          }
        />

        {/* Edit existing service — serviceId comes from the URL */}
        <Route
          path="/edit-service/:serviceId"
          element={
            <RequireAuth>
              <AddSer />
            </RequireAuth>
          }
        />

        <Route
          path="/list-service"
          element={
            <RequireAuth>
              <ListService />
            </RequireAuth>
          }
        />

        <Route
          path="/service-appointments"
          element={
            <RequireAuth>
              <ServiceAppointments />
            </RequireAuth>
          }
        />
      </Routes>
    </>
  );
};

export default App;