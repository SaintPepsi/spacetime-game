# SpaceTime Game - Task Runner

# Run local development server (pass extra args like: just dev --extra-flag)
dev *ARGS:
    spacetime dev  --yes --server local --database spacetime-game {{ARGS}}

# Publish to local server (pass extra args like: just publish --delete-data)
publish *ARGS:
    spacetime publish --server local spacetime-game {{ARGS}}

logs *ARGS:
    spacetime logs --server local c2005b8fef3c783369ebe10ff8542e468df456a29aedcc42dcb4e26c49edca6c --follow

# Install dependencies
install:
    bun install

# Run tests
test:
    bun test

# List all available commands
list:
    @just --list
