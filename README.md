# OPD Token Allocation Engine

A dynamic, intelligent Outpatient Department (OPD) token management system designed to handle appointment bookings, real-time slot management, and unexpected delays efficiently. This system supports multiple priority levels (Online, Walk-in, Emergency) and provides a modern dashboard for administration.

## 🚀 Features

### Core Token Engine
-   **Dynamic Slot Allocation**: Automatically finds the best available slot for a patient.
-   **Priority Handling**:
    -   **Emergency**: Can overflow hard limits of slots.
    -   **Priority/Paid**: Higher weightage than standard walk-ins.
    -   **Tie-breaking**: First-Come-First-Serve (FCFS) logic for same-priority requests.
-   **Real-time Operations**:
    -   **Delay Handling**: Propagates delays to subsequent slots automatically.
    -   **Cancellations**: Frees up capacity instantly.

### Frontend Dashboard
-   **Live Status**: View doctors, slots (with Date & Time), and queue status in real-time.
-   **Booking Portal**: Easy-to-use form for booking tokens.
-   **Management**: Add new doctors and configure schedules on the fly.
-   **Operations**: Tools to report doctor delays or cancel tokens.
-   **UX Enhancements**:
    -   Autocomplete disabled for faster, distraction-free entry.
    -   Visual feedback for delayed slots (Red highlights).
    -   Glassmorphism-inspired UI design.

## 🛠️ Technology Stack

-   **Backend**: Node.js (ES Modules), Express.js
-   **Frontend**: HTML5, CSS3 (Modern Variables), Vanilla JavaScript
-   **Architecture**: RESTful API with In-Memory Data Store (Map based)

## 📂 Project Structure

```
OPD-TOKEN-ALLOCATION-ENGINE/
├── frontend/
│   ├── index.html       # Main Dashboard UI Structure
│   └── app.js           # Frontend Logic (API calls, UI rendering)
├── src/
│   ├── engine.js        # Core logic (Token assignment, Priority sorting, Delays)
│   ├── models.js        # Data classes (Doctor, Slot, Token, Source)
│   ├── routes.js        # Express API definitions
│   ├── server.js        # Server entry point & static file serving
│   └── simulation.js    # Logic for running simulations (if applicable)
├── package.json         # Dependencies
└── README.md            # Project Documentation
```

## 🏁 Getting Started

### Prerequisites
-   Node.js installed on your machine.

### Installation

1.  **Clone/Download** the repository.
2.  **Install Dependencies**:
    ```bash
    npm install
    ```

### Running the Application

1.  **Start the Backend Server**:
    ```bash
    node src/server.js
    ```
    *The server runs on port 3000 by default.*

2.  **Access the Dashboard**:
    Open your browser and navigate to:
    `http://localhost:3000`

## 📡 API Reference

Base URL: `/api`

### 1. Dashboard Data
-   **GET** `/dashboard`
-   Returns the complete state of doctors, slots, and assigned tokens.

### 2. Add Doctor
-   **POST** `/doctors`
-   **Body**:
    ```json
    {
      "id": "doc3",
      "name": "Dr. Strange",
      "specialty": "Neurology",
      "slots": [
        { "id": "s1", "startTime": "09:00", "endTime": "10:00", "hardLimit": 5 }
      ]
    }
    ```

### 3. Book Token
-   **POST** `/book`
-   **Body**:
    ```json
    {
      "doctorId": "doc1",
      "patientName": "John Doe",
      "source": "ONLINE"
    }
    ```
-   **Sources**: `ONLINE`, `WALKIN`, `PAID`, `PRIORITY`, `EMERGENCY`

### 4. Report Delay
-   **POST** `/event/delay`
-   **Body**:
    ```json
    {
      "doctorId": "doc1",
      "slotId": "s1",
      "delayMinutes": 15
    }
    ```
-   *Note: Maximum delay limit is 300 minutes (5 hours).*

### 5. Cancel Token
-   **POST** `/cancel`
-   **Body**:
    ```json
    {
      "doctorId": "doc1",
      "slotId": "s1",
      "tokenIndex": 0
    }
    ```

## 🧠 Core Logic Highlights

### Priority Weightage
| Source | Weight | Note |
| :--- | :--- | :--- |
| **EMERGENCY** | 100 | Can exceed slot capacity |
| **PRIORITY** | 50 | High priority |
| **PAID** | 50 | High priority |
| **WALKIN** | 10 | Standard |
| **ONLINE** | 10 | Standard |

Tokens within a slot are sorted first by **Priority Score (Descending)**, then by **Timestamp (Ascending)**.

### Delay Propagation
When a delay is reported for a slot:
1.  That slot's *End Time* is shifted.
2.  **All absolute subsequent slots** for that doctor are shifted by the same duration to maintain the schedule gap.

## ⚠️ Edge Cases & Failure Handling

The system is designed to be robust, but specific logical boundaries exist to maintain scheduling integrity:

### 1. Emergency Overflows
- **Scenario**: A patient arrives with `EMERGENCY` status, but all slots are full.
- **Handling**: The system **bypasses hard limits**. The emergency token is forced into the **first available slot** (Slot 0), allowing capacity to exceed the configured limit (e.g., 6/5).

### 2. Time Shifts & Delays
- **Scenario**: A doctor reports a delay (e.g., 45 mins).
- **Handling**:
    - The delayed slot's end time is extended.
    - **All absolute subsequent slots** are shifted forward by the same duration to preserve breaks/gaps.
    - **Note**: Delays crossing midnight (23:59 -> 00:45) wrap along with the time but do not change dates (as the system operates on a 24h cycle).

### 3. Priority Bumping (Smart Allocation)
- **Scenario**: A high-priority patient (`PAID`) arrives, but the desired slot is full of lower-priority (`WALKIN`) patients.
- **Handling**: Use of a "Bump" mechanic:
    - The system identifies the lowest priority token in the current slot.
    - It attempts to **move that lower-priority token to the next slot**.
    - If the next slot has space, the move occurs, and the high-priority patient takes the current spot.
    - If the next slot is also full, the specialized request is rejected (unless Emergency).

### 4. API Error Responses
- **Scenario**: Invalid Doctor ID, Slot ID, or missing parameters.
- **Handling**: The API returns standard JSON error responses:
    ```json
    { "success": false, "message": "Doctor not found" }
    ```
    - The frontend gracefully catches these and displays a **toast notification** to the user.
