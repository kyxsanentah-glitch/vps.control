'use client';

import { useState, useEffect } from 'react';
import axios from 'axios';
import { Terminal, Server, Trash2, RotateCw, Power, ShieldAlert, Copy } from 'lucide-react';

// --- DATA REGION & SIZE (SAMA SEPERTI VERSI PYTHON) ---
const REGIONS = [
  { name: "🇸🇬 Singapore (SGP1)", slug: "sgp1" },
  { name: "🇺🇸 New York 1 (NYC1)", slug: "nyc1" },
  { name: "🇺🇸 New York 3 (NYC3)", slug: "nyc3" },
  { name: "🇳🇱 Amsterdam 3 (AMS3)", slug: "ams3" },
  { name: "🇬🇧 London 1 (LON1)", slug: "lon1" },
  { name: "🇮🇳 Bangalore 1 (BLR1)", slug: "blr1" },
];

const SIZES = [
  { name: "🔥 AMD 1 GB / 1 vCPU ($7)", slug: "s-1vcpu-1gb-amd" },
  { name: "🔥 AMD 2 GB / 1 vCPU ($14)", slug: "s-1vcpu-2gb-amd" },
  { name: "🔥 AMD 4 GB / 2 vCPU ($28)", slug: "s-2vcpu-4gb-amd" },
  { name: "🔥 AMD 8 GB / 4 vCPU ($56)", slug: "s-4vcpu-8gb-amd" },
  { name: "🔥 AMD 16 GB / 8 vCPU ($112)", slug: "s-8vcpu-16gb-amd" },
];

const IMAGES = [
  { name: "Ubuntu 22.04 LTS", slug: "ubuntu-22-04-x64" },
  { name: "Debian 11", slug: "debian-11-x64" },
  { name: "CentOS Stream 9", slug: "centos-stream-9-x64" },
];

export default function Home() {
  // State
  const [token, setToken] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<'create' | 'list'>('create');
  
  // Create State
  const [hostName, setHostName] = useState('kyxzan-server');
  const [region, setRegion] = useState(REGIONS[0].slug);
  const [size, setSize] = useState(SIZES[0].slug);
  const [image, setImage] = useState(IMAGES[0].slug);
  const [loading, setLoading] = useState(false);
  const [deployResult, setDeployResult] = useState<any>(null);

  // List State
  const [droplets, setDroplets] = useState<any[]>([]);
  const [rebuildImg, setRebuildImg] = useState<{ [key: number]: string }>({});

  // --- 1. AUTH LOGIC (AUTO LOAD) ---
  useEffect(() => {
    const savedToken = localStorage.getItem('do_token');
    if (savedToken) {
      setToken(savedToken);
      setIsLogin(true);
    }
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

  // --- 2. API WRAPPER ---
  const callDO = async (endpoint: string, method: string = 'GET', data: any = null) => {
    try {
      const res = await axios.post('/api/do', { token, endpoint, method, data });
      return res.data;
    } catch (err: any) {
      throw new Error(err.response?.data?.error || 'API Error');
    }
  };

  // --- 3. GENERATE KYXZAN PASSWORD ---
  const generatePass = () => {
    const suffix = Math.random().toString(36).slice(-6) + Math.floor(Math.random() * 9);
    return `Kyxzan${suffix}!`; // Format: Kyxzan[random]!
  };

  // --- 4. CREATE LOGIC ---
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

      // Step A: Create Request
      const res = await callDO('/droplets', 'POST', {
        name: hostName,
        region: region,
        size: size,
        image: image,
        user_data: userData,
        backups: false
      });

      const dropletId = res.droplet.id;
      
      // Step B: Wait for IP (Polling)
      let ip = null;
      for (let i = 0; i < 20; i++) { // Try 20 times (60 secs)
        await new Promise(r => setTimeout(r, 3000)); // Wait 3s
        const check = await callDO(`/droplets/${dropletId}`);
        if (check.droplet.networks.v4.length > 0) {
          ip = check.droplet.networks.v4[0].ip_address;
          break;
        }
      }

      setDeployResult({ ip: ip || "IP Pending...", password, name: hostName });
      alert("VPS Created Berhasil!");

    } catch (err: any) {
      alert("Gagal: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- 5. LIST & ACTION LOGIC ---
  const fetchDroplets = async () => {
    try {
      const res = await callDO('/droplets');
      setDroplets(res.droplets);
    } catch (err) { alert("Gagal ambil data"); }
  };

  const handleAction = async (id: number, type: string, payload: any = null) => {
    if (!confirm(`Yakin melakukan ${type}?`)) return;
    try {
      if (type === 'delete') {
        await callDO(`/droplets/${id}`, 'DELETE');
        setDroplets(prev => prev.filter(d => d.id !== id));
      } else if (type === 'rebuild') {
        await callDO(`/droplets/${id}/actions`, 'POST', { type: 'rebuild', image: payload });
      } else {
        await callDO(`/droplets/${id}/actions`, 'POST', { type });
      }
      alert(`Sukses: ${type}`);
    } catch (err: any) { alert("Error: " + err.message); }
  };

  // --- RENDER UI ---
  if (!isLogin) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl border border-cyan-500 shadow-lg shadow-cyan-500/20 max-w-md w-full">
          <h1 className="text-3xl font-bold text-cyan-400 mb-6 text-center">⚡ Kyxzan Controller</h1>
          <input 
            type="password" 
            placeholder="DigitalOcean API Token" 
            className="w-full bg-gray-700 p-3 rounded mb-4 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
            value={token}
            onChange={e => setToken(e.target.value)}
          />
          <button onClick={handleLogin} className="w-full bg-cyan-600 hover:bg-cyan-500 p-3 rounded font-bold transition">
            MASUK & SIMPAN
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-200 font-sans p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <h1 className="text-2xl md:text-3xl font-bold text-cyan-400 flex items-center gap-2">
            <Terminal /> Kyxzan VPS <span className="text-xs bg-cyan-900 text-cyan-200 px-2 py-1 rounded">Next.js</span>
          </h1>
          <button onClick={handleLogout} className="text-sm text-red-400 hover:text-red-300">Logout</button>
        </div>

        {/* TABS */}
        <div className="flex gap-4 mb-6">
          <button 
            onClick={() => setActiveTab('create')} 
            className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'create' ? 'bg-cyan-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            🚀 Create VPS
          </button>
          <button 
            onClick={() => { setActiveTab('list'); fetchDroplets(); }} 
            className={`px-6 py-2 rounded-lg font-bold transition ${activeTab === 'list' ? 'bg-cyan-600 text-white' : 'bg-gray-800 hover:bg-gray-700'}`}
          >
            📋 Manage List
          </button>
        </div>

        {/* TAB CREATE */}
        {activeTab === 'create' && (
          <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Host Name</label>
                <input value={hostName} onChange={e => setHostName(e.target.value)} className="w-full bg-gray-800 p-3 rounded border border-gray-700 focus:border-cyan-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Location</label>
                <select value={region} onChange={e => setRegion(e.target.value)} className="w-full bg-gray-800 p-3 rounded border border-gray-700 outline-none">
                  {REGIONS.map(r => <option key={r.slug} value={r.slug}>{r.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Image (OS)</label>
                <select value={image} onChange={e => setImage(e.target.value)} className="w-full bg-gray-800 p-3 rounded border border-gray-700 outline-none">
                  {IMAGES.map(i => <option key={i.slug} value={i.slug}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Size (AMD NVMe)</label>
                <select value={size} onChange={e => setSize(e.target.value)} className="w-full bg-gray-800 p-3 rounded border border-gray-700 outline-none">
                  {SIZES.map(s => <option key={s.slug} value={s.slug}>{s.name}</option>)}
                </select>
              </div>
            </div>

            <div className="mt-6">
              <div className="bg-cyan-900/30 border border-cyan-800 p-3 rounded mb-4 text-cyan-200 text-sm">
                🔒 Password akan otomatis di-generate: <b>Kyxzan[Random]</b>
              </div>
              <button 
                onClick={handleDeploy} 
                disabled={loading}
                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-3 rounded-lg font-bold text-lg transition disabled:opacity-50"
              >
                {loading ? "Creating & Waiting for IP..." : "🔥 DEPLOY NOW"}
              </button>
            </div>

            {/* HASIL DEPLOY */}
            {deployResult && (
              <div className="mt-8 bg-green-900/20 border border-green-800 p-6 rounded-xl animate-pulse-once">
                <h3 className="text-green-400 font-bold text-xl mb-4 flex items-center gap-2"><Server/> VPS READY!</h3>
                <div className="bg-black p-4 rounded font-mono text-sm text-gray-300">
                  <p>IP ADDRESS : <span className="text-white">{deployResult.ip}</span></p>
                  <p>USERNAME   : <span className="text-white">root</span></p>
                  <p>PASSWORD   : <span className="text-yellow-400 select-all">{deployResult.password}</span></p>
                  <p className="mt-2 text-gray-500"># Login via Termius / SSH:</p>
                  <p>ssh root@{deployResult.ip}</p>
                </div>
                <button onClick={() => navigator.clipboard.writeText(deployResult.password)} className="mt-3 flex items-center gap-2 text-sm text-green-400 hover:text-green-300">
                  <Copy size={16}/> Copy Password
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB LIST */}
        {activeTab === 'list' && (
          <div className="space-y-4">
            {droplets.length === 0 && <p className="text-center text-gray-500 mt-10">Belum ada VPS / Klik Tab Manage lagi buat refresh.</p>}
            
            {droplets.map(d => (
              <div key={d.id} className="bg-gray-900 border border-gray-800 p-5 rounded-xl">
                <div className="flex flex-col md:flex-row justify-between md:items-center mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-cyan-400">{d.name}</h3>
                    <p className="text-sm text-gray-400 mt-1">
                      {d.networks.v4[0]?.ip_address || 'No IP'} | {d.region.slug} | {d.image.slug}
                    </p>
                  </div>
                  <div className="flex gap-2 mt-4 md:mt-0">
                    <button onClick={() => handleAction(d.id, 'reboot')} className="bg-yellow-900/40 text-yellow-400 p-2 rounded hover:bg-yellow-900" title="Reboot"><RotateCw size={18}/></button>
                    <button onClick={() => handleAction(d.id, 'power_off')} className="bg-orange-900/40 text-orange-400 p-2 rounded hover:bg-orange-900" title="Power Off"><Power size={18}/></button>
                    <button onClick={() => handleAction(d.id, 'delete')} className="bg-red-900/40 text-red-400 p-2 rounded hover:bg-red-900" title="Delete"><Trash2 size={18}/></button>
                  </div>
                </div>
                
                {/* REBUILD ZONE */}
                <div className="bg-gray-950 p-3 rounded flex flex-col md:flex-row gap-3 items-center border border-gray-800">
                  <span className="text-xs text-gray-500 font-bold flex gap-1"><ShieldAlert size={14}/> REBUILD OS:</span>
                  <select 
                    className="bg-gray-900 text-sm border border-gray-700 rounded px-2 py-1 outline-none"
                    onChange={(e) => setRebuildImg({ ...rebuildImg, [d.id]: e.target.value })}
                    value={rebuildImg[d.id] || IMAGES[0].slug}
                  >
                    {IMAGES.map(i => <option key={i.slug} value={i.slug}>{i.name}</option>)}
                  </select>
                  <button 
                    onClick={() => handleAction(d.id, 'rebuild', rebuildImg[d.id] || IMAGES[0].slug)}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                  >
                    RESET VPS
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
