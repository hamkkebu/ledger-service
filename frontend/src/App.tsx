import React, { useState, useEffect, useRef } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useKeycloak } from '@/composables/useKeycloak';
import { useAuth } from '@/composables/useAuth';
import LedgerCreate from '@/components/views/LedgerCreate';
import Dashboard from '@/components/views/Dashboard';
import LedgerDetail from '@/components/views/LedgerDetail';
import CategoryManagement from '@/components/views/CategoryManagement';

export default function App() {
  const keycloak = useKeycloak();
  const { isAuthenticated, login } = useAuth();
  const [authReady, setAuthReady] = useState(keycloak.isInitialized);
  const initStarted = useRef(false);

  useEffect(() => {
    if (keycloak.isInitialized) {
      setAuthReady(true);
      return;
    }

    if (initStarted.current) return;
    initStarted.current = true;

    const initKeycloak = async () => {
      try {
        await keycloak.init();
      } catch (error) {
        console.error('Keycloak init failed:', error);
      } finally {
        setAuthReady(true);
      }
    };

    initKeycloak();
  }, []);

  useEffect(() => {
    if (keycloak.isInitialized) {
      setAuthReady(true);
    }
  }, [keycloak.isInitialized]);

  if (!authReady) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px', color: '#666' }}>
        인증 확인 중...
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        minHeight: '60vh', padding: '2rem',
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.7)', backdropFilter: 'blur(12px)',
          border: '1px solid rgba(148, 163, 184, 0.2)', borderRadius: '14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)', padding: '3rem',
          textAlign: 'center', maxWidth: '500px', width: '100%',
        }}>
          <h2 style={{ color: '#1a1a2e', margin: '0 0 0.75rem 0', fontSize: '1.5rem' }}>
            로그인이 필요합니다
          </h2>
          <p style={{ color: '#64748b', margin: '0 0 1.5rem 0' }}>
            가계부를 확인하려면 먼저 로그인해주세요.
          </p>
          <button
            onClick={() => login(window.location.href)}
            style={{
              padding: '0.75rem 2rem', background: 'linear-gradient(135deg, #7c3aed, #6366f1)',
              color: '#fff', border: 'none', borderRadius: '10px', fontSize: '1rem',
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            로그인하러 가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div id="ledger-app">
      <Routes>
        <Route index element={<Dashboard />} />
        <Route path="create" element={<LedgerCreate />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="ledger/:id">
          <Route index element={<LedgerDetail />} />
          <Route path="categories" element={<CategoryManagement />} />
        </Route>
      </Routes>
    </div>
  );
}
