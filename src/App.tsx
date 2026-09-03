import { useContext, useState } from "react";
import { AppProvider } from "./contexts/AppProvider";
import { AppContext } from "./contexts/AppContext";
import RegistryBar from "./components/RegistryBar";
import SchemaPicker from "./components/SchemaPicker";
import InstanceEditor from "./components/InstanceEditor";
import ResultPanel from "./components/ResultPanel";
import TraceDebugger from "./components/TraceDebugger/TraceDebugger";
import CustomDebugger from "./components/CustomDebugger/CustomDebugger";

const AppShell = () => {
  const { debuggerOpen } = useContext(AppContext);
  const [customDebuggerOpen, setCustomDebuggerOpen] = useState(false);

  if (debuggerOpen) return <TraceDebugger />;
  if (customDebuggerOpen) return <CustomDebugger onClose={() => setCustomDebuggerOpen(false)} />;

  return (
    <div className="flex flex-col h-full bg-[var(--bg-canvas)] p-3 gap-3">
      <RegistryBar onOpenCustomDebugger={() => setCustomDebuggerOpen(true)} />
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
