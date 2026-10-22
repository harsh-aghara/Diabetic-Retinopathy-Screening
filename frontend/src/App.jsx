import React, { useState } from "react";
import Navbar from "./components/layout/Navbar";
import Landing from "./pages/Landing";
import { PatientIntakeForm } from "./components/patient/PatientIntakeForm";
import { UploadPage } from "./pages/UploadPage";
import { ResultPage } from "./pages/ResultPage";
import { RecordsPage } from "./pages/RecordsPage";
import { useScreening } from "./hooks/useScreening";

/**
 * Root Application component orchestrating navigation, patient demographic intake,
 * retinal photography analysis, and clinical patient records.
 */
export default function App() {
  const [currentScreen, setCurrentScreen] = useState("landing"); // 'landing' | 'patient-intake' | 'upload' | 'result' | 'records'
  const [patientData, setPatientData] = useState(null);
  const screening = useScreening();

  const handleStartScreening = () => {
    setCurrentScreen("patient-intake");
  };

  const handlePatientIntakeProceed = () => {
    setCurrentScreen("upload");
  };

  const handleEditPatient = () => {
    setCurrentScreen("patient-intake");
  };

  const handleAnalysisComplete = (data) => {
    setCurrentScreen("result");
  };

  const handleNewScreening = () => {
    screening.clearFile();
    setPatientData(null);
    setCurrentScreen("patient-intake");
  };

  const handleViewRecords = () => {
    setCurrentScreen("records");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-150">
      <Navbar
        currentScreen={currentScreen}
        onNavigate={(screen) => setCurrentScreen(screen)}
      />

      <main className="flex-1 w-full" id="main-content">
        {currentScreen === "landing" && (
          <Landing onStartScreening={handleStartScreening} />
        )}

        {currentScreen === "patient-intake" && (
          <PatientIntakeForm
            patientData={patientData}
            onUpdatePatient={setPatientData}
            onProceed={handlePatientIntakeProceed}
            onBack={() => setCurrentScreen("landing")}
          />
        )}

        {currentScreen === "upload" && (
          <UploadPage
            screening={screening}
            patientData={patientData}
            onBack={() => setCurrentScreen("patient-intake")}
            onEditPatient={handleEditPatient}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {currentScreen === "result" && (
          <ResultPage
            screeningData={screening.screeningData}
            originalUrl={screening.previewUrl}
            patientData={patientData}
            onNewScreening={handleNewScreening}
            onViewRecords={handleViewRecords}
          />
        )}

        {currentScreen === "records" && (
          <RecordsPage
            onNewScreening={handleNewScreening}
          />
        )}
      </main>
    </div>
  );
}
