import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/navbar/Navbar';
import { Footer } from './components/layout/Footer';
import { Toaster } from './components/common/Toaster';
import { HomePage } from './pages/HomePage';
import { AboutPage } from './pages/AboutPage';
import { LeadershipPage } from './pages/LeadershipPage';
import { ProjectsPage } from './pages/ProjectsPage';
import { GalleryPage } from './pages/GalleryPage';
import { NewsEventsPage } from './pages/NewsEventsPage';
import { ContactPage } from './pages/ContactPage';
import { MembersPage } from './pages/MembersPage';
import { ContributionsPage } from './pages/ContributionsPage';
import { TermsPage } from './pages/TermsPage';
import { MeetingsPage } from './pages/MeetingsPage';
import { SecretaryPortal } from './pages/SecretaryPortal';
import { TreasurerPortal } from './pages/TreasurerPortal';
import { RegisterPage } from './pages/auth/RegisterPage';
import { LoginPage } from './pages/auth/LoginPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { MemberDashboard } from './pages/dashboard/MemberDashboard';
import { AdminDashboard } from './pages/dashboard/AdminDashboard';
import { AuthProvider } from './contexts/AuthContext';
import { RequireAuth, RequireAdmin, RequireRole } from './utils/auth';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground">
          <Navbar />
          <main>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<HomePage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/leadership" element={<LeadershipPage />} />
              <Route path="/projects" element={<ProjectsPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/news-events" element={<NewsEventsPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/members" element={<MembersPage />} />
              <Route path="/contributions" element={<ContributionsPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route
                path="/meetings"
                element={
                  <RequireAuth>
                    <MeetingsPage />
                  </RequireAuth>
                }
              />

              {/* Auth routes */}
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />

              {/* Protected routes */}
              <Route
                path="/member-dashboard"
                element={
                  <RequireAuth>
                    <MemberDashboard />
                  </RequireAuth>
                }
              />
              <Route
                path="/admin-dashboard"
                element={
                  <RequireAuth>
                    <RequireAdmin>
                      <AdminDashboard />
                    </RequireAdmin>
                  </RequireAuth>
                }
              />
              <Route
                path="/secretary-portal"
                element={
                  <RequireAuth>
                    <RequireRole allow={['secretary']}>
                      <SecretaryPortal />
                    </RequireRole>
                  </RequireAuth>
                }
              />
              <Route
                path="/treasurer-portal"
                element={
                  <RequireAuth>
                    <RequireRole allow={['treasurer']}>
                      <TreasurerPortal />
                    </RequireRole>
                  </RequireAuth>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
          <Toaster />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
