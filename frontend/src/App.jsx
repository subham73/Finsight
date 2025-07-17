import React from 'react';
import Login from './pages/Login';
import { Routes, Route } from 'react-router-dom';
import Forecast from './pages/Forecast';
import Dashboard from './pages/Dashboard';
import AddProject from './pages/AddProject';
import EditProject from './pages/EditProject';

function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forecast" element={<Forecast />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/add-project" element={<AddProject />} />
      <Route path="/project/:projectId/edit" element={<EditProject />} />
    </Routes>
    </>
  );
}

export default App;
