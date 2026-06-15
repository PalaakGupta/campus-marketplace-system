import { useState } from 'react'
import { Route, Routes, BrowserRouter,Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from "./routes/ProtectedRoute";
import AppShell from './components/layout/AppShell/AppShell';

import Login from './pages/Login/Login';
import Dashboard from './pages/Dashboard/Dashboard';
import Marketplace from './pages/Marketplace/Marketplace';
import ItemDetails from './pages/ItemDetail/ItemDetail';
import ListItem from './pages/ListItem/ListItem';
import Wallet from './pages/Wallet/Wallet';
import MyListings from './pages/MyListings/MyListings';
import Purchases from './pages/Purchases/Purchases';
import Messages from './pages/Messages/Messages';
import Conversation from './pages/Conversation/Conversation';
import Notifications from './pages/Notifications/Notifications';
import Profile from './pages/Profile/Profile';
import AdminApp from './admin/AdminApp';

import './styles/globals.css';
import './styles/components.css';
import './App.css';

export default function App() {

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />}/>
          <Route element={<ProtectedRoute> <AppShell />  </ProtectedRoute>}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/marketplace" element={<Marketplace />} />
            <Route path="/item/:id" element={<ItemDetails />} />
            <Route path="/list-item" element={<ListItem />} />
            <Route path="/wallet" element={<Wallet/>}/>
            <Route path="/my-listings" element={<MyListings />} />
            <Route path="/purchases" element={<Purchases />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/messages/:conversationId" element={<Conversation />} />
            <Route path="/notifications" element={<Notifications/>}/>
            <Route path="/profile" element={<Profile />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace/>}/>
          <Route path="/admin/*" element={<AdminApp />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
