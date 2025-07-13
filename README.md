# AINAB InData - World Bank Development Indicators Dashboard

[![Deploy Ainab's InData to GH Pages](https://github.com/drikusroor/ainab-indata/actions/workflows/deploy.yml/badge.svg)](https://github.com/drikusroor/ainab-indata/actions/workflows/deploy.yml)

A modern React application for exploring and visualizing World Bank development indicators data, built with a high-performance tech stack and optimized data processing pipeline.

[Check it out!](drikusroor.github.io/ainab-indata/)

## 🎯 Project Overview

This project combines a React-based frontend with a sophisticated data processing system to make World Bank development indicators accessible and interactive. The application transforms large datasets (22MB+ CSV files) into efficient, queryable formats and provides an intuitive interface for data exploration and visualization.

**Data Strategy**: Instead of bundling large CSV files with the application, data is fetched dynamically from GitHub's raw content URLs, keeping the app bundle size small while providing access to the complete processed dataset.

## 🛠️ Tech Stack

### Frontend

- **[React 19](https://react.dev/)** - Modern React with latest features
- **[TypeScript](https://www.typescriptlang.org/)** - Type-safe JavaScript
- **[TailwindCSS 4.0](https://tailwindcss.com/)** - Utility-first CSS framework
- **[Shadcn/ui](https://ui.shadcn.com/)** - High-quality, accessible UI components
- **[Radix UI](https://www.radix-ui.com/)** - Low-level UI primitives
- **[Lucide React](https://lucide.dev/)** - Beautiful icon library
- **[React Hook Form](https://react-hook-form.com/)** - Performant form handling
- **[Zod](https://zod.dev/)** - Schema validation
- **[TanStack Query](https://tanstack.com/query)** - Data fetching, caching, and synchronization

### Runtime & Build

- **[Bun](https://bun.sh)** - Fast all-in-one JavaScript runtime and package manager
- **Custom Build System** - Optimized for React + TailwindCSS

### Data Processing

- **[csv-parser](https://www.npmjs.com/package/csv-parser)** - Streaming CSV parsing
- **[csv-writer](https://www.npmjs.com/package/csv-writer)** - Efficient CSV generation
- **Custom splitting algorithm** - Memory-efficient large dataset processing

## 🚀 Quick Start

### Installation

```bash
# Install dependencies
bun install
```

### Development

```bash
# Start development server with hot reload
bun dev
```

### Production

```bash
# Build and start production server
bun build && bun start
```

## 📊 Data Processing

This project includes a sophisticated data processing pipeline for World Bank datasets:

### Process Raw Data

```bash
# Split large World Bank CSV into manageable files
bun run split-data ./your-worldbank-file.csv

# Analyze processed data
bun run analyze-data
```

For detailed information about the data processing architecture, see:

- **[Data Processing Architecture](./docs/data-processing-architecture.md)** - Complete technical documentation
- **[Data Processing Quick Start](./README-data-processing.md)** - Quick start guide and usage examples

## 📁 Project Structure

```text
├── src/                    # React application source
│   ├── components/         # Reusable UI components
│   ├── lib/               # Utility functions and configurations
│   ├── examples/          # Example code and testing utilities
│   └── styles/            # Global styles and TailwindCSS
├── scripts/               # Data processing scripts
├── data/                  # World Bank datasets (processed)
├── docs/                  # Project documentation
└── public/                # Static assets
```

## 🎨 Features (Planned)

- **Interactive Data Visualization** - Charts and graphs for development indicators
- **Country Comparison** - Side-by-side analysis of multiple countries
- **Time Series Analysis** - Historical trend visualization
- **Dataset Explorer** - Browse and search available indicators
- **Efficient Data Fetching** - TanStack Query for optimized data loading, caching, and synchronization from GitHub raw URLs
- **Responsive Design** - Optimized for all device sizes
- **Performance Optimized** - Efficient data loading and caching with small bundle size

## 📚 Documentation

- **[Data Processing Architecture](./docs/data-processing-architecture.md)** - Detailed technical documentation of the data pipeline
- **[Data Processing Quick Start](./README-data-processing.md)** - Quick start guide for data processing
- **[TanStack Query Setup](./docs/tanstack-query-setup.md)** - Data fetching, caching, and state management guide

## 🔧 Development

This project was created using Bun v1.2.18+ and follows modern React development practices with TypeScript and component-driven architecture.

### Key Development Features

- **Hot Module Replacement** - Instant feedback during development
- **Type Safety** - Full TypeScript integration
- **Component Library** - Pre-built, accessible UI components
- **Utility-First CSS** - Rapid UI development with TailwindCSS
- **Form Validation** - Robust form handling with validation
- **Data Management** - TanStack Query for efficient data fetching and caching
- **Developer Tools** - TanStack Query DevTools for debugging data flow
