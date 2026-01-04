# Leazo Admin Panel

A premium administrative interface for managing Listings, users, and platform analytics.

## Features

- **Dashboard**: Real-time stats on listings, occupancy, and buildings.
- **Listings**: Moderate property listings with Review, Approve, Hold, and Reject workflows.
- **User Management**: Manage system users and assign roles (Admin, Moderator, User).
- **Analytics**: Deep dive into user behavior (DAU/MAU) and retention rates.
- **Responsive Design**: Fully optimized for Mobile, Tablet, and Desktop.
- **Auth**: Secure administrative access with JWT.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS v4
- **Charts**: Recharts
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **API**: Axios

## Getting Started

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Environment Variables**:
    Create a `.env.local` if needed, although defaults are set to `localhost:5000/v1/api`.

3.  **Run development server**:
    ```bash
    npm run dev
    ```

4.  **Backend Correlation**:
    Ensure the main Leazo Backend is running on port 5000.
