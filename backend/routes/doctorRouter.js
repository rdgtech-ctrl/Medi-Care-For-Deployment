import express from 'express';
import multer from 'multer';
import { 
    createDoctor, 
    getDoctorById, 
    getDoctors,
    doctorLogin,
    updateDoctor,
    toggleAvailability,
    deleteDoctor
} from '../controllers/doctorController.js';
import doctorAuth from '../middlewares/doctorAuth.js';

const upload = multer({ dest: "/tmp" });
const doctorRouter = express.Router();

//  CORRECT ORDER - Specific routes FIRST

// Public routes
doctorRouter.get("/", getDoctors);
doctorRouter.post("/login", doctorLogin);

doctorRouter.post("/", upload.single("image"), createDoctor);

// Protected routes
doctorRouter.put("/:id", doctorAuth, upload.single("image"), updateDoctor);
doctorRouter.post("/:id/toggle-availability", doctorAuth, toggleAvailability);
doctorRouter.delete("/:id", deleteDoctor); // no auth needed for student project

// /:id route MUST be LAST
doctorRouter.get("/:id", getDoctorById);

export default doctorRouter;