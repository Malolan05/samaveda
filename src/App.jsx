import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import Gana from './pages/Gana.jsx';
import Suktas from './pages/Suktas.jsx';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/gana" element={<Gana />} />
        <Route path="/suktas" element={<Suktas />} />
      </Routes>
    </BrowserRouter>
  );
}
