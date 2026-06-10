const express = require('express');
const Appointment = require('../models/Appointment');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Get user appointments
router.get('/my-appointments', protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({ customerId: req.user._id })
      .sort({ date: -1 });
    res.json({ success: true, data: appointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Create appointment
router.post('/', protect, async (req, res) => {
  try {
    const appointment = await Appointment.create({
      ...req.body,
      customerId: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email
    });
    res.status(201).json({ success: true, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;