import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, RefreshCw, Save, PlusCircle, Eye, EyeOff, Edit, Trash2, UserPlus, UserMinus } from 'lucide-react';

export default function AdminPage({ user }) {
  const [users,         setUsers]         = useState([]);
  const [adminCourses,  setAdminCourses]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [showAddCourse, setShowAddCourse] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [inviteEmail,    setInviteEmail]    = useState('');
  const [invitePassword, setInvitePassword] = useState('');

  const [newCourse, setNewCourse] = useState({
    _id: '', title: '', price: '₹', badge: '', schedule: '',
    certificate: 'Yes', language: 'English', classType: 'Live Classes',
    image: '/images/machine.webp', features: ''
  });

  const navigate = useNavigate();

  const headers = { 'Content-Type': 'application/json', 'x-admin-token': user?.adminToken, 'x-user-id': user?._id };

  useEffect(() => {
    if (!user?.isAdmin || !user?.adminToken) { navigate('/'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [uRes, cRes] = await Promise.all([
        fetch('/api/admin/users',   { headers }),
        fetch('/api/admin/courses', { headers })
      ]);
      const uData = await uRes.json();
      if (uData.message?.includes('SECURITY')) { alert(uData.message); return navigate('/'); }
      // Support both legacy array and new paginated wrapper
      setUsers(uData.users ? uData.users : uData);
      setAdminCourses(await cRes.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const promptPwd = (msg) => prompt(`🔒 ${msg}\n\nEnter your Admin Password to confirm:`);

  // Helper to instantly kick out admins if token is revoked during session
  const checkSecurity = (data) => {
    if (data && data.message?.includes('SECURITY')) {
      alert(data.message);
      navigate('/');
      return true;
    }
    return false;
  };

  // ── PROGRESS UPDATE ──────────────────────────────────────────
  const handleUpdateProgress = async (userId, courseId, progress, completed) => {
    const res = await fetch(`/api/admin/users/${userId}/progress`, {
      method: 'PUT', headers, body: JSON.stringify({ courseId, progress: parseInt(progress), completed })
    });
    const data = await res.json();
    if (checkSecurity(data)) return;
    alert('Progress updated!');
    fetchData();
  };

  // ── ADD COURSE ───────────────────────────────────────────────
  const handleAddCourse = async (e) => {
    e.preventDefault();
    const pwd = promptPwd('Add New Course');
    if (!pwd) return;
    
    // SLUG GENERATION: Convert title to URL-safe string
    const slug = newCourse.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const body = { ...newCourse, _id: slug, features: newCourse.features.split(',').map(f => f.trim()).filter(f => f.length > 0), password: pwd };
    
    const res  = await fetch('/api/admin/courses', { method: 'POST', headers, body: JSON.stringify(body) });
    const data = await res.json();
    if (checkSecurity(data)) return;
    if (data.success) { alert('Course added!'); setShowAddCourse(false); setNewCourse({ title:'', price:'₹', badge:'', schedule:'', certificate:'Yes', language:'English', classType:'Live Classes', image:'/images/machine.webp', features:'' }); fetchData(); }
    else alert(data.message);
  };

  // ── EDIT COURSE ──────────────────────────────────────────────
  const handleEditCourse = async (e) => {
    e.preventDefault();
    const pwd = promptPwd('Save Course Changes');
    if (!pwd) return;
    const feats = Array.isArray(editingCourse.features) ? editingCourse.features : editingCourse.features.split(',').map(f => f.trim()).filter(f => f.length > 0);
    const res   = await fetch(`/api/admin/courses/${editingCourse._id}`, {
      method: 'PUT', headers, body: JSON.stringify({ ...editingCourse, features: feats, password: pwd })
    });
    const data = await res.json();
    if (checkSecurity(data)) return;
    if (data.success) { alert('Course updated!'); setEditingCourse(null); fetchData(); }
    else alert(data.message);
  };

  // ── TOGGLE HIDE ──────────────────────────────────────────────
  const handleToggleHide = async (courseId, isHidden) => {
    const pwd = promptPwd(`${isHidden ? 'Unhide' : 'Hide'} Course`);
    if (!pwd) return;
    const res  = await fetch(`/api/admin/courses/${courseId}`, { method: 'PUT', headers, body: JSON.stringify({ isHidden: !isHidden, password: pwd }) });
    const data = await res.json();
    if (checkSecurity(data)) return;
    if (data.success) fetchData(); else alert(data.message);
  };

  // ── DELETE COURSE ────────────────────────────────────────────
  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm('This will permanently delete the course. Continue?')) return;
    const pwd = promptPwd('Delete Course (Permanent)');
    if (!pwd) return;
    const res  = await fetch(`/api/admin/courses/${courseId}`, { method: 'DELETE', headers, body: JSON.stringify({ password: pwd }) });
    const data = await res.json();
    if (checkSecurity(data)) return;
    if (data.success) { alert('Course deleted.'); fetchData(); } else alert(data.message);
  };

  // ── INVITE ADMIN ─────────────────────────────────────────────
  const handleInviteAdmin = async (e) => {
    e.preventDefault();
    const res  = await fetch('/api/admin/invite', { method: 'POST', headers, body: JSON.stringify({ targetEmail: inviteEmail, password: invitePassword }) });
    const data = await res.json();
    if (checkSecurity(data)) return;
    alert(data.message);
    if (data.success) { setInviteEmail(''); setInvitePassword(''); }
  };

  // ── REVOKE ADMIN ─────────────────────────────────────────────
  const handleRevokeAdmin = async (targetUserId, targetName) => {
    if (!window.confirm(`Revoke admin access for ${targetName}?`)) return;
    const pwd = promptPwd(`Revoke Admin: ${targetName}`);
    if (!pwd) return;
    const res  = await fetch(`/api/admin/revoke/${targetUserId}`, { method: 'PUT', headers, body: JSON.stringify({ password: pwd }) });
    const data = await res.json();
    if (checkSecurity(data)) return;
    alert(data.message);
    fetchData();
  };

  if (!user?.isAdmin) return null;

  const formCls = 'w-full bg-[#111] border border-gray-800 p-2 text-white outline-none focus:border-accent font-mono text-sm';

  return (
    <div className="min-h-screen container mx-auto px-6 py-12 relative z-10">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4 mb-12 border-b-2 border-red-500/30 pb-6">
        <ShieldAlert size={48} className="text-red-500" />
        <div>
          <h1 className="text-4xl font-black uppercase tracking-tighter text-red-500">Admin Dashboard</h1>
          <p className="font-mono text-gray-500 text-sm">Logged in as <span className="text-white">{user.name}</span> • Token: <span className="text-xs">{user.adminToken?.substring(0, 16)}…</span></p>
        </div>
        <div className="ml-auto flex gap-3">
          <button onClick={() => { setShowAddCourse(!showAddCourse); setEditingCourse(null); }} className="flex items-center gap-2 border border-accent text-accent px-4 py-2 hover:bg-accent hover:text-black transition-all font-mono text-xs uppercase">
            <PlusCircle size={14}/> {showAddCourse ? 'Cancel' : 'Add Course'}
          </button>
          <button onClick={fetchData} className="flex items-center gap-2 border border-red-500 text-red-500 px-4 py-2 hover:bg-red-500 hover:text-black transition-all font-mono text-xs uppercase">
            <RefreshCw size={14}/> Refresh
          </button>
        </div>
      </div>

      {/* ── INVITE ADMIN SECTION ── */}
      <div className="bg-[#0a0a0a] border border-gray-800 p-6 mb-12">
        <h2 className="text-lg font-black uppercase text-white mb-4 flex items-center gap-2"><UserPlus size={20} className="text-accent"/> Admin Access Management</h2>
        <form onSubmit={handleInviteAdmin} className="flex flex-col md:flex-row gap-3">
          <input required type="email" placeholder="User's email address to invite…" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="flex-grow bg-[#111] border border-gray-800 p-3 text-white font-mono text-sm outline-none focus:border-accent" />
          <input required type="password" placeholder="Your admin password…" value={invitePassword} onChange={e => setInvitePassword(e.target.value)} className="md:w-56 bg-[#111] border border-gray-800 p-3 text-white font-mono text-sm outline-none focus:border-accent" />
          <button type="submit" className="border border-accent text-accent px-6 py-2 hover:bg-accent hover:text-black transition-all font-mono text-xs uppercase whitespace-nowrap flex items-center gap-2">
            <UserPlus size={14}/> Send Invite
          </button>
        </form>
        <p className="text-gray-600 font-mono text-xs mt-3">The user will receive an email and must accept from their dashboard. They will go through full 2FA on login.</p>
        
        {/* List all current admins (excluding self) */}
        {users.filter(u => u.isAdmin && u._id !== user._id).length > 0 && (
          <div className="mt-6 space-y-2">
            <p className="text-xs font-mono text-gray-500 uppercase mb-3">Current Admins (you can revoke):</p>
            {users.filter(u => u.isAdmin && u._id !== user._id).map(u => (
              <div key={u._id} className="flex justify-between items-center bg-[#111] border border-gray-800 px-4 py-3">
                <div>
                  <span className="text-white font-bold text-sm">{u.name}</span>
                  <span className="text-gray-500 font-mono text-xs ml-3">{u.email}</span>
                </div>
                <button onClick={() => handleRevokeAdmin(u._id, u.name)} className="flex items-center gap-1 border border-red-500 text-red-500 px-3 py-1 hover:bg-red-500 hover:text-black transition-all font-mono text-xs uppercase">
                  <UserMinus size={12}/> Revoke
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ADD COURSE FORM ── */}
      {showAddCourse && (
        <div className="bg-[#0a0a0a] border-2 border-accent p-6 mb-12">
          <h2 className="text-xl font-black text-accent uppercase mb-6">Add New Course</h2>
          <form onSubmit={handleAddCourse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['Title', 'title', true], ['Price (e.g. ₹4999)', 'price', true], ['Badge (e.g. Bestseller)', 'badge', false], ['Schedule', 'schedule', false], ['Image Path (/images/...)', 'image', true]].map(([lbl, key, req]) => (
              <div key={key}><label className="text-xs font-mono text-gray-500 uppercase">{lbl}</label>
                <input required={req} type="text" value={newCourse[key]} onChange={e => setNewCourse({ ...newCourse, [key]: e.target.value })} className={formCls} />
              </div>
            ))}
            <div className="md:col-span-2"><label className="text-xs font-mono text-gray-500 uppercase">Features (comma-separated)</label>
              <input required type="text" value={newCourse.features} onChange={e => setNewCourse({ ...newCourse, features: e.target.value })} className={formCls} placeholder="Feature 1, Feature 2, Feature 3" />
            </div>
            <button type="submit" className="md:col-span-2 bg-accent text-black font-black uppercase py-3 hover:bg-white transition-all">Add Course</button>
          </form>
        </div>
      )}

      {/* ── EDIT COURSE FORM ── */}
      {editingCourse && (
        <div className="bg-[#0a0a0a] border-2 border-blue-500 p-6 mb-12 relative">
          <button onClick={() => setEditingCourse(null)} className="absolute top-4 right-4 text-gray-500 hover:text-blue-500 font-mono text-xs uppercase">✕ Cancel</button>
          <h2 className="text-xl font-black text-blue-500 uppercase mb-6 flex items-center gap-2"><Edit size={20}/> Editing: {editingCourse.title}</h2>
          <form onSubmit={handleEditCourse} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[['Title', 'title', true], ['Price', 'price', true], ['Badge', 'badge', false], ['Schedule', 'schedule', false], ['Image Path', 'image', true]].map(([lbl, key, req]) => (
              <div key={key}><label className="text-xs font-mono text-gray-500 uppercase">{lbl}</label>
                <input required={req} type="text" value={editingCourse[key]} onChange={e => setEditingCourse({ ...editingCourse, [key]: e.target.value })} className="w-full bg-[#111] border border-gray-800 focus:border-blue-500 p-2 text-white outline-none font-mono text-sm" />
              </div>
            ))}
            <div className="md:col-span-2"><label className="text-xs font-mono text-gray-500 uppercase">Features (comma-separated)</label>
              <input required type="text" value={Array.isArray(editingCourse.features) ? editingCourse.features.join(', ') : editingCourse.features} onChange={e => setEditingCourse({ ...editingCourse, features: e.target.value })} className="w-full bg-[#111] border border-gray-800 focus:border-blue-500 p-2 text-white outline-none font-mono text-sm" />
            </div>
            <button type="submit" className="md:col-span-2 bg-blue-500 text-black font-black uppercase py-3 hover:bg-white transition-all">Save Changes</button>
          </form>
        </div>
      )}

      {loading ? <div className="text-red-500 font-mono animate-pulse">Loading…</div> : (
        <>
          {/* ── COURSE CATALOG ── */}
          <div className="mb-16">
            <h2 className="text-xl font-black text-white uppercase mb-6 border-b border-gray-800 pb-2">Course Catalog</h2>
            <div className="space-y-3">
              {adminCourses.map(course => (
                <div key={course._id} className="bg-[#0a0a0a] border border-gray-800 p-4 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-4 flex-grow">
                    <img src={course.image} className="w-16 h-12 object-cover opacity-50 border border-gray-800 shrink-0" />
                    <div>
                      <h3 className="font-bold text-white uppercase text-sm">{course.title}</h3>
                      <p className="font-mono text-xs text-gray-500">{course._id} • {course.price}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {course.isHidden && <span className="bg-red-500/20 text-red-500 border border-red-500/50 px-2 py-0.5 text-xs font-bold uppercase">HIDDEN</span>}
                    <button onClick={() => { setEditingCourse(course); setShowAddCourse(false); }} className="flex items-center gap-1 px-3 py-1.5 text-xs font-mono border border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-black transition-all uppercase"><Edit size={12}/> Edit</button>
                    <button onClick={() => handleToggleHide(course._id, course.isHidden)} className={`flex items-center gap-1 px-3 py-1.5 text-xs font-mono border transition-all uppercase ${course.isHidden ? 'border-accent text-accent hover:bg-accent hover:text-black' : 'border-gray-600 text-gray-400 hover:border-white hover:text-white'}`}>
                      {course.isHidden ? <Eye size={12}/> : <EyeOff size={12}/>} {course.isHidden ? 'Unhide' : 'Hide'}
                    </button>
                    <button onClick={() => handleDeleteCourse(course._id)} className="flex items-center gap-1 border border-red-500 text-red-500 px-3 py-1.5 hover:bg-red-500 hover:text-black transition-all font-mono text-xs uppercase"><Trash2 size={12}/> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── STUDENT PROGRESS ── */}
          <div>
            <h2 className="text-xl font-black text-white uppercase mb-6 border-b border-gray-800 pb-2">Student Progress</h2>
            <div className="space-y-6">
              {users.map(u => (
                <div key={u._id} className="bg-[#0a0a0a] border border-gray-800 p-6">
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="font-bold text-white uppercase">{u.name}</span>
                      {u.isAdmin && <span className="ml-2 bg-red-500/20 text-red-400 border border-red-500/30 px-2 py-0.5 text-xs font-bold uppercase">Admin</span>}
                      {u.adminInvitePending && <span className="ml-2 bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-2 py-0.5 text-xs font-bold uppercase">Invite Pending</span>}
                      <p className="text-gray-500 font-mono text-xs mt-0.5">{u.email}</p>
                    </div>
                    <span className="text-red-500 font-mono text-xs border border-red-500/30 px-2 py-1">{u.purchasedCourses?.length || 0} Courses</span>
                  </div>

                  {u.purchasedCourses?.length > 0 ? u.purchasedCourses.map(c => {
                    const cObj = typeof c.courseId === 'object' ? c.courseId : { _id: c.courseId, title: String(c.courseId).replace(/-/g, ' ') };
                    const cIdStr = cObj._id;
                    return (
                    <div key={cIdStr} className="flex flex-col md:flex-row md:items-center justify-between bg-[#111] border border-gray-800 p-4 gap-4 mb-2">
                      <p className="font-bold text-accent uppercase text-sm md:w-1/3">{cObj.title}</p>
                      <div className="flex items-center gap-3">
                        <label className="text-xs font-mono text-gray-500 uppercase">Progress %</label>
                        <input type="number" min="0" max="100" defaultValue={c.progress} id={`prog_${u._id}_${cIdStr}`}
                          className="bg-black border border-gray-700 text-white font-mono p-2 w-20 text-center outline-none focus:border-red-500"
                          onChange={e => { const v = e.target.value; document.getElementById(`comp_${u._id}_${cIdStr}`).checked = v === '100'; if (v !== '100') document.getElementById(`comp_${u._id}_${cIdStr}`).checked = false; }} />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked={c.completed} id={`comp_${u._id}_${cIdStr}`} className="w-5 h-5 accent-red-500"
                          onChange={e => {
                            const pi = document.getElementById(`prog_${u._id}_${cIdStr}`);
                            if (e.target.checked) pi.value = '100';
                            else if (pi.value === '100') { e.target.checked = true; alert('Lower progress below 100 first.'); }
                          }} />
                        <label className="text-xs font-mono text-gray-500 uppercase">Completed</label>
                      </div>
                      <button onClick={() => {
                        const p = document.getElementById(`prog_${u._id}_${cIdStr}`).value;
                        const done = document.getElementById(`comp_${u._id}_${cIdStr}`).checked;
                        handleUpdateProgress(u._id, cIdStr, p, done);
                      }} className="border border-red-500 text-red-500 hover:bg-red-500 hover:text-black px-4 py-2 font-mono text-xs flex items-center gap-2 transition-all uppercase">
                        <Save size={14}/> Update
                      </button>
                    </div>
                  )}) : <p className="text-gray-700 font-mono text-sm">No courses purchased.</p>}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
