import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const CertificatesPage: React.FC = () => {
  const navigate = useNavigate();
  const [showGenerate, setShowGenerate] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [issuingAuthority, setIssuingAuthority] = useState('other');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [previewType, setPreviewType] = useState<'image' | 'pdf' | null>(null);
  const [authenticateEnabled, setAuthenticateEnabled] = useState(false);
  const [authResult, setAuthResult] = useState<any>(null);
  const [generateResult, setGenerateResult] = useState<string>('');

  // Flask backend URL - update this to match your Flask server
  const FLASK_API_URL = 'http://127.0.0.1:5000';

  const handleGenerateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      const response = await fetch(`${FLASK_API_URL}/generate`, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        setGenerateResult('Certificate generated successfully!');
        window.open(`${FLASK_API_URL}/download?file=${data.file_path}`, '_blank');
      } else {
        setGenerateResult(`Error: ${data.error}`);
      }
    } catch (error: any) {
      setGenerateResult(`Error: ${error.message}`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFile(file);
    
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
        setPreviewType('image');
      };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      const pdfUrl = URL.createObjectURL(file);
      setPreviewUrl(pdfUrl);
      setPreviewType('pdf');
    }
    
    setAuthenticateEnabled(true);
  };

  const handleAuthenticate = async () => {
    if (!uploadedFile) {
      alert('No certificate uploaded. Please upload a certificate first.');
      return;
    }

    const formData = new FormData();
    formData.append('file', uploadedFile);

    let url = `${FLASK_API_URL}/upload`;
    if (issuingAuthority === 'udemy') {
      url = `${FLASK_API_URL}/upload_udemy`;
    } else if (issuingAuthority === 'great-learning') {
      url = `${FLASK_API_URL}/upload_great_learning`;
    } else if (issuingAuthority === 'google-education') {
      url = `${FLASK_API_URL}/upload_google_education`;
    }

    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
      });
      
      const data = await response.json();
      setAuthResult(data);
    } catch (error: any) {
      setAuthResult({ error: error.message });
    }
  };

  return (
    <div className="min-h-screen bg-black relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 opacity-70">
        <div className="particles absolute inset-0">
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
          <div className="particle"></div>
        </div>
      </div>

      {/* Header */}
      <header
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(20px) saturate(150%)',
          WebkitBackdropFilter: 'blur(20px) saturate(150%)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
        }}
        className="relative z-20"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            {/* Back Button */}
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-purple-400 hover:text-purple-300 transition-colors group"
            >
              <svg
                className="w-6 h-6 transform group-hover:-translate-x-1 transition-transform"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              <span className="font-semibold">Back to Portal</span>
            </button>
            
            {/* Title */}
            <h1 className="text-3xl font-bold text-purple-400 animate-bounce absolute left-1/2 transform -translate-x-1/2">
              Certificate Authenticator
            </h1>
            
            {/* Spacer for balance */}
            <div className="w-32"></div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Hero Section */}
        <section className="flex flex-col items-center justify-center text-center mt-10">
          <div
            className="p-10 rounded-2xl shadow-lg border border-purple-500 max-w-4xl"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            }}
          >
            <h1 className="text-5xl font-extrabold text-purple-400 mb-4 animate-bounce">
              Welcome to Certificate Authenticator
            </h1>
            <p className="text-lg text-gray-300 mb-6">
              Your one-stop solution for secure digital certificates and authentication.
              We ensure trust, transparency, and security in every step of your journey.
            </p>

            {/* Main Action Buttons */}
            <div className="flex justify-center space-x-4 mt-10">
              <button
                onClick={() => {
                  setShowGenerate(!showGenerate);
                  setShowUploadModal(false);
                }}
                className="bg-green-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
              >
                Generate
              </button>
              <button
                onClick={() => setShowUploadModal(!showUploadModal)}
                className="bg-blue-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105"
              >
                Upload
              </button>
              <button
                onClick={handleAuthenticate}
                disabled={!authenticateEnabled}
                className={`font-bold py-3 px-6 rounded-lg transition-all transform hover:scale-105 ${
                  authenticateEnabled
                    ? 'bg-red-600 hover:bg-purple-700 text-white'
                    : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                }`}
              >
                Authenticate
              </button>
            </div>
          </div>
        </section>

        {/* Certificate Generation Form */}
        {showGenerate && (
          <div
            className="p-6 rounded-2xl shadow-lg border border-purple-500 w-96 mt-6 mx-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            }}
          >
            <h1 className="text-4xl font-bold text-purple-400 animate-bounce text-center mb-4">
              Certificate Generation
            </h1>
            <form onSubmit={handleGenerateSubmit} className="space-y-4 w-full">
              <div>
                <label htmlFor="name" className="text-lg text-gray-300 mb-2 block">
                  Name:
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
              <div>
                <label htmlFor="organization" className="text-lg text-gray-300 mb-2 block">
                  Organization:
                </label>
                <input
                  type="text"
                  id="organization"
                  name="organization"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
              <div>
                <label htmlFor="issue_date" className="text-lg text-gray-300 mb-2 block">
                  Issue Date:
                </label>
                <input
                  type="date"
                  id="issue_date"
                  name="issue_date"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
              <div>
                <label htmlFor="expiry_date" className="text-lg text-gray-300 mb-2 block">
                  Expiry Date:
                </label>
                <input
                  type="date"
                  id="expiry_date"
                  name="expiry_date"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
              <div>
                <label htmlFor="completion_date" className="text-lg text-gray-300 mb-2 block">
                  Completion Date:
                </label>
                <input
                  type="date"
                  id="completion_date"
                  name="completion_date"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
              <div>
                <label htmlFor="issuer" className="text-lg text-gray-300 mb-2 block">
                  Issuer:
                </label>
                <input
                  type="text"
                  id="issuer"
                  name="issuer"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
              <div>
                <label htmlFor="serial_number" className="text-lg text-gray-300 mb-2 block">
                  Serial Number:
                </label>
                <input
                  type="text"
                  id="serial_number"
                  name="serial_number"
                  required
                  className="mt-1 block w-full px-3 py-2 border border-black rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-black"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
              >
                Generate Certificate
              </button>
            </form>
            {generateResult && (
              <div className="mt-4 text-center text-white">{generateResult}</div>
            )}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div
            className="p-6 rounded-2xl shadow-lg border border-purple-500 w-96 mt-6 mx-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            }}
          >
            <h2 className="text-2xl font-bold text-purple-400 animate-bounce mb-4">
              Select Issuing Authority
            </h2>
            <select
              value={issuingAuthority}
              onChange={(e) => setIssuingAuthority(e.target.value)}
              className="block w-full px-3 py-2 border border-purple-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-800 text-gray-200"
            >
              <option value="udemy">Udemy</option>
              <option value="great-learning">Great Learning</option>
              <option value="google-education">Google Education</option>
              <option value="other">Other</option>
            </select>
            <div className="mt-4 flex justify-end w-full space-x-2">
              <button
                onClick={() => setShowUploadModal(false)}
                className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
              <label
                htmlFor="file-upload"
                className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer"
              >
                Confirm & Upload
              </label>
              <input
                id="file-upload"
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          </div>
        )}

        {/* Certificate Preview */}
        {previewUrl && (
          <div
            className="mt-6 p-6 rounded-2xl shadow-lg border border-purple-500 max-w-2xl mx-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            }}
          >
            <h3 className="text-xl font-bold text-purple-400 mb-4 text-center">
              Certificate Preview
            </h3>
            {previewType === 'image' && (
              <img src={previewUrl} alt="Certificate Preview" className="max-w-full h-auto rounded-lg" />
            )}
            {previewType === 'pdf' && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 underline block text-center"
              >
                View PDF Certificate
              </a>
            )}
          </div>
        )}

        {/* Authentication Result */}
        {authResult && (
          <div
            className="p-6 rounded-2xl shadow-lg border w-96 mt-6 mx-auto"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
              borderColor: authResult.message || authResult.certificate_url ? '#22c55e' : '#ef4444',
            }}
          >
            <div className="flex items-start space-x-3 mb-4">
              <div className="text-3xl">
                {authResult.message || authResult.certificate_url ? '✅' : '❌'}
              </div>
              <h1 className={`text-2xl font-bold animate-bounce ${
                authResult.message || authResult.certificate_url ? 'text-green-400' : 'text-red-400'
              }`}>
                {authResult.message || authResult.certificate_url ? 'Certificate Authenticated!' : 'Authentication Failed'}
              </h1>
            </div>
            
            {authResult.message && (
              <p className="text-gray-300 text-center mb-4 text-lg">{authResult.message}</p>
            )}
            
            {authResult.details && (
              <div className="bg-white/5 rounded-lg p-4 mb-4 space-y-2 text-gray-300 text-sm">
                <p><strong className="text-white">Name:</strong> {authResult.details.name}</p>
                <p><strong className="text-white">Organization:</strong> {authResult.details.organization}</p>
                <p><strong className="text-white">Issue Date:</strong> {authResult.details.issue_date}</p>
                <p><strong className="text-white">Expiry Date:</strong> {authResult.details.expiry_date}</p>
                <p><strong className="text-white">Issuer:</strong> {authResult.details.issuer}</p>
              </div>
            )}
            
            {authResult.certificate_url && (
              <a
                href={authResult.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all mt-4"
              >
                🔗 View Certificate URL
              </a>
            )}
            
            {authResult.error && (
              <p className="text-red-300 text-center text-lg">{authResult.error}</p>
            )}
          </div>
        )}

        {/* About Section */}
        <section className="max-w-4xl w-full mt-12 mb-10 mx-auto">
          <h2 className="text-4xl font-bold text-purple-400 text-center mb-8">About</h2>
          <div
            className="p-6 rounded-2xl shadow-lg border border-purple-500"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(20px) saturate(150%)',
              WebkitBackdropFilter: 'blur(20px) saturate(150%)',
            }}
          >
            <p className="text-lg text-gray-300 text-center mb-4">
              Certificate Authenticator is a secure platform for generating and verifying digital certificates.
            </p>
            <p className="text-lg text-gray-300 text-center">
              We support verification of certificates from multiple platforms including Udemy, Great Learning, and Google Education.
            </p>
          </div>
        </section>
      </main>

      <style>{`
        @keyframes float {
          0% {
            transform: translateY(100vh) translateX(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(50px);
            opacity: 0;
          }
        }

        .particles {
          position: absolute;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: -1;
        }

        .particle {
          position: absolute;
          width: 5px;
          height: 5px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 50%;
          animation: float 10s linear infinite;
        }

        .particles .particle:nth-child(1) {
          left: 10%;
          animation-duration: 12s;
          animation-delay: 0s;
        }

        .particles .particle:nth-child(2) {
          left: 30%;
          animation-duration: 8s;
          animation-delay: 2s;
        }

        .particles .particle:nth-child(3) {
          left: 50%;
          animation-duration: 10s;
          animation-delay: 4s;
        }

        .particles .particle:nth-child(4) {
          left: 70%;
          animation-duration: 14s;
          animation-delay: 6s;
        }

        .particles .particle:nth-child(5) {
          left: 90%;
          animation-duration: 9s;
          animation-delay: 8s;
        }
      `}</style>
    </div>
  );
};

export default CertificatesPage;
