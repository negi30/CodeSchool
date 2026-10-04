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
// SCHEMAS & INDEXING
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
      { slug: 'ml-course-2026',     title: 'Machine Learning Deep Dive', price: '₹5999', badge: 'Trending',  schedule: 'Mon-Wed-Fri (7:00 PM)', certificate: 'Yes', language: 'English',  classType: 'Live Classes',      image: '/images/machine.jpg', features: ['200+ hours of live training','Scikit-Learn, TensorFlow','Build Recommendation Systems','Math Foundations','Kaggle Mentorship'] },
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

const makeSlug = (text) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

// Render's free tier blocks outbound SMTP (ports 25/465/587), so in production
// we send over HTTPS via Brevo's API. Locally (no BREVO_API_KEY) we use Gmail SMTP.
const sendMail = async (to, subject, html) => {
  if (process.env.BREVO_API_KEY) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'CodeSchool', email: process.env.EMAIL_USER },
        to: [{ email: to }],
        subject,
        htmlContent: html
      })
    });
    if (!r.ok) {
      const body = await r.text();
      console.error('Brevo send failed:', r.status, body);
      throw new Error(`Email API error ${r.status}`);
    }
    return r.json();
  }
  return transporter.sendMail({ from: `"CodeSchool" <${process.env.EMAIL_USER}>`, to, subject, html });
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
    const courses = await Course.find({ isHidden: { $ne: true } }).sort({ createdAt: -1 });
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

  // 2FA for ALL admins
  if (user.isAdmin) {
    const otp = generateOTP(6);
    user.signupOtp       = otp;
    user.signupOtpExpiry = new Date(Date.now() + OTP_EXPIRY_MS);
    await user.save();
    try {
      await sendMail(user.email, 'Admin 2FA — CodeSchool',
        `<div style="padding:24px;background:#0a0a0a;color:#fff;font-family:monospace;">
          <h2 style="color:#ff4444;">Admin 2FA Code</h2>
          <p>A login attempt was made for the Admin account.</p>
          <h1 style="color:#ff4444;letter-spacing:0.3em;">${otp}</h1>
        </div>`
      );
      return res.json({ success: true, step: '2fa', message: 'Admin 2FA code sent to your email.' });
    } catch {
      return res.status(500).json({ success: false, message: 'Failed to send 2FA email.' });
    }
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

  try {
    const user = await User.create({ name: cleanName, email: key, password: hashPwd(cleanPwd) });
    const safeUser = { _id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin, adminInvitePending: user.adminInvitePending, purchasedCourses: user.purchasedCourses };
    res.json({ success: true, user: safeUser });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    res.status(500).json({ success: false, message: 'Server error during account creation.' });
  }
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
    .populate('purchasedCourses.courseId', 'title slug')
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

  const course = user.purchasedCourses.find(c => String(c.courseId) === String(courseId));
  if (!course) return res.status(404).json({ success: false, message: 'This student does not own that course.' });
  course.progress = safeProgress;
  course.completed = Boolean(completed) || safeProgress === 100;
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
  const { password, _id, ...courseData } = req.body;
  if (!await verifyPassword(req.adminUser._id, password))
    return res.status(401).json({ success: false, message: 'Invalid Admin Password.' });
  try {
    const slug = makeSlug(courseData.slug || courseData.title);
    if (!slug) return res.status(400).json({ success: false, message: 'Course title is required.' });
    if (await Course.exists({ slug }))
      return res.status(409).json({ success: false, message: `A course with the code "${slug}" already exists. Pick a different title.` });
    const c = await Course.create({ ...courseData, slug });
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
