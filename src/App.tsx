import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes, useParams } from 'react-router-dom';
import type { ReactNode } from 'react';
import { SmoothScroll } from './animation/SmoothScroll.tsx';
import { RequireAuth } from './auth/RequireAuth.tsx';
import { PageLoading } from './components/StatusViews.tsx';
import { ROUTES } from './routes.ts';
import Main from './pages/Main.tsx';
const Gallery = lazy(() => import('./pages/Gallery.tsx'));
const NewProject = lazy(() => import('./pages/NewProject.tsx'));
const Generating = lazy(() => import('./pages/Generating.tsx'));
const Login = lazy(() => import('./pages/Login.tsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.tsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.tsx'));
const Structure = lazy(() => import('./pages/Structure.tsx'));
const Editor = lazy(() => import('./pages/Editor.tsx'));
const Preview = lazy(() => import('./pages/Preview.tsx'));
const Published = lazy(() => import('./pages/Published.tsx'));
const Feedback = lazy(() => import('./pages/Feedback.tsx'));
const Settings = lazy(() => import('./pages/Settings.tsx'));
const Account = lazy(() => import('./pages/Account.tsx'));
const PublicDemo = lazy(() => import('./pages/PublicDemo.tsx'));
const PublishedSite = lazy(() => import('./pages/PublishedSite.tsx'));
const NotFound = lazy(() => import('./pages/NotFound.tsx'));
const UiKit = lazy(() => import('./pages/UiKit.tsx'));

/** 프로젝트 화면 보호: 로그인 필요. 단 /project/draft/... (로그인 전 초안) 중 allowDraft 화면은 통과 */
function ProjectGuard({ children, allowDraft = false }: { children: ReactNode; allowDraft?: boolean }) {
  const { id } = useParams<{ id: string }>();
  return (
    <RequireAuth allowDraft={allowDraft} draft={id === 'draft'}>
      {children}
    </RequireAuth>
  );
}

function ProjectIndex() {
  const { id = '' } = useParams<{ id: string }>();
  return <Navigate to={ROUTES.editor(id)} replace />;
}

export default function App() {
  return (
    <SmoothScroll>
      <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path={ROUTES.main} element={<Main />} />
        <Route path={ROUTES.gallery} element={<Gallery />} />
        <Route path={ROUTES.newProject} element={<NewProject />} />
        <Route path={ROUTES.generating} element={<Generating />} />
        <Route path={ROUTES.login} element={<Login />} />
        <Route path={ROUTES.resetPassword} element={<ResetPassword />} />
        <Route
          path={ROUTES.dashboard}
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route
          path={ROUTES.account}
          element={
            <RequireAuth>
              <Account />
            </RequireAuth>
          }
        />
        <Route path="/project/:id" element={<ProjectIndex />} />
        <Route
          path="/project/:id/structure"
          element={
            <ProjectGuard allowDraft>
              <Structure />
            </ProjectGuard>
          }
        />
        <Route
          path="/project/:id/editor"
          element={
            <ProjectGuard allowDraft>
              <Editor />
            </ProjectGuard>
          }
        />
        <Route
          path="/project/:id/preview"
          element={
            <ProjectGuard allowDraft>
              <Preview />
            </ProjectGuard>
          }
        />
        <Route
          path="/project/:id/published"
          element={
            <ProjectGuard>
              <Published />
            </ProjectGuard>
          }
        />
        <Route
          path="/project/:id/feedback"
          element={
            <ProjectGuard>
              <Feedback />
            </ProjectGuard>
          }
        />
        <Route
          path="/project/:id/settings"
          element={
            <ProjectGuard>
              <Settings />
            </ProjectGuard>
          }
        />
        <Route path="/demo/:slug" element={<PublicDemo />} />
        <Route path="/p/:slug" element={<PublishedSite />} />
        <Route path="/ui" element={<UiKit />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </SmoothScroll>
  );
}
