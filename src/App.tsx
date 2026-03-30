/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Gamepad2, 
  Battery, 
  Info, 
  Power, 
  Lightbulb, 
  Mic, 
  MicOff, 
  Volume2, 
  Settings, 
  RefreshCw,
  Zap,
  Palette,
  Sliders,
  Waves,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

type Device = {
  id: string;
  name: string;
};

type CommandResult = {
  success: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
};

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [battery, setBattery] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

  // Lightbar state
  const [lightbarOn, setLightbarOn] = useState(true);
  const [lightbarColor, setLightbarColor] = useState({ r: 0, g: 0, b: 255, brightness: 255 });
  const [liveUpdate, setLiveUpdate] = useState(false);

  // Battery Color Mode
  const [batteryColorMode, setBatteryColorMode] = useState(false);
  const [batteryThresholds, setBatteryThresholds] = useState([
    { min: 0, max: 15, r: 255, g: 0, b: 0, label: 'Critical' },
    { min: 16, max: 40, r: 255, g: 165, b: 0, label: 'Low' },
    { min: 41, max: 100, r: 0, g: 255, b: 0, label: 'Healthy' }
  ]);

  // Audio state
  const [volume, setVolume] = useState(128);
  const [micOn, setMicOn] = useState(true);
  const [micLed, setMicLed] = useState<'on' | 'off' | 'pulse'>('off');

  useEffect(() => {
    fetchDevices();
  }, []);

  // Battery Color Mode Loop
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (batteryColorMode && selectedDevice) {
      const updateBatteryColor = async () => {
        const res = await runCmd('battery');
        if (res) {
          const level = parseInt(res.replace('%', '').trim());
          if (!isNaN(level)) {
            setBattery(res.trim());
            const match = batteryThresholds.find(t => level >= t.min && level <= t.max);
            if (match) {
              await runCmd('lightbar', `${match.r} ${match.g} ${match.b} 255`);
            }
          }
        }
      };
      updateBatteryColor();
      interval = setInterval(updateBatteryColor, 30000); // Every 30s
    }
    return () => clearInterval(interval);
  }, [batteryColorMode, selectedDevice, batteryThresholds]);

  // Live Lightbar Update
  useEffect(() => {
    if (liveUpdate && lightbarOn) {
      const timeout = setTimeout(() => {
        updateLightbarColor();
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [lightbarColor, liveUpdate, lightbarOn]);

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/devices');
      const data = await res.json();
      if (data.success && data.stdout) {
        const lines = data.stdout.trim().split('\n');
        const parsedDevices = lines
          .filter(line => line.trim() && !line.trim().startsWith('Devices'))
          .map((line: string, index: number) => {
            const trimmed = line.trim();
            let id: string;
            let name: string;

            if (trimmed.includes(': ')) {
              // Format: "/dev/hidraw0: DualSense Wireless Controller"
              const parts = trimmed.split(': ');
              id = parts[0].trim();
              name = parts.slice(1).join(': ').trim();
            } else {
              // Format: "90:b6:85:9c:92:60 (Bluetooth)" or just "ID"
              const parts = trimmed.split(/\s+/);
              id = parts[0].trim();
              name = parts.slice(1).join(' ').trim() || id;
            }

            return { id, name };
          });
        setDevices(parsedDevices);
        if (parsedDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(parsedDevices[0].id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch devices", err);
    } finally {
      setLoading(false);
    }
  };

  const runCmd = async (command: string, args: string = '') => {
    if (!selectedDevice) {
      showStatus("No device selected", 'error');
      return null;
    }
    try {
      const res = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: selectedDevice, command, args })
      });
      const data: CommandResult = await res.json();
      if (data.success) {
        showStatus(`Command ${command} sent successfully`, 'success');
        return data.stdout;
      } else {
        showStatus(`Error: ${data.error || data.stderr}`, 'error');
      }
    } catch (err) {
      showStatus("Network error", 'error');
    }
    return null;
  };

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMsg({ text, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const getBattery = async () => {
    const res = await runCmd('battery');
    if (res) setBattery(res.trim());
  };

  const getInfo = async () => {
    const res = await runCmd('info');
    if (res) setInfo(res.trim());
  };

  const toggleLightbar = async () => {
    const newState = !lightbarOn;
    await runCmd('lightbar', newState ? 'on' : 'off');
    setLightbarOn(newState);
  };

  const updateLightbarColor = async () => {
    // Force lightbar ON before setting color to ensure it applies
    // This addresses the issue where color only changes on specific events
    await runCmd('lightbar', 'on');
    await runCmd('lightbar', `${lightbarColor.r} ${lightbarColor.g} ${lightbarColor.b} ${lightbarColor.brightness}`);
  };

  const toggleMic = async () => {
    const newState = !micOn;
    await runCmd('microphone', newState ? 'on' : 'off');
    setMicOn(newState);
  };

  const updateVolume = async (val: number) => {
    setVolume(val);
    await runCmd('volume', val.toString());
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-[#e2e8f0] font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#161920]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-600/20">
              <Gamepad2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              DualSense Control
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <select 
              value={selectedDevice || ''} 
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="bg-[#1e232d] border border-white/10 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
            >
              {devices.length === 0 && <option>No devices found</option>}
              {devices.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <button 
              onClick={fetchDevices}
              className="p-2 hover:bg-white/5 rounded-full transition-colors"
              title="Refresh devices"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Status Bar */}
        <AnimatePresence>
          {statusMsg && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-full text-sm font-medium shadow-xl z-[60] ${
                statusMsg.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'
              }`}
            >
              {statusMsg.text}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Left Column: Quick Stats & Power */}
        <div className="md:col-span-4 space-y-6">
          <section className="bg-[#161920] border border-white/5 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
              <Activity className="w-3 h-3" /> Status
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3 text-white/70">
                  <Battery className="w-5 h-5" />
                  <span className="text-sm font-medium">Battery</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-blue-400">{battery || '--'}</span>
                  <button onClick={getBattery} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/5">
                <div className="flex items-center gap-3 text-white/70">
                  <Info className="w-5 h-5" />
                  <span className="text-sm font-medium">Firmware</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-white/50 truncate max-w-[100px]">{info || 'Unknown'}</span>
                  <button onClick={getInfo} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors">
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>
              </div>

              <button 
                onClick={() => runCmd('power-off')}
                className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl transition-all font-semibold"
              >
                <Power className="w-4 h-4" /> Power Off
              </button>
            </div>
          </section>

          <section className="bg-[#161920] border border-white/5 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-6 flex items-center gap-2">
              <Volume2 className="w-3 h-3" /> Audio
            </h2>
            
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Volume</span>
                  <span className="font-mono text-blue-400">{volume}</span>
                </div>
                <input 
                  type="range" min="0" max="255" value={volume} 
                  onChange={(e) => updateVolume(parseInt(e.target.value))}
                  className="w-full accent-blue-500 bg-white/10 h-1.5 rounded-full appearance-none cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {micOn ? <Mic className="w-5 h-5 text-blue-400" /> : <MicOff className="w-5 h-5 text-white/30" />}
                  <span className="text-sm font-medium">Microphone</span>
                </div>
                <button 
                  onClick={toggleMic}
                  className={`relative w-12 h-6 rounded-full transition-colors ${micOn ? 'bg-blue-600' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${micOn ? 'left-7' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Lightbar & Triggers */}
        <div className="md:col-span-8 space-y-6">
          <section className="bg-[#161920] border border-white/5 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 flex items-center gap-2">
                <Palette className="w-3 h-3" /> Lightbar
              </h2>
              <button 
                onClick={toggleLightbar}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  lightbarOn ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-white/5 text-white/40 border border-white/10'
                }`}
              >
                <Lightbulb className="w-3 h-3" /> {lightbarOn ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-white/30 uppercase">Live Sync</span>
                  <button 
                    onClick={() => setLiveUpdate(!liveUpdate)}
                    className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${liveUpdate ? 'bg-blue-500 text-white' : 'bg-white/5 text-white/40'}`}
                  >
                    {liveUpdate ? 'ON' : 'OFF'}
                  </button>
                </div>
                {['r', 'g', 'b'].map((color) => (
                  <div key={color} className="space-y-2">
                    <div className="flex justify-between text-xs uppercase font-bold tracking-tighter">
                      <span className="text-white/40">{color === 'r' ? 'Red' : color === 'g' ? 'Green' : 'Blue'}</span>
                      <span className="text-white/60">{(lightbarColor as any)[color]}</span>
                    </div>
                    <input 
                      type="range" min="0" max="255" 
                      value={(lightbarColor as any)[color]} 
                      onChange={(e) => setLightbarColor({...lightbarColor, [color]: parseInt(e.target.value)})}
                      className={`w-full h-1.5 rounded-full appearance-none cursor-pointer bg-white/5 ${
                        color === 'r' ? 'accent-red-500' : color === 'g' ? 'accent-green-500' : 'accent-blue-500'
                      }`}
                    />
                  </div>
                ))}
              </div>

              <div className="flex flex-col items-center justify-center space-y-6">
                <div 
                  className="w-32 h-32 rounded-full border-4 border-white/10 shadow-2xl transition-all duration-500"
                  style={{ 
                    backgroundColor: `rgb(${lightbarColor.r}, ${lightbarColor.g}, ${lightbarColor.b})`,
                    boxShadow: lightbarOn ? `0 0 40px rgba(${lightbarColor.r}, ${lightbarColor.g}, ${lightbarColor.b}, 0.4)` : 'none',
                    opacity: lightbarOn ? (lightbarColor.brightness / 255) : 0.1
                  }}
                />
                
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-xs uppercase font-bold tracking-tighter">
                    <span className="text-white/40">Brightness</span>
                    <span className="text-white/60">{lightbarColor.brightness}</span>
                  </div>
                  <input 
                    type="range" min="0" max="255" value={lightbarColor.brightness} 
                    onChange={(e) => setLightbarColor({...lightbarColor, brightness: parseInt(e.target.value)})}
                    className="w-full accent-white bg-white/10 h-1.5 rounded-full appearance-none cursor-pointer"
                  />
                </div>

                {!liveUpdate && (
                  <button 
                    onClick={updateLightbarColor}
                    className="w-full py-3 bg-white text-black font-bold rounded-xl hover:bg-white/90 transition-all active:scale-95"
                  >
                    Apply Color
                  </button>
                )}
              </div>
            </div>

            {/* Battery Color Mode Section */}
            <div className="mt-10 pt-8 border-t border-white/5">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-white/80">Battery Color Mode</h3>
                  <p className="text-[10px] text-white/30 uppercase tracking-tight">Automatically change color based on battery level</p>
                </div>
                <button 
                  onClick={() => setBatteryColorMode(!batteryColorMode)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    batteryColorMode ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-white/5 text-white/40 border border-white/10'
                  }`}
                >
                  {batteryColorMode ? 'Active' : 'Disabled'}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {batteryThresholds.map((t, i) => (
                  <div key={i} className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[10px] font-bold uppercase text-white/40">{t.label}</span>
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `rgb(${t.r}, ${t.g}, ${t.b})` }} />
                    </div>
                    <div className="text-xs font-mono text-white/60">
                      {t.min}% - {t.max}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="bg-[#161920] border border-white/5 rounded-2xl p-6 shadow-sm">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-8 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Adaptive Triggers
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { name: 'Off', icon: Power, args: 'off', category: 'Basic' },
                { name: 'Feedback', icon: Waves, args: 'feedback 0 5', category: 'Basic' },
                { name: 'Weapon', icon: Gamepad2, args: 'weapon 2 5 8', category: 'Basic' },
                { name: 'Bow', icon: Sliders, args: 'bow 1 6 4 2', category: 'Basic' },
                { name: 'Galloping', icon: Activity, args: 'galloping 0 8 2 4 10', category: 'Basic' },
                { name: 'Vibration', icon: Waves, args: 'vibration 5 4 10', category: 'Basic' },
                
                // Star Citizen Specific
                { name: 'Afterburner', icon: Zap, args: 'feedback 7 8', category: 'Star Citizen' },
                { name: 'Mining Laser', icon: Activity, args: 'vibration 0 3 15', category: 'Star Citizen' },
                { name: 'Ship Cannons', icon: Gamepad2, args: 'machine 1 9 4 8 5 2', category: 'Star Citizen' },
                { name: 'Quantum Drive', icon: Waves, args: 'vibration 5 8 20', category: 'Star Citizen' },
                { name: 'EVA Thrusters', icon: Zap, args: 'feedback 2 2', category: 'Star Citizen' }
              ].map((t) => (
                <button 
                  key={t.name}
                  onClick={() => runCmd('trigger', `both ${t.args}`)}
                  className="flex items-center gap-4 p-4 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all group text-left relative overflow-hidden"
                >
                  <div className="p-2 bg-white/5 group-hover:bg-blue-500/20 rounded-lg transition-colors">
                    <t.icon className="w-5 h-5 text-white/60 group-hover:text-blue-400" />
                  </div>
                  <div>
                    <div className="text-sm font-bold">{t.name}</div>
                    <div className="text-[10px] text-white/30 uppercase tracking-tighter">{t.category}</div>
                  </div>
                  {t.category === 'Star Citizen' && (
                    <div className="absolute top-0 right-0 p-1">
                      <div className="w-1 h-1 bg-blue-500 rounded-full animate-pulse" />
                    </div>
                  )}
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="max-w-6xl mx-auto px-6 py-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-white/5 mt-12">
        <div className="flex items-center gap-2 text-white/20 text-xs font-medium uppercase tracking-widest">
          <Settings className="w-3 h-3" /> dualsensectl GUI v1.0
        </div>
        <div className="text-white/20 text-[10px] text-center sm:text-right">
          Designed for Arch Linux & CachyOS Wayland<br/>
          Requires dualsensectl binary installed
        </div>
      </footer>
    </div>
  );
}
