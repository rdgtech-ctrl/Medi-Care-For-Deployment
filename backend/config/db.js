import mongoose from "mongoose";

export const connectDB = async()=>{
    await mongoose.connect("mongodb+srv://dgmechpro200_db_user:rWzalcuQR61yxdz8@cluster0.f9yupzc.mongodb.net/MediCare")
    .then(() => {
        console.log("DB CONNECTED")
    })
}