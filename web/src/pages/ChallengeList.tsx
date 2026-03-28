import { type Component, For, onMount } from "solid-js";
import { A } from "@solidjs/router";
import SiteHeader from "@/components/SiteHeader";
import {
  challenges,
  filteredChallenges,
  loadChallenges,
  searchQuery,
  setSearchQuery,
} from "@/store";
import TagsDisplay from "@/components/TagsDisplay";

const getChallengeState = (state?: string) => {
  if (state === "completed") {
    return {
      label: "Completed",
      className: "challenge-state-completed",
      showChip: true,
    };
  }

  if (state === "attempted") {
    return {
      label: "Attempted",
      className: "challenge-state-attempted",
      showChip: true,
    };
  }

  return {
    label: "Untouched",
    className: "challenge-state-untouched",
    showChip: false,
  };
};

const ChallengeList: Component = () => {
  onMount(() => {
    void loadChallenges();
    document.title = "Unix Challenge";
  });

  return (
    <>
      <SiteHeader isChallengesPage />

      <div class="challenge-list-container">
        <div class="search-section">
          <label for="search-input">Search Challenges</label>
          <input
            id="search-input"
            type="text"
            placeholder="Search by title, description, or tags..."
            value={searchQuery()}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            class="search-input"
          />
        </div>

        <div class="challenges-grid">
          <For each={filteredChallenges()}>
            {(challenge) => {
              const challengeState = getChallengeState(challenge.progress_state);

              return (
                <A
                  href={`/challenge/${challenge.id}`}
                  class={`challenge-card ${challengeState.className}`}
                >
                  <div class="challenge-card-header">
                    <h3>{challenge.title}</h3>
                    {challengeState.showChip && (
                      <span class={`challenge-state-chip ${challengeState.className}`}>
                        {challengeState.label}
                      </span>
                    )}
                  </div>
                  <TagsDisplay tags={challenge.tags} />
                  <p class="challenge-preview">{challenge.description}</p>
                </A>
              );
            }}
          </For>
        </div>

        {filteredChallenges().length === 0 && challenges().length > 0 && (
          <p class="no-results">No challenges found matching your search.</p>
        )}

        {challenges().length === 0 && (
          <p class="no-results">Loading challenges...</p>
        )}
      </div>
    </>
  );
};

export default ChallengeList;
