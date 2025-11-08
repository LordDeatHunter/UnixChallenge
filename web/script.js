const api = "http://127.0.0.1:8000";

const $ = (id) => document.getElementById(id);

const loadChallenges = async () => {
  const res = await fetch(`${api}/challenges`);
  const data = await res.json();
  const sel = document.getElementById("challenge");

  sel.innerHTML = "";
  data.forEach((c) => {
    const opt = document.createElement("option");
    opt.value = c.id;
    opt.textContent = c.title ? `${c.title} (${c.id})` : c.id;
    sel.appendChild(opt);
  });
};

const run = async () => {
  const challenge_id = document.getElementById("challenge").value;
  const cmd = document.getElementById("cmd").value;
  $`test-results`.textContent = "Running...";

  const res = await fetch(api + "/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ challenge_id, cmd }),
  });

  const data = await res.json();
  createTestResults(data.summary.results);
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
  status.textContent = test.pass ? "✔" : "❌";
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

  return div;
};

const createTestResults = (results) => {
  const testResultsDiv = $("test-results");

  testResultsDiv.innerHTML = "";
  results.forEach((test, index) => {
    const testResultDiv = createTestResult(index + 1, test);
    testResultsDiv.appendChild(testResultDiv);
  });
};

document.addEventListener("DOMContentLoaded", () => {
  const tmp = $("cmd");
  console.log(tmp);

  $("cmd").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      run();
    }
  });
});

loadChallenges();
