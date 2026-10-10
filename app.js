// =====================================================================
// 오늘의 할 일 - app.js
//
// 큰 흐름은 하나다.
//   1. 사용자가 무언가를 한다 (추가, 체크, 삭제 ...)
//   2. 데이터(todos 배열)를 바꾼다
//   3. saveTodos()로 저장한다
//   4. render()로 화면을 데이터에 맞게 다시 그린다
//
// 화면을 직접 고치지 않고 항상 "데이터를 바꾸고 → 다시 그린다"는 순서를
// 지키면, 화면과 데이터가 서로 달라지는 일이 생기지 않는다.
// =====================================================================

// ===== 1. 기본 설정 =====

// localStorage에 저장할 때 쓰는 이름(키)
const STORAGE_KEY = "todos"; // 할 일 목록
const FILTER_KEY = "filter"; // 선택한 필터 탭
const THEME_KEY = "theme"; // 선택한 테마 ("light" / "dark")
const SORT_KEY = "sort"; // 선택한 정렬 방식

// 카테고리 값("work")을 화면에 보여 줄 글자("업무")로 바꾸는 표
const CATEGORY_LABELS = {
  work: "업무",
  personal: "개인",
  study: "공부",
};

// 카테고리 값만 모은 배열: ["work", "personal", "study"]
const CATEGORIES = Object.keys(CATEGORY_LABELS);

// 필터 값을 화면에 보여 줄 글자로 바꾸는 표 (스크린 리더 안내에 쓴다)
const FILTER_LABELS = Object.assign({ all: "전체" }, CATEGORY_LABELS);

// Alt와 함께 누르는 숫자 키가 어느 필터인지 알려 주는 표
const FILTER_SHORTCUTS = {
  Digit1: "all",
  Digit2: "work",
  Digit3: "personal",
  Digit4: "study",
};

// 정렬 방식마다 "두 할 일 중 무엇이 앞인가"를 정하는 함수.
// 음수를 돌려주면 a가 앞, 양수를 돌려주면 b가 앞이다.
// "manual"(직접 정렬)은 todos 배열에 들어 있는 순서를 그대로 쓰므로 여기에 없다.
const SORTERS = {
  // 완료 상태순: 미완료가 위, 완료가 아래. 같은 상태끼리는 먼저 만든 것이 위.
  status: function (a, b) {
    if (a.done !== b.done) {
      return a.done ? 1 : -1;
    }
    return a.createdAt - b.createdAt;
  },
  // 생성일순: 먼저 만든 것이 위.
  created: function (a, b) {
    return a.createdAt - b.createdAt;
  },
  // 카테고리순: 업무 → 개인 → 공부. 같은 카테고리끼리는 먼저 만든 것이 위.
  category: function (a, b) {
    const diff = CATEGORIES.indexOf(a.category) - CATEGORIES.indexOf(b.category);
    return diff !== 0 ? diff : a.createdAt - b.createdAt;
  },
};

// 오늘의 격언으로 보여 줄 속담들
const QUOTES = [
  "천 리 길도 한 걸음부터",
  "시작이 반이다",
  "티끌 모아 태산",
  "고생 끝에 낙이 온다",
  "뜻이 있는 곳에 길이 있다",
  "오늘 할 일을 내일로 미루지 말라",
  "구슬이 서 말이라도 꿰어야 보배",
  "낙숫물이 댓돌을 뚫는다",
  "급할수록 돌아가라",
  "공든 탑이 무너지랴",
];

// 자동 카테고리 분류에 쓰는 키워드 표.
// 할 일 내용에 이 낱말이 들어 있으면 그 카테고리일 가능성이 높다고 본다.
// 낱말을 더하거나 빼고 싶으면 이 표만 고치면 된다. (영어는 소문자로 적는다)
// "책"처럼 한 글자짜리는 "산책", "책상" 같은 엉뚱한 낱말에도 걸리므로 넣지 않는다.
const CATEGORY_KEYWORDS = {
  work: [
    "회의", "미팅", "보고", "업무", "회사", "출근", "퇴근", "야근", "출장", "메일",
    "결재", "기획", "발표", "프로젝트", "고객", "거래처", "계약", "견적", "마감", "면접",
    "팀장", "부장", "대리", "사무실", "회식", "인수인계", "주간", "월간", "실적", "자료 정리",
    "meeting", "email", "report",
  ],
  personal: [
    "장보기", "마트", "운동", "헬스", "산책", "병원", "약국", "청소", "빨래", "설거지",
    "요리", "약속", "가족", "친구", "생일", "여행", "영화", "은행", "미용실", "택배",
    "분리수거", "세탁", "집안일", "데이트", "부모님", "저녁", "점심", "예약", "쇼핑", "반려",
  ],
  study: [
    "공부", "강의", "수업", "시험", "과제", "숙제", "복습", "예습", "독서", "책 읽",
    "영어", "수학", "코딩", "인강", "자격증", "토익", "단어", "암기", "학습", "논문",
    "혼공", "스터디", "필기", "문제집", "기출", "학원", "튜토리얼", "교재", "퀴즈", "study",
  ],
};

const MAX_TEXT_LENGTH = 100; // 할 일 한 개의 최대 글자 수
const MAX_IMPORT_BYTES = 5 * 1024 * 1024; // 가져올 수 있는 파일의 최대 크기 (5MB)
const SAVE_DELAY_MS = 300; // 마지막 변경 뒤 이만큼 기다렸다가 저장한다
const SEARCH_DELAY_MS = 200; // 마지막 글자를 친 뒤 이만큼 기다렸다가 검색한다
const TOAST_MS = 7000; // 알림(토스트)이 떠 있는 시간
// 사라지는(페이드 아웃) 애니메이션 시간. style.css의 fade-out 시간과 같아야 한다.
const FADE_OUT_MS = 200;

// ===== 2. 앱의 상태 =====

// 할 일 전체를 담는 배열. 한 개의 모양: { id, text, category, done, createdAt }
// "직접 정렬"일 때는 이 배열에 들어 있는 순서가 곧 화면 순서다.
let todos = [];

// 지금 선택된 필터 탭: "all" / "work" / "personal" / "study"
let currentFilter = "all";

// 지금 테마: "light" / "dark"
let currentTheme = "light";

// 지금 정렬 방식: "status" / "created" / "category" / "manual"
let sortMode = "status";

// 검색창에 적힌 검색어 (소문자로 바꾼 것). 비어 있으면 검색하지 않는다.
let searchQuery = "";

// 지금 수정 중인 할 일의 id. 수정 중인 것이 없으면 null
let editingId = null;

// 다음에 화면을 그릴 때 애니메이션을 보여 줄 항목. 모양: { id, className }
// 한 번 쓰고 나면 다시 null로 돌려놓는다.
let pendingAnimation = null;

// "되돌리기"를 눌렀을 때 실행할 함수. 되돌릴 것이 없으면 null
let undoAction = null;

// 알림(토스트)의 버튼을 눌렀을 때 실행할 함수와, 알림을 닫는 타이머
let toastHandler = null;
let toastTimer = null;

// 끌어서 옮기는 중인 항목의 정보. 끌고 있지 않으면 null
let dragState = null;

// 사용자가 카테고리 선택 상자를 직접 바꿨는지. true면 자동 분류가 그 선택을 덮어쓰지 않는다.
// 할 일을 추가하거나 입력창을 비우면 다시 false로 돌아간다.
let categoryPickedManually = false;

// 이미 만들어 둔 목록 요소를 보관하는 곳. 모양: id → { signature, element }
// 내용이 바뀌지 않은 항목은 새로 만들지 않고 여기서 꺼내 다시 쓴다.
const itemCache = new Map();

// ===== 3. 화면 요소 찾아 두기 =====

const storageWarning = document.getElementById("storage-warning");
const remainingCount = document.getElementById("remaining-count");
const themeToggle = document.getElementById("theme-toggle");
const quote = document.getElementById("quote");
const cheerMessage = document.getElementById("cheer-message");
const todoInput = document.getElementById("todo-input");
const categorySelect = document.getElementById("category-select");
const addButton = document.getElementById("add-button");
const autoCategoryHint = document.getElementById("auto-category-hint");
const filterTabs = document.getElementById("filter-tabs");
const searchInput = document.getElementById("search-input");
const sortSelect = document.getElementById("sort-select");
const todoList = document.getElementById("todo-list");
const todayCount = document.getElementById("today-count");
const exportButton = document.getElementById("export-button");
const importButton = document.getElementById("import-button");
const importFile = document.getElementById("import-file");
const clearDoneButton = document.getElementById("clear-done-button");
const toast = document.getElementById("toast");
const toastMessage = document.getElementById("toast-message");
const toastAction = document.getElementById("toast-action");
const liveRegion = document.getElementById("live-region");

// ===== 4. 작은 도구 함수 =====

// 디바운스: 짧은 시간에 여러 번 불려도, 마지막으로 불린 뒤 delay만큼
// 조용해졌을 때 한 번만 fn을 실행하는 함수를 만들어 준다.
// 예) 검색창에 "회의"를 치면 글자마다 검색하지 않고, 다 친 뒤에 한 번만 검색한다.
function debounce(fn, delay) {
  let timer = null;

  function debounced() {
    clearTimeout(timer);
    timer = setTimeout(function () {
      timer = null;
      fn();
    }, delay);
  }

  // 기다리는 중인 실행이 있으면 지금 바로 실행한다. (페이지를 닫기 직전에 쓴다)
  debounced.flush = function () {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
      fn();
    }
  };

  return debounced;
}

// 스크린 리더에게 한 줄을 읽어 달라고 부탁한다. 화면에는 보이지 않는다.
function announce(message) {
  // 같은 문장을 연달아 넣으면 읽어 주지 않으므로, 한 번 비웠다가 다시 넣는다.
  liveRegion.textContent = "";
  setTimeout(function () {
    liveRegion.textContent = message;
  }, 50);
}

// 화면 아래에 알림을 잠깐 띄운다.
// actionLabel과 onAction을 주면 알림 안에 버튼이 생긴다. (예: "되돌리기")
function showToast(message, actionLabel, onAction) {
  clearTimeout(toastTimer);
  // 새 알림이 뜨면 이전 알림의 "되돌리기"는 더 쓸 수 없다.
  undoAction = null;

  toastMessage.textContent = message;
  toastHandler = onAction || null;
  toastAction.textContent = actionLabel || "";
  toastAction.hidden = !onAction;
  toast.hidden = false;

  toastTimer = setTimeout(hideToast, TOAST_MS);
}

// 알림을 닫는다. 알림이 사라지면 "되돌리기"도 함께 사라진다.
function hideToast() {
  clearTimeout(toastTimer);
  toast.hidden = true;
  toastHandler = null;
  undoAction = null;
}

// 아직 쓰이지 않은 id를 만든다. 기본은 지금 시각(Date.now())을 글자로 바꾼 것이다.
// 같은 순간에 두 개가 만들어져 겹치면 1씩 올려 겹치지 않는 값을 찾는다.
function createId() {
  let candidate = Date.now();
  while (findTodo(String(candidate))) {
    candidate += 1;
  }
  return String(candidate);
}

// id가 같은 할 일을 찾아 돌려준다. 없으면 undefined
function findTodo(id) {
  return todos.find(function (todo) {
    return todo.id === id;
  });
}

// 같은 내용의 할 일이 이미 있는지 알려 준다. (대소문자와 앞뒤 공백은 무시)
// exceptId를 주면 그 할 일은 빼고 찾는다. (수정할 때 자기 자신과 비교하지 않기 위해)
function hasDuplicate(text, exceptId) {
  const target = text.trim().toLowerCase();
  return todos.some(function (todo) {
    return todo.id !== exceptId && todo.text.toLowerCase() === target;
  });
}

// ===== 5. 저장하고 불러오기 =====

// localStorage에서 글자 하나를 꺼내 온다. 없거나 읽을 수 없으면 null을 돌려준다.
// (브라우저 설정에 따라 localStorage를 건드리기만 해도 오류가 날 수 있다)
function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error("저장된 값을 읽지 못했습니다: " + key, error);
    return null;
  }
}

// localStorage에 글자 하나를 저장한다.
// 실패해도(저장 공간이 꽉 찬 경우 등) 앱은 계속 쓸 수 있게 화면 위쪽에 안내만 띄운다.
function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error("값을 저장하지 못했습니다: " + key, error);
    storageWarning.hidden = false;
  }
}

// 밖에서 들어온 값 하나(raw)를 믿을 수 있는 할 일로 다듬는다.
// 저장된 값이나 가져온 파일은 모양이 틀렸을 수 있으므로 꼭 이 함수를 거친다.
// 쓸 수 없는 값이면 null을 돌려준다. usedIds는 이미 쓰인 id를 모아 둔 Set이다.
function normalizeTodo(raw, usedIds) {
  if (raw === null || typeof raw !== "object" || typeof raw.text !== "string") {
    return null;
  }

  // 내용: 앞뒤 공백을 빼고 최대 길이까지만 쓴다. 비어 있으면 버린다.
  const text = raw.text.trim().slice(0, MAX_TEXT_LENGTH);
  if (text === "") {
    return null;
  }

  // 만든 시각: 숫자가 아니면 지금 시각으로 한다.
  const createdAt = Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now();

  // id: 글자가 아니거나 비어 있으면 만든 시각으로 대신한다.
  let baseId = String(createdAt);
  if (typeof raw.id === "string" && raw.id !== "") {
    baseId = raw.id;
  } else if (Number.isFinite(raw.id)) {
    baseId = String(raw.id);
  }
  // 같은 id가 이미 있으면 뒤에 번호를 붙여 겹치지 않게 한다.
  let id = baseId;
  let suffix = 1;
  while (usedIds.has(id)) {
    id = baseId + "-" + suffix;
    suffix += 1;
  }
  usedIds.add(id);

  return {
    id: id,
    text: text,
    // 모르는 카테고리는 "개인"으로 한다.
    category: CATEGORIES.includes(raw.category) ? raw.category : "personal",
    done: raw.done === true,
    createdAt: createdAt,
  };
}

// 값 여러 개를 한꺼번에 다듬는다. 돌려주는 값: { todos, skipped }
// skipped는 쓸 수 없어서 버린 개수다.
function normalizeTodoList(list) {
  const usedIds = new Set();
  const result = [];

  list.forEach(function (raw) {
    const todo = normalizeTodo(raw, usedIds);
    if (todo !== null) {
      result.push(todo);
    }
  });

  return { todos: result, skipped: list.length - result.length };
}

// 저장된 할 일 목록을 꺼내 온다.
// 저장된 것이 없거나 읽을 수 없으면 빈 배열을 돌려준다.
function loadTodos() {
  const saved = readStorage(STORAGE_KEY);
  if (saved === null) {
    return [];
  }

  try {
    // 저장할 때 글자로 바꿔 두었으므로 다시 배열로 되돌린다.
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) {
      console.error("저장된 할 일이 목록 형태가 아니어서 빈 목록으로 시작합니다.");
      return [];
    }

    const result = normalizeTodoList(parsed);
    if (result.skipped > 0) {
      console.error("모양이 잘못된 할 일 " + result.skipped + "개를 건너뛰었습니다.");
    }
    return result.todos;
  } catch (error) {
    console.error("저장된 할 일을 읽지 못해 빈 목록으로 시작합니다.", error);
    return [];
  }
}

// 지금의 할 일 목록을 곧바로 저장한다.
function writeTodosNow() {
  // localStorage에는 글자만 넣을 수 있어서 배열을 JSON 글자로 바꾼다.
  writeStorage(STORAGE_KEY, JSON.stringify(todos));
}

// 저장을 디바운스한 것. 체크를 빠르게 여러 번 해도 저장은 한 번만 일어난다.
const scheduleSave = debounce(writeTodosNow, SAVE_DELAY_MS);

// 지금의 할 일 목록을 저장한다. (실제 저장은 아주 잠깐 뒤에 한 번에 일어난다)
function saveTodos() {
  scheduleSave();
}

// 저장해 둔 필터 탭을 꺼내 온다. 없거나 이상한 값이면 "all"을 돌려준다.
function loadFilter() {
  const saved = readStorage(FILTER_KEY);
  return saved === "all" || CATEGORIES.includes(saved) ? saved : "all";
}

// 저장해 둔 테마를 꺼내 온다. 저장된 것이 없으면 라이트 모드로 시작한다.
function loadTheme() {
  return readStorage(THEME_KEY) === "dark" ? "dark" : "light";
}

// 저장해 둔 정렬 방식을 꺼내 온다. 없거나 이상한 값이면 "완료 상태순"으로 한다.
function loadSort() {
  const saved = readStorage(SORT_KEY);
  return saved === "manual" || Object.keys(SORTERS).includes(saved) ? saved : "status";
}

// ===== 6. 데이터 바꾸기 =====
// 원칙: 데이터를 바꾸고 → saveTodos() → render() 순서로 처리한다.

// 할 일을 새로 추가한다. 추가한 할 일을 돌려주고, 추가하지 않았으면 null을 돌려준다.
function addTodo(text, category) {
  // 앞뒤 공백을 빼고, 남은 내용이 없으면 추가하지 않는다.
  const trimmed = text.trim().slice(0, MAX_TEXT_LENGTH);
  if (trimmed === "") {
    return null;
  }

  const todo = {
    id: createId(), // 항목을 구분하는 고유 번호
    text: trimmed,
    category: CATEGORIES.includes(category) ? category : "personal",
    done: false,
    createdAt: Date.now(), // 지금 시각(숫자)
  };
  todos.push(todo);

  // 새로 추가한 항목은 서서히 나타나게 한다.
  pendingAnimation = { id: todo.id, className: "fade-in" };

  saveTodos();
  render();
  return todo;
}

// id가 같은 할 일을 삭제한다. 삭제한 뒤 잠깐 동안 되돌릴 수 있다.
function deleteTodo(id) {
  const index = todos.findIndex(function (todo) {
    return todo.id === id;
  });
  if (index === -1) {
    return;
  }

  // 배열에서 빼내면서, 되돌릴 때 쓰려고 원래 자리(index)와 함께 기억해 둔다.
  const removed = [{ todo: todos.splice(index, 1)[0], index: index }];
  if (editingId === id) {
    editingId = null;
  }

  saveTodos();
  render();
  offerUndo("할 일을 삭제했습니다.", function () {
    restoreTodos(removed);
  });
}

// id가 같은 할 일의 내용을 바꾼다.
// changes에는 바꿀 값만 넣는다. 예: { done: true }
function updateTodo(id, changes) {
  const todo = findTodo(id);
  if (!todo) {
    return;
  }

  // changes에 들어 있는 값들을 todo에 덮어쓴다.
  Object.assign(todo, changes);

  saveTodos();
  render();
}

// 완료한 할 일을 한 번에 모두 삭제한다. 삭제한 뒤 잠깐 동안 되돌릴 수 있다.
function clearDoneTodos() {
  // 되돌릴 때 쓰려고 완료 항목과 원래 자리를 기억해 둔다.
  const removed = [];
  todos.forEach(function (todo, index) {
    if (todo.done) {
      removed.push({ todo: todo, index: index });
    }
  });
  if (removed.length === 0) {
    return;
  }

  // 완료하지 않은 항목만 남긴다.
  todos = todos.filter(function (todo) {
    return !todo.done;
  });
  // 수정 중이던 항목이 지워졌으면 수정 모드를 끝낸다.
  if (editingId !== null && !findTodo(editingId)) {
    editingId = null;
  }

  saveTodos();
  render();
  offerUndo("완료한 할 일 " + removed.length + "개를 삭제했습니다.", function () {
    restoreTodos(removed);
  });
}

// 지웠던 할 일들을 원래 자리에 다시 넣는다. (되돌리기에서 쓴다)
// removed의 모양: [{ todo, index }, ...] - index가 작은 것부터 들어 있어야 한다.
function restoreTodos(removed) {
  removed.forEach(function (entry) {
    // 그 사이 목록이 짧아졌을 수 있으므로 맨 끝을 넘지 않게 한다.
    const index = Math.min(entry.index, todos.length);
    todos.splice(index, 0, entry.todo);
  });
}

// ===== 7. 되돌리기 (Undo) =====

// "되돌리기" 버튼이 달린 알림을 띄운다. action은 되돌릴 때 실행할 함수다.
function offerUndo(message, action) {
  showToast(message, "되돌리기", runUndo);
  undoAction = action; // showToast가 비워 버리므로 그 뒤에 넣는다.
}

// 마지막으로 한 삭제(또는 가져오기)를 되돌린다.
function runUndo() {
  if (undoAction === null) {
    return;
  }

  const action = undoAction;
  action();

  saveTodos();
  render();
  showToast("되돌렸습니다.");
}

// ===== 8. 필터, 테마, 정렬 바꾸기 =====

// 필터 탭을 바꾸고, 선택을 저장해 둔다.
function setFilter(filter) {
  currentFilter = filter;
  writeStorage(FILTER_KEY, currentFilter);
  render();
  announce(FILTER_LABELS[filter] + " 필터, " + getVisibleTodos().length + "개");
}

// 지금 테마를 화면에 입힌다. 색은 style.css가 data-theme 값을 보고 바꾼다.
function applyTheme() {
  document.documentElement.dataset.theme = currentTheme;
  themeToggle.setAttribute("aria-checked", String(currentTheme === "dark"));
}

// 라이트 모드와 다크 모드를 서로 바꾸고, 선택을 저장해 둔다.
function toggleTheme() {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  writeStorage(THEME_KEY, currentTheme);
  applyTheme();
}

// 정렬 방식을 바꾸고, 선택을 저장해 둔다.
function setSortMode(mode) {
  sortMode = mode;
  writeStorage(SORT_KEY, sortMode);
  render();
}

// ===== 9. 직접 정렬 (순서 옮기기) =====

// 화면에 보이는 할 일들의 새 순서(orderedIds)를 todos 배열에 반영한다.
//
// 필터나 검색 때문에 일부만 보이는 중일 수 있다. 그래서 배열 전체를 갈아 끼우지 않고,
// "지금 보이는 항목들이 차지하고 있던 칸"에만 새 순서대로 다시 채워 넣는다.
// 보이지 않는 항목은 제자리에 그대로 남는다.
function applyManualOrder(orderedIds) {
  const visibleIds = new Set(orderedIds);
  let next = 0;

  todos = todos.map(function (todo) {
    if (!visibleIds.has(todo.id)) {
      return todo; // 보이지 않는 항목은 그대로 둔다.
    }
    const replacement = findTodo(orderedIds[next]);
    next += 1;
    return replacement;
  });

  // 손으로 옮긴 순서가 보이려면 정렬 방식이 "직접 정렬"이어야 한다.
  if (sortMode !== "manual") {
    sortMode = "manual";
    writeStorage(SORT_KEY, sortMode);
    showToast("정렬 방식을 '직접 정렬'로 바꿨습니다.");
  }

  saveTodos();
  render();
}

// 할 일(id)을 다른 할 일(targetId)의 앞이나 뒤로 옮긴다. (끌어서 놓았을 때 쓴다)
function moveTodo(id, targetId, placeAfter) {
  const before = getVisibleTodos().map(function (todo) {
    return todo.id;
  });
  const from = before.indexOf(id);
  if (from === -1 || id === targetId) {
    return;
  }

  // 옮길 항목을 빼낸 다음, 목표 항목의 앞(또는 뒤)에 끼워 넣는다.
  const after = before.slice();
  after.splice(from, 1);
  const targetIndex = after.indexOf(targetId);
  if (targetIndex === -1) {
    return;
  }
  after.splice(placeAfter ? targetIndex + 1 : targetIndex, 0, id);

  // 제자리에 놓았으면 아무것도 바꾸지 않는다.
  if (after.join() === before.join()) {
    return;
  }

  applyManualOrder(after);
  announce(after.indexOf(id) + 1 + "번째로 옮겼습니다.");
}

// 할 일(id)을 한 칸 위(step = -1)나 한 칸 아래(step = 1)로 옮긴다. (화살표 키에서 쓴다)
function moveTodoByStep(id, step) {
  const ids = getVisibleTodos().map(function (todo) {
    return todo.id;
  });
  const from = ids.indexOf(id);
  const to = from + step;
  // 맨 위에서 더 위로, 맨 아래에서 더 아래로는 갈 수 없다.
  if (from === -1 || to < 0 || to >= ids.length) {
    return;
  }

  // 두 항목의 자리를 맞바꾼다.
  ids[from] = ids[to];
  ids[to] = id;

  applyManualOrder(ids);
  announce(to + 1 + "번째로 옮겼습니다.");
}

// ===== 10. 계산하기 =====

// 목록의 진행률을 계산한다. 돌려주는 값: { done, total, percent }
function calcProgress(list) {
  const total = list.length;
  const done = list.filter(function (todo) {
    return todo.done;
  }).length;
  // 할 일이 하나도 없으면 0으로 나눌 수 없으므로 0%로 한다.
  const percent = total === 0 ? 0 : Math.round((done / total) * 100);

  return { done: done, total: total, percent: percent };
}

// 목록에서 오늘 추가한 할 일이 몇 개인지 센다.
function countAddedToday(list) {
  // 오늘 0시 0분 0초의 시각을 구한다.
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  return list.filter(function (todo) {
    return todo.createdAt >= startOfToday.getTime();
  }).length;
}

// 할 일 내용을 보고 어울리는 카테고리를 짐작한다. (키워드 기반 자동 분류)
// 돌려주는 값: { category, keyword } - 걸린 키워드가 하나도 없으면 null
//
// 방법: 카테고리마다 내용에 들어 있는 키워드를 찾아 점수를 매긴다.
// 점수는 키워드의 글자 수다. 긴 키워드일수록 뜻이 분명하므로 더 믿는다.
// 예) "회의 자료 정리" → "회의"(2점) + "자료 정리"(5점) = 업무 7점
// 점수가 가장 높은 카테고리를 고르고, 동점이면 짐작하지 않는다(null).
function detectCategory(text) {
  const lowered = text.toLowerCase();
  let best = null; // 지금까지 점수가 가장 높은 카테고리
  let isTie = false; // 최고 점수가 둘 이상인지

  CATEGORIES.forEach(function (category) {
    let score = 0;
    let longestKeyword = "";

    CATEGORY_KEYWORDS[category].forEach(function (keyword) {
      if (lowered.includes(keyword)) {
        score += keyword.length;
        if (keyword.length > longestKeyword.length) {
          longestKeyword = keyword;
        }
      }
    });

    if (score === 0) {
      return; // 이 카테고리의 키워드는 하나도 없다.
    }
    if (best === null || score > best.score) {
      best = { category: category, keyword: longestKeyword, score: score };
      isTie = false;
    } else if (score === best.score) {
      isTie = true;
    }
  });

  if (best === null || isTie) {
    return null;
  }
  return { category: best.category, keyword: best.keyword };
}

// 진행률에 어울리는 응원 메시지를 골라 준다.
function getCheerMessage(progress) {
  if (progress.total === 0) {
    return "오늘 할 일을 하나 적어 볼까요?";
  }
  if (progress.done === progress.total) {
    return "모두 끝냈어요. 정말 수고했어요!";
  }
  if (progress.percent >= 50) {
    return "절반을 넘었어요. 조금만 더!";
  }
  if (progress.done > 0) {
    return "좋아요, 차근차근 해내고 있어요.";
  }
  return "시작이 반이에요. 하나만 먼저 끝내 볼까요?";
}

// 지금 필터와 검색어에 맞는 할 일만 골라, 정렬 방식대로 늘어놓아 돌려준다.
function getVisibleTodos() {
  const filtered = todos.filter(function (todo) {
    // 수정 중인 항목은 필터나 검색에 걸리지 않아도 계속 보여 준다.
    // (입력하던 내용이 갑자기 사라지지 않게 하기 위해)
    if (todo.id === editingId) {
      return true;
    }
    const matchesFilter = currentFilter === "all" || todo.category === currentFilter;
    // 대문자와 소문자를 구분하지 않고 찾는다.
    const matchesSearch = todo.text.toLowerCase().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  // "직접 정렬"은 배열에 들어 있는 순서 그대로 쓴다.
  if (sortMode === "manual") {
    return filtered;
  }
  // filter가 새 배열을 만들어 주었으므로 여기서 정렬해도 todos의 순서는 바뀌지 않는다.
  return filtered.sort(SORTERS[sortMode]);
}

// 만든 시각을 "2시간 전" 같은 글자로 바꾼다.
function formatRelativeTime(createdAt) {
  const minutes = Math.floor((Date.now() - createdAt) / 60000); // 1분 = 60000밀리초
  if (minutes < 1) {
    return "방금 전"; // 시계가 어긋나 미래 시각이 들어와도 여기에 걸린다.
  }
  if (minutes < 60) {
    return minutes + "분 전";
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours + "시간 전";
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return days + "일 전";
  }

  // 한 달이 넘으면 날짜로 보여 준다.
  return new Date(createdAt).toLocaleDateString("ko-KR");
}

// 날짜를 파일 이름에 쓸 "2025-01-31" 모양의 글자로 바꾼다.
function formatDateForFile(date) {
  // padStart(2, "0"): 한 자리 숫자 앞에 0을 붙여 두 자리로 만든다. 예: "3" → "03"
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return date.getFullYear() + "-" + month + "-" + day;
}

// ===== 11. 수정 모드 =====

// 목록에서 id가 같은 항목을 찾아, 그 안의 요소(selector)에 포커스를 둔다.
// 화면을 다시 그리면 포커스가 사라지므로, 키보드 사용자가 길을 잃지 않게 되돌려 놓는다.
function focusInItem(id, selector) {
  const cached = itemCache.get(id);
  if (!cached) {
    return false;
  }
  const target = cached.element.querySelector(selector);
  if (!target) {
    return false;
  }
  target.focus();
  return true;
}

// 할 일 한 개를 수정 모드로 바꾸고 입력창에 커서를 둔다.
function startEdit(id) {
  editingId = id;
  render();

  const cached = itemCache.get(id);
  if (cached) {
    const editInput = cached.element.querySelector(".edit-input");
    editInput.focus();
    editInput.select();
  }
}

// 수정을 그만두고 원래 내용으로 돌아간다.
function cancelEdit() {
  const id = editingId;
  editingId = null;
  render();
  focusInItem(id, '[data-action="edit"]');
}

// 수정한 내용을 저장한다. 내용이 비어 있으면 저장하지 않는다.
function saveEdit(id, text, category) {
  const trimmed = text.trim().slice(0, MAX_TEXT_LENGTH);
  if (trimmed === "") {
    return;
  }

  editingId = null;
  updateTodo(id, { text: trimmed, category: category });
}

// 수정 중인 항목의 입력창에 적힌 값을 읽어 저장을 시도한다.
function commitEdit(id) {
  const cached = itemCache.get(id);
  if (!cached) {
    return;
  }
  const input = cached.element.querySelector(".edit-input");
  const select = cached.element.querySelector(".edit-select");

  // 내용이 비어 있으면 입력창을 흔들어 알려 주고 수정 모드에 머문다.
  if (input.value.trim() === "") {
    shake(input);
    announce("내용이 비어 있어 저장하지 않았습니다.");
    return;
  }

  // 같은 내용의 다른 할 일이 있으면 정말 저장할지 물어본다.
  if (hasDuplicate(input.value, id) && !confirm("같은 내용의 할 일이 이미 있습니다. 그래도 저장할까요?")) {
    input.focus();
    return;
  }

  saveEdit(id, input.value, select.value);
  // 카테고리를 바꿔서 지금 필터에서 사라졌다면 입력창으로 포커스를 옮긴다.
  if (!focusInItem(id, '[data-action="edit"]')) {
    todoInput.focus();
  }
  announce("수정한 내용을 저장했습니다.");
}

// ===== 12. 화면 효과 =====

// 항목들을 서서히 사라지게 한 뒤, 애니메이션이 끝나면 afterFade 함수를 실행한다.
function fadeOutThen(items, afterFade) {
  items.forEach(function (item) {
    item.classList.add("fade-out");
  });
  setTimeout(afterFade, FADE_OUT_MS);
}

// 입력창을 좌우로 흔들어서 "내용이 비어 있다"고 알려 준다.
function shake(field) {
  field.classList.remove("shake");
  // 클래스를 뗐다가 바로 붙이면 애니메이션이 다시 시작되지 않는다.
  // 요소의 크기를 한 번 읽어서 브라우저가 변화를 알아차리게 한다.
  void field.offsetWidth;
  field.classList.add("shake");
  field.focus();
}

// ===== 13. 화면 그리기 =====

// 글자가 적힌 작은 버튼을 만든다.
// action은 "이 버튼이 무슨 일을 하는지"를 적어 두는 표시(data-action)다.
// 버튼마다 클릭 함수를 따로 달지 않고, 목록에서 한 번에 받아 이 표시를 보고 처리한다.
function createSmallButton(label, action, ariaLabel) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "btn btn-small";
  button.dataset.action = action;
  button.textContent = label;
  if (ariaLabel) {
    button.setAttribute("aria-label", ariaLabel);
  }
  return button;
}

// 카테고리(업무/개인/공부)를 고르는 선택 상자를 만든다. selected가 처음에 골라져 있다.
function createCategorySelect(selected, className, ariaLabel) {
  const select = document.createElement("select");
  select.className = className;
  select.setAttribute("aria-label", ariaLabel);
  CATEGORIES.forEach(function (category) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = CATEGORY_LABELS[category];
    select.append(option);
  });
  select.value = selected;
  return select;
}

// 할 일 한 개를 화면에 보여 줄 <li> 요소로 만든다.
function createTodoElement(todo, timeLabel) {
  const item = document.createElement("li");
  item.className = "todo-item";
  item.dataset.id = todo.id; // 어느 할 일인지 요소에 적어 둔다.
  if (todo.done) {
    item.classList.add("done"); // 완료 항목은 취소선 + 흐린 글씨 (style.css)
  }

  // 순서를 바꾸는 손잡이. 끌어서 옮기거나, 포커스를 두고 위아래 화살표 키로 옮긴다.
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "drag-handle";
  handle.textContent = "⠿";
  handle.title = "끌어서 순서 바꾸기 (키보드: 위아래 화살표)";
  handle.setAttribute("aria-label", todo.text + " 순서 바꾸기. 위아래 화살표 키로 옮깁니다.");

  // 완료 체크박스
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "todo-check";
  checkbox.checked = todo.done;
  checkbox.setAttribute("aria-label", todo.text + " 완료 표시");

  // 할 일 내용. 사용자가 입력한 글자는 반드시 textContent로 넣는다.
  // (innerHTML로 넣으면 글자 안의 <script> 같은 태그가 실행될 수 있다)
  const text = document.createElement("span");
  text.className = "todo-text";
  text.textContent = todo.text;
  text.title = "더블클릭하면 수정할 수 있습니다";

  // 생성 시간 (예: "2시간 전")
  const time = document.createElement("span");
  time.className = "todo-time";
  time.textContent = timeLabel;

  // 내용과 생성 시간을 위아래로 묶는다.
  const main = document.createElement("div");
  main.className = "todo-main";
  main.append(text, time);

  // 카테고리 버튼. 누르면 카테고리 목록이 펼쳐지고, 고르면 바로 바뀐다.
  // "badge-work" 같은 클래스로 색을 입힌다.
  const badge = createCategorySelect(
    todo.category,
    "todo-badge badge-" + todo.category,
    todo.text + " 카테고리 변경"
  );
  badge.title = "눌러서 카테고리 바꾸기";

  // 수정, 삭제 버튼을 한 묶음으로
  const actions = document.createElement("div");
  actions.className = "todo-actions";
  actions.append(
    createSmallButton("수정", "edit", todo.text + " 수정"),
    createSmallButton("삭제", "delete", todo.text + " 삭제")
  );

  item.append(handle, checkbox, main, badge, actions);
  return item;
}

// 수정 중인 할 일을 입력창 + 카테고리 선택이 있는 <li> 요소로 만든다.
function createEditElement(todo) {
  const item = document.createElement("li");
  item.className = "todo-item editing";
  item.dataset.id = todo.id;

  // 내용 입력창. 원래 내용을 미리 넣어 둔다.
  const input = document.createElement("input");
  input.type = "text";
  input.className = "field edit-input";
  input.maxLength = MAX_TEXT_LENGTH;
  input.value = todo.text;
  input.setAttribute("aria-label", "할 일 내용 수정. Enter로 저장, Esc로 취소");

  // 카테고리 선택. 원래 카테고리를 미리 골라 둔다.
  const select = createCategorySelect(todo.category, "field edit-select", "카테고리 수정");

  // 키보드가 없는 휴대폰에서도 쓸 수 있게 저장, 취소 버튼도 둔다.
  const actions = document.createElement("div");
  actions.className = "todo-actions";
  actions.append(createSmallButton("저장", "save"), createSmallButton("취소", "cancel"));

  item.append(input, select, actions);
  return item;
}

// 진행률 막대 하나와 그 옆 문구를 채운다.
function renderProgressBar(name, progress, text) {
  const fill = document.getElementById("progress-" + name + "-bar");
  fill.style.width = progress.percent + "%";
  // 스크린 리더가 읽을 수 있게 막대에도 숫자를 적어 둔다.
  fill.parentElement.setAttribute("aria-valuenow", String(progress.percent));
  document.getElementById("progress-" + name + "-text").textContent = text;
}

// 통계(진행률, 응원 메시지, 오늘 추가한 개수, 남은 개수)를 다시 그린다.
// 필터나 검색과 상관없이 항상 전체 데이터로 계산한다.
function renderProgress() {
  const total = calcProgress(todos);
  renderProgressBar(
    "total",
    total,
    total.done + "/" + total.total + " 완료 (" + total.percent + "%)"
  );
  cheerMessage.textContent = getCheerMessage(total);

  CATEGORIES.forEach(function (category) {
    const progress = calcProgress(
      todos.filter(function (todo) {
        return todo.category === category;
      })
    );
    // 예: "3/11 (27%)"
    renderProgressBar(
      category,
      progress,
      progress.done + "/" + progress.total + " (" + progress.percent + "%)"
    );
    // 검색창 아래에 보여 주는 카테고리별 할 일 개수
    document.getElementById("count-" + category).textContent = progress.total + "개";
  });

  todayCount.textContent = "오늘 추가한 할 일 " + countAddedToday(todos) + "개";
  remainingCount.textContent = total.total - total.done + "개 남음";
}

// 필터 탭과 정렬 선택 상자를 지금 상태에 맞춘다.
function renderControls() {
  filterTabs.querySelectorAll(".tab").forEach(function (tab) {
    const isActive = tab.dataset.filter === currentFilter;
    tab.classList.toggle("active", isActive);
    tab.setAttribute("aria-pressed", String(isActive));
  });

  sortSelect.value = sortMode;
}

// 할 일 목록을 다시 그린다.
//
// 목록을 통째로 지우고 새로 만들면 항목이 많을 때 느려진다. 그래서
//   - 내용이 그대로인 항목은 예전에 만든 요소를 다시 쓰고 (itemCache)
//   - 내용이 바뀐 항목만 새로 만들고
//   - 자리가 달라진 요소만 옮긴다.
function renderList() {
  const visibleTodos = getVisibleTodos();

  // 보여 줄 할 일이 없으면 안내 문구만 보여 준다.
  if (visibleTodos.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-message";
    empty.textContent =
      searchQuery === "" ? "할 일이 없습니다. 추가해보세요!" : "검색 결과가 없습니다.";
    itemCache.clear();
    todoList.replaceChildren(empty);
    return;
  }

  const visibleIds = new Set();

  // 1) 보여 줄 할 일마다 요소를 준비한다. (다시 쓰거나, 새로 만들거나)
  const elements = visibleTodos.map(function (todo) {
    visibleIds.add(todo.id);

    const isEditing = todo.id === editingId;
    const timeLabel = formatRelativeTime(todo.createdAt);
    // signature: 이 항목이 화면에 어떻게 보이는지를 한 줄로 요약한 것.
    // 예전 것과 같으면 화면도 같으므로 요소를 새로 만들 필요가 없다.
    // 수정 중인 항목은 "edit"로 고정해서, 입력하던 내용이 다시 그려지며 지워지지 않게 한다.
    const signature = isEditing
      ? "edit"
      : [todo.text, todo.category, todo.done, timeLabel].join("\n");

    let cached = itemCache.get(todo.id);
    if (!cached || cached.signature !== signature) {
      cached = {
        signature: signature,
        element: isEditing ? createEditElement(todo) : createTodoElement(todo, timeLabel),
      };
      itemCache.set(todo.id, cached);
    }

    // 방금 추가했거나 체크한 항목이면 애니메이션 클래스를 붙인다.
    if (pendingAnimation !== null && pendingAnimation.id === todo.id) {
      cached.element.classList.add(pendingAnimation.className);
    }

    return cached.element;
  });

  // 2) 더는 보이지 않는 항목의 요소는 보관함에서 치운다.
  itemCache.forEach(function (cached, id) {
    if (!visibleIds.has(id)) {
      itemCache.delete(id);
    }
  });

  // 3) 실제 목록(<ul>)을 준비한 순서와 같게 맞춘다. 이미 제자리에 있는 요소는 건드리지 않는다.
  elements.forEach(function (element, index) {
    if (todoList.children[index] !== element) {
      todoList.insertBefore(element, todoList.children[index] || null);
    }
  });
  // 4) 뒤에 남은 요소(지워진 항목, 안내 문구)를 없앤다.
  while (todoList.children.length > elements.length) {
    todoList.lastElementChild.remove();
  }
}

// 지금의 데이터대로 화면 전체(통계, 필터 탭, 정렬, 목록)를 다시 그린다.
function render() {
  renderProgress();
  renderControls();
  renderList();

  // 애니메이션은 한 번만 보여 주면 되므로 비워 둔다.
  pendingAnimation = null;
}

// ===== 14. 내보내기와 가져오기 =====

// 할 일 목록을 JSON 파일로 내려받게 한다. 성공하면 true를 돌려준다.
function exportTodos() {
  if (todos.length === 0) {
    showToast("내보낼 할 일이 없습니다.");
    return false;
  }

  try {
    const data = {
      app: "오늘의 할 일",
      version: 1,
      exportedAt: new Date().toISOString(),
      todos: todos,
    };
    // Blob: 브라우저 안에서 만든 "파일 내용". 여기에 임시 주소(URL)를 붙여 내려받게 한다.
    // JSON.stringify의 세 번째 값 2는 사람이 읽기 좋게 들여쓰기를 하라는 뜻이다.
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // 눈에 보이지 않는 링크를 만들어 대신 눌러 주면 내려받기가 시작된다.
    const link = document.createElement("a");
    link.href = url;
    link.download = "todos-" + formatDateForFile(new Date()) + ".json";
    document.body.append(link);
    link.click();
    link.remove();

    // 임시 주소는 다 쓴 뒤에 치워 준다.
    setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 1000);
    return true;
  } catch (error) {
    console.error("내보내기에 실패했습니다.", error);
    showToast("내보내기에 실패했습니다.");
    return false;
  }
}

// 사용자가 고른 파일을 읽어서 가져오기를 시작한다.
function handleImportFile(file) {
  if (!file) {
    return; // 파일 선택 창에서 취소를 누른 경우
  }
  if (file.size > MAX_IMPORT_BYTES) {
    showToast("파일이 너무 큽니다. 5MB 이하의 파일만 가져올 수 있습니다.");
    return;
  }

  // FileReader: 사용자가 고른 파일의 내용을 읽어 주는 도구. 읽기가 끝나면 onload가 불린다.
  const reader = new FileReader();
  reader.onload = function () {
    importFromText(String(reader.result));
  };
  reader.onerror = function () {
    console.error("파일을 읽지 못했습니다.", reader.error);
    showToast("파일을 읽지 못했습니다.");
  };
  reader.readAsText(file);
}

// 파일에서 읽은 글자(text)를 할 일 목록으로 바꿔 지금 목록과 바꿔 끼운다.
function importFromText(text) {
  // 1) JSON으로 읽는다.
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    console.error("가져온 파일이 JSON 형식이 아닙니다.", error);
    showToast("JSON 형식이 아니어서 가져올 수 없습니다.");
    return;
  }

  // 2) 할 일 배열을 찾는다. 이 앱이 내보낸 파일({ todos: [...] })과 배열만 든 파일([...])을 모두 받는다.
  let list = null;
  if (Array.isArray(parsed)) {
    list = parsed;
  } else if (parsed !== null && typeof parsed === "object" && Array.isArray(parsed.todos)) {
    list = parsed.todos;
  }
  if (list === null) {
    showToast("할 일 목록이 들어 있지 않은 파일입니다.");
    return;
  }

  // 3) 항목을 하나씩 다듬고, 쓸 수 없는 것은 버린다.
  const result = normalizeTodoList(list);
  if (result.todos.length === 0) {
    showToast("가져올 수 있는 할 일이 없습니다.");
    return;
  }

  // 4) 지금 데이터가 있으면, 바꿔도 되는지와 백업할지를 물어본다.
  if (todos.length > 0) {
    const replaceMessage =
      "가져오면 지금 있는 할 일 " + todos.length + "개가 지워지고, 파일의 할 일 " +
      result.todos.length + "개로 바뀝니다. 계속할까요?";
    if (!confirm(replaceMessage)) {
      return;
    }

    const backupMessage =
      "바꾸기 전에 지금 데이터를 백업 파일로 내려받을까요?\n\n" +
      "확인: 백업한 뒤 가져오기\n취소: 백업 없이 가져오기";
    if (confirm(backupMessage) && !exportTodos()) {
      if (!confirm("백업 파일을 만들지 못했습니다. 그래도 가져올까요?")) {
        return;
      }
    }
  }

  // 5) 목록을 바꿔 끼운다. 예전 목록은 되돌리기를 위해 기억해 둔다.
  const previousTodos = todos;
  todos = result.todos;
  editingId = null;

  saveTodos();
  render();

  let message = "할 일 " + result.todos.length + "개를 가져왔습니다.";
  if (result.skipped > 0) {
    message += " (잘못된 항목 " + result.skipped + "개는 건너뜀)";
  }
  offerUndo(message, function () {
    todos = previousTodos;
  });
}

// ===== 15. 사용자 동작 연결 =====

// --- 추가 ---

// 입력창에 적힌 내용으로 할 일을 추가하고 입력창을 비운다.
function handleAdd() {
  const text = todoInput.value.trim();

  // 내용이 비어 있으면 입력창을 흔들어 알려 준다.
  if (text === "") {
    todoInput.value = "";
    resetAutoCategory();
    shake(todoInput);
    announce("할 일 내용을 입력해 주세요.");
    return;
  }

  // 같은 내용의 할 일이 이미 있으면 정말 추가할지 물어본다.
  if (hasDuplicate(text, null) && !confirm("같은 내용의 할 일이 이미 있습니다. 그래도 추가할까요?")) {
    todoInput.focus();
    todoInput.select();
    return;
  }

  const todo = addTodo(text, categorySelect.value);
  todoInput.value = "";
  todoInput.focus();
  resetAutoCategory();

  // 지금 필터나 검색 때문에 방금 추가한 항목이 보이지 않으면 알려 준다.
  if (itemCache.has(todo.id)) {
    announce(todo.text + " 추가했습니다.");
  } else {
    showToast("추가했습니다. 지금 필터나 검색어 때문에 목록에는 보이지 않습니다.");
  }
}

addButton.addEventListener("click", handleAdd);

// 자동 분류 안내를 숨기고, 다음 할 일은 다시 자동으로 분류하게 한다.
function resetAutoCategory() {
  categoryPickedManually = false;
  autoCategoryHint.hidden = true;
  autoCategoryHint.textContent = "";
}

// 입력창의 내용으로 카테고리를 짐작해서 선택 상자를 맞춰 준다.
function applyAutoCategory() {
  // 입력창을 다 지웠으면 처음 상태로 돌아간다.
  if (todoInput.value.trim() === "") {
    resetAutoCategory();
    return;
  }
  // 사용자가 직접 고른 카테고리는 건드리지 않는다.
  if (categoryPickedManually) {
    return;
  }

  const detected = detectCategory(todoInput.value);
  if (detected === null) {
    // 걸린 키워드가 없으면 선택 상자는 그대로 두고 안내만 지운다.
    autoCategoryHint.hidden = true;
    autoCategoryHint.textContent = "";
    return;
  }

  categorySelect.value = detected.category;
  autoCategoryHint.textContent =
    "'" + detected.keyword + "' → '" + CATEGORY_LABELS[detected.category] +
    "'(으)로 자동 분류했어요. 다르면 직접 바꿔 주세요.";
  autoCategoryHint.dataset.category = detected.category; // 안내 글자의 색을 정한다 (style.css)
  autoCategoryHint.hidden = false;
}

// 글자를 칠 때마다 카테고리를 다시 짐작한다.
todoInput.addEventListener("input", applyAutoCategory);

// 사용자가 카테고리를 직접 고르면 그 선택을 따르고, 자동 분류는 잠시 멈춘다.
categorySelect.addEventListener("change", function () {
  categoryPickedManually = true;
  autoCategoryHint.hidden = true;
  autoCategoryHint.textContent = "";
});

todoInput.addEventListener("keydown", function (event) {
  // 한글은 글자를 조합하는 중에 Enter를 누르면 신호가 두 번 온다.
  // 조합 중인 신호는 무시해야 같은 할 일이 두 번 추가되지 않는다.
  if (event.isComposing) {
    return;
  }
  if (event.key === "Enter") {
    handleAdd();
  }
});

// --- 필터, 검색, 정렬, 테마 ---

// 필터 탭을 누르면 그 카테고리만 보여 준다.
filterTabs.addEventListener("click", function (event) {
  const tab = event.target.closest(".tab");
  if (tab) {
    setFilter(tab.dataset.filter);
  }
});

// 검색창에 글자를 치면 목록을 걸러 보여 준다.
// 글자마다 다시 그리지 않도록 디바운스해서, 잠깐 멈췄을 때 한 번만 그린다.
const applySearch = debounce(function () {
  searchQuery = searchInput.value.trim().toLowerCase();
  render();
  if (searchQuery !== "") {
    announce("검색 결과 " + getVisibleTodos().length + "개");
  }
}, SEARCH_DELAY_MS);

searchInput.addEventListener("input", applySearch);

sortSelect.addEventListener("change", function () {
  setSortMode(sortSelect.value);
});

themeToggle.addEventListener("click", toggleTheme);

// --- 목록 안에서 일어나는 일 ---
// 항목마다 함수를 달지 않고 목록(<ul>) 하나에서 모두 받는다. (이벤트 위임)
// 항목이 100개든 1000개든 연결해 둔 함수의 수는 그대로다.

// 일어난 일이 어느 할 일에서 일어났는지 찾아 그 <li>를 돌려준다.
function getItemFromEvent(event) {
  const item = event.target.closest(".todo-item");
  return item && item.dataset.id ? item : null;
}

// 확인을 받은 뒤 할 일 하나를 삭제하고, 포커스를 이웃 항목으로 옮긴다.
function requestDelete(id, item) {
  const todo = findTodo(id);
  if (!todo || !confirm("'" + todo.text + "' 할 일을 삭제할까요?")) {
    return;
  }

  // 지운 뒤 포커스를 둘 곳(바로 아래 항목, 없으면 바로 위 항목)을 미리 찾아 둔다.
  const ids = getVisibleTodos().map(function (visible) {
    return visible.id;
  });
  const index = ids.indexOf(id);
  const neighborId = ids[index + 1] || ids[index - 1] || null;

  // 서서히 사라지게 한 뒤에 실제로 지운다.
  fadeOutThen([item], function () {
    deleteTodo(id);
    if (neighborId === null || !focusInItem(neighborId, ".todo-check")) {
      todoInput.focus();
    }
  });
}

// 목록에서 바로 할 일의 카테고리를 바꾼다.
function changeCategory(id, category) {
  updateTodo(id, { category: category });

  const label = CATEGORY_LABELS[category];
  // 항목이 새로 그려졌으므로 포커스를 카테고리 버튼으로 되돌려 놓는다.
  if (focusInItem(id, ".todo-badge")) {
    announce("카테고리를 " + label + "(으)로 바꿨습니다.");
  } else {
    // 지금 필터에 맞지 않게 되어 목록에서 사라진 경우
    showToast("카테고리를 '" + label + "'(으)로 바꿨습니다. 지금 필터에서는 보이지 않습니다.");
    todoInput.focus();
  }
}

// 버튼 클릭: 버튼에 적어 둔 data-action을 보고 할 일을 정한다.
todoList.addEventListener("click", function (event) {
  const button = event.target.closest("[data-action]");
  const item = getItemFromEvent(event);
  if (!button || !item) {
    return;
  }

  const id = item.dataset.id;
  const action = button.dataset.action;
  if (action === "edit") {
    startEdit(id);
  } else if (action === "delete") {
    requestDelete(id, item);
  } else if (action === "save") {
    commitEdit(id);
  } else if (action === "cancel") {
    cancelEdit();
  }
});

// 체크박스를 누르면 완료 상태를 바꾼다.
todoList.addEventListener("change", function (event) {
  const item = getItemFromEvent(event);
  if (!item) {
    return;
  }

  // 카테고리 버튼에서 다른 카테고리를 골랐을 때
  if (event.target.matches(".todo-badge")) {
    changeCategory(item.dataset.id, event.target.value);
    return;
  }

  if (!event.target.matches(".todo-check")) {
    return;
  }

  const id = item.dataset.id;
  const done = event.target.checked;
  // 체크한 항목은 새 자리로 미끄러져 들어오게 한다.
  pendingAnimation = { id: id, className: "slide-in" };
  updateTodo(id, { done: done });

  // 항목이 새로 그려졌으므로 포커스를 체크박스로 되돌려 놓는다.
  focusInItem(id, ".todo-check");
  announce(done ? "완료로 표시했습니다." : "완료를 취소했습니다.");
});

// 할 일 글자를 더블클릭하면 수정 모드로 바꾼다.
todoList.addEventListener("dblclick", function (event) {
  const item = getItemFromEvent(event);
  if (item && event.target.matches(".todo-text")) {
    startEdit(item.dataset.id);
  }
});

// 목록 안에서 누른 키: 수정 중에는 Enter/Esc, 손잡이에서는 위아래 화살표
todoList.addEventListener("keydown", function (event) {
  const item = getItemFromEvent(event);
  if (!item) {
    return;
  }
  const id = item.dataset.id;

  if (item.classList.contains("editing")) {
    // 한글을 조합하는 중에 누른 키는 무시한다.
    if (event.isComposing) {
      return;
    }
    // 저장/취소 버튼 위에서 누른 Enter는 버튼 클릭으로 처리되므로 여기서는 건너뛴다.
    if (event.key === "Enter" && !event.target.matches("button")) {
      event.preventDefault();
      commitEdit(id);
    } else if (event.key === "Escape") {
      cancelEdit();
    }
    return;
  }

  if (event.target.matches(".drag-handle")) {
    if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      event.preventDefault(); // 화살표 키로 화면이 스크롤되지 않게 한다.
      moveTodoByStep(id, event.key === "ArrowUp" ? -1 : 1);
      // 요소가 옮겨지면 포커스가 풀리므로 손잡이에 다시 둔다.
      focusInItem(id, ".drag-handle");
    }
  }
});

// 나타나는 애니메이션이 끝나면 클래스를 떼어 낸다.
// (요소를 다시 쓰기 때문에, 붙여 둔 채로 두면 자리를 옮길 때 애니메이션이 또 나온다)
todoList.addEventListener("animationend", function (event) {
  event.target.classList.remove("fade-in", "slide-in");
});

// --- 끌어서 순서 바꾸기 ---
// 마우스와 손가락을 한 가지 방식(pointer 이벤트)으로 함께 처리한다.

// 끌기를 끝낸다. shouldMove가 true이고 놓을 자리가 있으면 실제로 옮긴다.
function finishDrag(shouldMove) {
  if (dragState === null) {
    return;
  }

  const state = dragState;
  dragState = null;

  // 끄는 동안 붙여 둔 표시를 모두 지운다.
  state.item.classList.remove("dragging");
  document.body.classList.remove("is-dragging");
  if (state.target) {
    state.target.classList.remove("drop-before", "drop-after");
  }
  if (state.handle.hasPointerCapture(state.pointerId)) {
    state.handle.releasePointerCapture(state.pointerId);
  }

  if (shouldMove && state.target) {
    moveTodo(state.id, state.target.dataset.id, state.placeAfter);
    focusInItem(state.id, ".drag-handle");
  }
}

// 손잡이를 누르면 끌기를 시작한다.
todoList.addEventListener("pointerdown", function (event) {
  const handle = event.target.closest(".drag-handle");
  // 수정 중이거나, 마우스 왼쪽 버튼이 아니면 시작하지 않는다.
  if (!handle || editingId !== null || (event.pointerType === "mouse" && event.button !== 0)) {
    return;
  }

  const item = handle.closest(".todo-item");
  dragState = {
    id: item.dataset.id, // 끌고 있는 할 일
    item: item,
    handle: handle,
    pointerId: event.pointerId,
    target: null, // 지금 포인터 아래에 있는 항목 (놓을 자리)
    placeAfter: false, // true면 target의 아래, false면 위에 놓는다.
  };

  // 포인터가 손잡이 밖으로 나가도 계속 이 손잡이가 움직임을 받게 한다.
  // 브라우저가 거절해도 목록 안에서는 끌 수 있으므로 오류는 넘어간다.
  try {
    handle.setPointerCapture(event.pointerId);
  } catch (error) {
    console.error("포인터를 붙잡지 못했습니다.", error);
  }
  item.classList.add("dragging");
  document.body.classList.add("is-dragging");
});

// 끄는 동안: 포인터 아래의 항목을 찾아 놓을 자리를 선으로 보여 준다.
todoList.addEventListener("pointermove", function (event) {
  if (dragState === null || event.pointerId !== dragState.pointerId) {
    return;
  }

  // 이전에 그려 둔 선을 지운다.
  if (dragState.target) {
    dragState.target.classList.remove("drop-before", "drop-after");
    dragState.target = null;
  }

  // 포인터 바로 아래에 있는 요소에서 할 일 항목을 찾는다.
  const under = document.elementFromPoint(event.clientX, event.clientY);
  const over = under ? under.closest(".todo-item") : null;
  if (over && over !== dragState.item && over.dataset.id && todoList.contains(over)) {
    // 항목의 위쪽 절반에 있으면 그 위에, 아래쪽 절반에 있으면 그 아래에 놓는다.
    const rect = over.getBoundingClientRect();
    dragState.placeAfter = event.clientY > rect.top + rect.height / 2;
    dragState.target = over;
    over.classList.add(dragState.placeAfter ? "drop-after" : "drop-before");
  }

  // 끝 가까이로 끌면 조금씩 스크롤한다. (목록이 길 때)
  // 데스크톱 화면에서는 페이지가 아니라 목록 상자 안쪽이 스크롤되므로 경우를 나눈다.
  if (todoList.scrollHeight > todoList.clientHeight) {
    // 목록 상자 안쪽이 스크롤되는 경우: 목록의 위아래 끝이 기준이다.
    const listRect = todoList.getBoundingClientRect();
    if (event.clientY < listRect.top + 40) {
      todoList.scrollTop -= 12;
    } else if (event.clientY > listRect.bottom - 40) {
      todoList.scrollTop += 12;
    }
  } else if (event.clientY < 60) {
    // 페이지 전체가 스크롤되는 경우: 화면의 위아래 끝이 기준이다.
    window.scrollBy(0, -12);
  } else if (event.clientY > window.innerHeight - 60) {
    window.scrollBy(0, 12);
  }
});

todoList.addEventListener("pointerup", function () {
  finishDrag(true);
});

// 전화가 오는 등 끌기가 도중에 끊기면 아무것도 옮기지 않고 끝낸다.
todoList.addEventListener("pointercancel", function () {
  finishDrag(false);
});
todoList.addEventListener("lostpointercapture", function () {
  finishDrag(false);
});

// --- 아래쪽 버튼: 내보내기, 가져오기, 완료된 항목 모두 삭제 ---

exportButton.addEventListener("click", function () {
  const count = todos.length;
  if (exportTodos()) {
    showToast("할 일 " + count + "개를 파일로 내보냈습니다.");
  }
});

// "가져오기" 버튼은 숨겨 둔 파일 선택 창을 대신 눌러 준다.
importButton.addEventListener("click", function () {
  importFile.click();
});

importFile.addEventListener("change", function () {
  handleImportFile(importFile.files[0]);
  // 값을 비워 두어야 같은 파일을 다시 골라도 change가 일어난다.
  importFile.value = "";
});

clearDoneButton.addEventListener("click", function () {
  const doneCount = calcProgress(todos).done;
  if (doneCount === 0) {
    showToast("완료한 할 일이 없습니다.");
    return;
  }

  if (confirm("완료한 할 일 " + doneCount + "개를 모두 삭제할까요?")) {
    // 화면에 보이는 완료 항목을 서서히 사라지게 한 뒤에 실제로 지운다.
    fadeOutThen(todoList.querySelectorAll(".todo-item.done"), clearDoneTodos);
  }
});

// --- 알림(토스트)의 버튼 ---

toastAction.addEventListener("click", function () {
  if (toastHandler !== null) {
    toastHandler();
  }
});

// --- 키보드 단축키 ---
// Alt+N 입력창, Alt+S 검색창, Alt+1~4 필터, Alt+D 다크 모드, Ctrl+Z 되돌리기
// (단축키를 바꾸면 index.html의 "단축키" 안내도 같이 고친다)
document.addEventListener("keydown", function (event) {
  // Ctrl+Z (맥은 Cmd+Z): 되돌릴 것이 있을 때만 동작한다.
  // 글자를 입력하는 중이면 브라우저의 "입력 취소"를 방해하지 않는다.
  if ((event.ctrlKey || event.metaKey) && !event.altKey && event.code === "KeyZ") {
    const isTyping = event.target.matches("input, select, textarea");
    if (undoAction !== null && !isTyping) {
      event.preventDefault();
      runUndo();
    }
    return;
  }

  if (!event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }

  // event.code는 한글 입력 상태에서도 같은 값을 준다. 예: "KeyN", "Digit1"
  if (event.code === "KeyN") {
    todoInput.focus();
  } else if (event.code === "KeyS") {
    searchInput.focus();
  } else if (event.code === "KeyD") {
    toggleTheme();
  } else if (FILTER_SHORTCUTS[event.code]) {
    setFilter(FILTER_SHORTCUTS[event.code]);
  } else {
    return;
  }

  // 브라우저가 같은 단축키로 하려던 동작(주소창으로 이동 등)을 막는다.
  event.preventDefault();
});

// --- 페이지를 떠날 때, 다른 탭에서 바뀌었을 때 ---

// 저장을 잠깐 미뤄 두는 중에 페이지를 닫으면 마지막 변경이 사라질 수 있다.
// 페이지를 떠나거나 가려질 때 미뤄 둔 저장을 바로 끝낸다.
window.addEventListener("pagehide", scheduleSave.flush);
document.addEventListener("visibilitychange", function () {
  if (document.visibilityState === "hidden") {
    scheduleSave.flush();
  }
});

// 같은 앱을 다른 탭에서도 열어 두고 거기서 바꾸면, 이 탭도 새 데이터로 맞춘다.
// (storage 이벤트는 "다른 탭"이 localStorage를 바꿨을 때만 온다)
window.addEventListener("storage", function (event) {
  if (event.key === STORAGE_KEY) {
    todos = loadTodos();
    if (editingId !== null && !findTodo(editingId)) {
      editingId = null;
    }
    render();
  }
});

// ===== 16. 시작 =====

// 페이지가 열리면 저장된 테마, 할 일, 필터, 정렬을 불러와서 화면에 그린다.
currentTheme = loadTheme();
applyTheme();
todos = loadTodos();
currentFilter = loadFilter();
sortMode = loadSort();
render();

// 오늘의 격언을 하나 골라 보여 준다. Math.random()은 0 이상 1 미만의 수를 준다.
quote.textContent = "“" + QUOTES[Math.floor(Math.random() * QUOTES.length)] + "”";

// "2시간 전" 같은 생성 시간이 맞게 유지되도록 1분마다 다시 그린다.
// 시간 글자가 바뀐 항목만 새로 만들어지므로 부담이 작다.
// 끌고 있는 중에는 놓을 자리 표시가 흐트러지지 않게 건너뛴다.
setInterval(function () {
  if (dragState === null) {
    render();
  }
}, 60000);
