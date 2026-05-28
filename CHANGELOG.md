## [1.8.2](https://github.com/pavp/storywright/compare/v1.8.1...v1.8.2) (2026-05-28)

### 🐛 Bug Fixes

* **commands:** align split step with AskUserQuestion behavior in skills ([30ffc07](https://github.com/pavp/storywright/commit/30ffc07d169bc43610a985d8720faaaf5c8c01f2))

## [1.8.1](https://github.com/pavp/storywright/compare/v1.8.0...v1.8.1) (2026-05-28)

### 🐛 Bug Fixes

* **formatter:** explicitly call Write tool to persist story .md files to disk ([a9cc185](https://github.com/pavp/storywright/commit/a9cc185d0d59db6dcf977393c1cee70dbd976bea))

## [1.8.0](https://github.com/pavp/storywright/compare/v1.7.0...v1.8.0) (2026-05-28)

### ✨ Features

* **skills:** add "Continue without split" option to split confirmation prompt ([5495ae6](https://github.com/pavp/storywright/commit/5495ae69e29707185ec2b1d1cbc3cbb4816f2177))

## [1.7.0](https://github.com/pavp/storywright/compare/v1.6.3...v1.7.0) (2026-05-28)

### ✨ Features

* **skills:** inline split confirmation via AskUserQuestion on count ≥2 ([95469ad](https://github.com/pavp/storywright/commit/95469ad55ac5b473e62e85865a30a9410e7d70be))

## [1.6.3](https://github.com/pavp/storywright/compare/v1.6.2...v1.6.3) (2026-05-28)

### 🐛 Bug Fixes

* **skills:** silence clarification-resolved filler; always write story md files ([4a90e42](https://github.com/pavp/storywright/commit/4a90e4200288bbaef83b1556a5c35efeb358ec12))

## [1.6.2](https://github.com/pavp/storywright/compare/v1.6.1...v1.6.2) (2026-05-28)

### 🐛 Bug Fixes

* **base:** clarify canonical block is taxonomy not markup; remove INVEST section from output ([89dfd58](https://github.com/pavp/storywright/commit/89dfd58fcda3e95fc1a066afc7d08cd74e4c8a35))

## [1.6.1](https://github.com/pavp/storywright/compare/v1.6.0...v1.6.1) (2026-05-28)

### ♻️ Refactors

* **skills:** extract storywright-base component for shared v2.2 behavior ([4555fcb](https://github.com/pavp/storywright/commit/4555fcb5559a2178cc1a4e5485bdf42c1f7757cb))

## [1.6.0](https://github.com/pavp/storywright/compare/v1.5.0...v1.6.0) (2026-05-28)

### ✨ Features

* **skills:** bring story-generate, story-split, story-from-figma to v2.2 parity ([e93c6c9](https://github.com/pavp/storywright/commit/e93c6c9a58d8a6eb3d13e87e0007b42faa54e4b8))

## [1.5.0](https://github.com/pavp/storywright/compare/v1.4.0...v1.5.0) (2026-05-28)

### ✨ Features

* **skills:** refine story-refine to Cohn+Gherkin canonical with deterministic split ([dafc093](https://github.com/pavp/storywright/commit/dafc0931ffa8435f8e78ea245775fe238d36e810))
* **skills:** tighten story-refine v2.2.0 with mechanical deps and V audit ([6b81113](https://github.com/pavp/storywright/commit/6b81113f0bdec172ffb1f3d79f88987f627cd667))

## [1.4.0](https://github.com/pavp/storywright/compare/v1.3.0...v1.4.0) (2026-05-27)

### ✨ Features

* **skills:** extend multi-source inputs to story-refine and story-split ([db74284](https://github.com/pavp/storywright/commit/db74284da9e11d38ed8b2a4700ef0981d3e01fe8))

## [1.3.0](https://github.com/pavp/storywright/compare/v1.2.0...v1.3.0) (2026-05-27)

### ✨ Features

* **commands:** add slash-command entrypoints to top-level skills ([6095c34](https://github.com/pavp/storywright/commit/6095c34bbe79d3bf677b0b1c5eca013ab73c31b5))

## [1.2.0](https://github.com/pavp/storywright/compare/v1.1.0...v1.2.0) (2026-05-27)

### ✨ Features

* **skills:** support fused multi-source inputs (text + image + figma) ([874a470](https://github.com/pavp/storywright/commit/874a470a3791b3c7ac76f12b002c2d6814b88fa1))

## [1.1.0](https://github.com/pavp/storywright/compare/v1.0.3...v1.1.0) (2026-05-27)

### ✨ Features

* **skills:** add slash-command triggers to top-level skills ([42c95f6](https://github.com/pavp/storywright/commit/42c95f6f636e8812f77d5755d38882da4e6df6e4))

## [1.0.3](https://github.com/pavp/storywright/compare/v1.0.2...v1.0.3) (2026-05-27)

### 🐛 Bug Fixes

* **release:** adopt two-job pipeline with atomicity checks ([09b83a4](https://github.com/pavp/storywright/commit/09b83a44b7a15df8001779b397b4a62453e852fa))

## [1.0.2](https://github.com/pavp/storywright/compare/v1.0.1...v1.0.2) (2026-05-27)

### 🐛 Bug Fixes

* **release:** remove registry-url from setup-node to enable OIDC ([2ff9e1d](https://github.com/pavp/storywright/commit/2ff9e1d71218ccdbca0ae447a07eb63d6aab5733))

## [1.0.1](https://github.com/pavp/storywright/compare/v1.0.0...v1.0.1) (2026-05-27)

### 🐛 Bug Fixes

* **release:** enable Trusted Publishing via OIDC ([2ae46f7](https://github.com/pavp/storywright/commit/2ae46f7bbc09a88f976890db9be380579d5fa82f))

### 📝 Docs

* add npm + CI + license badges to README ([f054fd9](https://github.com/pavp/storywright/commit/f054fd93cc492667daed47e431e6e5dc22a01506))
