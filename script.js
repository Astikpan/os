let processes = [];
let schedule = [];
let completed = [];

const pidInput = document.getElementById("pid");
const arrivalInput = document.getElementById("arrivalTime");
const burstInput = document.getElementById("burstTime");
const priorityInput = document.getElementById("priority");
const quantumInput = document.getElementById("quantum");
const processForm = document.getElementById("processForm");
const algorithmSelect = document.getElementById("algorithm");
const runButton = document.getElementById("run");
const resetButton = document.getElementById("reset");
const processTableContainer = document.getElementById("processTableContainer");
const outputContainer = document.getElementById("output");
const theorySection = document.getElementById("theorySection");

algorithmSelect.addEventListener("change", () => {
  quantumInput.style.display = algorithmSelect.value === "RR" ? "inline-block" : "none";
});

processForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const pid = pidInput.value.trim();
  const arrival = parseInt(arrivalInput.value);
  const burst = parseInt(burstInput.value);
  const priority = priorityInput.value ? parseInt(priorityInput.value) : 0;

  if (!pid || isNaN(arrival) || isNaN(burst)) {
    alert("Enter valid details");
    return;
  }

  processes.push({ pid, arrival, burst, remaining: burst, priority });
  processForm.reset();
  renderProcessTable();
});

runButton.addEventListener("click", () => {
  if (processes.length === 0) {
    alert("Add at least one process.");
    return;
  }

  const algo = algorithmSelect.value;
  const quantum = parseInt(quantumInput.value);
  const cloned = JSON.parse(JSON.stringify(processes));

  schedule = [];
  completed = [];

  switch (algo) {
    case "FCFS": fcfs(cloned); break;
    case "SJF": sjf(cloned); break;
    case "SJF-Preemptive": sjfPreemptive(cloned); break;
    case "Priority": priorityScheduling(cloned); break;
    case "Priority-Preemptive": priorityPreemptive(cloned); break;
    case "RR":
      if (isNaN(quantum) || quantum <= 0) {
        alert("Invalid quantum");
        return;
      }
      roundRobin(cloned, quantum); break;
  }

  renderOutput();
  showTheory(algo);
});

resetButton.addEventListener("click", () => {
  processes = [];
  schedule = [];
  completed = [];
  outputContainer.innerHTML = "";
  processTableContainer.innerHTML = "";
  theorySection.innerHTML = "";
  processForm.reset();
});

function fcfs(procs) {
  procs.sort((a, b) => a.arrival - b.arrival);
  let time = 0;
  for (let p of procs) {
    time = Math.max(time, p.arrival);
    p.start = time;
    time += p.burst;
    p.finish = time;
    completed.push(p);
    schedule.push({ pid: p.pid, start: p.start, finish: p.finish });
  }
}

function sjf(procs) {
  let time = 0;
  while (completed.length < procs.length) {
    const ready = procs.filter(p => !p.done && p.arrival <= time);
    if (!ready.length) { time++; continue; }
    ready.sort((a, b) => a.burst - b.burst);
    const p = ready[0];
    p.start = time;
    time += p.burst;
    p.finish = time;
    p.done = true;
    completed.push(p);
    schedule.push({ pid: p.pid, start: p.start, finish: p.finish });
  }
}

function sjfPreemptive(procs) {
  let time = 0, current = null, lastSwitch = 0;
  while (completed.length < procs.length) {
    const ready = procs.filter(p => !p.done && p.arrival <= time);
    if (!ready.length) { time++; continue; }
    ready.sort((a, b) => a.remaining - b.remaining);
    const next = ready[0];

    if (current !== next) {
      if (current) schedule.push({ pid: current.pid, start: lastSwitch, finish: time });
      current = next;
      lastSwitch = time;
    }

    current.remaining--;
    time++;

    if (current.remaining === 0) {
      current.finish = time;
      current.done = true;
      completed.push(current);
      schedule.push({ pid: current.pid, start: lastSwitch, finish: time });
      current = null;
    }
  }
}

function priorityScheduling(procs) {
  let time = 0;
  while (completed.length < procs.length) {
    const ready = procs.filter(p => !p.done && p.arrival <= time);
    if (!ready.length) { time++; continue; }
    ready.sort((a, b) => a.priority - b.priority);
    const p = ready[0];
    p.start = time;
    time += p.burst;
    p.finish = time;
    p.done = true;
    completed.push(p);
    schedule.push({ pid: p.pid, start: p.start, finish: p.finish });
  }
}

function priorityPreemptive(procs) {
  let time = 0, current = null, lastSwitch = 0;
  while (completed.length < procs.length) {
    const ready = procs.filter(p => !p.done && p.arrival <= time);
    if (!ready.length) { time++; continue; }
    ready.sort((a, b) => a.priority - b.priority);
    const next = ready[0];

    if (current !== next) {
      if (current) schedule.push({ pid: current.pid, start: lastSwitch, finish: time });
      current = next;
      lastSwitch = time;
    }

    current.remaining--;
    time++;

    if (current.remaining === 0) {
      current.finish = time;
      current.done = true;
      completed.push(current);
      schedule.push({ pid: current.pid, start: lastSwitch, finish: time });
      current = null;
    }
  }
}

function roundRobin(procs, quantum) {
  let time = 0, queue = [], i = 0;
  procs.sort((a, b) => a.arrival - b.arrival);

  while (completed.length < procs.length) {
    while (i < procs.length && procs[i].arrival <= time) queue.push(procs[i++]);
    if (!queue.length) { time++; continue; }

    const p = queue.shift();
    const start = time;
    const run = Math.min(quantum, p.remaining);
    time += run;
    p.remaining -= run;
    schedule.push({ pid: p.pid, start, finish: time });

    while (i < procs.length && procs[i].arrival <= time) queue.push(procs[i++]);
    if (p.remaining > 0) queue.push(p);
    else { p.finish = time; completed.push(p); }
  }
}

function renderProcessTable() {
  let html = "<h2>Process List</h2><table><tr><th>PID</th><th>Arrival</th><th>Burst</th><th>Priority</th></tr>";
  for (const p of processes)
    html += `<tr><td>${p.pid}</td><td>${p.arrival}</td><td>${p.burst}</td><td>${p.priority}</td></tr>`;
  html += "</table>";
  processTableContainer.innerHTML = html;
}

function renderOutput() {
  let html = "<h2>Gantt Chart</h2><div class='gantt'>";
  for (const s of schedule) {
    const color = "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
    html += `<div title="${s.pid}: ${s.start}-${s.finish}" style="background:${color};">${s.pid}<br>${s.start}-${s.finish}</div>`;
  }
  html += "</div><h2>Performance</h2><table><tr><th>PID</th><th>Waiting</th><th>Turnaround</th></tr>";

  let wt = 0, tat = 0;
  for (const p of completed) {
    const turn = p.finish - p.arrival;
    const wait = turn - p.burst;
    wt += wait;
    tat += turn;
    html += `<tr><td>${p.pid}</td><td>${wait}</td><td>${turn}</td></tr>`;
  }

  html += `</table><p>Avg Waiting: ${(wt / completed.length).toFixed(2)}</p><p>Avg Turnaround: ${(tat / completed.length).toFixed(2)}</p>`;
  outputContainer.innerHTML = html;
}

function showTheory(algo) {
  const theories = {
    "FCFS": "FCFS is the simplest and most straightforward CPU scheduling algorithm. In this method, the process that arrives first in the ready queue is executed first. It follows the FIFO (First In, First Out) principle..",
    "SJF": "In Non-Preemptive SJF, the process with the shortest burst time is selected next. Once a process starts executing, it runs to completion without interruption.",
    "SJF-Preemptive": "In Preemptive SJF, the CPU is assigned to the process with the shortest remaining burst time. If a new process arrives with a shorter burst time than the currently running process, it preempts the CPU(also called SRTF – Shortest Remaining Time First)",
    "Priority": "In this type, each process is assigned a priority. The CPU is given to the process with the highest priority. If two processes have the same priority, FCFS is used.",
    "Priority-Preemptive": "Same as above, but if a new process with a higher priority arrives, it preempts the current process and gets the CPU immediately.",
    "RR": "Round Robin is a preemptive scheduling algorithm where each process is given a fixed time slot called a time quantum. If the process doesn’t finish in that time, it goes to the end of the queue and waits for its next turn."
  };
  theorySection.innerHTML = `<h2>Theory</h2><p>${theories[algo]}</p>`;
}

function toggleTheme() {
  document.body.classList.toggle("dark");
}

function exportToPDF() {
  const content = document.body;
  const opt = {
    margin: 0.5,
    filename: 'CPU_Scheduler.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  };
  html2pdf().from(content).set(opt).save();
}
