import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:3000";

function App() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem("token");
    if (saved) {
      setToken(saved);
      fetchMe(saved);
    }
  }, []);

  async function login(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `Login failed: ${res.status}`);
      }
      const data = await res.json();
      const hdr = res.headers.get("x-auth-token") || data.token;
      setToken(hdr);
      localStorage.setItem("token", hdr);
      setUser(data.user);
    } catch (err: any) {
      setError(err.message || "Login error");
    }
  }

  async function fetchMe(tok: string) {
    const res = await fetch(`${API_BASE}/auth/me`, { headers: { "x-auth-token": tok } });
    if (res.ok) {
      setUser(await res.json());
    }
  }

  function logout() {
    if (token) {
      fetch(`${API_BASE}/auth/logout`, { method: "POST", headers: { "x-auth-token": token } });
    }
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
  }

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <h1>Home Assistant Test</h1>

      {!token ? (
        <form onSubmit={login} className="card">
          <div>
            <label>Username or Email</label>
            <input value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </div>
          <div>
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          <button type="submit">Login</button>
          {error && <div style={{ color: "red" }}>{error}</div>}
        </form>
      ) : (
        <div className="card">
          <div>Logged in as: {user ? user.username || user.email : ""}</div>
          <button onClick={logout}>Logout</button>
        </div>
      )}

      <p className="read-the-docs">This UI is intentionally simple.</p>
    </>
  );
}

export default App;
