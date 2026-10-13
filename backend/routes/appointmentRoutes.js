
// backend/routes/appointmentRoutes.js

const express = require('express');
const Appointment = require('../models/Appointment');
const { protect, admin } = require('../middleware/auth');

const router = express.Router();


// @desc    Get user's appointment history
// @route   GET /api/appointments/my-appointments
// @access  Private
router.get('/my-appointments', protect, async (req, res) => {
  try {
    const appointments = await Appointment.find({
      customerId: req.user._id
    }).sort({ createdAt: -1 });

    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// @desc    Get all users' appointment history
// @route   GET /api/appointments/admin/all
// @access  Admin only
router.get('/admin/all', protect, admin, async (req, res) => {
  try {
    const appointments = await Appointment.find({})
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: appointments
    });
  } catch (error) {
    console.error('Admin appointment history error:', error);

    res.status(500).json({
      success: false,
      message: 'Failed to fetch appointment history'
    });
  }
});


// @desc    Create appointment record (called after token generation)
// @route   POST /api/appointments
// @access  Private
router.post('/', protect, async (req, res) => {
  try {
    const {
      tokenId,
      service,
      serviceType,
      branch,
      city,
      date,
      time
    } = req.body;

    if (
      !tokenId ||
      !service ||
      !serviceType ||
      !branch ||
      !date ||
      !time
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }

    const appointment = await Appointment.create({
      tokenId,
      service,
      serviceType,
      branch,
      city: city || '',
      date: new Date(date),
      time,
      customerId: req.user._id,
      customerName: req.user.name,
      customerEmail: req.user.email,
      status: 'waiting'
    });

    res.status(201).json({
      success: true,
      data: appointment
    });
  } catch (error) {
    console.error('Create appointment error:', error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


// @desc    Cancel an appointment by MongoDB ID
// @route   PUT /api/appointments/:id/cancel
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const appointment = await Appointment.findOne({
      _id: req.params.id,
      customerId: req.user._id
    });

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found'
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    res.json({
      success: true,
      data: appointment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});


module.exports = router;
