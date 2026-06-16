import React, { useEffect, useState } from "react";
import {
  ArrowLeft,
  Clock,
  FileText,
  IndianRupee,
  Send,
  Phone,
} from "lucide-react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import toast, { Toaster } from "react-hot-toast";
import { serviceDetailStyles, iconSize } from "../assets/dummyStyles";

const DEFAULT_HOST = "http://localhost:4000".replace(/\/$/, "");

// Parses a "HH:MM AM/PM" string into { hour, minute, ampm }
function parseTimeString(timeStr) {
  if (!timeStr) return { hour: 12, minute: 0, ampm: "AM" };
  const m = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m) {
    return {
      hour: Number(m[1]),
      minute: Number(m[2]),
      ampm: m[3].toUpperCase(),
    };
  }
  return { hour: 12, minute: 0, ampm: "AM" };
}

export default function ServiceDetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { isSignedIn, userId, getToken } = useAuth();

  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState(""); // "HH:MM AM/PM" string
  const [customerName, setCustomerName] = useState("");
  const [mobile, setMobile] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [email, setEmail] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Online");

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const isValidMobile = (m) => /^\d{10}$/.test(m);
  const isValidAge = (a) => {
    if (a === "" || a === null || a === undefined) return false;
    const n = Number(a);
    return Number.isInteger(n) && n > 0 && n < 150;
  };

  function getClientMissingFields() {
    const missing = [];
    if (!customerName || !customerName.trim()) missing.push("Full Name");
    if (!mobile || !isValidMobile(mobile)) missing.push("Mobile (10 digits)");
    if (!isValidAge(age)) missing.push("Age");
    if (!gender || !String(gender).trim()) missing.push("Gender");
    if (!selectedDate) missing.push("Date");
    if (!selectedTime) missing.push("Time");
    return missing;
  }

  const isFormValid = () => getClientMissingFields().length === 0;

  // ─── Fetch service ────────────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    async function tryFetch() {
      setLoading(true);
      setFetchError(null);

      try {
        const url = `${DEFAULT_HOST}/api/services/${encodeURIComponent(id)}`;
        const res = await fetch(url, {
          method: "GET",
          headers: { Accept: "application/json", "Content-Type": "application/json" },
          signal: controller.signal,
        });

        if (!res.ok) throw new Error(`Server returned ${res.status}`);

        const json = await res.json();
        const doc = json?.data ?? json?.service ?? json;
        if (!doc) throw new Error("No service data returned");

        const transformed = transformServiceShape(doc);
        if (!mounted) return;

        setService(transformed);
        if (transformed.dates && transformed.dates.length > 0) {
          setSelectedDate(transformed.dates[0]);
          setSelectedTime("");
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        if (!mounted) return;
        setFetchError("Unable to fetch service details from server.");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    tryFetch();
    return () => { mounted = false; controller.abort(); };
  }, [id]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  function normalizeToDateString(d) {
    const dt = new Date(d);
    if (isNaN(dt)) return null;
    return dt.toISOString().split("T")[0];
  }

  function sortServiceDates(datesArr) {
    if (!Array.isArray(datesArr)) return [];
    const uniq = Array.from(new Set(datesArr.map(normalizeToDateString).filter(Boolean)));
    const parsed = uniq.map((ds) => ({ ds, date: new Date(ds) }));
    const dateVal = (d) => Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
    const todayVal = dateVal(new Date());
    const past = parsed.filter((p) => dateVal(p.date) < todayVal).sort((a, b) => dateVal(b.date) - dateVal(a.date));
    const future = parsed.filter((p) => dateVal(p.date) >= todayVal).sort((a, b) => dateVal(a.date) - dateVal(b.date));
    return [...past, ...future].map((p) => p.ds);
  }

  function transformServiceShape(doc) {
    const out = {};
    out.id = doc._id ?? doc.id ?? String(doc.name).replace(/\s+/g, "-").toLowerCase();
    out.name = doc.name ?? doc.title ?? "Service";
    out.image = doc.image || doc.imageUrl || doc.imageURL || null;
    out.price = typeof doc.price === "number" ? doc.price : Number(doc.price) || 0;
    out.about = doc.about ?? doc.description ?? doc.shortDescription ?? "";
    out.instructions = Array.isArray(doc.instructions) ? doc.instructions : [];

    let dates = Array.isArray(doc.dates) ? doc.dates.slice() : [];
    let slotsMap = {};

    if (doc.slots && !Array.isArray(doc.slots) && typeof doc.slots === "object") {
      slotsMap = { ...doc.slots };
      if (dates.length === 0) dates = Object.keys(slotsMap);
    } else if (Array.isArray(doc.slots)) {
      const arr = doc.slots.slice();
      if (dates.length > 0) {
        dates.forEach((d) => (slotsMap[d] = arr.slice()));
      } else {
        const today = new Date().toISOString().split("T")[0];
        slotsMap[today] = arr.slice();
        dates = [today];
      }
    } else {
      const today = new Date().toISOString().split("T")[0];
      dates = dates.length > 0 ? dates : [today];
      dates.forEach((d) => (slotsMap[d] = []));
    }

    out.dates = sortServiceDates(dates);
    out.slots = slotsMap;
    out.imageAlt = doc.imageAlt ?? doc.alt ?? out.name;
    out.raw = doc;
    return out;
  }

  // ─── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setSubmitError(null);
    setSuccessMessage(null);

    const missing = getClientMissingFields();
    if (missing.length > 0) {
      setSubmitError(`Missing required fields: ${missing.join(", ")}`);
      return;
    }

    if (!service) { setSubmitError("Service details not loaded"); return; }
    if (!isSignedIn) { toast.error("Please sign in to book."); return; }

    setSubmitting(true);
    try {
      const token = await getToken().catch(() => null);
      if (!token) {
        toast.error("Authentication token not available. Please sign in again.");
        setSubmitting(false);
        return;
      }

      // Parse selectedTime "HH:MM AM/PM" → { hour, minute, ampm }
      const { hour, minute, ampm } = parseTimeString(selectedTime);

      // Build payload that EXACTLY matches the mongoose schema
      const payload = {
        // Patient info
        createdBy: userId,
        patientName: customerName.trim(),
        mobile: mobile.trim(),
        age: age ? Number(age) : undefined,
        gender: gender || "",

        // Service info
        serviceId: (service?.raw?._id || service?.raw?.id || service?.id),
        serviceName: service?.name || "",
        serviceImage: {
          url: service?.raw?.imageUrl || service?.raw?.image || service?.image || "",
          publicId: service?.raw?.imagePublicId || "",
        },

        fees: service?.price ?? 0,

        // Schedule — stored as separate fields in schema
        date: selectedDate,
        hour,
        minute,
        ampm,

        // Payment — nested object matching schema
        payment: {
          method: paymentMethod === "Cash" ? "Cash" : "Online",
          status: "Pending",
          amount: service?.price ?? 0,
        },

        status: "Pending",

        // Optional
        email: email || undefined,
      };

      const res = await fetch(`${DEFAULT_HOST}/api/service-appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const text = await res.text();
      let json = null;
      try { json = JSON.parse(text); } catch { json = { rawText: text }; }

      if (!res.ok) {
        const msg = json?.message || json?.error || json?.rawText || `Server returned ${res.status}`;
        setSubmitError(String(msg));
        setSubmitting(false);
        return;
      }

      const { checkoutUrl } = json || {};
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
        return;
      }

      toast.success("Booking created! Redirecting to appointments...");
      setTimeout(() => navigate("/appointments", { replace: true }), 700);

      // Reset form
      setCustomerName("");
      setMobile("");
      setAge("");
      setGender("");
      setSelectedDate("");
      setSelectedTime("");
      setEmail("");

    } catch (err) {
      console.error("Booking submit error:", err);
      setSubmitError("Network error while creating booking.");
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={serviceDetailStyles.loadingContainer}>
        <div className={serviceDetailStyles.loadingCard}>
          <h2 className={serviceDetailStyles.loadingTitle}>Loading service...</h2>
          <p className={serviceDetailStyles.loadingText}>Fetching details from server</p>
        </div>
      </div>
    );
  }

  if (!service || fetchError) {
    return (
      <div className={serviceDetailStyles.loadingContainer}>
        <div className={serviceDetailStyles.loadingCard}>
          <h2 className={serviceDetailStyles.loadingTitle}>Service not found</h2>
          <p className={serviceDetailStyles.loadingText}>
            {fetchError || "Please go back and select a valid service."}
          </p>
          <Link to="/services" className={serviceDetailStyles.backToServices}>
            Back to Services
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={serviceDetailStyles.pageContainer}>
      <Toaster />
      <div className={serviceDetailStyles.navBar}>
        <div className={serviceDetailStyles.navContainer}>
          <Link to="/services" className={serviceDetailStyles.backButton}>
            <ArrowLeft size={18} />
            Back
          </Link>
        </div>
      </div>

      <div className={serviceDetailStyles.mainGrid}>
        {/* LEFT */}
        <div className={serviceDetailStyles.leftColumn}>
          <div className={serviceDetailStyles.imageContainer}>
            <img
              src={service.image || "/placeholder-service.png"}
              alt={service.name}
              className={serviceDetailStyles.image}
            />
          </div>

          <div className={serviceDetailStyles.detailsContainer}>
            <h3 className={serviceDetailStyles.detailsTitle}>
              <Phone size={20} />
              Your Details
            </h3>

            <div className={serviceDetailStyles.detailsGrid}>
              <input
                required
                type="text"
                placeholder="Full Name *"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className={serviceDetailStyles.input}
              />

              <input
                type="text"
                required
                placeholder="Mobile (10 digits) *"
                maxLength={10}
                value={mobile}
                onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                className={
                  mobile && !isValidMobile(mobile)
                    ? serviceDetailStyles.invalidInput
                    : serviceDetailStyles.input
                }
              />

              <input
                type="number"
                required
                placeholder="Age *"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={serviceDetailStyles.input}
              />

              <select
                value={gender}
                required
                onChange={(e) => setGender(e.target.value)}
                className={serviceDetailStyles.input}
              >
                <option value="">Select Gender *</option>
                <option>Male</option>
                <option>Female</option>
                <option>Other</option>
              </select>

              <input
                type="email"
                placeholder="Email (optional)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={serviceDetailStyles.emailInput}
              />
            </div>

            <div className={serviceDetailStyles.dateSection}>
              <label className={serviceDetailStyles.paymentLabel}>Payment Method</label>
              <div className={serviceDetailStyles.paymentOptions}>
                <label className={serviceDetailStyles.paymentOption(paymentMethod === "Cash")}>
                  <input
                    type="radio"
                    name="payment"
                    value="Cash"
                    checked={paymentMethod === "Cash"}
                    onChange={() => setPaymentMethod("Cash")}
                    className={serviceDetailStyles.paymentInput}
                  />
                  Cash
                </label>
                <label className={serviceDetailStyles.paymentOption(paymentMethod === "Online")}>
                  <input
                    type="radio"
                    name="payment"
                    value="Online"
                    checked={paymentMethod === "Online"}
                    onChange={() => setPaymentMethod("Online")}
                    className={serviceDetailStyles.paymentInput}
                  />
                  Online
                </label>
              </div>
            </div>
          </div>

          {/* DATE */}
          <div>
            <h2 className={serviceDetailStyles.dateTitle}>Select Date *</h2>
            <div className={serviceDetailStyles.dateScrollContainer}>
              <div className={serviceDetailStyles.dateButtonsContainer}>
                {service.dates.map((d) => (
                  <button
                    key={d}
                    onClick={() => { setSelectedDate(d); setSelectedTime(""); }}
                    className={serviceDetailStyles.dateButton(selectedDate === d)}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TIME */}
          {selectedDate && (
            <div className={serviceDetailStyles.timeSection}>
              <h2 className={serviceDetailStyles.timeTitle}>Select Time *</h2>
              <div className={serviceDetailStyles.timeScrollContainer}>
                <div className={serviceDetailStyles.timeButtonsContainer}>
                  {(service.slots[selectedDate] || []).map((t) => (
                    <button
                      key={t}
                      onClick={() => setSelectedTime(t)}
                      className={serviceDetailStyles.timeButton(selectedTime === t)}
                    >
                      <Clock className={`${iconSize.small} mr-1`} />
                      {t}
                    </button>
                  ))}
                  {(!service.slots[selectedDate] || service.slots[selectedDate].length === 0) && (
                    <div className={serviceDetailStyles.noSlotsMessage}>
                      No slots available for this date.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <div>
            {submitError && (
              <div className={serviceDetailStyles.errorMessage}>{submitError}</div>
            )}
            {successMessage && (
              <div className={serviceDetailStyles.successMessage}>{successMessage}</div>
            )}
            <button
              disabled={!isFormValid() || submitting}
              onClick={handleSubmit}
              className={serviceDetailStyles.submitButton(isFormValid() && !submitting, submitting)}
            >
              <Send />
              {submitting ? "Submitting..." : `Confirm Booking${service.price ? ` • ₹${service.price}` : ""}`}
            </button>
          </div>
        </div>

        {/* RIGHT */}
        <div className={serviceDetailStyles.rightColumn}>
          <h1 className={serviceDetailStyles.serviceName}>{service.name}</h1>

          <div className={serviceDetailStyles.aboutContainer}>
            <h2 className={serviceDetailStyles.aboutTitle}>
              <FileText /> About This Service
            </h2>
            <p className={serviceDetailStyles.aboutText}>{service.about}</p>
          </div>

          <div className={serviceDetailStyles.priceContainer}>
            <IndianRupee />
            <span className={serviceDetailStyles.priceText}>{service.price}</span>
          </div>

          <div className={serviceDetailStyles.instructionsContainer}>
            <h3 className={serviceDetailStyles.instructionsTitle}>Pre-Test Instructions</h3>
            <ul className={serviceDetailStyles.instructionsList}>
              {service.instructions.map((i, idx) => (
                <li key={idx}>{i}</li>
              ))}
            </ul>
          </div>

          <div className={serviceDetailStyles.summaryContainer}>
            <h3 className={serviceDetailStyles.summaryTitle}>Booking Summary</h3>
            <div className={serviceDetailStyles.summaryContent}>
              <p><b>Name:</b> {customerName || "Not filled"}</p>
              <p><b>Mobile:</b> {mobile || "Not filled"}</p>
              <p><b>Age:</b> {age || "Not filled"}</p>
              <p><b>Gender:</b> {gender || "Not filled"}</p>
              <p><b>Date:</b> {selectedDate || "Not selected"}</p>
              <p><b>Time:</b> {selectedTime || "Not selected"}</p>
              <p><b>Payment:</b> {paymentMethod}</p>
              <p><b>Price:</b> ₹{service.price}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}