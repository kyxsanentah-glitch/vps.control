'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal, Server, Trash2, RotateCw, Power, Copy, LogOut, Cpu, Activity, MapPin, Save, ShieldAlert } from 'lucide-react';

// --- DATA LENGKAP (SAMA PERSIS DENGAN PYTHON) ---
const REGIONS = [
  { name: "🇸🇬 Singapore (SGP1)", slug: "sgp1" },
  { name: "🇺🇸 New York 1 (NYC1)", slug: "nyc1" },
  { name: "🇺🇸 New York 3 (NYC3)", slug: "nyc3" },
  { name: "🇺🇸 San Francisco 3 (SFO3)", slug: "sfo3" },
  { name: "🇳🇱 Amsterdam 3 (AMS3)", slug: "ams3" },
  { name: "🇬🇧 London 1 (LON1)", slug: "lon1" },
  { name: "🇩🇪 Frankfurt 1 (FRA1)", slug: "fra1" },
  { name: "🇨🇦 Toronto 1 (TOR1)", slug: "tor1" },
  { name: "🇮🇳 Bangalore 1 (BLR1)", slug: "blr1" },
  { name: "🇦🇺 Sydney 1 (SYD1)", slug: "syd1" },
];

const SIZES = [
  { name: "🔥 AMD 1 GB / 1 vCPU", slug: "s-1vcpu-1gb-amd" },
  { name: "🔥 AMD 2 GB / 1 vCPU", slug: "s-1vcpu-2gb-amd" },
  { name: "🔥 AMD 2 GB / 2 vCPU", slug: "s-2vcpu-2gb-amd" },
  { name: "🔥 AMD 4 GB / 2 vCPU", slug: "s-2vcpu-4gb-amd" },
  { name: "🔥 AMD 8 GB / 2 vCPU", slug: "s-2vcpu-8gb-amd" },
  { name: "🔥 AMD 8 GB / 4 vCPU", slug: "s-4vcpu-8gb-amd" },
  { name: "🔥 AMD 16 GB / 4 vCPU", slug: "s-4vcpu-16gb-amd" },
  { name: "🔥 AMD 16 GB / 8 vCPU", slug: "s-8vcpu-16gb-amd" },
];

const IMAGES = [
  { name: "Ubuntu 22.04 LTS", slug: "ubuntu-22-04-x64" },
  { name: "Ubuntu 20.04 LTS", slug: "ubuntu-20-04-x64" },
  { name: "Debian 11", slug: "debian-11-x64" },
  { name: "CentOS Stream 9", slug: "centos-stream-9-x64" },
];

export default function Home() {
  const [token, setToken] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  
  const [hostName, setHostName] = useState('kyxzan-server');
  const [region, setRegion] = useState(REGIONS[0].slug);
  const [size, setSize] = useState(SIZES[0].slug);
  const [image, setImage] = useState(IMAGES[0].slug);
  const [loading, setLoading] = useState(false);
  const [deployResult, setDeployResult] = useState<any>(null);
  const [droplets, setDroplets] = useState<any[]>([]);
  const [rebuildImg, setRebuildImg] = useState<{ [key: number]: string }>({});

  useEffect(() => {
    const savedToken = localStorage.getItem('do_token');
    if (savedToken) { setToken(savedToken); setIsLogin(true); }
  }, []);

  const handleLogin = () => {
    if (!token) return alert("Token kosong!");
    localStorage.setItem('do_token', token);
    setIsLogin(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('do_token');
    setToken('');
    setIsLogin(false);
  };

  const callDO = async (endpoint: string, method: string = 'GET', data: any = null) => {
    try {
      const res = await axios.post('/api/do', { token, endpoint, method, data });
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'API Error');
    }
  };

  const generatePass = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
    let suffix = '';
    for (let i = 0; i < 6; i++) {
      suffix += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `Kyxzan${suffix}`;
  };

  const handleDeploy = async () => {
    setLoading(true);
    setDeployResult(null);
    try {
      const password = generatePass();
      const userData = `#cloud-config
chpasswd:
  list: |
    root:${password}
  expire: False
ssh_pwauth: True`;

      const res = await callDO('/droplets', 'POST', {
        name: hostName,
        region: region,
        size: size,
        image: image,
        user_data: userData,
        backups: false
      });

      const dropletId = res.droplet.id;
      let ip = null;
      // Polling IP Address
      for (let i = 0; i < 20; i++) {
        await new Promise(r => setTimeout(r, 3000));
        const check = await callDO(`/droplets/${dropletId}`);
        if (check.droplet.networks.v4.length > 0) {
          ip = check.droplet.networks.v4[0].ip_address;
          break;
        }
      }
      setDeployResult({ ip: ip || "Wait...", password, name: hostName });
    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchDroplets = async () => {
    try {
      const res = await callDO('/droplets');
      setDroplets(res.droplets);
    } catch (err) { alert("Gagal ambil data"); }
  };

  const handleAction = async (id: number, type: string, payload: any = null) => {
    if (!confirm(`Confirm ${type}?`)) return;
    try {
      if (type === 'delete') {
        await callDO(`/droplets/${id}`, 'DELETE');
        setDroplets(prev => prev.filter(d => d.id !== id));
      } else if (type === 'rebuild') {
        await callDO(`/droplets/${id}/actions`, 'POST', { type: 'rebuild', image: payload });
      } else {
        await callDO(`/droplets/${id}/actions`, 'POST', { type });
      }
      alert(`Success: ${type}`);
    } catch (err: any) { alert("Error: " + err.message); }
  };

  if (!isLogin) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="glass-panel p-8 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-blue-600"></div>
          <div className="flex justify-center mb-6">
            <div className="bg-cyan-900/50 p-4 rounded-full border border-cyan-500/30">
              <Terminal size={40} className="text-cyan-400 animate-pulse" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-center text-white mb-2">Kyxzan Controller</h1>
          <p className="text-gray-400 text-center text-sm mb-8">Secure VPS Management System</p>
          
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-cyan-500 uppercase tracking-wider ml-1">DigitalOcean API Token</label>
              <input 
                type="password" 
                placeholder="Paste your token here..." 
                className="w-full bg-gray-900/50 border border-gray-700 text-white p-3 rounded-lg mt-1 focus:outline-none transition-all"
                value={token}
                onChange={e => setToken(e.target.value)}
              />
            </div>
            <button onClick={handleLogin} className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3 rounded-lg shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2">
              <Save size={18} /> ACCESS PANEL
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        {/* HEADER */}
        <div className="glass-panel p-4 rounded-xl mb-6 flex justify-between items-center shadow-lg">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 p-2 rounded-lg border border-cyan-500/20">
              <Activity className="text-cyan-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white tracking-tight">Kyxzan Panel</h1>
              <p className="text-xs text-cyan-500 font-mono">STATUS: ONLINE</p>
            </div>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 text-sm text-red-400 hover:text-red-300 bg-red-900/10 hover:bg-red-900/20 px-4 py-2 rounded-lg border border-red-900/30 transition">
            <LogOut size={16} /> Logout
          </button>
        </div>

        {/* NAVIGATION */}
        <div className="flex gap-2 mb-6">
          <button 
            onClick={() => setActiveTab('create')} 
            className={`flex-1 py-3 rounded-xl font-bold transition-all border ${activeTab === 'create' ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.1)]' : 'bg-gray-800/40 border-gray-700 text-gray-500 hover:bg-gray-800'}`}
          >
            🚀 NEW DEPLOY
          </button>
          <button 
            onClick={() => { setActiveTab('list'); fetchDroplets(); }} 
            className={`flex-1 py-3 rounded-xl font-bold transition-all border ${activeTab === 'list' ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.1)]' : 'bg-gray-800/40 border-gray-700 text-gray-500 hover:bg-gray-800'}`}
          >
            📋 SERVER LIST
          </button>
        </div>

        {/* CREATE TAB */}
        {activeTab === 'create' && (
          <div className="glass-panel p-6 rounded-2xl border border-gray-800 animate-in fade-in zoom-in duration-300">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-2"><Terminal size={16}/> Hostname</label>
                  <input value={hostName} onChange={e => setHostName(e.target.value)} className="w-full bg-gray-900/80 border border-gray-700 rounded-lg p-3 text-white focus:outline-none" />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-2"><MapPin size={16}/> Location</label>
                  <select value={region} onChange={e => setRegion(e.target.value)} className="w-full bg-gray-900/80 border border-gray-700 rounded-lg p-3 text-white focus:outline-none">
                    {REGIONS.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-2"><Server size={16}/> OS Image</label>
                  <select value={image} onChange={e => setImage(e.target.value)} className="w-full bg-gray-900/80 border border-gray-700 rounded-lg p-3 text-white focus:outline-none">
                    {IMAGES.map(i => <option key={i.slug} value={i.slug}>{i.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-gray-300 mb-2"><Cpu size={16}/> Specs (AMD NVMe)</label>
                  <select value={size} onChange={e => setSize(e.target.value)} className="w-full bg-gray-900/80 border border-gray-700 rounded-lg p-3 text-white focus:outline-none">
                    {SIZES.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-700">
              <button 
                onClick={handleDeploy} 
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-4 rounded-xl font-bold text-white text-lg shadow-xl shadow-cyan-900/20 transition-all transform hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "INITIALIZING SEQUENCE..." : "⚡ DEPLOY SYSTEM"}
              </button>
            </div>

            {deployResult && (
              <div className="mt-6 bg-gray-900 border border-green-500/50 p-6 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 bg-green-500 text-black font-bold text-xs rounded-bl-lg">SUCCESS</div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider">IP ADDRESS</p>
                    <p className="text-2xl font-mono text-green-400 font-bold">{deployResult.ip}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider">ROOT PASSWORD</p>
                    <div className="flex items-center gap-2">
                      <p className="text-xl font-mono text-yellow-400 bg-black/50 px-2 rounded border border-gray-700">{deployResult.password}</p>
                      <button onClick={() => navigator.clipboard.writeText(deployResult.password)} className="text-gray-400 hover:text-white"><Copy size={18}/></button>
                    </div>
                  </div>
                </div>
                <div className="mt-4 bg-black/30 p-3 rounded font-mono text-xs text-gray-400">
                    <p># Login via Termius / SSH:</p>
                    <p className="text-green-300">ssh root@{deployResult.ip}</p>
                    <p>PORT: 22</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* LIST TAB */}
        {activeTab === 'list' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in slide-in-from-bottom-4 duration-500">
            {droplets.map(d => (
              <div key={d.id} className="glass-panel p-5 rounded-xl border border-gray-700 hover:border-cyan-500/50 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-white group-hover:text-cyan-400 transition-colors">{d.name}</h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1 font-mono">
                      <span className={`w-2 h-2 rounded-full ${d.status === 'active' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                      {d.status.toUpperCase()}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-gray-300">{d.networks.v4[0]?.ip_address || '...'}</p>
                    <p className="text-xs text-gray-500">{d.region.slug}</p>
                  </div>
                </div>

                <div className="flex gap-2 mb-4">
                  <button onClick={() => handleAction(d.id, 'reboot')} className="flex-1 bg-yellow-500/10 text-yellow-500 py-2 rounded hover:bg-yellow-500/20 text-xs font-bold border border-yellow-500/20">REBOOT</button>
                  <button onClick={() => handleAction(d.id, 'power_off')} className="flex-1 bg-orange-500/10 text-orange-500 py-2 rounded hover:bg-orange-500/20 text-xs font-bold border border-orange-500/20">OFF</button>
                  <button onClick={() => handleAction(d.id, 'delete')} className="flex-1 bg-red-500/10 text-red-500 py-2 rounded hover:bg-red-500/20 text-xs font-bold border border-red-500/20">DEL</button>
                </div>

                <div className="pt-3 border-t border-gray-700/50 flex gap-2">
                   <select 
                      className="bg-black/30 text-xs text-gray-400 border border-gray-700 rounded px-2 outline-none flex-1"
                      onChange={(e) => setRebuildImg({ ...rebuildImg, [d.id]: e.target.value })}
                      value={rebuildImg[d.id] || IMAGES[0].slug}
                    >
                      {IMAGES.map(i => <option key={i.slug} value={i.slug}>{i.name}</option>)}
                    </select>
                   <button onClick={() => handleAction(d.id, 'rebuild', rebuildImg[d.id] || IMAGES[0].slug)} className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded text-xs"><RotateCw size={14}/></button>
                </div>
              </div>
            ))}
            {droplets.length === 0 && <p className="col-span-full text-center text-gray-500 py-10">NO ACTIVE SERVERS DETECTED</p>}
          </div>
        )}
      </div>
    </div>
  );
}
