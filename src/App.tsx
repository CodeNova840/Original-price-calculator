import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './components/theme-provider';
import { useAuthStore } from '@/store/auth-store';
import Login from '@/pages/login';
import Dashboard from '@/pages/dashboard';
import ProtectedRoute from '@/components/protected-route';

function App() {
  const { token } = useAuthStore();

  return (
    <>
    
    
     <ThemeProvider defaultTheme="dark" storageKey="theme">
      <Router>
        <Routes>
          <Route path="/login" element={!token ? <Login /> : <Navigate to="/" />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
      <Toaster position="top-right" />
    </ThemeProvider>
    </>

  );
}

export default App;