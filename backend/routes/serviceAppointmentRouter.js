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

// POST /api/service-appointments
router.post("/", async (req, res) => {
    try {
        const {
            // Patient info
            createdBy,
            patientName,
            mobile,
            age,
            gender,

            // Service info
            serviceId,
            serviceName,
            serviceImage,

            fees,

            // Schedule — stored as separate fields (NOT a time string)
            date,
            hour,
            minute,
            ampm,

            // Payment nested object
            payment,

            status,
        } = req.body;

        // Validation — required by schema
        if (!patientName || !mobile || !serviceId || !serviceName || !date ||
            hour === undefined || minute === undefined || !ampm || fees === undefined) {
            return res.status(400).json({
                success: false,
                message: "Missing required fields: patientName, mobile, serviceId, serviceName, date, hour, minute, ampm, fees"
            });
        }

        const appointment = new ServiceAppointment({
            createdBy: createdBy || null,
            patientName,
            mobile,
            age: age ? Number(age) : undefined,
            gender: gender || "",

            serviceId,
            serviceName,
            serviceImage: {
                url: serviceImage?.url || "",
                publicId: serviceImage?.publicId || "",
            },

            fees: Number(fees),

            date,
            hour: Number(hour),
            minute: Number(minute),
            ampm,

            payment: {
                method: payment?.method || "Cash",
                status: payment?.status || "Pending",
                amount: Number(payment?.amount ?? fees),
                providerId: payment?.providerId || "",
                sessionId: payment?.sessionId || "",
            },

            status: status || "Pending",
        });

        await appointment.save();
        res.status(201).json({ success: true, appointment });

    } catch (error) {
        console.error("POST /api/service-appointments error:", error);
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

// GET /api/service-appointments/stats/summary
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

// GET /api/service-appointments/stats/by-service
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

// PUT /api/service-appointments/:id  (status update / reschedule)
router.put("/:id", async (req, res) => {
    try {
        const { id } = req.params;
        const { status, rescheduledTo } = req.body;

        const appointment = await ServiceAppointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        if (appointment.status === "Completed" || appointment.status === "Canceled") {
            return res.status(400).json({ success: false, message: `Cannot update a ${appointment.status} appointment` });
        }

        if (status) appointment.status = status;
        if (rescheduledTo) appointment.rescheduledTo = rescheduledTo;

        await appointment.save();
        res.json({ success: true, appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// POST /api/service-appointments/:id/cancel
router.post("/:id/cancel", async (req, res) => {
    try {
        const { id } = req.params;
        const appointment = await ServiceAppointment.findById(id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }
        if (appointment.status === "Canceled") {
            return res.status(400).json({ success: false, message: "Already canceled" });
        }
        appointment.status = "Canceled";
        await appointment.save();
        res.json({ success: true, appointment });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;