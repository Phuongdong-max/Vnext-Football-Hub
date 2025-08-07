# VNext Japan - Football Club Hub

<!-- Badges (placeholders) -->
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen)](https://github.com/vnext-japan/football-hub)
[![License](https://img.shields.io/badge/license-UNLICENSED-lightgrey)](./LICENSE)
[![React](https://img.shields.io/badge/React-19-blue?logo=react)](https://react.dev/)
[![Firebase](https://img.shields.io/badge/Firebase-v9-orange?logo=firebase)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)

A feature-rich web application for managing friendly football club activities, including betting rounds, automated team division, and full tournament management with live-animated draws.

**Live Demo:** [https://vnext-football-hub.web.app](https://vnext-football-hub.web.app)

---

## 📸 Screenshots & GIFs

*(A short GIF or a few screenshots showcasing the app's key features would be great here. For example: The tournament page, the AI analysis modal, or the animated team divider.)*

<p align="center">
  <em>(Tournament Page with Standings, Schedule, and Top Scorers)</em>
</p>
<p align="center">
  <em>(Team Divider with live animated spinner)</em>
</p>
<p align="center">
  <em>(AI Match Analysis Modal powered by Google Gemini)</em>
</p>

---

## ✨ Features

- **🛡️ Secure Authentication:** Google Sign-In with Firebase Authentication.
- **🎭 Role-Based Access:** Differentiated experience for Admins and Members.
- **💸 Betting Rounds:** Admins can create betting rounds for real matches, and members can place bets using in-app points.
- **🤖 Live AI Match Analysis:** Integrated with the **Google Gemini API** to provide detailed pre-match analysis, including form, key factors, and score predictions.
- **📊 Real-time Leaderboard:** Automatically updated leaderboard tracking user points and betting performance.
- **🔗 Live Match Data:**
    - Fetches upcoming matches from **The Odds API** and **football-data.org** via secure Cloud Function proxies.
    - Displays live Head-to-Head (H2H) odds for open betting rounds.
- **🤸‍♂️ Automated Team Divider:**
    - Input players based on skill tiers (GK, A, B, C, D, E).
    - **Live Animated Spinner:** A fun, visually engaging wheel spins to randomly select players and assign them to teams using a balanced algorithm.
    - Player names fly from the wheel to their assigned team box for a dynamic user experience.
- **🏆 Comprehensive Tournament Management:**
    - **Team & Roster Control:** Admins can create teams and manage member rosters.
    - **Animated Draws:**
        - **Live Schedule Draw:** An animated draw reveals the full round-robin schedule match by match.
        - **Live Jersey Draw:** A "dice roll" animation assigns team jerseys.
    - **Automatic Standings:** Table is automatically calculated and sorted based on match results (Points, GD, GF).
    - **Score & Goalscorer Tracking:** Logged-in users can update scores and assign goals to specific players (including guests).
    - **Top Scorers List:** An automatically generated and ranked list of the tournament's top goalscorers.
- **🎨 Modern UI/UX:**
    - **Responsive Design:** Looks great on desktop and mobile.
    - **Theming:** Light, Dark, and System modes.
    - **Internationalization (i18n):** Supports English and Vietnamese.
    - **Smooth Animations:** Built with CSS animations and transitions for an enhanced user experience.
    - **Toast Notifications:** For non-intrusive feedback.

---

## 🛠️ Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS
- **Backend & Database:** Firebase (Authentication, Firestore Realtime Database, Cloud Functions for Node.js)
- **APIs:**
    - Google Gemini API
    - The Odds API
    - football-data.org
- **Build Tool:** esbuild
- **Deployment:** Firebase Hosting & Cloud Functions

---

## 🚀 Getting Started

Follow these instructions to get a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Firebase CLI](https://firebase.google.com/docs/cli#install_the_firebase_cli)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/vnext-football-hub.git
    cd vnext-football-hub
    ```

2.  **Install project dependencies:**
    ```bash
    npm install
    ```

3.  **Install Cloud Functions dependencies:**
    ```bash
    cd functions
    npm install
    cd ..
    ```

### Firebase Setup

1.  Create a new project on the [Firebase Console](https://console.firebase.google.com/).
2.  Enable **Authentication** (with Google Sign-In provider), **Firestore**, and **Storage**.
3.  Go to Project Settings and copy your web app's Firebase configuration object.
4.  Paste this configuration into `firebaseConfig.ts`.

### Environment Variables

1.  Create a `.env` file in the project root.
2.  Add the following keys. These are required for the external APIs to function.

    ```env
    # Used for client-side AI analysis
    GEMINI_API_KEY="your_google_ai_studio_api_key"

    # Used by the Cloud Function proxies
    FOOTBALL_DATA_API_KEY="your_football-data.org_api_key"
    THE_ODDS_API_KEY="your_the-odds-api.com_api_key"
    ```

    > **Note:** The keys for `football-data.org` and `the-odds-api.com` are used by the backend Cloud Functions. `GEMINI_API_KEY` is injected into the client-side build process.

### Deploy Cloud Functions

The app relies on proxy functions to securely handle API keys for match data. You must deploy them once before running the app locally.

```bash
# Log in to Firebase
firebase login

# Set your active Firebase project
firebase use YOUR_PROJECT_ID

# Deploy the functions
npm run deploy:functions
```

*Note: For a production setup, it's highly recommended to use Firebase's Secret Manager for API keys. You can set them using `firebase functions:secrets:set THE_ODDS_API_KEY` and then access them in `functions/src/index.ts`.*

### Run Locally

Once the functions are deployed, you can start the local development server.

```bash
npm run dev
```

The application will be available at `http://127.0.0.1:8000`.

---

## ☁️ Deployment

The project is configured for easy deployment to Firebase.

```bash
# This command builds the React app, installs function dependencies,
# and deploys both hosting and functions.
npm run deploy:all
```

---

## 📄 License

This project is unlicensed and is for demonstration and personal use.
