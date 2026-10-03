import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle2, Calendar, Award, Languages, Video, ArrowRight, ShoppingCart, CheckCircle } from 'lucide-react';

export default function CoursePage({ user, cart, openAuth, addToCart }) {
  const { id } = useParams();
  const [course, setCourse] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`/api/courses/${id}`)
      .then(res => res.json())
      .then(data => setCourse(data))
      .catch(err => console.error(err));
  }, [id]);

  if (!course) return <div className="min-h-screen flex items-center justify-center text-accent font-mono animate-pulse">Loading Course Data...</div>;

  const isOwned = user?.purchasedCourses?.some(c => {
    const pId = typeof c.courseId === 'object' ? c.courseId._id : c.courseId;
    return pId === course._id;
  });
  const isInCart = cart?.some(c => c._id === course._id);

  const handleAction = () => {
    if (isOwned) {
      alert("You already own this course! Head to your dashboard.");
      return navigate('/');
    }
    if (isInCart) {
      return alert("This course is already in your cart!");
    }
    addToCart(course);
  };

  return (
    <div className="min-h-screen container mx-auto px-6 py-12 relative z-10 flex flex-col lg:flex-row gap-12 items-start">
      <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="lg:w-2/3 w-full">
        <div className="rounded-3xl overflow-hidden border border-gray-800 relative group aspect-video bg-[#0a0a0a]">
          <img src={course.image} className="w-full h-full object-cover opacity-60 mix-blend-luminosity group-hover:mix-blend-normal transition-all duration-700" alt="Course Thumbnail" />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>
          
          <button className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black/50 backdrop-blur-md rounded-full p-4 border border-accent/50 text-accent hover:scale-110 hover:bg-accent hover:text-black transition-all">
            <Video size={48} fill="currentColor" />
          </button>

          <div className="absolute bottom-8 left-8">
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase drop-shadow-lg">{course.title}</h2>
            <div className="bg-accent text-black font-black uppercase tracking-widest text-xs px-3 py-1 inline-block mt-2 -skew-x-12">{course.badge}</div>
          </div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="lg:w-1/3 w-full bg-[#0a0a0a] border border-gray-800 rounded-3xl p-8 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/10 blur-[50px] rounded-full pointer-events-none"></div>

        <div className="flex flex-wrap gap-3 mb-8">
          <div className="bg-[#111] border border-gray-800 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-gray-300 font-mono"><Calendar size={14} className="text-accent"/> Schedule: {course.schedule}</div>
          <div className="bg-[#111] border border-gray-800 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-gray-300 font-mono"><Award size={14} className="text-accent"/> Certificate: {course.certificate}</div>
          <div className="bg-[#111] border border-gray-800 px-3 py-1.5 rounded-full flex items-center gap-2 text-xs text-gray-300 font-mono"><Languages size={14} className="text-accent"/> Language: {course.language}</div>
        </div>

        <div className="space-y-4 mb-8">
          <div className="flex items-center gap-3"><span className="text-xl font-bold">👤 Build Real Products</span></div>
          <div className="flex items-center gap-3"><span className="text-xl font-bold">☁️ Certification Included</span></div>
        </div>

        <div className="flex items-center gap-4 mb-8">
          <div className="h-px bg-gray-800 flex-grow"></div>
          <span className="text-gray-500 font-mono text-sm uppercase tracking-widest">The Next Big Thing+</span>
          <div className="h-px bg-gray-800 flex-grow"></div>
        </div>

        <div className="space-y-4 mb-10">
          {course.features.map((f, i) => (
             <div key={i} className="flex items-start gap-3">
               <CheckCircle2 size={20} className="text-white shrink-0 mt-0.5" />
               <span className="text-gray-300 font-medium">{f}</span>
             </div>
          ))}
        </div>

        <div className="flex flex-col gap-4">
          <button 
            onClick={handleAction} 
            disabled={isOwned || isInCart}
            className={`w-full font-bold text-lg py-4 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2
              ${isOwned ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 
                isInCart ? 'bg-accent/20 text-accent border border-accent cursor-not-allowed' :
                'bg-[#35874c] hover:bg-[#4ade80] text-white shadow-[0_0_20px_rgba(74,222,128,0.2)]'
              }`}
          >
            {isOwned ? (
              <> <CheckCircle size={20} /> Already Owned </>
            ) : isInCart ? (
              <> <ShoppingCart size={20} /> In Cart </>
            ) : (
              <> <ShoppingCart size={20} /> Add to Cart </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
