# Campus Connect — Setup & Execution Guide

This document provides step-by-step instructions on how to package, install, configure, and run the **Campus Connect** project.

---

## 1. Prerequisites & System Requirements

Before running the application, ensure you have the following installed on your system:

| Tool | Recommended Version | Download Link |
| --- | --- | --- |
| **Node.js** | v18.x or v20.x LTS or higher | [nodejs.org](https://nodejs.org/) |
| **npm** | v9.x or higher (bundled with Node.js) | — |
| **Git** | Latest (Optional) | [git-scm.com](https://git-scm.com/) |
| **Supabase** | Free Cloud Account | [supabase.com](https://supabase.com/) |

---

## 2. How to Zip this Project (Excluding `node_modules`)

`node_modules` and `.next` build files contain thousands of temporary files and should **not** be included when sharing or zipping the project.

### Option A: PowerShell (Windows)
Run this command from the project root directory:

```powershell
Compress-Archive -Path (Get-ChildItem -Path . -Exclude 'node_modules', '.next') -DestinationPath ..\campus-connect.zip -Force
```

### Option B: Git Archive (If repository is initialized)
```bash
git archive -o ../campus-connect.zip HEAD
```

### Option C: Manual (Windows File Explorer)
1. Open the project folder `campus-connect`.
2. Select all files and folders **except** `node_modules` and `.next`.
3. Right-click $\rightarrow$ **Compress to ZIP file** (or **Send to** $\rightarrow$ **Compressed (zipped) folder**).

### Option D: macOS / Linux Terminal
```bash
zip -r ../campus-connect.zip . -x "node_modules/*" ".next/*" ".git/*"
```

---

## 3. Step-by-Step Guide to Run the Project

### Step 1: Extract and Navigate to Project Directory
Extract `campus-connect.zip` and open a terminal in the root folder:
```bash
cd campus-connect
```

### Step 2: Install Project Dependencies
Run `npm install` to download all necessary packages:
```bash
npm install
```

### Step 3: Configure Environment Variables
1. Copy `.env.example` to create `.env.local`:
   - **Windows PowerShell**: `Copy-Item .env.example .env.local`
   - **Linux / macOS**: `cp .env.example .env.local`
2. Open `.env.local` and fill in your Supabase credentials:

```env
# Required: Supabase Dashboard -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-public-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Optional: Anthropic Console -> API Keys (Leave blank if not using AI features)
ANTHROPIC_API_KEY=
```

### Step 4: Database Setup (Supabase SQL Schema)
1. Log in to [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. Go to **SQL Editor** in the left menu.
3. Open `supabase/schema.sql` from this repository, copy its contents, paste them into the Supabase SQL Editor, and click **Run**.
4. *(If applicable)* If updating an existing database, also run the scripts in `supabase/migration_2_github_sync.sql` and `supabase/migration_3_fix_commit_conflict.sql`.

### Step 5: Start the Development Server
Run the following command:
```bash
npm run dev
```

### Step 6: Access the Application
Open your web browser and navigate to:
```
http://localhost:3000
```

---

## 4. Available npm Commands

| Script | Command | Description |
| --- | --- | --- |
| **Development** | `npm run dev` | Starts the Next.js development server with hot-reloading at `localhost:3000`. |
| **Production Build** | `npm run build` | Compiles and optimizes the app for production deployment. |
| **Start Production** | `npm run start` | Runs the compiled production build locally. |
| **Code Linting** | `npm run lint` | Analyzes code for potential errors using Next.js ESLint. |

---

## 5. Troubleshooting

- **Missing `node_modules` Error**: Ensure you ran `npm install` before running `npm run dev`.
- **Database Connection Error**: Verify that `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are correct in `.env.local`.
- **Port 3000 in use**: Next.js will automatically try running on `http://localhost:3001` or you can stop the process using port 3000.
