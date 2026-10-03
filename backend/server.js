require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// ============================================================
// DATABASE SCHEMAS (Production Quality)
// ============================================================

// ============================================================
// SYSTEM CACHE (Optimization 1)
// ============================================================
const Cache = {
  courses: null,
  lastFetched: 0,
  TTL_MS: 5 * 60 * 1000 // 5 minutes
};

// ============================================================
// SCHEMAS & INDEXING (Optimization 2)
// ============================================================

const purchasedCourseSchema = new mongoose.Schema({
  courseId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  progress:   { type: Number, default: 0, min: 0, max: 100 },
  completed:  { type: Boolean, default: false },
  enrolledAt: { type: Date, default: Date.now }
}, { _id: false });

const userSchema = new mongoose.Schema({
  name:                { type: String, required: true, trim: true },
  email:               { type: String, required: true, unique: true, lowercase: true, trim: true },
  password:            { type: String, required: true },
  isAdmin:             { type: Boolean, default: false },
  adminInvitePending:  { type: Boolean, default: false },
  adminInvitedBy:      { type: String, default: null },
  purchasedCourses:    [purchasedCourseSchema],
  signupOtp:           { type: String, default: null },
  signupOtpExpiry:     { type: Date,   default: null },
  resetOtp:            { type: String, default: null },
  resetOtpExpiry:      { type: Date,   default: null },
}, { timestamps: true });

// INDEX: Speeds up login queries and admin searches
userSchema.index({ email: 1 });
userSchema.index({ isAdmin: 1 });

const User = mongoose.model('User', userSchema);

const courseSchema = new mongoose.Schema({
  slug:      { type: String, required: true, unique: true, trim: true },
  title:     { type: String, required: true, trim: true },
  price:     { type: String, required: true },
  badge:     { type: String, default: '' },
  schedule:  { type: String, default: '' },
  certificate:{ type: String, default: 'Yes' },
  language:  { type: String, default: 'English' },
  classType: { type: String, default: 'Live Classes' },
  image:     { type: String, required: true },
  features:  [{ type: String }],
  isHidden:  { type: Boolean, default: false },
  modules: [{
    title: String,
    lessons: [{ title: String, videoUrl: String, durationMinutes: Number }]
  }]
}, { timestamps: true });

// INDEX: Speeds up the public storefront fetch
courseSchema.index({ isHidden: 1, createdAt: -1 });

const Course = mongoose.model('Course', courseSchema);

const orderSchema = new mongoose.Schema({
  userId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseIds:     [{ type: mongoose.Schema.Types.ObjectId, ref: 'Course' }],
  totalAmount:   { type: Number, required: true },
  currency:      { type: String, default: 'INR' },
  status:        { type: String, enum: ['success', 'failed', 'pending'], default: 'success' },
}, { timestamps: true });

// INDEX: Speeds up user financial history fetching
orderSchema.index({ userId: 1, createdAt: -1 });

const Order = mongoose.model('Order', orderSchema);

// ============================================================
// DB CONNECT + SEEDING
// ============================================================

mongoose.connect(process.env.MONGO_URI).then(async () => {
  console.log('✅ Connected to MongoDB Atlas!');

  // Seed courses
  const courseCount = await Course.countDocuments();
  if (courseCount === 0) {
    await Course.insertMany([
      { slug: 'agentic-ai-2026',    title: 'Gen & Agentic AI Cohort',    price: '₹7999', badge: 'Job Ready!', schedule: 'Sat-Sun (10:00 AM)', certificate: 'Yes', language: 'Hinglish', classType: 'Live Classes',      image: '/images/ai.webp',      features: ['Build Autonomous AI Agents','LangChain, LlamaIndex','RAG Implementation','Deploy Production LLM Apps','Startup Funding'] },
      { slug: 'ml-course-2026',     title: 'Machine Learning Deep Dive', price: '₹5999', badge: 'Trending',  schedule: 'Mon-Wed-Fri (7:00 PM)', certificate: 'Yes', language: 'English',  classType: 'Live Classes',      image: '/images/machine.webp', features: ['200+ hours of live training','Scikit-Learn, TensorFlow','Build Recommendation Systems','Math Foundations','Kaggle Mentorship'] },
      { slug: 'fullstack-mern-2026',title: 'Full Stack Web Mastery',     price: '₹4999', badge: 'Bestseller',schedule: 'Mon-Sat (8:30 PM)',     certificate: 'Yes', language: 'Hinglish', classType: 'Live & Recorded', image: '/images/webdev.webp',  features: ['MERN Stack + Next.js','Build 10 Real SaaS Products','System Design & Microservices','AWS & Docker','100% Placement'] }
    ]);
    console.log('✅ Seeded initial courses!');
  }

  // Seed first admin
  const adminCount = await User.countDocuments();
  if (adminCount === 0) {
    await User.create({
      name: 'Neil Admin',
      email: 'neilnegi13@gmail.com',
      password: hashPwd(process.env.ADMIN_PASSWORD || 'admin123'),
      isAdmin: true
    });
    console.log('✅ Seeded admin!');
  }
}).catch(err => console.error('❌ MongoDB error:', err));

// ============================================================
// UTILITIES
// ============================================================

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  connectionTimeout: 8000,
  greetingTimeout: 8000,
  socketTimeout: 8000
});

const sendMail = async (to, subject, html) => {
  return await Promise.race([
    transporter.sendMail({ from: `"CodeSchool" <${process.env.EMAIL_USER || 'noreply@codeschool.com'}>`, to, subject, html }),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Email connection timed out. Check EMAIL_USER and EMAIL_PASS on Render.')), 8000))
  ]);
};

// Per-user admin session tokens: Map<userId, token>
const adminSessions = new Map();

const generateToken = () => crypto.randomBytes(64).toString('hex');
const generateOTP   = (len = 6) => Math.floor(10 ** (len - 1) + Math.random() * 9 * 10 ** (len - 1)).toString();
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

// ============================================================
// MIDDLEWARE
// ============================================================

// Requires valid per-user admin session token
const isAdmin = async (req, res, next) => {
  const token  = req.headers['x-admin-token'];
  const userId = req.headers['x-user-id'];
  if (!token || !userId || adminSessions.get(userId) !== token) {
    return res.status(403).json({ success: false, message: 'SECURITY BREACH: Unauthorized Admin Access Attempt.' });
  }
  const user = await User.findById(userId);
  if (!user || !user.isAdmin) {
    adminSessions.delete(userId); // revoke stale session
    return res.status(403).json({ success: false, message: 'SECURITY BREACH: Admin privileges revoked.' });
  }
  req.adminUser = user;
  next();
};

// ============================================================
// PUBLIC COURSE APIs
// ============================================================

app.get('/api/courses', async (req, res) => {
  try {
    // CACHE HIT: Return from RAM instantly if within TTL
    if (Cache.courses && Date.now() - Cache.lastFetched < Cache.TTL_MS) {
      return res.json(Cache.courses);
    }
    
    // CACHE MISS: Query DB, then store in RAM
    // (Uses the new compound index we just added)
    const courses = await Course.find({ isHidden: { $ne: true } }).sort({ createdAt: -1 });
    Cache.courses = courses;
    Cache.lastFetched = Date.now();
    
    res.json(courses);
  } catch { res.status(500).json({ message: 'Failed to fetch courses' }); }
});

app.get('/api/courses/:slug', async (req, res) => {
  try {
    const course = await Course.findOne({ slug: req.params.slug, isHidden: { $ne: true } });
    if (course) res.json(course);
    else res.status(404).json({ message: 'Course not found' });
  } catch { res.status(500).json({ message: 'Server Error' }); }
});

// ============================================================
// AUTH APIs
// ============================================================

// FIX 2: Password Hashing (with legacy fallback for existing plaintext demo accounts)
const hashPwd = (pwd) => crypto.createHash('sha256').update(pwd).digest('hex');

// Password verification helper (used by middleware and endpoints)
const verifyPassword = async (userId, pwd) => {
  const u = await User.findById(userId);
  return u && (u.password === pwd || u.password === hashPwd(pwd));
};

// --- LOGIN ---
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' });

  const user = await User.findOne({ email: email.toLowerCase().trim() }).populate('purchasedCourses.courseId', 'title slug image');
  if (!user) return res.status(404).json({ success: false, message: 'Account not found. Please sign up.' });
  
  if (user.password !== password && user.password !== hashPwd(password)) 
    return res.status(401).json({ success: false, message: 'Incorrect password.' });

  // Admin Direct Login (No SMTP 2FA block needed)
  if (user.isAdmin) {
    const token = generateToken();
    adminSessions.set(user._id.toString(), token);
    const safeUser = { 
      _id: user._id, 
      name: user.name, 
      email: user.email, 
      isAdmin: true, 
      adminInvitePending: false, 
      adminInvitedBy: null, 
      purchasedCourses: user.purchasedCourses, 
      adminToken: token 
    };
    return res.json({ success: true, user: safeUser });
  }

  const safeUser = { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, adminInvitePending: user.adminInvitePending, adminInvitedBy: user.adminInvitedBy, purchasedCourses: user.purchasedCourses };
  res.json({ success: true, user: safeUser });
});

// --- ADMIN 2FA VERIFY ---
app.post('/api/auth/verify-2fa', async (req, res) => {
  const { email, otp } = req.body;
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user || !user.signupOtp || user.signupOtpExpiry < new Date())
    return res.status(400).json({ success: false, message: 'OTP expired or invalid.' });

  if (user.signupOtp !== otp) {
    user.signupOtp = null; user.signupOtpExpiry = null; await user.save();
    return res.status(401).json({ success: false, message: 'Invalid 2FA code. Code destroyed for security.' });
  }

  user.signupOtp = null; user.signupOtpExpiry = null; await user.save();
  const token = generateToken();
  adminSessions.set(user._id.toString(), token);

  const safeUser = { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, adminInvitePending: user.adminInvitePending, adminInvitedBy: user.adminInvitedBy, purchasedCourses: user.purchasedCourses, adminToken: token };
  res.json({ success: true, user: safeUser });
});

const pendingSignups = {}; // email -> { otp, expiry, lastSent }

// --- SIGN UP: SEND OTP ---
app.post('/api/auth/send-otp', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Email required.' });

  const cleanEmail = email.toLowerCase().trim();
  const existing = await User.findOne({ email: cleanEmail });
  if (existing) return res.status(409).json({ success: false, message: 'Email already registered.' });

  // FIX 4: Rate Limiting to prevent SMTP spam (60-second cooldown)
  const pending = pendingSignups[cleanEmail];
  if (pending && Date.now() - pending.lastSent < 60000) {
    return res.status(429).json({ success: false, message: 'Please wait 60 seconds before requesting another code.' });
  }

  const otp = generateOTP(4);
  pendingSignups[cleanEmail] = { otp, expiry: Date.now() + OTP_EXPIRY_MS, lastSent: Date.now() };

  try {
    await sendMail(cleanEmail, 'CodeSchool Signup Code', `<h1>${otp}</h1>`);
    res.json({ success: true, message: 'Verification code sent!' });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to send email.' });
  }
});

// --- SIGN UP: VERIFY OTP ---
app.post('/api/auth/verify-otp', async (req, res) => {
  const { name, email, password, otp } = req.body;
  const key = email?.toLowerCase().trim();
  const cleanName = name?.trim();
  const cleanPwd = password?.trim();

  // FIX 7: Empty String Registration Crash
  if (!cleanName || !cleanPwd || cleanPwd.length < 6) {
    return res.status(400).json({ success: false, message: 'Valid name and 6+ char password required.' });
  }

  if (!pendingSignups[key]) return res.status(400).json({ success: false, message: 'No pending signup.' });
  if (Date.now() > pendingSignups[key].expiry) {
    delete pendingSignups[key];
    return res.status(400).json({ success: false, message: 'Code expired.' });
  }
  if (pendingSignups[key].otp !== otp) {
    delete pendingSignups[key];
    return res.status(401).json({ success: false, message: 'Invalid code. Destroyed for security.' });
  }
  delete pendingSignups[key];

  const user = await User.create({ name: cleanName, email: key, password: hashPwd(cleanPwd) });
  const safeUser = { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, adminInvitePending: user.adminInvitePending, purchasedCourses: user.purchasedCourses };
  res.json({ success: true, user: safeUser });
});

// --- FORGOT PASSWORD: SEND OTP ---
app.post('/api/auth/forgot-password', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase().trim() });
  
  // FIX 3: Email Enumeration Prevention (Always return 200 generic message)
  if (!user) return res.json({ success: true, message: 'If that email exists, a reset code was sent.' });

  const otp = generateOTP(6);
  user.resetOtp = otp;
  user.resetOtpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
  await user.save();

  try {
    await sendMail(email, 'Reset CodeSchool Password', `<h1>${otp}</h1>`);
  } catch {} // Ignore mail errors to not leak existence

  res.json({ success: true, message: 'If that email exists, a reset code was sent.' });
});

// --- FORGOT PASSWORD: VERIFY OTP + SET NEW PASSWORD ---
app.post('/api/auth/reset-password', async (req, res) => {
  const { email, otp, newPassword } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase().trim() });
  if (!user || !user.resetOtp || user.resetOtpExpiry < new Date())
    return res.status(400).json({ success: false, message: 'Code expired or invalid.' });

  if (user.resetOtp !== otp) {
    user.resetOtp = null; user.resetOtpExpiry = null; await user.save();
    return res.status(401).json({ success: false, message: 'Invalid code. Destroyed for security.' });
  }

  const cleanPwd = newPassword?.trim();
  if (!cleanPwd || cleanPwd.length < 6)
    return res.status(400).json({ success: false, message: 'Password must be at least 6 chars.' });

  user.password = hashPwd(cleanPwd);
  user.resetOtp = null;
  user.resetOtpExpiry = null;
  adminSessions.delete(user._id.toString());
  await user.save();

  res.json({ success: true, message: 'Password reset successfully.' });
});

// ============================================================
// CHECKOUT API
// ============================================================

app.post('/api/checkout', async (req, res) => {
  const { email, courseIds } = req.body;
  if (!courseIds || courseIds.length === 0) return res.status(400).json({ success: false, message: 'No courses provided.' });

  const user = await User.findOne({ email: email?.toLowerCase().trim() });
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  // STRICT VALIDATION: Ensure all requested courses actually exist and are NOT hidden
  const validCourses = await Course.find({ _id: { $in: courseIds }, isHidden: { $ne: true } });
  const validCourseIds = validCourses.map(c => c._id.toString());

  if (validCourseIds.length === 0) {
    return res.status(400).json({ success: false, message: 'Invalid or hidden courses cannot be purchased.' });
  }

  let totalAmount = 0;
  validCourses.forEach(c => {
    const match = c.price.match(/-?\d+/);
    const num = match ? parseInt(match[0], 10) : 0;
    totalAmount += Math.max(0, num);
  });

  // ARCHITECTURAL UPGRADE: Financial Ledger
  await Order.create({
    userId: user._id,
    courseIds: validCourseIds,
    totalAmount
  });

  validCourseIds.forEach(id => {
    if (!user.purchasedCourses.find(c => c.courseId.toString() === id)) {
      user.purchasedCourses.push({ courseId: id, progress: 0, completed: false });
    }
  });
  await user.save();
  await user.populate('purchasedCourses.courseId', 'title slug image');

  const safeUser = { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, adminInvitePending: user.adminInvitePending, adminInvitedBy: user.adminInvitedBy, purchasedCourses: user.purchasedCourses };
  res.json({ success: true, user: safeUser });
});

// ============================================================
// SYNC API (Get latest user state)
// ============================================================

app.post('/api/auth/me', async (req, res) => {
  const { email } = req.body;
  const token = req.headers['x-admin-token'];
  const user = await User.findOne({ email: email?.toLowerCase().trim() }).populate('purchasedCourses.courseId', 'title slug image');
  if (!user) return res.status(404).json({ success: false });
  
  // Verify if the token provided is still active in the server's RAM
  const validAdminSession = Boolean(user.isAdmin && token && adminSessions.get(user._id.toString()) === token);
  
  const safeUser = { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, adminInvitePending: user.adminInvitePending, adminInvitedBy: user.adminInvitedBy, purchasedCourses: user.purchasedCourses };
  res.json({ success: true, user: safeUser, validAdminSession });
});

// ============================================================
// ADMIN APIs (all protected by isAdmin middleware)
// ============================================================

// Get all users
app.get('/api/admin/users', isAdmin, async (req, res) => {
  // PAGINATION IMPLEMENTATION (Optimization 3)
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50; // default 50 users per page
  const skip = (page - 1) * limit;

  const users = await User.find({}, '-password -resetOtp -resetOtpExpiry -signupOtp -signupOtpExpiry')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
  const totalUsers = await User.countDocuments();
  
  res.json({
    users,
    pagination: {
      total: totalUsers,
      page,
      limit,
      pages: Math.ceil(totalUsers / limit)
    }
  });
});

// Update student progress
app.put('/api/admin/users/:userId/progress', isAdmin, async (req, res) => {
  const { courseId, progress, completed } = req.body;
  const user = await User.findById(req.params.userId);
  if (!user) return res.status(404).json({ success: false, message: 'User not found.' });

  // BOUNDARY CHECK: Ensure progress is between 0 and 100
  const safeProgress = Math.max(0, Math.min(100, parseInt(progress) || 0));

  const course = user.purchasedCourses.find(c => c.courseId === courseId);
  if (course) { course.progress = safeProgress; course.completed = completed; }
  await user.save();
  res.json({ success: true });
});


// Invite a user to become admin
app.post('/api/admin/invite', isAdmin, async (req, res) => {
  const { targetEmail, password } = req.body;
  if (!targetEmail) return res.status(400).json({ success: false, message: 'Target email is required.' });

  // Require admin password confirmation before sending invite
  if (!await verifyPassword(req.adminUser._id, password))
    return res.status(401).json({ success: false, message: 'Invalid Admin Password. Invite not sent.' });

  const target = await User.findOne({ email: targetEmail.toLowerCase().trim() });
  if (!target) return res.status(404).json({ success: false, message: 'No user found with that email.' });
  if (target.isAdmin) return res.status(400).json({ success: false, message: 'User is already an admin.' });
  if (target.adminInvitePending) return res.status(400).json({ success: false, message: 'Invite already pending for this user.' });

  target.adminInvitePending = true;
  target.adminInvitedBy     = req.adminUser.email;
  await target.save();

  try {
    await sendMail(target.email, 'You have been invited to become a CodeSchool Admin!',
      `<div style="padding:24px;background:#0a0a0a;color:#fff;font-family:monospace;">
        <h2 style="color:#00ff88;">CodeSchool Admin Invite</h2>
        <p><strong>${req.adminUser.name}</strong> (${req.adminUser.email}) has invited you to become a CodeSchool Admin.</p>
        <p style="color:#888;">Log in to your account to accept or decline this invitation.</p>
      </div>`
    );
  } catch { /* Mail failure is non-blocking */ }

  res.json({ success: true, message: `Invite sent to ${target.email}` });
});



// User approves or declines admin invite
app.post('/api/admin/respond-invite', async (req, res) => {
  const { userId, accept, password } = req.body;
  if (!password) return res.status(400).json({ success: false, message: 'Password is required to respond to invite.' });

  if (!await verifyPassword(userId, password))
    return res.status(401).json({ success: false, message: 'Invalid password.' });

  const user = await User.findById(userId);
  if (!user || !user.adminInvitePending)
    return res.status(400).json({ success: false, message: 'No pending invite found.' });

  if (accept) {
    user.isAdmin            = true;
    user.adminInvitePending = false;
    user.adminInvitedBy     = null;
    await user.save();

    // Immediately issue an admin session token — no re-login needed
    const token = generateToken();
    adminSessions.set(user._id.toString(), token);

    const safeUser = { _id: user._id, name: user.name, email: user.email, isAdmin: true, adminInvitePending: false, adminInvitedBy: null, purchasedCourses: user.purchasedCourses, adminToken: token };
    return res.json({ success: true, user: safeUser, message: 'You are now an Admin! The Admin Panel is now available in your navigation bar.' });
  } else {
    user.adminInvitePending = false;
    user.adminInvitedBy     = null;
    await user.save();

    const safeUser = { _id: user._id, name: user.name, email: user.email, isAdmin: false, adminInvitePending: false, adminInvitedBy: null, purchasedCourses: user.purchasedCourses };
    return res.json({ success: true, user: safeUser, message: 'Invite declined.' });
  }
});



// Revoke admin from a user
app.put('/api/admin/revoke/:userId', isAdmin, async (req, res) => {
  const { password } = req.body;
  if (!await verifyPassword(req.adminUser._id, password))
    return res.status(401).json({ success: false, message: 'Invalid Admin Password.' });

  const target = await User.findById(req.params.userId);
  if (!target) return res.status(404).json({ success: false, message: 'User not found.' });
  if (target._id.toString() === req.adminUser._id.toString())
    return res.status(400).json({ success: false, message: 'You cannot revoke your own admin access.' });

  target.isAdmin = false;
  adminSessions.delete(target._id.toString()); // Invalidate their session
  await target.save();
  res.json({ success: true, message: `Admin access revoked for ${target.email}` });
});

// Get all courses (admin — includes hidden)
app.get('/api/admin/courses', isAdmin, async (req, res) => {
  const courses = await Course.find({});
  res.json(courses);
});

// Add course
app.post('/api/admin/courses', isAdmin, async (req, res) => {
  const { password, ...courseData } = req.body;
  if (!await verifyPassword(req.adminUser._id, password))
    return res.status(401).json({ success: false, message: 'Invalid Admin Password.' });
  try {
    const c = await Course.create(courseData);
    Cache.courses = null; // INVALIDATE CACHE
    res.json({ success: true, course: c });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Edit course
app.put('/api/admin/courses/:id', isAdmin, async (req, res) => {
  const { password, ...updateData } = req.body;
  if (!await verifyPassword(req.adminUser._id, password))
    return res.status(401).json({ success: false, message: 'Invalid Admin Password.' });
  try {
    const c = await Course.findByIdAndUpdate(req.params.id, updateData, { new: true });
    Cache.courses = null; // INVALIDATE CACHE
    res.json({ success: true, course: c });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete course
app.delete('/api/admin/courses/:id', isAdmin, async (req, res) => {
  const { password } = req.body;
  if (!await verifyPassword(req.adminUser._id, password))
    return res.status(401).json({ success: false, message: 'Invalid Admin Password.' });
  try {
    await Course.findByIdAndDelete(req.params.id);
    Cache.courses = null; // INVALIDATE CACHE
    // ORPHAN FIX: Remove this course from all users' purchasedCourses arrays
    await User.updateMany(
      { 'purchasedCourses.courseId': req.params.id },
      { $pull: { purchasedCourses: { courseId: req.params.id } } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
