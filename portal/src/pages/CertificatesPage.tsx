import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  DocumentCheckIcon,
  ArrowUpTrayIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentTextIcon,
  LinkIcon,
} from '@heroicons/react/24/outline';
import { ShieldCheckIcon as ShieldCheckSolid } from '@heroicons/react/24/solid';

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

  const FLASK_API_URL = import.meta.env.VITE_FLASK_API_URL || 'http://127.0.0.1:5000';

  const handleGenerateSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    try {
      const response = await fetch(`${FLASK_API_URL}/generate`, { method: 'POST', body: formData });
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
      reader.onload = (e) => { setPreviewUrl(e.target?.result as string); setPreviewType('image'); };
      reader.readAsDataURL(file);
    } else if (file.type === 'application/pdf') {
      setPreviewUrl(URL.createObjectURL(file));
      setPreviewType('pdf');
    }
    setAuthenticateEnabled(true);
  };

  const handleAuthenticate = async () => {
    if (!uploadedFile) { alert('No certificate uploaded. Please upload a certificate first.'); return; }
    const formData = new FormData();
    formData.append('file', uploadedFile);
    let url = `${FLASK_API_URL}/upload`;
    if (issuingAuthority === 'udemy') url = `${FLASK_API_URL}/upload_udemy`;
    else if (issuingAuthority === 'great-learning') url = `${FLASK_API_URL}/upload_great_learning`;
    else if (issuingAuthority === 'google-education') url = `${FLASK_API_URL}/upload_google_education`;
    try {
      const response = await fetch(url, { method: 'POST', body: formData });
      const data = await response.json();
      setAuthResult(data);
    } catch (error: any) {
      setAuthResult({ error: error.message });
    }
  };

  const isSuccess = authResult && (authResult.message || authResult.certificate_url);

  return (
    <div style={{ minHeight: '100vh', background: '#050505', fontFamily: 'var(--font-sans)' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
      `}</style>

      {/* Header */}
      <div style={{
        height: 54,
        background: 'rgba(255,255,255,0.02)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backdropFilter: 'blur(16px)',
      }}>
        <button
          onClick={() => navigate('/')}
          style={{
            display: 'flex', alignItems: 'center', gap: 7,
            background: 'none', border: 'none', color: '#94a3b8', fontSize: 13, fontWeight: 500, cursor: 'pointer',
            padding: '5px 0',
          }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#f1f5f9'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#94a3b8'}
        >
          <ArrowLeftIcon style={{ width: 14, height: 14 }} />
          Back to Portal
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <DocumentCheckIcon style={{ width: 16, height: 16, color: '#60a5fa' }} />
          <span style={{ color: '#f8fafc', fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Certificate Authenticator</span>
        </div>
        <div style={{ width: 120 }} />
      </div>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '48px 24px' }}>

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: 48, animation: 'fadeUp 0.4s ease both' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(37,99,235,0.1)',
            border: '1px solid rgba(37,99,235,0.22)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <DocumentCheckIcon style={{ width: 26, height: 26, color: '#60a5fa' }} />
          </div>
          <h1 style={{ color: '#f8fafc', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', margin: '0 0 10px' }}>
            Certificate Authenticator
          </h1>
          <p style={{ color: '#64748b', fontSize: 14, lineHeight: 1.7, maxWidth: 480, margin: '0 auto 32px' }}>
            Secure digital certificate generation and verification. Supports Udemy, Great Learning, Google Education and more.
          </p>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              onClick={() => { setShowGenerate(!showGenerate); setShowUploadModal(false); }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px',
                background: showGenerate ? 'rgba(5,150,105,0.15)' : 'rgba(5,150,105,0.08)',
                border: `1px solid ${showGenerate ? 'rgba(5,150,105,0.35)' : 'rgba(5,150,105,0.2)'}`,
                borderRadius: 10,
                color: '#34d399',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <DocumentTextIcon style={{ width: 15, height: 15 }} />
              Generate
            </button>
            <button
              onClick={() => setShowUploadModal(!showUploadModal)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px',
                background: showUploadModal ? 'rgba(37,99,235,0.15)' : 'rgba(37,99,235,0.08)',
                border: `1px solid ${showUploadModal ? 'rgba(37,99,235,0.35)' : 'rgba(37,99,235,0.2)'}`,
                borderRadius: 10,
                color: '#60a5fa',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <ArrowUpTrayIcon style={{ width: 15, height: 15 }} />
              Upload
            </button>
            <button
              onClick={handleAuthenticate}
              disabled={!authenticateEnabled}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '10px 20px',
                background: authenticateEnabled ? 'rgba(37,99,235,0.9)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${authenticateEnabled ? 'transparent' : 'rgba(255,255,255,0.08)'}`,
                borderRadius: 10,
                color: authenticateEnabled ? '#fff' : '#334155',
                fontSize: 13,
                fontWeight: 600,
                cursor: authenticateEnabled ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
              }}
            >
              <ShieldCheckIcon style={{ width: 15, height: 15 }} />
              Authenticate
            </button>
          </div>
        </div>

        {/* Certificate Generation Form */}
        {showGenerate && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '28px',
            marginBottom: 24,
            animation: 'fadeIn 0.3s ease both',
            maxWidth: 480,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h2 style={{ color: '#f8fafc', fontSize: 16, fontWeight: 700, letterSpacing: '-0.01em', margin: '0 0 20px' }}>
              Certificate Generation
            </h2>
            <form onSubmit={handleGenerateSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { id: 'name', label: 'Name', type: 'text', placeholder: 'Full name' },
                { id: 'organization', label: 'Organization', type: 'text', placeholder: 'Organization name' },
                { id: 'issue_date', label: 'Issue Date', type: 'date', placeholder: '' },
                { id: 'expiry_date', label: 'Expiry Date', type: 'date', placeholder: '' },
                { id: 'completion_date', label: 'Completion Date', type: 'date', placeholder: '' },
                { id: 'issuer', label: 'Issuer', type: 'text', placeholder: 'Issuing authority' },
                { id: 'serial_number', label: 'Serial Number', type: 'text', placeholder: 'Certificate serial' },
              ].map(({ id, label, type, placeholder }) => (
                <div key={id}>
                  <label htmlFor={id} style={{ display: 'block', color: '#64748b', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                    {label}
                  </label>
                  <input type={type} id={id} name={id} required placeholder={placeholder} className="input-field" />
                </div>
              ))}
              <button type="submit" className="btn-primary" style={{ marginTop: 4, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <DocumentCheckIcon style={{ width: 15, height: 15 }} />
                Generate Certificate
              </button>
            </form>
            {generateResult && (
              <div style={{
                marginTop: 14,
                padding: '10px 14px',
                background: generateResult.startsWith('Error') ? 'rgba(220,38,38,0.08)' : 'rgba(5,150,105,0.08)',
                border: `1px solid ${generateResult.startsWith('Error') ? 'rgba(220,38,38,0.2)' : 'rgba(5,150,105,0.2)'}`,
                borderRadius: 8,
                color: generateResult.startsWith('Error') ? '#f87171' : '#34d399',
                fontSize: 13,
                textAlign: 'center',
              }}>
                {generateResult}
              </div>
            )}
          </div>
        )}

        {/* Upload Modal */}
        {showUploadModal && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 24,
            animation: 'fadeIn 0.3s ease both',
            maxWidth: 420,
            marginLeft: 'auto',
            marginRight: 'auto',
          }}>
            <h2 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700, margin: '0 0 16px' }}>Select Issuing Authority</h2>
            <select
              value={issuingAuthority}
              onChange={(e) => setIssuingAuthority(e.target.value)}
              className="input-field"
              style={{ marginBottom: 16 }}
            >
              <option value="udemy">Udemy</option>
              <option value="great-learning">Great Learning</option>
              <option value="google-education">Google Education</option>
              <option value="other">Other</option>
            </select>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                onClick={() => setShowUploadModal(false)}
                className="btn-secondary"
                style={{ padding: '8px 16px', fontSize: 13 }}
              >
                Cancel
              </button>
              <label
                htmlFor="file-upload"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 7,
                  padding: '8px 16px',
                  background: '#2563eb',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                <ArrowUpTrayIcon style={{ width: 14, height: 14 }} />
                Confirm & Upload
              </label>
              <input id="file-upload" type="file" accept="image/*,application/pdf" onChange={handleFileUpload} style={{ display: 'none' }} />
            </div>
          </div>
        )}

        {/* Certificate Preview */}
        {previewUrl && (
          <div style={{
            background: 'rgba(255,255,255,0.02)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 16,
            padding: '24px',
            marginBottom: 24,
            maxWidth: 640,
            marginLeft: 'auto',
            marginRight: 'auto',
            animation: 'fadeIn 0.3s ease both',
          }}>
            <h3 style={{ color: '#f8fafc', fontSize: 14, fontWeight: 700, margin: '0 0 16px', textAlign: 'center' }}>Certificate Preview</h3>
            {previewType === 'image' && (
              <img src={previewUrl} alt="Certificate Preview" style={{ maxWidth: '100%', height: 'auto', borderRadius: 10, display: 'block' }} />
            )}
            {previewType === 'pdf' && (
              <a href={previewUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#60a5fa', fontSize: 13 }}>
                <LinkIcon style={{ width: 14, height: 14 }} />
                View PDF Certificate
              </a>
            )}
          </div>
        )}

        {/* Authentication Result */}
        {authResult && (
          <div style={{
            background: isSuccess ? 'rgba(5,150,105,0.06)' : 'rgba(220,38,38,0.06)',
            border: `1px solid ${isSuccess ? 'rgba(5,150,105,0.25)' : 'rgba(220,38,38,0.25)'}`,
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 24,
            maxWidth: 440,
            marginLeft: 'auto',
            marginRight: 'auto',
            animation: 'fadeIn 0.3s ease both',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              {isSuccess
                ? <ShieldCheckSolid style={{ width: 22, height: 22, color: '#34d399', flexShrink: 0 }} />
                : <XCircleIcon style={{ width: 22, height: 22, color: '#f87171', flexShrink: 0 }} />}
              <h3 style={{ color: isSuccess ? '#34d399' : '#f87171', fontSize: 15, fontWeight: 700, margin: 0 }}>
                {isSuccess ? 'Certificate Authenticated!' : 'Authentication Failed'}
              </h3>
            </div>

            {authResult.message && (
              <p style={{ color: '#94a3b8', fontSize: 13, lineHeight: 1.6, margin: '0 0 14px' }}>{authResult.message}</p>
            )}

            {authResult.details && (
              <div style={{
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                padding: '12px 16px',
                marginBottom: 14,
                display: 'flex',
                flexDirection: 'column',
                gap: 7,
              }}>
                {[
                  { label: 'Name', value: authResult.details.name },
                  { label: 'Organization', value: authResult.details.organization },
                  { label: 'Issue Date', value: authResult.details.issue_date },
                  { label: 'Expiry Date', value: authResult.details.expiry_date },
                  { label: 'Issuer', value: authResult.details.issuer },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                    <span style={{ color: '#475569', fontSize: 12 }}>{label}</span>
                    <span style={{ color: '#f1f5f9', fontSize: 12, fontWeight: 500 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {authResult.certificate_url && (
              <a
                href={authResult.certificate_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                  padding: '10px',
                  background: 'rgba(37,99,235,0.9)',
                  borderRadius: 10,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  textDecoration: 'none',
                }}
              >
                <LinkIcon style={{ width: 14, height: 14 }} />
                View Certificate URL
              </a>
            )}

            {authResult.error && (
              <p style={{ color: '#fca5a5', fontSize: 13, textAlign: 'center', margin: 0 }}>{authResult.error}</p>
            )}
          </div>
        )}

        {/* About */}
        <div style={{
          background: 'rgba(255,255,255,0.02)',
          border: '1px solid rgba(255,255,255,0.07)',
          borderRadius: 16,
          padding: '28px',
          marginTop: 24,
          textAlign: 'center',
        }}>
          <h2 style={{ color: '#f8fafc', fontSize: 15, fontWeight: 700, margin: '0 0 12px' }}>About</h2>
          <p style={{ color: '#64748b', fontSize: 13, lineHeight: 1.7, margin: '0 0 8px' }}>
            Certificate Authenticator is a secure platform for generating and verifying digital certificates.
          </p>
          <p style={{ color: '#475569', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            Supports verification from Udemy, Great Learning, and Google Education.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CertificatesPage;
