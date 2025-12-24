# Contributing

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/yourusername/havadurumu-soa.git`
3. Install dependencies: `npm install`
4. Copy `.env.example` to `.env` and configure
5. Start development: `node server.js`

## Development

### Running Tests

```bash
# Test SOAP endpoint
node testSOAP.js

# Test gRPC endpoint
node testGRPC.js
```

### Debugging

View request logs:
```bash
curl http://localhost:3000/logs
curl "http://localhost:3000/logs?protocol=gRPC"
curl "http://localhost:3000/logs?protocol=SOAP"
```

### Code Style

- Use 2 spaces for indentation
- Use meaningful variable names
- Add comments for complex logic
- Error handling is mandatory

## Committing

```bash
git add .
git commit -m "feat: describe your changes"
git push origin your-branch
```

## Pull Request Process

1. Update README.md if needed
2. Add tests for new features
3. Ensure all tests pass
4. Create a descriptive PR

## Issues

- Check existing issues before creating new ones
- Use bug report template for bugs
- Provide detailed information and logs

## Questions?

Open a discussion or contact the maintainers.
