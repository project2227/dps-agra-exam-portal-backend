import AccountBootstrap, { LearningSessionGate } from './components/common/AccountBootstrap'
import { lazy, Suspense } from 'react'
import GuidedIntro from './platform/GuidedIntro'
import {PlatformProvider} from './platform/Context'
import {TenantHome,PrivacyPage} from './platform/Shell'
import MotionProvider from './components/common/Motion'
import PageTransition from './components/common/PageTransition'
import Loader from './components/common/Loader'
import PageErrorBoundary from './components/common/PageErrorBoundary'
import ToolFinder from './components/common/ToolFinder'
import RoutePresentation from './components/common/RoutePresentation'
import { BrowserRouter, HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastProvider } from './components/common/Toast'
import { StudentGuard, TeacherGuard, StudentAccountGuard } from './components/common/Guards'
const TeacherLayout = lazy(() => import('./components/layout/TeacherLayout'))
import LandingPage from './pages/ExamLanding'
const StudentJoinPage = lazy(() => import('./pages/StudentJoinPage'))
const TeacherLogin = lazy(() => import('./pages/TeacherLogin'))
import NotFound from './pages/NotFound'
import { ROUTER_MODE,PLINTH } from './config'
const ERP=lazy(()=>import('./platform/ERP'))
const SiteSettings=lazy(()=>import('./platform/Settings'))

const LearningHome = lazy(() => import('./pages/LearningLibrary'))
const SelfStudyCourse = lazy(() => import('./pages/SelfStudyCourse'))
const StudentProfile = lazy(() => import('./pages/StudentProfile'))
const PracticeGames = lazy(() => import('./pages/PracticeGames'))
const MockExam = lazy(() => import('./pages/MockExam'))
const CustomPracticeTest = lazy(() => import('./pages/CustomPracticeTest'))
const ArcadeLabs = lazy(() => import('./pages/ArcadeLabs'))
const TeacherCourses = lazy(() => import('./pages/TeacherCourses'))
const TeacherCommunity = lazy(() => import('./pages/TeacherCommunity'))
const ManageTeachers = lazy(() => import('./pages/ManageTeachers'))
const TeacherAccessRequest = lazy(() => import('./pages/TeacherAccessRequest'))
const GradeAnalysis = lazy(() => import('./pages/GradeAnalysis'))
const TeacherAccount = lazy(() => import('./pages/TeacherAccount'))
const AboutPortal = lazy(() => import('./pages/ExamAboutPortal'))
const StudentAccountLogin = lazy(() => import('./pages/StudentAccountLogin'))
const StudentAccountProfile = lazy(() => import('./pages/StudentAccountProfile'))
const TeacherStudentDetail = lazy(() => import('./pages/TeacherStudentDetail'))
const StudentDashboard = lazy(() => import('./pages/StudentDashboard'))
const PracticeIDE = lazy(() => import('./pages/PracticeIDE'))
const ExamRoom = lazy(() => import('./pages/ExamRoom'))
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'))
const ClassManagement = lazy(() => import('./pages/ClassManagement'))
const CreateExam = lazy(() => import('./pages/CreateExam'))
const ExamMonitor = lazy(() => import('./pages/ExamMonitor'))
const ManageHostedExams = lazy(() => import('./pages/ManageHostedExams'))
const AdminDataManagement = lazy(() => import('./pages/AdminDataManagement'))
const Submissions = lazy(() => import('./pages/Submissions'))
const Handouts = lazy(() => import('./pages/Handouts'))
const ExamDates = lazy(() => import('./pages/ExamDates'))

const Router = ROUTER_MODE === 'hash' ? HashRouter : BrowserRouter
const basename = PLINTH.enabled?PLINTH.base||undefined:ROUTER_MODE === 'hash' ? undefined : import.meta.env.BASE_URL.replace(/\/$/, '') || undefined

const PageLoader = () => <div className="grid min-h-[60vh] place-items-center"><Loader /></div>

export default function App() {
  return (
    <PlatformProvider><MotionProvider><Router basename={basename}>
      <AccountBootstrap />
      <RoutePresentation />
      <div className="tech-bg" aria-hidden="true" />
      <GuidedIntro />
      <ToolFinder />
      <a href="#main" onClick={event => { event.preventDefault(); const content = document.querySelector('#main main') || document.getElementById('main'); content?.setAttribute('tabindex', '-1'); content?.focus() }} className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-dps-green focus:px-4 focus:py-2 focus:text-white">Skip to content</a>
      <ToastProvider>
        <div id="main" className={PLINTH.enabled?'plinth':undefined}><PageTransition>
          <PageErrorBoundary><Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={PLINTH.enabled?<TenantHome/>:<LandingPage/>} />
              <Route path="/privacy" element={<PrivacyPage/>}/>
              {PLINTH.enabled&&<Route path="/school/:kind" element={<ERP/>}/> }

              <Route path="/learn" element={<LearningSessionGate><LearningHome /></LearningSessionGate>} />
              <Route path="/learn/profile" element={<LearningSessionGate><StudentProfile /></LearningSessionGate>} />
              <Route path="/learn/games" element={<LearningSessionGate><PracticeGames /></LearningSessionGate>} />
              <Route path="/learn/mock-exam" element={<LearningSessionGate><MockExam /></LearningSessionGate>} />
              <Route path="/learn/custom-test" element={<LearningSessionGate><CustomPracticeTest /></LearningSessionGate>} />
              <Route path="/learn/arcade" element={<LearningSessionGate><ArcadeLabs /></LearningSessionGate>} />
              <Route path="/learn/course/:lang" element={<LearningSessionGate><SelfStudyCourse /></LearningSessionGate>} />
              <Route path="/learn/teacher-course/:id" element={<LearningSessionGate><SelfStudyCourse teacherCourse /></LearningSessionGate>} />
              <Route path="/about" element={<AboutPortal />} />

              {/* Student */}
              <Route path="/student" element={<Navigate to="/student/join" replace />} />
              <Route path="/student/login" element={<StudentAccountLogin />} />
              <Route path="/student/set-password" element={<StudentAccountGuard><StudentAccountLogin mode="set" /></StudentAccountGuard>} />
              <Route path="/student/forgot-password" element={<StudentAccountLogin mode="forgot" />} />
              <Route path="/student/reset-password" element={<StudentAccountLogin mode="reset" />} />
              <Route path="/student/profile" element={<StudentAccountGuard><StudentAccountProfile /></StudentAccountGuard>} />
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
                <Route path="students/:id" element={<TeacherStudentDetail />} />
                <Route path="exams/create" element={<CreateExam />} />
                <Route path="exams/manage" element={<ManageHostedExams />} />
                <Route path="exams/:examId/monitor" element={<ExamMonitor />} />
                <Route path="submissions" element={<Submissions />} />
                <Route path="handouts" element={<Handouts />} />
                <Route path="exam-dates" element={<ExamDates />} />
                <Route path="courses" element={<TeacherCourses />} />
                <Route path="community" element={<TeacherCommunity />} />
                <Route path="grades" element={<GradeAnalysis />} />
                <Route path="manage-teachers" element={<ManageTeachers />} />
                <Route path="test-data" element={<AdminDataManagement />} />
                <Route path="account" element={<TeacherAccount />} />
                {PLINTH.enabled&&<Route path="site-settings" element={<SiteSettings/>}/>}
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense></PageErrorBoundary>
        </PageTransition></div>
      </ToastProvider>
    </Router></MotionProvider></PlatformProvider>
  )
}

