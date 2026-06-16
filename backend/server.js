import express from "express";
import cors from "cors";
import "dotenv/config";

import { clerkMiddleware } from '@clerk/express'
import { connectDB } from './config/db.js';
import doctorRouter from "./routes/doctorRouter.js";
import serviceRouter from "./routes/serviceRouter.js";
import appointmentRouter from "./routes/appointmentRouter.js";
import serviceAppointmentRouter from "./routes/serviceAppointmentRouter.js"

const app = express();
const port = process.env.PORT || 4000;


// Middlewares
app.use(cors({
    origin: [
        'http://localhost:5173',      // Local dev
        'http://localhost:5174',      // Local dev
        process.env.FRONTEND_URL,     // Production frontend
        process.env.ADMIN_URL,        // Production admin
    ],
    credentials: true,
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true })); 

// DB
connectDB();

// Routes
app.use("/api/doctors", doctorRouter);
app.use("/api/services", serviceRouter);
app.use("/api/appointments", appointmentRouter);
app.use("/api/service-appointments", serviceAppointmentRouter);

app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/', (req, res) => {
    res.send("API WORKING");
});

app.listen(port, () => {
    console.log(`Server Started on http://localhost:${port}`);
})