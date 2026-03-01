// Global state
let currentLanguage = ''; // 'chinese' or 'french'
let currentLevel = '';
let vocabularyData = [];
let currentCardIndex = 0;
let viewedCards = new Set();
let isFlipped = false;
let quizScore = 0;
let currentQuizIndex = 0;
let quizQuestions = [];

// Parse CSV data
function parseCSV(text, language) {
	const lines = text.trim().split('\n');
	const data = [];

	if (language === 'chinese') {
		// Chinese format: Index,Chinese,Pinyin,English,Level
		for (let i = 1; i < lines.length; i++) {
			const values = lines[i].split(',');
			if (values.length >= 4) {
				data.push({
					index: values[0],
					foreign: values[1],
					pronunciation: values[2],
					english: values[3],
					level: values[4] || ''
				});
			}
		}
	} else if (language === 'french') {
		// French format: rank,word_fr,word_en,tag,phrase_fr,phrase_en
		for (let i = 1; i < lines.length; i++) {
			const values = lines[i].split(',');
			if (values.length >= 3) {
                data.push({
                    index: values[0],
                    foreign: values[1].replace(/^["']|["']$/g, ''),
                    pronunciation: '', // French doesn't have pinyin
                    english: values[2].replace(/^["']|["']$/g, ''),
                    tag: values[3] || ''
                });
			}
		}
	}
	return data;
}

// Load vocabulary from CSV
async function loadVocabulary(language, level) {
	try {
		let filePath;
		if (language === 'chinese') {
			filePath = `chinese/${level}.csv`;
		} else if (language === 'french') {
			filePath = 'french/french.csv';
		}

		const response = await fetch(filePath);
		if (!response.ok) {
			throw new Error(`Failed to load ${filePath}: ${response.status}`);
		}
		const text = await response.text();
		vocabularyData = parseCSV(text, language);
		// Shuffle the vocabulary for randomized learning
		vocabularyData = shuffleArray(vocabularyData);
		return vocabularyData.length > 0;
	} catch (error) {
		console.error('Error loading vocabulary:', error);
		alert('Error loading vocabulary data. Please check if the CSV file exists.');
		return false;
	}
}

// Navigation functions
function goHome() {
	document.getElementById('homePage').classList.remove('hidden');
	document.getElementById('activitiesPage').classList.add('hidden');
	document.getElementById('flashcardsPage').classList.add('hidden');
	document.getElementById('quizPage').classList.add('hidden');
}

async function selectLevel(level) {
	currentLanguage = 'chinese';
	currentLevel = level;
	const success = await loadVocabulary('chinese', level);

	if (success) {
		document.getElementById('homePage').classList.add('hidden');
		document.getElementById('activitiesPage').classList.remove('hidden');
		document.getElementById('levelTitle').textContent = `${level.toUpperCase()} Activities`;
		// Reset progress for new level
		viewedCards.clear();
		updateFlashcardBadge();
	}
}

async function selectFrench() {
	currentLanguage = 'french';
	currentLevel = 'french';
	const success = await loadVocabulary('french', 'french');

	if (success) {
		document.getElementById('homePage').classList.add('hidden');
		document.getElementById('activitiesPage').classList.remove('hidden');
		document.getElementById('levelTitle').textContent = 'French Activities';
		// Reset progress for new language
		viewedCards.clear();
		updateFlashcardBadge();
	}
}

function backToActivities() {
	document.getElementById('activitiesPage').classList.remove('hidden');
	document.getElementById('flashcardsPage').classList.add('hidden');
	resetFlashcard();
}

function backToFlashcards() {
	document.getElementById('flashcardsPage').classList.remove('hidden');
	document.getElementById('quizPage').classList.add('hidden');
}

function showComingSoon() {
	alert('Coming soon!');
}

// Flashcard functions
function startFlashcards() {
	if (vocabularyData.length === 0) {
		alert('No vocabulary data loaded.');
		return;
	}

	document.getElementById('activitiesPage').classList.add('hidden');
	document.getElementById('flashcardsPage').classList.remove('hidden');

	currentCardIndex = 0;
	updateCard();
	updateProgress();
}

function updateCard() {
	if (vocabularyData.length === 0) return;

	const card = vocabularyData[currentCardIndex];
	document.getElementById('chineseWord').textContent = card.foreign;

	const pinyinElement = document.getElementById('pinyin');
	if (currentLanguage === 'chinese' && card.pronunciation) {
		pinyinElement.textContent = card.pronunciation;
		pinyinElement.style.display = 'block';
	} else {
		pinyinElement.style.display = 'none';
	}

	document.getElementById('englishWord').textContent = card.english;

	// Mark as viewed
	viewedCards.add(currentCardIndex);
	updateProgress();
	updateFlashcardBadge();

	// Update previous button state
	document.getElementById('prevBtn').disabled = currentCardIndex === 0;

	// Reset flip state
	document.getElementById('flashcard').classList.remove('flipped');
	isFlipped = false;
}

function flipCard() {
	const flashcard = document.getElementById('flashcard');
	flashcard.classList.toggle('flipped');
	isFlipped = !isFlipped;
}

function nextCard() {
	if (currentCardIndex < vocabularyData.length - 1) {
		currentCardIndex++;
		updateCard();
	} else {
		alert('You have reached the last card!');
	}
}

function previousCard() {
	if (currentCardIndex > 0) {
		currentCardIndex--;
		updateCard();
	}
}

function updateProgress() {
	const viewedCount = viewedCards.size;
	const totalCards = vocabularyData.length;
	const percentage = Math.round((viewedCount / totalCards) * 100);

	document.getElementById('viewedCount').textContent = viewedCount;
	document.getElementById('progressFill').style.width = percentage + '%';
	document.getElementById('progressText').textContent = percentage + '%';

	// Check if quiz should be unlocked
	if (viewedCount >= 20) {
		document.getElementById('quizStatus').textContent = 'Quiz mode unlocked! 🎉';
		document.getElementById('startQuizBtn').style.display = 'block';
	} else {
		document.getElementById('quizStatus').textContent = `View ${20 - viewedCount} more words to unlock quiz mode`;
		document.getElementById('startQuizBtn').style.display = 'none';
	}
}

function updateFlashcardBadge() {
	const badge = document.getElementById('flashcardBadge');
	const viewedCount = viewedCards.size;

	if (viewedCount === 0) {
		badge.textContent = 'Not Started';
		badge.classList.remove('unlocked');
	} else if (viewedCount >= 20) {
		badge.textContent = 'Quiz Unlocked';
		badge.classList.add('unlocked');
	} else {
		badge.textContent = `${viewedCount} viewed`;
		badge.classList.remove('unlocked');
	}
}

function resetFlashcard() {
	currentCardIndex = 0;
	isFlipped = false;
	document.getElementById('flashcard').classList.remove('flipped');
}

// Quiz functions
function startQuiz() {
	if (viewedCards.size < 20) {
		alert('Please view at least 20 words before starting the quiz.');
		return;
	}

	// Generate quiz questions from viewed cards
	const viewedCardsArray = Array.from(viewedCards).map(index => vocabularyData[index]);
	quizQuestions = shuffleArray([...viewedCardsArray]).slice(0, 10); // 10 questions

	currentQuizIndex = 0;
	quizScore = 0;

	document.getElementById('flashcardsPage').classList.add('hidden');
	document.getElementById('quizPage').classList.remove('hidden');
	document.getElementById('quizQuestion').classList.remove('hidden');
	document.getElementById('quizResult').classList.add('hidden');

	updateQuizQuestion();
}

function updateQuizQuestion() {
	if (currentQuizIndex >= quizQuestions.length) {
		showQuizResults();
		return;
	}

	const question = quizQuestions[currentQuizIndex];
	document.getElementById('quizChinese').textContent = question.foreign;

	const quizPinyinElement = document.getElementById('quizPinyin');
	if (currentLanguage === 'chinese' && question.pronunciation) {
		quizPinyinElement.textContent = question.pronunciation;
		quizPinyinElement.style.display = 'block';
	} else {
		quizPinyinElement.style.display = 'none';
	}
	document.getElementById('quizScore').textContent = quizScore;
	document.getElementById('quizTotal').textContent = quizQuestions.length;

	// Generate 4 options (1 correct + 3 wrong)
	const options = generateQuizOptions(question);
	const optionsContainer = document.getElementById('quizOptions');
	optionsContainer.replaceChildren();

	options.forEach((option, index) => {
		const button = document.createElement('button');
		button.className = 'option-btn';
		button.textContent = option.english;
		button.addEventListener('click', () => {
			selectAnswer(option.english === question.english, button, options);
		});
		optionsContainer.appendChild(button);
	});
}

function generateQuizOptions(correctAnswer) {
	const options = [correctAnswer];
	const availableWords = vocabularyData.filter(w => w.english !== correctAnswer.english);

	// Randomly select 3 wrong answers
	while (options.length < 4 && availableWords.length > 0) {
		const randomIndex = Math.floor(Math.random() * availableWords.length);
		const wrongAnswer = availableWords.splice(randomIndex, 1)[0];
		options.push(wrongAnswer);
	}

	return shuffleArray(options);
}

function selectAnswer(isCorrect, button, options) {
	// Disable all buttons
	const allButtons = document.querySelectorAll('.option-btn');
	allButtons.forEach(btn => btn.disabled = true);

	// Show correct/incorrect feedback
	if (isCorrect) {
		button.classList.add('correct');
		quizScore++;
	} else {
		button.classList.add('incorrect');
		// Highlight the correct answer
		const correctAnswer = quizQuestions[currentQuizIndex].english;
		allButtons.forEach(btn => {
			if (btn.textContent === correctAnswer) {
				btn.classList.add('correct');
			}
		});
	}

	// Move to next question after delay
	setTimeout(() => {
		currentQuizIndex++;
		updateQuizQuestion();
	}, 1500);
}

function showQuizResults() {
	const percentage = Math.round((quizScore / quizQuestions.length) * 100);
	let message = '';

	if (percentage >= 90) {
		message = '🌟 Excellent! You\'re a master!';
	} else if (percentage >= 70) {
		message = '👏 Great job! Keep practicing!';
	} else if (percentage >= 50) {
		message = '👍 Good effort! Review and try again!';
	} else {
		message = '💪 Keep studying! You\'ll improve!';
	}

	document.getElementById('quizQuestion').classList.add('hidden');
	const resultDiv = document.getElementById('quizResult');
	resultDiv.classList.remove('hidden');
	resultDiv.replaceChildren();

	const heading = document.createElement('h2');
	heading.textContent = message;

	const score = document.createElement('p');
	score.textContent = `Your Score: ${quizScore} / ${quizQuestions.length} (${percentage}%)`;

	const retryButton = document.createElement('button');
	retryButton.className = 'control-btn primary';
	retryButton.textContent = 'Try Again';
	retryButton.addEventListener('click', startQuiz);

	const backButton = document.createElement('button');
	backButton.className = 'control-btn';
	backButton.textContent = 'Back to Flashcards';
	backButton.addEventListener('click', backToFlashcards);

	resultDiv.append(heading, score, retryButton, backButton);
}

function setupEventListeners() {
	document.querySelectorAll('.hsk-btn').forEach(button => {
		button.addEventListener('click', () => {
			selectLevel(button.dataset.level);
		});
	});

	document.getElementById('frenchCard').addEventListener('click', selectFrench);
	document.getElementById('backHomeBtn').addEventListener('click', goHome);
	document.getElementById('flashcardsTile').addEventListener('click', startFlashcards);
	document.querySelectorAll('.coming-soon-tile').forEach(tile => {
		tile.addEventListener('click', showComingSoon);
	});
	document.getElementById('backActivitiesBtn').addEventListener('click', backToActivities);
	document.getElementById('flashcard').addEventListener('click', flipCard);
	document.getElementById('prevBtn').addEventListener('click', previousCard);
	document.getElementById('nextBtn').addEventListener('click', nextCard);
	document.getElementById('startQuizBtn').addEventListener('click', startQuiz);
	document.getElementById('backFlashcardsBtn').addEventListener('click', backToFlashcards);
}

// Utility function to shuffle array
function shuffleArray(array) {
	const shuffled = [...array];
	for (let i = shuffled.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
	}
	return shuffled;
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', () => {
	setupEventListeners();
	console.log('Language Learning Platform loaded!');
});
