# GenomeRx – Smart Genomic Insight for Antibiotic Selection

## 📌 Project Overview
**GenomeRx** is a smart genomic analysis platform designed to predict antimicrobial resistance (AMR) from genomic data and recommend effective antibiotics.  
It provides an interactive dashboard for doctors, researchers, and lab staff to upload genome sequences, run ML-powered AMR predictions, and generate clinical reports.

This system was developed as part of an academic software engineering project to showcase the integration of **machine learning**, **bioinformatics**, and **clinical decision support** in a secure and scalable application.

---

## 🚀 Key Features
- 🔐 **Role-based Authentication** – Admin, Doctor, Researcher, Lab Staff
- 📂 **Genome Upload** – Supports FASTA, CSV, PDF with validation
- 🤖 **AMR Prediction** – Uses **Random Forest** and **SVM** ML models with confidence scores
- 💊 **Top-3 Antibiotic Recommendations** – Based on prediction results
- 📊 **Visualization** – Confidence charts, resistance gene matches, history tracking
- 📝 **Clinical Reports** – Exportable to PDF with notes & tags
- 📜 **Task & Calendar Management** – Assign tasks, set deadlines, manage lab activities
- 💬 **Internal Chat** – Role-based direct messaging
- ⚙️ **Admin Tools** – User management, password reset, deactivate accounts
- 🌗 **Light/Dark Theme Support**

---

## 🛠️ Tech Stack
- **Frontend:** React (Vite, TailwindCSS, ShadCN/UI, Lucide Icons, Recharts, Framer Motion)  
- **Backend:** FastAPI (Python)  
- **Machine Learning:** Random Forest, SVM (scikit-learn)  
- **Database:** SQLite / MySQL  
- **UI Prototype:** Figma + custom design  
- **Version Control:** Git & GitHub  

---

## 📂 Project Structure
GenomeRx-Smart-Genomic-Insight/
│── backend/ # FastAPI backend code
│── frontend/ # React frontend app
│── genomerx-ui/ # UI prototype / alternate frontend
│── GenomeRX_DATA/ # Sample datasets (FASTA/CSV/PDF)
│── .gitignore
│── package-lock.json
│── INSTRUCTION FOR LOCAL SERVER.txt

yaml
Copy code

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/Shahriyarrrrr/GenomeRx-Smart-Genomic-Insight.git
cd GenomeRx-Smart-Genomic-Insight
2️⃣ Setup Backend (FastAPI)
bash
Copy code
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
3️⃣ Setup Frontend (React)
bash
Copy code
cd frontend
npm install
npm run dev
4️⃣ Access Application
Open browser at: http://localhost:5173 (frontend)
Backend runs at: http://localhost:8000

📖 Usage Workflow
Login/Register with a role (Admin, Doctor, Researcher, Lab Staff).

Upload Genome file (FASTA/CSV/PDF).

Run AMR Prediction and review pathogen insights.

View Antibiotic Recommendations and resistance genes.

Generate PDF Report for clinical decision support.

Admin can manage users, reset passwords, assign tasks.

Researchers & Lab Staff can collaborate via tasks, calendar, and chat.

📸 Screenshots
🔑 Authentication
01_GenomeRx_Login_Page

02_GenomeRx_Create_Account_Page

03_GenomeRx_Create_Account_Role_Dropdown

04_GenomeRx_Create_Account_Success

📊 Dashboards
05_GenomeRx_Admin_Dashboard

06_GenomeRx_Admin_Dashboard_Dark

24_GenomeRx_Doctor_Dashboard

26_GenomeRx_LabStaff_Dashboard

29_GenomeRx_Researcher_Dashboard

🧬 Genome Analysis
07_GenomeRx_Upload_Genome

08_GenomeRx_Upload_Genome_File_Dialog

09_GenomeRx_Upload_Progress_AMR_Prediction

10_GenomeRx_Prediction_Results

11_GenomeRx_Clinical_Report

12_GenomeRx_Notes_Tags_Modal

13_GenomeRx_Print_Report_PDF

14_GenomeRx_Report_PDF_Viewers_Comparison

📂 History
16_GenomeRx_Prediction_History

27_GenomeRx_LabStaff_Prediction_History

📅 Task & Calendar
17_GenomeRx_Tasks_Page

18_GenomeRx_New_Task_Modal

19_GenomeRx_Calendar_View

20_GenomeRx_Edit_Event_Modal

25_GenomeRx_Doctor_Tasks_Page

28_GenomeRx_LabStaff_Assigned_Tasks

👨‍💻 Admin Tools
21_GenomeRx_Admin_User_Management

22_GenomeRx_Admin_User_Access_Modal

💬 Chat
23_GenomeRx_Chat_Direct_Message

🤝 Contribution
Fork the repository

Create a new feature branch (git checkout -b feature-name)

Commit changes (git commit -m "Added new feature")

Push to branch (git push origin feature-name)

Open a Pull Request

📜 License
This project is developed for academic/demo purposes and is not intended for clinical use.
MIT License © 2025 GenomeRx Team

yaml
Copy code

---

👉 Save this as `README.md` in your repo root.  
👉 Then run:

```bash
git add README.md
git commit -m "Add professional README with project details and screenshots"
git push
✅ Do you want me to also show you how to embed the actual screenshot images in the README (so they display visually instead of just filenames)?
