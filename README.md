# DermScan

**Hierarchical Deep Learning Framework for Skin Allergy and Infection Disease Classification Using MobileNetV2**

[![Python](https://img.shields.io/badge/Python-3.8%2B-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-Web%20App-black.svg)](https://flask.palletsprojects.com/)
[![TensorFlow](https://img.shields.io/badge/TensorFlow-Keras-orange.svg)](https://www.tensorflow.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

DermScan is an AI-assisted skin disease diagnosis platform built around a two-stage hierarchical deep learning pipeline. A skin image is first classified at a coarse level — allergy or infection — and then routed to a second, condition-specific model that predicts the precise diagnosis. Both stages are built on **MobileNetV2**, chosen for its balance of accuracy and computational efficiency.

The system is delivered as a full web application with role-based access for patients and doctors, Grad-CAM–based visual explanations for each prediction, and automated PDF report generation.

This work accompanies a paper presented at the **2026 International Conference on Natural Language Processing and Computer Vision (ICNPCV)**, held at Global Academy of Technology (GAT), Bengaluru, India, July 17–18, 2026.

## Key Features

- **Hierarchical two-stage classification**
  - Stage 1 — Allergy vs. Infection (binary MobileNetV2 classifier)
  - Stage 2 — Condition-specific classification within the predicted category:
    - Allergy: Atopic Dermatitis, Contact Dermatitis, Eczema, Seborrheic Dermatitis
    - Infection: Scabies, Tinea Corporis
- **Grad-CAM explainability** — heatmaps highlighting the image regions that most influenced each prediction
- **Role-based web portal** — separate patient and doctor dashboards
- **Authentication** — registration, login, and OTP-based password reset, with bcrypt-hashed credentials
- **Doctor review workflow** — case review, clinical notes, and medication prescriptions (dosage and duration)
- **Automated PDF reports** — diagnostic report generation via ReportLab, including predictions, confidence scores, and Grad-CAM visualization
- **Prediction history** — persisted per patient in a local SQLite database
- **Case detail views** — per-case review of images, confidence scores, and doctor annotations

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Flask, Flask-CORS, Flask-Bcrypt |
| Deep Learning | TensorFlow / Keras, MobileNetV2 (transfer learning) |
| Explainability | Grad-CAM (OpenCV, Matplotlib) |
| Database | SQLite |
| Reporting | ReportLab (PDF generation) |
| Frontend | HTML, CSS, JavaScript (Jinja templates) |

## Project Structure

```
DermScan/
├── app.py                                          # Flask application: routes, auth, inference, reporting
├── train_models.py                                 # Training script for all three hierarchical models
├── stage1_model.keras / stage1_weights.npz         # Allergy vs. Infection classifier
├── allergy_model.keras / allergy_weights.npz       # Allergy sub-type classifier (4 classes)
├── infection_model.keras / infection_weights.npz   # Infection sub-type classifier (2 classes)
├── mobilenet_v2_weights.h5                         # Pretrained MobileNetV2 (ImageNet) base weights
├── dermscan.db                                     # SQLite database (users, predictions, doctor notes)
├── templates/
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── doctor_dashboard.html
│   └── case_detail.html
├── static/
│   ├── css/
│   └── js/
├── uploads/                                        # Uploaded images and generated Grad-CAM heatmaps
└── .gitignore.txt
```

## Getting Started

### Prerequisites

- Python 3.8 or later
- pip

### Installation

```bash
git clone https://github.com/Arpithaapoojary/DermScan.git
cd DermScan
pip install flask flask-cors flask-bcrypt tensorflow numpy pillow opencv-python matplotlib reportlab
```

### Running the Application

```bash
python app.py
```

On first run, the application initializes the SQLite database automatically and serves the web portal, including patient registration/login and both the patient and doctor dashboards.

### Retraining the Models

`train_models.py` retrains all three hierarchical models (Stage 1, Allergy, Infection) using `image_dataset_from_directory` on a dataset organized as follows:

```
dataset/
├── stage1/            # allergy/, infection/
├── stage2_allergy/    # AD/, CD/, EC/, SD/
└── stage2_infection/  # SC/, TC/
```

Update `DATASET_DIR` in `train_models.py` to point to the dataset location, then run:

```bash
python train_models.py
```

Each stage freezes the pretrained MobileNetV2 base (ImageNet weights) and trains a custom classification head — `GlobalAveragePooling2D → Dense(256) → Dropout(0.4) → Dense(128) → Dropout(0.3) → output` — saving the resulting weights as `.npz` files consumed by `app.py`.

## How It Works

1. A patient uploads a skin image through the web portal.
2. The Stage 1 model classifies the image as an allergy or an infection.
3. The corresponding Stage 2 model then predicts the specific condition.
4. Grad-CAM generates a heatmap indicating which regions of the image drove the prediction.
5. Results — labels, confidence scores, and heatmap — are stored and displayed on the patient dashboard.
6. A doctor can review the case, add clinical notes, and prescribe medication.
7. A downloadable PDF report summarizing the diagnosis, confidence scores, and Grad-CAM visualization can be generated at any time.

## Publication

This repository accompanies the following research paper:

**"Hierarchical Deep Learning Framework for Skin Allergy and Infection Disease Classification Using MobileNetV2"**
Arpitha Poojary — 2026 International Conference on Natural Language Processing and Computer Vision (ICNPCV), Global Academy of Technology (GAT), Bengaluru, India, July 17–18, 2026.

Formal citation details (DOI and publication reference) will be added once available.

## Disclaimer

DermScan is a research and academic prototype intended for educational and demonstration purposes. It is not a certified medical device and should not be used as a substitute for professional medical diagnosis or treatment.

## Contributing

Contributions, issues, and feature requests are welcome. Please use the [issues page](https://github.com/Arpithaapoojary/DermScan/issues) for bug reports or suggestions.


## Author

**Arpitha Poojary**
