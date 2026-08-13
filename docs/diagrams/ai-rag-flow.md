# AI / RAG flow

```mermaid
flowchart LR
  U[Customer] --> API
  API --> AI[ai-service]
  AI --> RAG[Knowledge retrieve]
  AI --> Tools[Authorized tools]
  Tools --> API
  API --> Dom[Domain/PG/Calc]
  Dom --> API
  API --> AI
  AI --> API
  API -->|SSE| U
```
