# 🔭 NASA Gigapixel Explorer

An interactive web-based viewer for exploring high-resolution NASA gigapixel images with labeling capabilities.

## Features

- **Interactive Navigation**: Zoom, pan, and explore gigapixel images
- **Tile-based Viewing**: Efficiently load and display large images in manageable tiles
- **Labeling Tools**: Annotate and label regions of interest (works on detail tiles)
- **Overview Map**: Quick navigation using a miniature overview image
- **Export Capabilities**: Save and export your labels

## Quick Start

### Local Development

1. Start the local server:
   ```bash
   ./start_server.sh
   ```

2. Open your browser to: `http://localhost:8000`

### GitHub Pages Deployment

1. Push to GitHub:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/yourusername/reponame.git
   git branch -M main
   git push -u origin main
   ```

2. Enable GitHub Pages:
   - Go to repository **Settings** → **Pages**
   - Source: Deploy from a branch
   - Branch: `main` / folder: `/ (root)`
   - Save

3. Your site will be available at: `https://yourusername.github.io/reponame/`

## Project Structure

```
.
├── index.html          # Main application
├── css/               # Stylesheets
├── js/                # JavaScript modules
├── data/
│   ├── overview.jpg   # Overview image
│   ├── tiles/         # High-resolution image tiles
│   ├── labels/        # Saved labels
│   └── image_data.json
├── images/            # UI assets
└── start_server.sh    # Local development server
```

## Usage

- **Navigate**: Double-click on the overview map to jump to a region
- **Zoom**: Use zoom controls or mouse wheel
- **Label**: Select labeling tools (works on detail tiles only)
- **Export**: Save your work using the export function

## Technologies

- Pure HTML5, CSS3, and JavaScript
- No build process required
- Responsive design

## Space resources reference:

- Andromeda galaxy images: [Link](https://assets.science.nasa.gov/content/dam/science/missions/hubble/galaxies/andromeda/Hubble_M31Mosaic_2025_10552x2468_STScI-01JGY92V0Z2HJTVH605N4WH9XQ.jpg)
- Multiple ESAWebb images: [Link](https://esawebb.org/images/)