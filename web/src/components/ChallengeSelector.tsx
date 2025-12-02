import { Component, For } from "solid-js";
import { Challenge } from "@/types";

interface ChallengeSelectorProps {
  challenges: Challenge[];
  selectedChallengeId: string;
  onChallengeChange: (id: string) => void;
}

const ChallengeSelector: Component<ChallengeSelectorProps> = (props) => (
  <select
    id="challenge-select"
    value={props.selectedChallengeId}
    onChange={(e) => props.onChallengeChange(e.currentTarget.value)}
  >
    <For each={props.challenges}>
      {(challenge) => (
        <option value={challenge.id}>
          {challenge.title
            ? `${challenge.title} (${challenge.id})`
            : challenge.id}
        </option>
      )}
    </For>
  </select>
);

export default ChallengeSelector;
