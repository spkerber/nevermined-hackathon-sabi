# sabi

SDK & CLI for Sabi — verification-as-a-service powered by Nevermined.

Request real-world, photo-verified answers to questions about physical locations. A human verifier wearing Ray-Ban Meta smart glasses goes to the location, captures photo evidence, and answers your question.

## Quick Start

```bash
# Set your Nevermined API key
export NVM_API_KEY="your-key"
export SABI_API_URL="https://sabi-backend.ben-imadali.workers.dev"

# Create a verification
npx sabi verify "Is the coffee shop on 5th Ave open?" --lat 37.7749 --lng -122.4194

# Check status
npx sabi status <job-id>

# List all jobs
npx sabi list

# Watch real-time updates
npx sabi watch <job-id>
```

## SDK Usage

```bash
npm install sabi
```

```typescript
import { SabiClient } from "sabi";

const client = new SabiClient({
  apiUrl: "https://sabi-backend.ben-imadali.workers.dev",
  nvmApiKey: process.env.NVM_API_KEY,
});

const result = await client.createVerification({
  question: "How many Fantas are in the vending machine?",
  targetLat: 37.7749,
  targetLng: -122.4194,
});

console.log("Job ID:", result.job.id);

// Get the completed artifact
const artifact = await client.getArtifact(result.job.id);
console.log("Answer:", artifact.answer);
console.log("Photos:", artifact.frames.length);
```

## Configuration

Config resolution order: constructor options > env vars > `~/.sabirc`

| Env Var | Config Key | Description |
|---------|-----------|-------------|
| `SABI_API_URL` | `apiUrl` | Backend API URL |
| `SABI_NVM_API_KEY` or `NVM_API_KEY` | `nvmApiKey` | Nevermined API key |

```bash
# Persistent config
sabi config apiUrl https://sabi-backend.ben-imadali.workers.dev
sabi config nvmApiKey your-key

# View config
sabi config

# Reset
sabi config --reset
```

## Claude Code Skill

The `skill/CLAUDE.md` file can be used as a Claude Code skill to enable AI agents to submit verification requests. Copy it into your project's `.claude/` directory or reference it as a skill.

## License

MIT
