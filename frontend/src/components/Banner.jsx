import React from 'react'
import { bannerStyles } from '../assets/dummyStyles';
import {
    Stethoscope,
    CalendarCheck,
    Phone,
    Shield,
    Clock,
    Star,
    ArrowRight,
    UserCheck,
    Users
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'

const features = [
    { icon: Shield, text: "Certified Specialists", border: "border-green-100" },
    { icon: Clock, text: "24/7 Availability", border: "border-blue-100" },
    { icon: Users, text: "500+ Doctors", border: "border-emerald-100" },
    { icon: UserCheck, text: "Safe & Secure", border: "border-purple-100" },
];
const Banner = () => {
    const navigate = useNavigate()
    return (
        <div className={bannerStyles.bannerContainer}>

            {/* Pink/salmon glow on left and right edges — matching the reference */}
            <style>{`
                .banner-glow::before,
                .banner-glow::after {
                    content: '';
                    position: absolute;
                    top: 10%;
                    width: 18px;
                    height: 80%;
                    border-radius: 999px;
                    background: linear-gradient(to bottom, #fca5a5, #f87171, #fca5a5);
                    opacity: 0.7;
                    filter: blur(6px);
                    z-index: 0;
                }
                .banner-glow::before { left: -6px; }
                .banner-glow::after  { right: -6px; }
            `}</style>

            <div className={`${bannerStyles.mainContainer} banner-glow`}>

                <div className={bannerStyles.contentContainer}>
                    <div className={bannerStyles.flexContainer}>

                        {/* LEFT SIDE */}
                        <div className={bannerStyles.leftContent}>

                            {/* Logo + Title */}
                            <div className={bannerStyles.headerBadgeContainer}>
                                <div className={bannerStyles.stethoscopeContainer}>
                                    <div className={bannerStyles.stethoscopeInner}>
                                        <Stethoscope className={bannerStyles.stethoscopeIcon} />
                                    </div>
                                </div>
                                <div className={bannerStyles.titleContainer}>
                                    <h1 className={bannerStyles.title}>
                                        Medi
                                        <span className={bannerStyles.titleGradient}>Care+</span>
                                    </h1>
                                </div>
                            </div>

                            {/* Stars */}
                            <div className={bannerStyles.starsContainer}>
                                <div className={bannerStyles.starsInner}>
                                    {[1, 2, 3, 4, 5].map((s) => (
                                        <Star key={s} className={bannerStyles.starIcon} />
                                    ))}
                                </div>
                                <span className="ml-2 text-sm text-gray-500 font-serif">
                                    Trusted by 10,000+ patients
                                </span>
                            </div>

                            {/* Tagline */}
                            <p className={bannerStyles.tagline}>
                                Your health is our{" "}
                                <span className={bannerStyles.taglineHighlight}>top priority.</span>
                                <br />
                                Book appointments with the best doctors near you.
                            </p>

                            {/* Features grid */}
                            <div className={bannerStyles.featuresGrid}>
                                {features.map(({ icon: Icon, text, border }) => (
                                    <div key={text} className={`${bannerStyles.featureItem} ${border}`}>
                                        <Icon className={bannerStyles.featureIcon} />
                                        <span className={bannerStyles.featureText}>{text}</span>
                                    </div>
                                ))}
                            </div>

                            {/* CTA Buttons */}
                            <div className={bannerStyles.ctaButtonsContainer}>
                                <button className={bannerStyles.bookButton}   onClick={() => navigate('/doctors')}>
                                    <span className={bannerStyles.bookButtonOverlay}></span>
                                    <span className={bannerStyles.bookButtonContent}>
                                        <CalendarCheck className={bannerStyles.bookButtonIcon} />
                                        Book Appointment Now
                                        <ArrowRight className={bannerStyles.bookButtonIcon} />
                                    </span>
                                </button>

                                <button className={bannerStyles.emergencyButton} onClick={() => window.location.href = "tel:8299431275"}>
                                    <span className={bannerStyles.emergencyButtonContent}>
                                        <Phone className={bannerStyles.emergencyButtonIcon} />
                                        Emergency Call
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* RIGHT SIDE - Doctor image */}
                        <div className={bannerStyles.rightImageSection}>
                            <div className={bannerStyles.imageContainer}>
                                <div className={bannerStyles.imageFrame}>
                                    <img
                                        src="https://media.istockphoto.com/id/512278456/photo/group-of-doctors-at-the-hospital.jpg?s=612x612&w=0&k=20&c=EPPHeKuq0YabUC-QCWlAOhTfIZAAPtrwQ96V_Wp0oKY="
                                        alt="Doctor"
                                        className={bannerStyles.image}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
};

export default Banner