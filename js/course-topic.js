// 🔥 COMPLETE course-topic.js - AAPKA SAB ORIGINAL LOGIC + FULL FEATURES

let currentCourseId = null;
let currentTopicIndex = 1;   // 1-based
let currentTopicID = null;
let totalTopics = 0;
let allTopics = [];
let mcqQuestions = [];
let mcqCurrentIndex = 0;
let mcqAnswers = {};
let mcqCompleted = false;

document.addEventListener('DOMContentLoaded', async () => {
  const storedUserId = localStorage.getItem('lsm_user_id');
  const urlParams = new URLSearchParams(window.location.search);

  console.log('Current search:', window.location.search);
  currentCourseId   = urlParams.get('courseId');
  const paramTopic  = urlParams.get('topicIndex');
  currentTopicIndex = parseInt(paramTopic, 10) || 1;
  const urlUserId   = urlParams.get('userId');

  if (isNaN(currentTopicIndex) || currentTopicIndex < 1) currentTopicIndex = 1;

  if (!currentCourseId || !urlUserId || !storedUserId || storedUserId !== urlUserId) {
    alert('Security error. Please login again.');
    window.location.href = 'login.html';
    return;
  }

  window.userId = urlUserId;

  try {
    await Promise.all([
      loadTopic(currentCourseId, currentTopicIndex),
      loadSidebarTopics(currentCourseId)
    ]);
    setupEventListeners();
    updateTopicNumbers();
  } catch (err) {
    console.error('Init error:', err);
  }
});

/* ================== EVENT LISTENERS ================== */
function setupEventListeners() {
  // Video navigation
  document.getElementById('video-prev')?.addEventListener('click', () => navigateTopic(-1));
  document.getElementById('video-next')?.addEventListener('click', () => {
    if (mcqCompleted || mcqQuestions.length === 0) navigateTopic(1);
    else {
      alert('⚠️ Pehle Quiz complete karo!');
      document.querySelector('.tab-item[data-tab="quiz"]').click();
    }
  });

  // Topic navigation (backup)
  document.getElementById('prev-topic')?.addEventListener('click', () => navigateTopic(-1));
  document.getElementById('next-topic')?.addEventListener('click', () => navigateTopic(1));

  // MCQ controls
  document.getElementById('mcq-prev')?.addEventListener('click', () => {
    saveCurrentMCQSelection();
    if (mcqCurrentIndex > 0) {
      mcqCurrentIndex--;
      renderCurrentMCQ();
    }
  });

  document.getElementById('mcq-next')?.addEventListener('click', () => {
    saveCurrentMCQSelection();
    if (mcqCurrentIndex < mcqQuestions.length - 1) {
      mcqCurrentIndex++;
      renderCurrentMCQ();
    }
  });

  document.getElementById('mcq-submit')?.addEventListener('click', submitMCQQuiz);
  document.getElementById('mcq-retest')?.addEventListener('click', retakeMCQQuiz);
}

/* ================== LOAD TOPIC ================== */
async function loadTopic(courseId, topicIndex) {
  const titleEl = document.getElementById('topic-title');
  showLoading(titleEl, 'Loading topic...');

  // Show loading states
  ['video-duration','topic-level','topic-objectives','topic-status','topic-description','topic-notes'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.add('loading');
  });

  try {
    const params = new URLSearchParams({
      action: 'getTopicDetail',
      courseId: courseId,
      topicIndex: topicIndex,
      userId: window.userId
    });

    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.status === 'success' && data.data) {
      const topic = data.data;
      currentTopicID = topic.TopicID;
      totalTopics = topic.TotalTopics || 0;
      currentTopicIndex = topic.TopicIndex || topicIndex;

      const topicCompleted = !!data.isCompleted;
      const assignmentDone = !!data.isAssignmentCompleted;
      const canGoNextFromThis = topicCompleted && assignmentDone;
      mcqCompleted = assignmentDone;

      displayTopicContent(topic);
      updateNavigationButtons(canGoNextFromThis);
      updateNextTopicLockInList(canGoNextFromThis);
      await loadMCQAssignment(currentCourseId, currentTopicID);
      updateCompletionStatus(topicCompleted);
      updateTopicNumbers();
    } else {
      throw new Error(data.message || 'Topic not found');
    }
  } catch (error) {
    console.error('Topic load error:', error);
    showError('Failed to load topic');
  }
}

function displayTopicContent(topic) {
  document.getElementById('topic-title').textContent = `${topic.TopicIndex}. ${topic.Title}`;
  document.getElementById('topic-progress').textContent = `${topic.Progress || 0}%`;
  document.getElementById('progress-fill').style.width = `${topic.Progress || 0}%`;
  
  document.getElementById('video-duration').textContent = topic.Duration || 'N/A';
  document.getElementById('topic-level').textContent = topic.Level || 'Beginner';
  document.getElementById('topic-objectives').textContent = topic.Objectives || 'N/A';
  document.getElementById('topic-status').textContent = topic.Status || 'In Progress';
  document.getElementById('topic-description').textContent = topic.Description || 'No description available';

  const notesEl = document.getElementById('topic-notes');
  notesEl.innerHTML = topic.NotesContent 
    ? topic.NotesContent.replace(/\n/g, '<br>')
    : '<span style="color:var(--text-light);">No notes available</span>';

  const videoFrame = document.getElementById('topic-video');
  if (videoFrame && topic.VideoURL) {
    const videoId = topic.VideoURL.split('v=')[1]?.split('&')[0] || topic.VideoURL.split('/').pop();
    videoFrame.src = `https://www.youtube.com/embed/${videoId}?rel=0&modestbranding=1`;
  }

  document.getElementById('course-title-sidebar').textContent = topic.CourseTitle || `Course: ${currentCourseId}`;
}

/* ================== SIDEBAR TOPICS ================== */
async function loadSidebarTopics(courseId) {
  const container = document.getElementById('sidebar-topic-list');
  showLoading(container, 'Loading topics...');

  try {
    const params = new URLSearchParams({ action: 'getCourseTopicsList', courseId });
    const response = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`);
    const data = await response.json();

    if (data.status === 'success' && Array.isArray(data.data)) {
      allTopics = data.data;
      displayTopicList(data.data);
    } else {
      container.innerHTML = '<div class="error">No topics found</div>';
    }
  } catch (error) {
    console.error('Sidebar error:', error);
    container.innerHTML = '<div class="error">Failed to load topics</div>';
  }
}

function displayTopicList(topics) {
  const container = document.getElementById('sidebar-topic-list');
  container.innerHTML = '';

  topics.sort((a, b) => Number(a.Order || a.TopicIndex) - Number(b.Order || b.TopicIndex));

  topics.forEach((topic, idx) => {
    const listIndex = idx + 1;
    const li = document.createElement('div');
    li.className = `topic-item ${listIndex === currentTopicIndex ? 'active' : ''}`;

    let isLocked = false, lockIcon = '';
    if (listIndex > currentTopicIndex) {
      if (!mcqCompleted) {
        li.classList.add('locked-topic');
        isLocked = true;
        lockIcon = ' <span class="topic-lock">🔒</span>';
      }
    }

    li.innerHTML = `
      <a href="#" style="text-decoration:none;color:inherit;">
        <span class="topic-number">${listIndex}.</span>
        <span class="topic-name">${topic.Title}</span>${lockIcon}
      </a>
    `;

    li.querySelector('a').addEventListener('click', (e) => {
      e.preventDefault();
      if (isLocked) {
        showToast('🔒 Complete current quiz first!');
        return;
      }
      switchTopic(listIndex);
    });

    container.appendChild(li);
  });
}

/* ================== NAVIGATION ================== */
function navigateTopic(direction) {
  const newIndex = currentTopicIndex + direction;
  if (newIndex >= 1 && newIndex <= totalTopics) {
    window.location.href = `course-topic.html?courseId=${encodeURIComponent(currentCourseId)}&topicIndex=${newIndex}&userId=${encodeURIComponent(window.userId)}`;
  } else {
    showToast('No more topics available');
  }
}

function switchTopic(newIndex) {
  if (newIndex >= 1 && newIndex <= totalTopics) {
    window.location.href = `course-topic.html?courseId=${encodeURIComponent(currentCourseId)}&topicIndex=${newIndex}&userId=${encodeURIComponent(window.userId)}`;
  }
}

/* ================== MCQ SYSTEM ================== */
async function loadMCQAssignment(courseId, topicId) {
  const container = document.getElementById('mcq-container');
  if (!container) return;

  const nextBtn = document.getElementById('video-next') || document.getElementById('next-topic');
  if (nextBtn) nextBtn.disabled = true;

  try {
    const params = new URLSearchParams({
      action: 'getTopicMCQs',
      courseId, topicId, userId: window.userId
    });

    const res = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`);
    const data = await res.json();

    if (data.status === 'success' && Array.isArray(data.data) && data.data.length) {
      mcqQuestions = data.data.map(q => ({
        QuestionID: q.QuestionID, QuestionText: q.QuestionText,
        OptionA: q.OptionA, OptionB: q.OptionB, OptionC: q.OptionC, OptionD: q.OptionD
      }));
      mcqCurrentIndex = 0;
      mcqAnswers = {};
      mcqCompleted = data.isAssignmentCompleted || false;
      
      renderCurrentMCQ();

      if (mcqCompleted) {
        updateNavigationButtons(true);
      }

      const retestBtn = document.getElementById('mcq-retest');
      if (retestBtn) retestBtn.style.display = mcqCompleted ? 'inline-block' : 'none';
      
    } else {
      mcqQuestions = [];
      container.innerHTML = '<p style="text-align:center;color:var(--pista-green);font-weight:500;">✅ No quiz for this topic. Next topic unlocked!</p>';
      updateNavigationButtons(true);
      updateNextTopicLockInList(true);
    }
  } catch (err) {
    console.error('MCQ load error:', err);
    container.innerHTML = '<p style="color:#ef4444;">Failed to load quiz</p>';
  }
}

function renderCurrentMCQ() {
  if (!mcqQuestions.length) return;

  const qTextEl = document.getElementById('mcq-question-text');
  const optsEl = document.getElementById('mcq-options');
  const progEl = document.getElementById('mcq-progress');
  
  if (!qTextEl || !optsEl) {
    setTimeout(renderCurrentMCQ, 100);
    return;
  }

  const q = mcqQuestions[mcqCurrentIndex];
  const selected = mcqAnswers[q.QuestionID] || null;

  qTextEl.textContent = `${mcqCurrentIndex + 1}. ${q.QuestionText}`;
  
  const optionsHtml = ['A','B','C','D'].map(letter => {
    const text = q[`Option${letter}`];
    if (!text) return '';
    const checked = selected === letter ? 'checked' : '';
    return `
      <label class="mcq-option">
        <input type="radio" name="mcq-option" value="${letter}" ${checked}>
        <span>${letter}. ${text}</span>
      </label>
    `;
  }).join('');

  optsEl.innerHTML = optionsHtml;
  progEl.textContent = `Question ${mcqCurrentIndex + 1} of ${mcqQuestions.length}`;

  const prevBtn = document.getElementById('mcq-prev');
  const nextBtn = document.getElementById('mcq-next');
  const submitBtn = document.getElementById('mcq-submit');
  
  if (prevBtn) prevBtn.disabled = mcqCurrentIndex === 0;
  if (nextBtn) nextBtn.disabled = mcqCurrentIndex === mcqQuestions.length - 1;
  if (submitBtn) submitBtn.disabled = !canEnableSubmit();

  const radios = optsEl.querySelectorAll('input[name="mcq-option"]');
  radios.forEach(r => {
    r.addEventListener('change', () => {
      mcqAnswers[q.QuestionID] = r.value;
      if (submitBtn) submitBtn.disabled = !canEnableSubmit();
    });
  });
}

function saveCurrentMCQSelection() {
  if (!mcqQuestions.length) return;
  const q = mcqQuestions[mcqCurrentIndex];
  const selectedInput = document.querySelector('input[name="mcq-option"]:checked');
  if (selectedInput) {
    mcqAnswers[q.QuestionID] = selectedInput.value;
  }
}

function canEnableSubmit() {
  const attempted = Object.keys(mcqAnswers).length;
  const onLast = mcqCurrentIndex === mcqQuestions.length - 1;
  return onLast && attempted > 0;
}

/* ================== SUBMIT MCQ QUIZ ================== */
async function submitMCQQuiz() {
  if (!mcqQuestions.length) return;

  saveCurrentMCQSelection();

  if (Object.keys(mcqAnswers).length === 0) {
    showToast('Attempt at least one question before submitting');
    return;
  }

  const submitBtn = document.getElementById('mcq-submit');
  const resultEl = document.getElementById('mcq-result');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  try {
    const answersArray = Object.entries(mcqAnswers).map(([questionId, selected]) => ({
      questionId, selected
    }));

    const params = new URLSearchParams({
      action: 'submitMCQAssignment',
      userId: window.userId,
      courseId: currentCourseId,
      topicId: currentTopicID,
      answers: JSON.stringify(answersArray)
    });

    const res = await fetch(`${GOOGLE_SCRIPT_URL}?${params.toString()}`, { method: 'POST' });
    const data = await res.json();

    if (data.status === 'success' && data.data) {
      const { totalQuestions, attemptedCount, correctCount, perQuestionResult } = data.data;

      if (resultEl) {
        resultEl.textContent = `You attempted ${attemptedCount} out of ${totalQuestions} and got ${correctCount} correct.`;
        resultEl.style.color = correctCount >= 3 ? 'var(--pista-green)' : '#ef4444';
      }

      mcqCompleted = true;
      showToast('✅ Quiz submitted! Next topic unlocked!');

      updateNavigationButtons(true);
      updateNextTopicLockInList(true);

      // Mark topic complete
      try {
        const completeParams = new URLSearchParams({
          action: 'markTopicComplete',
          userId: window.userId,
          courseId: currentCourseId,
          topicId: currentTopicID
        });

        await fetch(`${GOOGLE_SCRIPT_URL}?${completeParams.toString()}`, { method: 'POST' });
        updateCompletionStatus(true);
        showToast('Topic marked complete!');
      } catch (err2) {
        console.error('Mark complete error:', err2);
      }

      if (Array.isArray(perQuestionResult)) showMCQReview(perQuestionResult);

      const retestBtn = document.getElementById('mcq-retest');
      if (retestBtn) retestBtn.style.display = 'inline-block';
    }
  } catch (err) {
    console.error('Submit error:', err);
    showToast('Failed to submit quiz');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Quiz';
    }
  }
}

function retakeMCQQuiz() {
  mcqAnswers = {};
  mcqCurrentIndex = 0;
  mcqCompleted = false;

  const resultEl = document.getElementById('mcq-result');
  const reviewEl = document.getElementById('mcq-review');
  if (resultEl) resultEl.textContent = '';
  if (reviewEl) reviewEl.innerHTML = '';

  const submitBtn = document.getElementById('mcq-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submit Quiz';
  }

  const retestBtn = document.getElementById('mcq-retest');
  if (retestBtn) retestBtn.style.display = 'none';

  renderCurrentMCQ();
}

/* ================== UI HELPERS ================== */
function showMCQReview(perQuestionResult) {
  const reviewEl = document.getElementById('mcq-review');
  if (!reviewEl) return;

  const html = perQuestionResult.map((row, idx) => {
    const status = row.isCorrect ? '✅ Correct' : '❌ Wrong';
    return `
      <div style="padding:1rem;margin:1rem 0;border-left:4px solid ${row.isCorrect ? 'var(--pista-green)' : '#ef4444'};background:var(--card-bg);border-radius:8px;">
        <div style="font-weight:600;margin-bottom:0.5rem;">
          ${idx + 1}. ${row.questionText}
        </div>
        <div style="margin-bottom:0.3rem;">
          <strong>Your answer:</strong> ${row.studentOption || '-'} - ${row.studentText || 'Not answered'}
        </div>
        <div style="margin-bottom:0.3rem;">
          <strong>Correct answer:</strong> ${row.correctOption} - ${row.correctText}
        </div>
        <div style="font-weight:500;">${status}</div>
      </div>
    `;
  }).join('');

  reviewEl.innerHTML = html;
}

function updateNavigationButtons(canGoNext = true) {
  const prevBtn = document.getElementById('video-prev') || document.getElementById('prev-topic');
  const nextBtn = document.getElementById('video-next') || document.getElementById('next-topic');
  
  if (prevBtn) prevBtn.disabled = currentTopicIndex <= 1;
  if (nextBtn) nextBtn.disabled = !canGoNext || currentTopicIndex >= totalTopics;
}

function updateTopicNumbers() {
  document.getElementById('current-topic-num').textContent = currentTopicIndex;
  document.getElementById('total-topics-num').textContent = totalTopics;
}

function updateNextTopicLockInList(canGoNext) {
  const items = document.querySelectorAll('#sidebar-topic-list .topic-item');
  if (items[currentTopicIndex]) {
    const nextItem = items[currentTopicIndex];
    if (canGoNext) {
      nextItem.classList.remove('locked-topic');
      nextItem.querySelector('.topic-lock')?.remove();
    } else {
      nextItem.classList.add('locked-topic');
    }
  }
}

function updateCompletionStatus(isCompleted) {
  const btn = document.getElementById('mark-complete');
  if (btn) {
    btn.disabled = true;
    btn.textContent = isCompleted ? '✅ Completed' : 'Complete quiz first';
  }
}

/* ================== UTILITY FUNCTIONS ================== */
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast show';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

function showLoading(el, msg) {
  if (el) {
    el.textContent = msg;
    el.classList.add('loading');
  }
}

function showError(msg) {
  const titleEl = document.getElementById('topic-title');
  if (titleEl) {
    titleEl.textContent = msg;
    titleEl.style.color = '#ef4444';
  }
}
