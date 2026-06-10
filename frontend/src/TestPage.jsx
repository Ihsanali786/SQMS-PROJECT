// src/TestPage.jsx
import React from 'react';

const TestPage = ({ title }) => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1 style={{ color: 'blue' }}>{title}</h1>
      <p>This page is working!</p>
      <button onClick={() => window.location.href = '/'}>
        Go Back Home
      </button>
    </div>
  );
};

export default TestPage;