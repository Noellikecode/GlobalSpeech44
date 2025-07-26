# Step-by-Step Deployment Guide

## Method 1: Railway (Easiest - 5 minutes)

### Step 1: Prepare Files
1. Download/copy your `deployment-package` folder to your computer
2. Make sure it contains: server.js, public folder, database-dump.sql, package.json

### Step 2: Create Railway Account
1. Go to https://railway.app
2. Click "Login" 
3. Sign up with GitHub (free)

### Step 3: Deploy
1. Click "New Project"
2. Select "Empty Project"
3. Click "Deploy from GitHub repo" OR drag your deployment-package folder
4. If using GitHub: connect your repository and select the deployment-package folder

### Step 4: Add Database
1. In your Railway project, click "New Service"
2. Select "PostgreSQL"
3. Railway automatically creates DATABASE_URL environment variable

### Step 5: Deploy
1. Railway automatically builds and deploys
2. Your app will be live at: https://[random-name].up.railway.app
3. Database imports automatically on first run

## Method 2: Render (Free Forever)

### Step 1: Prepare Repository
1. Upload your deployment-package to GitHub as a new repository
2. Make sure all files are in the root (not in a subfolder)

### Step 2: Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (free)

### Step 3: Create Database
1. Click "New PostgreSQL"
2. Choose free tier
3. Note the "Internal Database URL"

### Step 4: Create Web Service
1. Click "New Web Service"
2. Connect your GitHub repository
3. Build Command: leave empty
4. Start Command: npm start

### Step 5: Add Environment Variable
1. In Render dashboard, go to Environment
2. Add: DATABASE_URL = [your database internal URL from step 3]
3. Click "Save Changes"

### Step 6: Deploy
1. Render automatically deploys
2. Your app will be live at: https://[your-app-name].onrender.com

## Troubleshooting

### If DATABASE_URL Error:
- Check environment variables are set correctly
- For Railway: DATABASE_URL should appear automatically
- For Render: Copy the internal database URL exactly

### If Build Fails:
- Make sure package.json is in the root directory
- Check that server.js exists
- Verify all files uploaded correctly

### If App Doesn't Load:
- Check logs in your platform dashboard
- Verify DATABASE_URL is set
- Make sure public folder contains index.html

Your app should load with all 5,950 speech therapy centers working perfectly.