import { type Component, For, onMount } from "solid-js";
import { A } from "@solidjs/router";
import {
  challenges,
  filteredChallenges,
  loadChallenges,
  searchQuery,
  setSearchQuery,
} from "@/store";
import TagsDisplay from "@/components/TagsDisplay";

const ChallengeList: Component = () => {
  onMount(() => {
    void loadChallenges();
  });

  return (
    <>
      <div class="header">
        <img
          src="/assets/unix-challenge.png"
          alt="Unix Challenge"
          class="logo"
        />
        <h1>Unix Challenge (name subject to change)</h1>
      </div>

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
            {(challenge) => (
              <A href={`/challenge/${challenge.id}`} class="challenge-card">
                <h3>{challenge.title}</h3>
                <TagsDisplay tags={challenge.tags} />
                <p class="challenge-preview">{challenge.description}</p>
              </A>
            )}
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
