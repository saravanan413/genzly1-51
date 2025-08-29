import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Notifications from './pages/Notifications';
import Profile from './pages/Profile';
import EditProfile from './pages/EditProfile';
import Chat from './pages/Chat';
import IndividualChat from './pages/IndividualChat';
import Auth from './pages/Auth';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import PostDetails from './pages/PostDetails';
import ReelDetails from './pages/ReelDetails';
import GroupChat from './pages/GroupChat';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/auth" element={<Auth />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/explore" element={<ProtectedRoute><Explore /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/edit-profile" element={<ProtectedRoute><EditProfile /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
          <Route path="/chat/:userId" element={<ProtectedRoute><IndividualChat /></ProtectedRoute>} />
          <Route path="/post/:postId" element={<ProtectedRoute><PostDetails /></ProtectedRoute>} />
          <Route path="/reel/:reelId" element={<ProtectedRoute><ReelDetails /></ProtectedRoute>} />
          <Route path="/group/:groupId" element={<GroupChat />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
