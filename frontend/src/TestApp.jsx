// frontend/src/TestApp.jsx
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

function TestApp() {
  return (
    <BrowserRouter>
      <div style={{ padding: 20 }}>
        <h1>Test Page</h1>
        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          <Link to="/">Home</Link>
          <Link to="/admin/bank">Bank Admin</Link>
          <Link to="/admin/nadra">NADRA Admin</Link>
        </div>
        
        <Routes>
          <Route path="/" element={<div><h2>Home Page</h2><p>This is the home page</p></div>} />
          <Route path="/admin/bank" element={<div><h2>Bank Admin</h2><p>Bank admin page is working!</p></div>} />
          <Route path="/admin/nadra" element={<div><h2>NADRA Admin</h2><p>NADRA admin page is working!</p></div>} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default TestApp;