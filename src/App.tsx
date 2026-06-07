import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import UploadPage from '@/pages/Upload';
import ViewerPage from '@/pages/Viewer';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<UploadPage />} />
        <Route path="/viewer" element={<ViewerPage />} />
      </Routes>
    </Router>
  );
}
