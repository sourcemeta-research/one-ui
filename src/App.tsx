import { useContext } from "react";
import { AppProvider } from "./contexts/AppProvider";
import { AppContext } from "./contexts/AppContext";
import RegistryBar from "./components/RegistryBar";
import SchemaPicker from "./components/SchemaPicker";
import InstanceEditor from "./components/InstanceEditor";
import ResultPanel from "./components/ResultPanel";
import TraceDebugger from "./components/TraceDebugger/TraceDebugger";

const AppShell = () => {
  const { debuggerOpen } = useContext(AppContext);

  if (debuggerOpen) return <TraceDebugger />;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-canvas)] p-3 gap-3">
      <RegistryBar />
      <div className="flex flex-1 min-h-0 gap-3">
        <SchemaPicker />
        <InstanceEditor />
        <ResultPanel />
      </div>
    </div>
  );
};

function App() {
  return (
    <AppProvider>
      <AppShell />
    </AppProvider>
  );
}

export default App;
