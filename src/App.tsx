
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Index from './pages/Index';
import Explore from './pages/Explore';
import Activity from './pages/Activity';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Chat from './pages/Chat';
import IndividualChat from './pages/IndividualChat';
import Auth from './pages/Auth';
import { AuthProvider } from './contexts/AuthContext';
import GroupChat from './pages/GroupChat';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<Index />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/activity" element={<Activity />} />
          <Route path="/profile/:userId" element={<Profile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/edit-profile" element={<EditProfile />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/chat/:userId" element={<IndividualChat />} />
          <Route path="/group/:groupId" element={<GroupChat />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
