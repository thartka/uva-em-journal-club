# Mean and Standard Deviation Demonstration

An interactive web application demonstrating why mean and standard deviation are only appropriate for normally distributed data. Created for the University of Virginia Journal Club.

**Created by:** Thomas Hartka, MD, MS, MSDS  
**Date:** 2/6/2026

## Overview

This educational tool consists of three interactive exercises:

1. **Galton Board (Dalton Board)**: Watch balls fall through pegs to create a normal distribution, demonstrating the central limit theorem in action.

2. **Normal Distribution Exercise**: Generate samples from a normal distribution (μ = 14 mGy, σ = 23.1 mGy) and see how mean and standard deviation accurately describe the data.

3. **Lognormal Distribution Exercise**: Generate samples from a lognormal distribution (s = 0.98, scale = 10) and observe why mean and standard deviation are inappropriate summary statistics for non-normal data.

## Features

- **Mobile-friendly design**: Optimized for cellphone viewing with touch-friendly controls
- **Interactive visualizations**: Real-time updates as parameters change
- **Animated Galton board**: Watch balls fall through pegs in real-time
- **Statistical calculations**: Automatic computation of mean and standard deviation
- **Visual curve fitting**: Overlay normal distribution curves on histograms

## File Structure

```
/
├── index.html                      # Landing page with navigation
├── galton-board.html              # Exercise 1: Galton board
├── normal-distribution.html       # Exercise 2: Normal distribution
├── lognormal-distribution.html    # Exercise 3: Lognormal distribution
├── styles.css                     # Shared responsive styles
├── js/
│   ├── galton-board.js           # Galton board simulation
│   ├── histogram.js              # Reusable histogram renderer
│   ├── normal-exercise.js        # Normal distribution exercise logic
│   └── lognormal-exercise.js     # Lognormal distribution exercise logic
└── README.md                      # This file
```

## Deployment to Cloudflare Pages

### Prerequisites

1. A GitHub account
2. A Cloudflare account (free tier works)
3. This repository pushed to GitHub

### Steps

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Connect to Cloudflare Pages**
   - Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - Navigate to **Pages** in the sidebar
   - Click **Create a project**
   - Select **Connect to Git**
   - Authorize Cloudflare to access your GitHub account
   - Select your repository

3. **Configure Build Settings**
   - **Framework preset**: None (or Static Site)
   - **Build command**: (leave empty - no build step needed)
   - **Build output directory**: `/` (root directory)
   - Click **Save and Deploy**

4. **Custom Domain (Optional)**
   - After deployment, go to your project settings
   - Navigate to **Custom domains**
   - Add your custom domain if desired

### Build Configuration

Since this is a static site with no build step, Cloudflare Pages will automatically serve the HTML files. No special configuration is needed.

### Environment Variables

No environment variables are required for this project.

## Local Development

To run locally, simply open `index.html` in a web browser or use a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (with http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000` in your browser.

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- Requires JavaScript enabled
- Uses Canvas API for visualizations

## Technical Details

- **Pure HTML/CSS/JavaScript**: No build tools or dependencies required
- **Canvas API**: Used for all visualizations
- **Box-Muller Transform**: Used for generating normal random variables
- **Responsive Design**: Mobile-first approach with touch-friendly controls

## License

This project is created for educational purposes at the University of Virginia Journal Club.
