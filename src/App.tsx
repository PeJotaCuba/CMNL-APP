import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GlobalFAB } from './components/GlobalFAB';
import { Home } from './pages/Home';
import { NewsManagement } from './pages/NewsManagement';
import { MusicSelection } from './pages/MusicSelection';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans selection:bg-blue-500/30">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/noticias/gestion" element={<NewsManagement />} />
            <Route path="/musica/seleccion" element={<MusicSelection />} />
            {/* Catch all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <GlobalFAB />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
