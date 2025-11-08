const api = "http://127.0.0.1:8000";

const $ = (id) => document.getElementById(id);

let CHALLENGES = {};
let LAST_SUBMISSION = null;

const loadChallenges = async () => {
  const res = await fetch(`${api}/challenges`);
  const data = await res.json();
  const sel = $`challenge-select`;

  CHALLENGES = {};
  data.forEach((c) => {
    CHALLENGES[c.id] = c;
  });

  sel.innerHTML = "";
  data.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.title ? `${c.title} (${c.id})` : c.id;
    sel.appendChild(opt);
  });

  $`challenge-description`.textContent =
    CHALLENGES[$`challenge-select`.value]?.description || "";
};

const run = async () => {
  const challenge_id = $`challenge-select`.value;
  const cmd = $`cmd`.value;
  $`test-results`.textContent = "Running...";

  const res = await fetch(api + "/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge_id, cmd }),
  });

  LAST_SUBMISSION = await res.json();
  createTestResults();
};

const createTestResult = (index, test) => {
  const div = document.createElement("div");
  div.classList.add("test-result");
  div.classList.add(test.pass ? "test-pass" : "test-fail");

  const indexSpan = document.createElement("span");
  indexSpan.textContent = `${index}.`;
  indexSpan.classList.add("test-index");
  div.appendChild(indexSpan);

  const status = document.createElement("span");
  status.textContent = test.pass ? "✔" : "✘";
  status.classList.add("test-status");
  div.appendChild(status);

  const desc = document.createElement("span");
  if (test.pass) {
    desc.textContent = `Finished in ${test.elapsed_ms}ms`;
  } else {
    desc.textContent = `Failed in ${test.elapsed_ms}ms`;
  }
  desc.classList.add("test-description");
  div.appendChild(desc);

  div.addEventListener("click", () => {
    $`expected-output`.textContent = test.expected || "";
    $`stdout`.textContent = test.stdout || "";
    $`stderr`.textContent = test.stderr || "";
  });

  return div;
};

const createTestResults = () => {
  if (!LAST_SUBMISSION || !LAST_SUBMISSION.summary) return;

  const testResultsDiv = $("test-results");

  testResultsDiv.innerHTML = "";
  LAST_SUBMISSION.summary.results.forEach((test, index) => {
    const testResultDiv = createTestResult(index + 1, test);
    testResultsDiv.appendChild(testResultDiv);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  $`cmd`.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      run();
    }
  });

  $`challenge-select`.addEventListener("change", () => {
    $`test-results`.innerHTML = "No tests run yet.";
    $`challenge-description`.textContent =
      CHALLENGES[$`challenge-select`.value]?.description || "";
    $`expected-output`.textContent = "";
    $`stdout`.textContent = "";
    $`stderr`.textContent = "";
  });
});

loadChallenges();
