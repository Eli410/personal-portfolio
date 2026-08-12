# Eli Chen - Personal Portfolio

A modern, responsive personal portfolio website built with Astro and Tailwind CSS.

## About

This portfolio showcases my work as a Software Engineer and Computer Engineering student at Texas A&M University. It features my projects, work experience, and technical skills.

## Tech Stack

- **Framework:** [Astro](https://astro.build/) - Static site generator with component islands
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS framework
- **UI Components:** React components for interactive elements
- **Typography:** [Outfit](https://fonts.google.com/specimen/Outfit) + [JetBrains Mono](https://fonts.google.com/specimen/JetBrains+Mono)
- **Icons:** [React Icons](https://react-icons.github.io/react-icons/)

## Features

- Responsive design for mobile and desktop
- Dark theme with maroon and gold accent colors
- Animated hero section with typewriter effect
- Live cards for every project pinned on GitHub
- Interactive FAQ accordions
- Smooth page transitions

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Eli410/personal-website.git
cd personal-website
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:4321](http://localhost:4321) in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Project Structure

```
src/
├── components/
│   ├── about/          # About page components
│   ├── commons/        # Shared components (navbar, footer, etc.)
│   ├── home/           # Home page components
│   ├── links/          # Contact/links components
│   └── project/        # Project card components
├── data/               # Data files for projects and jobs
├── layouts/            # Page layouts
├── pages/              # Route pages
├── scripts/            # JavaScript utilities
└── styles/             # Global CSS styles
```

### Live GitHub projects

The homepage and Projects page discover the repositories pinned on
[github.com/Eli410](https://github.com/Eli410), then enrich each card with live
repository metadata from GitHub. Results are cached in the visitor's browser for
15 minutes to keep the section fast and stay within GitHub's public API limits.
A minimal snapshot of the current pin names keeps the cards available if the
pin-discovery service is temporarily unreachable; the interface labels that
state instead of presenting it as live.

## Contact

- **Email:** ziyangc410@gmail.com
- **LinkedIn:** [linkedin.com/in/Eli-chen](https://www.linkedin.com/in/Eli-chen)
- **GitHub:** [github.com/Eli410](https://github.com/Eli410)

## License

This project is open source and available under the [MIT License](LICENSE).
