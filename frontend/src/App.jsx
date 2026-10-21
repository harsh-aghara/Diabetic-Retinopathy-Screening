import React, { useState } from "react";
import Navbar from "./components/layout/Navbar";
import Landing from "./pages/Landing";
import { UploadPage } from "./pages/UploadPage";
import { ResultPage } from "./pages/ResultPage";
import { useScreening } from "./hooks/useScreening";

/**
 * Root Application component orchestrating navigation and screening state.
 */
export default function App() {
  const [currentScreen, setCurrentScreen] = useState("landing"); // 'landing' | 'upload' | 'result'
  const screening = useScreening();

  const handleStartScreening = () => {
    setCurrentScreen("upload");
  };

  const handleAnalysisComplete = (data) => {
    setCurrentScreen("result");
  };

  const handleNewScreening = () => {
    screening.clearFile();
    setCurrentScreen("upload");
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

        {currentScreen === "upload" && (
          <UploadPage
            screening={screening}
            onBack={() => setCurrentScreen("landing")}
            onAnalysisComplete={handleAnalysisComplete}
          />
        )}

        {currentScreen === "result" && (
          <ResultPage
            screeningData={screening.screeningData}
            originalUrl={screening.previewUrl}
            onNewScreening={handleNewScreening}
          />
        )}
      </main>
    </div>
  );
}
