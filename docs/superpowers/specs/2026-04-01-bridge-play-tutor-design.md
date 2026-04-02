# Bridge Play Tutor — Design Spec

## Overview

A new standalone page (`bridge-play/index.html`) providing a mobile-first bridge gameplay tutor. One human player (South) plays alongside 3 AI-controlled seats (North/dummy, East, West). Every card in the player's hand is analyzed and rated before play, and every completed trick receives a post-trick review. After all 13 tricks, the player can replay the entire hand trick-by-trick with tutor commentary.

**Target audience:** Beginners who know the basic rules (tricks, trump, follow suit) but need guidance on play strategy.

**Architecture:** Same as existing apps — single self-contained HTML file, vanilla JavaScript, no dependencies, localStorage persistence, mobile-first dark theme matching the existing bridge tutor's design system.

---

## Screens

### 1. Menu Screen

- **Play mode selection:**
  - **Guided Hands** — curated deals with specific teaching objectives (e.g., "Cash Your Winners", "The Simple Finesse")
  - **Free Play** — random deals with random contracts
- **Bidding mode** — locked, shown grayed out with a lock icon. Unlocks after the player completes 10 hands. When unlocked, adds a simplified bidding phase before play.
- **Stats summary** — hands played, contracts made %, average play accuracy

### 2. Game Screen (Classic Table Layout)

**Layout (top to bottom):**

1. **Top bar** — Back button, contract info (e.g., "2♠ by South"), trick count (e.g., "Trick 3 of 13")
2. **Dummy hand (North)** — Face-up cards laid out horizontally. When it's dummy's turn to play and player controls dummy, cards are tappable with border-glow ratings.
3. **Table area** — Central trick display. West on the left, East on the right (shown as face-down card backs with card count). Played cards appear in the center in compass positions.
4. **Score bar** — "You: X" (green) | Contract info | "Them: Y" (red)
5. **Player hand (South)** — Large tappable cards at the bottom. Each card has a border-glow rating:
   - **Green border + star badge** = best play
   - **Yellow border** = acceptable play
   - **Red border + dimmed** = bad play
   - **Grayed out** = illegal (can't play, doesn't follow suit)

**Interaction flow:**
1. Cards that can be played are highlighted; illegal cards are grayed out
2. Player taps a card to select it (card lifts up slightly)
3. Player taps again or taps a "Play" button to confirm
4. Card animates to the trick area
5. AI players play automatically with ~500ms delays between each
6. After all 4 cards are played, the trick winner is determined
7. Trick review slide-up panel appears

**When player controls dummy (North):**
- Dummy's cards get border-glow ratings
- Player taps dummy cards directly
- A label indicates "Play from dummy"

### 3. Trick Review Panel (Slide-Up)

After each trick completes, a panel slides up from the bottom covering roughly the bottom third of the screen:

- **Header:** "Trick X — [You win! / They win.]" with green/red color
- **Body:** 1-2 sentence review in beginner-friendly language:
  - If optimal play: positive reinforcement ("Good play! Cashing your Ace here guarantees the trick.")
  - If suboptimal: gentle correction ("Your 10♠ worked here, but the 3♠ would have saved your 10 for a later trick where you'd need it.")
- **"Continue" button** to dismiss and start next trick

### 4. Hand Result Screen

Shown after all 13 tricks:

**Scorecard section:**
- Contract result: "2♠ Made!" (green) or "2♠ Down 1" (red)
- Tricks won: X of Y needed
- Play accuracy: percentage of optimal plays
- XP awarded (breakdown: base + contract bonus + accuracy bonus)

**Key moments section:**
- Highlight 2-3 tricks where the player made notably good or bad plays
- Each moment is tappable to jump to that trick in the replay

**Replay section:**
- "Review This Hand" button opens trick-by-trick replay
- Replay shows all 4 hands (revealed) and steps through each trick
- For each trick: show all 4 cards played, highlight the winner, and show tutor commentary explaining the optimal line
- Navigation: "Previous Trick" / "Next Trick" buttons, plus a trick number strip for direct access
- "Deal Again" and "Back to Menu" buttons at the end

---

## Card Analysis Engine

The analysis engine rates each playable card as **best**, **okay**, or **bad** using the following heuristics evaluated in priority order:

### When following suit:
1. **Can you win?** If you can beat the current best card in the trick:
   - If you're last to play: play the cheapest winner (best), all other winners (okay), non-winners (bad)
   - If not last: play a winner if it's likely to hold, based on remaining high cards
2. **Can't win?** Play the lowest card in the led suit (best), higher cards that can't win (bad)

### When leading:
1. **Cash sure winners** — Aces in NT contracts (best), especially early
2. **Lead from length** — Lead low from your longest suit to establish it (best)
3. **Avoid leading unsupported honors** — Don't lead a lone King or Queen (bad)

### When trumping:
1. **Trump when you can't follow suit** and the trick is worth winning (best if low trump, okay if high trump)
2. **Don't overtrump partner** unless necessary (bad)
3. **Don't trump when partner is winning** (bad)

### General principles:
- **Second hand low** — play low when second to play (best for low cards)
- **Third hand high** — play high when third to play and partner led (best for high cards)
- **Don't waste high cards** — if a low card achieves the same result, prefer it

### Rating assignment:
- **Best** (green + star): The single objectively best play (or tied-best plays)
- **Okay** (yellow): Playable, not harmful, but not optimal
- **Bad** (red + dimmed): Wasteful or strategically poor

### Post-trick evaluation:
After each trick, the engine compares the player's actual play to the best-rated card and generates a review message. The review messages are stored for the hand replay.

---

## AI Players

Reuse and extend the existing AI from `bridge-tutor/index.html`:

- **Leading:** Play lowest card from longest suit
- **Following (can win):** Play cheapest winning card
- **Following (can't win):** Play lowest card in suit
- **Trumping:** Trump with lowest trump when void in led suit and trick is worth winning

AI plays are executed automatically with ~500ms delays between each for readability. No analysis is shown for AI plays.

---

## Guided Hands

8-10 curated deals, each teaching a specific concept:

1. **Cash Your Winners** — Hand full of Aces and Kings in NT, just play them
2. **Follow Suit** — Simple hand emphasizing the follow-suit rule
3. **Using Trump** — Hand where trumping a losing trick is key
4. **Save Your High Cards** — Don't waste the King when the 2 would do
5. **Lead From Length** — Establish a long suit in NT
6. **Second Hand Low** — Practice the "second hand low" principle
7. **Third Hand High** — Practice covering partner's lead
8. **The Simple Finesse** — Basic finesse position

Each guided hand has:
- Pre-deal description explaining the concept
- Pre-set hands designed to illustrate the lesson
- Contract, trump suit, and target tricks
- Concept-specific review messages in the trick review panel

---

## Progression System

**XP awards per hand:**
- Base: 10 XP for completing a hand
- Contract made bonus: +10 XP
- Accuracy bonus: +1 XP per optimal play (max +13)
- Guided hand first-time bonus: +5 XP

**Persistence (localStorage key: `bridgePlay`):**
- XP total
- Hands played count
- Contracts made count
- Total optimal plays / total plays (for accuracy %)
- Completed guided hands (array of indices)
- Bidding unlocked (boolean, set true when hands played >= 10)

**Shared XP:** The bridge play tutor reads and writes to the same `bridgeTutor` localStorage XP counter so progress feels unified across both tutors.

---

## Bidding Phase (Locked — Phase 2)

Unlocks after 10 completed hands. When active:
- Simple bidding UI before play begins
- Player sees their hand and bids with tutor guidance
- AI partners/opponents bid using basic rules
- Tutor rates each bid option (same green/yellow/red system)
- After auction completes, play phase begins as normal

This is out of scope for initial implementation — just show the locked UI element.

---

## Navigation & Homepage

- New directory: `bridge-play/index.html`
- Add link from main `README.md`
- Cross-link between the two bridge tutors:
  - Bridge Tutor (lessons) links to Bridge Play Tutor: "Ready to play? Try the Play Tutor →"
  - Bridge Play Tutor links back: "Need to learn the basics? Try the Bridge Tutor →"

---

## Technical Notes

- **File size target:** Single HTML file, aim for ~3000-4000 lines (similar to bridge-tutor)
- **CSS:** Reuse the same design system (colors, fonts, animations) as bridge-tutor but as a fresh copy (no shared CSS files — matches existing pattern)
- **Mobile-first:** Touch targets minimum 44px, safe area insets, responsive flexbox layout
- **Animations:** Card play animation (translate to trick area), slide-up for review panel, bounce for result screen
- **No service worker/PWA initially** — can be added later
