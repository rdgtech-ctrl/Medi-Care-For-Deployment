import express from 'express'
import ServiceAppointment from '../models/serviceAppointment.js'
import Service from '../models/service.js'

const router = express.Router();

// GET /api/service-appointments?limit=500
router.get("/", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;

        const appointments = await ServiceAppointment.find()
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({ success: true, appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/service-appointments/me
router.get("/me", async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;

        const appointments = await ServiceAppointment.find()
            .sort({ createdAt: -1 })
            .limit(limit);

        res.json({ success: true, appointments });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get("/stats/summary", async (req, res) => {
    try {
        const [total, pending, confirmed, rescheduled, completed, canceled] = await Promise.all([
            ServiceAppointment.countDocuments(),
            ServiceAppointment.countDocuments({ status: "Pending" }),
            ServiceAppointment.countDocuments({ status: "Confirmed" }),
            ServiceAppointment.countDocuments({ status: "Rescheduled" }),
            ServiceAppointment.countDocuments({ status: "Completed" }),
            ServiceAppointment.countDocuments({ status: "Canceled" }),
        ]);
        res.json({ success: true, data: { total, pending, confirmed, rescheduled, completed, canceled } });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// replace this entire route
router.get("/stats/by-service", async (req, res) => {
    try {
        const services = await Service.find()
            .select("name price imageUrl totalAppointments completed canceled")
            .sort({ totalAppointments: -1 });

        const appointmentStats = await ServiceAppointment.aggregate([
            {
                $group: {
                    _id: "$serviceId",
                    total: { $sum: 1 },
                    completed: { $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] } },
                    canceled: { $sum: { $cond: [{ $eq: ["$status", "Canceled"] }, 1, 0] } },
                }
            }
        ]);

        const statsMap = {};
        appointmentStats.forEach(s => { statsMap[String(s._id)] = s; });

        const rows = services.map(s => {
            const live = statsMap[String(s._id)] || { total: 0, completed: 0, canceled: 0 };
            return {
                _id: s._id,
                serviceName: s.name,
                fees: s.price,
                imageUrl: s.imageUrl,
                total: live.total,
                completed: live.completed,
                canceled: live.canceled,
            };
        });

        res.json({ success: true, data: rows });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;