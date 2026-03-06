# Team SABI

Nevermined Hackathon – Meta-glasses physical verification request service (A2A).

## Members

| Name | Focus (V1) |
|------|------------|
| Spencer Kerber | Nevermined / payments logic, API contributions |
| Ben Imadali | VisionClaw / ray-banned proof of concept, Cloud deploy, front end (simple first), API contributions |

## Repo

- **Project:** nevermined-hackathon-sabi  
- **Location:** `GitHub/practice-projects/nevermined-hackathon-sabi`  
- Ben has access; he may push from a new git worktree. Pull from `origin` before redoing the PRD.

**This branch (`feature/buyers-sellers-agents`):** Seller/buyer payment layer (Nevermined x402). The **protected assets we sell** are the verification artifacts (photos + answer) produced by **Ben’s Meta app** (VisionClaw / ray-banned–style). Integration point: once Ben’s app stores or serves those artifacts, this seller agent (or Nevermined’s static-resources proxy) gates access. Ben’s app repo may live elsewhere; this repo does not need to include his code — we integrate via APIs/storage and document the contract.
