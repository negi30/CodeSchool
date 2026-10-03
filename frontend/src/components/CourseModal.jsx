import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, CheckCircle2 } from 'lucide-react';

export default function CourseModal({ course, isOpen, onClose, onJoinClick }) {
  if (!isOpen || !course) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4">
        <motion.div 
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="bg-[#0a0a0a] border border-gray-800 sm:rounded-3xl rounded-t-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative flex flex-col sm:flex-row"
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors bg-black/50 rounded-full p-1 z-10">
            <X size={24} />
          </button>

          {/* Left side - Visuals */}
          <div className="sm:w-1/2 bg-[#111] p-8 flex flex-col justify-center items-center border-b sm:border-b-0 sm:border-r border-gray-800">
            <div className="bg-primary/20 p-8 rounded-full mb-6 border border-accent/20">
               {/* Placeholder for course icon/image */}
               <div className="w-32 h-32 bg-primary rounded-full flex items-center justify-center text-accent font-bold text-4xl">
                 {course.title.substring(0, 1)}
               </div>
            </div>
            <div className="bg-primary text-accent text-sm px-4 py-1 rounded-full font-bold uppercase tracking-wider">
              {course.badge}
            </div>
          </div>

          {/* Right side - Details */}
          <div className="sm:w-1/2 p-8 sm:p-12">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{course.title}</h2>
            <p className="text-gray-400 mb-8 text-lg">Master the skills required to become a top-tier developer with this comprehensive, project-based curriculum.</p>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center text-gray-300">
                <CheckCircle2 size={20} className="text-accent mr-3" /> Live Classes & Recordings
              </div>
              <div className="flex items-center text-gray-300">
                <CheckCircle2 size={20} className="text-accent mr-3" /> Real-world Projects
              </div>
              <div className="flex items-center text-gray-300">
                <CheckCircle2 size={20} className="text-accent mr-3" /> Doubt Support
              </div>
            </div>

            <div className="flex items-center justify-between mb-8 pb-8 border-b border-gray-800">
              <div>
                <p className="text-gray-500 text-sm mb-1">One-time payment</p>
                <p className="text-4xl font-bold text-accent">{course.price}</p>
              </div>
            </div>

            <button 
              onClick={onJoinClick}
              className="w-full bg-accent text-black font-extrabold text-lg py-4 rounded-xl hover:bg-green-400 transition-all shadow-[0_0_20px_rgba(0,255,136,0.2)] transform hover:scale-[1.02]"
            >
              Join Course Now
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
