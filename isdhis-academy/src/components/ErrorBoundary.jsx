import { Component } from 'react';

/* Stops a single crash from turning the whole website into a blank page. */
export default class ErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error('[Isdhis] crash:', error, info?.componentStack);
  }
  render() {
    if (!this.state.error) return this.props.children;
    const translate = /removeChild|insertBefore|not a child/i.test(String(this.state.error?.message));
    return (
      <div style={{ minHeight: '70vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ maxWidth: 520 }}>
          <h2 style={{ fontFamily: 'var(--display)', fontSize: 34, fontWeight: 500 }}>Wax khalad ah ayaa dhacay</h2>
          {translate && (
            <p style={{ color: 'var(--gold-hi)' }}>
              Google Translate ayaa sababay. Dami turjumaadda (calaamadda address bar-ka → “Show original”), kadibna reload garee.
            </p>
          )}
          <p style={{ color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--mono)' }}>{String(this.state.error?.message || this.state.error)}</p>
          <button className="btn btn-gold" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    );
  }
}
