import { type Component, onMount } from "solid-js";
import { Router, Route } from "@solidjs/router";
import ChallengeList from "@/pages/ChallengeList";
import ChallengeDetail from "@/pages/ChallengeDetail";
import { loadCurrentUser } from "@/store";

const App: Component = () => {
  onMount(() => {
    void loadCurrentUser();
  });

  return (
    <Router>
      <Route path="/" component={ChallengeList} />
      <Route path="/challenge/:id" component={ChallengeDetail} />
    </Router>
  );
};

export default App;
