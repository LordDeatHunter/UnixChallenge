import { type Component } from "solid-js";
import { Router, Route } from "@solidjs/router";
import ChallengeList from "@/pages/ChallengeList";
import ChallengeDetail from "@/pages/ChallengeDetail";

const App: Component = () => (
  <Router>
    <Route path="/" component={ChallengeList} />
    <Route path="/challenge/:id" component={ChallengeDetail} />
  </Router>
);

export default App;
