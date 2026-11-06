import { Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Button, Empty } from './components/ui';
import { CircleQuestionMark } from './components/icons';
import { Dashboard } from './pages/Dashboard';
import { Plan } from './pages/Plan';
import { Learn } from './pages/Learn';
import { Lesson } from './pages/Lesson';
import { DrillRunner, Exam, Practice } from './pages/Practice';
import { Review } from './pages/Review';
import { EquityTool } from './pages/tools/Equity';
import { RangesTool } from './pages/tools/Ranges';
import { BankrollTool, CalculatorsTool, CfrTool, ChartsTool, ToyGamesTool, VarianceTool } from './pages/tools/Labs';
import { Journal } from './pages/Journal';
import { Sessions } from './pages/Sessions';
import { Glossary, Library, Settings } from './pages/Reference';

function NotFound() {
  return (
    <div className="page-inner">
      <Empty icon={CircleQuestionMark} title="Page not found" action={<Button to="/">Go home</Button>} />
    </div>
  );
}

export function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/plan" element={<Plan />} />
        <Route path="/learn" element={<Learn />} />
        <Route path="/learn/:id" element={<Lesson />} />
        <Route path="/practice" element={<Practice />} />
        <Route path="/practice/:id" element={<DrillRunner />} />
        <Route path="/exam/:id" element={<Exam />} />
        <Route path="/review" element={<Review />} />
        <Route path="/tools/equity" element={<EquityTool />} />
        <Route path="/tools/ranges" element={<RangesTool />} />
        <Route path="/tools/charts" element={<ChartsTool />} />
        <Route path="/tools/calculators" element={<CalculatorsTool />} />
        <Route path="/tools/variance" element={<VarianceTool />} />
        <Route path="/tools/bankroll" element={<BankrollTool />} />
        <Route path="/tools/toy-games" element={<ToyGamesTool />} />
        <Route path="/tools/cfr" element={<CfrTool />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/sessions" element={<Sessions />} />
        <Route path="/library" element={<Library />} />
        <Route path="/glossary" element={<Glossary />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
