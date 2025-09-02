const mongoose = require('mongoose');
const express = require('express');
const cors = require('cors');
const path = require('path');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json()); // Handles JSON
app.use(express.urlencoded({ extended: true })); // Handles form submissions
app.use(express.static(path.join(__dirname, 'public')));

// MongoDB connection
mongoose.connect('mongodb://127.0.0.1:27017/wanderlustDB', {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log("✅ Connected to MongoDB"))
.catch(err => console.error("❌ MongoDB connection error:", err));

// Contact schema
const contactSchema = new mongoose.Schema({
  name: String,
  email: String,
  message: String,
  submittedAt: { type: Date, default: Date.now }
});
const Contact = mongoose.model('Contact', contactSchema);

// Favourite schema
const favouriteSchema = new mongoose.Schema({
  name: String,
  description: String,
  addedAt: { type: Date, default: Date.now }
});
const Favourite = mongoose.model('Favourite', favouriteSchema);

// Routes
app.get('/', (req, res) => {
  res.send('✅ Wanderlust backend is running!');
});

// Contact form submission
app.post('/contact', [
  body('name').notEmpty().withMessage('Name is required.'),
  body('email').isEmail().withMessage('A valid email is required.'),
  body('message').notEmpty().withMessage('Please enter a message.')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array().map(e => e.msg) });
  }

  const { name, email, message } = req.body;
  try {
    await new Contact({ name, email, message }).save();
    res.json({ success: true, message: 'Thank you for contacting us!' });
  } catch (err) {
    console.error("Error saving to DB:", err);
    res.status(500).json({ success: false, message: 'Server error, please try again.' });
  }
});

// Add to favourites (with duplicate prevention)
app.post('/favourites', async (req, res) => {
  const { name, description } = req.body;

  if (!name || !description) {
    return res.status(400).json({ success: false, message: 'Name and description are required.' });
  }

  try {
    const existing = await Favourite.findOne({ name });
    if (existing) {
      return res.status(409).json({ success: false, message: 'This place is already in your favourites.' });
    }

    const newFav = new Favourite({ name, description });
    await newFav.save();
    res.status(201).json({ success: true, message: '✅ Added to Favourites!' });
  } catch (err) {
    console.error('Error saving favourite:', err);
    res.status(500).json({ success: false, message: 'Server error while saving favourite.' });
  }
});

// Delete favourite
app.delete('/favourites/:id', async (req, res) => {
  try {
    await Favourite.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: '❌ Favourite deleted.' });
  } catch (err) {
    console.error('Error deleting favourite:', err);
    res.status(500).json({ success: false, message: 'Server error while deleting favourite.' });
  }
});

// Fetch favourites
app.get('/favourites', async (req, res) => {
  try {
    const allFavs = await Favourite.find().sort({ addedAt: -1 });
    res.json(allFavs);
  } catch (err) {
    console.error('Error fetching favourites:', err);
    res.status(500).json({ success: false, message: 'Could not fetch favourites.' });
  }
});

// Fetch contact submissions
app.get('/submissions', async (req, res) => {
  try {
    const allSubmissions = await Contact.find().sort({ submittedAt: -1 });
    res.json(allSubmissions);
  } catch (err) {
    console.error("Error fetching submissions:", err);
    res.status(500).json({ success: false, message: 'Could not fetch submissions' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
