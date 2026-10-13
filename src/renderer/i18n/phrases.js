// Motivational phrases shown around the app (welcome card, etc.).
// EDIT THIS FILE to add, remove or rewrite phrases. One string per line,
// inside the array for each language. The app picks one at random.
(() => {
  "use strict";

  const MOTIVATIONAL_PHRASES = {
    "es-MX": [
      "Procedo a ser productiva 🍅",
      "Poco a poquito se llena el jarrito.",
      "Échale ganitas.",
      "Una tarea a la vez, sin hacerse bolas.",
      "Tu puedes con todo perrilla multifacética 💕",
      "Ánimo, que el viaje a España no se va a pagar solo.",
      "Te amo mucho Maria :).",
      "Ánimo, que tú traes con queso.",
      "El jitomatito te está viendo 🍅",
      "Agüita, estiramiento y a respirar.",
    ],
    en: [
      "You've got this, little tomato 🍅",
      "Little by little you go a long way.",
      "Keep going, you're almost there.",
      "One task at a time, no rushing.",
      "You're doing great, keep it up 💕",
      "Focus a little, then rest.",
      "Today counts too, even if it's small.",
      "Come on, you've got plenty in you.",
      "Don't give up just yet 🍅",
      "One little tomato at a time.",
    ],
  };

  const lastGiven = {};

  function list(lang) {
    const phrases = MOTIVATIONAL_PHRASES[lang] || MOTIVATIONAL_PHRASES["es-MX"] || [];
    return phrases;
  }

  function pick(lang) {
    const phrases = list(lang);
    if (!phrases.length) return "";
    let index = Math.floor(Math.random() * phrases.length);
    if (phrases.length > 1 && phrases[index] === lastGiven[lang]) {
      index = (index + 1) % phrases.length;
    }
    lastGiven[lang] = phrases[index];
    return phrases[index];
  }

  window.phrases = { MOTIVATIONAL_PHRASES, list, pick };
})();
