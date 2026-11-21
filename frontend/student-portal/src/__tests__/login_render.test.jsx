import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider } from '../hooks/useAuth';
import Login from '../pages/Login';

describe('Student Login Component Rendering', () => {
  it('renders Login page without throwing runtime errors', () => {
    const html = renderToString(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    expect(html).toContain('Student Sign In');
    expect(html).toContain('Sign in as Student');
    expect(html).toContain('Your opportunities');
    expect(html).toContain('STUDENT AVAILABILITY PORTAL');
  });
});
