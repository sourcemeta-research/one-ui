import { AppProvider } from "./contexts/AppProvider";
import RegistryBar from "./components/RegistryBar";
import SchemaPicker from "./components/SchemaPicker";
import InstanceEditor from "./components/InstanceEditor";
import ResultPanel from "./components/ResultPanel";

function App() {
  return (
    <AppProvider>
      <div className="flex flex-col h-full bg-[var(--bg-canvas)] p-3 gap-3">
        <RegistryBar />
        <div className="flex flex-1 min-h-0 gap-3">
          <SchemaPicker />
          <InstanceEditor />
          <ResultPanel />
        </div>
      </div>
    </AppProvider>
  );
}

export default App;
