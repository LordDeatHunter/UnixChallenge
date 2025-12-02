import { Component, createSignal, onMount } from "solid-js";
import { Challenge, TestResult, Submission } from "./types";
import ChallengeSelector from "./components/ChallengeSelector";
import TagsDisplay from "./components/TagsDisplay";
import CommandInput from "./components/CommandInput";
import TestResultsList from "./components/TestResultsList";
import OutputPanel from "./components/OutputPanel";

const API_URL = "http://127.0.0.1:8000";

const App: Component = () => {
  const [challenges, setChallenges] = createSignal<Challenge[]>([]);
  const [selectedChallengeId, setSelectedChallengeId] =
    createSignal<string>("");
  const [cmd, setCmd] = createSignal<string>("");
  const [submission, setSubmission] = createSignal<Submission | null>(null);
  const [selectedTest, setSelectedTest] = createSignal<TestResult | null>(null);
  const [isRunning, setIsRunning] = createSignal(false);

  const selectedChallenge = () =>
    challenges().find((c) => c.id === selectedChallengeId());

  const loadChallenges = async () => {
    try {
      const res = await fetch(`${API_URL}/challenges`);
      const data = await res.json();
      setChallenges(data);
      if (data.length > 0) {
        setSelectedChallengeId(data[0].id);
      }
    } catch (error) {
      console.error("Failed to load challenges:", error);
    }
  };

  const runSubmission = async () => {
    if (!selectedChallengeId() || !cmd()) return;

    setIsRunning(true);
    setSelectedTest(null);

    try {
      const res = await fetch(`${API_URL}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge_id: selectedChallengeId(),
          cmd: cmd(),
        }),
      });

      const data = await res.json();
      setSubmission(data);
    } catch (error) {
      console.error("Submission failed:", error);
      setSubmission({ error: "Failed to submit" });
    } finally {
      setIsRunning(false);
    }
  };

  const handleChallengeChange = (id: string) => {
    setSelectedChallengeId(id);
    setSubmission(null);
    setSelectedTest(null);
  };

  onMount(() => {
    loadChallenges();
  });

  return (
    <>
      <h1>Unix Challenge (name subject to change)</h1>

      <div class="challenge-row">
        <label for="challenge-select">Challenge</label>
        <ChallengeSelector
          challenges={challenges()}
          selectedChallengeId={selectedChallengeId()}
          onChallengeChange={handleChallengeChange}
        />

        <TagsDisplay tags={selectedChallenge()?.tags || []} />

        <pre id="challenge-description">
          {selectedChallenge()?.description || ""}
        </pre>

        <label>Command</label>
        <CommandInput value={cmd()} onInput={setCmd} onSubmit={runSubmission} />
      </div>

      <div class="row">
        <div>
          <h3>Tests</h3>
          <TestResultsList
            results={submission()?.summary?.results}
            isRunning={isRunning()}
            error={submission()?.error}
            onSelectTest={setSelectedTest}
          />
        </div>

        <OutputPanel selectedTest={selectedTest()} />
      </div>
    </>
  );
};

export default App;
