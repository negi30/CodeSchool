import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Zap, PlayCircle, ArrowRight, Download, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home({ user, updateUser }) {
  const [courses, setCourses] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch('/api/courses')
      .then(res => res.json())
      .then(data => setCourses(data))
      .catch(err => console.error(err));
  }, []);

  const youtubeVideos = [
    { id: "_hdUddANh_o", title: "1 Language 1 framework | New age of learning development with AI", author: "chai aur code", views: "100K Views" },
    { id: "V_xro1bcAuA", title: "Web Development Roadmap 2026 (Beginner to Advance)", author: "Love Babbar", views: "250K Views" },
    { id: "EkYj0UGOeCM", title: "Web Development Is Dead in 2026?", author: "Neeraj Walia", views: "300K Views" },
    { id: "gG0_ZN_uOjo", title: "How to learn Machine Learning like a GENIUS", author: "Tech With Tim", views: "450K Views" },
    { id: "aSWyN7kUcXM", title: "PyTorch for Deep Learning & Machine Learning", author: "Daniel Bourke", views: "1.2M Views" },
    { id: "bX2QwpjsmuA", title: "What is Multi-head Attention in Transformers", author: "AI Research", views: "85K Views" },
    { id: "jBzwzrDvZ18", title: "Python Backend Web Development Course (with Django)", author: "CodeWithTomi", views: "650K Views" }
  ];

  const handleVideoClick = (id) => {
    alert("Notice: You are being redirected to an external YouTube video not hosted by CodeSchool. CodeSchool does not have any affiliation to them. This was just for website demo purposes.");
    window.open(`https://www.youtube.com/watch?v=${id}`, '_blank');
  };

  const downloadCertificate = (userName, courseName) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Inner Grid / Texture
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 1;
    for(let i=0; i<1200; i+=50) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 800); ctx.stroke();
    }
    for(let j=0; j<800; j+=50) {
      ctx.beginPath(); ctx.moveTo(0, j); ctx.lineTo(1200, j); ctx.stroke();
    }

    // Border
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 10;
    ctx.strokeRect(30, 30, canvas.width - 60, canvas.height - 60);
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(45, 45, canvas.width - 90, canvas.height - 90);

    // Title
    ctx.font = 'bold 70px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.textAlign = 'center';
    ctx.fillText('CERTIFICATE OF COMPLETION', canvas.width / 2, 200);

    // Subtitle
    ctx.font = '30px Arial, sans-serif';
    ctx.fillStyle = '#ccc';
    ctx.fillText('This certifies that', canvas.width / 2, 320);

    // Student Name
    ctx.font = 'bold 80px Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(userName.toUpperCase(), canvas.width / 2, 430);

    // Line under name
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2 - 300, 460);
    ctx.lineTo(canvas.width / 2 + 300, 460);
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Course Name
    ctx.font = '28px Arial, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('has successfully completed the curriculum for:', canvas.width / 2, 540);

    ctx.font = 'bold 45px "Courier New", monospace';
    ctx.fillStyle = '#00ff88';
    ctx.fillText(courseName.toUpperCase(), canvas.width / 2, 610);

    // Date
    const date = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    ctx.font = '22px Arial, sans-serif';
    ctx.fillStyle = '#fff';
    ctx.fillText(`Completion Date: ${date}`, canvas.width / 2, 700);

    // Signature
    ctx.font = 'italic 28px "Courier New", monospace';
    ctx.fillStyle = '#aaa';
    ctx.fillText('CodeSchool Executive Board', canvas.width / 2, 740);

    // Trigger download
    const link = document.createElement('a');
    link.download = `${userName.replace(/ /g, '_')}_Certificate.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <>
      <main className="container mx-auto px-6 pt-32 pb-40 flex flex-col items-center text-center relative z-10">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="border border-accent text-accent px-4 py-1 mb-12 font-mono text-sm uppercase tracking-widest bg-accent/5 backdrop-blur-sm">
          [ Next-Gen Learning Platform ]
        </motion.div>
        <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-7xl md:text-[8rem] font-black tracking-tighter mb-8 leading-[0.9] uppercase">
          Unlock <span className="text-transparent border-text-accent" style={{ WebkitTextStroke: '2px #00ff88', color: 'transparent' }}>Your</span> <br/>
          Potential.
        </motion.h1>
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="text-xl text-gray-400 max-w-2xl mb-12 font-mono">
          We build industry-ready developers. Master real-world skills and level up your career.
        </motion.p>
      </main>

      <div className="overflow-hidden bg-accent py-3 flex border-y-4 border-black relative z-10 transform -rotate-2 scale-105 mt-20">
        <motion.div animate={{ x: [0, -1000] }} transition={{ repeat: Infinity, duration: 15, ease: "linear" }} className="flex space-x-12 text-black font-black text-xl uppercase tracking-widest whitespace-nowrap">
          <span>• ESCAPE THE TUTORIAL HELL</span><span>• BUILD REAL PROJECTS</span><span>• GET HIRED FAST</span><span>• ESCAPE THE TUTORIAL HELL</span><span>• BUILD REAL PROJECTS</span><span>• GET HIRED FAST</span><span>• ESCAPE THE TUTORIAL HELL</span><span>• BUILD REAL PROJECTS</span>
        </motion.div>
      </div>

      {/* Admin Invite Notification Banner */}
      {user?.adminInvitePending && (
        <div className="container mx-auto px-6 mt-12 relative z-10">
          <div className="border-2 border-yellow-500 bg-yellow-500/10 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <ShieldAlert size={32} className="text-yellow-500 shrink-0" />
              <div>
                <h3 className="font-black text-yellow-400 uppercase text-lg">Admin Invite Received</h3>
                <p className="text-gray-400 font-mono text-sm"><span className="text-white">{user.adminInvitedBy}</span> has invited you to become a CodeSchool Admin. This grants full platform control.</p>
              </div>
            </div>
            <div className="flex gap-3 shrink-0">
              <button
                onClick={async () => {
                  const pwd = prompt('🔒 Please enter your password to ACCEPT the Admin Invitation:');
                  if (!pwd) return;
                  const res = await fetch('/api/admin/respond-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id, password: pwd, accept: true }) });
                  const data = await res.json();
                  if (data.success && updateUser) updateUser(data.user);
                  alert(data.message);
                }}
                className="flex items-center gap-2 bg-yellow-500 text-black font-black uppercase px-6 py-2 hover:bg-white transition-all text-sm"
              >
                <ShieldCheck size={16} /> Accept
              </button>
              <button
                onClick={async () => {
                  const pwd = prompt('🔒 Please enter your password to DECLINE the Admin Invitation:');
                  if (!pwd) return;
                  const res = await fetch('/api/admin/respond-invite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user._id, password: pwd, accept: false }) });
                  const data = await res.json();
                  if (data.success && updateUser) updateUser(data.user);
                  alert(data.message);
                }}
                className="flex items-center gap-2 border border-gray-600 text-gray-400 font-bold uppercase px-6 py-2 hover:border-red-500 hover:text-red-500 transition-all text-sm"
              >
                <ShieldX size={16} /> Decline
              </button>
            </div>
          </div>
        </div>
      )}
      {user && (
        <section className="container mx-auto px-6 py-16 mt-20 relative z-10 border-2 border-accent bg-[#0a0a0a]">
          <h2 className="text-3xl font-black uppercase text-accent mb-4">My Dashboard</h2>
          <p className="text-gray-400 font-mono mb-8">
            Welcome back, <span className="text-white font-bold">{user.name}</span>. 
            You are currently enrolled in <span className="text-accent font-bold text-xl">{user.purchasedCourses?.length || 0}</span> courses.
          </p>
          
          {user.purchasedCourses?.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {user.purchasedCourses.map(courseObj => {
                const c = courseObj.courseId || {};
                const formattedTitle = c.title || 'Unknown Course';
                const slug = c.slug || '#';
                return (
                  <div key={c._id || Math.random()} className="bg-[#111] p-6 border border-gray-800 flex flex-col justify-between group hover:border-accent/50 transition-colors">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="text-white font-bold uppercase">{formattedTitle}</h3>
                        {courseObj.completed && <span className="bg-accent text-black text-xs font-black uppercase px-2 py-1 ml-4 shrink-0">Certified</span>}
                      </div>
                      <p className="text-gray-500 font-mono text-xs uppercase mb-6">Course Progress</p>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-2 items-end">
                        <span className="text-gray-400">Completion</span>
                        <div className="flex items-center gap-4">
                          {courseObj.completed && (
                            <button 
                              onClick={() => downloadCertificate(user.name, formattedTitle)}
                              className="text-accent hover:text-white flex items-center gap-1 font-bold underline decoration-accent/30 hover:decoration-white transition-colors"
                            >
                              <Download size={14} /> Download Certificate
                            </button>
                          )}
                          <span className="text-accent text-lg">{courseObj.progress}%</span>
                        </div>
                      </div>
                      <div className="w-full h-2 bg-black border border-gray-800 relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-full bg-accent transition-all duration-1000" style={{ width: `${courseObj.progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-[#111] p-8 text-center border border-gray-800 font-mono text-gray-500 uppercase tracking-widest">
              No active enrollments found.<br/><br/>
              <span className="text-xs text-gray-600">Browse our premium courses below to get started.</span>
            </div>
          )}
        </section>
      )}

      <section className="bg-[#050505] py-32 relative z-10 border-t border-accent/20 mt-20">
        <div className="container mx-auto px-6">
          <div className="flex items-center justify-between mb-16">
            <h2 className="text-5xl font-black uppercase tracking-tight">Premium <span className="text-accent">Courses</span></h2>
            <div className="h-1 flex-grow mx-8 bg-gradient-to-r from-accent/50 to-transparent"></div>
            <Zap className="text-accent animate-pulse" size={40} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {courses.length > 0 ? courses.map((course, i) => (
              <motion.div 
                key={course._id} initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} viewport={{ once: true }}
                className="bg-[#0a0a0a] border border-gray-800 p-6 hover:border-accent transition-all group cursor-pointer relative overflow-hidden flex flex-col"
                onClick={() => navigate(`/courses/${course.slug}`)}
              >
                <div className="absolute top-0 left-0 w-full h-1 bg-accent transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left"></div>
                <img src={course.image} alt={course.title} className="w-full h-48 object-cover opacity-60 group-hover:opacity-100 transition-opacity mb-6 border border-gray-800 mix-blend-luminosity group-hover:mix-blend-normal" />
                <div className="bg-accent/10 border border-accent/30 text-accent text-xs inline-block px-3 py-1 mb-4 font-mono uppercase font-bold tracking-widest self-start">{course.badge}</div>
                <h3 className="text-3xl font-black mb-4 group-hover:text-accent transition-colors uppercase leading-tight">{course.title}</h3>
                <div className="flex-grow"></div>
                <div className="w-12 h-1 bg-gray-800 mb-6 group-hover:bg-accent transition-colors"></div>
                <div className="flex justify-between items-end">
                  <span className="text-3xl font-bold text-gray-300">{course.price}</span>
                  <button className="text-sm font-bold uppercase tracking-widest text-accent flex items-center gap-2 group-hover:translate-x-2 transition-transform">
                    View Details <ArrowRight size={16}/>
                  </button>
                </div>
              </motion.div>
            )) : (<div className="col-span-3 text-center text-accent font-mono animate-pulse">Loading course data...</div>)}
          </div>
        </div>
      </section>
      
      <section className="py-32 bg-[#080808] border-y border-gray-900 relative z-10 overflow-hidden">
        <div className="container mx-auto px-6 mb-12 flex flex-col items-center text-center">
          <div className="bg-red-500/20 text-red-500 border border-red-500/50 px-4 py-1 text-xs font-bold font-mono tracking-widest uppercase mb-6 inline-flex items-center gap-2">
            <PlayCircle size={14} /> Free Resources
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase">200+ Free <span className="text-transparent border-text-accent" style={{ WebkitTextStroke: '1px #00ff88', color: 'transparent' }}>Tutorials</span></h2>
        </div>
        
        <div className="flex overflow-hidden relative w-full pt-4 pb-12 group hover:[&>div]:!animate-none">
          <motion.div 
            animate={{ x: ["0%", "-50%"] }} 
            transition={{ ease: "linear", duration: 30, repeat: Infinity }} 
            className="flex gap-6 px-3 w-max"
          >
            {[...youtubeVideos, ...youtubeVideos].map((vid, idx) => (
              <div 
                key={`${vid.id}-${idx}`} 
                onClick={() => handleVideoClick(vid.id)}
                className="w-[300px] md:w-[400px] bg-[#111] border border-gray-800 rounded-xl overflow-hidden cursor-pointer shrink-0 hover:-translate-y-2 transition-transform duration-300 relative group/card"
              >
                <div className="h-48 md:h-56 bg-gray-900 relative overflow-hidden flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-[#111] to-transparent z-10"></div>
                  <PlayCircle size={48} className="text-white/50 group-hover/card:text-accent group-hover/card:scale-110 transition-all z-20" />
                  <img src={`https://img.youtube.com/vi/${vid.id}/maxresdefault.jpg`} className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover/card:opacity-100 transition-opacity" alt={vid.title} />
                </div>
                <div className="p-6 relative z-20">
                  <h3 className="font-bold text-lg mb-2 text-gray-200 group-hover/card:text-accent transition-colors line-clamp-2">{vid.title}</h3>
                  <p className="text-sm text-gray-500 font-mono">{vid.views} • By {vid.author}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <section className="bg-[#f0ece1] text-black py-32 relative z-10 border-t-8 border-accent">
        <div className="container mx-auto px-6 text-center">
          <div className="inline-block border-2 border-black px-4 py-1 mb-8 font-black uppercase tracking-widest text-xs">Community</div>
          <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-20 leading-[0.9]">
            They Came.<br/>They Cooked.<br/><span className="text-accent drop-shadow-[2px_2px_0px_#000]">They Got Placed.</span>
          </h2>
          
          <div className="columns-1 md:columns-3 gap-6 max-w-5xl mx-auto space-y-6">
            <div className="bg-gray-300 rounded-2xl overflow-hidden aspect-[3/4] relative border-4 border-black group">
              <img src="/images/success1.webp" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="Student 1" />
              <div className="absolute bottom-4 left-4 bg-accent text-black font-black px-3 py-1 border-2 border-black uppercase text-sm -rotate-3">Hired @ Google</div>
            </div>
            
            <div className="bg-gray-300 rounded-2xl overflow-hidden aspect-square relative border-4 border-black group">
              <img src="/images/success2.webp" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="Student 2" />
              <div className="absolute bottom-4 left-4 bg-white text-black font-black px-3 py-1 border-2 border-black uppercase text-sm rotate-2">SDE 1</div>
            </div>
            
            <div className="bg-accent rounded-2xl overflow-hidden aspect-[3/4] relative border-4 border-black flex flex-col justify-center items-center p-8 text-left">
              <h3 className="text-4xl font-black uppercase mb-4 leading-none">01<br/>Mil</h3>
              <p className="font-bold">Lines of code written by our alumni.</p>
            </div>
            
            <div className="bg-gray-300 rounded-2xl overflow-hidden aspect-[4/3] relative border-4 border-black group">
              <img src="/images/success3.webp" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="Student 3" />
              <div className="absolute bottom-4 right-4 bg-black text-accent font-black px-3 py-1 border-2 border-accent uppercase text-sm rotate-3">Hired @ Microsoft</div>
            </div>
            
             <div className="bg-gray-300 rounded-2xl overflow-hidden aspect-[3/4] relative border-4 border-black group">
              <img src="/images/success1.webp" className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" alt="Student 4" />
              <div className="absolute bottom-4 left-4 bg-black text-accent font-black px-3 py-1 border-2 border-accent uppercase text-sm -rotate-2">Hired @ Amazon</div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
