"use client";
import Link from "next/link";
import { useAuth } from "../../src/lib/useAuth";
import { logout } from "../../src/lib/auth";
export default function DashboardPage() {
    const { user, loading } = useAuth();
    if (loading)
        return <div className="glass"><div className="spinner"/></div>;
    const onLogout = async () => {
        await logout();
    };
    return (<div className="pageWide">
      <div className="glass" style={{ maxWidth: 1100 }}>
        <div className="heroTitle">Welcome to BizBoost AI</div>
        <div className="heroSubtitle">Generate marketing strategies for your small business in minutes.</div>

        <div className="cards" style={{ marginTop: 16 }}>
          <div className="card">
            <div className="cardTitle">Your Projects</div>
            <div className="subtitle">No projects yet</div>
          </div>
          <div className="card">
            <div className="cardTitle">Saved Strategies</div>
            <div className="subtitle">Nothing saved yet</div>
          </div>
          <div className="card">
            <div className="cardTitle">Quick Actions</div>
            <div className="subtitle">Start with a template</div>
          </div>
        </div>

        {!user ? (<div className="card ctaCard">
            <div className="cardTitle">Create your BizBoost account</div>
            <div className="subtitle">Sign up to save strategies, track progress, and unlock personalized recommendations.</div>
            <div className="ctaRow">
              <Link className="btn primary" href="/signup">Create Account</Link>
              <Link className="btn" href="/login">Already have an account? Log in</Link>
            </div>
          </div>) : (<div className="card ctaCard">
            <div className="cardTitle">You're signed in as {user.email}</div>
            <div className="ctaRow">
              <Link className="btn primary" href="#" aria-disabled>Go to Strategy Generator</Link>
              <button className="btn" onClick={onLogout}>Logout</button>
            </div>
            <div style={{ marginTop: 8, fontSize: 13, color: "#cbd5e1" }}>UID: {user.uid}</div>
          </div>)}
      </div>
    </div>);
}
