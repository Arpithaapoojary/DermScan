/* ─────────────────────────────────────────
   GLOBALS
   ───────────────────────────────────────── */

let currentPredictionId = null;
let currentPredictionItem = null; // Store full item for PDF generation

/* ─────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────── */

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/* ─────────────────────────────────────────
   LOAD USER
   ───────────────────────────────────────── */

async function loadUser() {
  try {
    const res = await fetch("/api/me", {
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok || data.error) {
      window.location.href = "/login";
      return;
    }

    if (data.role !== "doctor") {
      window.location.href = "/dashboard";
      return;
    }

    document.getElementById("welcomeText").textContent = `Welcome back, Dr. ${data.name}`;
    document.getElementById("sidebarName").textContent = `Dr. ${data.name}`;
    document.getElementById("sidebarRole").textContent = "Dermatologist";
    document.getElementById("sidebarAvatar").textContent = data.name ? data.name.charAt(0).toUpperCase() : "?";
  } catch (err) {
    window.location.href = "/login";
  }
}

/* ─────────────────────────────────────────
   LOAD CASES
   ───────────────────────────────────────── */

async function loadCases() {
  try {
    const res = await fetch("/api/history", {
      credentials: "include",
    });

    const data = await res.json();

    const grid = document.getElementById("doctorGrid");

    document.getElementById("totalCases").textContent = data.length;

    const pending = data.filter((x) => x.review_status !== "Approved").length;

    document.getElementById("pendingCount").textContent = pending;

    grid.innerHTML = "";

    data.forEach((item) => {
      const card = document.createElement("div");

      card.className = "card";

      card.innerHTML = `

        <div class="img-wrap">

          <img
            src="/uploads/${item.image_path}">

        </div>

        <div class="card-body">

          <div class="badge">

            ${item.stage1_label}

          </div>

          <div class="disease">

            ${item.stage2_label}

          </div>

          <div class="patient-chip">

            Patient:
            ${item.patient_name}

          </div>

          <div
            class="
              review-status
              ${
                item.review_status === "Approved"
                  ? "review-approved"
                  : item.review_status === "Rejected"
                    ? "review-rejected"
                    : "review-pending"
              }
            ">

            ${item.review_status}

          </div>

          <div class="card-footer">

            <button
              class="btn btn-primary"
              onclick='openReview(${JSON.stringify(item)})'>

              Review Case

            </button>

          </div>

        </div>
      `;

      grid.appendChild(card);
    });
  } catch (err) {
    console.log(err);
  }
}

/* ─────────────────────────────────────────
   OPEN REVIEW
   ───────────────────────────────────────── */

function openReview(item) {
  currentPredictionId = item.id;
  currentPredictionItem = item; // Save for PDF download
  document.getElementById("reviewGradcam").src =
    `/uploads/gradcam/${item.gradcam_path}`;
  document.getElementById("reviewModal").classList.add("show");

  document.getElementById("reviewImage").src = `/uploads/${item.image_path}`;

  document.getElementById("reviewDisease").textContent = item.stage2_label;

  document.getElementById("reviewConfidence").textContent =
    item.stage2_conf + "%";

  document.getElementById("doctorNote").value = item.doctor_note || "";
  document.getElementById("medication").value = item.medication || "";
  document.getElementById("dosage").value = item.dosage || "";
  document.getElementById("duration").value = item.duration || "";
}

/* ─────────────────────────────────────────
   CLOSE REVIEW
   ───────────────────────────────────────── */

function closeReview() {
  document.getElementById("reviewModal").classList.remove("show");
}

/* ─────────────────────────────────────────
   DOCTOR DOWNLOAD PDF REPORT
   ───────────────────────────────────────── */

async function doctorDownloadReport() {
  const item = currentPredictionItem;
  if (!item) {
    alert("No case loaded.");
    return;
  }

  const btn = document.querySelector(".review-actions button[onclick='doctorDownloadReport()']");
  if (btn) { btn.disabled = true; btn.textContent = "Generating..."; }

  try {
    // Fetch original image
    const originalRes = await fetch(`/uploads/${item.image_path}`);
    const originalBase64 = await blobToBase64(await originalRes.blob());

    // Fetch GradCAM image
    let gradcamBase64 = null;
    if (item.gradcam_path) {
      const gradcamRes = await fetch(`/uploads/gradcam/${item.gradcam_path}`);
      gradcamBase64 = await blobToBase64(await gradcamRes.blob());
    }

    // Current doctor note and prescription values
    const doctor_note = document.getElementById("doctorNote").value;
    const medication  = document.getElementById("medication").value;
    const dosage      = document.getElementById("dosage").value;
    const duration    = document.getElementById("duration").value;

    const res = await fetch("/api/report", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        patient: {
          name:   item.patient_name || "N/A",
          age:    item.patient_age  || "N/A",
          gender: item.patient_gender || "N/A",
          area:   "Skin Region",
        },
        stage1: { raw: item.stage1_label, confidence: item.stage1_conf },
        stage2: { raw: item.stage2_label, confidence: item.stage2_conf },
        original_image: originalBase64,
        gradcam_image:  gradcamBase64,
        doctor_note:    doctor_note,
        medication:     medication,
        dosage:         dosage,
        duration:       duration,
        review_status:  item.review_status || "Approved",
      }),
    });

    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // Download the PDF
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${data.pdf}`;
    link.download = `DermScan_Report_${item.patient_name || item.id}.pdf`;
    link.click();
  } catch (e) {
    alert("Failed to generate report: " + e.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "Download PDF"; }
  }
}

/* ─────────────────────────────────────────
   SUBMIT REVIEW
   ───────────────────────────────────────── */

async function submitReview(status) {
  const note = document.getElementById("doctorNote").value;
  const medication = document.getElementById("medication").value;
  const dosage = document.getElementById("dosage").value;
  const duration = document.getElementById("duration").value;

  if (!note) {
    alert("Please write review");

    return;
  }

  try {
    const res = await fetch("/api/add-note", {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      credentials: "include",

      body: JSON.stringify({
        prediction_id: currentPredictionId,

        note: note,
        medication: medication,
        dosage: dosage,
        duration: duration,

        status: status,
      }),
    });

    const data = await res.json();

    if (data.error) {
      alert(data.error);

      return;
    }

    alert("Review saved");

    closeReview();

    loadCases();
  } catch (err) {
    alert("Failed to save review");
  }
}

/* ─────────────────────────────────────────
   LOGOUT
   ───────────────────────────────────────── */

async function logout() {
  await fetch("/api/logout", {
    method: "POST",

    credentials: "include",
  });

  window.location.href = "/login";
}

/* ─────────────────────────────────────────
   INIT
   ───────────────────────────────────────── */

loadUser();
loadCases();
