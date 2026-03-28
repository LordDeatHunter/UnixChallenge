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
            {(challenge) => (
              <A href={`/challenge/${challenge.id}`} class="challenge-card">
                <div class="challenge-card-header">
                  <h3>{challenge.title}</h3>
                  {challenge.completed && (
                    <span class="challenge-complete-badge">Complete</span>
                  )}
                </div>
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
