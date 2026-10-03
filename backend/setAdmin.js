require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    const userSchema = new mongoose.Schema({
      name: String, email: String, password: { type: String, required: false }, purchasedCourses: Array
    }, { strict: false });
    const User = mongoose.model('User', userSchema);
    
    let admin = await User.findOne({ email: 'neilnegi13@gmail.com' });
    if (admin) {
      admin.password = 'admin123';
      await admin.save();
      console.log('✅ Updated existing admin password to: admin123');
    } else {
      await User.create({ name: 'Admin', email: 'neilnegi13@gmail.com', password: 'admin123', purchasedCourses: [] });
      console.log('✅ Created new admin account with password: admin123');
    }
    process.exit(0);
  });
