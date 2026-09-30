import { lazy, Suspense } from 'react'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/common/Toast'
import { StudentGuard, TeacherGuard } from './components/common/Guards'
import { Spinner } from './components/common/Feedback'
import TeacherLayout from './components/layout/TeacherLayout'
import LandingPage from './pages/LandingPage'
import StudentJoinPage from './pages/StudentJoinPage'
import TeacherLogin from './pages/TeacherLogin'
import NotFound from './pages/NotFound'
import { ROUTER_MODE } from './config'

const LearningHome = lazy(() => import('./pages/LearningHome'))
const SelfStudyCourse = lazy(() => import('./pages/SelfStudyCourse'))
const StudentProfile = lazy(() => import('./pages/StudentProfile'))
const PracticeGames = lazy(() => import('./pages/PracticeGames'))
const MockExam = lazy(() => import('./pages/MockExam'))
const TeacherCourses = lazy(() => import('./pages/TeacherCourses'))
const TeacherCommunity = lazy(() => import('./pages/TeacherCommunity'))
const ManageTeachers = lazy(() => import('./pages/ManageTeachers'))
const TeacherAccessRequest = lazy(() => import('./pages/TeacherAccessRequest'))
const GradeAnalysis = lazy(() => import('./pages/GradeAnalysis'))
const TeacherAccount = lazy(() => import('./pages/TeacherAccount'))
const AboutPortal = lazy(() => import('./pages/AboutPortal'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const PracticeIDE = lazy(() => import('./pages/PracticeIDE'))
const ExamRoom = lazy(() => import('./pages/ExamRoom'))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const ClassManagement = lazy(() => import('./pages/ClassManagement'))
const CreateExam = lazy(() => import('./pages/CreateExam'))
const ExamMonitor = lazy(() => import('./pages/ExamMonitor'))
const Submissions = lazy(() => import('./pages/Submissions'))
const Handouts = lazy(() => import('./pages/Handouts'))
const ExamDates = lazy(() => import('./pages/ExamDates'))

const Router = ROUTER_MODE === 'hash' ? HashRouter : BrowserRouter
const basename = ROUTER_MODE === 'hash' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

const PageLoader = () => <div className="grid min-h-[60vh] place-items-center"><Spinner label="Loading" /></div>

export default function App() {
  return (
    <Router basename={basename}>
      <div className="tech-bg" aria-hidden="true" />
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-dps-green focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <ToastProvider>
        <div id="main">
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route path="/learn" element={<LearningHome />} />
              <Route path="/learn/profile" element={<StudentProfile />} />
              <Route path="/learn/games" element={<PracticeGames />} />
              <Route path="/learn/mock-exam" element={<MockExam />} />
              <Route path="/learn/course/:lang" element={<SelfStudyCourse />} />
              <Route path="/learn/teacher-course/:id" element={<SelfStudyCourse teacherCourse />} />
              <Route path="/about" element={<AboutPortal />} />

              {/* Student */}
              <Route path="/student" element={<Navigate to="/student/join" replace />} />
              <Route path="/student/join" element={<StudentJoinPage />} />
              <Route path="/student/practice" element={<PracticeIDE />} />
              <Route path="/student/practice/:lang" element={<PracticeIDE />} />
              <Route path="/student/dashboard" element={<StudentGuard><StudentDashboard /></StudentGuard>} />
              <Route path="/student/exam/:examId" element={<StudentGuard><ExamRoom /></StudentGuard>} />

              {/* Teacher */}
              <Route path="/teacher/login" element={<TeacherLogin />} />
              <Route path="/teacher/request-access" element={<TeacherAccessRequest />} />
              <Route path="/teacher" element={<TeacherGuard><TeacherLayout /></TeacherGuard>}>
                <Route index element={<Navigate to="/teacher/dashboard" replace />} />
                <Route path="dashboard" element={<TeacherDashboard />} />
                <Route path="classes" element={<ClassManagement />} />
                <Route path="exams/create" element={<CreateExam />} />
                <Route path="exams/:examId/monitor" element={<ExamMonitor />} />
                <Route path="submissions" element={<Submissions />} />
                <Route path="handouts" element={<Handouts />} />
                <Route path="exam-dates" element={<ExamDates />} />
                <Route path="courses" element={<TeacherCourses />} />
                <Route path="community" element={<TeacherCommunity />} />
                <Route path="grades" element={<GradeAnalysis />} />
                <Route path="manage-teachers" element={<ManageTeachers />} />
                <Route path="account" element={<TeacherAccount />} />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </div>
      </ToastProvider>
    </Router>
  )
}
