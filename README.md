## Getting Started

### Prerequisites

- Node.js
- npm

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/lc_cmd_react.git
cd lc_cmd_react

# Install dependencies
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

This will run the application in development mode using the configuration in env.dev.ts.

## Configuration

The project uses separate configuration files for development and production environments:

- `env.dev.ts` - For development (P&W main)
- `env.dev-test.ts` - For development (P&W test)
- `env.main.ts` - Production (P&W main)
- `env.test.ts` - Production (P&W test)

To modify environment variables, edit the appropriate file. The values for your bot/site will differ.

### Backend Configuration

**Important**: For the application to function properly, you need to either:
1. Host the backend yourself and configure it with your frontend URL, or
2. Request whoever is hosting the backend to whitelist your domain/URL

## Building for Production

```bash
npm run build
```

This will generate production-ready files in the dist directory using the configuration in env.prod.ts.

## Deployment

### GitHub Pages

This project is configured for easy deployment to GitHub Pages:

1. Ensure your vite.config.ts has the correct base path:

```typescript
base: '/<repository-name>/', // Replace with your repository name
```

2. Deploy using npm scripts:

```bash
npm run deploy
```

For alternative deployment options:
- [GitHub - Adding node.js actions](https://docs.github.com/en/actions/use-cases-and-examples/building-and-testing/building-and-testing-nodejs)
- [GitHub CLI - Authenticating](https://cli.github.com/manual/)
- [Vite - Deploying a static site](https://v2.vitejs.dev/guide/static-deploy.html)

## Additional Resources
- [React Documentation](https://reactjs.org/docs/getting-started.html)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
- [GitHub Pages Documentation](https://docs.github.com/en/pages)

## License

AGPL