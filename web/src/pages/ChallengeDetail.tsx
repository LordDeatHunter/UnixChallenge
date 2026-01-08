import { type Component, onMount, Show } from "solid-js";
import { A, useParams } from "@solidjs/router";
import TagsDisplay from "@/components/TagsDisplay";
import CommandInput from "@/components/CommandInput";
import TestResultsList from "@/components/TestResultsList";
import OutputPanel from "@/components/OutputPanel";
import {
  challenges,
  cmd,
  isRunning,
  loadChallenges,
  runSubmission,
  selectedChallenge,
  selectedTest,
  setCmd,
  setSelectedChallengeId,
  setSelectedTest,
  setSubmission,
  submission,
} from "@/store";
import CheatSheet from "@/components/CheatSheet";

const ChallengeDetail: Component = () => {
  const params = useParams<{ id: string }>();

  onMount(async () => {
    if (challenges().length === 0) {
      await loadChallenges();
    }

    setSelectedChallengeId(params.id);
    setSubmission(null);
    setSelectedTest(null);
  });

  return (
    <>
      <div class="header">
        <A href="/">
          <img
            src="/assets/unix-challenge.png"
            alt="Unix Challenge"
            class="logo"
          />
        </A>
        <h1>{selectedChallenge()?.title || "Challenge"}</h1>
        <div class="back-link">
          <A href="/">← Back to Challenges</A>
        </div>
      </div>

      <Show
        when={selectedChallenge()}
        fallback={
          <div>
            <h2>Challenge not found</h2>
            <p>The challenge you're looking for doesn't exist.</p>
          </div>
        }
      >
        {(challenge) => (
          <>
            <div class="challenge-row">
              <TagsDisplay tags={challenge().tags} />

              <pre id="challenge-description">{challenge().description}</pre>

              <label>Command</label>
              <CommandInput
                value={cmd()}
                onInput={setCmd}
                onSubmit={runSubmission}
              />
            </div>

            <div class="row">
              <div>
                <h3>Tests</h3>
                <TestResultsList
                  results={submission()?.summary?.results}
                  isRunning={isRunning()}
                  error={submission()?.error}
                  onSelectTest={setSelectedTest}
                  selectedTest={selectedTest()}
                />
              </div>

              <OutputPanel selectedTest={selectedTest()} />

              <CheatSheet />
            </div>
          </>
        )}
      </Show>
    </>
  );
};

export default ChallengeDetail;
