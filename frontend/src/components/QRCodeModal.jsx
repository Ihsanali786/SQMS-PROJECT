// src/components/QRCodeModal.jsx
import { QRCodeSVG } from 'qrcode.react';

const QRCodeModal = ({ token, onClose }) => {
  const tokenData = JSON.stringify({
    tokenNumber: token.number,
    service: token.service,
    branch: token.branch,
    date: token.date,
    time: token.time
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-white">Your Token QR Code</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl">&times;</button>
        </div>
        
        <div className="flex flex-col items-center space-y-4">
          <div className="bg-white p-4 rounded-lg">
            <QRCodeSVG value={tokenData} size={200} />
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{token.number}</p>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">{token.service}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{token.branch}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{token.date} at {token.time}</p>
          </div>
          <button 
            onClick={() => window.print()}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
          >
            Print Token
          </button>
        </div>
      </div>
    </div>
  );
};

export default QRCodeModal;