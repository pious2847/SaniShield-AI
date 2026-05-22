const { answerHygieneQuestion } = require('../services/geminiService');

const HYGIENE_TOPICS = [
  { id: 1, topic: 'Handwashing', description: 'Proper handwashing techniques and when to wash hands', emoji: '🖐️' },
  { id: 2, topic: 'Safe Water', description: 'How to treat and store water safely at home', emoji: '💧' },
  { id: 3, topic: 'Latrine Use & Maintenance', description: 'How to use and maintain a pit latrine properly', emoji: '🚽' },
  { id: 4, topic: 'Open Defecation', description: 'Why open defecation is dangerous and how to stop it', emoji: '⚠️' },
  { id: 5, topic: 'Waste Disposal', description: 'Safe disposal of household waste and garbage', emoji: '🗑️' },
  { id: 6, topic: 'Food Hygiene', description: 'Safe food handling, preparation and storage', emoji: '🍽️' },
  { id: 7, topic: 'Flood Sanitation', description: 'Staying safe during floods — water and sanitation precautions', emoji: '🌊' },
  { id: 8, topic: 'Menstrual Hygiene', description: 'Menstrual hygiene management in schools and communities', emoji: '🌸' },
  { id: 9, topic: 'Child Hygiene', description: 'Teaching children good hygiene habits', emoji: '👶' },
  { id: 10, topic: 'Cholera Prevention', description: 'How to prevent cholera and other waterborne diseases', emoji: '💊' },
];

async function ask(req, res, next) {
  try {
    const { question, district, language } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ success: false, message: 'question is required' });
    }
    const answer = await answerHygieneQuestion(question.trim(), { district, language });
    res.json({ success: true, question: question.trim(), data: answer });
  } catch (e) {
    if (e.isRateLimit) {
      return res.status(429).json({
        success: false,
        message: 'AI quota reached — please try again shortly.',
        retryAfter: e.retryAfter ?? 30,
      });
    }
    next(e);
  }
}

async function topics(req, res, next) {
  try {
    res.json({ success: true, count: HYGIENE_TOPICS.length, data: HYGIENE_TOPICS });
  } catch (e) { next(e); }
}

module.exports = { ask, topics };
