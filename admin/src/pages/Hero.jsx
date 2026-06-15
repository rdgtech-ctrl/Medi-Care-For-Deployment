import React from 'react'
import { heroStyles } from "../assets/dummyStyles";
import logoImg from "../assets/logo.png";

const Hero = ({ role = "admin", userName = "Doctor" }) => {
    const isDoctor = role === "doctor";

    return (
        <div className={heroStyles.container}>

            <main className={heroStyles.mainContainer}>
                <section className={heroStyles.section}>

                    {/* Relative wrapper gives a proper stacking context */}
                    <div className="relative">

                        {/* Decorative blur — purely visual, sits behind everything */}
                        <div className="absolute -inset-8 -z-10">
                            <div className={heroStyles.decorativeBg.blurShape}></div>
                        </div>

                        {/* Content is now OUTSIDE the absolute/z-10 div so it renders on top */}
                        <div className={heroStyles.contentBox}>
                            <div className={heroStyles.logoContainer}>
                                <img src={logoImg} alt="logo" className={heroStyles.logo} />
                            </div>

                            <h1 className={heroStyles.heading}>
                                {isDoctor
                                    ? `Welcome, Dr. ${userName}`
                                    : "WELCOME TO MEDICARE ADMIN PANEL"}
                            </h1>

                            <p className={heroStyles.description}>
                                {isDoctor
                                    ? "Access your patient records, manage appointments, and review medical reports securely from your dashboard."
                                    : "Manage hospital operations, doctors, staff, patient records, and system settings from a centralized control panel."}
                            </p>
                        </div>

                    </div>
                </section>
            </main>
        </div>
    );
};

export default Hero;