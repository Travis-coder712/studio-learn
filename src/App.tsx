/**
 * Studio Learn — App routes
 *
 * Australian renewable-energy curricula under the Studio brand.
 * The repo is maintained internally — content is authored elsewhere
 * and synced in by the maintainer.
 */
import { Routes, Route } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Home from './pages/Home'
import NotFound from './pages/NotFound'

// Learning modules — all 11, mirrored from AURES
import LearnHub from './pages/learn/LearnHub'
import ModuleStub from './pages/learn/ModuleStub'
import ConstraintsModule from './pages/learn/ConstraintsModule'
import CISLTESAModule from './pages/learn/CISLTESAModule'
import NSWRezTransmissionModule from './pages/learn/NSWRezTransmissionModule'
import BESSStoryModule from './pages/learn/BESSStoryModule'
import EnergyTransitionModule from './pages/learn/EnergyTransitionModule'
import PlanningApprovalsModule from './pages/learn/PlanningApprovalsModule'
import AemoConnectionsModule from './pages/learn/AemoConnectionsModule'
import PpasModule from './pages/learn/PpasModule'
import ProjectFinancingModule from './pages/learn/ProjectFinancingModule'
import SummingItUpModule from './pages/learn/SummingItUpModule'
import ValuingProjectsModule from './pages/learn/ValuingProjectsModule'

function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route path="learn" element={<LearnHub />} />

        <Route path="learn/constraints" element={<ConstraintsModule />} />
        <Route path="learn/constraints/:lessonId" element={<ConstraintsModule />} />
        <Route path="learn/cis-ltesa-bidding" element={<CISLTESAModule />} />
        <Route path="learn/cis-ltesa-bidding/:lessonId" element={<CISLTESAModule />} />
        <Route path="learn/nsw-rez" element={<NSWRezTransmissionModule />} />
        <Route path="learn/nsw-rez/:lessonId" element={<NSWRezTransmissionModule />} />
        <Route path="learn/bess-story" element={<BESSStoryModule />} />
        <Route path="learn/bess-story/:lessonId" element={<BESSStoryModule />} />
        <Route path="learn/energy-transition" element={<EnergyTransitionModule />} />
        <Route path="learn/energy-transition/:lessonId" element={<EnergyTransitionModule />} />
        <Route path="learn/planning-approvals" element={<PlanningApprovalsModule />} />
        <Route path="learn/planning-approvals/:lessonId" element={<PlanningApprovalsModule />} />
        <Route path="learn/aemo-connections" element={<AemoConnectionsModule />} />
        <Route path="learn/aemo-connections/:lessonId" element={<AemoConnectionsModule />} />
        <Route path="learn/ppas" element={<PpasModule />} />
        <Route path="learn/ppas/:lessonId" element={<PpasModule />} />
        <Route path="learn/project-financing" element={<ProjectFinancingModule />} />
        <Route path="learn/project-financing/:lessonId" element={<ProjectFinancingModule />} />
        <Route path="learn/summing-it-up" element={<SummingItUpModule />} />
        <Route path="learn/summing-it-up/:lessonId" element={<SummingItUpModule />} />
        <Route path="learn/valuing-projects" element={<ValuingProjectsModule />} />
        <Route path="learn/valuing-projects/:lessonId" element={<ValuingProjectsModule />} />
        <Route path="learn/:moduleId" element={<ModuleStub />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App
