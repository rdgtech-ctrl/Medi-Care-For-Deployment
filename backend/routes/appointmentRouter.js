import express from 'express';
import { clerkMiddleware, requireAuth } from '@clerk/express';
import {
    cancelAppointment,
    createAppointment,
    getAppointments,
    getAppointmentsByPatient,
    getRegisteredUserCount,
    confirmPayment,
    getStats,
    getAppointmentsByDoctor,
    updateAppointment
} from '../controllers/appointmentController.js';

const appointmentRouter = express.Router();

// Specific routes FIRST
appointmentRouter.get("/stats/summary", getStats);
appointmentRouter.get("/confirm", confirmPayment);
appointmentRouter.get("/success", (req, res) => {
  res.status(200).json({ message: 'Appointment booked successfully' });
});
appointmentRouter.get('/patients/count', getRegisteredUserCount);
appointmentRouter.get('/doctor/:doctorId', getAppointmentsByDoctor);
appointmentRouter.get('/me', clerkMiddleware(), requireAuth(), getAppointmentsByPatient);

// Authenticated POST
appointmentRouter.post('/', clerkMiddleware(), requireAuth(), createAppointment);

// ID-based routes
appointmentRouter.post("/:id/cancel", cancelAppointment);
appointmentRouter.put("/:id", updateAppointment);

// Generic route LAST
appointmentRouter.get("/", getAppointments);

export default appointmentRouter;