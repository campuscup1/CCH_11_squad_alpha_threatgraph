import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Button, Card, EmptyState, PageIntro } from './components/ui';
import Overview from './pages/Overview';
import Ingestion from './pages/Ingestion';
import AttackGraph from './pages/AttackGraph';
import Timeline from './pages/Timeline';
import Alerts from './pages/Alerts';
import Investigation from './pages/Investigation';

function NotFound() {
  return (
    <div className="page-stack">
      <PageIntro
        description="The requested page is not part of the ThreatGraph console."
        eyebrow="404"
        title="Page Not Found"
      />
      <Card>
        <EmptyState
          description="Use the sidebar to return to an available section."
          icon="investigation"
          title="Nothing to show here"
          action={
            <Button as="link" icon="overview" to="/" variant="primary">
              Return to overview
            </Button>
          }
        />
      </Card>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Overview />} />
        <Route path="ingestion" element={<Ingestion />} />
        <Route path="graph" element={<AttackGraph />} />
        <Route path="timeline" element={<Timeline />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="investigation" element={<Investigation />} />
        <Route path="investigation/:alertId" element={<Investigation />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
