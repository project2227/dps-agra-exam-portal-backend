import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MotionProvider from '../components/common/Motion';
import { ToastProvider } from '../components/common/Toast';
import PageTransition from '../components/common/PageTransition';
import PageErrorBoundary from '../components/common/PageErrorBoundary';
import Loader from '../components/common/Loader';
import { PlatformProvider } from './Context';
import { PLINTH } from '../config';
import GuidedIntro from './GuidedIntro';
import Marketing from './Marketing';
import Wizard, { Verification } from './Wizard';
import Provisioning from './Provisioning';
import {
  OrgPicker,
  OrgLogin,
  WorkLayout,
  RequireOrg,
  PrivacyPage,
  TenantHome,
} from './Shell';
const Dashboard = lazy(() => import('./WorkDashboard'));
const Sharing = lazy(() => import('./WorkSharing'));
const Tasks = lazy(() => import('./WorkTasks'));
const Chat = lazy(() => import('./Chat'));
const Settings = lazy(() => import('./Settings'));
const Owner = lazy(() => import('./Owner'));
export default function PlatformApp() {
  return (
    <PlatformProvider>
      <MotionProvider>
        <BrowserRouter basename={PLINTH.base || undefined}>
          <ToastProvider>
            <a href="#main" className="p-skip">
              Skip to content
            </a>
            <div className="plinth" id="main">
              <PageErrorBoundary>
                <Suspense fallback={<Loader />}>
                  <PageTransition>
                    <Routes>
                      <Route
                        path="/"
                        element={PLINTH.tenant ? <TenantHome /> : <Marketing />}
                      />
                      <Route path="/create" element={<Wizard />} />
                      <Route path="/verify" element={<Verification />} />
                      <Route
                        path="/provisioning/:slug"
                        element={<Provisioning />}
                      />
                      <Route
                        path="/login"
                        element={PLINTH.tenant ? <OrgLogin /> : <OrgPicker />}
                      />
                      <Route path="/privacy" element={<PrivacyPage />} />
                      <Route path="/owner" element={<Owner />} />
                      <Route
                        element={
                          <RequireOrg>
                            <WorkLayout />
                          </RequireOrg>
                        }
                      >
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/sharing" element={<Sharing />} />
                        <Route
                          path="/monitor"
                          element={<Dashboard monitor />}
                        />
                        <Route path="/tasks" element={<Tasks />} />
                        <Route path="/chat" element={<Chat />} />
                        <Route
                          path="/attendance"
                          element={<Dashboard attendance />}
                        />
                        <Route path="/flags" element={<Dashboard flags />} />
                        <Route path="/teams" element={<Settings teams />} />
                        <Route path="/settings" element={<Settings />} />
                      </Route>
                      <Route
                        path="*"
                        element={
                          <div className="p-empty">
                            <h1>Page not found</h1>
                            <a href={PLINTH.base || '/'}>
                              Go to your home page
                            </a>
                          </div>
                        }
                      />
                    </Routes>
                  </PageTransition>
                </Suspense>
              </PageErrorBoundary>
              <GuidedIntro />
            </div>
          </ToastProvider>
        </BrowserRouter>
      </MotionProvider>
    </PlatformProvider>
  );
}
