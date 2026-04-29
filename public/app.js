const state = {
  health: null,
  documents: [],
  pages: [],
  answer: null,
  selectedPage: null,
  selectedPageSlug: null,
  lastCompileResult: null
};

const elements = {
  serviceStatus: document.querySelector("#service-status"),
  storageDriver: document.querySelector("#storage-driver"),
  llmProvider: document.querySelector("#llm-provider"),
  lastUpdated: document.querySelector("#last-updated"),
  documentCount: document.querySelector("#document-count"),
  pageCount: document.querySelector("#page-count"),
  queuedCount: document.querySelector("#queued-count"),
  processingCount: document.querySelector("#processing-count"),
  compiledCount: document.querySelector("#compiled-count"),
  compileActivity: document.querySelector("#compile-activity"),
  compileFeedback: document.querySelector("#compile-feedback"),
  documentStatusCopy: document.querySelector("#document-status-copy"),
  wikiList: document.querySelector("#wiki-list"),
  answerPanel: document.querySelector("#answer-panel"),
  documentForm: document.querySelector("#document-form"),
  submitDocumentButton: document.querySelector("#submit-document-button"),
  documentFeedback: document.querySelector("#document-feedback"),
  askForm: document.querySelector("#ask-form"),
  askButton: document.querySelector("#ask-button"),
  askFeedback: document.querySelector("#ask-feedback"),
  runCompileButton: document.querySelector("#run-compile-button"),
  refreshAllButton: document.querySelector("#refresh-all-button"),
  drawer: document.querySelector("#drawer"),
  drawerBackdrop: document.querySelector("#drawer-backdrop"),
  closeDrawerButton: document.querySelector("#close-drawer-button"),
  recompilePageButton: document.querySelector("#recompile-page-button"),
  drawerTitle: document.querySelector("#drawer-title"),
  drawerMeta: document.querySelector("#drawer-meta"),
  drawerSummary: document.querySelector("#drawer-summary"),
  drawerBody: document.querySelector("#drawer-body"),
  drawerSources: document.querySelector("#drawer-sources")
};

function formatTime(value) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
}

async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers ?? {})
    },
    ...options
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.message || data?.error || `Request failed with ${response.status}`);
  }

  return data;
}

function setFeedback(element, message, tone = "muted") {
  element.textContent = message;
  element.style.color = tone === "danger" ? "var(--danger)" : "var(--muted)";
}

function renderHealth() {
  const health = state.health;
  if (!health) {
    return;
  }

  elements.serviceStatus.textContent = health.status === "ok" ? "Online" : health.status;
  elements.storageDriver.textContent = health.storageDriver;
  elements.llmProvider.textContent = `${health.llmProvider} / ${health.llmModel}`;
  elements.lastUpdated.textContent = formatTime(health.timestamp);
}

function renderCounts() {
  elements.documentCount.textContent = `${state.documents.length} docs`;
  elements.pageCount.textContent = `${state.pages.length} pages`;

  const counts = state.documents.reduce((accumulator, document) => {
    accumulator[document.status] = (accumulator[document.status] ?? 0) + 1;
    return accumulator;
  }, {});

  elements.queuedCount.textContent = String(counts.queued ?? 0);
  elements.processingCount.textContent = String(counts.processing ?? 0);
  elements.compiledCount.textContent = String(counts.compiled ?? 0);
}

function renderWikiList() {
  if (state.pages.length === 0) {
    elements.wikiList.innerHTML = '<div class="empty-state">No compiled pages yet. Run a document through the compiler to populate this list.</div>';
    return;
  }

  elements.wikiList.innerHTML = state.pages.map((page) => `
    <button class="list-item" type="button" data-page-slug="${page.slug}">
      <div class="list-item-meta">${page.slug} • revision ${page.revision}</div>
      <h3>${escapeHtml(page.title)}</h3>
      <p>${escapeHtml(page.summary)}</p>
    </button>
  `).join("");

  elements.wikiList.querySelectorAll("[data-page-slug]").forEach((node) => {
    node.addEventListener("click", () => {
      void openDrawer(node.getAttribute("data-page-slug"));
    });
  });
}

function renderAnswer() {
  if (!state.answer) {
    elements.answerPanel.classList.add("empty");
    elements.answerPanel.innerHTML = '<p class="empty-copy">Answers and source evidence will appear here.</p>';
    return;
  }

  elements.answerPanel.classList.remove("empty");

  const evidenceMarkup = state.answer.evidence.length > 0
    ? state.answer.evidence.map((entry) => `
      <article class="evidence-item">
        <button class="inline-link" type="button" data-page-slug="${entry.pageSlug}">${escapeHtml(entry.pageTitle)}</button>
        <p><strong>${escapeHtml(entry.sourceLabel)}</strong></p>
        <p>${escapeHtml(entry.excerpt) || "No source excerpt returned."}</p>
      </article>
    `).join("")
    : '<div class="empty-state">No evidence pages matched this question.</div>';

  elements.answerPanel.innerHTML = `
    <section class="answer-summary">
      <h3>Answer</h3>
      <p>${escapeHtml(state.answer.answer)}</p>
    </section>
    <section>
      <p class="eyebrow">Evidence</p>
      <div class="evidence-list">${evidenceMarkup}</div>
    </section>
  `;

  elements.answerPanel.querySelectorAll("[data-page-slug]").forEach((node) => {
    node.addEventListener("click", () => {
      void openDrawer(node.getAttribute("data-page-slug"));
    });
  });
}

function renderCompileActivity() {
  if (!state.lastCompileResult) {
    elements.compileActivity.textContent = "No compile run in this session yet.";
    return;
  }

  const { processed, happenedAt } = state.lastCompileResult;
  elements.compileActivity.textContent = `Processed ${processed} queued job${processed === 1 ? "" : "s"} at ${formatTime(happenedAt)}.`;
}

function renderDocumentStatus(message = "No recent submission in this session.") {
  elements.documentStatusCopy.textContent = message;
}

function renderDrawer() {
  const page = state.selectedPage;

  if (!page) {
    elements.drawer.classList.remove("open");
    elements.drawer.setAttribute("aria-hidden", "true");
    return;
  }

  elements.drawer.classList.add("open");
  elements.drawer.setAttribute("aria-hidden", "false");
  elements.drawerTitle.textContent = page.title;
  elements.drawerMeta.textContent = `${page.slug} • revision ${page.revision} • updated ${formatTime(page.updatedAt)}`;
  elements.drawerSummary.textContent = page.summary || "No summary available.";
  elements.drawerBody.textContent = page.bodyMarkdown || "No body content available.";

  if ((page.sourceRefs ?? []).length === 0) {
    elements.drawerSources.innerHTML = '<div class="empty-state">No source references captured for this page.</div>';
    return;
  }

  elements.drawerSources.innerHTML = page.sourceRefs.map((source) => `
    <article class="source-item">
      <strong>${escapeHtml(source.label)}</strong>
      <p>${escapeHtml(source.excerpt)}</p>
    </article>
  `).join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function refreshWorkspace() {
  const [health, documents, wiki] = await Promise.all([
    requestJson("/health"),
    requestJson("/documents"),
    requestJson("/wiki")
  ]);

  state.health = health;
  state.documents = documents.documents ?? [];
  state.pages = wiki.pages ?? [];

  renderHealth();
  renderCounts();
  renderWikiList();
  renderCompileActivity();
}

async function refreshDrawerIfOpen() {
  if (!state.selectedPageSlug) {
    return;
  }

  await openDrawer(state.selectedPageSlug);
}

async function openDrawer(slug) {
  if (!slug) {
    return;
  }

  const detail = await requestJson(`/wiki/${encodeURIComponent(slug)}`);
  state.selectedPageSlug = slug;
  state.selectedPage = detail.page;
  renderDrawer();
}

function closeDrawer() {
  state.selectedPage = null;
  state.selectedPageSlug = null;
  renderDrawer();
}

async function handleDocumentSubmit(event) {
  event.preventDefault();
  elements.submitDocumentButton.disabled = true;
  setFeedback(elements.documentFeedback, "Submitting document to the queue...");
  renderDocumentStatus("Creating the document record and queue entry...");

  const formData = new FormData(elements.documentForm);
  const payload = {
    title: String(formData.get("title") ?? ""),
    sourceType: String(formData.get("sourceType") ?? "text"),
    rawContent: String(formData.get("rawContent") ?? "")
  };

  try {
    const result = await requestJson("/documents", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    elements.documentForm.reset();
    setFeedback(elements.documentFeedback, `Queued ${result.document.title}. Use Run Compile to build or refresh its wiki page.`);
    renderDocumentStatus(`Queued "${result.document.title}" successfully. It is now waiting in the compile queue.`);
    await refreshWorkspace();
  } catch (error) {
    setFeedback(elements.documentFeedback, error.message, "danger");
    renderDocumentStatus("The submission failed before it reached the queue.");
  } finally {
    elements.submitDocumentButton.disabled = false;
  }
}

async function handleCompileRun() {
  elements.runCompileButton.disabled = true;
  elements.compileActivity.textContent = "Running compilation now...";
  setFeedback(elements.compileFeedback, "Sending compile request...");

  try {
    const result = await requestJson("/jobs/compile", {
      method: "POST",
      body: JSON.stringify({})
    });
    state.lastCompileResult = {
      processed: result.processed ?? 0,
      happenedAt: new Date().toISOString()
    };
    await refreshWorkspace();
    await refreshDrawerIfOpen();
    setFeedback(
      elements.compileFeedback,
      result.processed > 0
        ? `Compile finished successfully. Processed ${result.processed} queued job${result.processed === 1 ? "" : "s"}.`
        : "Compile finished successfully. There were no queued documents to process."
    );
    renderDocumentStatus(result.processed > 0
      ? `Compile finished. ${result.processed} queued job${result.processed === 1 ? "" : "s"} processed.`
      : "Compile ran successfully, but there were no queued documents to process.");
  } catch (error) {
    elements.compileActivity.textContent = error.message;
    setFeedback(elements.compileFeedback, error.message, "danger");
  } finally {
    elements.runCompileButton.disabled = false;
    renderCompileActivity();
  }
}

async function handleAskSubmit(event) {
  event.preventDefault();
  elements.askButton.disabled = true;
  setFeedback(elements.askFeedback, "Running wiki answer synthesis...");

  const formData = new FormData(elements.askForm);
  const payload = {
    question: String(formData.get("question") ?? "")
  };

  try {
    state.answer = await requestJson("/ask", {
      method: "POST",
      body: JSON.stringify(payload)
    });
    renderAnswer();
    setFeedback(elements.askFeedback, `Answered with ${state.answer.evidence.length} evidence page(s).`);
  } catch (error) {
    setFeedback(elements.askFeedback, error.message, "danger");
  } finally {
    elements.askButton.disabled = false;
  }
}

async function handlePageRecompile() {
  if (!state.selectedPageSlug) {
    return;
  }

  elements.recompilePageButton.disabled = true;

  try {
    await requestJson(`/wiki/${encodeURIComponent(state.selectedPageSlug)}/recompile`, {
      method: "POST"
    });
    state.lastCompileResult = {
      processed: 1,
      happenedAt: new Date().toISOString()
    };
    await handleCompileRun();
  } catch (error) {
    elements.drawerSummary.textContent = error.message;
  } finally {
    elements.recompilePageButton.disabled = false;
  }
}

elements.documentForm.addEventListener("submit", (event) => {
  void handleDocumentSubmit(event);
});

elements.askForm.addEventListener("submit", (event) => {
  void handleAskSubmit(event);
});

elements.runCompileButton.addEventListener("click", () => {
  void handleCompileRun();
});

elements.refreshAllButton.addEventListener("click", () => {
  void refreshWorkspace();
});

elements.closeDrawerButton.addEventListener("click", closeDrawer);
elements.drawerBackdrop.addEventListener("click", closeDrawer);
elements.recompilePageButton.addEventListener("click", () => {
  void handlePageRecompile();
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeDrawer();
  }
});

void (async function init() {
  try {
    await refreshWorkspace();
    renderAnswer();
    renderDocumentStatus();
  } catch (error) {
    setFeedback(elements.documentFeedback, error.message, "danger");
    setFeedback(elements.askFeedback, "Initial workspace refresh failed.", "danger");
  }
})();
